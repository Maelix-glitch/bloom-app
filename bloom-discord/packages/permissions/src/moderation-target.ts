import {
  bloomError,
  err,
  ok,
  type BloomError,
  type ModerationAction,
  type Result,
  type UserId,
} from '@bloom/shared-types';
import type { PlatformConfig } from '@bloom/config';
import {
  DiscordPermission,
  hasPermission,
  PERMISSION_DISPLAY_NAMES,
  type DiscordPermissionName,
} from './discord-permissions.js';
import type { AuthorizationSubject, AuthorizationTarget } from './context.js';
import { targetHasRoleKey } from './context.js';
import type { BotRoleContext } from './role-hierarchy.js';

/**
 * May this moderator do this, to this person, right now?
 *
 * Authorization for moderation is two separate questions, and conflating them
 * is how tools end up either unusable or dangerous:
 *
 *   1. **Is the actor allowed to run the command at all?** That is the command
 *      `policy`, evaluated by the dispatcher before a handler is reached.
 *   2. **Is the actor allowed to use it on *this* member?** That is this file.
 *
 * A moderator passes (1) for `/ban`. Whether they may ban an administrator is
 * (2), and the answer is no. Discord's own client enforces something similar
 * through role position, but relying on Discord to refuse is relying on an API
 * error to be our access control — the request would still be made, the attempt
 * would not be recorded as a refusal, and the error surfaced to staff would be
 * a raw `DiscordAPIError` rather than an explanation.
 *
 * Every check here is deliberately ordered most-specific-first, so the message
 * a moderator sees names the actual reason rather than the first rule that
 * happened to match.
 */

/**
 * Actions that reach the Discord API and therefore need the *bot* to outrank
 * the target, not just the moderator.
 *
 * `warn`, `note` and `clear_warnings` are database-only. Requiring bot
 * hierarchy for them would mean Guardian could not record a warning about
 * somebody it cannot moderate — and recording is exactly what you still want to
 * be able to do in that situation.
 */
export const DISCORD_ENFORCED_ACTIONS: readonly ModerationAction[] = [
  'timeout',
  'untimeout',
  'kick',
  'ban',
];

/**
 * The Discord permission each action actually needs.
 *
 * Checked against the bot's live permissions before the call, so the failure is
 * an actionable `BOT_MISSING_PERMISSION` naming the permission to grant,
 * instead of a 50013 from the API.
 */
export const ACTION_PERMISSIONS: Readonly<
  Record<ModerationAction, readonly DiscordPermissionName[]>
> = {
  warn: [],
  clear_warnings: [],
  note: [],
  timeout: ['ModerateMembers'],
  untimeout: ['ModerateMembers'],
  kick: ['KickMembers'],
  ban: ['BanMembers'],
  unban: ['BanMembers'],
  purge: ['ManageMessages', 'ReadMessageHistory'],
  slowmode: ['ManageChannels'],
  // Locking a channel edits its permission overwrites, which Manage Roles
  // covers. Manage Channels would also work and is broader, so it is not used.
  lock: ['ManageRoles'],
  unlock: ['ManageRoles'],
};

export interface ModerationTargetInput {
  readonly action: ModerationAction;
  readonly actor: AuthorizationSubject;
  /**
   * The member being actioned.
   *
   * `null` means they are not in the guild. Legitimate for `ban` (pre-emptive
   * bans of a known raider are a real workflow) and `unban`; refused for
   * everything else.
   */
  readonly target: AuthorizationTarget | null;
  readonly targetUserId: UserId;
  readonly bot: BotRoleContext;
  readonly botUserId: UserId;
  readonly config: PlatformConfig;
}

/**
 * Roles whose holders may never be actioned through Bloom, by anyone.
 *
 * Staff discipline is a conversation between humans, not a slash command. The
 * tool refusing outright is a deliberate design choice: an audit trail showing
 * one moderator timing out another is a worse outcome than the tool being
 * slightly less capable.
 */
const PROTECTED_ROLE_KEYS = ['founder', 'administrator', 'moderator'] as const;

export function checkModerationTarget(
  input: ModerationTargetInput,
): Result<void, BloomError> {
  const { action, actor, target, targetUserId, bot, botUserId, config } = input;

  // ---------------------------------------------------------------------------
  // 1. Self-action
  // ---------------------------------------------------------------------------
  // Includes `note` and `warn`. There is no legitimate use, and allowing it
  // creates a way to pad or launder your own record.
  if (targetUserId === actor.userId) {
    return err(
      bloomError('SELF_ACTION_BLOCKED', {
        userMessage: 'You cannot use a moderation command on yourself.',
        details: { action },
      }),
    );
  }

  // ---------------------------------------------------------------------------
  // 2. The bot itself
  // ---------------------------------------------------------------------------
  if (targetUserId === botUserId) {
    return err(
      bloomError('TARGET_PROTECTED', {
        userMessage: 'That target is the bot itself.',
        operatorHint:
          'Guardian will not moderate its own account. To stop it acting, remove its permissions or take it offline.',
        details: { action },
      }),
    );
  }

  // ---------------------------------------------------------------------------
  // 3. Presence
  // ---------------------------------------------------------------------------
  if (target === null) {
    if (action === 'ban' || action === 'unban') {
      // Nothing further to check: hierarchy is meaningless for someone who is
      // not in the guild. Bot permissions are still verified at step 7.
      return checkBotPermissions(action, bot);
    }
    return err(
      bloomError('MEMBER_NOT_FOUND', {
        userMessage: 'That member is not in this server.',
        details: { action, userId: targetUserId },
      }),
    );
  }

  // ---------------------------------------------------------------------------
  // 4. The guild owner
  // ---------------------------------------------------------------------------
  // Discord itself refuses this, but refusing here means the attempt is
  // recorded as a refusal rather than surfacing as an API error.
  if (target.isGuildOwner) {
    return err(
      bloomError('TARGET_PROTECTED', {
        userMessage: 'The server owner cannot be moderated.',
        details: { action },
      }),
    );
  }

  // ---------------------------------------------------------------------------
  // 5. Staff
  // ---------------------------------------------------------------------------
  const protectedKey = PROTECTED_ROLE_KEYS.find((key) =>
    targetHasRoleKey(config, target, key),
  );
  if (protectedKey !== undefined) {
    return err(
      bloomError('TARGET_PROTECTED', {
        userMessage: 'Staff members cannot be moderated through Bloom.',
        operatorHint:
          `The target holds the configured "${protectedKey}" role. Moderation commands refuse staff targets by design; ` +
          'handle this off-tool and, if access must be removed, do it by editing roles directly.',
        details: { action, protectedRole: protectedKey },
      }),
    );
  }

  // ---------------------------------------------------------------------------
  // 6. Role position, actor vs target
  // ---------------------------------------------------------------------------
  // The guild owner outranks everyone regardless of role position, which is
  // Discord's rule and has to be reproduced or the owner finds the tooling
  // mysteriously broken.
  if (!actor.isGuildOwner && target.highestRolePosition >= actor.highestRolePosition) {
    return err(
      bloomError('TARGET_PROTECTED', {
        userMessage: 'You cannot moderate someone at or above your own role level.',
        details: {
          action,
          actorPosition: actor.highestRolePosition,
          targetPosition: target.highestRolePosition,
        },
      }),
    );
  }

  // ---------------------------------------------------------------------------
  // 7. Role position, bot vs target
  // ---------------------------------------------------------------------------
  if (DISCORD_ENFORCED_ACTIONS.includes(action)) {
    if (bot.highestRolePosition <= target.highestRolePosition) {
      return err(
        bloomError('ROLE_HIERARCHY_BLOCKED', {
          userMessage: 'Bloom cannot action that member.',
          operatorHint:
            `Guardian's highest role ("${bot.highestRoleName}", position ${String(bot.highestRolePosition)}) ` +
            `is not above the target's highest role (position ${String(target.highestRolePosition)}). ` +
            'Move the ◉ Bloom Bot role higher in Server Settings → Roles. It must sit above every role it needs to moderate, and below your staff roles.',
          details: {
            action,
            botPosition: bot.highestRolePosition,
            targetPosition: target.highestRolePosition,
          },
        }),
      );
    }
  }

  return checkBotPermissions(action, bot);
}

function checkBotPermissions(
  action: ModerationAction,
  bot: BotRoleContext,
): Result<void, BloomError> {
  const required = ACTION_PERMISSIONS[action];
  const missing = required.filter(
    (name) => !hasPermission(bot.permissions, DiscordPermission[name]),
  );

  if (missing.length > 0) {
    const names = missing.map((name) => PERMISSION_DISPLAY_NAMES[name]).join(', ');
    return err(
      bloomError('BOT_MISSING_PERMISSION', {
        userMessage: 'Bloom is missing a permission needed for that action.',
        operatorHint:
          `Guardian needs ${names} to perform "${action}". Grant it on the ◉ Bloom Bot role, ` +
          'or re-invite the bot with the permission integer from docs/permissions/bloom-bot-permission-matrix.md.',
        details: { action, missing: [...missing] },
      }),
    );
  }

  return ok(undefined);
}

/**
 * Whether the actor may *see* a case.
 *
 * Reporters can read their own report's status without being staff — a report
 * that vanishes into silence is the reason people stop reporting. They see
 * status and nothing else; the investigation, notes and any other party's
 * account stay staff-only.
 */
export function canViewCase(input: {
  readonly actor: AuthorizationSubject;
  readonly reporterId: UserId | null;
  readonly isStaff: boolean;
}): 'full' | 'status_only' | 'none' {
  if (input.isStaff) return 'full';
  if (input.reporterId !== null && input.reporterId === input.actor.userId) {
    return 'status_only';
  }
  return 'none';
}
