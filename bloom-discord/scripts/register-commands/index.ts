#!/usr/bin/env tsx
/**
 * Register application commands.
 *
 *   pnpm commands:register --bot guardian            # guild scope (default)
 *   pnpm commands:register --bot guardian --global   # global scope
 *   pnpm commands:register --bot all --dry-run       # show the diff, change nothing
 *
 * Guild vs global, and why the default is guild:
 *
 *   • **Guild** commands update immediately. That is what you want during
 *     development and for a single-server community, which Bloom Labs is.
 *   • **Global** commands are cached by Discord and can take up to an hour to
 *     propagate. They only make sense for a bot installed in many servers.
 *
 * Registration is always a bulk overwrite (`PUT`), so running this twice is
 * indistinguishable from running it once — no accumulating duplicates.
 */
import {
  BloomError,
  BOT_DISPLAY_NAMES,
  BOT_NAMES,
  type BotName,
} from '@bloom/shared-types';
import { createLogger, PrettyLogSink } from '@bloom/logging';
import { loadEnvFile, loadPlatformConfig, resolveBotConfig } from '@bloom/config';
import { CommandRegistrar, type RegistrationScope } from '@bloom/discord';
import type { CommandSpec } from '@bloom/commands';
import { guardianCommandSpecs } from '../../apps/guardian/src/commands.js';
import { companionCommandSpecs } from '../../apps/companion/src/commands.js';

/**
 * Command sets, per bot.
 *
 * Imported from the feature modules rather than restated here, so the specs
 * Discord is told about are literally the same objects the dispatcher routes.
 * A hand-maintained copy in this script is how a command gets registered that
 * nothing handles, which members experience as "this interaction failed".
 *
 * Labs is still empty. The registrar refuses an empty set unless `--allow-empty`
 * is passed, so running this for it reports the refusal rather than quietly
 * deleting every command the application has.
 */
const COMMAND_SETS: Readonly<Record<BotName, readonly CommandSpec[]>> = {
  guardian: guardianCommandSpecs,
  companion: companionCommandSpecs,
  labs: [],
};

interface Args {
  readonly bots: readonly BotName[];
  readonly scope: RegistrationScope;
  readonly dryRun: boolean;
  readonly allowEmpty: boolean;
  readonly force: boolean;
}

function parseArgs(argv: readonly string[]): Args {
  const botFlag = valueOf(argv, '--bot') ?? 'all';
  const bots =
    botFlag === 'all'
      ? BOT_NAMES
      : [botFlag].filter((name): name is BotName =>
          (BOT_NAMES as readonly string[]).includes(name),
        );

  if (bots.length === 0) {
    throw new Error(
      `Unknown bot "${botFlag}". Expected one of: ${BOT_NAMES.join(', ')}, or all.`,
    );
  }

  return {
    bots,
    scope: argv.includes('--global') ? 'global' : 'guild',
    dryRun: argv.includes('--dry-run'),
    allowEmpty: argv.includes('--allow-empty'),
    force: argv.includes('--force'),
  };
}

function valueOf(argv: readonly string[], flag: string): string | undefined {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : undefined;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  loadEnvFile();
  const platform = loadPlatformConfig(process.env);

  const logger = createLogger({
    botName: 'guardian',
    environment: platform.runtime.environment,
    version: platform.runtime.version,
    level: 'info',
    sink: new PrettyLogSink(),
  });

  /*
   * Global registration in production is a decision, not a default. It takes up
   * to an hour to propagate and applies to every server the app is in, so it
   * gets an explicit confirmation step.
   */
  if (
    args.scope === 'global' &&
    platform.runtime.environment === 'production' &&
    !args.force
  ) {
    process.stderr.write(
      '\nRefusing to register global commands in production without --force.\n' +
        'Global commands propagate for up to an hour and apply to every server this application is installed in.\n' +
        'For a single-community deployment, guild scope is almost always what you want.\n\n',
    );
    process.exit(1);
  }

  let failures = 0;

  for (const bot of args.bots) {
    const specs = COMMAND_SETS[bot];
    process.stdout.write(
      `\n${BOT_DISPLAY_NAMES[bot]} — ${String(specs.length)} command(s)\n`,
    );

    try {
      const config = resolveBotConfig(bot, platform);
      const registrar = new CommandRegistrar({
        bot,
        token: config.credentials.token,
        clientId: config.credentials.clientId,
        guildId: platform.discord.guildId,
        logger,
      });

      if (args.dryRun) {
        const plan = await registrar.plan(specs, args.scope);
        printPlan(plan);
        continue;
      }

      const result = await registrar.apply(specs, args.scope, {
        allowEmpty: args.allowEmpty,
        force: args.force,
      });
      printPlan(result);
      process.stdout.write(result.applied ? '  applied\n' : '  no change\n');
    } catch (error) {
      failures += 1;
      const bloom = BloomError.from(error);
      process.stderr.write(`  ${bloom.code}: ${bloom.operatorHint}\n`);
    }
  }

  process.exit(failures > 0 ? 1 : 0);
}

function printPlan(plan: {
  scope: string;
  existingCount: number;
  added: readonly string[];
  removed: readonly string[];
  modified: readonly string[];
}): void {
  process.stdout.write(
    `  scope: ${plan.scope}, currently registered: ${String(plan.existingCount)}\n`,
  );
  if (plan.added.length > 0) process.stdout.write(`  + ${plan.added.join(', ')}\n`);
  if (plan.removed.length > 0) process.stdout.write(`  - ${plan.removed.join(', ')}\n`);
  if (plan.modified.length > 0) process.stdout.write(`  ~ ${plan.modified.join(', ')}\n`);
}

await main();
