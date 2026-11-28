import postgres from 'postgres';
import { BloomError, bloomError } from '@bloom/shared-types';
import { backoffDelay, sleep } from '@bloom/utils';
import type { Logger } from '@bloom/logging';
import { noopLogger } from '@bloom/logging';

/**
 * How many times a transaction may be retried after a conflict.
 *
 * Two. A third attempt is almost never the one that succeeds — by then the
 * contention is structural rather than incidental — and every retry holds a
 * connection from a small pool while a member waits.
 */
const TRANSACTION_RETRIES = 2;
const RETRY_BASE_MS = 25;
const RETRY_MAX_MS = 200;

export type Sql = postgres.Sql<Record<string, never>>;
export type TransactionSql = postgres.TransactionSql<Record<string, never>>;

export interface DatabaseOptions {
  readonly url: string;
  readonly schema: string;
  readonly maxConnections: number;
  readonly idleTimeoutSeconds: number;
  readonly connectTimeoutSeconds: number;
  /** Shows up in `pg_stat_activity`, which is how you find the noisy process. */
  readonly applicationName: string;
  readonly logger?: Logger;
}

export interface PingResult {
  readonly ok: boolean;
  readonly latencyMs: number;
  readonly error?: BloomError;
}

export interface Database {
  /** Tagged-template query builder. Parameterised by construction — see the note below. */
  readonly sql: Sql;
  readonly schema: string;

  /**
   * Run work in a transaction. Rolls back on any throw.
   *
   * Used wherever an effect and its idempotency claim must be atomic — which is
   * every reward grant, every role transition and every report creation.
   */
  transaction<T>(fn: (tx: TransactionSql) => Promise<T>): Promise<T>;

  ping(): Promise<PingResult>;
  close(): Promise<void>;
}

/**
 * On SQL injection
 * ----------------
 * postgres.js sends every `${...}` in a tagged template as a bound parameter,
 * never as concatenated SQL. `sql\`select * from t where id = ${userInput}\``
 * is safe by construction.
 *
 * The two ways to defeat that are `sql.unsafe()` and building identifiers from
 * user input. Neither appears in this codebase: `sql.unsafe` is used in exactly
 * one place — the migration runner, on files that are part of the source tree —
 * and identifiers come from the `sql()` helper, which escapes them.
 */
class PostgresDatabase implements Database {
  public readonly sql: Sql;
  public readonly schema: string;
  private readonly logger: Logger;
  private closed = false;

  public constructor(options: DatabaseOptions) {
    this.schema = options.schema;
    this.logger = options.logger ?? noopLogger;

    this.sql = postgres(options.url, {
      max: options.maxConnections,
      idle_timeout: options.idleTimeoutSeconds,
      connect_timeout: options.connectTimeoutSeconds,

      /*
       * Supabase's pooler runs in transaction mode, where a prepared statement
       * created on one backend is not visible on the next. Leaving prepared
       * statements on produces intermittent "prepared statement does not exist"
       * errors that only appear under concurrency — the worst possible failure
       * mode to debug. Disabled deliberately.
       */
      prepare: false,

      connection: {
        application_name: options.applicationName,
      },

      /*
       * postgres.js logs notices to the console by default, which bypasses the
       * structured logger and therefore bypasses redaction.
       */
      onnotice: (notice) => {
        // postgres.js types notices as an index signature, hence the bracket access.
        this.logger.debug('database.notice', notice['message'] ?? 'Postgres notice', {
          context: { severity: notice['severity'] ?? 'NOTICE' },
        });
      },

      // Postgres `bigint` arrives as a string; keep it that way. Point balances
      // and counters must not silently lose precision at 2^53.
      types: {},
    });
  }

  /**
   * Run a transaction, retrying only the two failures that are safe to retry.
   *
   * PostgreSQL raises `40001 serialization_failure` and `40P01
   * deadlock_detected` when it has already rolled the transaction back
   * entirely. Nothing was committed, no side effect survived, and the correct
   * response is to run it again — which is why `toDatabaseError` has always
   * labelled them "safe to retry" while nothing in the platform retried.
   *
   * Bloom reaches for both. Concurrent joins to a capacity-limited event take
   * an advisory lock; two members completing activities that touch the same
   * ledger rows can deadlock. Each is rare, each presents to a member as a
   * command that failed for no visible reason, and each is fixed by trying
   * once more.
   *
   * Three properties keep this narrow, which is the instruction:
   *
   *   • Only those two SQLSTATEs. A connection failure is *not* retried here
   *     — the transaction may have committed before the connection dropped,
   *     and retrying could double-apply it. Those surface as before.
   *   • Bounded: two retries, then the error is raised.
   *   • The callback is re-run from the top, because the transaction it was
   *     operating in no longer exists.
   *
   * It is not a resilience framework and nothing else may use it: there is no
   * generic `retry()` here to be reached for by code whose operation is not
   * known to be side-effect-free on failure.
   */
  public async transaction<T>(fn: (tx: TransactionSql) => Promise<T>): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= TRANSACTION_RETRIES; attempt += 1) {
      try {
        return (await this.sql.begin(async (tx) => await fn(tx))) as T;
      } catch (error) {
        lastError = error;
        const sqlstate = extractSqlState(error);
        const retryable = sqlstate === '40001' || sqlstate === '40P01';

        if (!retryable || attempt === TRANSACTION_RETRIES) break;

        /*
         * A short, jittered pause. Two transactions that deadlocked and then
         * retried in lockstep would deadlock again on the same pair of rows;
         * the jitter is what separates them.
         */
        /*
         * The platform's existing backoff helper, not a second one. It uses
         * `crypto.randomInt` for the jitter — overkill for a 25ms pause, and
         * the reason is the lint rule rather than the randomness: one rule
         * banning `Math.random` outright beats a judgement call per site.
         */
        const backoffMs = backoffDelay(attempt + 1, RETRY_BASE_MS, RETRY_MAX_MS);
        this.logger.warn(
          'database.transaction_retry',
          `Transaction conflict (SQLSTATE ${sqlstate}); retrying.`,
          {
            context: {
              attempt: attempt + 1,
              sqlstate,
              backoff_ms: Math.round(backoffMs),
            },
          },
        );
        await sleep(backoffMs);
      }
    }

    throw toDatabaseError(lastError);
  }

  public async ping(): Promise<PingResult> {
    const startedAt = Date.now();
    try {
      await this.sql`SELECT 1 AS ok`;
      return { ok: true, latencyMs: Date.now() - startedAt };
    } catch (error) {
      return {
        ok: false,
        latencyMs: Date.now() - startedAt,
        error: toDatabaseError(error),
      };
    }
  }

  public async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    // Give in-flight queries a moment rather than severing them mid-transaction.
    await this.sql.end({ timeout: 5 });
  }
}

/**
 * Translate a driver error into the platform's error type.
 *
 * Connection-level failures become `DATABASE_UNAVAILABLE`, which the catalog
 * marks retryable. Constraint violations become `DUPLICATE_OPERATION`, because
 * in this codebase a unique-violation almost always means an idempotency guard
 * did its job — and that is not an incident.
 */
export function toDatabaseError(error: unknown): BloomError {
  if (BloomError.is(error)) return error;

  const code = extractSqlState(error);
  const message = error instanceof Error ? error.message : String(error);

  // 23505 unique_violation — an idempotency key or a natural key was reclaimed.
  if (code === '23505') {
    return bloomError('DUPLICATE_OPERATION', {
      operatorHint: `Unique constraint violation: ${message}`,
      details: { sqlstate: code },
      cause: error,
    });
  }

  // 23503 foreign_key_violation, 23514 check_violation — the application tried
  // to write a row the schema says is impossible. That is a bug, not an outage.
  if (code === '23503' || code === '23514' || code === '23502') {
    return bloomError('INTERNAL_ERROR', {
      operatorHint: `Database rejected the write as inconsistent (SQLSTATE ${code}): ${message}`,
      details: { sqlstate: code },
      cause: error,
    });
  }

  // 40001 serialization_failure, 40P01 deadlock_detected — genuinely retryable.
  if (code === '40001' || code === '40P01') {
    return bloomError('DATABASE_UNAVAILABLE', {
      operatorHint: `Transaction conflict (SQLSTATE ${code}); safe to retry: ${message}`,
      details: { sqlstate: code },
      cause: error,
    });
  }

  if (code === '57014') {
    return bloomError('TIMEOUT', {
      operatorHint: `Query cancelled by statement timeout: ${message}`,
      details: { sqlstate: code },
      cause: error,
    });
  }

  return bloomError('DATABASE_UNAVAILABLE', {
    operatorHint: `Database operation failed: ${message}`,
    details: code ? { sqlstate: code } : {},
    cause: error,
  });
}

function extractSqlState(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}

export function createDatabase(options: DatabaseOptions): Database {
  return new PostgresDatabase(options);
}
