import { BloomError, type BotName, type GuildId } from '@bloom/shared-types';
import { BaseRepository } from '../repository.js';
import { toDatabaseError, type Database } from '../client.js';

export type JobStatus = 'running' | 'succeeded' | 'failed' | 'timed_out' | 'skipped';

export interface JobLease {
  readonly runId: string;
  readonly jobKey: string;
  readonly attempt: number;
  readonly leaseExpiresAt: Date;
}

export interface JobRunSummary {
  readonly runId: string;
  readonly jobKey: string;
  readonly status: JobStatus;
  readonly startedAt: Date;
  readonly finishedAt: Date | null;
  readonly durationMs: number | null;
  readonly errorCode: string | null;
  readonly attempt: number;
}

export interface JobRunRepository {
  /** Returns a lease, or `null` if another process already holds this job. */
  acquire(input: {
    readonly jobKey: string;
    readonly botName: BotName;
    readonly guildId?: GuildId | null;
    readonly runnerId: string;
    readonly leaseSeconds: number;
  }): Promise<JobLease | null>;

  /** Extend a lease held by a long-running job so it is not stolen mid-flight. */
  renew(runId: string, leaseSeconds: number): Promise<boolean>;

  complete(
    runId: string,
    status: Exclude<JobStatus, 'running'>,
    outcome?: {
      readonly errorCode?: string | null;
      readonly errorMessage?: string | null;
    },
  ): Promise<void>;

  /** Mark leases that lapsed without completing. Returns how many were reclaimed. */
  reclaimExpired(): Promise<number>;

  lastRun(jobKey: string, guildId?: GuildId | null): Promise<JobRunSummary | null>;
}

/**
 * Job leasing.
 *
 * Two bot processes running the same scheduled job is not hypothetical — it
 * happens during a rolling deploy, every time. The partial unique index on
 * `(job_key, guild_id) WHERE status = 'running'` means Postgres, not the
 * application, decides who runs it.
 *
 * Leases expire. A process that acquires a job and is then killed would
 * otherwise block that job forever; instead the lease lapses, `reclaimExpired`
 * marks it `timed_out`, and the next scheduler tick picks it up.
 */
export class PostgresJobRunRepository extends BaseRepository implements JobRunRepository {
  public constructor(database: Database) {
    super(database);
  }

  public async acquire(input: {
    readonly jobKey: string;
    readonly botName: BotName;
    readonly guildId?: GuildId | null;
    readonly runnerId: string;
    readonly leaseSeconds: number;
  }): Promise<JobLease | null> {
    const sql = this.conn();
    const leaseSeconds = Math.min(Math.max(Math.trunc(input.leaseSeconds), 5), 3600);

    try {
      // Clear anything whose lease has lapsed before attempting to take it.
      await this.reclaimExpired();

      const attempt = await this.nextAttempt(input.jobKey, input.guildId ?? null);

      const rows = await sql<{ id: string; lease_expires_at: Date }[]>`
        INSERT INTO ${sql(this.schema)}.job_runs
          (job_key, guild_id, bot_name, status, runner_id, attempt, lease_expires_at)
        VALUES (
          ${input.jobKey}, ${input.guildId ?? null}, ${input.botName}, 'running',
          ${input.runnerId}, ${attempt},
          now() + make_interval(secs => ${leaseSeconds})
        )
        RETURNING id, lease_expires_at
      `;

      const row = rows[0];
      if (!row) return null;

      return {
        runId: row.id,
        jobKey: input.jobKey,
        attempt,
        leaseExpiresAt: row.lease_expires_at,
      };
    } catch (error) {
      const wrapped = toDatabaseError(error);
      // The unique index fired: somebody else holds the job. Expected, not an error.
      if (BloomError.isCode(wrapped, 'DUPLICATE_OPERATION')) return null;
      throw wrapped as Error;
    }
  }

  public async renew(runId: string, leaseSeconds: number): Promise<boolean> {
    const sql = this.conn();
    const seconds = Math.min(Math.max(Math.trunc(leaseSeconds), 5), 3600);
    try {
      const rows = await sql<{ id: string }[]>`
        UPDATE ${sql(this.schema)}.job_runs
        SET lease_expires_at = now() + make_interval(secs => ${seconds})
        WHERE id = ${runId}::uuid AND status = 'running'
        RETURNING id
      `;
      return rows.length > 0;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async complete(
    runId: string,
    status: Exclude<JobStatus, 'running'>,
    outcome: {
      readonly errorCode?: string | null;
      readonly errorMessage?: string | null;
    } = {},
  ): Promise<void> {
    const sql = this.conn();
    try {
      await sql`
        UPDATE ${sql(this.schema)}.job_runs
        SET status = ${status},
            finished_at = now(),
            duration_ms = GREATEST(0, (EXTRACT(EPOCH FROM (now() - started_at)) * 1000)::integer),
            error_code = ${outcome.errorCode ?? null},
            error_message = ${truncateMessage(outcome.errorMessage)}
        WHERE id = ${runId}::uuid
      `;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async reclaimExpired(): Promise<number> {
    const sql = this.conn();
    try {
      const rows = await sql<{ id: string }[]>`
        UPDATE ${sql(this.schema)}.job_runs
        SET status = 'timed_out',
            finished_at = now(),
            duration_ms = GREATEST(0, (EXTRACT(EPOCH FROM (now() - started_at)) * 1000)::integer),
            error_code = 'TIMEOUT',
            error_message = 'Lease expired without completion; the runner process most likely stopped.'
        WHERE status = 'running' AND lease_expires_at < now()
        RETURNING id
      `;
      return rows.length;
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  public async lastRun(
    jobKey: string,
    guildId?: GuildId | null,
  ): Promise<JobRunSummary | null> {
    const sql = this.conn();
    try {
      const rows = await sql<
        {
          id: string;
          job_key: string;
          status: JobStatus;
          started_at: Date;
          finished_at: Date | null;
          duration_ms: number | null;
          error_code: string | null;
          attempt: number;
        }[]
      >`
        SELECT id, job_key, status, started_at, finished_at, duration_ms, error_code, attempt
        FROM ${sql(this.schema)}.job_runs
        WHERE job_key = ${jobKey}
          AND guild_id IS NOT DISTINCT FROM ${guildId ?? null}
        ORDER BY started_at DESC
        LIMIT 1
      `;
      const row = rows[0];
      if (!row) return null;
      return {
        runId: row.id,
        jobKey: row.job_key,
        status: row.status,
        startedAt: row.started_at,
        finishedAt: row.finished_at,
        durationMs: row.duration_ms,
        errorCode: row.error_code,
        attempt: row.attempt,
      };
    } catch (error) {
      throw toDatabaseError(error);
    }
  }

  private async nextAttempt(jobKey: string, guildId: GuildId | null): Promise<number> {
    const sql = this.conn();
    const rows = await sql<{ attempt: number }[]>`
      SELECT attempt FROM ${sql(this.schema)}.job_runs
      WHERE job_key = ${jobKey} AND guild_id IS NOT DISTINCT FROM ${guildId}
      ORDER BY started_at DESC
      LIMIT 1
    `;
    const previous = rows[0]?.attempt ?? 0;
    return previous + 1;
  }
}

/** Error messages are for operators, not archives. Keep the column bounded. */
function truncateMessage(message: string | null | undefined): string | null {
  if (!message) return null;
  return message.length > 1000 ? `${message.slice(0, 997)}...` : message;
}
