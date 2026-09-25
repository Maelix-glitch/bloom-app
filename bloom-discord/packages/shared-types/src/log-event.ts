import type { BotName } from './bots.js';
import type { BloomErrorCode } from './errors.js';
import type { ChannelId, CorrelationId, GuildId, UserId } from './ids.js';
import type { JsonObject } from './json.js';
import type { LogSeverity } from './severity.js';

/**
 * The log line contract.
 *
 * Fixed field names in snake_case, because these end up in a log pipeline where
 * `guild_id` and `guildId` are two different columns. The brief specifies this
 * field set; encoding it as a type is what stops it drifting one call site at a
 * time.
 *
 * Note what is absent and must stay absent: tokens, secrets, database
 * credentials, API keys, and the contents of private reports.
 */
export interface LogEvent {
  /** ISO-8601, UTC, millisecond precision. */
  readonly timestamp: string;
  readonly bot_name: BotName | 'platform';
  readonly severity: LogSeverity;
  /** Dotted event name, e.g. `command.completed`, `role.assign.blocked`. */
  readonly event: string;
  readonly message: string;
  readonly correlation_id: CorrelationId | null;

  readonly guild_id?: GuildId | null;
  readonly actor_id?: UserId | null;
  readonly target_id?: UserId | null;
  readonly channel_id?: ChannelId | null;
  readonly command?: string | null;

  /** Milliseconds. Present on anything that completed a unit of work. */
  readonly duration_ms?: number | null;
  readonly error_code?: BloomErrorCode | null;

  readonly environment: string;
  readonly version: string;

  /** Additional structured context. Redacted before it reaches a sink. */
  readonly context?: JsonObject;

  /** Stack trace, if any. Sinks may drop this independently of the rest. */
  readonly stack?: string | null;
}

/** Fields that can be bound to a child logger and inherited by every line it writes. */
export type LogBindings = Partial<
  Pick<
    LogEvent,
    | 'bot_name'
    | 'guild_id'
    | 'actor_id'
    | 'target_id'
    | 'channel_id'
    | 'command'
    | 'correlation_id'
  >
> & { readonly context?: JsonObject };
