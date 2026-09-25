import { DiscordAPIError, PermissionsBitField, type Client } from 'discord.js';
import {
  bloomError,
  unsafeSnowflake,
  type ChannelId,
  type GuildId,
  type RoleId,
  type UserId,
} from '@bloom/shared-types';
import type { RoleSnapshot } from '@bloom/permissions';
import type { BotSelfSnapshot, GuildQueryService, MemberSnapshot } from '../ports.js';

/**
 * Read-only guild access, backed by discord.js.
 *
 * Reads prefer the cache and fall back to a fetch. The cache is authoritative
 * for roles and channels — those arrive with the GUILD_CREATE payload and are
 * kept current by gateway events — but members are only cached once seen, so a
 * member lookup has to be able to hit the API.
 */
export class DiscordGuildQueryService implements GuildQueryService {
  public constructor(private readonly client: Client) {}

  public async getGuildName(guildId: GuildId): Promise<string> {
    const guild = await this.guild(guildId);
    return guild.name;
  }

  public async getMember(
    guildId: GuildId,
    userId: UserId,
  ): Promise<MemberSnapshot | null> {
    const guild = await this.guild(guildId);

    try {
      const member = await guild.members.fetch(userId);
      return {
        userId: unsafeSnowflake<UserId>(member.id),
        username: member.user.username,
        roleIds: [...member.roles.cache.keys()].map((id) => unsafeSnowflake<RoleId>(id)),
        highestRolePosition: member.roles.highest.position,
        joinedAt: member.joinedAt,
        isGuildOwner: guild.ownerId === member.id,
        communicationDisabledUntil: member.communicationDisabledUntil,
      };
    } catch (error) {
      // 10007 "Unknown Member" is a normal answer to "is this person here?",
      // not a failure. Everything else is.
      if (error instanceof DiscordAPIError && error.code === 10007) return null;
      throw error;
    }
  }

  public async getRoles(guildId: GuildId): Promise<ReadonlyMap<RoleId, RoleSnapshot>> {
    const guild = await this.guild(guildId);
    const roles = await guild.roles.fetch();

    const snapshots = new Map<RoleId, RoleSnapshot>();
    for (const [id, role] of roles) {
      const roleId = unsafeSnowflake<RoleId>(id);
      snapshots.set(roleId, {
        id: roleId,
        name: role.name,
        position: role.position,
        managed: role.managed,
      });
    }
    return snapshots;
  }

  public async getRole(guildId: GuildId, roleId: RoleId): Promise<RoleSnapshot | null> {
    const guild = await this.guild(guildId);
    const role = await guild.roles.fetch(roleId);
    if (!role) return null;

    return {
      id: unsafeSnowflake<RoleId>(role.id),
      name: role.name,
      position: role.position,
      managed: role.managed,
    };
  }

  /**
   * The bot's own position and permissions.
   *
   * Every role write is checked against this. `me` can legitimately be missing
   * from the cache before the guild is fully populated, so it is fetched
   * rather than assumed.
   */
  public async getSelf(guildId: GuildId): Promise<BotSelfSnapshot> {
    const guild = await this.guild(guildId);
    const me = guild.members.me ?? (await guild.members.fetchMe());

    return {
      userId: unsafeSnowflake<UserId>(me.id),
      applicationId: this.client.application?.id ?? me.id,
      highestRolePosition: me.roles.highest.position,
      highestRoleName: me.roles.highest.name,
      permissions: me.permissions.bitfield,
    };
  }

  public async channelExists(guildId: GuildId, channelId: ChannelId): Promise<boolean> {
    const guild = await this.guild(guildId);
    try {
      const channel = await guild.channels.fetch(channelId);
      return channel !== null;
    } catch (error) {
      // 10003 "Unknown Channel" — the configured id points at something that no
      // longer exists, which the caller wants to know as `false`.
      if (error instanceof DiscordAPIError && error.code === 10003) return false;
      throw error;
    }
  }

  private async guild(guildId: GuildId) {
    const cached = this.client.guilds.cache.get(guildId);
    if (cached) return cached;

    try {
      return await this.client.guilds.fetch(guildId);
    } catch {
      throw bloomError('GUILD_MISMATCH', {
        operatorHint: `This bot is not in guild ${guildId}, or the id in DISCORD_GUILD_ID is wrong. Invite the application to the server, then confirm the id by right-clicking the server with Developer Mode enabled.`,
        details: { guild_id: guildId },
      });
    }
  }
}

/** Does the bot hold this permission guild-wide? Used by the preflight check. */
export function botHasPermission(permissions: bigint, required: bigint): boolean {
  const bits = new PermissionsBitField(permissions);
  return bits.has(required);
}
