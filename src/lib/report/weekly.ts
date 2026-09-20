/**
 * The Weekly Report — Bloom reading your week back to you.
 *
 * Pure on purpose: the page hands in the records it already holds, this
 * returns numbers and one honest insight. Every sentence it can produce is
 * grounded in a comparison that actually exists in the data — where a group
 * has fewer than two members, or a delta is below the threshold, the insight
 * stays silent rather than narrate noise.
 *
 * Windows: "this week" is the last seven days including today; "last week"
 * the seven before that.
 */

import { localDay, shiftDay } from "@/lib/localDay";
import { hasUsual, usualDay, usualMood } from "@/lib/smart/usual";
import { EMOTION_MAP, type MoodEntry } from "@/lib/mood/types";
import { habitStreak } from "@/lib/reminders/streak";
import type { DayEntry, Goals } from "@/lib/trackers/core";

export interface WeeklyReportInput {
  today: string;
  habits: readonly { id: string; name: string }[];
  habitLogs: readonly { habitId: string; date: string }[];
  moodEntries: readonly MoodEntry[];
  trackerDays: readonly DayEntry[];
  goals: Goals;
  cycle: { phase: string; cycleDay: number } | null;
}

export interface WeekMood {
  count: number;
  prevCount: number;
  avgMood: number | null;
  prevAvgMood: number | null;
  dominant: string | null;
  /** share of entries carrying at least one positive emotion, 0..1 */
  positiveShare: number | null;
}

export interface WeekHabits {
  ticks: number;
  prevTicks: number;
  topHabit: { name: string; ticks: number } | null;
  bestStreak: { name: string; days: number } | null;
}

export interface WeekTrackers {
  sleepAvg: number | null;
  sleepPrevAvg: number | null;
  waterAvg: number | null;
  movementAvg: number | null;
  sleepGoalShare: number | null; // days that met the sleep goal, 0..1
}

/** The person's baseline before this week — the "usual" the week is read against. */
export interface ReportUsual {
  sleepMinutes: number | null;
  waterMl: number | null;
  movementMinutes: number | null;
  avgMood: number | null;
}

export interface WeeklyReport {
  weekStart: string;
  weekEnd: string;
  mood: WeekMood;
  habits: WeekHabits;
  trackers: WeekTrackers;
  /** Their pre-week baseline, or null when there isn't enough history yet. */
  usual: ReportUsual | null;
  cycle: WeeklyReportInput["cycle"];
  /** One grounded sentence, or null when the week is too quiet to say anything. */
  insight: string | null;
  /** True when there is nothing at all in the window. */
  empty: boolean;
}

const inWindow = (date: string, start: string, end: string): boolean =>
  date >= start && date <= end;

const avg = (xs: number[]): number | null =>
  xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length;

const round1 = (n: number): number => Math.round(n * 10) / 10;

export function buildWeeklyReport(input: WeeklyReportInput): WeeklyReport {
  const { today } = input;
  const weekStart = shiftDay(today, -6);
  const prevStart = shiftDay(today, -13);
  const prevEnd = shiftDay(today, -7);

  /* ------------------------------------------------------- mood */
  const moodDay = (e: MoodEntry) => localDay(e.timestamp);
  const moodThis = input.moodEntries.filter((e) => inWindow(moodDay(e), weekStart, today));
  const moodPrev = input.moodEntries.filter((e) => inWindow(moodDay(e), prevStart, prevEnd));

  const emotionCounts = new Map<string, number>();
  let positive = 0;
  for (const e of moodThis) {
    let hasPositive = false;
    for (const key of e.emotions) {
      const meta = EMOTION_MAP[key];
      if (!meta) continue;
      emotionCounts.set(meta.label, (emotionCounts.get(meta.label) ?? 0) + 1);
      if (meta.valence === "positive") hasPositive = true;
    }
    if (hasPositive) positive += 1;
  }
  const dominant = [...emotionCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const mood: WeekMood = {
    count: moodThis.length,
    prevCount: moodPrev.length,
    avgMood: round1OrNull(avg(moodThis.map((e) => e.mood))),
    prevAvgMood: round1OrNull(avg(moodPrev.map((e) => e.mood))),
    dominant,
    positiveShare: moodThis.length > 0 ? positive / moodThis.length : null,
  };

  /* ----------------------------------------------------- habits */
  const nameOf = new Map(input.habits.map((h) => [h.id, h.name]));
  const ticksBy = new Map<string, number>();
  let ticks = 0;
  let prevTicks = 0;
  for (const l of input.habitLogs) {
    if (inWindow(l.date, weekStart, today)) {
      ticks += 1;
      ticksBy.set(l.habitId, (ticksBy.get(l.habitId) ?? 0) + 1);
    } else if (inWindow(l.date, prevStart, prevEnd)) {
      prevTicks += 1;
    }
  }
  const top = [...ticksBy.entries()].sort((a, b) => b[1] - a[1])[0];
  const streaks = input.habits
    .map((h) => {
      const dates = new Set(input.habitLogs.filter((l) => l.habitId === h.id).map((l) => l.date));
      return { name: h.name, days: habitStreak(dates, today) };
    })
    .filter((s) => s.days >= 2)
    .sort((a, b) => b.days - a.days)[0];

  const habits: WeekHabits = {
    ticks,
    prevTicks,
    topHabit: top ? { name: nameOf.get(top[0]) ?? "A habit", ticks: top[1] } : null,
    bestStreak: streaks ?? null,
  };

  /* --------------------------------------------------- trackers */
  const daysThis = input.trackerDays.filter((d) => inWindow(d.date, weekStart, today));
  const daysPrev = input.trackerDays.filter((d) => inWindow(d.date, prevStart, prevEnd));
  const sleepVals = daysThis.map((d) => d.sleepMinutes).filter((v): v is number => v !== null);
  const sleepGoalDays = sleepVals.filter((v) => v >= input.goals.sleepMinutes).length;

  const trackers: WeekTrackers = {
    sleepAvg: round1OrNull(avg(sleepVals)),
    sleepPrevAvg: round1OrNull(
      avg(daysPrev.map((d) => d.sleepMinutes).filter((v): v is number => v !== null)),
    ),
    waterAvg: round1OrNull(
      avg(daysThis.map((d) => d.waterMl).filter((v): v is number => v !== null)),
    ),
    movementAvg: round1OrNull(
      avg(daysThis.map((d) => d.movementMinutes).filter((v): v is number => v !== null)),
    ),
    sleepGoalShare: daysThis.length > 0 ? sleepGoalDays / daysThis.length : null,
  };

  /* ------------------------------------------------------- usual */
  /* The baseline is everything logged BEFORE this week — the week must
     never be compared against a "usual" it is itself part of. */
  const baselineDays = input.trackerDays.filter((d) => d.date < weekStart);
  const baselineUsual = usualDay(baselineDays, today);
  const baselineMood = usualMood(
    input.moodEntries.filter((e) => moodDay(e) < weekStart),
    today,
  );
  const usual: ReportUsual | null =
    hasUsual(baselineUsual) || baselineMood !== null
      ? {
          sleepMinutes: baselineUsual.sleep?.value.minutes ?? null,
          waterMl: baselineUsual.water?.value ?? null,
          movementMinutes: baselineUsual.movement?.value ?? null,
          avgMood: baselineMood?.mood ?? null,
        }
      : null;

  /* ----------------------------------------------------- insight */
  const insight = pickInsight(input, { weekStart, today, mood });

  return {
    weekStart,
    weekEnd: today,
    mood,
    habits,
    trackers,
    usual,
    cycle: input.cycle,
    insight,
    empty:
      moodThis.length === 0 &&
      ticks === 0 &&
      daysThis.length === 0 &&
      moodPrev.length === 0 &&
      prevTicks === 0,
  };
}

function round1OrNull(n: number | null): number | null {
  return n === null ? null : round1(n);
}

interface InsightCtx {
  weekStart: string;
  today: string;
  mood: WeekMood;
}

/**
 * The first comparison that earns a sentence wins. Thresholds are deliberately
 * conservative: a 0.7-point mood gap (on a 10-point scale) or a 30-minute
 * sleep gap is where a pattern becomes worth naming.
 */
function pickInsight(input: WeeklyReportInput, ctx: InsightCtx): string | null {
  const { weekStart, today } = ctx;
  const moodIn = input.moodEntries.filter((e) => {
    const d = localDay(e.timestamp);
    return inWindow(d, weekStart, today);
  });

  /* sleep vs mood, from the mood entries' own sleep signal */
  const goalHours = input.goals.sleepMinutes / 60;
  const rested = moodIn.filter((e) => e.sleep !== undefined && e.sleep >= goalHours - 0.25);
  const short = moodIn.filter((e) => e.sleep !== undefined && e.sleep < goalHours - 0.25);
  const restedAvg = avg(rested.map((e) => e.mood));
  const shortAvg = avg(short.map((e) => e.mood));
  if (restedAvg !== null && shortAvg !== null && rested.length >= 2 && short.length >= 2) {
    const gap = round1(restedAvg - shortAvg);
    if (gap >= 0.7) {
      return `Mood averaged ${restedAvg.toFixed(1)} after ${Math.round(goalHours)}h+ of sleep, ${shortAvg.toFixed(1)} after shorter nights — sleep keeps moving your week.`;
    }
  }

  /* habit ticks vs mood */
  const tickedDates = new Set(
    input.habitLogs.filter((l) => inWindow(l.date, weekStart, today)).map((l) => l.date),
  );
  const onDays = moodIn.filter((e) => tickedDates.has(localDay(e.timestamp)));
  const offDays = moodIn.filter((e) => !tickedDates.has(localDay(e.timestamp)));
  const onAvg = avg(onDays.map((e) => e.mood));
  const offAvg = avg(offDays.map((e) => e.mood));
  if (onAvg !== null && offAvg !== null && onDays.length >= 2 && offDays.length >= 2) {
    const gap = round1(onAvg - offAvg);
    if (gap >= 0.7) {
      return `Days with a ticked habit averaged ${onAvg.toFixed(1)} for mood, against ${offAvg.toFixed(1)} on the rest. Small routines, visible effect.`;
    }
  }

  /* week-over-week mood movement */
  if (ctx.mood.avgMood !== null && ctx.mood.prevAvgMood !== null) {
    const delta = round1(ctx.mood.avgMood - ctx.mood.prevAvgMood);
    if (delta >= 0.7) {
      return `Mood is up ${delta.toFixed(1)} on last week's average — the trend is yours to keep.`;
    }
    if (delta <= -0.7) {
      return `Mood is ${Math.abs(delta).toFixed(1)} below last week's average. Worth a kinder schedule, not a judgement.`;
    }
  }

  return null;
}
