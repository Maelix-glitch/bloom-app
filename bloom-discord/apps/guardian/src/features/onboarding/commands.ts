import { bloomError, type UserId } from '@bloom/shared-types';
import {
  allOf,
  auditGuardianRolePlacement,
  requireModerator,
  type AuthorizationPolicy,
} from '@bloom/permissions';
import { staffEmbed, type BloomMessage } from '@bloom/embeds';
import { rateLimitError } from '@bloom/security';
import type {
  BloomCommand,
  CommandInvocation,
  SubcommandContribution,
} from '@bloom/commands';
import type { GuardianDeps } from '../../deps.js';
import * as copy from './messages.js';

/**
 * Guardian's onboarding commands.
 *
 * Two tiers, matching the namespace rules in `@bloom/commands`:
 *
 *   • `/verify` — the one verb members use constantly, so it stays top-level.
 *   • `/guardian …` — everything staff-facing, grouped under the owning bot so
 *     three applications in one server do not produce a wall of commands.
 *
 * Every `policy` below is the real gate. `defaultMemberPermissions` in the spec
 * only hides a command in the client, and a server administrator can override
 * it, so it is treated as a UX hint and never as security.
 */

/** Guard used by every command that must run inside the configured guild. */
function guildId(invocation: CommandInvocation): ReturnType<typeof requireGuild> {
  return requireGuild(invocation);
}

function requireGuild(invocation: CommandInvocation) {
  const id = invocation.guildId;
  if (!id) {
    // The dispatcher already refuses non-guild invocations; this is the type
    // narrowing that makes that guarantee visible to the compiler.
    throw bloomError('GUILD_MISMATCH', {
      operatorHint: 'Command reached a handler without a guild id.',
    });
  }
  return id;
}

// -----------------------------------------------------------------------------
// /verify
// -----------------------------------------------------------------------------

export const verifyCommand: BloomCommand<GuardianDeps> = {
  bot: 'guardian',
  // Touches the database and the Discord API; three seconds is not a budget to
  // gamble with on a cold pooler connection.
  defer: true,
  ephemeral: true,

  spec: {
    name: 'verify',
    description: 'Verify yourself and get access to the rest of the server.',
    guildOnly: true,
    // Visible to everyone: this is the one command an unverified member must be
    // able to find without being told where it is.
  },

  // No role requirement — an unverified member holds no Bloom role by
  // definition, so requiring one would make verification impossible.
  policy: () => ({ ok: true, value: undefined }),

  async execute(invocation, deps): Promise<BloomMessage> {
    const guild = guildId(invocation);

    /*
     * Rate limiting before any work.
     *
     * /verify is the one command an unverified account can reach, which makes
     * it the natural target for a join-spam wave. The limiter is database
     * backed, so the budget is shared by all three processes and survives a
     * restart — an in-process bucket would reset exactly when a restart loop is
     * least convenient.
     */
    const decision = await deps.verifyLimiter.consume(invocation.actor.userId);
    const limited = rateLimitError(decision);
    if (!limited.ok) throw limited.error;

    const result = await deps.onboarding.verify({
      guildId: guild,
      userId: invocation.actor.userId,
      correlationId: invocation.correlationId,
    });

    switch (result.kind) {
      case 'revoked':
        return copy.revokedMessage();

      case 'already':
        return copy.alreadyVerifiedMessage(result.state);

      case 'verified':
        /*
         * Honesty about a partial success.
         *
         * If the role write failed the member is genuinely verified — the
         * record says so — but they cannot see the server yet. Showing the
         * normal success message would be exactly the "fake functionality" the
         * brief forbids, so the failure is surfaced instead.
         */
        return result.roleApplied
          ? copy.verifiedMessage()
          : {
              ephemeral: true,
              embeds: [
                staffEmbed({
                  title: 'Verified, but the role did not apply',
                  description: [
                    'Your verification is recorded. The ✧ Early Bloom role could not be applied,',
                    'which is a server configuration problem rather than anything you did.',
                    '',
                    'A moderator has been alerted. Your access will be fixed shortly.',
                  ].join('\n'),
                }),
              ],
            };
    }
  },
};

// -----------------------------------------------------------------------------
// /guardian
// -----------------------------------------------------------------------------

export const onboardingStaffPolicy: AuthorizationPolicy = allOf(requireModerator());

/**
 * Onboarding's branches of `/guardian`.
 *
 * Contributed rather than owned. The `/guardian` root is assembled in
 * `apps/guardian/src/commands.ts` from every feature's contributions, so adding
 * a moderation subcommand in Phase 2 did not require editing this file — and
 * neither feature can silently shadow the other, because duplicate paths throw
 * at construction.
 */
export const onboardingSubcommands: readonly SubcommandContribution<GuardianDeps>[] = [
  {
    spec: {
      name: 'status',
      description: 'Show a member’s onboarding status.',
      options: [
        {
          name: 'member',
          description: 'Whose status to show. Defaults to you.',
          type: 'user',
          required: false,
        },
      ],
    },
    execute: showStatus,
  },
  {
    spec: {
      name: 'overview',
      description: 'Show how many members are in each onboarding state.',
    },
    execute: showOverview,
  },
  {
    group: 'onboarding',
    spec: {
      name: 'complete',
      description: 'Move a verified member to ❋ Bloom Member.',
      options: [
        {
          name: 'member',
          description: 'The member who has finished onboarding.',
          type: 'user',
          required: true,
        },
      ],
    },
    execute: completeOnboarding,
  },
  {
    group: 'onboarding',
    spec: {
      name: 'history',
      description: 'Show a member’s lifecycle history.',
      options: [
        {
          name: 'member',
          description: 'Whose history to show.',
          type: 'user',
          required: true,
        },
      ],
    },
    execute: showHistory,
  },
  {
    group: 'roles',
    spec: {
      name: 'audit',
      description: 'Check that the bot role is positioned correctly.',
    },
    execute: auditRoles,
  },
];

async function showStatus(
  invocation: CommandInvocation,
  deps: GuardianDeps,
): Promise<BloomMessage> {
  const guild = guildId(invocation);
  const target = invocation.options.getUser('member');
  const userId: UserId = target?.id ?? invocation.actor.userId;

  const member = await deps.onboarding.status(guild, userId);
  if (!member) {
    throw bloomError('MEMBER_NOT_FOUND', {
      operatorHint: `No membership record for ${userId}.`,
      userMessage:
        'No record for that member yet. They may have joined while Guardian was offline.',
    });
  }

  return copy.memberStatusMessage({
    userId,
    state: member.onboardingState,
    joinedAt: member.joinedAt,
    verifiedAt: member.verifiedAt,
    completedAt: member.onboardingCompletedAt,
    self: userId === invocation.actor.userId,
  });
}

async function showOverview(
  invocation: CommandInvocation,
  deps: GuardianDeps,
): Promise<BloomMessage> {
  return copy.onboardingOverviewMessage(
    await deps.onboarding.overview(guildId(invocation)),
  );
}

async function completeOnboarding(
  invocation: CommandInvocation,
  deps: GuardianDeps,
): Promise<BloomMessage> {
  const guild = guildId(invocation);
  const target = invocation.options.getUser('member');

  if (!target) {
    throw bloomError('INVALID_INPUT', { userMessage: 'Choose a member.' });
  }

  if (target.isBot) {
    throw bloomError('INVALID_INPUT', {
      operatorHint: 'Onboarding does not apply to bot accounts.',
      userMessage: 'Bots do not go through onboarding.',
    });
  }

  await deps.onboarding.completeOnboarding({
    guildId: guild,
    userId: target.id,
    actorId: invocation.actor.userId,
    correlationId: invocation.correlationId,
  });

  return copy.onboardingCompleteMessage(target.id);
}

async function showHistory(
  invocation: CommandInvocation,
  deps: GuardianDeps,
): Promise<BloomMessage> {
  const guild = guildId(invocation);
  const target = invocation.options.getUser('member');
  if (!target) {
    throw bloomError('INVALID_INPUT', { userMessage: 'Choose a member.' });
  }

  const history = await deps.repositories.onboarding.listTransitions(
    guild,
    target.id,
    10,
  );

  if (history.length === 0) {
    return {
      ephemeral: true,
      embeds: [
        staffEmbed({
          title: 'Lifecycle history',
          description: `<@${target.id}> has no recorded transitions.`,
        }),
      ],
    };
  }

  return {
    ephemeral: true,
    embeds: [
      staffEmbed({
        title: 'Lifecycle history',
        description: `<@${target.id}> — ${String(history.length)} most recent transition(s).`,
        fields: history.map((entry) => ({
          name: `${entry.fromState ?? 'new'} → ${entry.toState}`,
          value: [
            `<t:${String(Math.floor(entry.createdAt.getTime() / 1000))}:f> · ${entry.trigger}`,
            entry.actorId ? `by <@${entry.actorId}>` : 'by the system',
            entry.reason ?? '',
          ]
            .filter(Boolean)
            .join('\n'),
        })),
      }),
    ],
  };
}

/**
 * Re-run the role hierarchy audit on demand.
 *
 * The same check runs at startup. Exposing it as a command matters because role
 * positions change at any time — someone reorders the role list and onboarding
 * silently stops working. This is how an admin confirms the fix without
 * restarting the bot.
 */
async function auditRoles(
  invocation: CommandInvocation,
  deps: GuardianDeps,
): Promise<BloomMessage> {
  const guild = guildId(invocation);

  const [self, roles] = await Promise.all([
    deps.guilds.getSelf(guild),
    deps.guilds.getRoles(guild),
  ]);

  const advisories = auditGuardianRolePlacement(
    deps.config,
    {
      highestRolePosition: self.highestRolePosition,
      highestRoleName: self.highestRoleName,
      permissions: self.permissions,
    },
    roles,
  );

  if (advisories.length === 0) {
    return {
      ephemeral: true,
      embeds: [
        staffEmbed({
          title: 'Role placement is correct',
          description: [
            `The bot role "${self.highestRoleName}" sits at position ${String(self.highestRolePosition)}.`,
            'It is above every role Guardian grants and below every staff role.',
          ].join('\n'),
        }),
      ],
    };
  }

  const errors = advisories.filter((entry) => entry.severity === 'error');

  return {
    ephemeral: true,
    embeds: [
      staffEmbed({
        title:
          errors.length > 0
            ? `${String(errors.length)} problem(s) with role placement`
            : 'Role placement warnings',
        description:
          errors.length > 0
            ? 'Onboarding will fail until these are fixed.'
            : 'Onboarding works, but the placement is not least-privilege.',
        fields: advisories.slice(0, 10).map((entry) => ({
          name: `${entry.severity === 'error' ? '✖' : '⚠'} ${entry.code}`,
          value: entry.message,
        })),
      }),
    ],
  };
}

/** Top-level commands owned by onboarding. `/guardian` is assembled elsewhere. */
export const onboardingCommands: readonly BloomCommand<GuardianDeps>[] = [verifyCommand];
