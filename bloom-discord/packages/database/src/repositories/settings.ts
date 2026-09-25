import type {
  BotName,
  ChannelId,
  ChannelKey,
  GuildId,
  JsonValue,
  RoleId,
  RoleKey,
  UserId,
} from '@bloom/shared-types';
import { BaseRepository } from '../repository.js';
import { toDatabaseError, type Database } from '../client.js';

export interface SettingsRepository {
  getChannelOverrides(guildId: GuildId): Promise<ReadonlyMap<ChannelKey, ChannelId>>;
  setChannelOverride(
    guildId: GuildId,
    key: ChannelKey,
    channelId: ChannelId,
    updatedBy: UserId,
  ): Promise<void>;
  clearChannelOverride(guildId: GuildId, key: ChannelKey): Promise<void>;

  getRoleOverrides(guildId: GuildId): Promise<ReadonlyMap<RoleKey, RoleId>>;
  setRoleOverride(
    guildId: GuildId,
    key: RoleKey,
    roleId: RoleId,
    updatedBy: UserId,
  ): Promise<void>;
  clearRoleOverride(guildId: GuildId, key: RoleKey): Promise<void>;

  getBotSetting(guildId: GuildId, bot: BotName, key: string): Promise<JsonValue | null>;
  setBotSetting(
    guildId: GuildId,
    bot: BotName,
    key: string,
    value: JsonValue,
    updatedBy: UserId,
  ): Promise<void>;
  getAllBotSettings(
    guildId: GuildId,
    bot: BotName,
  ): Promise<ReadonlyMap<string, JsonValue>>;
}

/**
 * Runtime configuration overrides.
 *
 * Environment variables set the baseline at boot; these rows let an
 * administrator retarget a channel through a command without a deploy. The
 * resolver in `@bloom/config` reads the override first and falls back to env.
 *
 * `updated_by` is recorded on every write. "Who pointed the reports channel at
 * #general" is a question worth being able to answer.
 */
export class PostgresSettingsRepository
  extends BaseRepository
  implements SettingsRepository
{
  public constructor(database: Database) {
    super(database);
  }

  public async getChannelOverrides(
    guildId: GuildId,
  ): Promise<ReadonlyMap<ChannelKey, ChannelId>> {
    const sql = this.conn();
    try {
      const rows = await sql<{ channel_key: string; channel_id: string }[]>`
        SELECT channel_key, channel_id FROM ${sql(this.schema)}.channel_settings
        WHERE guild_id = ${guildId}
      `;
      return new Map(
        rows.map((row) => [row.channel_key as ChannelKey, row.channel_id as ChannelId]),
      );
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async setChannelOverride(
    guildId: GuildId,
    key: ChannelKey,
    channelId: ChannelId,
    updatedBy: UserId,
  ): Promise<void> {
    const sql = this.conn();
    try {
      await sql`
        INSERT INTO ${sql(this.schema)}.channel_settings (guild_id, channel_key, channel_id, updated_by)
        VALUES (${guildId}, ${key}, ${channelId}, ${updatedBy})
        ON CONFLICT (guild_id, channel_key)
        DO UPDATE SET channel_id = EXCLUDED.channel_id, updated_by = EXCLUDED.updated_by
      `;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async clearChannelOverride(guildId: GuildId, key: ChannelKey): Promise<void> {
    const sql = this.conn();
    try {
      await sql`
        DELETE FROM ${sql(this.schema)}.channel_settings
        WHERE guild_id = ${guildId} AND channel_key = ${key}
      `;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async getRoleOverrides(guildId: GuildId): Promise<ReadonlyMap<RoleKey, RoleId>> {
    const sql = this.conn();
    try {
      const rows = await sql<{ role_key: string; role_id: string }[]>`
        SELECT role_key, role_id FROM ${sql(this.schema)}.role_settings
        WHERE guild_id = ${guildId}
      `;
      return new Map(rows.map((row) => [row.role_key as RoleKey, row.role_id as RoleId]));
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async setRoleOverride(
    guildId: GuildId,
    key: RoleKey,
    roleId: RoleId,
    updatedBy: UserId,
  ): Promise<void> {
    const sql = this.conn();
    try {
      await sql`
        INSERT INTO ${sql(this.schema)}.role_settings (guild_id, role_key, role_id, updated_by)
        VALUES (${guildId}, ${key}, ${roleId}, ${updatedBy})
        ON CONFLICT (guild_id, role_key)
        DO UPDATE SET role_id = EXCLUDED.role_id, updated_by = EXCLUDED.updated_by
      `;
    } catch (error) {
      // The UNIQUE (guild_id, role_id) constraint surfaces here: two role keys
      // may not share one role id. See migration 0003 for why that matters.
      throw toDatabaseError(error);
    }
  }

  public async clearRoleOverride(guildId: GuildId, key: RoleKey): Promise<void> {
    const sql = this.conn();
    try {
      await sql`
        DELETE FROM ${sql(this.schema)}.role_settings
        WHERE guild_id = ${guildId} AND role_key = ${key}
      `;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async getBotSetting(
    guildId: GuildId,
    bot: BotName,
    key: string,
  ): Promise<JsonValue | null> {
    const sql = this.conn();
    try {
      const rows = await sql<{ value: JsonValue }[]>`
        SELECT value FROM ${sql(this.schema)}.bot_settings
        WHERE guild_id = ${guildId} AND bot_name = ${bot} AND key = ${key}
      `;
      return rows[0]?.value ?? null;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async setBotSetting(
    guildId: GuildId,
    bot: BotName,
    key: string,
    value: JsonValue,
    updatedBy: UserId,
  ): Promise<void> {
    const sql = this.conn();
    try {
      await sql`
        INSERT INTO ${sql(this.schema)}.bot_settings (guild_id, bot_name, key, value, updated_by)
        VALUES (${guildId}, ${bot}, ${key}, ${sql.json(value)}, ${updatedBy})
        ON CONFLICT (guild_id, bot_name, key)
        DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by
      `;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async getAllBotSettings(
    guildId: GuildId,
    bot: BotName,
  ): Promise<ReadonlyMap<string, JsonValue>> {
    const sql = this.conn();
    try {
      const rows = await sql<{ key: string; value: JsonValue }[]>`
        SELECT key, value FROM ${sql(this.schema)}.bot_settings
        WHERE guild_id = ${guildId} AND bot_name = ${bot}
      `;
      return new Map(rows.map((row) => [row.key, row.value]));
    } catch (error) {
      throw toDatabaseError(error);
    }
  }
}
