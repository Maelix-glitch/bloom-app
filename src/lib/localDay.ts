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
