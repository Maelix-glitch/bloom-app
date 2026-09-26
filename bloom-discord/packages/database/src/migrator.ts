import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { bloomError } from '@bloom/shared-types';
import type { Logger } from '@bloom/logging';
import { noopLogger } from '@bloom/logging';
import { toDatabaseError, type Database } from './client.js';

export interface MigrationFile {
  /** Numeric prefix, e.g. 3 for `0003_platform_operations.sql`. */
  readonly version: number;
  readonly name: string;
  readonly filename: string;
  readonly sql: string;
  readonly checksum: string;
}

export interface AppliedMigration {
  readonly version: number;
  readonly name: string;
  readonly checksum: string;
  readonly appliedAt: Date;
  readonly durationMs: number;
}

export interface MigrationStatus {
  readonly applied: readonly AppliedMigration[];
  readonly pending: readonly MigrationFile[];
  readonly drifted: readonly { file: MigrationFile; applied: AppliedMigration }[];
}

const FILENAME_PATTERN = /^(\d{4})_([a-z0-9_]+)\.sql$/;

/**
 * An arbitrary but fixed 64-bit key for `pg_advisory_xact_lock`.
 *
 * Derived from the string "bloom_discord.migrations" so it cannot collide by
 * accident with a lock taken by the Bloom app in the same database.
 */
const MIGRATION_LOCK_KEY = BigInt.asIntN(
  64,
  BigInt(
    `0x${createHash('sha256').update('bloom_discord.migrations').digest('hex').slice(0, 16)}`,
  ),
);

/**
 * Read migration files from disk.
 *
 * Ordering is by numeric prefix, not lexicographic filename order — `0010_`
 * must come after `0009_`, and string sorting gets that right only by accident
 * of zero padding. Relying on the padding works until someone writes `10_`.
 */
export async function loadMigrationFiles(
  directory: string,
): Promise<readonly MigrationFile[]> {
  const entries = await readdir(directory);
  const files: MigrationFile[] = [];

  for (const entry of entries.sort()) {
    if (!entry.endsWith('.sql')) continue;

    const match = FILENAME_PATTERN.exec(basename(entry));
    if (!match) {
      throw bloomError('CONFIGURATION_ERROR', {
        operatorHint: `Migration filename "${entry}" does not match the required pattern NNNN_snake_case_name.sql (for example 0004_moderation.sql).`,
        details: { filename: entry },
      });
    }

    const sql = await readFile(join(directory, entry), 'utf8');
    files.push({
      version: Number.parseInt(match[1]!, 10),
      name: match[2]!,
      filename: entry,
      sql,
      checksum: createHash('sha256').update(sql).digest('hex'),
    });
  }

  const sorted = [...files].sort((a, b) => a.version - b.version);

  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i]!.version === sorted[i - 1]!.version) {
      throw bloomError('CONFIGURATION_ERROR', {
        operatorHint: `Two migrations share version ${String(sorted[i]!.version)}: ${sorted[i - 1]!.filename} and ${sorted[i]!.filename}. Version numbers must be unique, or the order they apply in depends on the filesystem.`,
      });
    }
  }

  return sorted;
}

/**
 * Create the ledger table.
 *
 * Bootstrapped outside the normal migration flow, since it is the thing that
 * records migrations. Lives in the platform schema and is created with plain
 * `IF NOT EXISTS` so it is safe to call on every run.
 */
async function ensureLedger(database: Database): Promise<void> {
  const { sql, schema } = database;
  await sql`CREATE SCHEMA IF NOT EXISTS ${sql(schema)}`;
  await sql`
    CREATE TABLE IF NOT EXISTS ${sql(schema)}.schema_migrations (
      version     integer     PRIMARY KEY,
      name        text        NOT NULL,
      checksum    text        NOT NULL,
      applied_at  timestamptz NOT NULL DEFAULT now(),
      duration_ms integer     NOT NULL
    )
  `;
}

async function readApplied(database: Database): Promise<readonly AppliedMigration[]> {
  const { sql, schema } = database;
  const rows = await sql<
    {
      version: number;
      name: string;
      checksum: string;
      applied_at: Date;
      duration_ms: number;
    }[]
  >`
    SELECT version, name, checksum, applied_at, duration_ms
    FROM ${sql(schema)}.schema_migrations
    ORDER BY version ASC
  `;
  return rows.map((row) => ({
    version: row.version,
    name: row.name,
    checksum: row.checksum,
    appliedAt: row.applied_at,
    durationMs: row.duration_ms,
  }));
}

/**
 * Compare disk against the ledger.
 *
 * "Drift" means a file whose checksum no longer matches what was applied —
 * someone edited a migration that has already run. That is always a mistake:
 * the edit will never be applied to an environment that already ran the
 * original, so two databases now differ while claiming the same version.
 */
export async function getMigrationStatus(
  database: Database,
  directory: string,
): Promise<MigrationStatus> {
  await ensureLedger(database);

  const files = await loadMigrationFiles(directory);
  const applied = await readApplied(database);
  const appliedByVersion = new Map(applied.map((entry) => [entry.version, entry]));

  const pending: MigrationFile[] = [];
  const drifted: { file: MigrationFile; applied: AppliedMigration }[] = [];

  for (const file of files) {
    const match = appliedByVersion.get(file.version);
    if (!match) {
      pending.push(file);
    } else if (match.checksum !== file.checksum) {
      drifted.push({ file, applied: match });
    }
  }

  return { applied, pending, drifted };
}

export interface MigrateResult {
  readonly appliedNow: readonly { version: number; name: string; durationMs: number }[];
  readonly alreadyApplied: number;
}

/**
 * Apply every pending migration.
 *
 * Concurrency: all three bots may start at once, and each will try this. The
 * transaction-scoped advisory lock serialises them — the first process holds
 * it, the others block, and by the time they proceed the ledger already lists
 * the migrations so they find nothing to do.
 *
 * `pg_advisory_xact_lock` rather than the session-scoped variant specifically
 * because Supabase's transaction pooler hands out a different backend per
 * transaction; a session lock would be taken on a connection we never see again.
 */
export async function runMigrations(
  database: Database,
  directory: string,
  options: { readonly logger?: Logger; readonly dryRun?: boolean } = {},
): Promise<MigrateResult> {
  const logger = options.logger ?? noopLogger;

  const status = await getMigrationStatus(database, directory);

  if (status.drifted.length > 0) {
    const detail = status.drifted
      .map(
        (entry) =>
          `  • ${entry.file.filename} — applied ${entry.applied.appliedAt.toISOString()} with checksum ${entry.applied.checksum.slice(0, 12)}…, file now hashes to ${entry.file.checksum.slice(0, 12)}…`,
      )
      .join('\n');
    throw bloomError('CONFIGURATION_ERROR', {
      operatorHint: [
        'Migration drift detected. These files changed after they were applied:',
        detail,
        '',
        'Applied migrations are immutable. Revert the edit and add a new migration instead.',
      ].join('\n'),
      details: { drifted: status.drifted.map((entry) => entry.file.filename) },
    });
  }

  if (status.pending.length === 0) {
    logger.info('database.migrate.noop', 'No pending migrations.', {
      context: { applied: status.applied.length },
    });
    return { appliedNow: [], alreadyApplied: status.applied.length };
  }

  if (options.dryRun) {
    logger.info(
      'database.migrate.dry_run',
      'Pending migrations (dry run, nothing applied).',
      {
        context: { pending: status.pending.map((file) => file.filename) },
      },
    );
    return { appliedNow: [], alreadyApplied: status.applied.length };
  }

  const appliedNow: { version: number; name: string; durationMs: number }[] = [];

  for (const file of status.pending) {
    const startedAt = Date.now();

    try {
      await database.transaction(async (tx) => {
        await tx`SELECT pg_advisory_xact_lock(${MIGRATION_LOCK_KEY.toString()}::bigint)`;

        // Another process may have applied this while we waited for the lock.
        const [existing] = await tx<{ version: number }[]>`
          SELECT version FROM ${tx(database.schema)}.schema_migrations
          WHERE version = ${file.version}
        `;
        if (existing) return;

        /*
         * `unsafe` is unavoidable here and is safe here: a migration is a whole
         * SQL script with its own statements, not a value to be bound, and the
         * text comes from a reviewed file in the repository rather than from
         * any request. This is the only `unsafe` call in the codebase.
         */
        await tx.unsafe(file.sql);

        await tx`
          INSERT INTO ${tx(database.schema)}.schema_migrations (version, name, checksum, duration_ms)
          VALUES (${file.version}, ${file.name}, ${file.checksum}, ${Date.now() - startedAt})
        `;
      });
    } catch (error) {
      const wrapped = toDatabaseError(error);
      logger.error('database.migrate.failed', `Migration ${file.filename} failed.`, {
        error: wrapped,
        context: { filename: file.filename, version: file.version },
      });
      throw bloomError('CONFIGURATION_ERROR', {
        operatorHint: `Migration ${file.filename} failed and was rolled back: ${wrapped.operatorHint}`,
        details: { filename: file.filename, version: file.version },
        cause: wrapped,
      });
    }

    const durationMs = Date.now() - startedAt;
    appliedNow.push({ version: file.version, name: file.name, durationMs });
    logger.info('database.migrate.applied', `Applied ${file.filename}.`, {
      duration_ms: durationMs,
      context: { filename: file.filename, version: file.version },
    });
  }

  return { appliedNow, alreadyApplied: status.applied.length };
}
