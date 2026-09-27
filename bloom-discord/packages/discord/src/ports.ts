import type { ChannelId, GuildId, MessageId, RoleId, UserId } from '@bloom/shared-types';
import type { BloomMessage } from '@bloom/embeds';
import type { RoleSnapshot } from '@bloom/permissions';

/**
 * The Discord surface, as interfaces.
 *
 * Application services depend on these, never on discord.js. Two payoffs:
 *
 *   • Business logic is testable with in-memory fakes (`@bloom/testing`) — no
 *     gateway, no network, no API tokens in a test run.
 *   • When Discord changes something, the change lands in the adapter that
 *     implements these interfaces. discord.js v15 is already in pre-release;
 *     this is the seam that keeps that upgrade from touching feature code.
 */

export interface MemberSnapshot {
  readonly userId: UserId;
  readonly username: string;
  readonly roleIds: readonly RoleId[];
  readonly highestRolePosition: number;
  readonly joinedAt: Date | null;
  readonly isGuildOwner: boolean;
  readonly communicationDisabledUntil: Date | null;
}

export interface BotSelfSnapshot {
  readonly userId: UserId;
  readonly applicationId: string;
  readonly highestRolePosition: number;
  readonly highestRoleName: string;
  readonly permissions: bigint;
}

/** Read-only guild state. Available to every bot. */
export interface GuildQueryService {
  getGuildName(guildId: GuildId): Promise<string>;
  getMember(guildId: GuildId, userId: UserId): Promise<MemberSnapshot | null>;
  getRoles(guildId: GuildId): Promise<ReadonlyMap<RoleId, RoleSnapshot>>;
  getRole(guildId: GuildId, roleId: RoleId): Promise<RoleSnapshot | null>;
  /** The bot's own state in the guild — needed for every hierarchy check. */
  getSelf(guildId: GuildId): Promise<BotSelfSnapshot>;
  channelExists(guildId: GuildId, channelId: ChannelId): Promise<boolean>;
}

/**
 * Role writes.
 *
 * Guardian only. The implementation asserts the `role:write` capability in its
 * constructor, so wiring this into Companion or Labs fails at boot rather than
 * at the moment it would have changed somebody's roles.
 */
export interface RoleService {
  /** Idempotent: a member who already holds the role is a success, not an error. */
  assignRole(input: {
    readonly guildId: GuildId;
    readonly userId: UserId;
    readonly roleId: RoleId;
    /** Written to Discord's own audit log. Keep it short and factual. */
    readonly reason: string;
  }): Promise<void>;

  removeRole(input: {
    readonly guildId: GuildId;
    readonly userId: UserId;
    readonly roleId: RoleId;
    readonly reason: string;
  }): Promise<void>;
}

export interface MessagingService {
  sendToChannel(
    guildId: GuildId,
    channelId: ChannelId,
    message: BloomMessage,
  ): Promise<MessageId>;

  /**
   * Direct message a member.
   *
   * Returns `false` rather than throwing when their DMs are closed. That is a
   * normal, common outcome — most people have DMs from servers disabled — and
   * treating it as an error would fill the logs with noise and make onboarding
   * look broken.
   */
  sendDirectMessage(userId: UserId, message: BloomMessage): Promise<boolean>;
}

/**
 * Member moderation.
 *
 * Guardian only. The implementation asserts `moderation:execute` in its
 * constructor, so wiring it into Companion or Labs fails at boot rather than at
 * the moment it would have banned somebody.
 *
 * Every method takes a `reason`, which is written to Discord's own audit log.
 * That is not decoration: it is what lets a server owner reconcile Bloom's
 * record against Discord's without trusting Bloom.
 */
export interface ModerationService {
  /** Discord caps timeouts at 28 days; the adapter rejects anything longer. */
  timeoutMember(input: {
    readonly guildId: GuildId;
    readonly userId: UserId;
    readonly until: Date;
    readonly reason: string;
  }): Promise<void>;

  removeTimeout(input: {
    readonly guildId: GuildId;
    readonly userId: UserId;
    readonly reason: string;
  }): Promise<void>;

  kickMember(input: {
    readonly guildId: GuildId;
    readonly userId: UserId;
    readonly reason: string;
  }): Promise<void>;

  banMember(input: {
    readonly guildId: GuildId;
    readonly userId: UserId;
    readonly reason: string;
    /** Message history to delete, in seconds. Discord's maximum is 7 days. */
    readonly deleteMessageSeconds?: number;
  }): Promise<void>;

  /** Returns `false` when the user was not banned — a no-op, not an error. */
  unbanMember(input: {
    readonly guildId: GuildId;
    readonly userId: UserId;
    readonly reason: string;
  }): Promise<boolean>;
}

/**
 * Whether `@everyone` may send in a channel.
 *
 * Three states, not two. `inherited` means the channel carries no explicit
 * overwrite and takes its permission from the category or role defaults —
 * which is different from an explicit allow, and collapsing the two is how an
 * unlock silently grants send access to a channel that never had it.
 */
export type ChannelSendPermission = 'allowed' | 'denied' | 'inherited';

export interface PurgeResult {
  readonly requested: number;
  readonly deleted: number;
  /**
   * Messages that matched but could not be bulk-deleted.
   *
   * Discord refuses to bulk-delete anything older than 14 days. Reporting this
   * separately is what stops `/purge 100` claiming it removed 100 messages when
   * it removed 12.
   */
  readonly skippedTooOld: number;
}

/** Channel-level moderation: slowmode, locking, and message purges. */
export interface ChannelModerationService {
  setSlowmode(input: {
    readonly guildId: GuildId;
    readonly channelId: ChannelId;
    /** Seconds between messages per member. 0 disables. Discord's max is 21600. */
    readonly seconds: number;
    readonly reason: string;
  }): Promise<void>;

  getSendPermission(
    guildId: GuildId,
    channelId: ChannelId,
  ): Promise<ChannelSendPermission>;

  setSendPermission(input: {
    readonly guildId: GuildId;
    readonly channelId: ChannelId;
    readonly state: ChannelSendPermission;
    readonly reason: string;
  }): Promise<void>;

  purgeMessages(input: {
    readonly guildId: GuildId;
    readonly channelId: ChannelId;
    readonly limit: number;
    /** Restrict the purge to one member's messages. */
    readonly authorId?: UserId;
    readonly reason: string;
  }): Promise<PurgeResult>;
}

export interface GatewayStatus {
  readonly connected: boolean;
  /** Websocket heartbeat round trip. `null` before the first heartbeat completes. */
  readonly pingMs: number | null;
  readonly uptimeMs: number;
  readonly applicationId: string | null;
}

export interface GatewayClient {
  status(): GatewayStatus;
  login(): Promise<void>;
  destroy(): Promise<void>;
}
