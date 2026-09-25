import type { GuildMember, PartialGuildMember } from 'discord.js';
import {
  unsafeSnowflake,
  type GuildId,
  type RoleId,
  type UserId,
} from '@bloom/shared-types';
import {
  snowflakeCreatedAt,
  type MemberJoinPayload,
  type MemberLeavePayload,
  type MemberUpdatePayload,
} from '@bloom/events';

/**
 * Member gateway events, translated into plain payloads.
 *
 * `unsafeSnowflake` is correct here and only here: these ids come from
 * Discord's own gateway frames, not from user input, so re-validating their
 * shape would be ceremony. Anything arriving from a member goes through the
 * validation layer instead.
 */

/**
 * The `@everyone` role.
 *
 * Discord includes it in a member's role list and its id always equals the
 * guild id. It is filtered out because it is not a role anyone was *granted* —
 * leaving it in makes "this member has no roles" read as "this member has one
 * role" everywhere downstream.
 */
function realRoleIds(member: GuildMember | PartialGuildMember): readonly RoleId[] {
  return [...member.roles.cache.keys()]
    .filter((id) => id !== member.guild.id)
    .map((id) => unsafeSnowflake<RoleId>(id));
}

export function toMemberJoinPayload(member: GuildMember): MemberJoinPayload {
  return {
    guildId: unsafeSnowflake<GuildId>(member.guild.id),
    userId: unsafeSnowflake<UserId>(member.id),
    username: member.user.username,
    isBot: member.user.bot,
    joinedAt: member.joinedAt,
    roleIds: realRoleIds(member),
    accountCreatedAt: snowflakeCreatedAt(member.id),
  };
}

/**
 * A member leaving.
 *
 * The payload is frequently *partial*: Discord sends only the user object, and
 * without the GuildMembers intent plus a warm cache there is nothing more.
 * `username` falls back to the id rather than to a placeholder, so a log line
 * still identifies who left.
 */
export function toMemberLeavePayload(
  member: GuildMember | PartialGuildMember,
  now: Date,
): MemberLeavePayload {
  return {
    guildId: unsafeSnowflake<GuildId>(member.guild.id),
    userId: unsafeSnowflake<UserId>(member.id),
    username: member.user.username,
    leftAt: now,
  };
}

export function toMemberUpdatePayload(
  previous: GuildMember | PartialGuildMember,
  next: GuildMember,
): MemberUpdatePayload {
  return {
    guildId: unsafeSnowflake<GuildId>(next.guild.id),
    userId: unsafeSnowflake<UserId>(next.id),
    username: next.user.username,
    roleIds: realRoleIds(next),
    previousRoleIds: realRoleIds(previous),
  };
}
