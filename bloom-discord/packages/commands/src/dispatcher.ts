import { BloomError, type BotName, type GuildId, type UserId } from '@bloom/shared-types';
import type { Logger } from '@bloom/logging';
import type { PlatformConfig } from '@bloom/config';
import { errorMessage } from '@bloom/embeds';
import { requireConfiguredGuild, type AuthorizationContext } from '@bloom/permissions';
import { systemClock, type Clock } from '@bloom/utils';
import { shouldDefer, type CommandRegistry } from './command.js';
import type { CommandInvocation } from './invocation.js';

export type CommandOutcome =
  'success' | 'user_error' | 'authorization_denied' | 'system_error' | 'rate_limited';

export interface CommandTelemetry {
  record(entry: {
    readonly guildId: GuildId;
    readonly botName: BotName;
    readonly command: string;
    readonly actorId: UserId;
    readonly channelId: string | null;
    readonly outcome: CommandOutcome;
    readonly errorCode: string | null;
    readonly durationMs: number;
    readonly correlationId: string;
  }): Promise<void>;
}

export interface DispatcherOptions<TDeps> {
  readonly bot: BotName;
  readonly config: PlatformConfig;
  readonly logger: Logger;
  readonly registry: CommandRegistry<TDeps>;
  readonly deps: TDeps;
  readonly telemetry?: CommandTelemetry;
  readonly clock?: Clock;
}

/**
 * The single path every command takes.
 *
 * The brief's §24 sequence — validate context, authorize, execute, log, respond
 * — is implemented once, here, rather than being re-derived in each handler.
 * Centralising it is what makes the guarantees real: there is no command that
 * "forgot" to authorize, because authorizing is not something a command does.
 *
 * The one rule this class exists to uphold: **an interaction never dies
 * silently.** Every branch, including the ones where responding itself fails,
 * ends in either a message to the member or a logged explanation of why that
 * was impossible.
 */
export class CommandDispatcher<TDeps> {
  private readonly clock: Clock;

  public constructor(private readonly options: DispatcherOptions<TDeps>) {
    this.clock = options.clock ?? systemClock;
  }

  public async dispatch(invocation: CommandInvocation): Promise<void> {
    const startedAt = this.clock.now();
    const logger = this.options.logger.child({
      command: invocation.commandPath,
      actor_id: invocation.actor.userId,
      guild_id: invocation.guildId,
      channel_id: invocation.channelId,
      correlation_id: invocation.correlationId,
    });

    const command = this.options.registry.get(invocation.commandName);
    if (!command) {
      /*
       * A registered command with no handler means the deployed code is older
       * than the registered command set — a real and common deploy-order
       * mistake. Say so in the log; tell the member something neutral.
       */
      logger.error(
        'command.unknown',
        `No handler is registered for "/${invocation.commandName}".`,
        { error_code: 'NOT_IMPLEMENTED' },
      );
      await this.safeRespond(
        invocation,
        logger,
        errorMessage(new BloomError('NOT_IMPLEMENTED')),
      );
      await this.recordTelemetry(
        invocation,
        'system_error',
        'NOT_IMPLEMENTED',
        startedAt,
      );
      return;
    }

    try {
      // 1. Context. Guild-only is checked before anything else touches state.
      const authContext: AuthorizationContext = {
        subject: invocation.actor,
        channelId: invocation.channelId,
        config: this.options.config,
        command: invocation.commandPath,
      };

      const guildCheck = requireConfiguredGuild(authContext);
      if (!guildCheck.ok) throw guildCheck.error;

      // 2. Authorization. Server-side, against live role data.
      const authorised = command.policy(authContext);
      if (!authorised.ok) throw authorised.error;

      // 3. Acknowledge before doing slow work, so the 3-second budget is not at
      //    the mercy of a cold database connection.
      const ephemeral = command.ephemeral ?? true;
      if (shouldDefer(command, invocation)) {
        await invocation.respond.defer({ ephemeral });
      }

      // 4. Execute.
      const result = await command.execute(invocation, this.options.deps, authContext);

      // 5. Respond.
      if (result) {
        await this.send(invocation, { ephemeral, ...result });
      } else if (!invocation.respond.replied && !invocation.respond.deferred) {
        logger.warn(
          'command.no_response',
          'Handler returned nothing and never responded; the member sees a failed interaction.',
        );
      }

      const durationMs = this.clock.now() - startedAt;
      logger.info('command.completed', `/${invocation.commandPath} completed.`, {
        duration_ms: durationMs,
      });
      await this.recordTelemetry(invocation, 'success', null, startedAt);
    } catch (error) {
      await this.handleFailure(invocation, logger, error, startedAt);
    }
  }

  private async handleFailure(
    invocation: CommandInvocation,
    logger: Logger,
    error: unknown,
    startedAt: number,
  ): Promise<void> {
    const bloom = BloomError.from(error);
    const durationMs = this.clock.now() - startedAt;

    // Severity comes from the catalog, so an authorization refusal is a `warn`
    // and a database outage is `fatal` — without each handler deciding.
    logger.log(bloom.severity, 'command.failed', `/${invocation.commandPath} failed.`, {
      error: bloom,
      error_code: bloom.code,
      duration_ms: durationMs,
    });

    await this.safeRespond(
      invocation,
      logger,
      errorMessage(bloom, { correlationId: invocation.correlationId }),
    );

    await this.recordTelemetry(invocation, outcomeFor(bloom), bloom.code, startedAt);
  }

  /** Send a message, choosing the right call for the interaction's current state. */
  private async send(
    invocation: CommandInvocation,
    message: Parameters<CommandInvocation['respond']['reply']>[0],
  ): Promise<void> {
    if (invocation.respond.deferred && !invocation.respond.replied) {
      await invocation.respond.editReply(message);
    } else if (invocation.respond.replied) {
      await invocation.respond.followUp(message);
    } else {
      await invocation.respond.reply(message);
    }
  }

  /**
   * Respond, and if responding fails, log it and stop.
   *
   * Discord tokens expire after 15 minutes and an interaction can only be
   * acknowledged once; both produce API errors on the *error path*, where
   * throwing again would replace a useful log line with a confusing one.
   */
  private async safeRespond(
    invocation: CommandInvocation,
    logger: Logger,
    message: Parameters<CommandInvocation['respond']['reply']>[0],
  ): Promise<void> {
    try {
      await this.send(invocation, message);
    } catch (responseError) {
      logger.error(
        'command.response_failed',
        'Could not deliver a response to the member; the interaction will show as failed in their client.',
        { error: responseError },
      );
    }
  }

  private async recordTelemetry(
    invocation: CommandInvocation,
    outcome: CommandOutcome,
    errorCode: string | null,
    startedAt: number,
  ): Promise<void> {
    const telemetry = this.options.telemetry;
    if (!telemetry || !invocation.guildId) return;

    try {
      await telemetry.record({
        guildId: invocation.guildId,
        botName: this.options.bot,
        command: invocation.commandPath,
        actorId: invocation.actor.userId,
        channelId: invocation.channelId,
        outcome,
        errorCode,
        durationMs: this.clock.now() - startedAt,
        correlationId: invocation.correlationId,
      });
    } catch (telemetryError) {
      // Telemetry is observability, not function. Losing a row must never turn
      // a successful command into a failed one.
      this.options.logger.warn(
        'command.telemetry_failed',
        'Could not record command usage.',
        {
          error: telemetryError,
        },
      );
    }
  }
}

/** Map an error code onto the telemetry outcome buckets. */
function outcomeFor(error: BloomError): CommandOutcome {
  switch (error.code) {
    case 'UNAUTHORIZED':
    case 'INSUFFICIENT_PERMISSION':
    case 'TARGET_PROTECTED':
    case 'CAPABILITY_DENIED':
    case 'GUILD_MISMATCH':
      return 'authorization_denied';
    case 'RATE_LIMITED':
      return 'rate_limited';
    case 'INVALID_INPUT':
    case 'SELF_ACTION_BLOCKED':
    case 'CHANNEL_RESTRICTED':
    case 'DUPLICATE_OPERATION':
    case 'MEMBER_NOT_FOUND':
    case 'ROLE_ALREADY_ASSIGNED':
      return 'user_error';
    default:
      return 'system_error';
  }
}
