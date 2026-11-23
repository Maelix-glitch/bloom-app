/**
 * The COMPLETE logged day (M-219, audit F-11) — the day definition
 * the learning paths (plan adaptation, expenditure estimation) read.
 *
 * Before M-219, a "logged day" in those paths was any day holding at
 * least one entry: a day on which a person logged a single 40 kcal
 * item was arithmetically indistinguishable from a fully logged day.
 * Partial logging manufactured spuriously low "average intake" —
 * plans leaned protein-first on two such days, and the expenditure
 * estimator averaged the same fiction into a maintenance estimate
 * that fed target adjustments. The M-153 case (2 days averaging
 * 23 g protein against a 171 g target) was the design operating as
 * written.
 *
 * A complete logged day is a day whose entries span at least two
 * different meals and number at least two — the smallest shape that
 * looks like a day of eating rather than a fragment of one. It is a
 * deliberately separate definition from the streak/logged-day
 * definition in the tracker layer (M-192: "a local date with at
 * least one entry in any area"), which answers a different question
 * — "did the person show up?" — and is NOT changed by this module.
 * This one answers "is this day's record whole enough to learn
 * from?", and only the learning paths ask it.
 */

import type { LogEntry } from "./types";

export interface LoggedDayTotals {
  day: string;
  kcal: number;
  proteinG: number;
  entries: number;
  meals: number;
}

/** The completeness rule, as constants so tests and copy agree. */
export const COMPLETE_DAY_MIN_ENTRIES = 2;
export const COMPLETE_DAY_MIN_MEALS = 2;

export function isCompleteLoggedDay(totals: { entries: number; meals: number }): boolean {
  return totals.entries >= COMPLETE_DAY_MIN_ENTRIES && totals.meals >= COMPLETE_DAY_MIN_MEALS;
}

/** Per-day totals for every day in the log, complete or not. */
export function loggedDayTotals(entries: readonly LogEntry[]): Map<string, LoggedDayTotals> {
  const byDay = new Map<string, LoggedDayTotals & { mealSet: Set<string> }>();
  for (const entry of entries) {
    const totals = byDay.get(entry.day) ?? {
      day: entry.day,
      kcal: 0,
      proteinG: 0,
      entries: 0,
      meals: 0,
      mealSet: new Set<string>(),
    };
    totals.kcal += entry.nutrients.kcal;
    totals.proteinG += entry.nutrients.proteinG;
    totals.entries += 1;
    totals.mealSet.add(entry.meal);
    totals.meals = totals.mealSet.size;
    byDay.set(entry.day, totals);
  }
  const out = new Map<string, LoggedDayTotals>();
  for (const [day, totals] of byDay) {
    out.set(day, {
      day: totals.day,
      kcal: totals.kcal,
      proteinG: totals.proteinG,
      entries: totals.entries,
      meals: totals.meals,
    });
  }
  return out;
}

/** The complete logged days only — the days a learning path may read. */
export function completeLoggedDayTotals(
  entries: readonly LogEntry[],
): Map<string, LoggedDayTotals> {
  const out = new Map<string, LoggedDayTotals>();
  for (const [day, totals] of loggedDayTotals(entries)) {
    if (isCompleteLoggedDay(totals)) out.set(day, totals);
  }
  return out;
}
