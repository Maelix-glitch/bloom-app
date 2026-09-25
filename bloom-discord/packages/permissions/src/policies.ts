import {
  PROTECTED_ROLE_KEYS,
  ROLE_DISPLAY_NAMES,
  STAFF_ROLE_KEYS,
  bloomError,
  err,
  ok,
  type BloomError,
  type ChannelKey,
  type Result,
  type RoleKey,
} from '@bloom/shared-types';
import { CHANNEL_DISPLAY_NAMES } from '@bloom/shared-types';
import {
  inConfiguredChannel,
  subjectHasAnyRoleKey,
  targetHasRoleKey,
  type AuthorizationContext,
  type AuthorizationTarget,
} from './context.js';
import {
  DiscordPermission,
  PERMISSION_DISPLAY_NAMES,
  hasPermission,
  missingPermissions,
  type DiscordPermissionName,
} from './discord-permissions.js';

/**
 * A policy answers one question: may this subject do this thing?
 *
 * Policies are pure functions over an explicit context. No I/O, no discord.js,
 * no globals — which means every rule in this file is unit-testable, and the
 * authorization logic can be reviewed as a single readable page rather than
 * being scattered across twenty command handlers.
 *
 * `void` on success rather than a value: a policy grants or denies, it does not
 * produce data.
 */
export type AuthorizationPolicy = (
  context: AuthorizationContext,
) => Result<void, BloomError>;

const granted: Result<void, BloomError> = ok(undefined);

/** Always allows. Explicit, so that "this command is open to everyone" is a decision. */
export const allowAnyone: AuthorizationPolicy = () => granted;

/**
 * Require the interaction to come from the configured guild.
 *
 * Applied to everything. All Bloom commands are guild-scoped and a command
 * arriving from anywhere else is either a misconfiguration or someone probing.
 */
export const requireConfiguredGuild: AuthorizationPolicy = (context) => {
  if (context.subject.guildId !== context.config.discord.guildId) {
    return err(
      bloomError('GUILD_MISMATCH', {
        details: {
          received_guild: context.subject.guildId,
          expected_guild: context.config.discord.guildId,
        },
      }),
    );
  }
  return granted;
};

/** Require any one of the given configured roles. */
export function requireRole(...keys: readonly RoleKey[]): AuthorizationPolicy {
  return (context) => {
    // The guild owner can always act. Without this, a fresh server whose owner
    // has not yet given themselves ✦ Founder cannot run setup commands.
    if (context.subject.isGuildOwner) return granted;

    if (subjectHasAnyRoleKey(context, keys)) return granted;

    // Unconfigured roles are a configuration failure, not an authorization
    // failure. Saying "you are not authorized" when the real problem is an
    // unset env var sends the operator looking in the wrong place.
    const configured = keys.filter((key) => context.config.roles[key] !== null);
    if (configured.length === 0) {
      return err(
        bloomError('CONFIGURATION_ERROR', {
          operatorHint: `This command requires one of [${keys.join(', ')}], but none of those roles are configured. Set the corresponding ROLE_* variables.`,
          details: { required_roles: [...keys] },
        }),
      );
    }

    return err(
      bloomError('UNAUTHORIZED', {
        operatorHint: `Actor lacks all of the required roles: ${keys
          .map((key) => ROLE_DISPLAY_NAMES[key])
          .join(', ')}.`,
        details: { required_roles: [...keys], command: context.command ?? null },
      }),
    );
  };
}

/** Require specific Discord permissions on the subject. */
export function requirePermission(
  ...names: readonly DiscordPermissionName[]
): AuthorizationPolicy {
  return (context) => {
    const missing = missingPermissions(context.subject.permissions, names);
    if (missing.length === 0) return granted;

    return err(
      bloomError('INSUFFICIENT_PERMISSION', {
        userMessage: `You need the ${missing
          .map((name) => PERMISSION_DISPLAY_NAMES[name])
          .join(' and ')} permission to do this.`,
        operatorHint: `Actor is missing Discord permissions: ${missing.join(', ')}.`,
        details: { missing_permissions: [...missing] },
      }),
    );
  };
}

/**
 * The named tiers from the brief.
 *
 * Each is a role check OR the equivalent Discord permission, so that a
 * legitimately-privileged member is never locked out by a missing role
 * assignment — but a member with neither is always refused.
 */
export const requireModerator: () => AuthorizationPolicy = () => (context) => {
  if (context.subject.isGuildOwner) return granted;
  if (subjectHasAnyRoleKey(context, STAFF_ROLE_KEYS)) return granted;
  if (hasPermission(context.subject.permissions, DiscordPermission.ModerateMembers)) {
    return granted;
  }
  return err(
    bloomError('UNAUTHORIZED', {
      userMessage: 'This command is available to the Bloom moderation team.',
      operatorHint:
        'Actor holds none of ✦ Founder, ◈ Administrator or ⟡ Moderator, and lacks the Timeout Members permission.',
      details: { command: context.command ?? null },
    }),
  );
};

export const requireAdministrator: () => AuthorizationPolicy = () => (context) => {
  if (context.subject.isGuildOwner) return granted;
  if (subjectHasAnyRoleKey(context, ['founder', 'administrator'])) return granted;
  if (hasPermission(context.subject.permissions, DiscordPermission.Administrator)) {
    return granted;
  }
  return err(
    bloomError('UNAUTHORIZED', {
      userMessage: 'This command is available to Bloom administrators.',
      operatorHint: 'Actor holds neither ✦ Founder nor ◈ Administrator.',
      details: { command: context.command ?? null },
    }),
  );
};

/**
 * Founder only.
 *
 * No permission fallback: Administrator is a Discord permission that several
 * people may hold, whereas ✦ Founder is an identity. Commands gated this way
 * are the ones where "who exactly" matters.
 */
export const requireFounder: () => AuthorizationPolicy = () => (context) => {
  if (context.subject.isGuildOwner) return granted;
  if (subjectHasAnyRoleKey(context, ['founder'])) return granted;
  return err(
    bloomError('UNAUTHORIZED', {
      userMessage: 'This command is restricted.',
      operatorHint: 'Actor does not hold ✦ Founder and is not the guild owner.',
      details: { command: context.command ?? null },
    }),
  );
};

/**
 * Beta Tester.
 *
 * Note what this does NOT imply. Holding ◌ Beta Tester grants access to testing
 * features and nothing else — not moderation, not staff channels, not
 * administration. Staff roles are accepted here only because a moderator should
 * be able to inspect a beta command, not because beta access is a privilege tier.
 */
export const requireBetaTester: () => AuthorizationPolicy = () => (context) => {
  if (context.subject.isGuildOwner) return granted;
  if (subjectHasAnyRoleKey(context, ['betaTester', ...STAFF_ROLE_KEYS])) return granted;
  return err(
    bloomError('UNAUTHORIZED', {
      userMessage: 'This is available to Bloom beta testers.',
      operatorHint: 'Actor does not hold ◌ Beta Tester.',
      details: { command: context.command ?? null },
    }),
  );
};

/** Require the member to have completed onboarding, i.e. hold ❋ Bloom Member. */
export const requireBloomMember: () => AuthorizationPolicy = () => (context) => {
  if (context.subject.isGuildOwner) return granted;
  if (subjectHasAnyRoleKey(context, ['bloomMember', ...STAFF_ROLE_KEYS])) return granted;
  return err(
    bloomError('UNAUTHORIZED', {
      userMessage: 'Complete onboarding to unlock this.',
      operatorHint: 'Actor does not hold ❋ Bloom Member.',
      details: { command: context.command ?? null },
    }),
  );
};

/** Restrict a command to specific configured channels. */
export function requireChannel(...keys: readonly ChannelKey[]): AuthorizationPolicy {
  return (context) => {
    if (inConfiguredChannel(context, keys)) return granted;
    return err(
      bloomError('CHANNEL_RESTRICTED', {
        userMessage: `Use this in ${keys.map((key) => CHANNEL_DISPLAY_NAMES[key]).join(' or ')}.`,
        operatorHint: `Command is restricted to channels [${keys.join(', ')}]; it was used in ${context.channelId ?? 'no channel'}.`,
        details: { allowed_channels: [...keys], used_in: context.channelId },
      }),
    );
  };
}

/** All policies must pass. Evaluation stops at the first denial. */
export function allOf(...policies: readonly AuthorizationPolicy[]): AuthorizationPolicy {
  return (context) => {
    for (const policy of policies) {
      const result = policy(context);
      if (!result.ok) return result;
    }
    return granted;
  };
}

/**
 * Any one policy may pass.
 *
 * On total failure it returns the *first* denial rather than a synthesised
 * "none of these matched", because the first policy in the list is the one the
 * author considered the primary route and its message is the most useful.
 */
export function anyOf(...policies: readonly AuthorizationPolicy[]): AuthorizationPolicy {
  return (context) => {
    let firstFailure: Result<void, BloomError> | null = null;
    for (const policy of policies) {
      const result = policy(context);
      if (result.ok) return result;
      firstFailure ??= result;
    }
    return (
      firstFailure ??
      err(
        bloomError('UNAUTHORIZED', {
          operatorHint: 'anyOf() was called with no policies.',
        }),
      )
    );
  };
}

export interface TargetCheckOptions {
  /** Whether the subject may target themselves. False for every moderation action. */
  readonly allowSelf?: boolean;
  /** Whether staff roles are shielded. True for every moderation action. */
  readonly protectStaff?: boolean;
}

/**
 * May the subject act on this target?
 *
 * Separate from the policies above because it needs the target, and because the
 * three rules it enforces are the ones that stop moderation tooling being
 * turned inward:
 *
 *   1. No self-targeting.
 *   2. Staff roles are not actionable through the bot, by anyone.
 *   3. You cannot action someone whose highest role is at or above your own —
 *      the same rule Discord applies in its own UI, so the bot cannot be used
 *      to route around it.
 */
export function checkTarget(
  context: AuthorizationContext,
  target: AuthorizationTarget,
  options: TargetCheckOptions = {},
): Result<void, BloomError> {
  const { allowSelf = false, protectStaff = true } = options;

  if (!allowSelf && target.userId === context.subject.userId) {
    return err(bloomError('SELF_ACTION_BLOCKED'));
  }

  if (target.isGuildOwner) {
    return err(
      bloomError('TARGET_PROTECTED', {
        operatorHint: 'The target is the guild owner and cannot be actioned by a bot.',
        details: { target_id: target.userId },
      }),
    );
  }

  if (protectStaff) {
    const protectedRole = PROTECTED_ROLE_KEYS.find((key) =>
      targetHasRoleKey(context.config, target, key),
    );
    if (protectedRole) {
      return err(
        bloomError('TARGET_PROTECTED', {
          operatorHint: `The target holds ${ROLE_DISPLAY_NAMES[protectedRole]}, which is protected from bot moderation. Handle staff conduct out of band.`,
          details: { target_id: target.userId, protected_role: protectedRole },
        }),
      );
    }
  }

  // Owner outranks everyone, so the position comparison does not apply to them.
  if (
    !context.subject.isGuildOwner &&
    target.highestRolePosition >= context.subject.highestRolePosition
  ) {
    return err(
      bloomError('TARGET_PROTECTED', {
        userMessage: 'You cannot action a member at or above your own role level.',
        operatorHint: `Actor's highest role is at position ${String(context.subject.highestRolePosition)}; the target's is at ${String(target.highestRolePosition)}. Discord requires a strictly higher position.`,
        details: {
          actor_position: context.subject.highestRolePosition,
          target_position: target.highestRolePosition,
        },
      }),
    );
  }

  return granted;
}
