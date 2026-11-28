#!/usr/bin/env tsx
/**
 * Live staging validation — the half that needs a real Discord connection.
 *
 *   pnpm staging:gateway                 # connect, audit, register, watch
 *   pnpm staging:gateway -- --no-register
 *   pnpm staging:gateway -- --watch-only
 *   pnpm staging:gateway -- --timeout 300
 *
 * Covers steps 5 to 9 of the staging checklist: a real guild, a real gateway
 * connection, the readiness lifecycle, command registration, one real command,
 * and the database mutation it produces.
 *
 * It cannot click the command for you — automating a user account is against
 * Discord's terms and is explicitly out of scope for this project. So the
 * script sets everything up, tells you exactly what to type, and then watches
 * the database and proves what arrived.
 *
 * Staging credentials only. This connects to whatever DISCORD_GUILD_ID points
 * at and registers commands there.
 */
import { BloomError, type RoleId, type Snowflake } from '@bloom/shared-types';
import { loadEnvFile, loadPlatformConfig, resolveBotConfig } from '@bloom/config';
import { createLogger, PrettyLogSink } from '@bloom/logging';
import {
  createBotClient,
  BotRuntime,
  CommandRegistrar,
  DiscordGuildQueryService,
} from '@bloom/discord';
import { auditGuardianRolePlacement } from '@bloom/permissions';
import { createDatabase } from '@bloom/database';
import { guardianCommandSpecs } from '../../apps/guardian/src/commands.js';

const GREEN = '\u001b[32m';
const RED = '\u001b[31m';
const DIM = '\u001b[2m';
const RESET = '\u001b[0m';

let passed = 0;
let failed = 0;

function pass(message: string): void {
  process.stdout.write(`  ${GREEN}ok${RESET}    ${message}\n`);
  passed += 1;
}
function fail(message: string): void {
  process.stdout.write(`  ${RED}FAIL${RESET}  ${message}\n`);
  failed += 1;
}
function info(message: string): void {
  process.stdout.write(`        ${DIM}${message}${RESET}\n`);
}
function heading(message: string): void {
  process.stdout.write(`\n${message}\n`);
}

/** One assertion: pass with the first message, or fail with the second. */
function check(condition: boolean, whenTrue: string, whenFalse: string): void {
  if (condition) {
    pass(whenTrue);
  } else {
    fail(whenFalse);
  }
}

function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}
function value(name: string, fallback: number): number {
  const index = process.argv.indexOf(`--${name}`);
  if (index < 0) return fallback;
  const parsed = Number.parseInt(process.argv[index + 1] ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Permission bits Guardian needs, by name, so a missing one can be reported as
 * something an operator can act on rather than as an integer they have to
 * decode.
 */
const GUARDIAN_REQUIRED_BITS: readonly (readonly [string, bigint])[] = [
  ['View Channel', 1n << 10n],
  ['Send Messages', 1n << 11n],
  ['Embed Links', 1n << 14n],
  ['Read Message History', 1n << 16n],
  ['Manage Roles', 1n << 28n],
  ['Kick Members', 1n << 1n],
  ['Ban Members', 1n << 2n],
  ['Moderate Members', 1n << 40n],
  ['Manage Messages', 1n << 13n],
  ['Manage Channels', 1n << 4n],
  ['View Audit Log', 1n << 7n],
];

/** Bits Guardian must NOT hold. Over-permissioning is a finding, not a bonus. */
const GUARDIAN_FORBIDDEN_BITS: readonly (readonly [string, bigint])[] = [
  ['Administrator', 1n << 3n],
];

async function main(): Promise<void> {
  loadEnvFile();
  const platform = loadPlatformConfig(process.env);
  const config = resolveBotConfig('guardian', platform);

  const logger = createLogger({
    botName: 'guardian',
    environment: platform.runtime.environment,
    version: platform.runtime.version,
    level: 'warn',
    sink: new PrettyLogSink(),
  });

  process.stdout.write('\nBloom staging validation — live gateway\n');
  info(`guild ${platform.discord.guildId} · environment ${platform.runtime.environment}`);

  if (platform.runtime.environment === 'production') {
    process.stderr.write(
      '\nRefusing to run: BLOOM_ENVIRONMENT is "production". Staging credentials only.\n\n',
    );
    process.exit(2);
  }

  const database = createDatabase({
    ...platform.database,
    applicationName: 'bloom-staging-validation',
    logger,
  });
  const client = createBotClient('guardian');
  const runtime = new BotRuntime({
    bot: 'guardian',
    config: platform,
    logger,
    token: config.credentials.token,
    client,
    onShutdown: async () => {
      await database.close();
    },
  });

  // ── Step 6: gateway connection ───────────────────────────────────────────
  heading('Gateway connection');
  const startedAt = Date.now();
  try {
    await runtime.login();
    pass(`connected in ${String(Date.now() - startedAt)}ms`);
  } catch (error) {
    const bloom = BloomError.from(error);
    fail(`could not connect: ${bloom.operatorHint}`);
    process.stdout.write('\nNothing else can be validated without a connection.\n\n');
    await runtime.destroy();
    process.exit(1);
  }

  // ── Step 7: readiness lifecycle ──────────────────────────────────────────
  heading('Readiness lifecycle');
  const status = runtime.status();
  check(
    status.connected,
    'websocket reports connected',
    'websocket is not connected despite login resolving',
  );

  if (status.pingMs === null) {
    info('ping not yet measured (no heartbeat completed)');
  } else {
    pass(`heartbeat round trip ${String(status.pingMs)}ms`);
  }

  check(
    status.applicationId !== null,
    `application id ${status.applicationId ?? ''}`,
    'no application id — the client never became ready',
  );

  // ── Step 5: the guild is real and is the one configured ──────────────────
  heading('Guild');
  const guildId = platform.discord.guildId;
  const query = new DiscordGuildQueryService(client);

  let guildName: string | null = null;
  try {
    guildName = await query.getGuildName(guildId);
    pass(`guild reachable: ${guildName}`);
  } catch {
    fail(`guild ${guildId} is not reachable — is the bot invited to it?`);
  }

  // ── Permissions, as Discord actually reports them ────────────────────────
  heading('Permissions (as granted, not as requested)');
  try {
    const self = await query.getSelf(guildId);
    const held = self.permissions;

    const missing = GUARDIAN_REQUIRED_BITS.filter(([, bit]) => (held & bit) === 0n);
    check(
      missing.length === 0,
      'every required permission is granted',
      `missing: ${missing.map(([name]) => name).join(', ')}`,
    );

    const forbidden = GUARDIAN_FORBIDDEN_BITS.filter(([, bit]) => (held & bit) !== 0n);
    check(
      forbidden.length === 0,
      'no forbidden permission is granted',
      `holds ${forbidden.map(([name]) => name).join(', ')} — remove it`,
    );

    // Decision 002: Guardian may hold Manage Guild for AutoMod event delivery.
    const manageGuild = (held & (1n << 5n)) !== 0n;
    info(
      manageGuild
        ? 'Manage Guild is granted (approved for AutoMod event delivery only)'
        : 'Manage Guild is not granted — AutoMod events will not be delivered',
    );

    // ── Role hierarchy, live ───────────────────────────────────────────────
    heading('Role hierarchy');
    const roles = await query.getRoles(guildId);
    const advisories = auditGuardianRolePlacement(
      platform,
      {
        highestRolePosition: self.highestRolePosition,
        highestRoleName: self.highestRoleName,
        permissions: held,
      },
      roles,
    );

    const errors = advisories.filter((entry) => entry.severity === 'error');
    const warnings = advisories.filter((entry) => entry.severity !== 'error');

    if (errors.length === 0) {
      pass(`bot role "${self.highestRoleName}" is correctly placed`);
    } else {
      for (const entry of errors) {
        fail(entry.message);
      }
    }
    warnings.forEach((entry) => {
      info(entry.message);
    });

    // Every configured role id must actually exist in the guild.
    const missingRoles = Object.entries(platform.roles)
      .filter((entry): entry is [string, RoleId] => entry[1] !== null)
      .filter(([, id]) => !roles.has(id));
    check(
      missingRoles.length === 0,
      'every configured role id exists in the guild',
      `configured but not found: ${missingRoles.map(([key]) => key).join(', ')}`,
    );
  } catch (error) {
    fail(`could not read guild state: ${BloomError.from(error).operatorHint}`);
  }

  // ── Step 8: command registration ─────────────────────────────────────────
  if (!flag('no-register') && !flag('watch-only')) {
    heading('Command registration');
    try {
      const registrar = new CommandRegistrar({
        bot: 'guardian',
        token: config.credentials.token,
        clientId: config.credentials.clientId,
        guildId,
        logger,
      });

      const first = await registrar.apply(guardianCommandSpecs, 'guild');
      pass(`applied ${String(first.desired.length)} command(s) to the guild`);
      info(first.desired.map((entry) => `/${entry.name}`).join(' '));
      if (first.added.length > 0) info(`added: ${first.added.join(', ')}`);
      if (first.removed.length > 0) info(`removed: ${first.removed.join(', ')}`);

      // Registration is a bulk overwrite and the registrar diffs before it
      // writes, so a second run must report no change at all. That property is
      // what makes it safe to run on every deploy.
      const second = await registrar.apply(guardianCommandSpecs, 'guild');
      check(
        !second.changed && !second.applied,
        're-running changes nothing (diffed bulk overwrite)',
        'second registration reported changes — registration is not idempotent',
      );
    } catch (error) {
      fail(`registration failed: ${BloomError.from(error).operatorHint}`);
    }
  }

  // ── Steps 9 and 10: a real command, and the row it writes ────────────────
  if (!flag('no-watch')) {
    heading('Real command and its database mutation');

    const before = await database.sql<{ count: string }[]>`
      SELECT count(*)::text AS count FROM ${database.sql(platform.database.schema)}.audit_events
    `;
    const baseline = Number.parseInt(before[0]?.count ?? '0', 10);
    info(`audit_events currently holds ${String(baseline)} row(s)`);

    const seconds = value('timeout', 180);
    process.stdout.write(
      `\n  ${DIM}Now run a command in ${guildName ?? 'the guild'}.${RESET}\n` +
        `  ${DIM}"/guardian status" is read-only; "/verify" exercises the full spine.${RESET}\n` +
        `  ${DIM}Waiting up to ${String(seconds)}s…${RESET}\n\n`,
    );

    const deadline = Date.now() + seconds * 1000;
    let observed = false;

    while (Date.now() < deadline) {
      const rows = await database.sql<
        {
          action: string;
          actor_id: Snowflake | null;
          target_id: Snowflake | null;
          correlation_id: string | null;
          created_at: Date;
        }[]
      >`
        SELECT action, actor_id, target_id, correlation_id, created_at
        FROM ${database.sql(platform.database.schema)}.audit_events
        ORDER BY created_at DESC
        LIMIT 1
      `;

      const after = await database.sql<{ count: string }[]>`
        SELECT count(*)::text AS count FROM ${database.sql(platform.database.schema)}.audit_events
      `;
      const now = Number.parseInt(after[0]?.count ?? '0', 10);

      if (now > baseline && rows[0]) {
        observed = true;
        const row = rows[0];
        pass('a command produced an audit row');
        info(`action         ${row.action}`);
        info(`actor          ${row.actor_id ?? '(none)'}`);
        info(`target         ${row.target_id ?? '(none)'}`);
        info(`correlation id ${row.correlation_id ?? '(none)'}`);
        info(`at             ${row.created_at.toISOString()}`);

        check(
          row.correlation_id !== null,
          'the audit row carries a correlation id, so logs can be joined to it',
          'no correlation id on the audit row — traceability is broken',
        );

        // Command telemetry is written independently of the audit trail.
        const usage = await database.sql<
          { command: string; outcome: string; duration_ms: number | null }[]
        >`
          SELECT command, outcome, duration_ms
          FROM ${database.sql(platform.database.schema)}.command_usage
          ORDER BY created_at DESC LIMIT 1
        `;
        if (usage[0]) {
          pass(`command_usage recorded /${usage[0].command} → ${usage[0].outcome}`);
          info(`duration ${String(usage[0].duration_ms ?? 0)}ms`);
        } else {
          fail('no command_usage row — telemetry did not record the invocation');
        }
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    if (!observed) {
      fail(`no audit row appeared within ${String(seconds)}s`);
      info('Either no command was run, or the command did not reach the database.');
    }
  }

  heading(`${String(passed)} passed, ${String(failed)} failed`);
  process.stdout.write(
    failed === 0
      ? '\nLive validation passed. Update the Live Validation table in\n' +
          'docs/architecture/capability-matrix.md — and only those rows.\n\n'
      : '\nLive validation FAILED. Do not mark anything Live.\n\n',
  );

  await runtime.destroy();
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error: unknown) => {
  const bloom = BloomError.from(error);
  process.stderr.write(`\n${bloom.code}: ${bloom.operatorHint}\n\n`);
  process.exit(1);
});
