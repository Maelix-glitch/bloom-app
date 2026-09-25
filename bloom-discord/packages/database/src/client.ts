import postgres from 'postgres';
import { BloomError, bloomError } from '@bloom/shared-types';
import type { Logger } from '@bloom/logging';
import { noopLogger } from '@bloom/logging';

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

  public async transaction<T>(fn: (tx: TransactionSql) => Promise<T>): Promise<T> {
    try {
      return (await this.sql.begin(async (tx) => await fn(tx))) as T;
    } catch (error) {
      throw toDatabaseError(error);
    }
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
