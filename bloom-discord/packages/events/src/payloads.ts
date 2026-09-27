import type { GuildId, RoleId, UserId } from '@bloom/shared-types';

/**
 * Gateway event payloads, as plain data.
 *
 * Handlers receive these, never discord.js objects. Same seam as the command
 * invocation DTO and for the same reasons: a handler can be tested by building
 * a literal, and a discord.js upgrade lands in one adapter rather than in every
 * feature.
 *
 * Note what is deliberately absent: message content. No Bloom bot requests the
 * Message Content intent, so no payload here carries any.
 */

export interface MemberJoinPayload {
  readonly guildId: GuildId;
  readonly userId: UserId;
  readonly username: string;
  readonly isBot: boolean;
  /** When Discord says they joined. `null` if the gateway did not supply it. */
  readonly joinedAt: Date | null;
  /** Roles at the moment of joining — non-empty only for bots and rejoins. */
  readonly roleIds: readonly RoleId[];
  /**
   * When the Discord account itself was created, decoded from the snowflake.
   *
   * Not used in Phase 1. It is here because account age is the single most
   * useful raid signal and it costs nothing to carry — the value is embedded in
   * the user id we already have.
   */
  readonly accountCreatedAt: Date;
}

export interface MemberLeavePayload {
  readonly guildId: GuildId;
  readonly userId: UserId;
  readonly username: string;
  readonly leftAt: Date;
}

export interface MemberUpdatePayload {
  readonly guildId: GuildId;
  readonly userId: UserId;
  readonly username: string;
  readonly roleIds: readonly RoleId[];
  readonly previousRoleIds: readonly RoleId[];
}

export interface RoleChangePayload {
  readonly guildId: GuildId;
  readonly roleId: RoleId;
  readonly name: string;
  readonly position: number;
  readonly managed: boolean;
  /** Absent on delete. */
  readonly previousPosition?: number;
}

/**
 * Discord's epoch, for decoding a snowflake's embedded timestamp.
 *
 * 2015-01-01T00:00:00.000Z. The first 42 bits of a snowflake are milliseconds
 * since this instant.
 */
const DISCORD_EPOCH_MS = 1_420_070_400_000n;

export function snowflakeCreatedAt(id: string): Date {
  // BigInt because a snowflake exceeds Number.MAX_SAFE_INTEGER — parsing one as
  // a float silently loses the low bits and shifts the timestamp.
  return new Date(Number((BigInt(id) >> 22n) + DISCORD_EPOCH_MS));
}
