import {
  BloomError,
  bloomError,
  type BotName,
  type CorrelationId,
} from '@bloom/shared-types';
import type { Logger } from '@bloom/logging';
import { newCorrelationId, withCorrelation } from '@bloom/utils';
import { assertCanHandle, type GatewayEventName } from './ownership.js';

/**
 * An event handler.
 *
 * Handlers receive already-adapted payloads, not discord.js objects — the same
 * seam as commands, for the same reason. `TPayload` is supplied by
 * `packages/discord`, which owns the translation.
 */
export interface EventHandler<TPayload, TDeps> {
  readonly event: GatewayEventName;
  readonly bot: BotName;
  /** Human-readable, for logs. Several handlers may share one event. */
  readonly name: string;

  /**
   * Whether a repeat of the same logical event should be suppressed.
   *
   * Gateway events can be redelivered after a resume, and a reconnect replays
   * a burst of them. For anything with a visible side effect, return a stable
   * key and the dispatcher will only run the handler once per key.
   */
  dedupeKey?(payload: TPayload): string | null;

  handle(payload: TPayload, deps: TDeps): Promise<void>;
}

export interface EventDispatcherOptions<TDeps> {
  readonly bot: BotName;
  readonly logger: Logger;
  readonly deps: TDeps;
  /**
   * Durable duplicate suppression. Injected rather than assumed so a test can
   * supply an in-memory implementation and production gets the database one.
   */
  readonly dedupe?: {
    tryClaim(key: string, ttlSeconds: number): Promise<boolean>;
  };
  readonly dedupeTtlSeconds?: number;
}

/**
 * Routes gateway events to handlers.
 *
 * Three properties it guarantees:
 *
 *   1. **Ownership.** Registering a handler for an event this bot does not own
 *      throws at startup, not at 3am when two bots both welcome someone.
 *   2. **Isolation.** One failing handler does not prevent the others from
 *      running, and never propagates into the gateway client — an unhandled
 *      rejection inside an event listener terminates the process.
 *   3. **Correlation.** Each dispatch runs inside its own correlation scope, so
 *      every line a handler logs is tied together.
 */
export class EventDispatcher<TDeps> {
  private readonly handlers = new Map<GatewayEventName, EventHandler<never, TDeps>[]>();

  public constructor(private readonly options: EventDispatcherOptions<TDeps>) {}

  public register<TPayload>(handler: EventHandler<TPayload, TDeps>): this {
    if (handler.bot !== this.options.bot) {
      throw bloomError('CONFIGURATION_ERROR', {
        operatorHint: `Handler "${handler.name}" declares bot ${handler.bot} but was registered on ${this.options.bot}.`,
        details: {
          handler: handler.name,
          declared: handler.bot,
          registry: this.options.bot,
        },
      });
    }

    assertCanHandle(this.options.bot, handler.event);

    const existing = this.handlers.get(handler.event) ?? [];
    existing.push(handler);
    this.handlers.set(handler.event, existing);
    return this;
  }

  public registeredEvents(): readonly GatewayEventName[] {
    return [...this.handlers.keys()];
  }

  public handlerCount(event: GatewayEventName): number {
    return this.handlers.get(event)?.length ?? 0;
  }

  /**
   * Dispatch one event to every handler registered for it.
   *
   * Handlers run sequentially rather than concurrently. They frequently touch
   * the same rows — the member record, the audit trail — and sequential
   * execution removes a class of write conflicts for a cost measured in
   * milliseconds.
   */
  public async dispatch(
    event: GatewayEventName,
    payload: unknown,
    correlationId: CorrelationId = newCorrelationId(),
  ): Promise<void> {
    const handlers = this.handlers.get(event);
    if (!handlers || handlers.length === 0) return;

    await withCorrelation(async () => {
      for (const handler of handlers as unknown as EventHandler<unknown, TDeps>[]) {
        await this.runOne(handler, payload, event);
      }
    }, correlationId);
  }

  private async runOne<TPayload>(
    handler: EventHandler<TPayload, TDeps>,
    payload: TPayload,
    event: GatewayEventName,
  ): Promise<void> {
    const logger = this.options.logger.child({ context: { handler: handler.name } });
    const done = logger.startTimer(`event.${event}`);

    try {
      const key = handler.dedupeKey?.(payload) ?? null;
      if (key && this.options.dedupe) {
        const claimed = await this.options.dedupe.tryClaim(
          `event:${event}:${key}`,
          this.options.dedupeTtlSeconds ?? 300,
        );
        if (!claimed) {
          logger.debug(
            'event.duplicate',
            `Skipped a redelivered "${event}" — already handled.`,
            { context: { dedupe_key: key } },
          );
          return;
        }
      }

      await handler.handle(payload, this.options.deps);
      done(`Handled "${event}".`);
    } catch (error) {
      const bloom = BloomError.from(error);
      /*
       * Swallowed on purpose. This is the boundary between our code and the
       * discord.js event emitter: a rejection escaping here becomes an
       * unhandled rejection, which kills the process and disconnects the bot.
       * A logged failure in one handler is strictly better than an outage.
       */
      logger.log(
        bloom.severity,
        `event.${event}.failed`,
        `Handler "${handler.name}" failed.`,
        {
          error: bloom,
          error_code: bloom.code,
        },
      );
    }
  }
}
