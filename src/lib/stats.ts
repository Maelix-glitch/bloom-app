/**
 * The record's headline numbers — one definition each, shared by every
 * surface that prints them.
 *
 * Mood, Rewards, Profile and the weekly report all talk about the same
 * person's record, so a "streak", a "day logged" and an "average mood" must
 * mean the same thing on every screen. Before this module each surface kept
 * its own copy of the arithmetic, and the copies were free to drift: the
 * profile counted a screen-only day as logged while the Rewards balance
 * goal did not, and Mood Intelligence's trend line averaged days while the
 * Mood headline averaged entries, so the two could move in opposite
 * directions over the same period.
 *
 * The definitions held here:
 *
 *   · **Streak** — a run of consecutive logged days that is still alive: it
 *     ends today (already logged) or yesterday (today is still open, so the
 *     run is at risk but not broken). Anything older is over, and counts 0.
 *   · **Longest streak** — the longest such run anywhere in the record.
 *   · **A logged day (trackers)** — a day carrying at least one tracker
 *     signal: sleep, water, study, movement, energy or screen. The signal
 *     count is how many of the six the day carries.
 *   · **Average mood** — the entry-weighted mean of check-ins: every
 *     check-in counts once, so a day with three check-ins weighs three
 *     times a day with one. (A per-day mean is a different statistic —
 *     useful inside a series, but it is not "average mood" and no surface
 *     should present it as such.)
 *
 * Pure, like the rest of the record math: local `YYYY-MM-DD` day keys in,
 * numbers out. Day arithmetic goes through `lib/localDay`, the one place
 * that decides which day a moment belongs to.
 */

import { shiftDay } from "@/lib/localDay";

/**
 * The live streak for a set of logged day keys, as of `today`.
 *
 *   · today logged     → count backwards from today
 *   · only yesterday   → count backwards from yesterday (still saveable)
 *   · otherwise        → 0
 *
 * Future-dated keys never extend a streak: the run is anchored to today or
 * yesterday, never to a day that hasn't happened.
 */
export function currentStreak(loggedDates: Iterable<string>, today: string): number {
  const days = loggedDates instanceof Set ? loggedDates : new Set(loggedDates);
  let cursor = days.has(today) ? today : shiftDay(today, -1);
  if (!days.has(cursor)) return 0;
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = shiftDay(cursor, -1);
  }
  return streak;
}

/** The longest run of consecutive day keys anywhere in the set. */
export function longestStreak(loggedDates: Iterable<string>): number {
  const sorted = [...new Set(loggedDates)].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const day of sorted) {
    run = prev !== null && shiftDay(prev, 1) === day ? run + 1 : 1;
    if (run > best) best = run;
    prev = day;
  }
  return best;
}

/**
 * Average mood over a set of check-ins — entry-weighted, or null when
 * there is nothing to average. Unrounded on purpose: rounding to a
 * surface's display precision is that surface's presentation choice, the
 * mean itself is defined once, here.
 */
export function averageMood(entries: readonly { mood: number }[]): number | null {
  if (entries.length === 0) return null;
  return entries.reduce((sum, e) => sum + e.mood, 0) / entries.length;
}

/**
 * The six tracker signals a day can carry, in the shape every record
 * already projects them to. Study arrives as both minutes and a session
 * count because the stores keep both; either one present means the day
 * carries the signal.
 */
export interface DaySignals {
  sleepMinutes: number | null;
  waterMl: number | null;
  studyMinutes: number;
  studySessions: number;
  movementMinutes: number | null;
  energy: number | null;
  screenMinutes: number | null;
}

/** How many of the six tracker signals a day carries (0–6). */
export function daySignalCount(signals: DaySignals): number {
  let n = 0;
  if (signals.sleepMinutes !== null) n += 1;
  if (signals.waterMl !== null) n += 1;
  if (signals.studySessions > 0 || signals.studyMinutes > 0) n += 1;
  if (signals.movementMinutes !== null) n += 1;
  if (signals.energy !== null) n += 1;
  if (signals.screenMinutes !== null) n += 1;
  return n;
}

/** A tracker day counts as logged when it carries at least one signal. */
export function dayHasSignal(signals: DaySignals): boolean {
  return daySignalCount(signals) > 0;
}
