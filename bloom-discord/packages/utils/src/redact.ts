import type { JsonObject, JsonValue } from '@bloom/shared-types';

/**
 * Secret redaction.
 *
 * The brief forbids logging tokens, secrets, database passwords and API keys.
 * "Be careful not to log secrets" is not a control — someone will eventually
 * log an error object whose `cause` is a connection failure containing the full
 * DSN, password included.
 *
 * So redaction is applied unconditionally to everything on its way to a sink,
 * by key name and by value shape. It is cheap and it fails safe.
 */
const REDACTED = '[redacted]';

/** Key fragments that mark a value as secret, matched case-insensitively. */
const SENSITIVE_KEY_FRAGMENTS: readonly string[] = [
  'token',
  'secret',
  'password',
  'passwd',
  'apikey',
  'api_key',
  'authorization',
  'auth',
  'credential',
  'private_key',
  'privatekey',
  'session',
  'cookie',
  'dsn',
  'connection_string',
  'connectionstring',
  'database_url',
  'databaseurl',
  'service_role',
  'servicerole',
  'bearer',
  'signature',
  'webhook_url',
];

/**
 * Value patterns that are secrets wherever they appear, whatever the key is
 * called. These catch the case where a secret is embedded in a free-text
 * message rather than sitting under a helpfully-named key.
 */
const SENSITIVE_VALUE_PATTERNS: readonly RegExp[] = [
  // Discord bot token: base64url(user id).base64url(timestamp).base64url(hmac)
  /\b[A-Za-z0-9_-]{23,28}\.[A-Za-z0-9_-]{6,7}\.[A-Za-z0-9_-]{27,40}\b/g,
  // Any postgres/mysql URI carrying inline credentials
  /\b(?:postgres(?:ql)?|mysql):\/\/[^\s:@/]+:[^\s@]+@/gi,
  // JWT (Supabase anon/service-role keys are JWTs)
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
  // Bearer header value
  /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/gi,
];

export function isSensitiveKey(key: string): boolean {
  const normalised = key.toLowerCase().replace(/[^a-z_]/g, '');
  return SENSITIVE_KEY_FRAGMENTS.some((fragment) =>
    normalised.includes(fragment.replace(/[^a-z_]/g, '')),
  );
}

/** Scrub secret-shaped substrings out of free text. */
export function redactString(value: string): string {
  let out = value;
  for (const pattern of SENSITIVE_VALUE_PATTERNS) {
    // `lastIndex` is shared state on a global regex; reset before each use.
    pattern.lastIndex = 0;
    out = out.replace(pattern, REDACTED);
  }
  return out;
}

/**
 * Show enough of an identifier to correlate it, never enough to use it.
 * Useful for client ids in diagnostics output.
 */
export function maskIdentifier(value: string, visible = 4): string {
  if (value.length <= visible * 2) return REDACTED;
  return `${value.slice(0, visible)}…${value.slice(-visible)}`;
}

/**
 * Deep-redact an arbitrary structure.
 *
 * Depth-limited because a cyclic or pathologically nested object from a library
 * error should degrade to a marker, not hang the logger.
 */
export function redact(value: JsonValue, depth = 0): JsonValue {
  if (depth > 8) return '[depth-limit]';

  if (typeof value === 'string') return redactString(value);
  if (value === null || typeof value === 'number' || typeof value === 'boolean')
    return value;

  if (Array.isArray(value)) {
    return value.map((entry) => redact(entry, depth + 1));
  }

  const out: JsonObject = {};
  for (const [key, entry] of Object.entries(value)) {
    out[key] = isSensitiveKey(key) ? REDACTED : redact(entry, depth + 1);
  }
  return out;
}

export function redactObject(value: JsonObject): JsonObject {
  return redact(value) as JsonObject;
}
