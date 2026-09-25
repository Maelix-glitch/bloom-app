import {
  BloomError,
  isSeverityEnabled,
  type BotName,
  type JsonObject,
  type LogBindings,
  type LogEvent,
  type LogSeverity,
} from '@bloom/shared-types';
import {
  currentCorrelationId,
  redactObject,
  redactString,
  systemClock,
} from '@bloom/utils';
import type { Clock } from '@bloom/utils';
import type { LogFields, Logger, LogSink } from './types.js';

export interface LoggerOptions {
  readonly botName: BotName | 'platform';
  readonly environment: string;
  readonly version: string;
  readonly level: LogSeverity;
  readonly sink: LogSink;
  readonly bindings?: LogBindings;
  readonly clock?: Clock;
  /**
   * Whether to include stack traces. Off in production by default: stacks are
   * noisy in an aggregator and occasionally echo file paths and arguments.
   */
  readonly includeStacks?: boolean;
}

/**
 * The platform logger.
 *
 * Three properties matter more than features:
 *
 *   1. **Fixed schema.** Field names come from `LogEvent`, not from call sites,
 *      so `guild_id` is always `guild_id`.
 *   2. **Redaction is not optional.** Every message and every context object
 *      passes through the redactor on the way to the sink. A caller cannot opt
 *      out, which means a caller cannot accidentally log a token.
 *   3. **Correlation is ambient.** The id comes from AsyncLocalStorage, so a
 *      repository three layers down emits the same id as the router without
 *      being handed it.
 */
class BloomLogger implements Logger {
  public readonly level: LogSeverity;

  private readonly botName: BotName | 'platform';
  private readonly environment: string;
  private readonly version: string;
  private readonly sink: LogSink;
  private readonly bindings: LogBindings;
  private readonly clock: Clock;
  private readonly includeStacks: boolean;

  public constructor(options: LoggerOptions) {
    this.botName = options.botName;
    this.environment = options.environment;
    this.version = options.version;
    this.level = options.level;
    this.sink = options.sink;
    this.bindings = options.bindings ?? {};
    this.clock = options.clock ?? systemClock;
    this.includeStacks = options.includeStacks ?? options.environment !== 'production';
  }

  public trace(event: string, message: string, fields?: LogFields): void {
    this.log('trace', event, message, fields);
  }

  public debug(event: string, message: string, fields?: LogFields): void {
    this.log('debug', event, message, fields);
  }

  public info(event: string, message: string, fields?: LogFields): void {
    this.log('info', event, message, fields);
  }

  public warn(event: string, message: string, fields?: LogFields): void {
    this.log('warn', event, message, fields);
  }

  public error(event: string, message: string, fields?: LogFields): void {
    this.log('error', event, message, fields);
  }

  public fatal(event: string, message: string, fields?: LogFields): void {
    this.log('fatal', event, message, fields);
  }

  public log(
    severity: LogSeverity,
    event: string,
    message: string,
    fields: LogFields = {},
  ): void {
    if (!isSeverityEnabled(severity, this.level)) return;

    const normalisedError = normaliseError(fields.error);
    const context = this.buildContext(fields.context, normalisedError);

    const logEvent: LogEvent = {
      timestamp: this.clock.date().toISOString(),
      bot_name: this.bindings.bot_name ?? this.botName,
      severity,
      event,
      message: redactString(message),
      // Ambient scope wins over a binding: a child logger created outside the
      // request can still be used inside one, and the live scope is the truth.
      correlation_id: currentCorrelationId() ?? this.bindings.correlation_id ?? null,
      guild_id: fields.guild_id ?? this.bindings.guild_id ?? null,
      actor_id: fields.actor_id ?? this.bindings.actor_id ?? null,
      target_id: fields.target_id ?? this.bindings.target_id ?? null,
      channel_id: fields.channel_id ?? this.bindings.channel_id ?? null,
      command: fields.command ?? this.bindings.command ?? null,
      duration_ms: fields.duration_ms ?? null,
      error_code: fields.error_code ?? normalisedError?.code ?? null,
      environment: this.environment,
      version: this.version,
      ...(context ? { context } : {}),
      ...(this.includeStacks && normalisedError?.stack
        ? { stack: normalisedError.stack }
        : {}),
    };

    this.sink.write(logEvent);
  }

  public child(bindings: LogBindings): Logger {
    return new BloomLogger({
      botName: this.botName,
      environment: this.environment,
      version: this.version,
      level: this.level,
      sink: this.sink,
      clock: this.clock,
      includeStacks: this.includeStacks,
      bindings: {
        ...this.bindings,
        ...bindings,
        context: { ...this.bindings.context, ...bindings.context },
      },
    });
  }

  public startTimer(event: string): (message: string, fields?: LogFields) => void {
    const startedAt = this.clock.now();
    return (message: string, fields: LogFields = {}): void => {
      const severity: LogSeverity = fields.error ? 'error' : 'info';
      this.log(severity, event, message, {
        ...fields,
        duration_ms: this.clock.now() - startedAt,
      });
    };
  }

  private buildContext(
    explicit: JsonObject | undefined,
    error: NormalisedError | null,
  ): JsonObject | undefined {
    const merged: JsonObject = {
      ...this.bindings.context,
      ...explicit,
    };

    if (error) {
      merged['error'] = {
        name: error.name,
        message: error.message,
        ...(error.code ? { code: error.code } : {}),
        ...(error.retryable === undefined ? {} : { retryable: error.retryable }),
        ...(error.details ? { details: error.details } : {}),
      };
    }

    if (Object.keys(merged).length === 0) return undefined;
    return redactObject(merged);
  }
}

interface NormalisedError {
  readonly name: string;
  readonly message: string;
  readonly code?: BloomError['code'];
  readonly retryable?: boolean;
  readonly details?: JsonObject;
  readonly stack?: string;
}

function normaliseError(value: unknown): NormalisedError | null {
  if (value === undefined || value === null) return null;

  if (BloomError.is(value)) {
    return {
      name: value.name,
      message: value.operatorHint,
      code: value.code,
      retryable: value.retryable,
      details: value.details,
      ...(value.stack ? { stack: value.stack } : {}),
    };
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      ...(value.stack ? { stack: value.stack } : {}),
    };
  }

  return {
    name: 'UnknownThrownValue',
    // Deliberately not String(): an object thrown by mistake would stringify to
    // '[object Object]' and tell the reader nothing.
    message:
      typeof value === 'string' ? value : JSON.stringify(value) || 'unserialisable value',
  };
}

export function createLogger(options: LoggerOptions): Logger {
  return new BloomLogger(options);
}
