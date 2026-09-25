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
