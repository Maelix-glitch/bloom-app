import {
  bloomError,
  canTransitionCase,
  CASE_TRANSITIONS,
  requiresResolution,
  type CaseEventType,
  type CaseOrigin,
  type CaseStatus,
  type ChannelId,
  type CorrelationId,
  type GuildId,
  type MessageId,
  type ReportCategory,
  type UserId,
} from '@bloom/shared-types';
import { BaseRepository } from '../repository.js';
import { toDatabaseError, type Database, type TransactionSql } from '../client.js';

/**
 * Cases, their history, and the reports that open them.
 *
 * One repository because they are one aggregate: a report without its case is
 * unreachable, and a case status change without its history entry is the exact
 * gap that makes a moderation record unusable in a dispute. Keeping them
 * together is what lets every write below be a single transaction.
 *
 * Mirrors `OnboardingRepository` deliberately. `transitionStatus` returns a
 * discriminated result rather than throwing, for the same reason: two
 * moderators resolving the same case at the same moment is ordinary, not
 * exceptional, and the loser should be told what happened rather than shown a
 * stack trace.
 */

export interface OpenCaseInput {
  readonly guildId: GuildId;
  readonly origin: CaseOrigin;
  readonly openedBy: UserId;
  readonly summary: string;
  readonly subjectId?: UserId | null;
  readonly category?: ReportCategory | null;
  readonly status?: CaseStatus;
  readonly correlationId?: CorrelationId | null;
}

export interface ReportInput {
  readonly reporterId: UserId;
  readonly category: ReportCategory;
  readonly description: string;
  readonly targetUserId?: UserId | null;
  readonly targetChannelId?: ChannelId | null;
  readonly targetMessageId?: MessageId | null;
}

export interface CaseRow {
  readonly id: string;
  readonly guildId: GuildId;
  readonly caseNumber: number;
  readonly status: CaseStatus;
  readonly origin: CaseOrigin;
  readonly category: ReportCategory | null;
  readonly subjectId: UserId | null;
  readonly openedBy: UserId;
  readonly assignedTo: UserId | null;
  readonly summary: string;
  readonly resolution: string | null;
  readonly openedAt: Date;
  readonly updatedAt: Date;
  readonly resolvedAt: Date | null;
  readonly closedAt: Date | null;
}

export interface CaseEventRow {
  readonly id: string;
  readonly caseId: string;
  readonly eventType: CaseEventType;
  readonly fromStatus: CaseStatus | null;
  readonly toStatus: CaseStatus | null;
  readonly actorId: UserId | null;
  readonly body: string | null;
  readonly createdAt: Date;
}

export interface ReportRow {
  readonly id: string;
  readonly caseId: string;
  readonly reporterId: UserId;
  readonly category: ReportCategory;
  readonly targetUserId: UserId | null;
  readonly targetChannelId: ChannelId | null;
  readonly targetMessageId: MessageId | null;
  /** PRIVATE. Staff surfaces only — never rendered to the reported member. */
  readonly description: string;
  readonly createdAt: Date;
}

export type CaseTransitionOutcome =
  | { readonly kind: 'applied'; readonly from: CaseStatus; readonly to: CaseStatus }
  | { readonly kind: 'already_in_state'; readonly status: CaseStatus }
  | {
      readonly kind: 'conflict';
      readonly actual: CaseStatus;
      readonly expected: CaseStatus;
    }
  | { readonly kind: 'not_found' }
  /** CLOSED is terminal; nothing moves out of it. */
  | { readonly kind: 'terminal'; readonly status: CaseStatus };

export interface TransitionCaseInput {
  readonly guildId: GuildId;
  readonly caseNumber: number;
  readonly to: CaseStatus;
  readonly actorId: UserId;
  readonly note?: string | null;
  /** Required when moving to RESOLVED — the schema refuses it otherwise. */
  readonly resolution?: string | null;
  readonly correlationId?: CorrelationId | null;
}

export interface CaseListFilter {
  readonly status?: CaseStatus | null;
  readonly assignedTo?: UserId | null;
  readonly subjectId?: UserId | null;
  readonly limit?: number;
}

export interface CaseRepository {
  open(
    input: OpenCaseInput,
    report?: ReportInput,
    tx?: TransactionSql,
  ): Promise<{ readonly case: CaseRow; readonly report: ReportRow | null }>;

  findByNumber(guildId: GuildId, caseNumber: number): Promise<CaseRow | null>;
  list(guildId: GuildId, filter?: CaseListFilter): Promise<readonly CaseRow[]>;
  listEvents(caseId: string, limit?: number): Promise<readonly CaseEventRow[]>;
  findReport(caseId: string): Promise<ReportRow | null>;

  transitionStatus(
    input: TransitionCaseInput,
    tx?: TransactionSql,
  ): Promise<CaseTransitionOutcome>;

  assign(
    input: {
      readonly guildId: GuildId;
      readonly caseNumber: number;
      readonly assignee: UserId | null;
      readonly actorId: UserId;
      readonly correlationId?: CorrelationId | null;
    },
    tx?: TransactionSql,
  ): Promise<CaseRow | null>;

  appendEvent(
    input: {
      readonly caseId: string;
      readonly eventType: CaseEventType;
      readonly actorId?: UserId | null;
      readonly body?: string | null;
      readonly correlationId?: CorrelationId | null;
    },
    tx?: TransactionSql,
  ): Promise<void>;

  countByStatus(guildId: GuildId): Promise<Readonly<Record<CaseStatus, number>>>;
}

interface RawCaseRow {
  readonly id: string;
  readonly guild_id: GuildId;
  readonly case_number: number;
  readonly status: CaseStatus;
  readonly origin: CaseOrigin;
  readonly category: ReportCategory | null;
  readonly subject_id: UserId | null;
  readonly opened_by: UserId;
  readonly assigned_to: UserId | null;
  readonly summary: string;
  readonly resolution: string | null;
  readonly opened_at: Date;
  readonly updated_at: Date;
  readonly resolved_at: Date | null;
  readonly closed_at: Date | null;
}

function mapCase(row: RawCaseRow): CaseRow {
  return {
    id: row.id,
    guildId: row.guild_id,
    caseNumber: row.case_number,
    status: row.status,
    origin: row.origin,
    category: row.category,
    subjectId: row.subject_id,
    openedBy: row.opened_by,
    assignedTo: row.assigned_to,
    summary: row.summary,
    resolution: row.resolution,
    openedAt: row.opened_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at,
    closedAt: row.closed_at,
  };
}

const CASE_COLUMNS =
  'id, guild_id, case_number, status, origin, category, subject_id, opened_by, ' +
  'assigned_to, summary, resolution, opened_at, updated_at, resolved_at, closed_at';

export class PostgresCaseRepository extends BaseRepository implements CaseRepository {
  public constructor(database: Database) {
    super(database);
  }

  public async open(
    input: OpenCaseInput,
    report?: ReportInput,
    tx?: TransactionSql,
  ): Promise<{ readonly case: CaseRow; readonly report: ReportRow | null }> {
    const status = input.status ?? 'OPEN';

    // A case may not be born resolved or closed: those states carry evidence
    // requirements (`resolved_at`, a resolution) that opening cannot satisfy.
    if (status === 'RESOLVED' || status === 'CLOSED') {
      throw bloomError('INVALID_INPUT', {
        operatorHint: `A case cannot be opened directly into "${status}". Open it, then transition.`,
        details: { status },
      });
    }

    const run = async (
      conn: TransactionSql,
    ): Promise<{ readonly case: CaseRow; readonly report: ReportRow | null }> => {
      /*
       * Allocate the case number under a row lock.
       *
       * `INSERT … ON CONFLICT DO UPDATE … RETURNING` is atomic: concurrent
       * callers serialise on the counter row and each receives a distinct
       * number. The alternative — `max(case_number) + 1` — is a lost-update
       * race that two moderators filing simultaneously would hit, and the loser
       * gets a unique-violation at the worst possible moment.
       */
      const counter = await conn<{ next_number: number }[]>`
        INSERT INTO ${conn(this.schema)}.case_counters (guild_id, next_number)
        VALUES (${input.guildId}, 2)
        ON CONFLICT (guild_id) DO UPDATE
          SET next_number = ${conn(this.schema)}.case_counters.next_number + 1,
              updated_at = now()
        RETURNING ${conn(this.schema)}.case_counters.next_number - 1 AS next_number
      `;

      const caseNumber = counter[0]?.next_number;
      if (caseNumber === undefined) {
        throw new Error('case number allocation returned no row');
      }

      const inserted = await conn<RawCaseRow[]>`
        INSERT INTO ${conn(this.schema)}.moderation_cases
          (guild_id, case_number, status, origin, category, subject_id, opened_by,
           summary, correlation_id)
        VALUES (
          ${input.guildId}, ${caseNumber}, ${status}, ${input.origin},
          ${input.category ?? null}, ${input.subjectId ?? null}, ${input.openedBy},
          ${input.summary}, ${input.correlationId ?? null}
        )
        RETURNING ${conn.unsafe(CASE_COLUMNS)}
      `;

      const caseRow = inserted[0];
      if (!caseRow) throw new Error('INSERT into moderation_cases returned no row');

      await conn`
        INSERT INTO ${conn(this.schema)}.case_events
          (case_id, event_type, actor_id, body, correlation_id)
        VALUES (${caseRow.id}, 'opened', ${input.openedBy}, ${input.summary},
                ${input.correlationId ?? null})
      `;

      let reportRow: ReportRow | null = null;
      if (report) {
        const reports = await conn<
          {
            id: string;
            case_id: string;
            reporter_id: UserId;
            category: ReportCategory;
            target_user_id: UserId | null;
            target_channel_id: ChannelId | null;
            target_message_id: MessageId | null;
            description: string;
            created_at: Date;
          }[]
        >`
          INSERT INTO ${conn(this.schema)}.reports
            (guild_id, case_id, reporter_id, category, target_user_id,
             target_channel_id, target_message_id, description, correlation_id)
          VALUES (
            ${input.guildId}, ${caseRow.id}, ${report.reporterId}, ${report.category},
            ${report.targetUserId ?? null}, ${report.targetChannelId ?? null},
            ${report.targetMessageId ?? null}, ${report.description},
            ${input.correlationId ?? null}
          )
          RETURNING id, case_id, reporter_id, category, target_user_id,
                    target_channel_id, target_message_id, description, created_at
        `;

        const raw = reports[0];
        if (!raw) throw new Error('INSERT into reports returned no row');
        reportRow = {
          id: raw.id,
          caseId: raw.case_id,
          reporterId: raw.reporter_id,
          category: raw.category,
          targetUserId: raw.target_user_id,
          targetChannelId: raw.target_channel_id,
          targetMessageId: raw.target_message_id,
          description: raw.description,
          createdAt: raw.created_at,
        };
      }

      return { case: mapCase(caseRow), report: reportRow };
    };

    try {
      return tx ? await run(tx) : await this.db.transaction(run);
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async findByNumber(
    guildId: GuildId,
    caseNumber: number,
  ): Promise<CaseRow | null> {
    const sql = this.conn();
    try {
      const rows = await sql<RawCaseRow[]>`
        SELECT ${sql.unsafe(CASE_COLUMNS)}
        FROM ${sql(this.schema)}.moderation_cases
        WHERE guild_id = ${guildId} AND case_number = ${caseNumber}
      `;
      const row = rows[0];
      return row ? mapCase(row) : null;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async list(
    guildId: GuildId,
    filter?: CaseListFilter,
  ): Promise<readonly CaseRow[]> {
    const sql = this.conn();
    const limit = Math.min(Math.max(filter?.limit ?? 20, 1), 100);
    try {
      const rows = await sql<RawCaseRow[]>`
        SELECT ${sql.unsafe(CASE_COLUMNS)}
        FROM ${sql(this.schema)}.moderation_cases
        WHERE guild_id = ${guildId}
          ${filter?.status ? sql`AND status = ${filter.status}` : sql``}
          ${filter?.assignedTo ? sql`AND assigned_to = ${filter.assignedTo}` : sql``}
          ${filter?.subjectId ? sql`AND subject_id = ${filter.subjectId}` : sql``}
        ORDER BY
          -- Open work first, oldest at the top; everything settled after it.
          CASE status
            WHEN 'ESCALATED' THEN 0
            WHEN 'OPEN' THEN 1
            WHEN 'IN_REVIEW' THEN 2
            WHEN 'RESOLVED' THEN 3
            ELSE 4
          END,
          opened_at ASC
        LIMIT ${limit}
      `;
      return rows.map(mapCase);
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async listEvents(caseId: string, limit = 50): Promise<readonly CaseEventRow[]> {
    const sql = this.conn();
    try {
      const rows = await sql<
        {
          id: string;
          case_id: string;
          event_type: CaseEventType;
          from_status: CaseStatus | null;
          to_status: CaseStatus | null;
          actor_id: UserId | null;
          body: string | null;
          created_at: Date;
        }[]
      >`
        SELECT id, case_id, event_type, from_status, to_status, actor_id, body, created_at
        FROM ${sql(this.schema)}.case_events
        WHERE case_id = ${caseId}
        ORDER BY created_at ASC, id ASC
        LIMIT ${Math.min(Math.max(limit, 1), 200)}
      `;
      return rows.map((row) => ({
        id: row.id,
        caseId: row.case_id,
        eventType: row.event_type,
        fromStatus: row.from_status,
        toStatus: row.to_status,
        actorId: row.actor_id,
        body: row.body,
        createdAt: row.created_at,
      }));
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async findReport(caseId: string): Promise<ReportRow | null> {
    const sql = this.conn();
    try {
      const rows = await sql<
        {
          id: string;
          case_id: string;
          reporter_id: UserId;
          category: ReportCategory;
          target_user_id: UserId | null;
          target_channel_id: ChannelId | null;
          target_message_id: MessageId | null;
          description: string;
          created_at: Date;
        }[]
      >`
        SELECT id, case_id, reporter_id, category, target_user_id,
               target_channel_id, target_message_id, description, created_at
        FROM ${sql(this.schema)}.reports
        WHERE case_id = ${caseId}
      `;
      const row = rows[0];
      if (!row) return null;
      return {
        id: row.id,
        caseId: row.case_id,
        reporterId: row.reporter_id,
        category: row.category,
        targetUserId: row.target_user_id,
        targetChannelId: row.target_channel_id,
        targetMessageId: row.target_message_id,
        description: row.description,
        createdAt: row.created_at,
      };
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async transitionStatus(
    input: TransitionCaseInput,
    tx?: TransactionSql,
  ): Promise<CaseTransitionOutcome> {
    if (requiresResolution(input.to) && !input.resolution) {
      throw bloomError('INVALID_INPUT', {
        userMessage: 'Resolving a case needs a short note on what was decided.',
        operatorHint:
          'moderation_cases has a CHECK constraint requiring a resolution for RESOLVED. ' +
          'Pass `resolution` on the transition.',
        details: { to: input.to },
      });
    }

    const run = async (conn: TransactionSql): Promise<CaseTransitionOutcome> => {
      const current = await conn<{ id: string; status: CaseStatus }[]>`
        SELECT id, status
        FROM ${conn(this.schema)}.moderation_cases
        WHERE guild_id = ${input.guildId} AND case_number = ${input.caseNumber}
        FOR UPDATE
      `;

      const row = current[0];
      if (!row) return { kind: 'not_found' };

      if (row.status === input.to) {
        return { kind: 'already_in_state', status: row.status };
      }

      // CLOSED has no outgoing edges. Reported distinctly from a plain illegal
      // transition so the message can say "this case is closed" rather than
      // listing legal targets that do not exist.
      if (CASE_TRANSITIONS[row.status].length === 0) {
        return { kind: 'terminal', status: row.status };
      }

      if (!canTransitionCase(row.status, input.to)) {
        return { kind: 'conflict', actual: row.status, expected: input.to };
      }

      await conn`
        UPDATE ${conn(this.schema)}.moderation_cases
        SET status = ${input.to},
            resolution = ${input.resolution ?? conn`resolution`},
            resolved_at = ${
              input.to === 'RESOLVED' ? conn`COALESCE(resolved_at, now())` : conn`resolved_at`
            },
            closed_at = ${
              input.to === 'CLOSED' ? conn`COALESCE(closed_at, now())` : conn`closed_at`
            }
        WHERE id = ${row.id} AND status = ${row.status}
      `;

      await conn`
        INSERT INTO ${conn(this.schema)}.case_events
          (case_id, event_type, from_status, to_status, actor_id, body, correlation_id)
        VALUES (${row.id}, 'status_changed', ${row.status}, ${input.to},
                ${input.actorId}, ${input.note ?? input.resolution ?? null},
                ${input.correlationId ?? null})
      `;

      return { kind: 'applied', from: row.status, to: input.to };
    };

    try {
      return tx ? await run(tx) : await this.db.transaction(run);
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async assign(
    input: {
      readonly guildId: GuildId;
      readonly caseNumber: number;
      readonly assignee: UserId | null;
      readonly actorId: UserId;
      readonly correlationId?: CorrelationId | null;
    },
    tx?: TransactionSql,
  ): Promise<CaseRow | null> {
    const run = async (conn: TransactionSql): Promise<CaseRow | null> => {
      const rows = await conn<RawCaseRow[]>`
        UPDATE ${conn(this.schema)}.moderation_cases
        SET assigned_to = ${input.assignee}
        WHERE guild_id = ${input.guildId} AND case_number = ${input.caseNumber}
        RETURNING ${conn.unsafe(CASE_COLUMNS)}
      `;

      const row = rows[0];
      if (!row) return null;

      await conn`
        INSERT INTO ${conn(this.schema)}.case_events
          (case_id, event_type, actor_id, body, correlation_id)
        VALUES (
          ${row.id},
          ${input.assignee === null ? 'unassigned' : 'assigned'},
          ${input.actorId},
          ${input.assignee},
          ${input.correlationId ?? null}
        )
      `;

      return mapCase(row);
    };

    try {
      return tx ? await run(tx) : await this.db.transaction(run);
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async appendEvent(
    input: {
      readonly caseId: string;
      readonly eventType: CaseEventType;
      readonly actorId?: UserId | null;
      readonly body?: string | null;
      readonly correlationId?: CorrelationId | null;
    },
    tx?: TransactionSql,
  ): Promise<void> {
    if (input.eventType === 'status_changed') {
      // The table's CHECK constraint would reject this anyway; failing here
      // names the actual mistake instead of surfacing a constraint violation.
      throw bloomError('INVALID_INPUT', {
        operatorHint:
          'Status changes must go through transitionStatus(), which records both statuses atomically with the update.',
      });
    }

    const sql = this.conn(tx);
    try {
      await sql`
        INSERT INTO ${sql(this.schema)}.case_events
          (case_id, event_type, actor_id, body, correlation_id)
        VALUES (${input.caseId}, ${input.eventType}, ${input.actorId ?? null},
                ${input.body ?? null}, ${input.correlationId ?? null})
      `;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async countByStatus(
    guildId: GuildId,
  ): Promise<Readonly<Record<CaseStatus, number>>> {
    const sql = this.conn();
    try {
      const rows = await sql<{ status: CaseStatus; count: number }[]>`
        SELECT status, count(*)::int AS count
        FROM ${sql(this.schema)}.moderation_cases
        WHERE guild_id = ${guildId}
        GROUP BY status
      `;

      // Zeroes included: a dashboard that omits "ESCALATED: 0" reads as a
      // missing metric rather than good news.
      const counts: Record<CaseStatus, number> = {
        OPEN: 0,
        IN_REVIEW: 0,
        ESCALATED: 0,
        RESOLVED: 0,
        CLOSED: 0,
      };
      for (const row of rows) counts[row.status] = row.count;
      return counts;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }
}
