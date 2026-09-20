/**
 * noticed.ts — "Bloom noticed", the cross-record intelligence layer.
 *
 * Where the older insight generators repeated one record at a time, these
 * read *across* the person's data: a habit run that is alive right now, a
 * tracker drifting week over week, the shape of their week against their
 * weekends — and surface the one or two most alive observations for today.
 *
 * House rules, inherited from every cycle/coach surface: each observation
 * cites its evidence, hides below a minimum sample, never diagnoses, and
 * never touches the cycle (the phase card and cycle insights own that
 * voice). Pure functions — the stores are read by callers.
 */

import { type DayEntry, type TrackerId, trackerDef } from "@/lib/trackers/core";
import type { Habit, HabitLog } from "@/lib/home/habits";
import { streakOf } from "@/lib/home/habits";
import type { SignalId } from "@/lib/home/today";

export interface NoticedItem {
  id: string;
  signal: SignalId;
  title: string;
  sub: string;
}

/** ISO date arithmetic on "YYYY-MM-DD" strings (local, noon-anchored). */
function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const TREND_TRACKERS: TrackerId[] = ["sleep", "water", "study", "movement", "screen"];

/** Smallest week-over-week move (stored units) worth speaking about. */
const TREND_FLOOR: Partial<Record<TrackerId, number>> = {
  sleep: 20,
  water: 150,
  study: 30,
  movement: 15,
  screen: 30,
};

const TREND_NOUN: Partial<Record<TrackerId, string>> = {
  sleep: "a night",
  water: "a day",
  study: "a day",
  movement: "a day",
  screen: "a day",
};

function trackerValueOf(day: DayEntry, id: TrackerId): number | null {
  switch (id) {
    case "study":
      return day.sessions.reduce((sum, s) => sum + s.minutes, 0);
    case "sleep":
      return day.sleepMinutes;
    case "water":
      return day.waterMl;
    case "movement":
      return day.movementMinutes;
    case "energy":
      return day.energy;
    default:
      return day.screenMinutes;
  }
}

/** Mean of the logged values inside [from, to] (inclusive ISO dates). */
function windowMean(days: readonly DayEntry[], id: TrackerId, from: string, to: string) {
  const values: number[] = [];
  for (const d of days) {
    if (d.date >= from && d.date <= to) {
      const v = trackerValueOf(d, id);
      if (v !== null && v > 0) values.push(v);
    }
  }
  if (values.length === 0) return null;
  return { mean: values.reduce((a, b) => a + b, 0) / values.length, n: values.length };
}

export interface TrendFinding {
  id: TrackerId;
  /** Stored units this week minus last week. */
  delta: number;
  /** Mean across the logged days of this week. */
  thisWeek: number;
  nThis: number;
  nPrev: number;
  up: boolean;
}

/** The strongest week-over-week tracker trend, or null below the evidence floor. */
export function strongestTrackerTrend(
  days: readonly DayEntry[],
  today: string,
): TrendFinding | null {
  const startThis = shiftDate(today, -6);
  const endPrev = shiftDate(today, -7);
  const startPrev = shiftDate(today, -13);
  let best: TrendFinding | null = null;
  let bestShare = 0;
  for (const id of TREND_TRACKERS) {
    const thisWeek = windowMean(days, id, startThis, today);
    const prev = windowMean(days, id, startPrev, endPrev);
    if (!thisWeek || !prev || thisWeek.n < 4 || prev.n < 4) continue;
    const floor = TREND_FLOOR[id] ?? 0;
    const delta = thisWeek.mean - prev.mean;
    if (Math.abs(delta) < floor) continue;
    const share = Math.abs(delta) / Math.max(prev.mean, 1);
    if (share > bestShare) {
      bestShare = share;
      best = {
        id,
        delta,
        thisWeek: thisWeek.mean,
        nThis: thisWeek.n,
        nPrev: prev.n,
        up: delta > 0,
      };
    }
  }
  return best;
}

export interface WeekendFinding {
  id: TrackerId;
  /** Weekday mean minus weekend mean, in stored units. */
  gap: number;
  nWeekday: number;
  nWeekend: number;
  weekendsLower: boolean;
}

/** Weekday-vs-weekend shape over three weeks, or null when it isn't consistent. */
export function weekendGap(days: readonly DayEntry[], today: string): WeekendFinding | null {
  const from = shiftDate(today, -20);
  const buckets: Record<"weekday" | "weekend", Partial<Record<TrackerId, number[]>>> = {
    weekday: {},
    weekend: {},
  };
  for (const d of days) {
    if (d.date < from || d.date > today) continue;
    const dow = new Date(`${d.date}T12:00:00`).getDay();
    const bucket = dow === 0 || dow === 6 ? "weekend" : "weekday";
    for (const id of ["water", "sleep", "screen"] as const) {
      const v = trackerValueOf(d, id);
      if (v !== null && v > 0) (buckets[bucket][id] ??= []).push(v);
    }
  }
  let best: WeekendFinding | null = null;
  let bestShare = 0;
  for (const id of ["water", "sleep", "screen"] as const) {
    const wd = buckets.weekday[id] ?? [];
    const we = buckets.weekend[id] ?? [];
    if (wd.length < 6 || we.length < 3) continue;
    const meanWd = wd.reduce((a, b) => a + b, 0) / wd.length;
    const meanWe = we.reduce((a, b) => a + b, 0) / we.length;
    if (meanWd <= 0) continue;
    const gap = meanWd - meanWe;
    const share = Math.abs(gap) / meanWd;
    if (share >= 0.2 && share > bestShare) {
      bestShare = share;
      best = {
        id,
        gap,
        nWeekday: wd.length,
        nWeekend: we.length,
        weekendsLower: gap > 0,
      };
    }
  }
  return best;
}

/** The habit run that is alive right now and still open today. */
export function openStreak(
  habits: readonly Habit[],
  logs: readonly HabitLog[],
  today: string,
): { habit: Habit; streak: number } | null {
  const doneToday = new Set(logs.filter((l) => l.date === today).map((l) => l.habitId));
  let best: { habit: Habit; streak: number } | null = null;
  for (const habit of habits) {
    if (doneToday.has(habit.id)) continue;
    const streak = streakOf(habit, logs, today);
    if (streak >= 3 && (!best || streak > best.streak)) best = { habit, streak };
  }
  return best;
}

/* --------------------------------- assembly -------------------------------- */

export function noticedOf(input: {
  days: readonly DayEntry[];
  habits: readonly Habit[];
  logs: readonly HabitLog[];
  today: string;
  limit?: number;
}): NoticedItem[] {
  const { days, habits, logs, today } = input;
  const limit = input.limit ?? 2;
  const out: NoticedItem[] = [];

  /* 1 — the run that's alive today: actionable before informative. */
  const streak = openStreak(habits, logs, today);
  if (streak) {
    out.push({
      id: "noticed-streak",
      signal: "habits",
      title: `Day ${streak.streak} of your ${streak.habit.name} run is still open.`,
      sub: `${streak.streak} days unbroken — today's version can be the smallest one that counts.`,
    });
  }

  /* 2 — the strongest week-over-week drift in the trackers. */
  const trend = strongestTrackerTrend(days, today);
  if (out.length < limit && trend) {
    const def = trackerDef(trend.id);
    const fmtDelta = def.format(Math.round(Math.abs(trend.delta)));
    const noun = TREND_NOUN[trend.id] ?? "a day";
    const positive = trend.up === (def.direction === "more");
    out.push({
      id: "noticed-trend",
      signal:
        trend.id === "sleep"
          ? "sleep"
          : trend.id === "study"
            ? "study"
            : trend.id === "screen"
              ? "energy"
              : "habits",
      title: positive
        ? `${def.name} is trending up — ${def.format(Math.round(trend.thisWeek))} ${noun} this week, ${fmtDelta} ${trend.up ? "more" : "less"} than the week before.`
        : `${def.name} is easing — ${def.format(Math.round(trend.thisWeek))} ${noun} this week, against ${def.format(Math.round(trend.thisWeek - trend.delta))} the week before.`,
      sub: `From ${trend.nThis} logged days against ${trend.nPrev} the week before.`,
    });
  }

  /* 3 — the shape of their week, when it's consistent enough to name. */
  const weekend = weekendGap(days, today);
  if (out.length < limit && weekend) {
    const def = trackerDef(weekend.id);
    const fmt = def.format(Math.round(Math.abs(weekend.gap)));
    out.push({
      id: "noticed-weekshape",
      signal: weekend.id === "sleep" ? "sleep" : weekend.id === "screen" ? "energy" : "habits",
      title: weekShapeTitle(weekend.id, weekend.weekendsLower, fmt),
      sub: `${weekend.nWeekend} weekend days against ${weekend.nWeekday} weekdays, over three weeks.`,
    });
  }

  return out.slice(0, limit);
}

function weekShapeTitle(id: TrackerId, weekendsLower: boolean, fmt: string): string {
  if (id === "water") {
    return weekendsLower
      ? `Weekends run lighter on water — about ${fmt} less than weekdays.`
      : `Weekends carry more water than weekdays — about ${fmt} more.`;
  }
  if (id === "sleep") {
    return weekendsLower
      ? `Weekend nights run about ${fmt} shorter than weekdays.`
      : `Weekend nights run about ${fmt} longer — a real catch-up pattern.`;
  }
  return weekendsLower
    ? `Weekends run about ${fmt} lighter on screen time.`
    : `Screen time climbs on weekends — about ${fmt} more than weekdays.`;
}
