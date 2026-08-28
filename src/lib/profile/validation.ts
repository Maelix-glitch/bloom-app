/**
 * Bloom — Profile validation. Human-readable messages only; the database
 * constraints in the migration mirror these rules and remain authoritative.
 */

export const NAME_MIN = 2;
export const NAME_MAX = 48;
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;
export const BIO_MAX = 200;

const RESERVED = new Set([
  "admin",
  "administrator",
  "api",
  "bloom",
  "coach",
  "cycle",
  "help",
  "index",
  "login",
  "logout",
  "mood",
  "not-found",
  "privacy",
  "profile",
  "rewards",
  "root",
  "settings",
  "signin",
  "signout",
  "signup",
  "story",
  "stories",
  "support",
  "today",
  "trackers",
  "user",
  "users",
]);

export function validateDisplayName(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return "A name helps — it's what your space is called.";
  if (trimmed.length < NAME_MIN) return "That feels a little short.";
  if (trimmed.length > NAME_MAX) return "Keep it under 48 characters so it never gets cut off.";
  if (/[<>]|javascript:|onerror/i.test(trimmed))
    return "That name includes characters we can't use.";
  return null;
}

export function validateUsername(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  if (trimmed.length === 0) return "Pick something you'd be happy to see in a link.";
  if (trimmed.length < USERNAME_MIN) return "Usernames need at least 3 characters.";
  if (trimmed.length > USERNAME_MAX) return "Usernames can be up to 30 characters.";
  if (!/^[a-z0-9_]+$/.test(trimmed)) return "Use lowercase letters, numbers, and underscores only.";
  if (/^_|_$/.test(trimmed)) return "Underscores can't sit at the start or the end.";
  if (RESERVED.has(trimmed)) return "That one's taken — it belongs to Bloom itself.";
  return null;
}

export function validateBio(value: string): string | null {
  if (value.length > BIO_MAX) return "Bios stay quiet here — 200 characters at most.";
  return null;
}

export function normalizeUsername(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .replace(/^_+|_+$/g, "")
    .slice(0, USERNAME_MAX);
}
