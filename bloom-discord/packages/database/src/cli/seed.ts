#!/usr/bin/env node
/**
 * Seed CLI — development and test only.
 *
 *   pnpm db:seed
 *
 * Refuses to run against production. Seeds are convenience for local work; a
 * production database gets its rows from real usage, and a seed script with a
 * production connection string is one typo away from an incident.
 */
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { BloomError } from '@bloom/shared-types';
import { createLogger, JsonLogSink, PrettyLogSink } from '@bloom/logging';
import { loadEnvFile, loadPlatformConfig } from '@bloom/config';
import { createDatabase } from '../client.js';

const SEEDS_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../database/seeds',
);

async function main(): Promise<number> {
  loadEnvFile();
  const config = loadPlatformConfig();

  if (config.runtime.environment === 'production') {
    console.error(
      'Refusing to seed: BLOOM_ENVIRONMENT is production. Seeds are for development and test only.',
    );
    return 1;
  }

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
    maxConnections: 1,
    idleTimeoutSeconds: config.database.idleTimeoutSeconds,
    connectTimeoutSeconds: config.database.connectTimeoutSeconds,
    applicationName: 'bloom-seed',
    logger,
  });

  try {
    const files = (await readdir(SEEDS_DIR))
      .filter((name) => name.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const raw = await readFile(join(SEEDS_DIR, file), 'utf8');

      /*
       * Seeds use psql-style `:'guild_id'` placeholders. Rather than shelling
       * out to psql, substitute the one value we support — and only after
       * re-validating it as a snowflake, so a malformed env var cannot inject
       * SQL through a seed file.
       */
      const guildId = config.discord.guildId;
      if (!/^[0-9]{17,20}$/.test(guildId)) {
        throw new Error(`DISCORD_GUILD_ID is not a snowflake: ${guildId}`);
      }
      const sqlText = raw.replaceAll(":'guild_id'", `'${guildId}'`);

      await database.transaction(async (tx) => {
        await tx.unsafe(sqlText);
      });

      console.log(`  ✓ ${file}`);
    }

    console.log(`Seeded ${String(files.length)} file(s) into ${config.database.schema}.`);
    return 0;
  } catch (error) {
    const wrapped = BloomError.from(error);
    console.error(`\n${wrapped.operatorHint}\n`);
    return 1;
  } finally {
    await database.close();
  }
}

process.exitCode = await main();
