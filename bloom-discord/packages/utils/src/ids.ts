import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { CaseId, IdempotencyKey } from '@bloom/shared-types';

/**
 * Case reference alphabet: Crockford base32 without I, L, O and U.
 *
 * Case ids get read aloud in voice channels and typed back into `/report-status`
 * by people who are usually upset at the time. Removing the characters that are
 * confusable with 1/0 and the ones that spell unfortunate words is worth the
 * small loss of entropy.
 */
const CASE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const CASE_LENGTH = 6;

export function newUuid(): string {
  return randomUUID();
}

/**
 * Generate a human-quotable case reference, e.g. `BLM-7F3K2Q`.
 *
 * 32^6 ≈ 1.07 billion. Collisions are still possible, so the database keeps a
 * unique constraint on the column and the caller retries — the id is for
 * humans, the primary key is a UUID.
 */
export function newCaseId(prefix = 'BLM'): CaseId {
  const bytes = randomBytes(CASE_LENGTH);
  let out = '';
  for (const byte of bytes) {
    out += CASE_ALPHABET.charAt(byte % CASE_ALPHABET.length);
  }
  return `${prefix}-${out}` as CaseId;
}

/**
 * Build a deterministic idempotency key from its parts.
 *
 * Deterministic is the whole point: the same logical operation must produce the
 * same key on a retry, a double-clicked button or a redelivered gateway event,
 * so the database can reject the duplicate. Hashing keeps keys a fixed width and
 * avoids embedding raw user input in a column that appears in logs.
 */
export function idempotencyKey(...parts: readonly (string | number)[]): IdempotencyKey {
  const material = parts.map((part) => String(part)).join('\u241f');
  return createHash('sha256')
    .update(material)
    .digest('hex')
    .slice(0, 48) as IdempotencyKey;
}

/**
 * Stable short hash, for log-friendly fingerprints of long values.
 * Not a security primitive and not reversible — do not use it to "redact" a secret.
 */
export function shortHash(value: string, length = 12): string {
  return createHash('sha256').update(value).digest('hex').slice(0, length);
}
