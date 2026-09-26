import type { Brand } from './brand.js';

/**
 * A Discord snowflake.
 *
 * Stored and passed as a string everywhere. Snowflakes are 64-bit and exceed
 * `Number.MAX_SAFE_INTEGER`, so parsing one into a JS number corrupts it — and
 * the corruption is subtle, because the first 15 digits still look right.
 */
export type Snowflake = Brand<string, 'Snowflake'>;

export type UserId = Brand<string, 'UserId'>;
export type GuildId = Brand<string, 'GuildId'>;
export type ChannelId = Brand<string, 'ChannelId'>;
export type RoleId = Brand<string, 'RoleId'>;
export type MessageId = Brand<string, 'MessageId'>;
export type ApplicationId = Brand<string, 'ApplicationId'>;
export type InteractionId = Brand<string, 'InteractionId'>;

/** Ties every log line, audit row and error raised while handling one interaction together. */
export type CorrelationId = Brand<string, 'CorrelationId'>;

/** Human-quotable case reference, e.g. `BLM-7F3K2Q`. */
export type CaseId = Brand<string, 'CaseId'>;

/** Key that makes an operation safe to replay. */
export type IdempotencyKey = Brand<string, 'IdempotencyKey'>;

/**
 * Discord snowflakes are 17–20 digits today. The lower bound excludes obvious
 * junk; the upper bound leaves room for the epoch to advance.
 */
const SNOWFLAKE_PATTERN = /^[0-9]{17,20}$/;

export function isSnowflake(value: unknown): value is Snowflake {
  return typeof value === 'string' && SNOWFLAKE_PATTERN.test(value);
}

/**
 * Narrow an untrusted string to a snowflake.
 *
 * Returns `null` rather than throwing, because the overwhelmingly common caller
 * is validation of user- or config-supplied input, where a thrown exception is
 * the wrong control flow.
 */
export function toSnowflake(value: unknown): Snowflake | null {
  return isSnowflake(value) ? value : null;
}

/**
 * Assert a value we already believe to be a snowflake.
 *
 * Only for values that came from Discord itself (interaction payloads, gateway
 * events). Never call this on user input — use {@link toSnowflake}.
 */
// The type parameter is the API: it picks which branded id the caller wants.
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function unsafeSnowflake<T extends string = Snowflake>(value: string): T {
  return value as T;
}
