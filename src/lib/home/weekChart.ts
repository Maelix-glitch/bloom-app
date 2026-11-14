/**
 * The week chart's data — habit ticks per day, this week against the week
 * before, read straight off the same logs the Overview synthesis counts.
 *
 * Pure and honest: a tick is a log row, a day with no ticks is a zero, and
 * the windows are the synthesis's own pair (last 7 days ending today, and
 * the 7 days before those). No due-rule reinvention — this counts what was
 * ticked, and says so.
 */

import { shiftDay } from "@/lib/localDay";

export interface WeekTicks {
  /** Weekday labels for the last 7 days, oldest → today. */
  labels: string[];
  /** Ticks per day, last 7 days, oldest → today. */
  thisWeek: number[];
  /** Ticks per day, the 7 days before, oldest → newest. */
  prevWeek: number[];
  totalThis: number;
  totalPrev: number;
}

export function weekTicks(logs: readonly { date: string }[], today: string): WeekTicks {
  const perDay = new Map<string, number>();
  for (const l of logs) perDay.set(l.date, (perDay.get(l.date) ?? 0) + 1);

  const days = (offsetFrom: number, offsetTo: number): string[] => {
    const out: string[] = [];
    for (let o = offsetFrom; o <= offsetTo; o++) out.push(shiftDay(today, o));
    return out;
  };
  const count = (ds: string[]) => ds.map((d) => perDay.get(d) ?? 0);
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

  const thisDays = days(-6, 0);
  const thisWeek = count(thisDays);
  const prevWeek = count(days(-13, -7));
  return {
    labels: thisDays.map((d) =>
      new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" }),
    ),
    thisWeek,
    prevWeek,
    totalThis: sum(thisWeek),
    totalPrev: sum(prevWeek),
  };
}
