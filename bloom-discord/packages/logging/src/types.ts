import type {
  BloomErrorCode,
  ChannelId,
  GuildId,
  JsonObject,
  LogBindings,
  LogEvent,
  LogSeverity,
  UserId,
} from '@bloom/shared-types';

/**
 * Everything a single log call can add on top of its bindings.
 *
 * `error` accepts `unknown` because that is what `catch` produces; the logger
 * normalises it. Nothing else here is optional-by-accident — each field is one
 * the brief requires on major events.
 */
export interface LogFields {
  readonly guild_id?: GuildId | null;
  readonly actor_id?: UserId | null;
  readonly target_id?: UserId | null;
  readonly channel_id?: ChannelId | null;
  readonly command?: string | null;
  readonly duration_ms?: number | null;
  readonly error_code?: BloomErrorCode | null;
  readonly context?: JsonObject;
  readonly error?: unknown;
}

export interface Logger {
  trace(event: string, message: string, fields?: LogFields): void;
  debug(event: string, message: string, fields?: LogFields): void;
  info(event: string, message: string, fields?: LogFields): void;
  warn(event: string, message: string, fields?: LogFields): void;
  error(event: string, message: string, fields?: LogFields): void;
  fatal(event: string, message: string, fields?: LogFields): void;

  /**
   * Log at a severity chosen at runtime — used by the error boundary, which
   * takes the severity from the error catalog rather than hard-coding one.
   */
  log(severity: LogSeverity, event: string, message: string, fields?: LogFields): void;

  /** Derive a logger that carries additional bindings on every line. */
  child(bindings: LogBindings): Logger;

  /**
   * Start a timer. Calling the returned function writes one line with an
   * accurate `duration_ms`, so callers cannot forget to measure or get the
   * arithmetic wrong.
   */
  startTimer(event: string): (message: string, fields?: LogFields) => void;

  readonly level: LogSeverity;
}

/**
 * Where log lines go. Swappable so tests can assert on structured output
 * instead of scraping stdout.
 */
export interface LogSink {
  write(event: LogEvent): void;
}
