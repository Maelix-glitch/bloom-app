import {
  GUARDIAN_MANAGED_ROLE_KEYS,
  PROTECTED_ROLE_KEYS,
  ROLE_DISPLAY_NAMES,
  bloomError,
  err,
  ok,
  type BloomError,
  type Result,
  type RoleId,
  type RoleKey,
} from '@bloom/shared-types';
import type { PlatformConfig } from '@bloom/config';
import { DiscordPermission, hasPermission } from './discord-permissions.js';

/** A guild role as Discord currently reports it. */
export interface RoleSnapshot {
  readonly id: RoleId;
  readonly name: string;
  /** Higher number = higher in the role list. */
  readonly position: number;
  /** Managed roles belong to an integration and cannot be assigned manually. */
  readonly managed: boolean;
}

/** What the bot itself currently is, in this guild. */
export interface BotRoleContext {
  readonly highestRolePosition: number;
  readonly highestRoleName: string;
  readonly permissions: bigint;
}

/**
 * Can the bot write this role, right now?
 *
 * Re-checked live before every role operation rather than trusted from startup.
 * Role positions change whenever an administrator drags something in the role
 * list, and the failure mode of a stale check is the bot confidently attempting
 * a write that Discord will reject.
 *
 * Every refusal here is non-retryable. Retrying a hierarchy failure produces
 * identical failures forever, which the brief explicitly forbids — so the error
 * codes chosen below are all marked non-retryable in the catalog, and the retry
 * helper will not touch them.
 */
export function checkRoleManageable(
  bot: BotRoleContext,
  target: RoleSnapshot,
): Result<void, BloomError> {
  if (!hasPermission(bot.permissions, DiscordPermission.ManageRoles)) {
    return err(
      bloomError('BOT_MISSING_PERMISSION', {
        operatorHint:
          'The bot does not have the Manage Roles permission in this server. Re-invite it using the installation URL in docs/deployment/discord-developer-portal-setup.md, or grant Manage Roles to its integration role.',
        details: { required_permission: 'ManageRoles' },
      }),
    );
  }

  // A managed role belongs to an integration (another bot, a subscription, a
  // booster role). Discord refuses to let anyone assign these, including us.
  if (target.managed) {
    return err(
      bloomError('ROLE_HIERARCHY_BLOCKED', {
        operatorHint: `"${target.name}" is a managed integration role. Discord does not allow any bot or member to assign managed roles — they are controlled by the integration that owns them. If this is the role you intended to grant, create a normal role instead.`,
        details: { target_role: target.id, target_role_name: target.name, managed: true },
      }),
    );
  }

  /*
   * Strictly above, not "at or above". Discord compares positions and refuses
   * ties, which is a genuinely easy off-by-one to get wrong — and getting it
   * wrong means the bot tells staff everything is fine and then silently fails.
   */
  if (bot.highestRolePosition <= target.position) {
    return err(
      bloomError('ROLE_HIERARCHY_BLOCKED', {
        operatorHint: describeHierarchyFix(bot, target),
        details: {
          bot_role: bot.highestRoleName,
          bot_position: bot.highestRolePosition,
          target_role: target.name,
          target_position: target.position,
        },
      }),
    );
  }

  return ok(undefined);
}

/**
 * The remediation text an administrator actually needs.
 *
 * The brief gives an example of the tone required. Naming both roles, both
 * positions and the exact UI path is the difference between a message that
 * closes the ticket and one that starts a conversation.
 */
export function describeHierarchyFix(bot: BotRoleContext, target: RoleSnapshot): string {
  const relation =
    bot.highestRolePosition === target.position
      ? `is at the same position as`
      : `is below`;

  return [
    `Bloom Guardian cannot modify "${target.name}" because its bot role "${bot.highestRoleName}" ${relation} it`,
    `(bot role position ${String(bot.highestRolePosition)}, target role position ${String(target.position)}).`,
    '',
    'Fix: open Server Settings → Roles and drag ◉ Bloom Bot above ✧ Early Bloom and ❋ Bloom Member.',
    'Keep it below ⟡ Moderator, ◈ Administrator and ✦ Founder — the bot must not be able to modify staff roles.',
  ].join(' ');
}

export interface HierarchyAdvisory {
  readonly severity: 'error' | 'warn';
  readonly code:
    'BOT_ROLE_TOO_LOW' | 'BOT_ROLE_TOO_HIGH' | 'ROLE_NOT_FOUND' | 'ROLE_MANAGED';
  readonly message: string;
  readonly roleKey?: RoleKey;
}

/**
 * Startup preflight for Guardian's role placement.
 *
 * Runs once at boot and reports problems *before* a member hits them. Finding
 * out that the bot role is too low because onboarding silently broke for a new
 * member is a much worse way to learn it.
 *
 * Returns advisories rather than throwing: a misplaced role should be loud in
 * the logs and visible in `/health`, but it should not stop the bot from
 * booting and serving the commands that do work.
 */
export function auditGuardianRolePlacement(
  config: PlatformConfig,
  bot: BotRoleContext,
  roles: ReadonlyMap<RoleId, RoleSnapshot>,
): readonly HierarchyAdvisory[] {
  const advisories: HierarchyAdvisory[] = [];

  // Must be ABOVE every role it is expected to grant.
  for (const key of GUARDIAN_MANAGED_ROLE_KEYS) {
    const roleId = config.roles[key];
    if (!roleId) continue;

    const snapshot = roles.get(roleId);
    if (!snapshot) {
      advisories.push({
        severity: 'error',
        code: 'ROLE_NOT_FOUND',
        roleKey: key,
        message: `${ROLE_DISPLAY_NAMES[key]} (id ${roleId}) does not exist in this server. The configured id is wrong, or the role was deleted.`,
      });
      continue;
    }

    if (snapshot.managed) {
      advisories.push({
        severity: 'error',
        code: 'ROLE_MANAGED',
        roleKey: key,
        message: `${ROLE_DISPLAY_NAMES[key]} is a managed integration role, so no bot can assign it. Replace it with a normal role.`,
      });
      continue;
    }

    if (bot.highestRolePosition <= snapshot.position) {
      advisories.push({
        severity: 'error',
        code: 'BOT_ROLE_TOO_LOW',
        roleKey: key,
        message: describeHierarchyFix(bot, snapshot),
      });
    }
  }

  // Must be BELOW every staff role. Being above them is not an outage, but it
  // is a privilege-escalation surface: a compromised bot token could then
  // rewrite staff roles.
  for (const key of PROTECTED_ROLE_KEYS) {
    const roleId = config.roles[key];
    if (!roleId) continue;

    const snapshot = roles.get(roleId);
    if (!snapshot) continue;

    if (bot.highestRolePosition > snapshot.position) {
      advisories.push({
        severity: 'warn',
        code: 'BOT_ROLE_TOO_HIGH',
        roleKey: key,
        message: `The bot role "${bot.highestRoleName}" (position ${String(bot.highestRolePosition)}) sits above ${ROLE_DISPLAY_NAMES[key]} (position ${String(snapshot.position)}). Least privilege: move the bot role below the staff roles so it cannot modify them.`,
      });
    }
  }

  if (hasPermission(bot.permissions, DiscordPermission.Administrator)) {
    advisories.push({
      severity: 'warn',
      code: 'BOT_ROLE_TOO_HIGH',
      message:
        'The bot has the Administrator permission. Bloom bots must never have Administrator — it bypasses every channel overwrite and makes the permission matrix meaningless. Grant the specific permissions listed in docs/permissions/bloom-bot-permission-matrix.md instead.',
    });
  }

  return advisories;
}

/**
 * Is this role one Guardian is allowed to touch at all?
 *
 * The hierarchy check asks what Discord permits. This asks what *we* permit,
 * and it is the stricter of the two. Discord would happily let a
 * high-positioned bot grant ◌ Beta Tester; our policy says role writes are
 * limited to the onboarding roles, so beta access stays a deliberate product
 * decision rather than a side effect of the onboarding machinery.
 */
export function isRoleWritePermitted(
  config: PlatformConfig,
  roleId: RoleId,
): Result<RoleKey, BloomError> {
  for (const key of GUARDIAN_MANAGED_ROLE_KEYS) {
    if (config.roles[key] === roleId) return ok(key);
  }

  // Name the role if we recognise it — "that is the Moderator role" is a much
  // better error than "that role is not allowed".
  for (const [key, configured] of Object.entries(config.roles) as [
    RoleKey,
    RoleId | null,
  ][]) {
    if (configured === roleId) {
      return err(
        bloomError('UNAUTHORIZED', {
          operatorHint: `Role writes are limited to ${GUARDIAN_MANAGED_ROLE_KEYS.map((managed) => ROLE_DISPLAY_NAMES[managed]).join(' and ')}. ${ROLE_DISPLAY_NAMES[key]} is not assignable by this bot.`,
          details: { requested_role: roleId, role_key: key },
        }),
      );
    }
  }

  // An id we have never heard of. This is the case the brief means by "never
  // trust client-supplied role ids": the allow-list is configured server-side,
  // so an arbitrary id fails here regardless of what the interaction claimed.
  return err(
    bloomError('UNAUTHORIZED', {
      operatorHint: `Role ${roleId} is not a configured Bloom role. Role operations are restricted to the configured allow-list; arbitrary role ids are rejected.`,
      details: { requested_role: roleId },
    }),
  );
}
