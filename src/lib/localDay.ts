/**
 * Local calendar days — the one place that turns a timestamp into "which
 * day was that, for the person holding the phone".
 *
 * Mood entries, habit logs and journey stats are keyed by day. An ISO
 * timestamp's first ten characters are the UTC day, which is the wrong day
 * for anyone east of Greenwich in the late evening (India, 22:30 → UTC
 * 17:00 same day, fine; but 02:00 IST is still "yesterday" in UTC) and for
 * anyone west of it in the early morning. Every day-keying path goes through
 * these helpers so a 1 a.m. check-in lands on the day it was made, streaks
 * don't break at midnight UTC, and "logged today" agrees with the clock on
 * the wall.
 */

const pad = (n: number) => String(n).padStart(2, "0");

/** `YYYY-MM-DD` of a Date in the device's local time zone. */
export function localDayOf(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * `YYYY-MM-DD` (local) for an ISO timestamp. A bare date (`2026-09-07`) or
 * an unparseable value falls back to its first ten characters so old rows
 * that only carried a `date` keep working.
 */
export function localDay(iso: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return localDayOf(d);
}

/** Local `HH:MM` for an ISO timestamp — for "logged at 23:40" labels. */
export function localTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(11, 16);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Today's local day key. */
export function todayLocal(now: Date = new Date()): string {
  return localDayOf(now);
}

/** Shift a `YYYY-MM-DD` key by whole days, calendar-safe (no DST drift). */
export function shiftDay(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d! + days));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/* --------------------- day counting (Brief v6 §1.1–1.2) -------------------- */

/**
 * The one vocabulary for counting days, so no surface can invent its own:
 *
 *   · a PAIRED day has BOTH sides logged on that local date — counted by
 *     `pairedDays`, the set intersection of the two sides' day lists. A
 *     counter that reads only one side (mood days dressed up as "paired
 *     days", M-112) is the bug this section exists to prevent.
 *   · an ANY-LOG day has at least one entry in ANY area — a date present
 *     in the union of the areas' day lists (`unionDayCount`,
 *     `isAnyLogDay`). A per-area TRACKED day is membership in that area's
 *     own list, and surfaces must label which of the two they mean
 *     (M-113: "8 days with any log" vs "1 day with trackers").
 *
 * Inputs are local day keys (`YYYY-MM-DD`, see above); duplicates and
 * ordering never matter.
 */

/** A list of day keys as a set — duplicates collapse. */
export function daySet(dates: readonly string[]): Set<string> {
  return new Set(dates);
}

/** How many local dates appear in BOTH lists — the paired-day count. */
export function pairedDays(aDates: readonly string[], bDates: readonly string[]): number {
  const b = daySet(bDates);
  let n = 0;
  for (const d of daySet(aDates)) if (b.has(d)) n += 1;
  return n;
}

/** How many distinct local dates appear in ANY of the lists. */
export function unionDayCount(...lists: readonly (readonly string[])[]): number {
  const all = new Set<string>();
  for (const list of lists) for (const d of list) all.add(d);
  return all.size;
}

/** True when the date carries at least one entry in any of the areas. */
export function isAnyLogDay(date: string, ...lists: readonly (readonly string[])[]): boolean {
  return lists.some((list) => daySet(list).has(date));
}
