import type { CorrelationId, GuildId, UserId } from '@bloom/shared-types';
import { BaseRepository } from '../repository.js';
import {
  toDatabaseError,
  type Database,
  type Sql,
  type TransactionSql,
} from '../client.js';

/**
 * Challenges and events, on one participation model.
 *
 * The interesting properties here are all database guarantees rather than
 * service conventions:
 *
 *   • A member joins once, completes once and is paid once, because
 *     `community_participants` is keyed `(activity_id, user_id)`.
 *   • A capacity is never exceeded, because the seat count and the insert
 *     happen under a transaction-scoped advisory lock keyed on the activity.
 *   • A completion cannot reference a payment it did not make, because a
 *     CHECK forbids `point_event_id` on a non-completed row.
 *
 * See `database/migrations/0011_community.sql` for the shape and the reasons.
 */

/** Mirrors the SQL CHECK. */
export const ACTIVITY_KINDS = ['challenge', 'event'] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

/** Mirrors the SQL CHECK. Staff moves a row off `open`; time never does. */
export const ACTIVITY_STATUSES = ['open', 'completed', 'cancelled'] as const;
export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number];

/**
 * The closed set of things a challenge can count.
 *
 * Deliberately not an expression language. Each of these maps to one query
 * over records Companion already owns, and adding a fourth means writing that
 * query — which is the point. A DSL would let staff describe targets the
 * platform cannot actually compute.
 */
export const CHALLENGE_METRICS = [
  'check_ins',
  'qualified_referrals',
  'event_participation',
] as const;
export type ChallengeMetric = (typeof CHALLENGE_METRICS)[number];

/** Mirrors the SQL CHECK. */
export const PARTICIPANT_STATES = ['joined', 'completed', 'withdrawn'] as const;
export type ParticipantState = (typeof PARTICIPANT_STATES)[number];

export interface CommunityActivity {
  readonly id: string;
  readonly guildId: GuildId;
  readonly kind: ActivityKind;
  readonly title: string;
  readonly description: string;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly status: ActivityStatus;
  readonly targetMetric: ChallengeMetric | null;
  readonly targetAmount: number | null;
  readonly capacity: number | null;
  readonly rewardPoints: number;
  readonly achievementKey: string | null;
  readonly createdBy: UserId;
  readonly createdAt: Date;
  readonly closedBy: UserId | null;
  readonly closedAt: Date | null;
  readonly correlationId: CorrelationId | null;
}

export interface CommunityParticipant {
  readonly activityId: string;
  readonly guildId: GuildId;
  readonly userId: UserId;
  readonly state: ParticipantState;
  readonly joinedAt: Date;
  readonly completedAt: Date | null;
  readonly progress: number | null;
  readonly pointEventId: string | null;
}

export interface CreateActivityInput {
  readonly guildId: GuildId;
  readonly kind: ActivityKind;
  readonly title: string;
  readonly description: string;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly targetMetric?: ChallengeMetric | null;
  readonly targetAmount?: number | null;
  readonly capacity?: number | null;
  readonly rewardPoints: number;
  readonly achievementKey?: string | null;
  readonly createdBy: UserId;
  readonly correlationId?: CorrelationId | null;
}

export interface ListActivitiesOptions {
  readonly kind: ActivityKind;
  readonly status?: ActivityStatus;
  readonly limit?: number;
}

/**
 * What a join attempt did.
 *
 * `full` and `already_joined` are outcomes, not errors: both are things a
 * member can legitimately cause by clicking twice or arriving late, and
 * neither deserves a stack trace.
 */
export type JoinOutcome =
  | { readonly kind: 'joined'; readonly participant: CommunityParticipant }
  | { readonly kind: 'already_joined'; readonly participant: CommunityParticipant }
  | { readonly kind: 'full' };

/** What a completion attempt did. `already_completed` means someone beat us. */
export type CompleteOutcome =
  | { readonly kind: 'completed'; readonly participant: CommunityParticipant }
  | { readonly kind: 'already_completed' };

export interface CompleteParticipantInput {
  readonly activityId: string;
  readonly guildId: GuildId;
  readonly userId: UserId;
  readonly progress?: number | null;
  readonly pointEventId?: string | null;
  readonly correlationId?: CorrelationId | null;
}

/** Hard ceilings. Nothing here is paginated, so nothing may be unbounded. */
const MAX_LIST_LIMIT = 25;
const DEFAULT_LIST_LIMIT = 10;
const MAX_PARTICIPANT_LIST = 100;

export interface CommunityRepository {
  create(input: CreateActivityInput): Promise<CommunityActivity>;
  byId(guildId: GuildId, activityId: string): Promise<CommunityActivity | null>;
  list(
    guildId: GuildId,
    options: ListActivitiesOptions,
  ): Promise<readonly CommunityActivity[]>;
  /** Open activities of one kind whose window contains `at`. */
  openAt(
    guildId: GuildId,
    kind: ActivityKind,
    at: Date,
  ): Promise<readonly CommunityActivity[]>;
  close(input: {
    readonly guildId: GuildId;
    readonly activityId: string;
    readonly status: Exclude<ActivityStatus, 'open'>;
    readonly closedBy: UserId;
    readonly closedAt: Date;
  }): Promise<CommunityActivity | null>;

  join(input: {
    readonly activityId: string;
    readonly guildId: GuildId;
    readonly userId: UserId;
    readonly capacity: number | null;
    readonly joinedAt: Date;
    readonly correlationId?: CorrelationId | null;
  }): Promise<JoinOutcome>;
  leave(
    activityId: string,
    guildId: GuildId,
    userId: UserId,
  ): Promise<'withdrawn' | 'not_joined'>;
  participant(activityId: string, userId: UserId): Promise<CommunityParticipant | null>;
  participants(
    activityId: string,
    limit?: number,
  ): Promise<readonly CommunityParticipant[]>;
  /** Counts by state, for the staff view and for capacity display. */
  counts(activityId: string): Promise<{ joined: number; completed: number }>;
  /** The ids a member currently holds a participation record for. */
  memberActivityIds(
    guildId: GuildId,
    userId: UserId,
    activityIds: readonly string[],
  ): Promise<ReadonlyMap<string, CommunityParticipant>>;

  /** Idempotent: records a completion only if the member has not completed. */
  complete(input: CompleteParticipantInput): Promise<CompleteOutcome>;
  /** Challenges have no join step, so completion creates the record. */
  completeDirect(input: CompleteParticipantInput): Promise<CompleteOutcome>;

  /** Completed event participations in a window — the third challenge metric. */
  countCompletedEvents(
    guildId: GuildId,
    userId: UserId,
    from: Date,
    to: Date,
  ): Promise<number>;
}

interface ActivityRow {
  readonly id: string;
  readonly guild_id: string;
  readonly kind: ActivityKind;
  readonly title: string;
  readonly description: string;
  readonly starts_at: Date;
  readonly ends_at: Date;
  readonly status: ActivityStatus;
  readonly target_metric: ChallengeMetric | null;
  readonly target_amount: number | null;
  readonly capacity: number | null;
  readonly reward_points: number;
  readonly achievement_key: string | null;
  readonly created_by: string;
  readonly created_at: Date;
  readonly closed_by: string | null;
  readonly closed_at: Date | null;
  readonly correlation_id: string | null;
}

interface ParticipantRow {
  readonly activity_id: string;
  readonly guild_id: string;
  readonly user_id: string;
  readonly state: ParticipantState;
  readonly joined_at: Date;
  readonly completed_at: Date | null;
  readonly progress: number | null;
  readonly point_event_id: string | null;
}

function toActivity(row: ActivityRow): CommunityActivity {
  return {
    id: row.id,
    guildId: row.guild_id as GuildId,
    kind: row.kind,
    title: row.title,
    description: row.description,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
    targetMetric: row.target_metric,
    targetAmount: row.target_amount,
    capacity: row.capacity,
    rewardPoints: row.reward_points,
    achievementKey: row.achievement_key,
    createdBy: row.created_by as UserId,
    createdAt: row.created_at,
    closedBy: row.closed_by as UserId | null,
    closedAt: row.closed_at,
    correlationId: row.correlation_id as CorrelationId | null,
  };
}

function toParticipant(row: ParticipantRow): CommunityParticipant {
  return {
    activityId: row.activity_id,
    guildId: row.guild_id as GuildId,
    userId: row.user_id as UserId,
    state: row.state,
    joinedAt: row.joined_at,
    completedAt: row.completed_at,
    progress: row.progress,
    pointEventId: row.point_event_id,
  };
}

function clampLimit(limit: number | undefined, max: number, fallback: number): number {
  if (limit === undefined) return fallback;
  if (!Number.isInteger(limit) || limit < 1) return fallback;
  return Math.min(limit, max);
}

export class PostgresCommunityRepository
  extends BaseRepository
  implements CommunityRepository
{
  public constructor(database: Database) {
    super(database);
  }

  public async create(input: CreateActivityInput): Promise<CommunityActivity> {
    try {
      const rows = await this.db.sql<ActivityRow[]>`
        INSERT INTO ${this.db.sql(this.schema)}.community_activities (
          guild_id, kind, title, description, starts_at, ends_at,
          target_metric, target_amount, capacity,
          reward_points, achievement_key, created_by, correlation_id
        ) VALUES (
          ${input.guildId}, ${input.kind}, ${input.title}, ${input.description},
          ${input.startsAt}, ${input.endsAt},
          ${input.targetMetric ?? null}, ${input.targetAmount ?? null},
          ${input.capacity ?? null},
          ${input.rewardPoints}, ${input.achievementKey ?? null},
          ${input.createdBy}, ${input.correlationId ?? null}
        )
        RETURNING *
      `;

      const row = rows[0];
      if (!row) throw new Error('community_activities insert returned no row');
      return toActivity(row);
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async byId(
    guildId: GuildId,
    activityId: string,
  ): Promise<CommunityActivity | null> {
    try {
      const rows = await this.db.sql<ActivityRow[]>`
        SELECT * FROM ${this.db.sql(this.schema)}.community_activities
        WHERE guild_id = ${guildId} AND id = ${activityId}
      `;
      const row = rows[0];
      return row ? toActivity(row) : null;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async list(
    guildId: GuildId,
    options: ListActivitiesOptions,
  ): Promise<readonly CommunityActivity[]> {
    const limit = clampLimit(options.limit, MAX_LIST_LIMIT, DEFAULT_LIST_LIMIT);
    try {
      /*
       * Ordered by the end of the window and then by id. The id tiebreak is
       * what makes the order total: two activities created in the same batch
       * can share an end time exactly, and without it the page a member sees
       * would depend on the plan Postgres happened to choose.
       */
      const rows = await this.db.sql<ActivityRow[]>`
        SELECT * FROM ${this.db.sql(this.schema)}.community_activities
        WHERE guild_id = ${guildId}
          AND kind = ${options.kind}
          ${options.status ? this.db.sql`AND status = ${options.status}` : this.db.sql``}
        ORDER BY ends_at DESC, id DESC
        LIMIT ${limit}
      `;
      return rows.map(toActivity);
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async openAt(
    guildId: GuildId,
    kind: ActivityKind,
    at: Date,
  ): Promise<readonly CommunityActivity[]> {
    try {
      const rows = await this.db.sql<ActivityRow[]>`
        SELECT * FROM ${this.db.sql(this.schema)}.community_activities
        WHERE guild_id = ${guildId}
          AND kind = ${kind}
          AND status = 'open'
          AND starts_at <= ${at}
          AND ends_at > ${at}
        ORDER BY ends_at ASC, id ASC
        LIMIT ${MAX_LIST_LIMIT}
      `;
      return rows.map(toActivity);
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async close(input: {
    readonly guildId: GuildId;
    readonly activityId: string;
    readonly status: Exclude<ActivityStatus, 'open'>;
    readonly closedBy: UserId;
    readonly closedAt: Date;
  }): Promise<CommunityActivity | null> {
    try {
      /*
       * `status = 'open'` in the WHERE is the lock. Two staff closing the same
       * activity at once produce one winner and one null, rather than a second
       * close overwriting the first closer's name.
       */
      const rows = await this.db.sql<ActivityRow[]>`
        UPDATE ${this.db.sql(this.schema)}.community_activities
        SET status = ${input.status},
            closed_by = ${input.closedBy},
            closed_at = ${input.closedAt}
        WHERE guild_id = ${input.guildId}
          AND id = ${input.activityId}
          AND status = 'open'
        RETURNING *
      `;
      const row = rows[0];
      return row ? toActivity(row) : null;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async join(input: {
    readonly activityId: string;
    readonly guildId: GuildId;
    readonly userId: UserId;
    readonly capacity: number | null;
    readonly joinedAt: Date;
    readonly correlationId?: CorrelationId | null;
  }): Promise<JoinOutcome> {
    const run = async (conn: Sql | TransactionSql): Promise<JoinOutcome> => {
      /*
       * Capacity is the only part of a join that is not already serialised by
       * the primary key, and it is the classic read-then-write race: two
       * members both read "9 of 10 taken" and both insert.
       *
       * A transaction-scoped advisory lock keyed on the activity makes them
       * take turns. Keyed on the activity rather than the table so two
       * different events never block each other, and taken only when a
       * capacity exists — an unlimited event has nothing to race over, and
       * the uncapped case is the common one. This mirrors how
       * `rewards.award()` locks only for negative amounts.
       */
      if (input.capacity !== null) {
        await conn`
          SELECT pg_advisory_xact_lock(
            hashtextextended(${`community:${input.activityId}`}, 0)
          )
        `;

        const taken = await conn<{ count: string }[]>`
          SELECT count(*)::text AS count
          FROM ${this.db.sql(this.schema)}.community_participants
          WHERE activity_id = ${input.activityId}
            AND state <> 'withdrawn'
        `;
        const seatsUsed = Number(taken[0]?.count ?? '0');

        /*
         * Checked before the insert, but the insert below is still an
         * ON CONFLICT: a member who already holds a seat is rejoining, not
         * taking a new one, and must not be told the event is full.
         */
        if (seatsUsed >= input.capacity) {
          const existing = await conn<ParticipantRow[]>`
            SELECT * FROM ${this.db.sql(this.schema)}.community_participants
            WHERE activity_id = ${input.activityId} AND user_id = ${input.userId}
          `;
          const row = existing[0];
          return row
            ? { kind: 'already_joined', participant: toParticipant(row) }
            : { kind: 'full' };
        }
      }

      const rows = await conn<(ParticipantRow & { inserted: boolean })[]>`
        INSERT INTO ${this.db.sql(this.schema)}.community_participants (
          activity_id, guild_id, user_id, state, joined_at, correlation_id
        ) VALUES (
          ${input.activityId}, ${input.guildId}, ${input.userId},
          'joined', ${input.joinedAt}, ${input.correlationId ?? null}
        )
        ON CONFLICT (activity_id, user_id) DO UPDATE
          SET state = CASE
                        WHEN community_participants.state = 'withdrawn'
                        THEN 'joined'
                        ELSE community_participants.state
                      END
        RETURNING *, (xmax = 0) AS inserted
      `;

      const row = rows[0];
      if (!row) throw new Error('community_participants upsert returned no row');

      /*
       * `xmax = 0` distinguishes a fresh insert from a conflict resolution,
       * which is what tells a member "you are in" versus "you were already
       * in". A rejoin after withdrawing reports as already_joined, which is
       * true and avoids a second announcement.
       */
      return row.inserted
        ? { kind: 'joined', participant: toParticipant(row) }
        : { kind: 'already_joined', participant: toParticipant(row) };
    };

    try {
      /*
       * Only a capped event needs a transaction: the lock and the seat count
       * must be in the same one as the insert, or the lock protects nothing.
       * An uncapped join is a single idempotent statement and takes the pool
       * directly.
       */
      return input.capacity === null
        ? await run(this.db.sql)
        : await this.db.transaction(run);
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async leave(
    activityId: string,
    guildId: GuildId,
    userId: UserId,
  ): Promise<'withdrawn' | 'not_joined'> {
    try {
      /*
       * `state = 'joined'` in the WHERE: a completed participation cannot be
       * withdrawn. Leaving after being paid would strand a ledger row
       * referencing a record that claims not to have happened, which the
       * payment CHECK would then refuse anyway.
       */
      const rows = await this.db.sql<{ user_id: string }[]>`
        UPDATE ${this.db.sql(this.schema)}.community_participants
        SET state = 'withdrawn'
        WHERE activity_id = ${activityId}
          AND guild_id = ${guildId}
          AND user_id = ${userId}
          AND state = 'joined'
        RETURNING user_id
      `;
      return rows.length > 0 ? 'withdrawn' : 'not_joined';
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async participant(
    activityId: string,
    userId: UserId,
  ): Promise<CommunityParticipant | null> {
    try {
      const rows = await this.db.sql<ParticipantRow[]>`
        SELECT * FROM ${this.db.sql(this.schema)}.community_participants
        WHERE activity_id = ${activityId} AND user_id = ${userId}
      `;
      const row = rows[0];
      return row ? toParticipant(row) : null;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async participants(
    activityId: string,
    limit = MAX_PARTICIPANT_LIST,
  ): Promise<readonly CommunityParticipant[]> {
    const bounded = clampLimit(limit, MAX_PARTICIPANT_LIST, MAX_PARTICIPANT_LIST);
    try {
      const rows = await this.db.sql<ParticipantRow[]>`
        SELECT * FROM ${this.db.sql(this.schema)}.community_participants
        WHERE activity_id = ${activityId}
        ORDER BY joined_at ASC, user_id ASC
        LIMIT ${bounded}
      `;
      return rows.map(toParticipant);
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async counts(
    activityId: string,
  ): Promise<{ joined: number; completed: number }> {
    try {
      const rows = await this.db.sql<{ joined: string; completed: string }[]>`
        SELECT
          count(*) FILTER (WHERE state <> 'withdrawn')::text AS joined,
          count(*) FILTER (WHERE state = 'completed')::text  AS completed
        FROM ${this.db.sql(this.schema)}.community_participants
        WHERE activity_id = ${activityId}
      `;
      const row = rows[0];
      return {
        joined: Number(row?.joined ?? '0'),
        completed: Number(row?.completed ?? '0'),
      };
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async memberActivityIds(
    guildId: GuildId,
    userId: UserId,
    activityIds: readonly string[],
  ): Promise<ReadonlyMap<string, CommunityParticipant>> {
    if (activityIds.length === 0) return new Map();
    try {
      const rows = await this.db.sql<ParticipantRow[]>`
        SELECT * FROM ${this.db.sql(this.schema)}.community_participants
        WHERE guild_id = ${guildId}
          AND user_id = ${userId}
          AND activity_id = ANY(${activityIds as string[]}::uuid[])
      `;
      return new Map(rows.map((row) => [row.activity_id, toParticipant(row)]));
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async complete(input: CompleteParticipantInput): Promise<CompleteOutcome> {
    try {
      /*
       * `state = 'joined'` is the exactly-once guard, and it is the UPDATE
       * itself rather than a preceding SELECT — the same pattern the referral
       * state machine uses. Two workers completing the same participant
       * produce one row and one null.
       */
      const rows = await this.db.sql<ParticipantRow[]>`
        UPDATE ${this.db.sql(this.schema)}.community_participants
        SET state = 'completed',
            completed_at = now(),
            progress = ${input.progress ?? null},
            point_event_id = ${input.pointEventId ?? null}
        WHERE activity_id = ${input.activityId}
          AND guild_id = ${input.guildId}
          AND user_id = ${input.userId}
          AND state = 'joined'
        RETURNING *
      `;
      const row = rows[0];
      return row
        ? { kind: 'completed', participant: toParticipant(row) }
        : { kind: 'already_completed' };
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async completeDirect(input: CompleteParticipantInput): Promise<CompleteOutcome> {
    try {
      /*
       * Challenges have no join step, so the completion is the insert. DO
       * NOTHING rather than DO UPDATE: if a row already exists the member has
       * already completed this challenge, and overwriting it would relabel an
       * existing payment.
       */
      const rows = await this.db.sql<ParticipantRow[]>`
        INSERT INTO ${this.db.sql(this.schema)}.community_participants (
          activity_id, guild_id, user_id, state, completed_at,
          progress, point_event_id, correlation_id
        ) VALUES (
          ${input.activityId}, ${input.guildId}, ${input.userId},
          'completed', now(), ${input.progress ?? null},
          ${input.pointEventId ?? null}, ${input.correlationId ?? null}
        )
        ON CONFLICT (activity_id, user_id) DO NOTHING
        RETURNING *
      `;
      const row = rows[0];
      return row
        ? { kind: 'completed', participant: toParticipant(row) }
        : { kind: 'already_completed' };
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async countCompletedEvents(
    guildId: GuildId,
    userId: UserId,
    from: Date,
    to: Date,
  ): Promise<number> {
    try {
      const rows = await this.db.sql<{ count: string }[]>`
        SELECT count(*)::text AS count
        FROM ${this.db.sql(this.schema)}.community_participants p
        JOIN ${this.db.sql(this.schema)}.community_activities a ON a.id = p.activity_id
        WHERE p.guild_id = ${guildId}
          AND p.user_id = ${userId}
          AND p.state = 'completed'
          AND a.kind = 'event'
          AND p.completed_at >= ${from}
          AND p.completed_at < ${to}
      `;
      return Number(rows[0]?.count ?? '0');
    } catch (error) {
      throw toDatabaseError(error);
    }
  }
}
