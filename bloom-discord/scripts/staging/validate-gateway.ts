#!/usr/bin/env tsx

/**
 * Live staging validation — the half that needs a real Discord connection.
 *
 * This validator deliberately boots Guardian through the same production
 * bootstrap path:
 *
 *   startBotProcess()
 *     -> createGuardianDeps()
 *     -> createGuardianFeatures()
 *     -> BotRuntime
 *
 * The staging validator is intentionally tolerant of optional production-only
 * roles. The staging guild only needs the roles that are actually required for
 * the current Guardian test environment.
 *
 * Usage:
 *
 *   pnpm staging:gateway
 *   pnpm staging:gateway -- --no-register
 *   pnpm staging:gateway -- --watch-only
 *   pnpm staging:gateway -- --timeout 300
 *
 * Staging credentials only.
 */

import { BloomError, type Snowflake } from '@bloom/shared-types';

import { CommandRegistrar } from '@bloom/discord';

import { loadEnvFile, loadPlatformConfig, resolveBotConfig } from '@bloom/config';

import { createLogger, PrettyLogSink } from '@bloom/logging';

import { auditGuardianRolePlacement } from '@bloom/permissions';

import {
  createGuardianDeps,
  createGuardianFeatures,
} from '../../apps/guardian/src/bootstrap.js';

import { startBotProcess } from '@bloom/discord';

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

  if (index < 0) {
    return fallback;
  }

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

/**
 * Roles that are genuinely required by the current staging environment.
 *
 * Production has additional role configuration, but staging does not need
 * Founder / Administrator / Moderator / Beta Tester roles just to validate
 * Guardian's gateway, commands, onboarding, moderation, and telemetry path.
 */
const REQUIRED_STAGING_ROLE_KEYS = new Set(['bloomBot', 'earlyBloom', 'bloomMember']);

async function main(): Promise<void> {
  /*
   * Load the same environment/configuration that production uses.
   *
   * startBotProcess() also performs this internally. We load it here only so
   * the validator can perform its own registration and database checks using
   * the same resolved configuration.
   */
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
      '\nRefusing to run: BLOOM_ENVIRONMENT is "production". ' +
        'Staging credentials only.\n\n',
    );

    process.exit(2);
  }

  /*
   * --------------------------------------------------------------------------
   * Boot the REAL Guardian
   * --------------------------------------------------------------------------
   *
   * We do NOT create BotRuntime manually.
   *
   * startBotProcess() creates:
   *
   *   database
   *   repositories
   *   Discord services
   *   scheduler
   *   Guardian deps
   *   Guardian command dispatcher
   *   Guardian event dispatcher
   *   BotRuntime
   *
   * and passes commands/events into BotRuntime.
   */
  let processHandle: Awaited<ReturnType<typeof startBotProcess>> | null = null;

  try {
    processHandle = await startBotProcess({
      bot: 'guardian',
      createDeps: createGuardianDeps,
      createFeatures: createGuardianFeatures,
    });
  } catch (error) {
    const bloom = BloomError.from(error);

    fail(`could not start Guardian: ${bloom.operatorHint}`);

    process.stdout.write(
      '\nNothing else can be validated without a running Guardian process.\n\n',
    );

    process.exit(1);
  }

  const { context, runtime } = processHandle;

  const { database, discord } = context;

  const { guilds: query } = discord;

  const guildId = platform.discord.guildId;

  /*
   * Make sure cleanup happens even if a later validation step throws.
   */
  try {
    // ── Gateway connection ─────────────────────────────────────────────────

    heading('Gateway connection');

    /*
     * startBotProcess() has already called login().
     *
     * Give discord.js a short window to finish the READY lifecycle before
     * checking status. This avoids a false-negative where login() resolved
     * before the READY/heartbeat state propagated.
     */
    const readinessDeadline = Date.now() + 15_000;

    while (Date.now() < readinessDeadline && !runtime.status().connected) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    const gatewayStatus = runtime.status();

    check(
      gatewayStatus.connected,
      'websocket reports connected',
      'websocket is not connected after the READY grace period',
    );

    if (gatewayStatus.pingMs === null) {
      info('ping not yet measured (no heartbeat completed)');
    } else {
      pass(`heartbeat round trip ${String(gatewayStatus.pingMs)}ms`);
    }

    check(
      gatewayStatus.applicationId !== null,
      `application id ${gatewayStatus.applicationId ?? ''}`,
      'no application id — the client never became ready',
    );

    /*
     * Runtime wiring verification.
     *
     * This catches the original bug where REST registration succeeded but
     * InteractionCreate was not connected to the command dispatcher.
     */
    check(
      runtime.status().connected,
      'Guardian runtime is live with production feature wiring',
      'Guardian runtime is not live',
    );

    // ── Guild ───────────────────────────────────────────────────────────────

    heading('Guild');

    let guildName: string | null = null;

    try {
      guildName = await query.getGuildName(guildId);

      pass(`guild reachable: ${guildName}`);
    } catch {
      fail(`guild ${guildId} is not reachable — is the bot invited to it?`);
    }

    // ── Permissions ─────────────────────────────────────────────────────────

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

      // Manage Guild is optional for the current staging command path.
      const manageGuild = (held & (1n << 5n)) !== 0n;

      info(
        manageGuild
          ? 'Manage Guild is granted (approved for AutoMod event delivery only)'
          : 'Manage Guild is not granted — AutoMod events will not be delivered',
      );

      // ── Role hierarchy ────────────────────────────────────────────────────

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

      /*
       * Only validate roles that are actually required in staging.
       *
       * The production configuration may contain Founder, Administrator,
       * Moderator and Beta Tester role IDs. Those roles are intentionally
       * absent from the staging guild and are therefore not failures here.
       */
      const requiredRoleEntries = Object.entries(platform.roles).filter(
        ([key, id]) => REQUIRED_STAGING_ROLE_KEYS.has(key) && id !== null,
      );

      const missingRequiredRoles = requiredRoleEntries.filter(
        ([, id]) => id !== null && !roles.has(id),
      );

      check(
        missingRequiredRoles.length === 0,
        'required staging roles exist in the guild',
        `required staging roles not found: ${missingRequiredRoles
          .map(([key]) => key)
          .join(', ')}`,
      );

      const ignoredOptionalRoles = Object.entries(platform.roles)
        .filter(
          ([key, id]) =>
            id !== null && !REQUIRED_STAGING_ROLE_KEYS.has(key) && !roles.has(id),
        )
        .map(([key]) => key);

      if (ignoredOptionalRoles.length > 0) {
        info(
          `ignored optional production roles in staging: ${ignoredOptionalRoles.join(', ')}`,
        );
      }
    } catch (error) {
      fail(`could not read guild state: ${BloomError.from(error).operatorHint}`);
    }

    // ── Command registration ────────────────────────────────────────────────

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

        /*
         * Keep the validator's registration source identical to the
         * production Guardian command source.
         */
        const { guardianCommandSpecs } =
          await import('../../apps/guardian/src/commands.js');

        const first = await registrar.apply(guardianCommandSpecs, 'guild');

        /*
         * "apply" may legitimately be a no-op if Discord already has the
         * exact desired command set. The important invariant is that the
         * resulting command set matches the desired set.
         */
        pass(
          `${first.applied ? 'applied' : 'verified'} ${String(
            first.desired.length,
          )} command(s) to the guild`,
        );

        info(first.desired.map((entry) => `/${entry.name}`).join(' '));

        if (first.added.length > 0) {
          info(`added: ${first.added.join(', ')}`);
        }

        if (first.removed.length > 0) {
          info(`removed: ${first.removed.join(', ')}`);
        }

        if (first.modified.length > 0) {
          info(`modified: ${first.modified.join(', ')}`);
        }

        /*
         * Re-plan immediately after the first operation.
         *
         * We deliberately inspect the plan rather than relying on Discord
         * command IDs. Discord may return server-normalized fields, while the
         * registrar's fingerprint is the source of truth for fields Guardian
         * controls.
         */
        const second = await registrar.plan(guardianCommandSpecs, 'guild');

        if (!second.changed) {
          pass('re-running the registration plan changes nothing (idempotent)');
        } else {
          fail(
            [
              'registration plan still reports changes after synchronization:',
              `added: ${second.added.length > 0 ? second.added.join(', ') : '(none)'}`,
              `removed: ${
                second.removed.length > 0 ? second.removed.join(', ') : '(none)'
              }`,
              `modified: ${
                second.modified.length > 0 ? second.modified.join(', ') : '(none)'
              }`,
            ].join('\n'),
          );
        }
      } catch (error) {
        fail(`registration failed: ${BloomError.from(error).operatorHint}`);
      }
    }

    // ── Real command + telemetry ─────────────────────────────────────────────

    if (!flag('no-watch')) {
      heading('Real command and database telemetry');

      /*
       * We intentionally do NOT require an audit_events mutation here.
       *
       * /verify is idempotent. Once the staging user is already verified,
       * running /verify again correctly produces no new onboarding mutation.
       *
       * /guardian status is read-only and therefore also does not need to
       * create an audit event.
       *
       * command_usage is the reliable cross-command proof that the gateway
       * interaction reached the production command dispatcher and completed.
       */

      const beforeUsage = await database.sql<
        {
          command: string;
          outcome: string;
          correlation_id: string | null;
          created_at: Date;
        }[]
      >`
        SELECT
          command,
          outcome,
          correlation_id,
          created_at
        FROM ${database.sql(platform.database.schema)}.command_usage
        ORDER BY created_at DESC
        LIMIT 1
      `;

      const baselineUsageCreatedAt = beforeUsage[0]?.created_at.getTime() ?? 0;

      const baselineUsageCorrelation = beforeUsage[0]?.correlation_id ?? null;

      const auditBefore = await database.sql<{ count: string }[]>`
        SELECT count(*)::text AS count
        FROM ${database.sql(platform.database.schema)}.audit_events
      `;

      const auditBaseline = Number.parseInt(auditBefore[0]?.count ?? '0', 10);

      info(
        `command_usage latest: ${
          beforeUsage[0]
            ? `/${beforeUsage[0].command} → ${beforeUsage[0].outcome}`
            : '(none)'
        }`,
      );

      info(`audit_events currently holds ${String(auditBaseline)} row(s)`);

      const seconds = value('timeout', 180);

      process.stdout.write(
        `\n  ${DIM}Now run a command in ${guildName ?? 'the guild'}.${RESET}\n` +
          `  ${DIM}Use "/guardian status" to test the complete interaction → dispatcher → telemetry path.${RESET}\n` +
          `  ${DIM}"/verify" also works, but an already-verified user may correctly create no new audit mutation.${RESET}\n` +
          `  ${DIM}Waiting up to ${String(seconds)}s…${RESET}\n\n`,
      );

      const deadline = Date.now() + seconds * 1000;

      let usageObserved = false;
      let auditObserved = false;

      while (Date.now() < deadline) {
        /*
         * ── Command telemetry ───────────────────────────────────────────────
         */
        const usage = await database.sql<
          {
            command: string;
            outcome: string;
            correlation_id: string | null;
            duration_ms: number | null;
            created_at: Date;
          }[]
        >`
          SELECT
            command,
            outcome,
            correlation_id,
            duration_ms,
            created_at
          FROM ${database.sql(platform.database.schema)}.command_usage
          WHERE created_at > to_timestamp(${baselineUsageCreatedAt / 1000})
          ORDER BY created_at DESC
          LIMIT 10
        `;

        const newUsage = usage.find(
          (row) =>
            row.created_at.getTime() > baselineUsageCreatedAt &&
            row.correlation_id !== baselineUsageCorrelation,
        );

        if (newUsage) {
          usageObserved = true;

          pass(`command_usage recorded /${newUsage.command} → ${newUsage.outcome}`);

          info(`duration       ${String(newUsage.duration_ms ?? 0)}ms`);

          info(`correlation id  ${newUsage.correlation_id ?? '(none)'}`);

          check(
            newUsage.outcome === 'success' || newUsage.outcome === 'completed',
            'command completed successfully',
            `command outcome was "${newUsage.outcome}"`,
          );

          check(
            newUsage.correlation_id !== null,
            'command telemetry carries a correlation id',
            'command telemetry has no correlation id',
          );
        }

        /*
         * ── Audit trail ─────────────────────────────────────────────────────
         *
         * Audit events are optional for this particular read-only validation,
         * but if a command produces one we validate it as well.
         */
        const auditAfter = await database.sql<{ count: string }[]>`
          SELECT count(*)::text AS count
          FROM ${database.sql(platform.database.schema)}.audit_events
        `;

        const auditNow = Number.parseInt(auditAfter[0]?.count ?? '0', 10);

        if (auditNow > auditBaseline) {
          const rows = await database.sql<
            {
              event: string;
              actor_id: Snowflake | null;
              target_id: Snowflake | null;
              correlation_id: string | null;
              created_at: Date;
            }[]
          >`
            SELECT
              event,
              actor_id,
              target_id,
              correlation_id,
              created_at
            FROM ${database.sql(platform.database.schema)}.audit_events
            ORDER BY created_at DESC
            LIMIT 1
          `;

          const row = rows[0];

          if (row) {
            auditObserved = true;

            pass('a command produced an audit row');

            info(`event           ${row.event}`);
            info(`actor           ${row.actor_id ?? '(none)'}`);
            info(`target          ${row.target_id ?? '(none)'}`);

            info(`correlation id  ${row.correlation_id ?? '(none)'}`);

            info(`at              ${row.created_at.toISOString()}`);

            check(
              row.correlation_id !== null,
              'the audit row carries a correlation id',
              'no correlation id on the audit row — traceability is broken',
            );
          }
        }

        if (usageObserved) {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      if (!usageObserved) {
        fail(`no new command_usage row appeared within ${String(seconds)}s`);

        info(
          'Run "/guardian status" in the staging guild while this validator is waiting.',
        );

        info(
          'If the command responds in Discord but no row appears here, inspect command telemetry/database writes next.',
        );
      } else if (!auditObserved) {
        info('No new audit row was required for this read-only/idempotent command test.');
      }
    }

    heading(`${String(passed)} passed, ${String(failed)} failed`);

    process.stdout.write(
      failed === 0
        ? '\nLive validation passed. Update the Live Validation table in\n' +
            'docs/architecture/capability-matrix.md — and only those rows.\n\n'
        : '\nLive validation FAILED. Do not mark anything Live.\n\n',
    );
  } finally {
    /*
     * startBotProcess owns the complete process lifecycle, so shut it down
     * through its public shutdown method instead of manually destroying only
     * the Discord client or database.
     */
    await processHandle.shutdown('staging-validation-complete');
  }

  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error: unknown) => {
  const bloom = BloomError.from(error);

  process.stderr.write(`\n${bloom.code}: ${bloom.operatorHint}\n\n`);

  process.exit(1);
});
