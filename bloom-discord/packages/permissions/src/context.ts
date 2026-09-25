import type {
  ChannelId,
  ChannelKey,
  GuildId,
  RoleId,
  RoleKey,
  UserId,
} from '@bloom/shared-types';
import type { PlatformConfig } from '@bloom/config';

/**
 * A member, as the *server* sees them.
 *
 * Every field here is derived from the interaction payload Discord signs and
 * sends us, or from a live fetch — never from anything the client asserted.
 * That distinction is the whole of the brief's rule "do not trust the command
 * author's client-side claims": a crafted interaction cannot add a role to this
 * object, because the object is built from Discord's own member data.
 */
export interface AuthorizationSubject {
  readonly userId: UserId;
  readonly guildId: GuildId;
  /** Role ids Discord reports the member holding, right now. */
  readonly roleIds: readonly RoleId[];
  /** Computed guild permissions, as a bitfield. */
  readonly permissions: bigint;
  readonly isGuildOwner: boolean;
  /**
   * Position of the member's highest role. Used to stop staff from actioning
   * peers and superiors, mirroring how Discord itself gates moderation.
   */
  readonly highestRolePosition: number;
}

export interface AuthorizationContext {
  readonly subject: AuthorizationSubject;
  readonly channelId: ChannelId | null;
  readonly config: PlatformConfig;
  /** Command name, for error context. */
  readonly command?: string;
}

/** A target member for a moderation or role action. */
export interface AuthorizationTarget {
  readonly userId: UserId;
  readonly roleIds: readonly RoleId[];
  readonly highestRolePosition: number;
  readonly isGuildOwner: boolean;
}

/** Does the subject hold the configured role for this key? */
export function subjectHasRoleKey(context: AuthorizationContext, key: RoleKey): boolean {
  const roleId = context.config.roles[key];
  return roleId !== null && context.subject.roleIds.includes(roleId);
}

export function subjectHasAnyRoleKey(
  context: AuthorizationContext,
  keys: readonly RoleKey[],
): boolean {
  return keys.some((key) => subjectHasRoleKey(context, key));
}

/** Is the subject in one of the configured channels for these keys? */
export function inConfiguredChannel(
  context: AuthorizationContext,
  keys: readonly ChannelKey[],
): boolean {
  if (context.channelId === null) return false;
  return keys.some((key) => context.config.channels[key] === context.channelId);
}

export function targetHasRoleKey(
  config: PlatformConfig,
  target: AuthorizationTarget,
  key: RoleKey,
): boolean {
  const roleId: RoleId | null = config.roles[key];
  return roleId !== null && target.roleIds.includes(roleId);
}
