import { Events, Status, type Client, type Interaction } from 'discord.js';
import {
  BloomError,
  bloomError,
  BOT_DISPLAY_NAMES,
  unsafeSnowflake,
  type BotName,
  type GuildId,
} from '@bloom/shared-types';
import type { Logger } from '@bloom/logging';
import type { PlatformConfig } from '@bloom/config';
import { newCorrelationId, withCorrelation } from '@bloom/utils';
import type {
  CommandInvocation,
  ComponentInvocation,
  ModalInvocation,
} from '@bloom/commands';
import type { GatewayEventName } from '@bloom/events';
import {
  toCommandInvocation,
  toComponentInvocation,
  toModalInvocation,
} from './adapters/interaction.js';
import {
  toMemberJoinPayload,
  toMemberLeavePayload,
  toMemberUpdatePayload,
} from './adapters/member.js';
import { privilegedIntentsFor } from './intents.js';
import type { GatewayClient, GatewayStatus } from './ports.js';

/**
 * What the runtime needs from the command layer.
 *
 * Structural, not `CommandDispatcher<TDeps>`: the runtime does not care what a
 * bot's dependencies look like, and threading that generic through the process
 * lifecycle would infect every signature between here and main.ts.
 */
export interface InteractionRouter {
  dispatch(invocation: CommandInvocation): Promise<void>;
}

/**
 * What the runtime needs to route buttons, select menus and modal submissions.
 *
 * Separate from `InteractionRouter` and optional, because a bot can perfectly
 * well have commands and no components — Guardian and Companion did for six
 * phases — and an empty router would be a thing to remember to pass.
 */
export interface ComponentRouter {
  dispatchComponent(invocation: ComponentInvocation): Promise<void>;
  dispatchModal(invocation: ModalInvocation): Promise<void>;
}

/**
 * What the runtime needs from the event layer.
 *
 * Structural for the same reason as `InteractionRouter`: `EventDispatcher<TDeps>`
 * would drag a feature-specific generic through the process lifecycle.
 */
export interface GatewayEventRouter {
  dispatch(event: GatewayEventName, payload: unknown): Promise<void>;
  registeredEvents(): readonly GatewayEventName[];
}

export interface BotRuntimeOptions {
  readonly bot: BotName;
  readonly config: PlatformConfig;
  readonly logger: Logger;
  readonly token: string;
  /**
   * The client, built by `createBotClient` before the feature services that
   * depend on it. Injected rather than constructed here so the runtime is not
   * forced to exist before the dispatcher it routes to.
   */
  readonly client: Client;
  /** Wired by the app. Absent for a bot with no commands yet. */
  readonly commands?: InteractionRouter;
  /** Buttons, select menus and modals. Absent for a bot that uses none. */
  readonly interactions?: ComponentRouter;
  /** Gateway event handlers. Only events this bot owns are subscribed. */
  readonly events?: GatewayEventRouter;
  /** Called once the client is ready and the guild is reachable. */
  readonly onReady?: (client: Client<true>) => Promise<void>;
  /** Called during shutdown, before the gateway connection is closed. */
  readonly onShutdown?: () => Promise<void>;
}

/**
 * One bot process.
 *
 * Owns the discord.js client and nothing else: no business logic, no database
 * access, no feature knowledge. Its whole job is the lifecycle — connect,
 * verify the environment is actually usable, route interactions, shut down
 * cleanly.
 */
export class BotRuntime implements GatewayClient {
  private readonly client: Client;
  private readonly logger: Logger;
  private shuttingDown = false;
  private connectedAt: number | null = null;

  public constructor(private readonly options: BotRuntimeOptions) {
    this.logger = options.logger.child({ context: { component: 'runtime' } });
    this.client = options.client;

    this.attachLifecycleListeners();
    this.attachEventListeners();
  }

  public async login(): Promise<void> {
    const declared = privilegedIntentsFor(this.options.bot);
    if (declared.length > 0) {
      this.logger.info(
        'gateway.privileged_intents',
        `Requesting privileged intent(s): ${declared.map((entry) => entry.intent).join(', ')}. These must be enabled on the Bot page of the Developer Portal, or the connection closes with code 4014.`,
        { context: { intents: declared.map((entry) => entry.intent) } },
      );
    }

    try {
      await this.client.login(this.options.token);
    } catch (error) {
      throw translateLoginError(error, this.options.bot);
    }
  }

  public status(): GatewayStatus {
    const ready = this.client.isReady();
    return {
      connected: ready && this.client.ws.status === Status.Ready,
      // discord.js reports -1 before the first heartbeat completes; surface
      // that as "unknown" rather than as a nonsense latency.
      pingMs: ready && this.client.ws.ping >= 0 ? Math.round(this.client.ws.ping) : null,
      uptimeMs: this.connectedAt === null ? 0 : Date.now() - this.connectedAt,
      applicationId: this.client.application?.id ?? null,
    };
  }

  public async destroy(): Promise<void> {
    if (this.shuttingDown) return;
    this.shuttingDown = true;

    this.logger.info('runtime.shutdown', 'Shutting down.');
    try {
      await this.options.onShutdown?.();
    } catch (error) {
      this.logger.error('runtime.shutdown_hook_failed', 'A shutdown hook failed.', {
        error,
      });
    }

    await this.client.destroy();
    this.logger.info('runtime.stopped', 'Gateway connection closed.');
  }

  public raw(): Client {
    return this.client;
  }

  private attachLifecycleListeners(): void {
    // `clientReady`, not `ready`. discord.js 14.22 deprecated the old name and
    // v15 removes it; `Events.ClientReady` resolves to the correct string
    // either way, which is why the constant is used rather than a literal.
    this.client.once(Events.ClientReady, (client) => {
      this.connectedAt = Date.now();
      void withCorrelation(async () => {
        this.logger.info(
          'gateway.ready',
          `${BOT_DISPLAY_NAMES[this.options.bot]} connected as ${client.user.tag}.`,
          {
            context: {
              application_id: client.application.id,
              guild_count: client.guilds.cache.size,
            },
          },
        );

        try {
          await this.verifyGuildReachable(client);
          await this.options.onReady?.(client);
        } catch (error) {
          const bloom = BloomError.from(error);
          this.logger.log(
            bloom.severity,
            'runtime.ready_failed',
            'Startup checks failed.',
            {
              error: bloom,
              error_code: bloom.code,
            },
          );
        }
      }, newCorrelationId());
    });

    this.client.on(Events.Error, (error) => {
      this.logger.error('gateway.error', 'discord.js reported a client error.', {
        error,
      });
    });

    this.client.on(Events.Warn, (message) => {
      this.logger.warn('gateway.warn', message);
    });

    this.client.on(Events.ShardDisconnect, (event, shardId) => {
      this.logger.warn(
        'gateway.disconnected',
        `Shard ${String(shardId)} disconnected (close code ${String(event.code)}).`,
        { context: { shard_id: shardId, close_code: event.code } },
      );
    });

    this.client.on(Events.ShardReconnecting, (shardId) => {
      this.logger.info('gateway.reconnecting', `Shard ${String(shardId)} reconnecting.`);
    });

    this.client.on(Events.ShardResume, (shardId, replayed) => {
      this.logger.info(
        'gateway.resumed',
        `Shard ${String(shardId)} resumed; ${String(replayed)} event(s) replayed.`,
        { context: { shard_id: shardId, replayed } },
      );
    });

    if (this.options.commands ?? this.options.interactions) {
      this.client.on(Events.InteractionCreate, (interaction) => {
        void this.routeInteraction(interaction);
      });
    }
  }

  /**
   * Subscribe to gateway events.
   *
   * Only events the router actually has handlers for are subscribed. Attaching
   * a listener that does nothing is not free: with the GuildMembers intent a
   * busy guild delivers a steady stream of member updates, and each one would
   * be adapted into a payload object and then dropped.
   *
   * Every listener is `void`-ed into the dispatcher, which never rejects — an
   * unhandled rejection inside a discord.js listener terminates the process.
   */
  private attachEventListeners(): void {
    const router = this.options.events;
    if (!router) return;

    const subscribed = new Set(router.registeredEvents());

    if (subscribed.has('guildMemberAdd')) {
      this.client.on(Events.GuildMemberAdd, (member) => {
        void router.dispatch('guildMemberAdd', toMemberJoinPayload(member));
      });
    }

    if (subscribed.has('guildMemberRemove')) {
      this.client.on(Events.GuildMemberRemove, (member) => {
        void router.dispatch(
          'guildMemberRemove',
          toMemberLeavePayload(member, new Date()),
        );
      });
    }

    if (subscribed.has('guildMemberUpdate')) {
      this.client.on(Events.GuildMemberUpdate, (previous, next) => {
        void router.dispatch('guildMemberUpdate', toMemberUpdatePayload(previous, next));
      });
    }

    this.logger.info(
      'runtime.events_subscribed',
      `Subscribed to ${String(subscribed.size)} gateway event(s).`,
      { context: { events: [...subscribed] } },
    );
  }

  /**
   * Route an interaction to whichever dispatcher owns its kind.
   *
   * Everything past this point is a dispatcher's problem; this method's only
   * responsibilities are establishing a correlation id and refusing anything
   * that did not arrive from a guild member.
   *
   * Autocomplete and ping interactions fall through deliberately. Neither is
   * used yet, and answering one with "unknown command" would be worse than
   * Discord's own timeout.
   */
  private async routeInteraction(interaction: Interaction): Promise<void> {
    const kind = this.interactionKind(interaction);
    if (!kind) return;

    await withCorrelation(async () => {
      const correlationId = newCorrelationId();

      /*
       * Commands are registered guild-only and contexts are set explicitly, so
       * a missing guild member means something unexpected — an integration
       * type we did not intend, or a command registered globally by accident.
       * Refuse rather than fabricate a subject.
       *
       * This matters more for components than for commands: a component's
       * authorization is re-checked on use, and that check reads roles off the
       * member. No member, no check, so there is nothing safe to do here.
       */
      const member = interaction.inCachedGuild() ? interaction.member : null;
      if (!member) {
        this.logger.warn(
          'interaction.no_member',
          `A ${kind} interaction arrived without guild member context; refused.`,
          { context: { kind } },
        );
        if (interaction.isRepliable()) {
          await interaction
            .reply({
              content: 'This only works inside the Bloom Labs server.',
              flags: 64,
            })
            .catch(() => undefined);
        }
        return;
      }

      if (interaction.isChatInputCommand()) {
        await this.options.commands?.dispatch(
          toCommandInvocation(interaction, member, correlationId),
        );
        return;
      }

      if (interaction.isModalSubmit()) {
        await this.options.interactions?.dispatchModal(
          toModalInvocation(interaction, member, correlationId),
        );
        return;
      }

      if (interaction.isMessageComponent()) {
        await this.options.interactions?.dispatchComponent(
          toComponentInvocation(interaction, member, correlationId),
        );
      }
    }, newCorrelationId());
  }

  /** Which dispatcher, if any, is wired for this interaction's kind. */
  private interactionKind(interaction: Interaction): string | null {
    if (interaction.isChatInputCommand()) {
      return this.options.commands ? 'command' : null;
    }
    if (interaction.isModalSubmit()) {
      return this.options.interactions ? 'modal' : null;
    }
    if (interaction.isMessageComponent()) {
      return this.options.interactions ? 'component' : null;
    }
    return null;
  }

  /**
   * Confirm the configured guild is actually reachable.
   *
   * A bot that connects successfully but was never invited to the server looks
   * completely healthy from the outside and does nothing at all. Checking once
   * at startup converts that into a loud, specific error.
   */
  private async verifyGuildReachable(client: Client<true>): Promise<void> {
    const guildId = this.options.config.discord.guildId;
    const guild =
      client.guilds.cache.get(guildId) ??
      (await client.guilds.fetch(guildId).catch(() => null));

    if (!guild) {
      throw bloomError('GUILD_MISMATCH', {
        operatorHint: `${BOT_DISPLAY_NAMES[this.options.bot]} is connected to Discord but is not a member of guild ${guildId}. Invite it with the OAuth2 URL from docs/setup, and confirm DISCORD_GUILD_ID matches the server id.`,
        details: { guild_id: guildId },
      });
    }

    this.logger.info('runtime.guild_verified', `Guild "${guild.name}" is reachable.`, {
      context: { guild_id: unsafeSnowflake<GuildId>(guild.id), guild_name: guild.name },
    });
  }
}

function translateLoginError(error: unknown, bot: BotName): unknown {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('TOKEN_INVALID') || message.includes('An invalid token')) {
    return bloomError('CONFIGURATION_ERROR', {
      operatorHint: `Discord rejected the token for ${BOT_DISPLAY_NAMES[bot]}. Tokens are invalidated whenever they are regenerated or leaked publicly — reset it on the Bot page of the Developer Portal and update the environment.`,
      cause: error,
    });
  }

  if (message.includes('disallowed intents') || message.includes('4014')) {
    const intents = privilegedIntentsFor(bot)
      .map((entry) => entry.intent)
      .join(', ');
    return bloomError('CONFIGURATION_ERROR', {
      operatorHint: `Discord closed the connection with code 4014: ${BOT_DISPLAY_NAMES[bot]} requested privileged intent(s) (${intents || 'none declared'}) that are not enabled. Enable them under Developer Portal → your application → Bot → Privileged Gateway Intents.`,
      cause: error,
    });
  }

  return bloomError('DISCORD_API_ERROR', {
    operatorHint: `Could not connect ${BOT_DISPLAY_NAMES[bot]} to the gateway: ${message}`,
    cause: error,
  });
}
