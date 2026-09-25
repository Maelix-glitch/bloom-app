import {
  BloomError,
  type BotName,
  type ChannelId,
  type CorrelationId,
  type GuildId,
  type InteractionId,
} from '@bloom/shared-types';
import type { Logger } from '@bloom/logging';
import type { PlatformConfig } from '@bloom/config';
import { errorMessage } from '@bloom/embeds';
import {
  requireConfiguredGuild,
  type AuthorizationContext,
  type AuthorizationPolicy,
} from '@bloom/permissions';
import type { BloomMessage } from '@bloom/embeds';
import { customIdRoute, parseCustomId, type CustomId } from './custom-id.js';
import type { ComponentInvocation, ModalInvocation } from './invocation.js';

/**
 * Buttons, select menus and modal submissions.
 *
 * A separate dispatcher from `CommandDispatcher` rather than a branch inside
 * it, because the two differ in the places that matter. A command is named by
 * Discord and always exists; a component is named by a string this platform
 * wrote earlier, may belong to another application entirely, and may refer to a
 * handler that has since been deployed away. Folding both into one class would
 * mean every branch asking "but which kind is this?".
 *
 * What is shared is the guarantee: **an interaction never dies silently.**
 */

/** A component interaction that has already been routed and authorized. */
export interface HandlerContext {
  readonly customId: CustomId;
  readonly auth: AuthorizationContext;
}

export interface InteractionHandler<TDeps, TInvocation> {
  readonly bot: BotName;
  /** The feature that owns this, e.g. `bugs`. Must match the custom id. */
  readonly feature: string;
  readonly action: string;
  /**
   * Authorization, re-evaluated on submission.
   *
   * A modal is shown after a policy check and submitted up to fifteen minutes
   * later. Roles change in between. Checking only at the point the modal was
   * opened would make a revoked permission take effect on paper and not in
   * fact, so the policy runs again here against live role data.
   */
  readonly policy: AuthorizationPolicy;
  /** Acknowledge before slow work. Defaults to true. */
  readonly defer?: boolean;
  readonly ephemeral?: boolean;
  execute(
    invocation: TInvocation,
    deps: TDeps,
    context: HandlerContext,
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  ): Promise<BloomMessage | void>;
}

export type ModalHandler<TDeps> = InteractionHandler<TDeps, ModalInvocation>;
export type ComponentHandler<TDeps> = InteractionHandler<TDeps, ComponentInvocation>;

/** The fields both component and modal invocations share. */
interface Routable {
  readonly interactionId: InteractionId;
  readonly customId: string;
  readonly guildId: GuildId | null;
  readonly channelId: ChannelId | null;
  readonly actor: AuthorizationContext['subject'];
  readonly respond: ModalInvocation['respond'];
  readonly correlationId: CorrelationId;
}

export interface InteractionDispatcherOptions<TDeps> {
  readonly bot: BotName;
  readonly config: PlatformConfig;
  readonly logger: Logger;
  readonly deps: TDeps;
  readonly modals?: readonly ModalHandler<TDeps>[];
  readonly components?: readonly ComponentHandler<TDeps>[];
}

/**
 * Routes component and modal interactions to handlers, by custom id.
 *
 * Registration is keyed on `bot:feature:action` and checked at construction:
 * two handlers claiming the same route is a programming error that would
 * otherwise resolve to whichever was registered last.
 */
export class InteractionDispatcher<TDeps> {
  private readonly modals = new Map<string, ModalHandler<TDeps>>();
  private readonly components = new Map<string, ComponentHandler<TDeps>>();

  public constructor(private readonly options: InteractionDispatcherOptions<TDeps>) {
    for (const handler of options.modals ?? []) {
      this.add(this.modals, handler, 'modal');
    }
    for (const handler of options.components ?? []) {
      this.add(this.components, handler, 'component');
    }
  }

  public get size(): number {
    return this.modals.size + this.components.size;
  }

  private add<THandler extends InteractionHandler<TDeps, never>>(
    into: Map<string, THandler>,
    handler: THandler,
    kind: string,
  ): void {
    if (handler.bot !== this.options.bot) {
      throw new BloomError('CONFIGURATION_ERROR', {
        operatorHint: `${kind} handler "${handler.feature}:${handler.action}" belongs to ${handler.bot}, not ${this.options.bot}.`,
      });
    }

    const route = customIdRoute(handler);
    if (into.has(route)) {
      throw new BloomError('CONFIGURATION_ERROR', {
        operatorHint: `Two ${kind} handlers are registered for "${route}".`,
      });
    }
    into.set(route, handler);
  }

  public async dispatchModal(invocation: ModalInvocation): Promise<void> {
    await this.run(this.modals, invocation, invocation, 'modal');
  }

  public async dispatchComponent(invocation: ComponentInvocation): Promise<void> {
    await this.run(this.components, invocation, invocation, 'component');
  }

  private async run<TInvocation>(
    handlers: ReadonlyMap<string, InteractionHandler<TDeps, TInvocation>>,
    invocation: TInvocation,
    routable: Routable,
    kind: string,
  ): Promise<void> {
    const parsed = parseCustomId(routable.customId);

    /*
     * Not ours, or not well-formed. Both are silent at debug level.
     *
     * Every application in the server receives these events, so anything
     * louder would fill the logs with other people's buttons — and responding
     * would mean this bot interrupting an interaction it has no part in.
     */
    if (parsed?.bot !== this.options.bot) return;

    const logger = this.options.logger.child({
      command: customIdRoute(parsed),
      actor_id: routable.actor.userId,
      guild_id: routable.guildId,
      channel_id: routable.channelId,
      correlation_id: routable.correlationId,
      // The raw id carries the argument too, which the route deliberately does
      // not. Useful when a single handler serves many bug ids.
      context: { custom_id: routable.customId },
    });

    const handler = handlers.get(customIdRoute(parsed));
    if (!handler) {
      /*
       * Addressed to this bot, but nothing here answers to it. Almost always a
       * component on a message that outlived the deploy that created it — a
       * member pressing a button on a week-old reply.
       */
      logger.warn(
        'interaction.unknown_route',
        `No ${kind} handler for "${routable.customId}"; the component is probably older than this deploy.`,
        { error_code: 'NOT_IMPLEMENTED' },
      );
      await this.safeRespond(
        routable,
        logger,
        errorMessage(
          new BloomError('NOT_IMPLEMENTED', {
            userMessage:
              'This is from an older version of the bot. Run the command again.',
          }),
        ),
      );
      return;
    }

    try {
      const auth: AuthorizationContext = {
        subject: routable.actor,
        channelId: routable.channelId,
        config: this.options.config,
        command: customIdRoute(parsed),
      };

      const guildCheck = requireConfiguredGuild(auth);
      if (!guildCheck.ok) throw guildCheck.error;

      const authorised = handler.policy(auth);
      if (!authorised.ok) throw authorised.error;

      const ephemeral = handler.ephemeral ?? true;
      if (handler.defer !== false) {
        await routable.respond.defer({ ephemeral });
      }

      const result = await handler.execute(invocation, this.options.deps, {
        customId: parsed,
        auth,
      });

      if (result) {
        await this.send(routable, { ephemeral, ...result });
      } else if (!routable.respond.replied && !routable.respond.deferred) {
        logger.warn(
          'interaction.no_response',
          'Handler returned nothing and never responded; the member sees a failed interaction.',
        );
      }

      logger.info('interaction.completed', `${kind} ${customIdRoute(parsed)} completed.`);
    } catch (error) {
      const bloom = BloomError.from(error);
      logger.log(
        bloom.severity,
        'interaction.failed',
        `${kind} ${routable.customId} failed.`,
        { error: bloom, error_code: bloom.code },
      );
      await this.safeRespond(
        routable,
        logger,
        errorMessage(bloom, { correlationId: routable.correlationId }),
      );
    }
  }

  private async send(routable: Routable, message: BloomMessage): Promise<void> {
    if (routable.respond.deferred && !routable.respond.replied) {
      await routable.respond.editReply(message);
    } else if (routable.respond.replied) {
      await routable.respond.followUp(message);
    } else {
      await routable.respond.reply(message);
    }
  }

  private async safeRespond(
    routable: Routable,
    logger: Logger,
    message: BloomMessage,
  ): Promise<void> {
    try {
      await this.send(routable, message);
    } catch (responseError) {
      logger.error(
        'interaction.response_failed',
        'Could not deliver a response; the interaction will show as failed in their client.',
        { error: responseError },
      );
    }
  }
}
