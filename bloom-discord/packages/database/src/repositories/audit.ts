import type {
  BotName,
  ChannelId,
  CorrelationId,
  GuildId,
  JsonObject,
  LogSeverity,
  UserId,
} from '@bloom/shared-types';
import { redactObject } from '@bloom/utils';
import { BaseRepository } from '../repository.js';
import { toDatabaseError, type Database, type TransactionSql } from '../client.js';

export interface AuditEventInput {
  readonly guildId: GuildId;
  readonly botName: BotName;
  /** Dotted, lowercase, e.g. `onboarding.completed`. Constrained by the schema. */
  readonly event: string;
  readonly severity?: LogSeverity;
  readonly actorId?: UserId | null;
  readonly targetId?: UserId | null;
  readonly channelId?: ChannelId | null;
  /** The command or gateway event that caused this. */
  readonly source?: string | null;
  readonly correlationId?: CorrelationId | null;
  readonly details?: JsonObject;
}

export interface AuditEventRow {
  readonly id: string;
  readonly guildId: GuildId;
  readonly botName: BotName;
  readonly event: string;
  readonly severity: LogSeverity;
  readonly actorId: UserId | null;
  readonly targetId: UserId | null;
  readonly channelId: ChannelId | null;
  readonly source: string | null;
  readonly correlationId: CorrelationId | null;
  readonly details: JsonObject;
  readonly createdAt: Date;
}

export interface AuditEventRepository {
  append(input: AuditEventInput, tx?: TransactionSql): Promise<string>;
  listForTarget(
    guildId: GuildId,
    targetId: UserId,
    limit?: number,
  ): Promise<readonly AuditEventRow[]>;
  listRecent(guildId: GuildId, limit?: number): Promise<readonly AuditEventRow[]>;
}

/**
 * Append-only audit trail.
 *
 * There is no update and no delete, and there will not be one. "Do not delete
 * evidence automatically" is a requirement, and the cheapest way to honour it is
 * to not write the code that could.
 *
 * `details` is redacted on the way in. The audit table is read by staff tooling
 * and exported during reviews, so a token that leaked into a details object
 * would be a token in a document someone emails.
 */
export class PostgresAuditEventRepository
  extends BaseRepository
  implements AuditEventRepository
{
  public constructor(database: Database) {
    super(database);
  }

  public async append(input: AuditEventInput, tx?: TransactionSql): Promise<string> {
    const sql = this.conn(tx);
    try {
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO ${sql(this.schema)}.audit_events (
          guild_id, bot_name, event, severity,
          actor_id, target_id, channel_id,
          source, correlation_id, details
        ) VALUES (
          ${input.guildId}, ${input.botName}, ${input.event}, ${input.severity ?? 'info'},
          ${input.actorId ?? null}, ${input.targetId ?? null}, ${input.channelId ?? null},
          ${input.source ?? null}, ${input.correlationId ?? null},
          ${sql.json(redactObject(input.details ?? {}))}
        )
        RETURNING id
      `;
      return row!.id;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async listForTarget(
    guildId: GuildId,
    targetId: UserId,
    limit = 50,
  ): Promise<readonly AuditEventRow[]> {
    const sql = this.conn();
    try {
      const rows = await sql<RawAuditRow[]>`
        SELECT * FROM ${sql(this.schema)}.audit_events
        WHERE guild_id = ${guildId} AND target_id = ${targetId}
        ORDER BY created_at DESC
        LIMIT ${clampLimit(limit)}
      `;
      return rows.map(mapAuditRow);
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async listRecent(
    guildId: GuildId,
    limit = 50,
  ): Promise<readonly AuditEventRow[]> {
    const sql = this.conn();
    try {
      const rows = await sql<RawAuditRow[]>`
        SELECT * FROM ${sql(this.schema)}.audit_events
        WHERE guild_id = ${guildId}
        ORDER BY created_at DESC
        LIMIT ${clampLimit(limit)}
      `;
      return rows.map(mapAuditRow);
    } catch (error) {
      throw toDatabaseError(error);
    }
  }
}

interface RawAuditRow {
  id: string;
  guild_id: string;
  bot_name: BotName;
  event: string;
  severity: LogSeverity;
  actor_id: string | null;
  target_id: string | null;
  channel_id: string | null;
  source: string | null;
  correlation_id: string | null;
  details: JsonObject;
  created_at: Date;
}

function mapAuditRow(row: RawAuditRow): AuditEventRow {
  return {
    id: row.id,
    guildId: row.guild_id as GuildId,
    botName: row.bot_name,
    event: row.event,
    severity: row.severity,
    actorId: row.actor_id as UserId | null,
    targetId: row.target_id as UserId | null,
    channelId: row.channel_id as ChannelId | null,
    source: row.source,
    correlationId: row.correlation_id as CorrelationId | null,
    details: row.details,
    createdAt: row.created_at,
  };
}

/** Bound page sizes so a caller cannot ask for the whole table. */
function clampLimit(limit: number): number {
  return Math.min(Math.max(Math.trunc(limit), 1), 200);
}
