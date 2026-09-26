import type { CorrelationId, GuildId, MessageId, UserId } from '@bloom/shared-types';
import { BaseRepository } from '../repository.js';
import { toDatabaseError, type Database } from '../client.js';

/**
 * Bloom Labs: feedback and bug intake.
 *
 * The only repository in the platform that stores substantial member-authored
 * text, which is not an accident of design but the point of the feature — a bug
 * report without the description is not a bug report. Everything else Labs
 * would like to know about a defect (who, when, where in the product) is
 * structured, so the free text stays as small as the job allows.
 */

export type FeedbackCategory = 'feature' | 'improvement' | 'content' | 'other';
export type BugArea = 'app' | 'discord' | 'account' | 'other';
export type BugStatus = 'NEW' | 'TRIAGED' | 'FIXED' | 'WONT_FIX' | 'DUPLICATE';

/** The states a bug can be moved *to* by a triager. Filing produces `NEW`. */
export const TRIAGE_TARGETS = [
  'TRIAGED',
  'FIXED',
  'WONT_FIX',
  'DUPLICATE',
] as const satisfies readonly BugStatus[];

export type TriageTarget = (typeof TRIAGE_TARGETS)[number];

/** Terminal states. Reaching one requires a resolution; the schema agrees. */
export const TERMINAL_BUG_STATUSES = [
  'FIXED',
  'WONT_FIX',
  'DUPLICATE',
] as const satisfies readonly BugStatus[];

export function isTerminalBugStatus(status: BugStatus): boolean {
  return (TERMINAL_BUG_STATUSES as readonly BugStatus[]).includes(status);
}

export interface FeedbackEntry {
  readonly id: string;
  readonly guildId: GuildId;
  readonly userId: UserId;
  readonly category: FeedbackCategory;
  readonly summary: string;
  readonly detail: string | null;
  readonly messageId: MessageId | null;
  readonly createdAt: Date;
}

export interface SubmitFeedbackInput {
  readonly guildId: GuildId;
  readonly userId: UserId;
  readonly category: FeedbackCategory;
  readonly summary: string;
  readonly detail?: string | null;
  readonly correlationId?: CorrelationId | null;
}

export interface BugReport {
  readonly id: string;
  readonly guildId: GuildId;
  readonly bugNumber: number;
  readonly reporterId: UserId;
  readonly status: BugStatus;
  readonly area: BugArea;
  readonly summary: string;
  readonly steps: string;
  readonly expected: string | null;
  readonly triagedBy: UserId | null;
  readonly triagedAt: Date | null;
  readonly resolution: string | null;
  readonly duplicateOf: number | null;
  readonly messageId: MessageId | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface FileBugInput {
  readonly guildId: GuildId;
  readonly reporterId: UserId;
  readonly area: BugArea;
  readonly summary: string;
  readonly steps: string;
  readonly expected?: string | null;
  readonly correlationId?: CorrelationId | null;
}

export interface TriageInput {
  readonly guildId: GuildId;
  readonly bugNumber: number;
  readonly status: TriageTarget;
  readonly actorId: UserId;
  readonly resolution?: string | null;
  readonly duplicateOf?: number | null;
}

export type TriageOutcome =
  | { readonly kind: 'moved'; readonly bug: BugReport; readonly from: BugStatus }
  /** Already in that state. Nothing was written and nobody needs telling twice. */
  | { readonly kind: 'unchanged'; readonly bug: BugReport }
  | { readonly kind: 'not_found' };

export interface BugEvent {
  readonly id: string;
  readonly bugId: string;
  readonly fromStatus: BugStatus | null;
  readonly toStatus: BugStatus;
  readonly actorId: UserId | null;
  readonly note: string | null;
  readonly createdAt: Date;
}

export interface BugQueueOptions {
  /** Restrict to one status. Omitted means the open set: NEW and TRIAGED. */
  readonly status?: BugStatus;
  readonly limit?: number;
}

export interface LabsRepository {
  submitFeedback(input: SubmitFeedbackInput): Promise<FeedbackEntry>;
  attachFeedbackMessage(id: string, messageId: MessageId): Promise<void>;
  recentFeedback(guildId: GuildId, limit?: number): Promise<readonly FeedbackEntry[]>;
  /** How many times this member submitted since an instant. Drives the cooldown. */
  countFeedbackSince(guildId: GuildId, userId: UserId, since: Date): Promise<number>;

  /** Allocates the bug number and records the filing event, in one transaction. */
  fileBug(input: FileBugInput): Promise<BugReport>;
  attachBugMessage(id: string, messageId: MessageId): Promise<void>;
  findBug(guildId: GuildId, bugNumber: number): Promise<BugReport | null>;
  /** Moves a bug and appends the event. Refuses to invent a missing bug. */
  triage(input: TriageInput): Promise<TriageOutcome>;
  bugQueue(guildId: GuildId, options?: BugQueueOptions): Promise<readonly BugReport[]>;
  bugHistory(bugId: string): Promise<readonly BugEvent[]>;
  countBugsSince(guildId: GuildId, userId: UserId, since: Date): Promise<number>;
}

interface FeedbackRow {
  readonly id: string;
  readonly guild_id: string;
  readonly user_id: string;
  readonly category: FeedbackCategory;
  readonly summary: string;
  readonly detail: string | null;
  readonly message_id: string | null;
  readonly created_at: Date;
}

interface BugRow {
  readonly id: string;
  readonly guild_id: string;
  readonly bug_number: number;
  readonly reporter_id: string;
  readonly status: BugStatus;
  readonly area: BugArea;
  readonly summary: string;
  readonly steps: string;
  readonly expected: string | null;
  readonly triaged_by: string | null;
  readonly triaged_at: Date | null;
  readonly resolution: string | null;
  readonly duplicate_of: number | null;
  readonly message_id: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
}

interface BugEventRow {
  readonly id: string;
  readonly bug_id: string;
  readonly from_status: BugStatus | null;
  readonly to_status: BugStatus;
  readonly actor_id: string | null;
  readonly note: string | null;
  readonly created_at: Date;
}

const FEEDBACK_COLUMNS =
  'id, guild_id, user_id, category, summary, detail, message_id, created_at';

const BUG_COLUMNS =
  'id, guild_id, bug_number, reporter_id, status, area, summary, steps, expected, ' +
  'triaged_by, triaged_at, resolution, duplicate_of, message_id, created_at, updated_at';

const DEFAULT_QUEUE_LIMIT = 10;
const MAX_QUEUE_LIMIT = 25;

function toFeedback(row: FeedbackRow): FeedbackEntry {
  return {
    id: row.id,
    guildId: row.guild_id as GuildId,
    userId: row.user_id as UserId,
    category: row.category,
    summary: row.summary,
    detail: row.detail,
    messageId: row.message_id as MessageId | null,
    createdAt: row.created_at,
  };
}

function toBug(row: BugRow): BugReport {
  return {
    id: row.id,
    guildId: row.guild_id as GuildId,
    bugNumber: row.bug_number,
    reporterId: row.reporter_id as UserId,
    status: row.status,
    area: row.area,
    summary: row.summary,
    steps: row.steps,
    expected: row.expected,
    triagedBy: row.triaged_by as UserId | null,
    triagedAt: row.triaged_at,
    resolution: row.resolution,
    duplicateOf: row.duplicate_of,
    messageId: row.message_id as MessageId | null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toBugEvent(row: BugEventRow): BugEvent {
  return {
    id: row.id,
    bugId: row.bug_id,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    actorId: row.actor_id as UserId | null,
    note: row.note,
    createdAt: row.created_at,
  };
}

export class PostgresLabsRepository extends BaseRepository implements LabsRepository {
  public constructor(database: Database) {
    super(database);
  }

  // ---------------------------------------------------------------------------
  // Feedback
  // ---------------------------------------------------------------------------

  public async submitFeedback(input: SubmitFeedbackInput): Promise<FeedbackEntry> {
    try {
      const rows = await this.db.sql<FeedbackRow[]>`
        INSERT INTO ${this.db.sql(this.schema)}.feedback
          (guild_id, user_id, category, summary, detail, correlation_id)
        VALUES (
          ${input.guildId}, ${input.userId}, ${input.category},
          ${input.summary}, ${input.detail ?? null}, ${input.correlationId ?? null}
        )
        RETURNING ${this.db.sql.unsafe(FEEDBACK_COLUMNS)}
      `;

      const row = rows[0];
      if (!row) throw new Error('feedback insert returned no row');
      return toFeedback(row);
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  /**
   * Record where the submission was announced.
   *
   * Separate from the insert because the message does not exist yet when the
   * row is written, and writing the row first is the right order: a database
   * failure must not leave a post in the channel with nothing behind it.
   */
  public async attachFeedbackMessage(id: string, messageId: MessageId): Promise<void> {
    try {
      await this.db.sql`
        UPDATE ${this.db.sql(this.schema)}.feedback
        SET message_id = ${messageId}
        WHERE id = ${id}
      `;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async recentFeedback(
    guildId: GuildId,
    limit = DEFAULT_QUEUE_LIMIT,
  ): Promise<readonly FeedbackEntry[]> {
    try {
      const rows = await this.db.sql<FeedbackRow[]>`
        SELECT ${this.db.sql.unsafe(FEEDBACK_COLUMNS)}
        FROM ${this.db.sql(this.schema)}.feedback
        WHERE guild_id = ${guildId}
        ORDER BY created_at DESC
        LIMIT ${Math.min(Math.max(limit, 1), MAX_QUEUE_LIMIT)}
      `;
      return rows.map(toFeedback);
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async countFeedbackSince(
    guildId: GuildId,
    userId: UserId,
    since: Date,
  ): Promise<number> {
    try {
      const rows = await this.db.sql<{ total: string }[]>`
        SELECT count(*)::text AS total
        FROM ${this.db.sql(this.schema)}.feedback
        WHERE guild_id = ${guildId} AND user_id = ${userId} AND created_at >= ${since}
      `;
      return Number(rows[0]?.total ?? '0');
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  // ---------------------------------------------------------------------------
  // Bugs
  // ---------------------------------------------------------------------------

  /**
   * File a bug.
   *
   * One transaction covering three writes: allocate the number, insert the
   * report, append the filing event. Splitting them would allow a bug that
   * exists with no history, or — worse — a consumed number attached to nothing,
   * which shows up as a permanent gap in a sequence people read as a list.
   */
  public async fileBug(input: FileBugInput): Promise<BugReport> {
    try {
      return await this.db.sql.begin(async (conn) => {
        const counter = await conn<{ next_number: number }[]>`
          INSERT INTO ${conn(this.schema)}.bug_counters (guild_id, next_number)
          VALUES (${input.guildId}, 2)
          ON CONFLICT (guild_id) DO UPDATE
            SET next_number = ${conn(this.schema)}.bug_counters.next_number + 1,
                updated_at = now()
          RETURNING ${conn(this.schema)}.bug_counters.next_number - 1 AS next_number
        `;

        const bugNumber = counter[0]?.next_number;
        if (bugNumber === undefined) {
          throw new Error('bug number allocation returned no row');
        }

        const inserted = await conn<BugRow[]>`
          INSERT INTO ${conn(this.schema)}.bug_reports
            (guild_id, bug_number, reporter_id, area, summary, steps, expected,
             correlation_id)
          VALUES (
            ${input.guildId}, ${bugNumber}, ${input.reporterId}, ${input.area},
            ${input.summary}, ${input.steps}, ${input.expected ?? null},
            ${input.correlationId ?? null}
          )
          RETURNING ${conn.unsafe(BUG_COLUMNS)}
        `;

        const row = inserted[0];
        if (!row) throw new Error('bug insert returned no row');

        await conn`
          INSERT INTO ${conn(this.schema)}.bug_events
            (bug_id, from_status, to_status, actor_id)
          VALUES (${row.id}, NULL, 'NEW', ${input.reporterId})
        `;

        return toBug(row);
      });
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async attachBugMessage(id: string, messageId: MessageId): Promise<void> {
    try {
      await this.db.sql`
        UPDATE ${this.db.sql(this.schema)}.bug_reports
        SET message_id = ${messageId}
        WHERE id = ${id}
      `;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async findBug(guildId: GuildId, bugNumber: number): Promise<BugReport | null> {
    try {
      const rows = await this.db.sql<BugRow[]>`
        SELECT ${this.db.sql.unsafe(BUG_COLUMNS)}
        FROM ${this.db.sql(this.schema)}.bug_reports
        WHERE guild_id = ${guildId} AND bug_number = ${bugNumber}
      `;
      const row = rows[0];
      return row ? toBug(row) : null;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  /**
   * Move a bug through triage.
   *
   * The `WHERE status IS DISTINCT FROM` clause is what makes this idempotent:
   * two moderators closing the same bug in the same minute produce one `moved`
   * and one `unchanged`, rather than two history entries claiming the same
   * transition happened twice.
   */
  public async triage(input: TriageInput): Promise<TriageOutcome> {
    try {
      return await this.db.sql.begin(async (conn) => {
        const existing = await conn<BugRow[]>`
          SELECT ${conn.unsafe(BUG_COLUMNS)}
          FROM ${conn(this.schema)}.bug_reports
          WHERE guild_id = ${input.guildId} AND bug_number = ${input.bugNumber}
          FOR UPDATE
        `;

        const current = existing[0];
        if (!current) return { kind: 'not_found' } satisfies TriageOutcome;
        if (current.status === input.status) {
          return { kind: 'unchanged', bug: toBug(current) } satisfies TriageOutcome;
        }

        const updated = await conn<BugRow[]>`
          UPDATE ${conn(this.schema)}.bug_reports
          SET status = ${input.status},
              triaged_by = ${input.actorId},
              triaged_at = now(),
              resolution = ${input.resolution ?? null},
              duplicate_of = ${input.duplicateOf ?? null},
              updated_at = now()
          WHERE id = ${current.id}
          RETURNING ${conn.unsafe(BUG_COLUMNS)}
        `;

        const row = updated[0];
        if (!row) throw new Error('bug update returned no row');

        await conn`
          INSERT INTO ${conn(this.schema)}.bug_events
            (bug_id, from_status, to_status, actor_id, note)
          VALUES (
            ${row.id}, ${current.status}, ${input.status}, ${input.actorId},
            ${input.resolution ?? null}
          )
        `;

        return {
          kind: 'moved',
          bug: toBug(row),
          from: current.status,
        } satisfies TriageOutcome;
      });
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async bugQueue(
    guildId: GuildId,
    options: BugQueueOptions = {},
  ): Promise<readonly BugReport[]> {
    const limit = Math.min(
      Math.max(options.limit ?? DEFAULT_QUEUE_LIMIT, 1),
      MAX_QUEUE_LIMIT,
    );
    const status = options.status;

    try {
      // Oldest first for the open queue: the thing waiting longest is the thing
      // most likely to have been forgotten.
      const rows = status
        ? await this.db.sql<BugRow[]>`
            SELECT ${this.db.sql.unsafe(BUG_COLUMNS)}
            FROM ${this.db.sql(this.schema)}.bug_reports
            WHERE guild_id = ${guildId} AND status = ${status}
            ORDER BY created_at ASC
            LIMIT ${limit}
          `
        : await this.db.sql<BugRow[]>`
            SELECT ${this.db.sql.unsafe(BUG_COLUMNS)}
            FROM ${this.db.sql(this.schema)}.bug_reports
            WHERE guild_id = ${guildId} AND status IN ('NEW', 'TRIAGED')
            ORDER BY created_at ASC
            LIMIT ${limit}
          `;
      return rows.map(toBug);
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async bugHistory(bugId: string): Promise<readonly BugEvent[]> {
    try {
      const rows = await this.db.sql<BugEventRow[]>`
        SELECT id, bug_id, from_status, to_status, actor_id, note, created_at
        FROM ${this.db.sql(this.schema)}.bug_events
        WHERE bug_id = ${bugId}
        ORDER BY created_at ASC, id ASC
      `;
      return rows.map(toBugEvent);
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async countBugsSince(
    guildId: GuildId,
    userId: UserId,
    since: Date,
  ): Promise<number> {
    try {
      const rows = await this.db.sql<{ total: string }[]>`
        SELECT count(*)::text AS total
        FROM ${this.db.sql(this.schema)}.bug_reports
        WHERE guild_id = ${guildId} AND reporter_id = ${userId} AND created_at >= ${since}
      `;
      return Number(rows[0]?.total ?? '0');
    } catch (error) {
      throw toDatabaseError(error);
    }
  }
}
