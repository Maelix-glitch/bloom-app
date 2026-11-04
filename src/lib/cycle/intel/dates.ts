/**
 * Date-only arithmetic for Cycle Intelligence.
 *
 * Every cycle event is a *local calendar day*, never an instant. All maths
 * here runs on UTC midnights derived from the YYYY-MM-DD key, which makes a
 * DST transition (23- or 25-hour day) unable to move a logged date. Formatting
 * pins `timeZone: "UTC"` for the same reason.
 */

const DAY_MS = 86_400_000;
const KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True for a real calendar day (rejects 2025-02-31 and 2025-2-3). */
export function isDateKey(key: unknown): key is string {
  if (typeof key !== "string") return false;
  const m = KEY_RE.exec(key);
  if (!m) return false;
  const [, y, mo, d] = m;
  const year = Number(y);
  const month = Number(mo);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}

/** Days since the Unix epoch for a date key. Date keys only. */
export function dayIndex(key: string): number {
  return Math.round(Date.parse(`${key}T00:00:00Z`) / DAY_MS);
}

/** Shift a date key by whole days. */
export function addDays(key: string, days: number): string {
  const d = new Date((dayIndex(key) + days) * DAY_MS);
  return d.toISOString().slice(0, 10);
}

/** Whole days from `from` to `to`; negative when `to` is earlier. */
export function diffDays(from: string, to: string): number {
  return dayIndex(to) - dayIndex(from);
}

/** The later of two date keys. */
export function maxKey(a: string, b: string): string {
  return a >= b ? a : b;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** "14 Nov" — stable across locales and timezones. */
export function shortDay(key: string): string {
  const [, m, d] = key.split("-");
  return `${Number(d)} ${MONTHS[Number(m) - 1] ?? "?"}`;
}

/** "14 Nov 2026". */
export function longDay(key: string): string {
  return `${shortDay(key)} ${key.slice(0, 4)}`;
}

/** Inclusive range label, collapsing a one-day window. */
export function rangeLabel(from: string, to: string): string {
  if (from === to) return shortDay(from);
  return `${shortDay(from)} – ${shortDay(to)}`;
}

/** Sorted, de-duplicated list of date keys. */
export function sortedKeys(keys: Iterable<string>): string[] {
  return [...new Set(keys)].filter(isDateKey).sort((a, b) => a.localeCompare(b));
}
