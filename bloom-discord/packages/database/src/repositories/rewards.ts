import {
  bloomError,
  type CorrelationId,
  type GuildId,
  type PointKind,
  type UserId,
} from '@bloom/shared-types';
import type { LocalDate } from '@bloom/utils';
import { BaseRepository } from '../repository.js';
import {
  toDatabaseError,
  type Database,
  type Sql,
  type TransactionSql,
} from '../client.js';

export interface PointEvent {
  readonly id: string;
  readonly guildId: GuildId;
  readonly userId: UserId;
  readonly kind: PointKind;
  readonly points: number;
  readonly reason: string | null;
  readonly awardedBy: UserId | null;
  readonly createdAt: Date;
}

export interface AwardInput {
  readonly guildId: GuildId;
  readonly userId: UserId;
  readonly kind: PointKind;
  /** Signed. Negative is a correction; zero is rejected by the schema. */
  readonly points: number;
  readonly reason?: string | null;
  /** Required for `manual_award` and `adjustment`, forbidden otherwise. */
  readonly awardedBy?: UserId | null;
  /**
   * The duplicate guard. Two calls with the same key in the same guild produce
   * one row — build it from the thing that can be replayed (an interaction id,
   * a member and a date), never from a timestamp.
   */
  readonly idempotencyKey: string;
  readonly correlationId?: CorrelationId | null;
}

export type AwardOutcome =
  /** A new ledger row. `balance` is the total after it. */
  | { readonly kind: 'recorded'; readonly event: PointEvent; readonly balance: number }
  /** This key was already used. Nothing was written; the original is returned. */
  | { readonly kind: 'duplicate'; readonly event: PointEvent; readonly balance: number }
  /** A negative entry that would take the balance below zero. Nothing written. */
  | { readonly kind: 'insufficient'; readonly balance: number };

export interface CheckInInput {
  readonly guildId: GuildId;
  readonly userId: UserId;
  /** The calendar date in the community's timezone, resolved by the caller. */
  readonly localDate: LocalDate;
  /** Omitted or zero records the check-in without any award. */
  readonly points?: number;
  readonly correlationId?: CorrelationId | null;
}

export type CheckInOutcome =
  | {
      readonly kind: 'recorded';
      readonly localDate: LocalDate;
      /** Absent when rewards are switched off — a real state, not an error. */
      readonly event: PointEvent | null;
      readonly balance: number;
    }
  | { readonly kind: 'already_today'; readonly localDate: LocalDate };

/**
 * Everything the award definitions need, in one round trip.
 *
 * Computed rather than stored. Every number here is derived from the ledger and
 * the check-in table on read, so a milestone can never be granted on a count
 * that nothing can reproduce — which is the difference between a milestone and
 * a fake stat.
 */
export interface ParticipationSummary {
  readonly checkIns: number;
  readonly wins: number;
  /** Distinct calendar months containing at least one check-in. */
  readonly months: number;
  /** Days with both a check-in and a shared win. */
  readonly daysWithBoth: number;
  /** The longest gap, in days, between two consecutive check-ins. */
  readonly longestGapDays: number;
}

export interface LeaderboardEntry {
  readonly userId: UserId;
  readonly points: number;
  readonly events: number;
}

export interface RewardsRepository {
  /**
   * Append one ledger entry.
   *
   * The only write path for points in the platform. Everything that can change
   * a balance passes through here, which is what makes "no XP farming" a thing
   * that can be checked rather than asserted.
   */
  award(input: AwardInput, tx?: TransactionSql): Promise<AwardOutcome>;

  /** SUM over the ledger. There is no stored total to disagree with it. */
  balance(guildId: GuildId, userId: UserId): Promise<number>;

  /** Record a check-in and its award atomically. */
  recordCheckIn(input: CheckInInput): Promise<CheckInOutcome>;

  /** A member's check-in dates, most recent first, for deriving a streak. */
  checkInDates(
    guildId: GuildId,
    userId: UserId,
    since: LocalDate,
  ): Promise<readonly LocalDate[]>;

  /** How many events of one kind since an instant. Used for the daily cap. */
  countKindSince(
    guildId: GuildId,
    userId: UserId,
    kind: PointKind,
    since: Date,
  ): Promise<number>;

  /** Top members by points earned since `since` (or all time when omitted). */
  leaderboard(
    guildId: GuildId,
    options?: { readonly since?: Date; readonly limit?: number },
  ): Promise<readonly LeaderboardEntry[]>;

  /**
   * The counts the award definitions evaluate against.
   *
   * Takes the community timezone because a win's day has to be the same kind of
   * day as a check-in's: `point_events` stores an instant, `check_ins` stores a
   * calendar date, and comparing them without converting would put an evening
   * win on the following day for half the world.
   */
  participation(
    guildId: GuildId,
    userId: UserId,
    timeZone: string,
  ): Promise<ParticipationSummary>;

  /** A member's most recent ledger entries, newest first. */
  recentEvents(
    guildId: GuildId,
    userId: UserId,
    limit?: number,
  ): Promise<readonly PointEvent[]>;
}

interface PointEventRow {
  readonly id: string;
  readonly guild_id: string;
  readonly user_id: string;
  readonly kind: PointKind;
  readonly points: number;
  readonly reason: string | null;
  readonly awarded_by: string | null;
  readonly created_at: Date;
}

function toEvent(row: PointEventRow): PointEvent {
  return {
    id: row.id,
    guildId: row.guild_id as GuildId,
    userId: row.user_id as UserId,
    kind: row.kind,
    points: row.points,
    reason: row.reason,
    awardedBy: row.awarded_by as UserId | null,
    createdAt: row.created_at,
  };
}

const MAX_LEADERBOARD = 25;

/**
 * The Bloom Rewards ledger, in the database.
 *
 * Three properties it guarantees, each one a thing the brief rules out:
 *
 *   1. **No inflation by replay.** The unique index on
 *      `(guild_id, idempotency_key)` means a retried interaction cannot pay
 *      twice. The second caller is told the work is already done and given the
 *      original row, rather than receiving an error it would have to interpret.
 *   2. **No drift.** There is no balance column. `balance()` sums the ledger,
 *      so the number a member is shown is the number the rows add up to, by
 *      construction rather than by reconciliation.
 *   3. **No negative balances.** A correction that would overdraw is refused.
 */
export class PostgresRewardsRepository
  extends BaseRepository
  implements RewardsRepository
{
  public constructor(database: Database) {
    super(database);
  }

  public async award(input: AwardInput, tx?: TransactionSql): Promise<AwardOutcome> {
    const run = async (conn: TransactionSql): Promise<AwardOutcome> => {
      /*
       * Serialise concurrent writes for this member, but only when the entry is
       * negative.
       *
       * A balance is a SUM, so there is no row to lock and no constraint that
       * can express "this must not go below zero". Two simultaneous -50
       * adjustments against a balance of 60 would both read 60, both pass the
       * check and both commit. A transaction-scoped advisory lock keyed on the
       * member makes them take turns.
       *
       * Positive awards skip the lock deliberately. They are the hot path, they
       * cannot overdraw, and the idempotency index already handles the only
       * duplicate that matters.
       */
      if (input.points < 0) {
        await conn`
          SELECT pg_advisory_xact_lock(
            hashtextextended(${`${input.guildId}:${input.userId}`}, 0)
          )
        `;

        const current = await this.sumFor(conn, input.guildId, input.userId);
        if (current + input.points < 0) {
          return { kind: 'insufficient', balance: current };
        }
      }

      const inserted = await conn<PointEventRow[]>`
        INSERT INTO ${conn(this.schema)}.point_events
          (guild_id, user_id, kind, points, reason, awarded_by,
           idempotency_key, correlation_id)
        VALUES (
          ${input.guildId}, ${input.userId}, ${input.kind}, ${input.points},
          ${input.reason ?? null}, ${input.awardedBy ?? null},
          ${input.idempotencyKey}, ${input.correlationId ?? null}
        )
        ON CONFLICT (guild_id, idempotency_key) DO NOTHING
        RETURNING id, guild_id, user_id, kind, points, reason, awarded_by, created_at
      `;

      const row = inserted[0];
      if (row) {
        const balance = await this.sumFor(conn, input.guildId, input.userId);
        return { kind: 'recorded', event: toEvent(row), balance };
      }

      /*
       * The insert hit the idempotency index. Return the original event rather
       * than a bare "duplicate": the caller usually wants to tell the member
       * what already happened, and a second query is cheaper than a second
       * award.
       */
      const existing = await conn<PointEventRow[]>`
        SELECT id, guild_id, user_id, kind, points, reason, awarded_by, created_at
        FROM ${conn(this.schema)}.point_events
        WHERE guild_id = ${input.guildId}
          AND idempotency_key = ${input.idempotencyKey}
      `;

      const original = existing[0];
      if (!original) {
        // The row vanished between the conflict and this read, which the
        // append-only rule makes impossible. Say so loudly.
        throw bloomError('DATABASE_UNAVAILABLE', {
          operatorHint:
            'A point_events insert conflicted but the conflicting row could not be read. ' +
            'The ledger is append-only, so this should be unreachable — check for a ' +
            'manual DELETE or a restore in progress.',
          details: { guildId: input.guildId, key: input.idempotencyKey },
        });
      }

      const balance = await this.sumFor(conn, input.guildId, input.userId);
      return { kind: 'duplicate', event: toEvent(original), balance };
    };

    try {
      return tx ? await run(tx) : await this.db.transaction(run);
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async balance(guildId: GuildId, userId: UserId): Promise<number> {
    try {
      return await this.sumFor(this.db.sql, guildId, userId);
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async recordCheckIn(input: CheckInInput): Promise<CheckInOutcome> {
    const points = input.points ?? 0;

    try {
      return await this.db.transaction(async (conn): Promise<CheckInOutcome> => {
        /*
         * The check-in row goes in FIRST, and its primary key is the once-a-day
         * rule. Awarding first and then discovering the day was already claimed
         * would mean either paying twice or unwinding a ledger entry, and the
         * ledger does not unwind.
         */
        const claimed = await conn<{ local_date: Date }[]>`
          INSERT INTO ${conn(this.schema)}.check_ins (guild_id, user_id, local_date)
          VALUES (${input.guildId}, ${input.userId}, ${input.localDate}::date)
          ON CONFLICT (guild_id, user_id, local_date) DO NOTHING
          RETURNING local_date
        `;

        if (!claimed[0]) {
          return { kind: 'already_today', localDate: input.localDate };
        }

        if (points === 0) {
          // Rewards are switched off. The participation is still recorded; the
          // absent point_event_id is the honest representation of that.
          const balance = await this.sumFor(conn, input.guildId, input.userId);
          return {
            kind: 'recorded',
            localDate: input.localDate,
            event: null,
            balance,
          };
        }

        const outcome = await this.award(
          {
            guildId: input.guildId,
            userId: input.userId,
            kind: 'check_in',
            points,
            // The date, not the clock: the same day must produce the same key.
            idempotencyKey: `check_in:${input.guildId}:${input.userId}:${input.localDate}`,
            ...(input.correlationId ? { correlationId: input.correlationId } : {}),
          },
          conn,
        );

        if (outcome.kind === 'insufficient') {
          // Unreachable: a check-in award is positive. Guarded so a future
          // change to POINT_AWARDS cannot silently drop the ledger entry.
          throw bloomError('INVALID_INPUT', {
            operatorHint: 'A check-in award must be positive.',
            details: { points },
          });
        }

        await conn`
          UPDATE ${conn(this.schema)}.check_ins
          SET point_event_id = ${outcome.event.id}
          WHERE guild_id = ${input.guildId}
            AND user_id = ${input.userId}
            AND local_date = ${input.localDate}::date
        `;

        return {
          kind: 'recorded',
          localDate: input.localDate,
          event: outcome.event,
          balance: outcome.balance,
        };
      });
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async checkInDates(
    guildId: GuildId,
    userId: UserId,
    since: LocalDate,
  ): Promise<readonly LocalDate[]> {
    try {
      const rows = await this.db.sql<{ local_date: string }[]>`
        SELECT to_char(local_date, 'YYYY-MM-DD') AS local_date
        FROM ${this.db.sql(this.schema)}.check_ins
        WHERE guild_id = ${guildId}
          AND user_id = ${userId}
          AND local_date >= ${since}::date
        ORDER BY local_date DESC
      `;
      return rows.map((row) => row.local_date as LocalDate);
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async countKindSince(
    guildId: GuildId,
    userId: UserId,
    kind: PointKind,
    since: Date,
  ): Promise<number> {
    try {
      const rows = await this.db.sql<{ count: string }[]>`
        SELECT count(*)::text AS count
        FROM ${this.db.sql(this.schema)}.point_events
        WHERE guild_id = ${guildId}
          AND user_id = ${userId}
          AND kind = ${kind}
          AND created_at >= ${since}
      `;
      return Number(rows[0]?.count ?? '0');
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async leaderboard(
    guildId: GuildId,
    options: { readonly since?: Date; readonly limit?: number } = {},
  ): Promise<readonly LeaderboardEntry[]> {
    const limit = Math.min(Math.max(options.limit ?? 10, 1), MAX_LEADERBOARD);
    const since = options.since ?? null;

    try {
      const rows = await this.db.sql<
        { user_id: string; points: string; events: string }[]
      >`
        SELECT user_id,
               sum(points)::text AS points,
               count(*)::text    AS events
        FROM ${this.db.sql(this.schema)}.point_events
        WHERE guild_id = ${guildId}
          AND (${since}::timestamptz IS NULL OR created_at >= ${since})
        GROUP BY user_id
        /*
         * Members whose corrections have taken them to zero or below are not
         * "last" — they are not on a leaderboard at all. Showing a negative
         * total to the server would turn a private correction into a public
         * one.
         */
        HAVING sum(points) > 0
        ORDER BY sum(points) DESC, min(created_at) ASC
        LIMIT ${limit}
      `;

      return rows.map((row) => ({
        userId: row.user_id as UserId,
        points: Number(row.points),
        events: Number(row.events),
      }));
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async recentEvents(
    guildId: GuildId,
    userId: UserId,
    limit = 10,
  ): Promise<readonly PointEvent[]> {
    const capped = Math.min(Math.max(limit, 1), 50);
    try {
      const rows = await this.db.sql<PointEventRow[]>`
        SELECT id, guild_id, user_id, kind, points, reason, awarded_by, created_at
        FROM ${this.db.sql(this.schema)}.point_events
        WHERE guild_id = ${guildId} AND user_id = ${userId}
        ORDER BY created_at DESC, id DESC
        LIMIT ${capped}
      `;
      return rows.map(toEvent);
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async participation(
    guildId: GuildId,
    userId: UserId,
    timeZone: string,
  ): Promise<ParticipationSummary> {
    try {
      const sql = this.db.sql;
      const rows = await sql<
        {
          check_ins: string;
          wins: string;
          months: string;
          days_with_both: string;
          longest_gap_days: string;
        }[]
      >`
        WITH days AS (
          SELECT local_date
          FROM ${sql(this.schema)}.check_ins
          WHERE guild_id = ${guildId} AND user_id = ${userId}
        ),
        gaps AS (
          SELECT local_date - lag(local_date) OVER (ORDER BY local_date) AS gap
          FROM days
        ),
        win_days AS (
          SELECT DISTINCT (created_at AT TIME ZONE ${timeZone})::date AS day
          FROM ${sql(this.schema)}.point_events
          WHERE guild_id = ${guildId}
            AND user_id = ${userId}
            AND kind = 'small_win'
        )
        SELECT
          (SELECT count(*) FROM days)::text AS check_ins,
          (SELECT count(*) FROM ${sql(this.schema)}.point_events
             WHERE guild_id = ${guildId} AND user_id = ${userId}
               AND kind = 'small_win')::text AS wins,
          (SELECT count(DISTINCT to_char(local_date, 'YYYY-MM')) FROM days)::text AS months,
          (SELECT count(*) FROM days d
             JOIN win_days w ON w.day = d.local_date)::text AS days_with_both,
          (SELECT COALESCE(max(gap), 0) FROM gaps)::text AS longest_gap_days
      `;

      const row = rows[0];
      return {
        checkIns: Number(row?.check_ins ?? '0'),
        wins: Number(row?.wins ?? '0'),
        months: Number(row?.months ?? '0'),
        daysWithBoth: Number(row?.days_with_both ?? '0'),
        longestGapDays: Number(row?.longest_gap_days ?? '0'),
      };
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  private async sumFor(
    conn: Sql | TransactionSql,
    guildId: GuildId,
    userId: UserId,
  ): Promise<number> {
    const rows = await conn<{ total: string }[]>`
      SELECT COALESCE(sum(points), 0)::text AS total
      FROM ${conn(this.schema)}.point_events
      WHERE guild_id = ${guildId} AND user_id = ${userId}
    `;
    return Number(rows[0]?.total ?? '0');
  }
}
