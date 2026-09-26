import type { Details, JsonObject } from './json.js';
import type { CorrelationId } from './ids.js';
import type { LogSeverity } from './severity.js';

/**
 * Machine-readable failure codes.
 *
 * Every failure that can reach a user or an operator is one of these. Two
 * separate messages hang off each code: one calm sentence for the member who
 * ran the command, and one blunt instruction for whoever has to fix it. Mixing
 * those two audiences is how bots end up leaking internals into public channels.
 */
export const ERROR_CODES = [
  // Authorization and permissions
  'UNAUTHORIZED',
  'INSUFFICIENT_PERMISSION',
  'BOT_MISSING_PERMISSION',
  'TARGET_PROTECTED',
  'SELF_ACTION_BLOCKED',
  'CAPABILITY_DENIED',

  // Roles
  'ROLE_HIERARCHY_BLOCKED',
  'ROLE_NOT_FOUND',
  'ROLE_ALREADY_ASSIGNED',

  // Context
  'CHANNEL_NOT_FOUND',
  'CHANNEL_RESTRICTED',
  'GUILD_MISMATCH',
  'MEMBER_NOT_FOUND',

  // Input
  'INVALID_INPUT',

  // Infrastructure
  'DATABASE_UNAVAILABLE',
  'DISCORD_API_ERROR',
  'CONFIGURATION_ERROR',
  'TIMEOUT',

  // Flow control
  'DUPLICATE_OPERATION',
  'RATE_LIMITED',
  'NOT_IMPLEMENTED',
  'INTERNAL_ERROR',
] as const;

export type BloomErrorCode = (typeof ERROR_CODES)[number];

export interface ErrorDescriptor {
  readonly code: BloomErrorCode;
  readonly severity: LogSeverity;
  /** Whether retrying the identical request could ever succeed without a change. */
  readonly retryable: boolean;
  /** Safe to show any member. No internals, no ids, no stack, no config keys. */
  readonly userMessage: string;
  /** For staff channels, logs and CLI output. May name roles, channels and config keys. */
  readonly operatorHint: string;
}

/**
 * `userMessage` is written to be readable by someone who has no idea a database
 * exists. `operatorHint` is written to be actionable by someone at 2am.
 */
export const ERROR_CATALOG: Readonly<Record<BloomErrorCode, ErrorDescriptor>> = {
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    severity: 'warn',
    retryable: false,
    userMessage: 'You do not have access to this command.',
    operatorHint:
      'The actor failed the command authorization policy. Check the configured role ids and the command policy in docs/permissions.',
  },
  INSUFFICIENT_PERMISSION: {
    code: 'INSUFFICIENT_PERMISSION',
    severity: 'warn',
    retryable: false,
    userMessage: 'You do not have the permissions required for this action.',
    operatorHint:
      'The actor is missing a required Discord permission or configured role for this specific action.',
  },
  BOT_MISSING_PERMISSION: {
    code: 'BOT_MISSING_PERMISSION',
    severity: 'error',
    retryable: false,
    userMessage: 'This action is currently unavailable. The team has been notified.',
    operatorHint:
      'The bot lacks a Discord permission it needs. Compare the guild and channel overwrites against docs/permissions/bloom-bot-permission-matrix.md, then re-invite with the documented scope if needed.',
  },
  TARGET_PROTECTED: {
    code: 'TARGET_PROTECTED',
    severity: 'warn',
    retryable: false,
    userMessage: 'That member cannot be actioned.',
    operatorHint:
      'The target holds a protected role (Founder, Administrator or Moderator) or outranks the actor. Protected targets are refused by design.',
  },
  SELF_ACTION_BLOCKED: {
    code: 'SELF_ACTION_BLOCKED',
    severity: 'info',
    retryable: false,
    userMessage: 'You cannot perform this action on yourself.',
    operatorHint: 'Self-targeting was refused by the authorization layer.',
  },
  CAPABILITY_DENIED: {
    code: 'CAPABILITY_DENIED',
    severity: 'fatal',
    retryable: false,
    userMessage: 'This action is currently unavailable. The team has been notified.',
    operatorHint:
      'A bot attempted an operation outside its declared capability manifest — for example Companion trying to modify a role. This is a wiring bug, not a configuration problem. Do not widen the manifest to make it pass.',
  },

  ROLE_HIERARCHY_BLOCKED: {
    code: 'ROLE_HIERARCHY_BLOCKED',
    severity: 'error',
    retryable: false,
    userMessage: 'This action could not be completed. The team has been notified.',
    operatorHint:
      'The bot role sits at or below the target role in the server role list. Discord refuses role writes in that direction. Server Settings -> Roles -> drag the bot role above the target role, keeping it below the staff roles.',
  },
  ROLE_NOT_FOUND: {
    code: 'ROLE_NOT_FOUND',
    severity: 'error',
    retryable: false,
    userMessage: 'This action could not be completed. The team has been notified.',
    operatorHint:
      'A configured role id does not resolve in this guild. The role was deleted, or the id in configuration belongs to another server. Re-copy the role id and update configuration.',
  },
  ROLE_ALREADY_ASSIGNED: {
    code: 'ROLE_ALREADY_ASSIGNED',
    severity: 'debug',
    retryable: false,
    userMessage: 'You already have this role.',
    operatorHint: 'No-op: the member already holds the target role. Treated as success.',
  },

  CHANNEL_NOT_FOUND: {
    code: 'CHANNEL_NOT_FOUND',
    severity: 'error',
    retryable: false,
    userMessage: 'This action could not be completed. The team has been notified.',
    operatorHint:
      'A configured channel id does not resolve, or the bot cannot view it. Verify the id and that the bot role has View Channel on it.',
  },
  CHANNEL_RESTRICTED: {
    code: 'CHANNEL_RESTRICTED',
    severity: 'info',
    retryable: false,
    userMessage: 'This command cannot be used in this channel.',
    operatorHint:
      'The command declares a channel restriction and this channel is not in the allowed set.',
  },
  GUILD_MISMATCH: {
    code: 'GUILD_MISMATCH',
    severity: 'warn',
    retryable: false,
    userMessage: 'This command is only available in the Bloom Labs server.',
    operatorHint:
      'The interaction arrived from a guild other than DISCORD_GUILD_ID, or from a DM. All Bloom commands are guild-scoped.',
  },
  MEMBER_NOT_FOUND: {
    code: 'MEMBER_NOT_FOUND',
    severity: 'warn',
    retryable: false,
    userMessage: 'That member could not be found in this server.',
    operatorHint:
      'The target user is not a member of the guild, or left between the command being issued and handled.',
  },

  INVALID_INPUT: {
    code: 'INVALID_INPUT',
    severity: 'info',
    retryable: false,
    userMessage: 'That input was not valid. Please check it and try again.',
    operatorHint: 'Input failed schema validation before reaching the service layer.',
  },

  DATABASE_UNAVAILABLE: {
    code: 'DATABASE_UNAVAILABLE',
    severity: 'fatal',
    retryable: true,
    userMessage: 'Bloom is temporarily unavailable. Please try again shortly.',
    operatorHint:
      'The database could not be reached. Check DATABASE_URL, the Supabase project status, and whether the connection pool is saturated (DATABASE_MAX_CONNECTIONS x number of processes).',
  },
  DISCORD_API_ERROR: {
    code: 'DISCORD_API_ERROR',
    severity: 'error',
    retryable: true,
    userMessage: 'Discord did not respond as expected. Please try again shortly.',
    operatorHint:
      'The Discord API returned an unexpected error. Check the logged Discord error code against the API documentation and https://discordstatus.com.',
  },
  CONFIGURATION_ERROR: {
    code: 'CONFIGURATION_ERROR',
    severity: 'fatal',
    retryable: false,
    userMessage: 'This action is currently unavailable. The team has been notified.',
    operatorHint:
      'Required configuration is missing or malformed. Run `pnpm diagnostics` — it names the exact keys.',
  },
  TIMEOUT: {
    code: 'TIMEOUT',
    severity: 'error',
    retryable: true,
    userMessage: 'That took too long to complete. Please try again.',
    operatorHint:
      'An operation exceeded its deadline. For interactions, remember Discord requires acknowledgement within 3 seconds — defer first for anything slower.',
  },

  DUPLICATE_OPERATION: {
    code: 'DUPLICATE_OPERATION',
    severity: 'debug',
    retryable: false,
    userMessage: 'This has already been recorded.',
    operatorHint:
      'The idempotency guard rejected a replay. This is the system working correctly, not a fault.',
  },
  RATE_LIMITED: {
    code: 'RATE_LIMITED',
    severity: 'info',
    retryable: true,
    userMessage: 'You are doing that a little too quickly. Please try again in a moment.',
    operatorHint:
      'A rate limit or cooldown was hit. Limits are configurable per feature.',
  },
  NOT_IMPLEMENTED: {
    code: 'NOT_IMPLEMENTED',
    severity: 'error',
    retryable: false,
    userMessage: 'This is not available yet.',
    operatorHint:
      'Reached a deliberately unimplemented path. See docs/architecture/ARCHITECTURE-PLAN.md for which phase delivers it.',
  },
  INTERNAL_ERROR: {
    code: 'INTERNAL_ERROR',
    severity: 'error',
    retryable: false,
    userMessage: 'Something went wrong. The team has been notified.',
    operatorHint:
      'Unhandled failure. The structured log carries the correlation id and cause.',
  },
};

export interface BloomErrorOptions {
  /** Overrides the catalog message for this one occurrence. Must stay user-safe. */
  readonly userMessage?: string;
  /** Overrides the catalog hint, typically to name the specific role or channel. */
  readonly operatorHint?: string;
  /** Serialisable context. Never put tokens, secrets or private report content here. */
  readonly details?: Details;
  readonly correlationId?: CorrelationId;
  readonly cause?: unknown;
}

/**
 * The only error type this platform throws deliberately.
 *
 * `message` is the operator-facing text, so it is what lands in logs. The
 * user-facing text is a separate field that the interaction error boundary
 * reads — there is no code path that can accidentally send `error.message` to a
 * Discord channel and leak internals.
 */
export class BloomError extends Error {
  public override readonly name = 'BloomError';
  public readonly code: BloomErrorCode;
  public readonly severity: LogSeverity;
  public readonly retryable: boolean;
  public readonly userMessage: string;
  public readonly operatorHint: string;
  public readonly details: Details;
  public readonly correlationId: CorrelationId | undefined;
  public readonly occurredAt: string;

  public constructor(code: BloomErrorCode, options: BloomErrorOptions = {}) {
    const descriptor = ERROR_CATALOG[code];
    const operatorHint = options.operatorHint ?? descriptor.operatorHint;
    super(
      `[${code}] ${operatorHint}`,
      options.cause === undefined ? {} : { cause: options.cause },
    );

    this.code = code;
    this.severity = descriptor.severity;
    this.retryable = descriptor.retryable;
    this.userMessage = options.userMessage ?? descriptor.userMessage;
    this.operatorHint = operatorHint;
    this.details = options.details ?? {};
    this.correlationId = options.correlationId;
    this.occurredAt = new Date().toISOString();

    // V8 always provides this; the platform targets Node exclusively.
    Error.captureStackTrace(this, BloomError);
  }

  public static is(value: unknown): value is BloomError {
    return value instanceof BloomError;
  }

  public static isCode(value: unknown, code: BloomErrorCode): value is BloomError {
    return value instanceof BloomError && value.code === code;
  }

  /**
   * Wrap an arbitrary thrown value.
   *
   * Everything that crosses a boundary ends up here, so that downstream code
   * only ever has to reason about one error type.
   */
  public static from(
    value: unknown,
    fallback: BloomErrorCode = 'INTERNAL_ERROR',
  ): BloomError {
    if (value instanceof BloomError) return value;
    if (value instanceof Error) {
      return new BloomError(fallback, {
        operatorHint: `${ERROR_CATALOG[fallback].operatorHint} Underlying: ${value.message}`,
        cause: value,
      });
    }
    return new BloomError(fallback, {
      details: { thrown: typeof value },
      cause: value,
    });
  }

  /**
   * Log/audit representation. Deliberately omits the stack: stacks go to the
   * logger's dedicated `stack` field, where the sink can drop them in
   * production without also dropping the useful context.
   */
  public toJSON(): JsonObject {
    return {
      name: this.name,
      code: this.code,
      severity: this.severity,
      retryable: this.retryable,
      operator_hint: this.operatorHint,
      details: this.details,
      correlation_id: this.correlationId ?? null,
      occurred_at: this.occurredAt,
    };
  }
}

/** Terse constructor for the common case. */
export function bloomError(
  code: BloomErrorCode,
  options?: BloomErrorOptions,
): BloomError {
  return new BloomError(code, options);
}

export function isErrorCode(value: unknown): value is BloomErrorCode {
  return typeof value === 'string' && (ERROR_CODES as readonly string[]).includes(value);
}
