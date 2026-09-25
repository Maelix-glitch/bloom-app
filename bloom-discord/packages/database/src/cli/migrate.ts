#!/usr/bin/env node
/**
 * Migration CLI.
 *
 *   pnpm db:migrate              apply everything pending
 *   pnpm db:migrate --status     show state, change nothing
 *   pnpm db:migrate --dry-run    list what would be applied
 *
 * Run before deploying a new version. Bots do not migrate on boot: three
 * processes starting at once and racing to alter a schema is a bad default,
 * even with a lock, and it hides schema changes inside a deploy.
 */
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { BloomError } from '@bloom/shared-types';
import { createLogger, JsonLogSink, PrettyLogSink } from '@bloom/logging';
import { loadEnvFile, loadPlatformConfig } from '@bloom/config';
import { createDatabase } from '../client.js';
import { getMigrationStatus, runMigrations } from '../migrator.js';

const MIGRATIONS_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../database/migrations',
);

async function main(): Promise<number> {
  const args = new Set(process.argv.slice(2));
  const statusOnly = args.has('--status');
  const dryRun = args.has('--dry-run');

  loadEnvFile();
  const config = loadPlatformConfig();

  const logger = createLogger({
    botName: 'platform',
    environment: config.runtime.environment,
    version: config.runtime.version,
    level: config.logging.level,
    sink: config.logging.pretty ? new PrettyLogSink() : new JsonLogSink(),
  });

  const database = createDatabase({
    url: config.database.url,
    schema: config.database.schema,
    // One connection: this is a single-threaded script, and taking five from
    // the pooler while three bots are running is rude.
    maxConnections: 1,
    idleTimeoutSeconds: config.database.idleTimeoutSeconds,
    connectTimeoutSeconds: config.database.connectTimeoutSeconds,
    applicationName: 'bloom-migrate',
    logger,
  });

  try {
    const ping = await database.ping();
    if (!ping.ok) {
      logger.fatal('database.unreachable', 'Cannot reach the database.', {
        error: ping.error,
      });
      return 1;
    }

    if (statusOnly) {
      const status = await getMigrationStatus(database, MIGRATIONS_DIR);
      console.log(`\nSchema: ${config.database.schema}`);
      console.log(`Applied: ${String(status.applied.length)}`);
      for (const entry of status.applied) {
        console.log(
          `  ✓ ${String(entry.version).padStart(4, '0')}_${entry.name}  ${entry.appliedAt.toISOString()}  ${String(entry.durationMs)}ms`,
        );
      }
      console.log(`Pending: ${String(status.pending.length)}`);
      for (const file of status.pending) {
        console.log(`  · ${file.filename}`);
      }
      if (status.drifted.length > 0) {
        console.log(`\nDRIFT — these applied migrations no longer match their files:`);
        for (const entry of status.drifted) console.log(`  ! ${entry.file.filename}`);
        return 1;
      }
      return 0;
    }

    const result = await runMigrations(database, MIGRATIONS_DIR, { logger, dryRun });

    if (result.appliedNow.length === 0) {
      console.log(
        dryRun ? 'Dry run complete. Nothing was applied.' : 'Database is up to date.',
      );
    } else {
      console.log(`Applied ${String(result.appliedNow.length)} migration(s):`);
      for (const entry of result.appliedNow) {
        console.log(
          `  ✓ ${String(entry.version).padStart(4, '0')}_${entry.name}  ${String(entry.durationMs)}ms`,
        );
      }
    }
    return 0;
  } catch (error) {
    const wrapped = BloomError.from(error);
    // Operator hint, never a stack: the hint is the part that says what to do.
    console.error(`\n${wrapped.operatorHint}\n`);
    logger.fatal('database.migrate.error', 'Migration run failed.', { error: wrapped });
    return 1;
  } finally {
    await database.close();
  }
}

process.exitCode = await main();
