/**
 * The profile's "record" — one honest view across everything a person logs.
 *
 * A tracker profile should look like a tracker: a twelve-week grid of days
 * with something on them, what is being tracked right now, and the four
 * numbers that only real logging can move. Everything here is derived from
 * the same records the Today/Trackers/Mood/Cycle pages already hold — no
 * new tables, no new writes.
 */

import type { DayEntry, TrackerId } from "@/lib/trackers/core";
import type { HabitLog } from "@/lib/home/habits";
import type { DayLog } from "@/lib/cycle/dayLogs";
import type { PeriodLog } from "@/lib/cycle/predict";
import type { MoodEntry } from "@/lib/mood/types";
import type { CycleMode } from "@/lib/cycle/periodStore";
import { todayLocal } from "@/lib/localDay";

export type RecordSource = "trackers" | "mood" | "habits" | "cycle";

export interface RecordDay {
  date: string;
  /** How many kinds of logging touched this day (0–4). */
  sources: RecordSource[];
  /** Total distinct things logged that day — fuller days read brighter. */
  count: number;
}

export interface RecordInput {
  trackerDays: readonly DayEntry[];
  moodEntries: readonly MoodEntry[];
  habitLogs: readonly HabitLog[];
  cycleDays: readonly DayLog[];
  periods: readonly PeriodLog[];
  today?: string;
}

export const RECORD_WEEKS = 12;

const shift = (date: string, days: number): string => {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + days);
  return todayLocal(d);
};

const localDayOf = (iso: string): string => todayLocal(new Date(iso));

/** Monday-first week start for a YYYY-MM-DD. */
const weekStart = (date: string): string => {
  const d = new Date(`${date}T12:00:00`);
  const dow = (d.getDay() + 6) % 7;
  return shift(date, -dow);
};

function trackerCount(e: DayEntry): number {
  let n = 0;
  if (e.sleepMinutes !== null) n += 1;
  if (e.waterMl !== null) n += 1;
  if (e.sessions.length > 0) n += 1;
  if (e.movementMinutes !== null) n += 1;
  if (e.energy !== null) n += 1;
  if (e.screenMinutes !== null) n += 1;
  return n;
}

/**
 * Twelve full weeks ending on the current week, Monday first — one cell per
 * day, every cell present so the grid is always the same shape.
 */
export function recordGrid(input: RecordInput): { days: RecordDay[]; start: string; end: string } {
  const today = input.today ?? todayLocal();
  const end = shift(weekStart(today), 6);
  const start = shift(weekStart(today), -(RECORD_WEEKS - 1) * 7);

  const byDate = new Map<string, { sources: Set<RecordSource>; count: number }>();
  const touch = (date: string, source: RecordSource, count: number) => {
    if (date < start || date > end || count <= 0) return;
    const row = byDate.get(date) ?? { sources: new Set<RecordSource>(), count: 0 };
    row.sources.add(source);
    row.count += count;
    byDate.set(date, row);
  };

  for (const d of input.trackerDays) touch(d.date, "trackers", trackerCount(d));
  for (const m of input.moodEntries) touch(localDayOf(m.timestamp), "mood", 1);
  for (const h of input.habitLogs) touch(h.date, "habits", 1);
  for (const c of input.cycleDays) touch(c.date, "cycle", 1);
  for (const p of input.periods) {
    if (!p.start) continue;
    const last = p.end && p.end >= p.start ? p.end : p.start;
    for (let d = p.start; d <= last && d <= end; d = shift(d, 1)) touch(d, "cycle", 1);
  }

  const days: RecordDay[] = [];
  for (let d = start; d <= end; d = shift(d, 1)) {
    const row = byDate.get(d);
    days.push({
      date: d,
      sources: row ? ([...row.sources] as RecordSource[]) : [],
      count: row?.count ?? 0,
    });
  }
  return { days, start, end };
}

export interface RecordTotals {
  /** Distinct days with anything logged, across the whole record. */
  daysLogged: number;
  /** Consecutive days (ending today or yesterday) with anything logged. */
  streak: number;
  /** Longest such run ever. */
  bestStreak: number;
  /** Days with anything logged in the last 7 / 30. */
  last7: number;
  last30: number;
  /** Every individual thing logged — tracker values, moods, habit ticks, cycle days. */
  entries: number;
  firstDay: string | null;
}

/** Whole-record totals — the numbers only real logging can move. */
export function recordTotals(input: RecordInput): RecordTotals {
  const today = input.today ?? todayLocal();
  const days = new Map<string, number>();
  const add = (date: string, n: number) => {
    if (n <= 0 || date > today) return;
    days.set(date, (days.get(date) ?? 0) + n);
  };
  for (const d of input.trackerDays) add(d.date, trackerCount(d));
  for (const m of input.moodEntries) add(localDayOf(m.timestamp), 1);
  for (const h of input.habitLogs) add(h.date, 1);
  for (const c of input.cycleDays) add(c.date, 1);
  for (const p of input.periods) {
    if (!p.start) continue;
    const last = p.end && p.end >= p.start ? p.end : p.start;
    for (let d = p.start; d <= last && d <= today; d = shift(d, 1)) add(d, 1);
  }

  const sorted = [...days.keys()].sort();
  let entries = 0;
  for (const n of days.values()) entries += n;

  /* streak: today counts if logged, otherwise the run may end yesterday */
  let streak = 0;
  let cursor = days.has(today) ? today : shift(today, -1);
  while (days.has(cursor)) {
    streak += 1;
    cursor = shift(cursor, -1);
  }

  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    run = prev !== null && shift(prev, 1) === d ? run + 1 : 1;
    if (run > best) best = run;
    prev = d;
  }

  const d7 = shift(today, -6);
  const d30 = shift(today, -29);
  let last7 = 0;
  let last30 = 0;
  for (const d of sorted) {
    if (d >= d7) last7 += 1;
    if (d >= d30) last30 += 1;
  }

  return {
    daysLogged: sorted.length,
    streak,
    bestStreak: best,
    last7,
    last30,
    entries,
    firstDay: sorted[0] ?? null,
  };
}

export interface TrackedThing {
  id: string;
  label: string;
  /** Short state: "7h 40m avg", "12 entries", "day 14", "paused"… */
  detail: string;
  tone: "tracker" | "mood" | "habits" | "cycle";
  to: string;
  on: boolean;
}

/** What this person tracks right now — the chips that make the profile read as a tracker's. */
export function trackedThings(input: {
  active: readonly TrackerId[];
  trackerLabels: Record<TrackerId, string>;
  trackerDetail: (id: TrackerId) => string;
  moodEntries: number;
  habits: number;
  cycleMode: CycleMode;
  cycleDetail: string;
}): TrackedThing[] {
  const out: TrackedThing[] = [];
  for (const id of input.active) {
    out.push({
      id: `tracker-${id}`,
      label: input.trackerLabels[id],
      detail: input.trackerDetail(id),
      tone: "tracker",
      to: "/trackers",
      on: true,
    });
  }
  out.push({
    id: "mood",
    label: "Mood",
    detail: input.moodEntries > 0 ? `${input.moodEntries} check-ins` : "not started",
    tone: "mood",
    to: "/mood",
    on: input.moodEntries > 0,
  });
  out.push({
    id: "habits",
    label: "Habits",
    detail: input.habits > 0 ? `${input.habits} active` : "none yet",
    tone: "habits",
    to: "/",
    on: input.habits > 0,
  });
  if (input.cycleMode !== "off") {
    out.push({
      id: "cycle",
      label: "Cycle",
      detail: input.cycleMode === "paused" ? "paused" : input.cycleDetail,
      tone: "cycle",
      to: "/cycle",
      on: input.cycleMode === "tracking",
    });
  }
  return out;
}
