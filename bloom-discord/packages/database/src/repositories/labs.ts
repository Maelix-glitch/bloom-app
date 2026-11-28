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

// -----------------------------------------------------------------------------
// The pipeline: features, votes, cohorts, release notes (migration 0014)
// -----------------------------------------------------------------------------

export const LABS_FEATURE_STATUSES = [
  'proposed',
  'building',
  'testing',
  'shipped',
  'parked',
] as const;

export type LabsFeatureStatus = (typeof LABS_FEATURE_STATUSES)[number];

export const LABS_FEATURE_STATUS_LABELS: Record<LabsFeatureStatus, string> = {
  proposed: 'Proposed',
  building: 'Building',
  testing: 'In testing',
  shipped: 'Shipped',
  parked: 'Parked',
};

/** Statuses a member may vote on. Shipped needs no backing; parked is closed. */
export function isVoteableFeatureStatus(status: LabsFeatureStatus): boolean {
  return status === 'proposed' || status === 'building' || status === 'testing';
}

export interface LabsFeature {
  readonly id: string;
  readonly guildId: GuildId;
  readonly name: string;
  readonly status: LabsFeatureStatus;
  readonly description: string | null;
  readonly votes: number;
  readonly createdBy: UserId;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateFeatureInput {
  readonly guildId: GuildId;
  readonly name: string;
  readonly description?: string | null;
  readonly createdBy: UserId;
}

export interface VoteOutcome {
  readonly feature: LabsFeature;
  /** True when this call added the vote, false when it withdrew one. */
  readonly voted: boolean;
}

export interface LabsCohort {
  readonly id: string;
  readonly guildId: GuildId;
  readonly name: string;
  readonly description: string | null;
  readonly joinable: boolean;
  readonly members: number;
  readonly createdBy: UserId;
  readonly createdAt: Date;
}

export interface CreateCohortInput {
  readonly guildId: GuildId;
  readonly name: string;
  readonly description?: string | null;
  readonly joinable?: boolean;
  readonly createdBy: UserId;
}

export type JoinCohortOutcome =
  | { readonly kind: 'joined'; readonly cohort: LabsCohort }
  | { readonly kind: 'already_member'; readonly cohort: LabsCohort }
  | { readonly kind: 'closed'; readonly cohort: LabsCohort }
  | { readonly kind: 'not_found' };

export type LeaveCohortOutcome =
  | { readonly kind: 'left'; readonly cohort: LabsCohort }
  | { readonly kind: 'not_member'; readonly cohort: LabsCohort }
  | { readonly kind: 'not_found' };

export interface LabsReleaseNote {
  readonly id: string;
  readonly guildId: GuildId;
  readonly version: string;
  readonly title: string;
  readonly body: string;
  readonly publishedBy: UserId;
  readonly publishedAt: Date;
  readonly messageId: MessageId | null;
}

export interface PublishReleaseInput {
  readonly guildId: GuildId;
  readonly version: string;
  readonly title: string;
  readonly body: string;
  readonly publishedBy: UserId;
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
  bugHistory(bugId: string, limit?: number): Promise<readonly BugEvent[]>;
  countBugsSince(guildId: GuildId, userId: UserId, since: Date): Promise<number>;

  // The pipeline (migration 0014)

  createFeature(input: CreateFeatureInput): Promise<LabsFeature>;
  /** Case-insensitive name match — members address features by name. */
  findFeatureByName(guildId: GuildId, name: string): Promise<LabsFeature | null>;
  listFeatures(guildId: GuildId): Promise<readonly LabsFeature[]>;
  setFeatureStatus(
    featureId: string,
    status: LabsFeatureStatus,
  ): Promise<LabsFeature | null>;
  /** Whether this member currently backs this feature. */
  hasVoted(featureId: string, userId: UserId): Promise<boolean>;
  /** The toggle: vote if not voted, withdraw if voted. */
  toggleVote(featureId: string, userId: UserId): Promise<VoteOutcome | null>;

  createCohort(input: CreateCohortInput): Promise<LabsCohort>;
  findCohortByName(guildId: GuildId, name: string): Promise<LabsCohort | null>;
  listCohorts(guildId: GuildId): Promise<readonly LabsCohort[]>;
  joinCohort(guildId: GuildId, name: string, userId: UserId): Promise<JoinCohortOutcome>;
  leaveCohort(
    guildId: GuildId,
    name: string,
    userId: UserId,
  ): Promise<LeaveCohortOutcome>;
  isCohortMember(cohortId: string, userId: UserId): Promise<boolean>;

  publishRelease(input: PublishReleaseInput): Promise<LabsReleaseNote>;
  attachReleaseMessage(id: string, messageId: MessageId): Promise<void>;
  latestRelease(guildId: GuildId): Promise<LabsReleaseNote | null>;
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

/*
 * A bug's own triage history is naturally short, but "naturally short" is an
 * assumption about callers rather than a property of the query. Bounded like
 * every other read so no staff surface can issue an unbounded SELECT.
 */
const DEFAULT_HISTORY_LIMIT = 25;
const MAX_HISTORY_LIMIT = 50;

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

interface FeatureRow {
  readonly id: string;
  readonly guild_id: string;
  readonly name: string;
  readonly status: LabsFeatureStatus;
  readonly description: string | null;
  readonly votes: number;
  readonly created_by: string;
  readonly created_at: Date;
  readonly updated_at: Date;
}

interface CohortRow {
  readonly id: string;
  readonly guild_id: string;
  readonly name: string;
  readonly description: string | null;
  readonly joinable: boolean;
  readonly members: number;
  readonly created_by: string;
  readonly created_at: Date;
}

interface ReleaseRow {
  readonly id: string;
  readonly guild_id: string;
  readonly version: string;
  readonly title: string;
  readonly body: string;
  readonly published_by: string;
  readonly published_at: Date;
  readonly message_id: string | null;
}

function featureColumns(schema: string): string {
  return (
    'f.id, f.guild_id, f.name, f.status, f.description, f.created_by, f.created_at, f.updated_at, ' +
    `(SELECT count(*)::int FROM ${schema}.labs_feature_votes v WHERE v.feature_id = f.id) AS votes`
  );
}

function cohortColumns(schema: string): string {
  return (
    'c.id, c.guild_id, c.name, c.description, c.joinable, c.created_by, c.created_at, ' +
    `(SELECT count(*)::int FROM ${schema}.labs_cohort_members m WHERE m.cohort_id = c.id) AS members`
  );
}

const RELEASE_COLUMNS =
  'id, guild_id, version, title, body, published_by, published_at, message_id';

function toFeature(row: FeatureRow): LabsFeature {
  return {
    id: row.id,
    guildId: row.guild_id as GuildId,
    name: row.name,
    status: row.status,
    description: row.description,
    votes: row.votes,
    createdBy: row.created_by as UserId,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toCohort(row: CohortRow): LabsCohort {
  return {
    id: row.id,
    guildId: row.guild_id as GuildId,
    name: row.name,
    description: row.description,
    joinable: row.joinable,
    members: row.members,
    createdBy: row.created_by as UserId,
    createdAt: row.created_at,
  };
}

function toRelease(row: ReleaseRow): LabsReleaseNote {
  return {
    id: row.id,
    guildId: row.guild_id as GuildId,
    version: row.version,
    title: row.title,
    body: row.body,
    publishedBy: row.published_by as UserId,
    publishedAt: row.published_at,
    messageId: row.message_id as MessageId | null,
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
        -- id closes the ordering: created_at is the transaction timestamp, so
        -- entries written together tie and the plan would pick the rest.
        ORDER BY created_at DESC, id DESC
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
      /*
       * Oldest first for the open queue: the thing waiting longest is the
       * thing most likely to have been forgotten.
       *
       * `bug_number` closes the ordering. `created_at` defaults to now(),
       * which in Postgres is the transaction timestamp, so two bugs filed in
       * one transaction tie — and a tied ORDER BY lets the plan decide, so
       * the queue could reshuffle between refreshes with nothing having
       * changed. The number is unique per guild, so it settles every tie.
       */
      const rows = status
        ? await this.db.sql<BugRow[]>`
            SELECT ${this.db.sql.unsafe(BUG_COLUMNS)}
            FROM ${this.db.sql(this.schema)}.bug_reports
            WHERE guild_id = ${guildId} AND status = ${status}
            ORDER BY created_at ASC, bug_number ASC
            LIMIT ${limit}
          `
        : await this.db.sql<BugRow[]>`
            SELECT ${this.db.sql.unsafe(BUG_COLUMNS)}
            FROM ${this.db.sql(this.schema)}.bug_reports
            WHERE guild_id = ${guildId} AND status IN ('NEW', 'TRIAGED')
            ORDER BY created_at ASC, bug_number ASC
            LIMIT ${limit}
          `;
      return rows.map(toBug);
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async bugHistory(
    bugId: string,
    limit = DEFAULT_HISTORY_LIMIT,
  ): Promise<readonly BugEvent[]> {
    try {
      const rows = await this.db.sql<BugEventRow[]>`
        SELECT id, bug_id, from_status, to_status, actor_id, note, created_at
        FROM ${this.db.sql(this.schema)}.bug_events
        WHERE bug_id = ${bugId}
        ORDER BY created_at ASC, id ASC
        LIMIT ${Math.min(Math.max(limit, 1), MAX_HISTORY_LIMIT)}
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

  // ---------------------------------------------------------------------------
  // Features and votes
  // ---------------------------------------------------------------------------

  public async createFeature(input: CreateFeatureInput): Promise<LabsFeature> {
    try {
      const rows = await this.db.sql<FeatureRow[]>`
        INSERT INTO ${this.db.sql(this.schema)}.labs_features
          (guild_id, name, description, created_by)
        VALUES (
          ${input.guildId}, ${input.name}, ${input.description ?? null},
          ${input.createdBy}
        )
        RETURNING id
      `;
      const id = rows[0]?.id;
      if (!id) throw new Error('feature insert returned no row');
      const feature = await this.findFeatureById(id);
      if (!feature) throw new Error('feature vanished after insert');
      return feature;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  private async findFeatureById(id: string): Promise<LabsFeature | null> {
    const sql = this.db.sql;
    const rows = await sql<FeatureRow[]>`
      SELECT ${sql.unsafe(featureColumns(this.schema))}
      FROM ${sql(this.schema)}.labs_features f
      WHERE f.id = ${id}
    `;
    return rows[0] ? toFeature(rows[0]) : null;
  }

  public async findFeatureByName(
    guildId: GuildId,
    name: string,
  ): Promise<LabsFeature | null> {
    try {
      const sql = this.db.sql;
      const rows = await sql<FeatureRow[]>`
        SELECT ${sql.unsafe(featureColumns(this.schema))}
        FROM ${sql(this.schema)}.labs_features f
        WHERE f.guild_id = ${guildId} AND lower(btrim(f.name)) = lower(btrim(${name}))
      `;
      return rows[0] ? toFeature(rows[0]) : null;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async listFeatures(guildId: GuildId): Promise<readonly LabsFeature[]> {
    try {
      const sql = this.db.sql;
      const rows = await sql<FeatureRow[]>`
        SELECT ${sql.unsafe(featureColumns(this.schema))}
        FROM ${sql(this.schema)}.labs_features f
        WHERE f.guild_id = ${guildId}
        ORDER BY f.created_at ASC, f.id ASC
      `;
      return rows.map(toFeature);
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async setFeatureStatus(
    featureId: string,
    status: LabsFeatureStatus,
  ): Promise<LabsFeature | null> {
    try {
      const rows = await this.db.sql<{ id: string }[]>`
        UPDATE ${this.db.sql(this.schema)}.labs_features
        SET status = ${status}, updated_at = now()
        WHERE id = ${featureId}
        RETURNING id
      `;
      if (!rows[0]) return null;
      return await this.findFeatureById(featureId);
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async hasVoted(featureId: string, userId: UserId): Promise<boolean> {
    try {
      const rows = await this.db.sql<{ present: boolean }[]>`
        SELECT EXISTS (
          SELECT 1 FROM ${this.db.sql(this.schema)}.labs_feature_votes
          WHERE feature_id = ${featureId} AND user_id = ${userId}
        ) AS present
      `;
      return rows[0]?.present ?? false;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async toggleVote(
    featureId: string,
    userId: UserId,
  ): Promise<VoteOutcome | null> {
    try {
      return await this.db.sql.begin(async (conn) => {
        const featureRows = await conn<{ id: string }[]>`
          SELECT id FROM ${conn(this.schema)}.labs_features
          WHERE id = ${featureId}
          FOR UPDATE
        `;
        if (!featureRows[0]) return null;

        const inserted = await conn<{ user_id: string }[]>`
          INSERT INTO ${conn(this.schema)}.labs_feature_votes (feature_id, user_id)
          VALUES (${featureId}, ${userId})
          ON CONFLICT (feature_id, user_id) DO NOTHING
          RETURNING user_id
        `;

        let voted: boolean;
        if (inserted[0]) {
          voted = true;
        } else {
          await conn`
            DELETE FROM ${conn(this.schema)}.labs_feature_votes
            WHERE feature_id = ${featureId} AND user_id = ${userId}
          `;
          voted = false;
        }

        const rows = await conn<FeatureRow[]>`
          SELECT ${conn.unsafe(featureColumns(this.schema))}
          FROM ${conn(this.schema)}.labs_features f
          WHERE f.id = ${featureId}
        `;
        const row = rows[0];
        if (!row) throw new Error('feature vanished during vote');
        return { feature: toFeature(row), voted } satisfies VoteOutcome;
      });
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  // ---------------------------------------------------------------------------
  // Cohorts
  // ---------------------------------------------------------------------------

  public async createCohort(input: CreateCohortInput): Promise<LabsCohort> {
    try {
      const rows = await this.db.sql<CohortRow[]>`
        INSERT INTO ${this.db.sql(this.schema)}.labs_cohorts
          (guild_id, name, description, joinable, created_by)
        VALUES (
          ${input.guildId}, ${input.name}, ${input.description ?? null},
          ${input.joinable ?? true}, ${input.createdBy}
        )
        RETURNING id, guild_id, name, description, joinable, created_by, created_at,
          0::int AS members
      `;
      const row = rows[0];
      if (!row) throw new Error('cohort insert returned no row');
      return toCohort(row);
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async findCohortByName(
    guildId: GuildId,
    name: string,
  ): Promise<LabsCohort | null> {
    try {
      const sql = this.db.sql;
      const rows = await sql<CohortRow[]>`
        SELECT ${sql.unsafe(cohortColumns(this.schema))}
        FROM ${sql(this.schema)}.labs_cohorts c
        WHERE c.guild_id = ${guildId} AND lower(btrim(c.name)) = lower(btrim(${name}))
      `;
      return rows[0] ? toCohort(rows[0]) : null;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async listCohorts(guildId: GuildId): Promise<readonly LabsCohort[]> {
    try {
      const sql = this.db.sql;
      const rows = await sql<CohortRow[]>`
        SELECT ${sql.unsafe(cohortColumns(this.schema))}
        FROM ${sql(this.schema)}.labs_cohorts c
        WHERE c.guild_id = ${guildId}
        ORDER BY c.created_at ASC, c.id ASC
      `;
      return rows.map(toCohort);
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async joinCohort(
    guildId: GuildId,
    name: string,
    userId: UserId,
  ): Promise<JoinCohortOutcome> {
    try {
      return await this.db.sql.begin(async (conn) => {
        const found = await conn<CohortRow[]>`
          SELECT ${conn.unsafe(cohortColumns(this.schema))}
          FROM ${conn(this.schema)}.labs_cohorts c
          WHERE c.guild_id = ${guildId} AND lower(btrim(c.name)) = lower(btrim(${name}))
          FOR UPDATE OF c
        `;
        const row = found[0];
        if (!row) return { kind: 'not_found' } satisfies JoinCohortOutcome;

        const existing = await conn<{ user_id: string }[]>`
          SELECT user_id FROM ${conn(this.schema)}.labs_cohort_members
          WHERE cohort_id = ${row.id} AND user_id = ${userId}
        `;
        if (existing[0]) {
          return {
            kind: 'already_member',
            cohort: toCohort(row),
          } satisfies JoinCohortOutcome;
        }
        if (!row.joinable) {
          return { kind: 'closed', cohort: toCohort(row) } satisfies JoinCohortOutcome;
        }

        await conn`
          INSERT INTO ${conn(this.schema)}.labs_cohort_members (cohort_id, user_id)
          VALUES (${row.id}, ${userId})
        `;
        return {
          kind: 'joined',
          cohort: { ...toCohort(row), members: row.members + 1 },
        } satisfies JoinCohortOutcome;
      });
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async leaveCohort(
    guildId: GuildId,
    name: string,
    userId: UserId,
  ): Promise<LeaveCohortOutcome> {
    try {
      return await this.db.sql.begin(async (conn) => {
        const found = await conn<CohortRow[]>`
          SELECT ${conn.unsafe(cohortColumns(this.schema))}
          FROM ${conn(this.schema)}.labs_cohorts c
          WHERE c.guild_id = ${guildId} AND lower(btrim(c.name)) = lower(btrim(${name}))
          FOR UPDATE OF c
        `;
        const row = found[0];
        if (!row) return { kind: 'not_found' } satisfies LeaveCohortOutcome;

        const deleted = await conn<{ user_id: string }[]>`
          DELETE FROM ${conn(this.schema)}.labs_cohort_members
          WHERE cohort_id = ${row.id} AND user_id = ${userId}
          RETURNING user_id
        `;
        if (!deleted[0]) {
          return {
            kind: 'not_member',
            cohort: toCohort(row),
          } satisfies LeaveCohortOutcome;
        }
        return {
          kind: 'left',
          cohort: { ...toCohort(row), members: Math.max(0, row.members - 1) },
        } satisfies LeaveCohortOutcome;
      });
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async isCohortMember(cohortId: string, userId: UserId): Promise<boolean> {
    try {
      const rows = await this.db.sql<{ present: boolean }[]>`
        SELECT EXISTS (
          SELECT 1 FROM ${this.db.sql(this.schema)}.labs_cohort_members
          WHERE cohort_id = ${cohortId} AND user_id = ${userId}
        ) AS present
      `;
      return rows[0]?.present ?? false;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  // ---------------------------------------------------------------------------
  // Release notes
  // ---------------------------------------------------------------------------

  public async publishRelease(input: PublishReleaseInput): Promise<LabsReleaseNote> {
    try {
      const rows = await this.db.sql<ReleaseRow[]>`
        INSERT INTO ${this.db.sql(this.schema)}.labs_release_notes
          (guild_id, version, title, body, published_by)
        VALUES (
          ${input.guildId}, ${input.version}, ${input.title}, ${input.body},
          ${input.publishedBy}
        )
        RETURNING ${this.db.sql.unsafe(RELEASE_COLUMNS)}
      `;
      const row = rows[0];
      if (!row) throw new Error('release insert returned no row');
      return toRelease(row);
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async attachReleaseMessage(id: string, messageId: MessageId): Promise<void> {
    try {
      await this.db.sql`
        UPDATE ${this.db.sql(this.schema)}.labs_release_notes
        SET message_id = ${messageId}
        WHERE id = ${id}
      `;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async latestRelease(guildId: GuildId): Promise<LabsReleaseNote | null> {
    try {
      const rows = await this.db.sql<ReleaseRow[]>`
        SELECT ${this.db.sql.unsafe(RELEASE_COLUMNS)}
        FROM ${this.db.sql(this.schema)}.labs_release_notes
        WHERE guild_id = ${guildId}
        ORDER BY published_at DESC, id DESC
        LIMIT 1
      `;
      return rows[0] ? toRelease(rows[0]) : null;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }
}
