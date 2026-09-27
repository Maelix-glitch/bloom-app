/**
 * BLOOM GUARDIAN — entry point.
 *
 * Guardian is the highest-trust application: verification and onboarding, the
 * role lifecycle, moderation, reports and cases, and audit logging.
 *
 * Not anti-spam: that is Guardian's to own and is not implemented. See
 * docs/architecture/design-notes/001-auto-moderation.md.
 * It is the only bot with Manage Roles, and the only one holding the privileged
 * GuildMembers intent.
 *
 * Phase 1 gave it onboarding, so this became the first bot that actually
 * starts. Phase 2 adds moderation actions, reports and cases.
 */

import { auditGuardianRolePlacement } from '@bloom/permissions';
import { runBotMain, startBotProcess, type HealthCheck } from '@bloom/discord';
import type { GuardianDeps } from './deps.js';
import { createGuardianDeps, createGuardianFeatures } from './bootstrap.js';

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

const roleAudit: RoleAuditState = {
  checkedAt: null,
  errors: [],
  warnings: [],
};

await runBotMain(() =>
  startBotProcess<GuardianDeps>({
    bot: 'guardian',

    createDeps: createGuardianDeps,
    createFeatures: createGuardianFeatures,

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
          {
            context: {
              code: advisory.code,
              role_key: advisory.roleKey ?? null,
            },
          },
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
