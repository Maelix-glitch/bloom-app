import type { GuildId, UserId } from '@bloom/shared-types';
import { BaseRepository } from '../repository.js';
import { toDatabaseError, type Database, type TransactionSql } from '../client.js';

/**
 * Data lifecycle: pruning operational exhaust, and erasing a member on request.
 *
 * Two jobs that look similar and are not. Pruning is housekeeping on rows the
 * platform generated about itself; erasure is a member asking for what they
 * wrote to be removed. They are in one module because they are the only two
 * places in the system allowed to delete anything, and keeping that surface
 * small and visible is the point.
 */

/**
 * What may be pruned, and after how long.
 *
 * These are the numbers, in one place, so that changing a retention window is
 * a one-line review rather than an archaeology exercise across five queries.
 *
 * The windows are not arbitrary:
 *
 *   • `job_runs` — 90 days. Long enough to answer "has this job been failing
 *     since the deploy three weeks ago", short enough that a job running every
 *     five minutes does not accumulate a million rows a year.
 *   • `command_usage` — 90 days. Telemetry answers "is this command used" and
 *     "did latency regress"; neither question reaches back further, and the
 *     table grows with every interaction the platform serves.
 *   • `verification_attempts` — 180 days. Abuse patterns are seasonal — a
 *     returning raider is the case this exists for — but a failed verification
 *     from two years ago is a record about a person that answers nothing.
 *   • `audit_events` — 730 days. The longest window, deliberately. This is the
 *     record consulted when someone asks why an action was taken, and a
 *     moderation dispute can surface a year later. Two years is a retention
 *     decision rather than an accident of nobody having deleted anything.
 */
export interface RetentionPolicy {
  readonly jobRunDays: number;
  readonly commandUsageDays: number;
  readonly verificationAttemptDays: number;
  readonly auditEventDays: number;
}

export const DEFAULT_RETENTION_POLICY: RetentionPolicy = {
  jobRunDays: 90,
  commandUsageDays: 90,
  verificationAttemptDays: 180,
  auditEventDays: 730,
};

/**
 * The tables this repository is permitted to prune, as an explicit allowlist.
 *
 * An allowlist rather than a denylist, because the failure modes are not
 * symmetrical. Forgetting to add a new table here means it grows — noticeable,
 * recoverable. Forgetting to exclude one from a denylist means a scheduled job
 * quietly deletes the rewards ledger at 04:30 one morning.
 *
 * Nothing here is a member's record. `point_events` is an append-only ledger
 * whose sum is somebody's balance; `check_ins` and `member_awards` are what
 * milestones are recomputed from; `moderation_cases`, `case_events`,
 * `moderation_actions` and `reports` are the moderation record;
 * `onboarding_transitions` is the role lifecycle history; `feedback` and
 * `bug_reports` are what members told the team. Pruning any of them would make
 * the system quietly forget something a human is entitled to see, so none of
 * them appear below — and a test asserts they never do.
 */
export const PRUNABLE_TABLES = [
  'idempotency_keys',
  'message_cooldowns',
  'job_runs',
  'command_usage',
  'verification_attempts',
  'audit_events',
] as const;

export type PrunableTable = (typeof PRUNABLE_TABLES)[number];

export interface PruneResult {
  /** Rows removed, per table. Always has an entry for every prunable table. */
  readonly deleted: Readonly<Record<PrunableTable, number>>;
  readonly total: number;
  /**
   * True when at least one table hit the per-run cap, so rows remain past their
   * window. The next run continues; this exists so an operator can tell
   * "nothing to do" apart from "still catching up".
   */
  readonly more: boolean;
}

export interface PruneOptions {
  readonly policy?: RetentionPolicy;
  /** Per-table ceiling for one run. */
  readonly batchSize?: number;
}

/**
 * What an erasure removed, per table.
 *
 * Returned rather than logged so the caller can show the operator — and the
 * member — exactly what happened, instead of "done".
 */
export interface ErasureResult {
  readonly guildId: GuildId;
  readonly userId: UserId;
  readonly feedbackRedacted: number;
  readonly bugReportsRedacted: number;
  /** `point_events.reason` on the member's own check-ins and small wins. */
  readonly ledgerNotesRedacted: number;
  readonly reportsRedacted: number;
  /**
   * Audit rows naming this member as the actor. Reported, never touched —
   * see the note on `eraseMember`.
   */
  readonly auditActorRows: number;
  readonly total: number;
}

/**
 * The text left behind in place of erased content.
 *
 * A tombstone rather than an empty string, because the columns are `NOT NULL`
 * with length floors — and because a bug report whose summary is blank reads as
 * a data bug to the next person who opens it, while one that says the content
 * was erased reads as what actually happened.
 */
export const ERASURE_TOMBSTONE = '[removed at the author’s request]';

export interface RetentionRepository {
  prune(options?: PruneOptions): Promise<PruneResult>;
  /**
   * @param tx Run inside the caller's transaction instead of opening one.
   *
   * This is what makes a truthful dry run possible: the erasure CLI performs
   * the real erasure inside a transaction it then rolls back, so the number it
   * shows an operator comes from the same statements that would run for real
   * rather than from a second count query that can disagree with them.
   */
  eraseMember(
    guildId: GuildId,
    userId: UserId,
    tx?: TransactionSql,
  ): Promise<ErasureResult>;
}

export class PostgresRetentionRepository
  extends BaseRepository
  implements RetentionRepository
{
  public constructor(database: Database) {
    super(database);
  }

  /**
   * Delete expired operational rows, in bounded batches.
   *
   * Every statement is capped. An unbounded `DELETE FROM audit_events WHERE
   * created_at < …` against a table that has been accumulating for two years
   * is a single transaction holding locks for minutes, a replication lag
   * spike, and a WAL surge — during which the bots cannot write. Deleting
   * `batchSize` rows at a time and reporting `more` turns that into several
   * short transactions across several nights, which is slower and never an
   * incident.
   *
   * Each table is deleted through a `ctid IN (SELECT … LIMIT n)` subquery
   * rather than a bare `LIMIT` on the delete, which PostgreSQL does not
   * support.
   */
  public async prune(options: PruneOptions = {}): Promise<PruneResult> {
    const policy = options.policy ?? DEFAULT_RETENTION_POLICY;
    const batchSize = clampBatch(options.batchSize ?? 5_000);

    try {
      const deleted: Record<PrunableTable, number> = {
        idempotency_keys: await this.pruneIdempotencyKeys(batchSize),
        message_cooldowns: await this.pruneCooldowns(batchSize),
        job_runs: await this.pruneByAge(
          'job_runs',
          'started_at',
          policy.jobRunDays,
          batchSize,
        ),
        command_usage: await this.pruneByAge(
          'command_usage',
          'created_at',
          policy.commandUsageDays,
          batchSize,
        ),
        verification_attempts: await this.pruneByAge(
          'verification_attempts',
          'created_at',
          policy.verificationAttemptDays,
          batchSize,
        ),
        audit_events: await this.pruneByAge(
          'audit_events',
          'created_at',
          policy.auditEventDays,
          batchSize,
        ),
      };

      const counts = Object.values(deleted);
      return {
        deleted,
        total: counts.reduce((sum, count) => sum + count, 0),
        more: counts.some((count) => count >= batchSize),
      };
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  /**
   * Expired idempotency keys, by their own `expires_at`.
   *
   * The column already exists and the schema comment already promises this
   * happens. Until the retention job existed, it did not — the table grew by
   * one row per guarded operation, forever.
   */
  private async pruneIdempotencyKeys(batchSize: number): Promise<number> {
    const sql = this.conn();
    const rows = await sql<{ key: string }[]>`
      DELETE FROM ${sql(this.schema)}.idempotency_keys
      WHERE key IN (
        SELECT key FROM ${sql(this.schema)}.idempotency_keys
        WHERE expires_at < now()
        LIMIT ${batchSize}
      )
      RETURNING key
    `;
    return rows.length;
  }

  /**
   * Expired cooldowns, one day after they lapse.
   *
   * The grace day is deliberate: a cooldown row that has just expired is still
   * evidence for "why did this not fire", and deleting it the second it lapses
   * removes the only trace of a suppression an operator may be asking about.
   */
  private async pruneCooldowns(batchSize: number): Promise<number> {
    const sql = this.conn();
    const rows = await sql<{ ctid: string }[]>`
      DELETE FROM ${sql(this.schema)}.message_cooldowns
      WHERE ctid IN (
        SELECT ctid FROM ${sql(this.schema)}.message_cooldowns
        WHERE expires_at < now() - interval '1 day'
        LIMIT ${batchSize}
      )
      RETURNING ctid
    `;
    return rows.length;
  }

  /**
   * Age-based prune for a table with a timestamp column.
   *
   * `table` and `column` are never caller-supplied — they come from the
   * literal union above and from this file — so interpolating them as
   * identifiers cannot be an injection. They still go through the driver's
   * identifier escaping rather than string concatenation.
   */
  private async pruneByAge(
    table: PrunableTable,
    column: string,
    days: number,
    batchSize: number,
  ): Promise<number> {
    const sql = this.conn();
    const cutoff = new Date(Date.now() - days * 86_400_000);
    const rows = await sql<{ ctid: string }[]>`
      DELETE FROM ${sql(this.schema)}.${sql(table)}
      WHERE ctid IN (
        SELECT ctid FROM ${sql(this.schema)}.${sql(table)}
        WHERE ${sql(column)} < ${cutoff}
        LIMIT ${batchSize}
      )
      RETURNING ctid
    `;
    return rows.length;
  }

  /**
   * Erase what a member wrote, in one transaction.
   *
   * **Redaction, not deletion.** The prose is overwritten; the rows stay. That
   * is not a hedge, it is the only correct answer for each of these tables:
   *
   *   • A bug report is quoted by number in channels and referenced by other
   *     bugs as a duplicate target. Deleting row 47 turns every one of those
   *     references into a dangling number and silently changes what the team
   *     believes about its own backlog. The defect was real; the paragraph
   *     describing it was the member's, and that is what goes.
   *   • `point_events` is an append-only ledger. Deleting rows changes a
   *     balance that has already been shown to the member and to everyone who
   *     saw a leaderboard, so the reason is redacted and the amount is left
   *     alone.
   *   • Moderation records are not erasable by their subject, here or
   *     anywhere. A member who could delete the record of their own warning
   *     could erase the reason they were warned. `reports` are redacted only
   *     where the member was the *reporter*, never where they were the subject.
   *
   * Audit rows are not redacted — they are pseudonymised only in the sense that
   * they already hold nothing but ids, event names and counts. There is no
   * member prose in `audit_events` by construction, which is why it can be kept
   * for two years and why it survives an erasure.
   *
   * What this cannot do is unsay things in Discord. Messages the bots posted to
   * public channels are Discord's copy, not ours; the runbook covers deleting
   * those and is explicit that it is a separate, manual step.
   */
  public async eraseMember(
    guildId: GuildId,
    userId: UserId,
    tx?: TransactionSql,
  ): Promise<ErasureResult> {
    try {
      if (tx) return await this.eraseWithin(tx, guildId, userId);
      return await this.db.sql.begin((conn) => this.eraseWithin(conn, guildId, userId));
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  private async eraseWithin(
    conn: TransactionSql,
    guildId: GuildId,
    userId: UserId,
  ): Promise<ErasureResult> {
    const feedback = await conn<{ id: string }[]>`
          UPDATE ${conn(this.schema)}.feedback
          SET summary = ${ERASURE_TOMBSTONE}, detail = NULL
          WHERE guild_id = ${guildId}
            AND user_id = ${userId}
            AND summary <> ${ERASURE_TOMBSTONE}
          RETURNING id
        `;

    const bugs = await conn<{ id: string }[]>`
          UPDATE ${conn(this.schema)}.bug_reports
          SET summary = ${ERASURE_TOMBSTONE},
              steps = ${ERASURE_TOMBSTONE},
              expected = NULL,
              updated_at = now()
          WHERE guild_id = ${guildId}
            AND reporter_id = ${userId}
            AND summary <> ${ERASURE_TOMBSTONE}
          RETURNING id
        `;

    /*
     * Member-authored notes in the rewards ledger.
     *
     * Scoped to `check_in` and `small_win` — the two kinds whose reason the
     * member typed. `manual_award` and `adjustment` reasons are staff
     * writing down why they moved someone's points, which is a staff
     * record and not this member's to erase. The schema agrees: a CHECK
     * requires those two kinds to keep a non-blank reason, so nulling them
     * would not merely be wrong, it would fail.
     *
     * `check_ins` itself holds no prose at all — a guild, a user, a date —
     * so there is nothing there to erase.
     */
    const ledger = await conn<{ id: string }[]>`
          UPDATE ${conn(this.schema)}.point_events
          SET reason = NULL
          WHERE guild_id = ${guildId}
            AND user_id = ${userId}
            AND kind IN ('check_in', 'small_win')
            AND reason IS NOT NULL
          RETURNING id
        `;

    /*
     * Only where this member was the *reporter*. A report naming them as
     * the subject is somebody else's account of something, and belongs to
     * the moderation record.
     */
    const reports = await conn<{ id: string }[]>`
          UPDATE ${conn(this.schema)}.reports
          SET description = ${ERASURE_TOMBSTONE}
          WHERE guild_id = ${guildId}
            AND reporter_id = ${userId}
            AND description <> ${ERASURE_TOMBSTONE}
          RETURNING id
        `;

    const audit = await conn<{ count: string }[]>`
          SELECT count(*)::text AS count
          FROM ${conn(this.schema)}.audit_events
          WHERE guild_id = ${guildId} AND actor_id = ${userId}
        `;

    const auditActorRows = Number(audit[0]?.count ?? '0');

    return {
      guildId,
      userId,
      feedbackRedacted: feedback.length,
      bugReportsRedacted: bugs.length,
      ledgerNotesRedacted: ledger.length,
      reportsRedacted: reports.length,
      auditActorRows,
      total: feedback.length + bugs.length + ledger.length + reports.length,
    };
  }
}

function clampBatch(value: number): number {
  return Math.min(Math.max(Math.trunc(value), 1), 50_000);
}
