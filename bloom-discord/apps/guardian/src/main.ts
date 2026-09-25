/**
 * BLOOM GUARDIAN — entry point.
 *
 * Guardian is the highest-trust application: verification and onboarding, the
 * role lifecycle, moderation, reports and cases, audit logging and anti-spam.
 * It is the only bot with Manage Roles, and the only one holding the privileged
 * GuildMembers intent.
 *
 * Phase 1 gave it onboarding, so this became the first bot that actually
 * starts. Phase 2 adds moderation actions, reports and cases.
 */
import { bloomError } from '@bloom/shared-types';
import { CommandDispatcher, CommandRegistry } from '@bloom/commands';
import { EventDispatcher } from '@bloom/events';
import { auditGuardianRolePlacement } from '@bloom/permissions';
import { DatabaseRateLimiter, TokenBucketRateLimiter } from '@bloom/security';
import {
  commandTelemetry,
  runBotMain,
  startBotProcess,
  type HealthCheck,
} from '@bloom/discord';
import type { GuardianDeps } from './deps.js';
import { OnboardingService } from './features/onboarding/service.js';
import { ModerationActionService } from './features/moderation/service.js';
import { CaseService } from './features/moderation/case-service.js';
import { guardianCommands } from './commands.js';
import { memberJoinHandler, memberLeaveHandler } from './features/onboarding/handlers.js';
import { createStaleCaseSweepJob } from './features/jobs/stale-case-sweep.js';
import { createRetentionSweepJob } from './features/jobs/retention-sweep.js';

/**
 * Advisories from the most recent role audit.
 *
 * Held here so `/health` can report the real state rather than a constant. The
 * audit runs at startup and on demand via `/guardian roles audit`; between
 * those, this is the last thing we actually observed, and the timestamp says
 * when.
 */
interface RoleAuditState {
  checkedAt: Date | null;
  errors: readonly string[];
  warnings: readonly string[];
}

const roleAudit: RoleAuditState = { checkedAt: null, errors: [], warnings: [] };

await runBotMain(() =>
  startBotProcess<GuardianDeps>({
    bot: 'guardian',

    createDeps(context) {
      const roles = context.discord.roles;
      if (!roles) {
        // Unreachable in practice — Guardian's capability manifest includes
        // `role:write`, so bootstrap builds the service. Checked anyway,
        // because the alternative to this four-line guard is a non-null
        // assertion on the single most dangerous dependency in the platform.
        throw bloomError('CAPABILITY_DENIED', {
          operatorHint:
            'Guardian started without a role service. Its capability manifest must include "role:write".',
        });
      }

      const discordModeration = context.discord.moderation;
      const channelModeration = context.discord.channelModeration;
      if (!discordModeration || !channelModeration) {
        // Same reasoning as the role service above: Guardian's manifest
        // includes `moderation:execute` and `message:manage`, so these are
        // always built. Asserting rather than non-null-asserting keeps the
        // failure legible if the manifest is ever edited.
        throw bloomError('CAPABILITY_DENIED', {
          operatorHint:
            'Guardian started without the moderation services. Its capability manifest must include "moderation:execute" and "message:manage".',
        });
      }

      const onboarding = new OnboardingService({
        config: context.platform,
        repositories: context.repositories,
        roles,
        messaging: context.discord.messaging,
        guilds: context.discord.guilds,
        logger: context.logger,
      });

      const moderation = new ModerationActionService({
        config: context.platform,
        repositories: context.repositories,
        guilds: context.discord.guilds,
        discord: discordModeration,
        channels: channelModeration,
        messaging: context.discord.messaging,
        logger: context.logger,
      });

      const cases = new CaseService({
        config: context.platform,
        repositories: context.repositories,
        messaging: context.discord.messaging,
        logger: context.logger,
      });

      return {
        bot: 'guardian',
        config: context.platform,
        logger: context.logger,
        repositories: context.repositories,
        scheduler: context.scheduler,
        jobSettings: context.jobSettings,
        guilds: context.discord.guilds,
        roles,
        messaging: context.discord.messaging,
        discordModeration,
        channelModeration,
        onboarding,
        moderation,
        cases,
        /*
         * One verification attempt per member per 30 seconds.
         *
         * Database backed, so the budget is shared across processes and
         * survives a restart. Deliberately loose: the point is to blunt a
         * join-spam wave, not to make a confused member wait.
         */
        verifyLimiter: new DatabaseRateLimiter(
          context.repositories.cooldowns,
          context.platform.discord.guildId,
          'onboarding.verify',
          30,
        ),
        /*
         * Staff moderation: a burst of 10, refilling at one every two seconds.
         *
         * A token bucket rather than a cooldown, because the shapes differ in
         * exactly the case that matters. A flat "one action per N seconds"
         * throttles the legitimate burst — clearing a raid is six kicks in ten
         * seconds — while barely inconveniencing an automated abuser, who is
         * happy to pace itself. A bucket permits the burst and then bites.
         *
         * In-process, unlike the durable limiters below. Guardian is a single
         * process, and a restart resetting the bucket errs in the moderator's
         * favour rather than the attacker's — restarts are not something an
         * abuser can trigger.
         */
        moderationLimiter: new TokenBucketRateLimiter({
          capacity: 10,
          refillPerSecond: 0.5,
        }),
        /*
         * `/report` is reachable by any member, including a brand-new account,
         * so it gets the tightest budget: one report per member per 60 seconds.
         * Flooding the staff queue is itself a form of abuse.
         */
        reportLimiter: new DatabaseRateLimiter(
          context.repositories.cooldowns,
          context.platform.discord.guildId,
          'moderation.report',
          60,
        ),
      };
    },

    createFeatures(deps, context) {
      /*
       * Scheduled work, registered into the process's one scheduler.
       *
       * Registration is unconditional; whether a job fires is decided by its
       * own `enabled` flag and the global FEATURE_SCHEDULED_MESSAGES switch.
       * Registering even when disabled is what lets `/guardian jobs list` show
       * an operator a job that exists and is switched off, rather than an empty
       * list that looks like a broken deployment.
       */
      context.scheduler
        .register(createStaleCaseSweepJob(deps))
        .register(createRetentionSweepJob(deps));

      const registry = new CommandRegistry<GuardianDeps>('guardian').registerAll(
        guardianCommands,
      );

      const commands = new CommandDispatcher<GuardianDeps>({
        bot: 'guardian',
        config: context.platform,
        logger: context.logger,
        registry,
        deps,
        telemetry: commandTelemetry(context.repositories.telemetry),
      });

      const events = new EventDispatcher<GuardianDeps>({
        bot: 'guardian',
        logger: context.logger,
        deps,
        /*
         * Durable duplicate suppression, so a gateway resume cannot re-welcome
         * a member another process already handled.
         *
         * Backed by the cooldown table rather than the idempotency table. Both
         * are atomic test-and-set, but only the cooldown honours a caller
         * supplied TTL — `idempotency_keys` expires on a fixed 30-day default,
         * which would suppress a legitimate rejoin months later.
         */
        dedupe: {
          tryClaim: async (key, ttlSeconds) => {
            const result = await context.repositories.cooldowns.tryAcquire(
              context.platform.discord.guildId,
              'event.dedupe',
              key,
              ttlSeconds,
            );
            return result.allowed;
          },
        },
      })
        .register(memberJoinHandler)
        .register(memberLeaveHandler);

      return { commands, events, commandCount: registry.size };
    },

    /**
     * Startup preflight.
     *
     * Role positions are the thing that silently breaks onboarding: someone
     * reorders the role list, the bot drops below ✧ Early Bloom, and the next
     * member to verify gets a failure nobody can explain. Checking at boot
     * turns that into a loud log line before anyone hits it.
     *
     * It reports rather than throws. A misplaced role should not stop Guardian
     * from serving `/guardian roles audit` — which is the command an admin
     * needs precisely when this is broken.
     */
    async onReady(context, deps) {
      const guildId = context.platform.discord.guildId;
      const [self, roles] = await Promise.all([
        deps.guilds.getSelf(guildId),
        deps.guilds.getRoles(guildId),
      ]);

      const advisories = auditGuardianRolePlacement(
        context.platform,
        {
          highestRolePosition: self.highestRolePosition,
          highestRoleName: self.highestRoleName,
          permissions: self.permissions,
        },
        roles,
      );

      roleAudit.checkedAt = new Date();
      roleAudit.errors = advisories
        .filter((entry) => entry.severity === 'error')
        .map((entry) => entry.message);
      roleAudit.warnings = advisories
        .filter((entry) => entry.severity === 'warn')
        .map((entry) => entry.message);

      for (const advisory of advisories) {
        context.logger.log(
          advisory.severity === 'error' ? 'error' : 'warn',
          'startup.role_audit',
          advisory.message,
          { context: { code: advisory.code, role_key: advisory.roleKey ?? null } },
        );
      }

      if (advisories.length === 0) {
        context.logger.info(
          'startup.role_audit',
          `Role placement is correct: "${self.highestRoleName}" at position ${String(self.highestRolePosition)}.`,
        );
      }
    },

    healthChecks(): readonly HealthCheck[] {
      return [
        {
          name: 'role_placement',
          run: () => {
            /*
             * Never reports "up" on no data.
             *
             * Before the first audit completes the honest answer is "unknown".
             * Saying "up" would be a fabricated health status, which the brief
             * forbids and which is worse than no check at all — it is the one
             * an operator would trust.
             */
            if (roleAudit.checkedAt === null) {
              return Promise.resolve({
                status: 'unknown' as const,
                detail: 'The startup role audit has not completed yet.',
              });
            }

            if (roleAudit.errors.length > 0) {
              return Promise.resolve({
                status: 'down' as const,
                detail: `Role placement blocks onboarding: ${roleAudit.errors[0] ?? ''}`,
              });
            }

            if (roleAudit.warnings.length > 0) {
              return Promise.resolve({
                status: 'degraded' as const,
                detail: `Role placement works but is not least-privilege: ${roleAudit.warnings[0] ?? ''}`,
              });
            }

            return Promise.resolve({
              status: 'up' as const,
              detail: `Checked at ${roleAudit.checkedAt.toISOString()}; the bot role is correctly placed.`,
            });
          },
        },
      ];
    },
  }),
);
