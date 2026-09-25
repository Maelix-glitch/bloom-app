import type {
  ChannelId,
  CorrelationId,
  GuildId,
  JsonValue,
  ModerationAction,
  UserId,
} from '@bloom/shared-types';
import { BaseRepository } from '../repository.js';
import { toDatabaseError, type Database, type TransactionSql } from '../client.js';

/**
 * The moderation action log.
 *
 * Warnings live here too, as rows with `action = 'warn'`. The Phase 0 sketch
 * had a separate `warnings` table; building it made the duplication obvious —
 * a warning is a moderation action plus a revocation column, and splitting them
 * would mean writing every listing query, index and retention rule twice.
 *
 * Nothing in this repository deletes. Reversal is `revoked_at`/`revoked_by`,
 * because "this member has never been warned" and "this member's warnings were
 * cleared in March" are different facts and staff need to be able to tell them
 * apart.
 */

export interface RecordActionInput {
  readonly guildId: GuildId;
  readonly action: ModerationAction;
  readonly actorId: UserId;
  readonly reason: string;
  readonly subjectId?: UserId | null;
  readonly channelId?: ChannelId | null;
  readonly caseId?: string | null;
  readonly durationSeconds?: number | null;
  readonly expiresAt?: Date | null;
  readonly metadata?: Readonly<Record<string, JsonValue>>;
  readonly correlationId?: CorrelationId | null;
}

export interface ModerationActionRow {
  readonly id: string;
  readonly guildId: GuildId;
  readonly caseId: string | null;
  readonly action: ModerationAction;
  readonly subjectId: UserId | null;
  readonly channelId: ChannelId | null;
  readonly actorId: UserId;
  readonly reason: string;
  readonly durationSeconds: number | null;
  readonly expiresAt: Date | null;
  readonly revokedAt: Date | null;
  readonly revokedBy: UserId | null;
  readonly revokedReason: string | null;
  readonly metadata: Readonly<Record<string, JsonValue>>;
  readonly createdAt: Date;
}

export interface MemberRecordSummary {
  readonly activeWarnings: number;
  readonly totalWarnings: number;
  readonly timeouts: number;
  readonly kicks: number;
  readonly bans: number;
  readonly notes: number;
  readonly lastActionAt: Date | null;
}

export interface ModerationRepository {
  record(input: RecordActionInput, tx?: TransactionSql): Promise<ModerationActionRow>;

  /** A member's record, newest first. Includes revoked rows: they are history. */
  listForSubject(
    guildId: GuildId,
    subjectId: UserId,
    options?: { readonly limit?: number; readonly actions?: readonly ModerationAction[] },
  ): Promise<readonly ModerationActionRow[]>;

  /** Actions taken against a channel: purges, slowmode changes, locks. */
  listForChannel(
    guildId: GuildId,
    channelId: ChannelId,
    options?: { readonly limit?: number; readonly actions?: readonly ModerationAction[] },
  ): Promise<readonly ModerationActionRow[]>;

  listForCase(caseId: string): Promise<readonly ModerationActionRow[]>;

  countActiveWarnings(guildId: GuildId, subjectId: UserId): Promise<number>;

  /**
   * Clear a member's active warnings.
   *
   * Returns how many were cleared so the caller can tell the difference between
   * "cleared four" and "there was nothing to clear" — reporting success for the
   * second is the kind of small lie that erodes trust in the tool.
   */
  revokeActiveWarnings(
    input: {
      readonly guildId: GuildId;
      readonly subjectId: UserId;
      readonly revokedBy: UserId;
      readonly reason: string;
    },
    tx?: TransactionSql,
  ): Promise<number>;

  /** Mark a single action reversed, e.g. a ban that was lifted. */
  revokeAction(
    input: {
      readonly id: string;
      readonly guildId: GuildId;
      readonly revokedBy: UserId;
      readonly reason: string;
    },
    tx?: TransactionSql,
  ): Promise<boolean>;

  summarise(guildId: GuildId, subjectId: UserId): Promise<MemberRecordSummary>;
}

interface RawActionRow {
  readonly id: string;
  readonly guild_id: GuildId;
  readonly case_id: string | null;
  readonly action: ModerationAction;
  readonly subject_id: UserId | null;
  readonly channel_id: ChannelId | null;
  readonly actor_id: UserId;
  readonly reason: string;
  readonly duration_seconds: number | null;
  readonly expires_at: Date | null;
  readonly revoked_at: Date | null;
  readonly revoked_by: UserId | null;
  readonly revoked_reason: string | null;
  readonly metadata: Readonly<Record<string, JsonValue>> | null;
  readonly created_at: Date;
}

function mapAction(row: RawActionRow): ModerationActionRow {
  return {
    id: row.id,
    guildId: row.guild_id,
    caseId: row.case_id,
    action: row.action,
    subjectId: row.subject_id,
    channelId: row.channel_id,
    actorId: row.actor_id,
    reason: row.reason,
    durationSeconds: row.duration_seconds,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    revokedBy: row.revoked_by,
    revokedReason: row.revoked_reason,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}

export class PostgresModerationRepository
  extends BaseRepository
  implements ModerationRepository
{
  public constructor(database: Database) {
    super(database);
  }

  public async record(
    input: RecordActionInput,
    tx?: TransactionSql,
  ): Promise<ModerationActionRow> {
    const sql = this.conn(tx);
    try {
      const rows = await sql<RawActionRow[]>`
        INSERT INTO ${sql(this.schema)}.moderation_actions
          (guild_id, case_id, action, subject_id, channel_id, actor_id, reason,
           duration_seconds, expires_at, metadata, correlation_id)
        VALUES (
          ${input.guildId},
          ${input.caseId ?? null},
          ${input.action},
          ${input.subjectId ?? null},
          ${input.channelId ?? null},
          ${input.actorId},
          ${input.reason},
          ${input.durationSeconds ?? null},
          ${input.expiresAt ?? null},
          ${sql.json(input.metadata ?? {})},
          ${input.correlationId ?? null}
        )
        RETURNING id, guild_id, case_id, action, subject_id, channel_id, actor_id,
                  reason, duration_seconds, expires_at, revoked_at, revoked_by,
                  revoked_reason, metadata, created_at
      `;

      const row = rows[0];
      if (!row) {
        // An INSERT … RETURNING that returns nothing is not a normal outcome;
        // surfacing it as a database error is more honest than a null return
        // the caller would have to invent a meaning for.
        throw new Error('INSERT into moderation_actions returned no row');
      }
      return mapAction(row);
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async listForSubject(
    guildId: GuildId,
    subjectId: UserId,
    options?: { readonly limit?: number; readonly actions?: readonly ModerationAction[] },
  ): Promise<readonly ModerationActionRow[]> {
    const sql = this.conn();
    const limit = Math.min(Math.max(options?.limit ?? 25, 1), 100);
    const actions = options?.actions;

    try {
      const rows = await sql<RawActionRow[]>`
        SELECT id, guild_id, case_id, action, subject_id, channel_id, actor_id,
               reason, duration_seconds, expires_at, revoked_at, revoked_by,
               revoked_reason, metadata, created_at
        FROM ${sql(this.schema)}.moderation_actions
        WHERE guild_id = ${guildId}
          AND subject_id = ${subjectId}
          ${
            actions && actions.length > 0
              ? sql`AND action = ANY(${sql.array([...actions])}::${sql(this.schema)}.moderation_action[])`
              : sql``
          }
        ORDER BY created_at DESC, id DESC
        LIMIT ${limit}
      `;
      return rows.map(mapAction);
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async listForChannel(
    guildId: GuildId,
    channelId: ChannelId,
    options?: { readonly limit?: number; readonly actions?: readonly ModerationAction[] },
  ): Promise<readonly ModerationActionRow[]> {
    const sql = this.conn();
    const limit = Math.min(Math.max(options?.limit ?? 25, 1), 100);
    const actions = options?.actions;

    try {
      const rows = await sql<RawActionRow[]>`
        SELECT id, guild_id, case_id, action, subject_id, channel_id, actor_id,
               reason, duration_seconds, expires_at, revoked_at, revoked_by,
               revoked_reason, metadata, created_at
        FROM ${sql(this.schema)}.moderation_actions
        WHERE guild_id = ${guildId}
          AND channel_id = ${channelId}
          ${
            actions && actions.length > 0
              ? sql`AND action = ANY(${sql.array([...actions])}::${sql(this.schema)}.moderation_action[])`
              : sql``
          }
        ORDER BY created_at DESC, id DESC
        LIMIT ${limit}
      `;
      return rows.map(mapAction);
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async listForCase(caseId: string): Promise<readonly ModerationActionRow[]> {
    const sql = this.conn();
    try {
      const rows = await sql<RawActionRow[]>`
        SELECT id, guild_id, case_id, action, subject_id, channel_id, actor_id,
               reason, duration_seconds, expires_at, revoked_at, revoked_by,
               revoked_reason, metadata, created_at
        FROM ${sql(this.schema)}.moderation_actions
        WHERE case_id = ${caseId}
        ORDER BY created_at ASC, id ASC
      `;
      return rows.map(mapAction);
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async countActiveWarnings(
    guildId: GuildId,
    subjectId: UserId,
  ): Promise<number> {
    const sql = this.conn();
    try {
      const rows = await sql<{ count: number }[]>`
        SELECT count(*)::int AS count
        FROM ${sql(this.schema)}.moderation_actions
        WHERE guild_id = ${guildId}
          AND subject_id = ${subjectId}
          AND action = 'warn'
          AND revoked_at IS NULL
      `;
      return rows[0]?.count ?? 0;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async revokeActiveWarnings(
    input: {
      readonly guildId: GuildId;
      readonly subjectId: UserId;
      readonly revokedBy: UserId;
      readonly reason: string;
    },
    tx?: TransactionSql,
  ): Promise<number> {
    const sql = this.conn(tx);
    try {
      const rows = await sql<{ id: string }[]>`
        UPDATE ${sql(this.schema)}.moderation_actions
        SET revoked_at = now(),
            revoked_by = ${input.revokedBy},
            revoked_reason = ${input.reason}
        WHERE guild_id = ${input.guildId}
          AND subject_id = ${input.subjectId}
          AND action = 'warn'
          AND revoked_at IS NULL
        RETURNING id
      `;
      return rows.length;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async revokeAction(
    input: {
      readonly id: string;
      readonly guildId: GuildId;
      readonly revokedBy: UserId;
      readonly reason: string;
    },
    tx?: TransactionSql,
  ): Promise<boolean> {
    const sql = this.conn(tx);
    try {
      const rows = await sql<{ id: string }[]>`
        UPDATE ${sql(this.schema)}.moderation_actions
        SET revoked_at = now(),
            revoked_by = ${input.revokedBy},
            revoked_reason = ${input.reason}
        WHERE id = ${input.id}
          AND guild_id = ${input.guildId}
          AND revoked_at IS NULL
        RETURNING id
      `;
      return rows.length === 1;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async summarise(
    guildId: GuildId,
    subjectId: UserId,
  ): Promise<MemberRecordSummary> {
    const sql = this.conn();
    try {
      /*
       * One pass with filtered aggregates rather than six round trips. The
       * counts are always read together — a moderator looking at someone's
       * record wants the whole picture — and issuing six queries would make the
       * numbers mutually inconsistent under concurrent writes.
       */
      const rows = await sql<
        {
          active_warnings: number;
          total_warnings: number;
          timeouts: number;
          kicks: number;
          bans: number;
          notes: number;
          last_action_at: Date | null;
        }[]
      >`
        SELECT
          count(*) FILTER (WHERE action = 'warn' AND revoked_at IS NULL)::int AS active_warnings,
          count(*) FILTER (WHERE action = 'warn')::int                        AS total_warnings,
          count(*) FILTER (WHERE action = 'timeout')::int                     AS timeouts,
          count(*) FILTER (WHERE action = 'kick')::int                        AS kicks,
          count(*) FILTER (WHERE action = 'ban')::int                         AS bans,
          count(*) FILTER (WHERE action = 'note')::int                        AS notes,
          max(created_at)                                                     AS last_action_at
        FROM ${sql(this.schema)}.moderation_actions
        WHERE guild_id = ${guildId} AND subject_id = ${subjectId}
      `;

      const row = rows[0];
      return {
        activeWarnings: row?.active_warnings ?? 0,
        totalWarnings: row?.total_warnings ?? 0,
        timeouts: row?.timeouts ?? 0,
        kicks: row?.kicks ?? 0,
        bans: row?.bans ?? 0,
        notes: row?.notes ?? 0,
        lastActionAt: row?.last_action_at ?? null,
      };
    } catch (error) {
      throw toDatabaseError(error);
    }
  }
}
