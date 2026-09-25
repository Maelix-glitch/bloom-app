#!/usr/bin/env node
/**
 * Erasure CLI — remove what a member wrote, on request.
 *
 *   pnpm data:erase --user <id>            show what would be removed
 *   pnpm data:erase --user <id> --confirm  remove it
 *
 * A command-line tool rather than a Discord command, deliberately.
 *
 * Erasure is irreversible, rare, and legally significant. Putting it behind a
 * slash command would mean a moderator two clicks away from destroying a
 * member's submissions, with autocomplete offering user ids next to it — and
 * the audit trail saying a Discord account did it, when what actually needs
 * recording is that a request was received and honoured. A CLI run by whoever
 * administers the deployment is the right amount of friction, and it forces a
 * dry run first because the default does nothing.
 *
 * What this does NOT do is delete messages already posted to Discord. Those
 * are Discord's copy, not the platform's, and removing them is a separate,
 * manual step — see docs/operations/data-retention.md.
 */
import {
  BloomError,
  unsafeSnowflake,
  type GuildId,
  type UserId,
} from '@bloom/shared-types';
import { createLogger, JsonLogSink, PrettyLogSink } from '@bloom/logging';
import { loadEnvFile, loadPlatformConfig } from '@bloom/config';
import { createDatabase } from '../client.js';
import {
  PostgresRetentionRepository,
  type ErasureResult,
} from '../repositories/retention.js';
import { PostgresAuditEventRepository } from '../repositories/audit.js';

/**
 * Thrown to roll a dry run back.
 *
 * postgres.js commits when the callback returns and rolls back when it throws,
 * so a rehearsal has to end in a throw. Carrying the result on the error keeps
 * the rehearsal and the real run on exactly the same statements.
 */
class DryRunComplete extends Error {
  public constructor(public readonly result: ErasureResult) {
    super('dry run');
  }
}

const SNOWFLAKE = /^\d{17,20}$/;

function readOption(argv: readonly string[], name: string): string | null {
  const index = argv.indexOf(name);
  if (index === -1) return null;
  return argv[index + 1] ?? null;
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  const confirmed = argv.includes('--confirm');
  const userArg = readOption(argv, '--user');
  const guildArg = readOption(argv, '--guild');

  if (!userArg || !SNOWFLAKE.test(userArg)) {
    console.error(
      '\nUsage: pnpm data:erase --user <discord-user-id> [--guild <id>] [--confirm]\n\n' +
        'The user id must be a Discord snowflake (17-20 digits). Without --confirm\n' +
        'nothing is written; the run reports what would be removed.\n',
    );
    return 2;
  }

  loadEnvFile();
  const config = loadPlatformConfig();

  const guildId = guildArg ? unsafeSnowflake<GuildId>(guildArg) : config.discord.guildId;
  const userId = unsafeSnowflake<UserId>(userArg);

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
    applicationName: 'bloom-erase',
    logger,
  });

  try {
    const ping = await database.ping();
    if (!ping.ok) {
      console.error('\nCannot reach the database. Nothing was changed.\n');
      return 1;
    }

    const retention = new PostgresRetentionRepository(database);

    if (!confirmed) {
      /*
       * A rehearsal, not an estimate.
       *
       * The real erasure runs inside a transaction which is then rolled back,
       * so the number shown to an operator about to answer a legal request
       * comes from the same statements that would run for real. A separate
       * count query could disagree with them, and would do so exactly when a
       * constraint or a scoping clause was wrong.
       */
      try {
        await database.sql.begin(async (tx) => {
          const preview = await retention.eraseMember(guildId, userId, tx);
          throw new DryRunComplete(preview);
        });
      } catch (error) {
        if (error instanceof DryRunComplete) {
          report(error.result, false);
          return 0;
        }
        throw error;
      }
      return 0;
    }

    const result = await retention.eraseMember(guildId, userId);

    /*
     * Audited as a platform action with no Discord actor.
     *
     * The row records that an erasure happened and how much it touched — never
     * what was removed, which would defeat the point of removing it.
     */
    await new PostgresAuditEventRepository(database).append({
      guildId,
      botName: 'guardian',
      event: 'platform.member_data_erased',
      severity: 'warn',
      actorId: null,
      targetId: userId,
      source: 'cli:data:erase',
      details: {
        feedback_redacted: result.feedbackRedacted,
        bug_reports_redacted: result.bugReportsRedacted,
        ledger_notes_redacted: result.ledgerNotesRedacted,
        reports_redacted: result.reportsRedacted,
        total: result.total,
      },
    });

    report(result, true);
    return 0;
  } catch (error) {
    const wrapped = BloomError.from(error);
    console.error(`\n${wrapped.operatorHint}\n`);
    logger.fatal('platform.erase.failed', 'Erasure failed.', { error: wrapped });
    return 1;
  } finally {
    await database.close();
  }
}

function report(result: ErasureResult, applied: boolean): void {
  console.log(`\n${applied ? 'Erased' : 'Dry run — nothing was changed'}`);
  console.log(`  Guild ${result.guildId}, member ${result.userId}\n`);
  console.log(`  Feedback submissions redacted   ${String(result.feedbackRedacted)}`);
  console.log(`  Bug reports redacted            ${String(result.bugReportsRedacted)}`);
  console.log(`  Ledger notes redacted           ${String(result.ledgerNotesRedacted)}`);
  console.log(`  Reports filed by them redacted  ${String(result.reportsRedacted)}`);
  console.log(`  ─`);
  console.log(`  Total rows                      ${String(result.total)}\n`);
  console.log(
    `  Audit rows naming this member: ${String(result.auditActorRows)} (kept — they hold\n` +
      `  ids and event names, never prose, and they are the moderation record).\n`,
  );

  if (!applied) {
    console.log('  Re-run with --confirm to apply.\n');
  } else {
    console.log(
      '  Messages the bots already posted to Discord are not affected. Deleting\n' +
        '  those is a separate manual step — see docs/operations/data-retention.md.\n',
    );
  }
}

process.exitCode = await main();
