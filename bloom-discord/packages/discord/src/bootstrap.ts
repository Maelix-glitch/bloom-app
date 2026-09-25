import type { Server } from 'node:http';
import {
  BloomError,
  bloomError,
  BOT_DISPLAY_NAMES,
  type BotName,
  type JsonObject,
} from '@bloom/shared-types';
import { createLogger, JsonLogSink, PrettyLogSink, type Logger } from '@bloom/logging';
import {
  loadEnvFile,
  loadPlatformConfig,
  resolveBotConfig,
  summariseConfig,
  type BotConfig,
  type PlatformConfig,
} from '@bloom/config';
import {
  createDatabase,
  createRepositories,
  type Database,
  type Repositories,
} from '@bloom/database';
import { newCorrelationId, withCorrelation } from '@bloom/utils';
import { hasCapability } from '@bloom/shared-types';
import { Scheduler } from '@bloom/events';
import { createBotClient } from './client.js';
import { DatabaseJobLock } from './scheduler-lock.js';
import { DatabaseJobGate, JobSettingsService } from './jobs/settings.js';
import { DiscordGuildQueryService } from './services/guild-query.js';
import { DiscordMessagingService } from './services/messaging.js';
import { DiscordRoleService } from './services/role-service.js';
import { DiscordModerationService } from './services/moderation-service.js';
import { DiscordChannelModerationService } from './services/channel-moderation-service.js';
import type {
  ChannelModerationService,
  GuildQueryService,
  MessagingService,
  ModerationService,
  RoleService,
} from './ports.js';
import {
  BotRuntime,
  type ComponentRouter,
  type GatewayEventRouter,
  type InteractionRouter,
} from './runtime.js';
import {
  HealthReporter,
  databaseCheck,
  gatewayCheck,
  startHealthServer,
  type HealthCheck,
} from './health.js';
import { Heartbeat, readPeers } from './heartbeat.js';

/**
 * The shared bot process.
 *
 * All three applications boot identically — the differences are which commands
 * and event handlers they register, and that difference is passed in. Without
 * this, the same forty lines of startup would exist three times and drift
 * apart, which is the duplication the brief specifically prohibits.
 *
 * Startup order is deliberate and each step gates the next:
 *
 *   1. Load and validate configuration. Fail before anything connects.
 *   2. Build the logger, so every later failure is structured and correlated.
 *   3. Connect and ping the database. A bot that cannot record an audit event
 *      must not take moderation actions.
 *   4. Install signal handlers *before* connecting to Discord, so a container
 *      stopped mid-startup still shuts down cleanly.
 *   5. Connect to the gateway.
 *   6. Serve /health only once the above is true, so readiness means something.
 */
export interface BotProcessOptions<TDeps> {
  readonly bot: BotName;

  /**
   * Build the feature dependencies.
   *
   * Runs after the database is proven reachable and after the Discord services
   * exist, so anything it constructs can fail fast at boot rather than on the
   * first interaction that needs it.
   */
  readonly createDeps: (context: BotBootstrapContext) => TDeps;

  /**
   * Everything the bot can do, built from the dependencies.
   *
   * Returning empty for both is what makes a bot refuse to start — see the
   * check below.
   */
  readonly createFeatures: (deps: TDeps, context: BotBootstrapContext) => BotFeatures;

  readonly onReady?: (context: BotBootstrapContext, deps: TDeps) => Promise<void>;
  readonly healthChecks?: (
    context: BotBootstrapContext,
    deps: TDeps,
  ) => readonly HealthCheck[];
}

export interface BotFeatures {
  readonly commands?: InteractionRouter;
  /** Buttons, select menus and modal submissions. */
  readonly interactions?: ComponentRouter;
  readonly events?: GatewayEventRouter;
  /** Used only for the "is this bot worth starting" check and for logging. */
  readonly commandCount?: number;
  /** Registered component and modal handlers, for the same check. */
  readonly interactionCount?: number;
}

/**
 * The Discord services available to every feature.
 *
 * The privileged ones are `null` for bots whose capability manifest does not
 * include them — in practice everything but Guardian. `null` rather than a
 * throwing stub, so wiring a role write or a ban into Companion is a type error
 * at the call site instead of a runtime surprise.
 */
export interface DiscordServices {
  readonly guilds: GuildQueryService;
  readonly messaging: MessagingService;
  readonly roles: RoleService | null;
  /** Timeout, kick, ban. Requires `moderation:execute`. */
  readonly moderation: ModerationService | null;
  /** Slowmode, locking, purges. Requires `message:manage`. */
  readonly channelModeration: ChannelModerationService | null;
}

export interface BotBootstrapContext {
  readonly bot: BotName;
  readonly config: BotConfig;
  readonly platform: PlatformConfig;
  readonly logger: Logger;
  readonly database: Database;
  readonly repositories: Repositories;
  readonly discord: DiscordServices;
  /**
   * The one scheduler in this process.
   *
   * Handed to features to register into, rather than each feature owning a
   * timer. The brief forbids scattered `setInterval`, and the reason is not
   * tidiness: a job outside this object has no lease, so two replicas both run
   * it; no `job_runs` row, so nobody can tell whether it fired; and no off
   * switch. Registering here buys all three.
   *
   * Constructed before the features so that dependency containers can hold it
   * — `/guardian jobs` needs to ask it what is scheduled — but not started
   * until after the gateway is up.
   */
  readonly scheduler: Scheduler;
  /**
   * The per-guild off switch behind the scheduler's gate.
   *
   * Exposed so a bot's `jobs` commands can read and write the same setting the
   * gate consults — one source of truth, rather than a command that reports a
   * switch position the scheduler does not act on.
   */
  readonly jobSettings: JobSettingsService;
}

export interface RunningBotProcess {
  readonly context: BotBootstrapContext;
  readonly runtime: BotRuntime;
  shutdown(reason: string): Promise<void>;
}

export async function startBotProcess<TDeps>(
  options: BotProcessOptions<TDeps>,
): Promise<RunningBotProcess> {
  // 1. Configuration. `.env` is a development convenience; in production the
  //    orchestrator supplies real environment variables and the file is absent.
  loadEnvFile();
  const platform = loadPlatformConfig(process.env);
  const config = resolveBotConfig(options.bot, platform);

  // 2. Logging.
  const logger = createLogger({
    botName: options.bot,
    environment: platform.runtime.environment,
    version: platform.runtime.version,
    level: platform.logging.level,
    sink: platform.logging.pretty ? new PrettyLogSink() : new JsonLogSink(),
  });

  return await withCorrelation(async () => {
    logger.info(
      'startup.config_loaded',
      `${BOT_DISPLAY_NAMES[options.bot]} configuration validated.`,
      // Structured, and safe: summariseConfig reports presence and shape only,
      // never a token or a connection string.
      { context: JSON.parse(JSON.stringify(summariseConfig(platform))) as JsonObject },
    );

    // 3. Database. Proven, not assumed — a ping, not a constructed client.
    const database = createDatabase({
      ...platform.database,
      applicationName: `bloom-${options.bot}`,
      logger,
    });

    const ping = await database.ping();
    if (!ping.ok) {
      await database.close();
      throw (
        ping.error ??
        bloomError('DATABASE_UNAVAILABLE', {
          operatorHint: 'The database did not respond to a startup ping.',
        })
      );
    }
    logger.info(
      'startup.database_ready',
      `Database reachable in ${String(ping.latencyMs)}ms.`,
    );

    const repositories = createRepositories(database);

    /*
     * 4. The Discord client, and the services built on it.
     *
     * The client is created here rather than inside the runtime because the
     * feature dependencies need it, and the runtime needs the features. Nothing
     * connects yet — a discord.js client is inert until `login()`.
     */
    const client = createBotClient(options.bot);
    const guilds = new DiscordGuildQueryService(client);
    const messaging = new DiscordMessagingService(client, logger);
    const roles = hasCapability(options.bot, 'role:write')
      ? new DiscordRoleService(client, guilds, platform, logger, options.bot)
      : null;
    const moderation = hasCapability(options.bot, 'moderation:execute')
      ? new DiscordModerationService(client, logger, options.bot)
      : null;
    const channelModeration = hasCapability(options.bot, 'message:manage')
      ? new DiscordChannelModerationService(client, logger, options.bot)
      : null;

    /*
     * The scheduler, empty until features register into it.
     *
     * `globallyDisabled` mirrors FEATURE_SCHEDULED_MESSAGES. Jobs still
     * register when it is off, so `/guardian jobs list` can show what exists
     * and report it as disabled — an empty list would look like a deployment
     * problem rather than a deliberate switch.
     */
    const jobSettings = new JobSettingsService(repositories.settings, options.bot);

    const scheduler = new Scheduler({
      bot: options.bot,
      logger,
      timezone: platform.runtime.timezone,
      lock: new DatabaseJobLock(repositories.jobs),
      // Consulted on every tick, so an administrator's `jobs disable` takes
      // effect at the next run rather than at the next deployment.
      gate: new DatabaseJobGate(jobSettings, platform.discord.guildId),
      ...(platform.features.scheduledMessages ? {} : { globallyDisabled: true }),
    });

    const context: BotBootstrapContext = {
      bot: options.bot,
      config,
      platform,
      logger,
      database,
      repositories,
      discord: { guilds, messaging, roles, moderation, channelModeration },
      scheduler,
      jobSettings,
    };

    const deps = options.createDeps(context);
    const features = options.createFeatures(deps, context);

    /*
     * Refuse to run an empty bot.
     *
     * A process that connects to Discord, shows as online and responds to
     * nothing is the exact "fake functionality" the brief forbids — it looks
     * healthy to everyone watching. A bot with no commands and no event
     * handlers stops here, loudly, with the reason.
     */
    const commandCount = features.commandCount ?? (features.commands ? 1 : 0);
    const handlerCount = features.events?.registeredEvents().length ?? 0;
    const jobCount = scheduler.status().length;
    /*
     * Deliberately not part of the emptiness check. A bot with only component
     * handlers has no way for anyone to produce a component in the first
     * place, so it is still a bot that does nothing.
     */
    const interactionCount = features.interactionCount ?? 0;
    if (commandCount === 0 && handlerCount === 0 && jobCount === 0) {
      await database.close();
      throw bloomError('NOT_IMPLEMENTED', {
        operatorHint:
          `${BOT_DISPLAY_NAMES[options.bot]} has no commands and no event handlers registered, so it would appear online while doing nothing. ` +
          `That is a worse failure than not starting, because it looks like success. This is expected at Phase 0: the shared infrastructure is complete and verified, ` +
          `and features arrive with the phase that owns them. Run \`pnpm db:status\` and \`pnpm diagnostics\` to confirm the platform is correctly configured in the meantime.`,
        details: { bot: options.bot, phase: 0 },
      });
    }

    logger.info(
      'startup.features_ready',
      `${String(commandCount)} command(s), ${String(interactionCount)} component handler(s), ` +
        `${String(handlerCount)} gateway event(s), ${String(jobCount)} scheduled job(s).`,
      {
        context: {
          command_count: commandCount,
          interaction_count: interactionCount,
          job_count: jobCount,
          events: [...(features.events?.registeredEvents() ?? [])],
        },
      },
    );

    if (jobCount > 0 && !platform.features.scheduledMessages) {
      logger.warn(
        'scheduler.globally_disabled',
        `FEATURE_SCHEDULED_MESSAGES is off, so all ${String(jobCount)} registered job(s) will stay idle.`,
      );
    }

    // 5. Signals first, so a stop during startup is still clean.
    let healthServer: Server | null = null;
    /*
     * Each process states that it is alive, every 30 seconds, in its own row.
     *
     * Not a scheduled job: a lease would mean one process writing all three
     * rows, i.e. one bot asserting the other two are up. See heartbeat.ts.
     */
    const heartbeat = new Heartbeat({
      bot: options.bot,
      version: platform.runtime.version,
      environment: platform.runtime.environment,
      telemetry: repositories.telemetry,
      logger,
      gatewayStatus: () => runtime.status(),
      databaseOk: async () => (await database.ping()).ok,
    });
    const runtime = new BotRuntime({
      bot: options.bot,
      config: platform,
      logger,
      token: config.credentials.token,
      client,
      ...(features.commands ? { commands: features.commands } : {}),
      ...(features.interactions ? { interactions: features.interactions } : {}),
      ...(features.events ? { events: features.events } : {}),
      ...(options.onReady ? { onReady: () => onReadyHook(options, context, deps) } : {}),
      onShutdown: async () => {
        heartbeat.stop();
        healthServer?.close();
        // Before the database closes: stopping waits for in-flight runs to
        // finish releasing their leases, and releasing a lease is a write.
        await scheduler.stop();
        await database.close();
      },
    });

    const shutdown = async (reason: string): Promise<void> => {
      logger.info('shutdown.signal', `Shutting down: ${reason}.`);
      await runtime.destroy();
    };

    installSignalHandlers(shutdown, logger);

    /*
     * 6. Health, before the gateway.
     *
     * This used to start last, after login, on the reasoning that readiness
     * should mean the bot is genuinely usable. That reasoning was right about
     * `/ready` and wrong about the server: a bot that cannot reach Discord
     * served no endpoint at all, so the one moment an operator most needs to
     * ask "what is wrong" was the one moment nothing answered. Connection
     * refused is not a diagnosis.
     *
     * Starting here changes no status semantics. The gateway check reports
     * `down` until the connection is up, so `/ready` still returns 503 until
     * the bot is genuinely usable — it just says so out loud instead of
     * refusing the connection.
     */
    const healthPort = Number.parseInt(process.env['HEALTH_PORT'] ?? '0', 10);
    if (healthPort > 0) {
      healthServer = startHealthServer({
        port: healthPort,
        logger,
        /*
         * The other two bots, as observations.
         *
         * Deliberately outside `checks`: a peer being down must never make
         * this process report itself unhealthy. They are separate containers
         * with separate failure modes, and one crashed bot taking the other
         * two out of a load balancer is an outage manufactured by monitoring.
         */
        peers: () => readPeers(repositories.telemetry, options.bot),
        reporter: new HealthReporter({
          bot: options.bot,
          version: platform.runtime.version,
          environment: platform.runtime.environment,
          checks: [
            gatewayCheck(() => runtime.status()),
            databaseCheck(async () => {
              const result = await database.ping();
              if (!result.ok) {
                throw result.error ?? new Error('Database ping failed.');
              }
              return result.latencyMs;
            }),
            ...(options.healthChecks?.(context, deps) ?? []),
          ],
        }),
      });
    }

    /*
     * 7. Heartbeat, also before the gateway.
     *
     * Same reasoning as the health server. A process that is running but
     * cannot reach Discord should say so in `system_health` — a row reading
     * "alive, gateway down" is the single most useful thing another bot's
     * `/health` can show during an incident, and it is exactly what starting
     * this after login would throw away. Absent and disconnected are different
     * problems with different fixes.
     */
    heartbeat.start();

    // 8. Gateway.
    await runtime.login();

    /*
     * 9. Jobs, once the gateway is actually usable.
     *
     * After login, because a job that posts a message would otherwise fire
     * against a client that has not connected, and "failed because it started
     * too early" is a confusing thing to find in `job_runs`.
     */
    scheduler.start();

    return { context, runtime, shutdown };
  }, newCorrelationId());
}

/** Narrowing helper: `onReady` is only wired when it exists. */
async function onReadyHook<TDeps>(
  options: BotProcessOptions<TDeps>,
  context: BotBootstrapContext,
  deps: TDeps,
): Promise<void> {
  await options.onReady?.(context, deps);
}

/**
 * Signal handling.
 *
 * SIGTERM is what an orchestrator sends first; it is the graceful window before
 * SIGKILL. Handling both signals through one idempotent path means a second
 * Ctrl-C does not start a second shutdown.
 *
 * Unhandled rejections and uncaught exceptions are logged and then allowed to
 * kill the process. Swallowing them leaves a bot running with unknown internal
 * state, which is worse than a restart.
 */
function installSignalHandlers(
  shutdown: (reason: string) => Promise<void>,
  logger: Logger,
): void {
  let stopping = false;

  const handle = (reason: string): void => {
    if (stopping) return;
    stopping = true;
    void shutdown(reason)
      .then(() => {
        process.exit(0);
      })
      .catch((error: unknown) => {
        logger.error('shutdown.failed', 'Shutdown did not complete cleanly.', { error });
        process.exit(1);
      });
  };

  process.on('SIGTERM', () => {
    handle('SIGTERM');
  });
  process.on('SIGINT', () => {
    handle('SIGINT');
  });

  process.on('unhandledRejection', (reason) => {
    logger.fatal('process.unhandled_rejection', 'Unhandled promise rejection; exiting.', {
      error: reason,
    });
    process.exit(1);
  });

  process.on('uncaughtException', (error) => {
    logger.fatal('process.uncaught_exception', 'Uncaught exception; exiting.', { error });
    process.exit(1);
  });
}

/**
 * Entry-point wrapper.
 *
 * Turns any startup failure into one readable operator message and a non-zero
 * exit. A stack trace as the first thing in a container log tells an operator
 * nothing they can act on; the hint does.
 */
export async function runBotMain(start: () => Promise<unknown>): Promise<never> {
  try {
    await start();
    // A successfully started bot never returns — it lives until a signal.
    return await new Promise<never>(() => {
      /* held open by the gateway connection */
    });
  } catch (error) {
    const bloom = BloomError.from(error);
    process.stderr.write(`\n${bloom.code}: ${bloom.operatorHint}\n\n`);
    process.exit(1);
  }
}
