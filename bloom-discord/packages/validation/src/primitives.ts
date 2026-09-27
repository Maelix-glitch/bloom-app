import { z } from 'zod';
import { DISCORD_LIMITS } from '@bloom/utils';

/**
 * Shared schema primitives.
 *
 * Every untrusted value — slash command options, modal fields, environment
 * variables, webhook payloads — is parsed through one of these before it
 * reaches a service. The brief's rule "never trust client-supplied role ids
 * without server-side validation" starts here, and is completed by the
 * authorization layer checking that the *validated* id is one we configured.
 */

/** A Discord snowflake as a string. Never coerced to a number. */
export const snowflakeSchema = z
  .string()
  .regex(/^[0-9]{17,20}$/, 'Must be a Discord ID (17–20 digits).');

/** Optional snowflake that treats empty string as absent, for .env ergonomics. */
export const optionalSnowflakeSchema = z
  .string()
  .trim()
  .transform((value) => (value === '' ? undefined : value))
  .pipe(snowflakeSchema.optional());

/** `10m`, `2h`, `7d`. Parsed to milliseconds by `parseDuration` downstream. */
export const durationSchema = z
  .string()
  .trim()
  .regex(/^\d+\s*[smhdw]$/i, 'Use a duration like 10m, 2h or 7d.');

/**
 * A moderation or report reason.
 *
 * Required and non-trivial: an action with no stated reason is one nobody can
 * review later. Capped at Discord's audit-log reason limit so the same string
 * can be passed straight through to the API.
 */
export const reasonSchema = z
  .string()
  .trim()
  .min(3, 'Give a reason of at least 3 characters.')
  .max(
    DISCORD_LIMITS.auditLogReason,
    `Keep the reason under ${String(DISCORD_LIMITS.auditLogReason)} characters.`,
  );

export const optionalReasonSchema = reasonSchema.optional();

/** Free text destined for an embed description. */
export const descriptionSchema = z
  .string()
  .trim()
  .min(1)
  .max(DISCORD_LIMITS.embedDescription);

/** Booleans as written in .env files, where everything is a string. */
export const envBooleanSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.enum(['true', 'false', '1', '0', 'yes', 'no', 'on', 'off']))
  .transform((value) => ['true', '1', 'yes', 'on'].includes(value));

/** Positive integer from an env string, with bounds. */
/**
 * An IANA time zone name.
 *
 * Validated by asking the platform's own tz database rather than matching a
 * pattern — `Europe/Londen` is correctly shaped and does not exist, and the
 * failure would otherwise surface as a job silently running at the wrong hour.
 * Node 24 ships full ICU, so this is a real lookup.
 */
export const timezoneSchema = z
  .string()
  .trim()
  .refine(
    (value) => {
      try {
        new Intl.DateTimeFormat('en-GB', { timeZone: value });
        return true;
      } catch {
        return false;
      }
    },
    {
      message:
        'Not a recognised IANA time zone. Use a name like "Europe/London" or "Asia/Kolkata", not an offset like "GMT+1" — an offset cannot know about daylight saving.',
    },
  );

export function envIntSchema(min: number, max: number) {
  return z
    .string()
    .trim()
    .regex(/^\d+$/, 'Must be a whole number.')
    .transform((value) => Number.parseInt(value, 10))
    .pipe(z.number().int().min(min).max(max));
}

/**
 * A Postgres connection URI.
 *
 * Checks the scheme rather than the whole URL, because pooler hostnames and
 * query parameters vary between Supabase connection modes and an over-strict
 * regex here just blocks a valid deployment.
 */
export const postgresUrlSchema = z
  .string()
  .trim()
  .min(1)
  .refine(
    (value) => value.startsWith('postgres://') || value.startsWith('postgresql://'),
    'Must be a postgres:// or postgresql:// connection URI.',
  );

/**
 * A Discord bot token.
 *
 * Shape-checked only — three dot-separated base64url segments. We never log the
 * value and never assert on its content beyond this.
 */
export const discordTokenSchema = z
  .string()
  .trim()
  .min(50, 'Does not look like a Discord bot token.')
  .regex(
    /^[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{20,}$/,
    'Does not look like a Discord bot token. Copy it from Developer Portal -> Bot -> Reset Token.',
  );

export const postgresSchemaNameSchema = z
  .string()
  .trim()
  .regex(
    /^[a-z_][a-z0-9_]{0,62}$/,
    'Schema name must be lowercase letters, digits and underscores.',
  );
