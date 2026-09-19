/**
 * Streak math for reminders — pure, so the same rule runs in the browser and
 * in the push edge function.
 *
 * A streak is a run of consecutive logged days that is still alive: it ends
 * today (already ticked) or yesterday (still saveable). A run that ended
 * earlier is not a streak worth naming — the copy engine only speaks about
 * runs of 2+ anyway.
 */

const DAY_MS = 86_400_000;

export const dayBefore = (date: string, days = 1): string => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setTime(d.getTime() - days * DAY_MS);
  return d.toISOString().slice(0, 10);
};

/**
 * The live streak for a set of logged dates, as of `today`.
 *
 *   · today logged     → count backwards from today
 *   · only yesterday   → count backwards from yesterday (the run is at risk,
 *     but it is still a run)
 *   · otherwise        → 0
 */
export function habitStreak(loggedDates: ReadonlySet<string>, today: string): number {
  const start = loggedDates.has(today)
    ? today
    : loggedDates.has(dayBefore(today))
      ? dayBefore(today)
      : null;
  if (!start) return 0;
  let streak = 0;
  let cursor = start;
  while (loggedDates.has(cursor)) {
    streak += 1;
    cursor = dayBefore(cursor);
  }
  return streak;
}
