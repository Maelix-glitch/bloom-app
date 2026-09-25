#!/usr/bin/env tsx
/**
 * Pre-flight diagnostics.
 *
 *   pnpm diagnostics
 *
 * Answers the question every "the bot isn't working" report actually needs
 * answered: which specific piece of configuration is wrong. It checks
 * everything that can be checked without the bots running, and every check
 * reports what it *actually* found — nothing is assumed healthy.
 *
 * Exits non-zero if any check fails, so it can gate a deploy.
 */
import {
  BloomError,
  BOT_DISPLAY_NAMES,
  BOT_NAMES,
  ROLE_ENV_KEYS,
} from '@bloom/shared-types';
import { loadEnvFile, loadPlatformConfig, summariseConfig } from '@bloom/config';
import { createDatabase } from '@bloom/database';
import { getMigrationStatus } from '@bloom/database';
import { noopLogger } from '@bloom/logging';

type Outcome = 'pass' | 'warn' | 'fail';

interface CheckResult {
  readonly name: string;
  readonly outcome: Outcome;
  readonly detail: string;
}

const SYMBOLS: Readonly<Record<Outcome, string>> = {
  pass: '  ok ',
  warn: 'warn',
  fail: 'FAIL',
};

async function main(): Promise<void> {
  process.stdout.write('\nBloom Discord platform — diagnostics\n\n');

  const results: CheckResult[] = [];

  // 1. Node version. Everything else assumes it.
  const major = Number.parseInt(process.versions.node.split('.')[0] ?? '0', 10);
  results.push({
    name: 'Node.js runtime',
    outcome: major >= 24 ? 'pass' : 'fail',
    detail:
      major >= 24
        ? `v${process.versions.node}`
        : `v${process.versions.node} — the platform requires Node 24.17 or newer. discord.js 14.27 needs at least 22.12, and the code targets newer language features.`,
  });

  // 2. Configuration.
  loadEnvFile();
  let config: ReturnType<typeof loadPlatformConfig> | null = null;
  try {
    config = loadPlatformConfig(process.env);
    results.push({
      name: 'Configuration',
      outcome: 'pass',
      detail: 'All required keys present and valid.',
    });
  } catch (error) {
    const bloom = BloomError.from(error);
    results.push({
      name: 'Configuration',
      outcome: 'fail',
      detail: bloom.operatorHint,
    });
  }

  if (config) {
    // 3. Which bots are actually runnable.
    for (const bot of BOT_NAMES) {
      const credentials = config.bots[bot];
      results.push({
        name: `${BOT_DISPLAY_NAMES[bot]} credentials`,
        outcome: credentials ? 'pass' : 'warn',
        detail: credentials
          ? `client id ${credentials.clientId}`
          : 'No token configured. This bot cannot start, which is fine if you are not running it yet.',
      });
    }

    // 4. Roles. Missing ids are the most common cause of silent failure.
    const missingRoles = Object.entries(config.roles)
      .filter(([, id]) => id === null)
      .map(([key]) => ROLE_ENV_KEYS[key as keyof typeof ROLE_ENV_KEYS]);

    results.push({
      name: 'Role ids',
      outcome: missingRoles.length === 0 ? 'pass' : 'warn',
      detail:
        missingRoles.length === 0
          ? 'All seven roles configured.'
          : `Not set: ${missingRoles.join(', ')}. Guardian requires all of these; enable Developer Mode in Discord, then right-click each role in Server Settings → Roles → Copy Role ID.`,
    });

    // 5. Channels.
    const missingChannels = Object.entries(config.channels).filter(
      ([, id]) => id === null,
    ).length;
    results.push({
      name: 'Channel ids',
      outcome: missingChannels === 0 ? 'pass' : 'warn',
      detail:
        missingChannels === 0
          ? 'All channels configured.'
          : `${String(missingChannels)} channel id(s) not set. Features that post to them will refuse to run rather than guessing a destination.`,
    });

    // 6. Database — a real connection and a real query, not a URL parse.
    const database = createDatabase({
      ...config.database,
      maxConnections: 1,
      applicationName: 'bloom-diagnostics',
      logger: noopLogger,
    });

    try {
      const ping = await database.ping();
      results.push({
        name: 'Database connectivity',
        outcome: ping.ok ? 'pass' : 'fail',
        detail: ping.ok
          ? `Round trip ${String(ping.latencyMs)}ms.`
          : (ping.error?.operatorHint ?? 'Unreachable.'),
      });

      if (ping.ok) {
        const status = await getMigrationStatus(database, 'database/migrations');
        const drifted = status.drifted.length > 0;
        results.push({
          name: 'Migrations',
          outcome: drifted ? 'fail' : status.pending.length > 0 ? 'warn' : 'pass',
          detail: drifted
            ? `Checksum drift in: ${status.drifted.map((entry) => entry.file.filename).join(', ')}. An applied migration was edited after the fact; environments now disagree while claiming the same version.`
            : status.pending.length > 0
              ? `${String(status.pending.length)} pending. Run \`pnpm db:migrate\`.`
              : `${String(status.applied.length)} applied, none pending.`,
        });
      }
    } catch (error) {
      const bloom = BloomError.from(error);
      results.push({
        name: 'Database',
        outcome: 'fail',
        detail: bloom.operatorHint,
      });
    } finally {
      await database.close();
    }

    process.stdout.write(`${JSON.stringify(summariseConfig(config), null, 2)}\n\n`);
  }

  for (const result of results) {
    process.stdout.write(
      `[${SYMBOLS[result.outcome]}] ${result.name}\n         ${result.detail}\n`,
    );
  }

  const failed = results.filter((result) => result.outcome === 'fail').length;
  const warned = results.filter((result) => result.outcome === 'warn').length;

  process.stdout.write(
    `\n${String(results.length - failed - warned)} passed, ${String(warned)} warning(s), ${String(failed)} failure(s).\n\n`,
  );

  process.exit(failed > 0 ? 1 : 0);
}

await main();
