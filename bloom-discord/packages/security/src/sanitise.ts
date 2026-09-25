import { DISCORD_LIMITS, sanitiseUserText, shortHash } from '@bloom/utils';

/**
 * Input handling for content that will be stored and later displayed.
 *
 * The distinction that matters: sanitising for *storage* and sanitising for
 * *display* are different jobs. We store the member's words as they typed them
 * (minus control characters), because a moderation reason that has been
 * markdown-escaped on the way into the database is a reason that reads wrong in
 * every export and every audit review. Escaping happens at render time.
 */

/** Clean free text for storage: control characters out, length bounded, nothing else. */
export function sanitiseForStorage(input: string, maxLength: number): string {
  const cleaned = input
    // eslint-disable-next-line no-control-regex -- deliberately targeting control chars
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .trim();
  return cleaned.length > maxLength ? cleaned.slice(0, maxLength) : cleaned;
}

/** Clean free text for display in Discord: escaped, mentions neutralised, truncated. */
export function sanitiseForDisplay(
  input: string,
  // Annotated `number` deliberately: `DISCORD_LIMITS` is `as const`, so an
  // inferred default would fix the parameter's type at the literal 4096 and
  // reject every other budget a caller might have.
  maxLength: number = DISCORD_LIMITS.embedDescription,
): string {
  return sanitiseUserText(input, maxLength);
}

/** A moderation or report reason, bounded to what Discord's audit log accepts. */
export function sanitiseReason(input: string): string {
  return sanitiseForStorage(input, DISCORD_LIMITS.auditLogReason);
}

/**
 * A reference to private content, for logs and audit rows.
 *
 * The brief forbids logging full private report contents, but an operator still
 * needs to be able to tell whether two log lines concern the same report. A
 * short hash gives correlation without disclosure — it cannot be reversed to
 * recover what someone wrote.
 */
export function contentFingerprint(content: string): string {
  return shortHash(content, 12);
}

/**
 * Validate a component custom id.
 *
 * Custom ids come back from Discord carrying whatever we put in them, and they
 * are the input to our own routing. Constraining the shape means a malformed or
 * hand-crafted id is rejected at the boundary rather than matched against a
 * route by accident.
 */
const CUSTOM_ID_PATTERN = /^[a-z]+:[a-z-]+:[a-z-]+(?::[A-Za-z0-9_-]{1,64})?$/;

export function isValidCustomId(value: string): boolean {
  // Discord's own hard limit is 100 characters.
  return value.length <= 100 && CUSTOM_ID_PATTERN.test(value);
}

/** Build a namespaced custom id: `guardian:onboarding:start`. */
export function customId(
  bot: string,
  feature: string,
  action: string,
  argument?: string,
): string {
  const base = `${bot}:${feature}:${action}`;
  const full = argument === undefined ? base : `${base}:${argument}`;
  if (full.length > 100) {
    throw new Error(
      `Custom id "${full}" exceeds Discord's 100-character limit. Store the payload and reference it by id instead.`,
    );
  }
  return full;
}

export interface ParsedCustomId {
  readonly bot: string;
  readonly feature: string;
  readonly action: string;
  readonly argument: string | null;
}

export function parseCustomId(value: string): ParsedCustomId | null {
  if (!isValidCustomId(value)) return null;
  const [bot, feature, action, argument] = value.split(':');
  if (!bot || !feature || !action) return null;
  return { bot, feature, action, argument: argument ?? null };
}
