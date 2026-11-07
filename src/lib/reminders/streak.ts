/**
 * Streak math for reminders — pure, so the same rule runs in the browser and
 * in the push edge function.
 *
 * The rule itself is the shared one (lib/stats): a streak is a run of
 * consecutive logged days that is still alive — it ends today (already
 * ticked) or yesterday (still saveable). A run that ended earlier is not a
 * streak worth naming — the copy engine only speaks about runs of 2+ anyway.
 * This module stays as the reminders-facing name for it.
 */

import { currentStreak } from "@/lib/stats";

const DAY_MS = 86_400_000;

export const dayBefore = (date: string, days = 1): string => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setTime(d.getTime() - days * DAY_MS);
  return d.toISOString().slice(0, 10);
};

/** The live streak for a set of logged dates, as of `today` — see lib/stats. */
export function habitStreak(loggedDates: ReadonlySet<string>, today: string): number {
  return currentStreak(loggedDates, today);
}
