import type {
  BloomErrorCode,
  BotName,
  ChannelId,
  CorrelationId,
  GuildId,
  JsonObject,
  UserId,
} from '@bloom/shared-types';
import { BaseRepository } from '../repository.js';
import { toDatabaseError, type Database } from '../client.js';

export type CommandOutcome =
  'success' | 'user_error' | 'authorization_denied' | 'system_error' | 'rate_limited';

export interface CommandUsageInput {
  readonly guildId: GuildId;
  readonly botName: BotName;
  readonly command: string;
  readonly actorId: UserId;
  readonly channelId?: ChannelId | null;
  readonly outcome: CommandOutcome;
  readonly errorCode?: BloomErrorCode | null;
  readonly durationMs: number;
  readonly correlationId?: CorrelationId | null;
}

export interface HealthSnapshot {
  readonly botName: BotName;
  readonly instanceId: string;
  readonly version: string;
  readonly environment: string;
  readonly gatewayConnected: boolean;
  readonly gatewayPingMs: number | null;
  readonly databaseOk: boolean;
  readonly startedAt: Date;
  readonly observedAt: Date;
  readonly commandsHandled: number;
  readonly errorsTotal: number;
  readonly lastCommandAt: Date | null;
  readonly lastErrorAt: Date | null;
  readonly lastErrorCode: string | null;
  readonly details: JsonObject;
}

export interface TelemetryRepository {
  recordCommand(input: CommandUsageInput): Promise<void>;
  /** Error count and last error in a window, for /health. Real numbers, not estimates. */
  errorStats(
    botName: BotName,
    sinceMinutes: number,
  ): Promise<{ total: number; errors: number; lastErrorAt: Date | null }>;

  writeHealth(snapshot: Omit<HealthSnapshot, 'observedAt'>): Promise<void>;
  readHealth(botName: BotName): Promise<HealthSnapshot | null>;
  readAllHealth(): Promise<readonly HealthSnapshot[]>;
}

/**
 * Command telemetry and cross-bot health.
 *
 * Deliberately stores no command arguments. That `/warn` was used is
 * operational data; what the reason said is private moderation content and
 * belongs only in the moderation case, behind staff-only access.
 *
 * `writeHealth` is an upsert of a single row per bot. Readers must always
 * consult `observed_at` — a row saying `gateway_connected = true` that was
 * written 40 minutes ago means the process died, not that it is online. The
 * brief's "do not fake statuses" is a property of how this is *read*, and the
 * health command enforces a staleness window.
 */
export class PostgresTelemetryRepository
  extends BaseRepository
  implements TelemetryRepository
{
  public constructor(database: Database) {
    super(database);
  }

  public async recordCommand(input: CommandUsageInput): Promise<void> {
    const sql = this.conn();
    try {
      await sql`
        INSERT INTO ${sql(this.schema)}.command_usage
          (guild_id, bot_name, command, actor_id, channel_id, outcome, error_code, duration_ms, correlation_id)
        VALUES (
          ${input.guildId}, ${input.botName}, ${input.command}, ${input.actorId},
          ${input.channelId ?? null}, ${input.outcome}, ${input.errorCode ?? null},
          ${Math.max(0, Math.trunc(input.durationMs))}, ${input.correlationId ?? null}
        )
      `;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async errorStats(
    botName: BotName,
    sinceMinutes: number,
  ): Promise<{ total: number; errors: number; lastErrorAt: Date | null }> {
    const sql = this.conn();
    const minutes = Math.min(Math.max(Math.trunc(sinceMinutes), 1), 10_080);
    try {
      const rows = await sql<
        { total: string; errors: string; last_error_at: Date | null }[]
      >`
        SELECT
          COUNT(*)::text AS total,
          COUNT(*) FILTER (WHERE outcome <> 'success')::text AS errors,
          MAX(created_at) FILTER (WHERE outcome = 'system_error') AS last_error_at
        FROM ${sql(this.schema)}.command_usage
        WHERE bot_name = ${botName}
          AND created_at > now() - make_interval(mins => ${minutes})
      `;
      const row = rows[0];
      return {
        total: Number.parseInt(row?.total ?? '0', 10),
        errors: Number.parseInt(row?.errors ?? '0', 10),
        lastErrorAt: row?.last_error_at ?? null,
      };
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async writeHealth(snapshot: Omit<HealthSnapshot, 'observedAt'>): Promise<void> {
    const sql = this.conn();
    try {
      await sql`
        INSERT INTO ${sql(this.schema)}.system_health (
          bot_name, instance_id, version, environment,
          gateway_connected, gateway_ping_ms, database_ok,
          started_at, observed_at,
          commands_handled, errors_total, last_command_at, last_error_at, last_error_code, details
        ) VALUES (
          ${snapshot.botName}, ${snapshot.instanceId}, ${snapshot.version}, ${snapshot.environment},
          ${snapshot.gatewayConnected}, ${snapshot.gatewayPingMs}, ${snapshot.databaseOk},
          ${snapshot.startedAt}, now(),
          ${snapshot.commandsHandled}, ${snapshot.errorsTotal},
          ${snapshot.lastCommandAt}, ${snapshot.lastErrorAt}, ${snapshot.lastErrorCode},
          ${sql.json(snapshot.details)}
        )
        ON CONFLICT (bot_name) DO UPDATE SET
          instance_id = EXCLUDED.instance_id,
          version = EXCLUDED.version,
          environment = EXCLUDED.environment,
          gateway_connected = EXCLUDED.gateway_connected,
          gateway_ping_ms = EXCLUDED.gateway_ping_ms,
          database_ok = EXCLUDED.database_ok,
          started_at = EXCLUDED.started_at,
          observed_at = now(),
          commands_handled = EXCLUDED.commands_handled,
          errors_total = EXCLUDED.errors_total,
          last_command_at = EXCLUDED.last_command_at,
          last_error_at = EXCLUDED.last_error_at,
          last_error_code = EXCLUDED.last_error_code,
          details = EXCLUDED.details
      `;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async readHealth(botName: BotName): Promise<HealthSnapshot | null> {
    const sql = this.conn();
    try {
      const rows = await sql<RawHealthRow[]>`
        SELECT * FROM ${sql(this.schema)}.system_health WHERE bot_name = ${botName}
      `;
      const row = rows[0];
      return row ? mapHealth(row) : null;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async readAllHealth(): Promise<readonly HealthSnapshot[]> {
    const sql = this.conn();
    try {
      const rows = await sql<RawHealthRow[]>`
        SELECT * FROM ${sql(this.schema)}.system_health ORDER BY bot_name
      `;
      return rows.map(mapHealth);
    } catch (error) {
      throw toDatabaseError(error);
    }
  }
}

interface RawHealthRow {
  bot_name: BotName;
  instance_id: string;
  version: string;
  environment: string;
  gateway_connected: boolean;
  gateway_ping_ms: number | null;
  database_ok: boolean;
  started_at: Date;
  observed_at: Date;
  commands_handled: string;
  errors_total: string;
  last_command_at: Date | null;
  last_error_at: Date | null;
  last_error_code: string | null;
  details: JsonObject;
}

function mapHealth(row: RawHealthRow): HealthSnapshot {
  return {
    botName: row.bot_name,
    instanceId: row.instance_id,
    version: row.version,
    environment: row.environment,
    gatewayConnected: row.gateway_connected,
    gatewayPingMs: row.gateway_ping_ms,
    databaseOk: row.database_ok,
    startedAt: row.started_at,
    observedAt: row.observed_at,
    // bigint arrives as a string from the driver; these counters stay well
    // inside the safe integer range, so parsing here is fine and explicit.
    commandsHandled: Number.parseInt(row.commands_handled, 10),
    errorsTotal: Number.parseInt(row.errors_total, 10),
    lastCommandAt: row.last_command_at,
    lastErrorAt: row.last_error_at,
    lastErrorCode: row.last_error_code,
    details: row.details,
  };
}
