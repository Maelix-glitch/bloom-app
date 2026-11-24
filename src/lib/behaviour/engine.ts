/**
 * Behaviour Change (System 8) — the right-moment engine.
 *
 * From the person's REAL patterns, pick the single most useful gentle
 * nudge for today. Pure and deterministic: same record + same clock +
 * same nudge memory in, same nudge out. No AI, no guilt mechanics, no
 * invented data — every detector needs real evidence in the record or
 * it stays silent, and every line of copy names the evidence it rests
 * on ("You've logged breakfast 6 days in a row — today's is still
 * open"), never shames, and never makes a medical claim.
 *
 * Detectors (each yields at most one candidate):
 *   · habit    — a habit due today, not yet ticked, with a LIVE
 *                pattern (ticked within the last 7 days) whose usual
 *                time has passed (usualHabitTime, ≥3 samples) — or,
 *                when no usable time pattern exists, ticked on ≥3 of
 *                the last 7 days. A habit abandoned weeks ago has no
 *                "still open today" story and stays silent.
 *   · meal     — breakfast/lunch/dinner logged ≥3 days in a row up to
 *                yesterday, not yet logged today, past its usual time.
 *   · mood     — checked in on ≥4 of the last 7 days, none today, past
 *                the usual check-in time. A high stated emotional-
 *                eating answer (the Assessment's §10 scale: "often"
 *                or "very often") lowers the bar to 3 days and the
 *                copy names the answer as its reason — the check-in
 *                is the record that makes those days visible.
 *   · plan     — no plan for today although logging usually starts by
 *                now (≥3 logged days in the last 7, past the usual
 *                first-log time).
 *   · weigh-in — a real weighing routine (≥2 weigh-ins, recent gaps
 *                typically ≤14 days) with a gap of ≥7 days.
 *
 * Ranking is a fixed priority — the most perishable thing first:
 * habit (a live streak) → meal (a logging streak) → mood (a daily
 * routine) → plan (the day's scaffold) → weigh-in (a slow trend).
 * The primary is the highest-priority eligible candidate; the
 * secondary is the next eligible one of a different kind. At most two
 * are ever returned — one voice, not a chorus.
 *
 * Quiet rules (state.ts holds the memory):
 *   · a dismissed KIND rests for DISMISS_REST_DAYS days;
 *   · a snoozed nudge (by key) is hidden for the rest of today;
 *   · the identical nudge is never shown on consecutive days.
 */

import { isDueOn, streakOf, streakUnitOf, type Habit, type HabitLog } from "@/lib/home/habits";
import { localDay, shiftDay } from "@/lib/localDay";
import type { WeighIn } from "@/lib/health/body";
import type { DailyPlan } from "@/lib/nutrition/plan";
import type { LogEntry, Meal } from "@/lib/nutrition/types";
import { formatClock, usualHabitTime } from "@/lib/smart/usual";
import type { MoodEntry } from "@/lib/mood/types";
import { isKindResting, type NudgeKind, type NudgeState } from "./state";

export type { NudgeKind };

export type NudgeAction =
  | { kind: "toggle-habit"; habitId: string }
  | { kind: "open-nutrition" }
  | { kind: "open-mood" }
  | { kind: "open-trackers" };

export interface Nudge {
  kind: NudgeKind;
  /** Stable identity for the quiet rules: `kind:subject`. */
  key: string;
  title: string;
  /** The evidence, in plain words — the real numbers behind the nudge. */
  detail: string;
  action: NudgeAction;
  actionLabel: string;
}

export interface NudgeInputs {
  /** Local day key for today (`YYYY-MM-DD`). */
  today: string;
  /** Minutes since local midnight, now. */
  nowMinutes: number;
  habits: readonly Habit[];
  habitLogs: readonly HabitLog[];
  foodEntries: readonly LogEntry[];
  /** The stored plan, whatever day it is for (null when none exists). */
  plan: DailyPlan | null;
  weighIns: readonly WeighIn[];
  moodEntries: readonly MoodEntry[];
  /** The Assessment's emotional-eating answer (1–5), when stated
   *  (spec §10): context for the mood detector only. Absent or null
   *  = never stated, and the mood detector runs exactly as before. */
  emotionalEating?: number | null;
}

export interface NudgeSelection {
  primary: Nudge | null;
  secondary: Nudge | null;
}

/** Fixed priority: lower comes first. The most perishable pattern wins. */
export const NUDGE_PRIORITY: Record<NudgeKind, number> = {
  habit: 1,
  meal: 2,
  mood: 3,
  plan: 4,
  "weigh-in": 5,
};

/** A meal streak / routine needs at least this many days of evidence. */
export const MIN_PATTERN_DAYS = 3;
/** A mood routine: checked in on at least this many of the last 7 days. */
export const MOOD_MIN_DAYS_OF_7 = 4;
/** The emotional-eating answer (1–5) at or above which the mood
 *  detector's gentler bar applies — "often" and "very often". */
export const EMOTIONAL_EATING_HIGH = 4;
/** The mood routine's evidence bar when emotional eating is high:
 *  one day less — the check-in matters more on exactly those days. */
export const MOOD_MIN_DAYS_EMOTIONAL = 3;
/** A weigh-in gap worth naming, in days. */
export const WEIGH_IN_GAP_DAYS = 7;
/** A weighing routine's typical gap must be at most this, in days. */
export const WEIGH_IN_TYPICAL_MAX_GAP = 14;

/* -------------------------------- helpers -------------------------------- */

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
}

/** Local minutes-since-midnight of an ISO timestamp; null when unreadable. */
function localMinutesOf(iso: string): number | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.getHours() * 60 + d.getMinutes();
}

/** Whole days from day key `from` to day key `to` (both `YYYY-MM-DD`). */
function dayDiff(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Tue 17 Nov" for a day key — named from the key itself, no locale games. */
export function prettyDay(day: string): string {
  const d = new Date(`${day}T12:00:00`);
  if (Number.isNaN(d.getTime())) return day;
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** The habit's live streak as the habits module itself counts it —
 *  for an open habit, the run ending yesterday. Weekly habits count in
 *  weeks, so they never borrow the "days in a row" framing. */
function habitStreakBefore(habit: Habit, logs: readonly HabitLog[], today: string): number {
  if (streakUnitOf(habit) !== "day") return 0;
  return streakOf(habit, logs, today);
}

/** Distinct days in the last 7 (excluding today) the habit was ticked. */
function habitRecentDays(habit: Habit, logs: readonly HabitLog[], today: string): number {
  const from = shiftDay(today, -7);
  const days = new Set(
    logs
      .filter((l) => l.habitId === habit.id && l.date >= from && l.date < today)
      .map((l) => l.date),
  );
  return days.size;
}

/* -------------------------------- detectors ------------------------------ */

function habitCandidate(inp: NudgeInputs): Nudge | null {
  interface Scored {
    nudge: Nudge;
    streak: number;
    usualMinutes: number;
  }
  let best: Scored | null = null;
  for (const habit of inp.habits) {
    if (habit.archived) continue;
    if (!isDueOn(habit, inp.today, inp.habitLogs)) continue;
    if (inp.habitLogs.some((l) => l.habitId === habit.id && l.date === inp.today)) continue;

    // The pattern must be alive: a habit last ticked weeks ago has no
    // "still open today" story, whatever its old usual time was.
    const lastTick = inp.habitLogs
      .filter((l) => l.habitId === habit.id && l.date < inp.today)
      .map((l) => l.date)
      .sort()
      .at(-1);
    if (!lastTick || lastTick < shiftDay(inp.today, -7)) continue;

    const usual = usualHabitTime(inp.habitLogs, habit.id);
    const streak = habitStreakBefore(habit, inp.habitLogs, inp.today);
    let detail: string | null = null;
    let usualMinutes = Number.POSITIVE_INFINITY;
    if (usual && inp.nowMinutes >= usual.minutes) {
      usualMinutes = usual.minutes;
      detail =
        streak >= 2
          ? `You've ticked it ${streak} days in a row, usually by ${formatClock(usual.minutes)}, today it's still open.`
          : `On your recent days you've usually ticked it by ${formatClock(usual.minutes)}, today it's still open.`;
    } else if (!usual) {
      const recent = habitRecentDays(habit, inp.habitLogs, inp.today);
      if (recent >= MIN_PATTERN_DAYS) {
        detail = `You've ticked it on ${recent} of the last 7 days, today it's still open.`;
      }
    }
    if (!detail) continue;

    const scored: Scored = {
      streak,
      usualMinutes,
      nudge: {
        kind: "habit",
        key: `habit:${habit.id}`,
        title: `“${habit.name}” is still open`,
        detail,
        action: { kind: "toggle-habit", habitId: habit.id },
        actionLabel: "Tick it now",
      },
    };
    if (
      !best ||
      scored.streak > best.streak ||
      (scored.streak === best.streak && scored.usualMinutes < best.usualMinutes) ||
      (scored.streak === best.streak &&
        scored.usualMinutes === best.usualMinutes &&
        scored.nudge.key < best.nudge.key)
    ) {
      best = scored;
    }
  }
  return best?.nudge ?? null;
}

const STREAK_MEALS: readonly Meal[] = ["breakfast", "lunch", "dinner"];

function mealCandidate(inp: NudgeInputs): Nudge | null {
  interface Scored {
    nudge: Nudge;
    streak: number;
    usualMinutes: number;
  }
  let best: Scored | null = null;
  for (const meal of STREAK_MEALS) {
    if (inp.foodEntries.some((e) => e.day === inp.today && e.meal === meal)) continue;

    let streak = 0;
    let day = shiftDay(inp.today, -1);
    while (inp.foodEntries.some((e) => e.day === day && e.meal === meal)) {
      streak++;
      day = shiftDay(day, -1);
      if (streak > 60) break;
    }
    if (streak < MIN_PATTERN_DAYS) continue;

    const from = shiftDay(inp.today, -7);
    const times = inp.foodEntries
      .filter((e) => e.meal === meal && e.day >= from && e.day < inp.today)
      .map((e) => localMinutesOf(e.createdAt))
      .filter((v): v is number => v !== null);
    if (times.length < MIN_PATTERN_DAYS) continue;
    const usual = median(times);
    if (usual === null || inp.nowMinutes <= usual) continue;

    const scored: Scored = {
      streak,
      usualMinutes: usual,
      nudge: {
        kind: "meal",
        key: `meal:${meal}`,
        title: `${meal[0]!.toUpperCase()}${meal.slice(1)} isn't logged yet`,
        detail: `You've logged ${meal} ${streak} days in a row, usually by ${formatClock(usual)}, today's is still open.`,
        action: { kind: "open-nutrition" },
        actionLabel: "Log food",
      },
    };
    if (
      !best ||
      scored.streak > best.streak ||
      (scored.streak === best.streak && scored.usualMinutes < best.usualMinutes)
    ) {
      best = scored;
    }
  }
  return best?.nudge ?? null;
}

function moodCandidate(inp: NudgeInputs): Nudge | null {
  const today = inp.today;
  if (inp.moodEntries.some((e) => localDay(e.timestamp) === today)) return null;
  const from = shiftDay(today, -7);
  const recent = inp.moodEntries.filter((e) => {
    const day = localDay(e.timestamp);
    return day >= from && day < today;
  });
  const days = new Set(recent.map((e) => localDay(e.timestamp)));
  /* §10: a high stated emotional-eating answer is context, not a
   *  diagnosis — it lowers the evidence bar by one day, because the
   *  check-in is how those days stay visible, and the copy names
   *  the person's own answer as the reason. */
  const emotionalHigh =
    inp.emotionalEating !== null &&
    inp.emotionalEating !== undefined &&
    inp.emotionalEating >= EMOTIONAL_EATING_HIGH;
  const minDays = emotionalHigh ? MOOD_MIN_DAYS_EMOTIONAL : MOOD_MIN_DAYS_OF_7;
  if (days.size < minDays) return null;
  const times = recent
    .map((e) => localMinutesOf(e.timestamp))
    .filter((v): v is number => v !== null);
  if (times.length < MIN_PATTERN_DAYS) return null;
  const usual = median(times);
  if (usual === null || inp.nowMinutes <= usual) return null;
  return {
    kind: "mood",
    key: "mood:check-in",
    title: "No mood check-in yet today",
    detail: emotionalHigh
      ? `You've checked in on ${days.size} of the last 7 days, usually by ${formatClock(usual)}. You told Bloom eating often follows your feelings, checking in keeps days like that visible.`
      : `You've checked in on ${days.size} of the last 7 days, usually by ${formatClock(usual)}.`,
    action: { kind: "open-mood" },
    actionLabel: "Check in",
  };
}

function planCandidate(inp: NudgeInputs): Nudge | null {
  if (inp.plan && inp.plan.day === inp.today) return null;
  const from = shiftDay(inp.today, -7);
  const firstByDay = new Map<string, number>();
  for (const e of inp.foodEntries) {
    if (e.day < from || e.day >= inp.today) continue;
    const minutes = localMinutesOf(e.createdAt);
    if (minutes === null) continue;
    const current = firstByDay.get(e.day);
    if (current === undefined || minutes < current) firstByDay.set(e.day, minutes);
  }
  if (firstByDay.size < MIN_PATTERN_DAYS) return null;
  const usual = median([...firstByDay.values()]);
  if (usual === null || inp.nowMinutes <= usual) return null;
  return {
    kind: "plan",
    key: "plan:today",
    title: "No plan for today yet",
    detail: inp.plan
      ? `Your last plan was for ${prettyDay(inp.plan.day)}. On ${firstByDay.size} of the last 7 days you'd started logging by ${formatClock(usual)}, a plan makes the day easier to follow.`
      : `On ${firstByDay.size} of the last 7 days you'd started logging by ${formatClock(usual)}, a plan makes the day easier to follow.`,
    action: { kind: "open-nutrition" },
    actionLabel: "Make today's plan",
  };
}

function weighInCandidate(inp: NudgeInputs): Nudge | null {
  if (inp.weighIns.length < 2) return null;
  const dates = [...new Set(inp.weighIns.map((w) => w.date))].sort();
  const latest = dates[dates.length - 1]!;
  if (latest >= inp.today) return null;
  const gaps: number[] = [];
  for (let i = 1; i < dates.length; i++) gaps.push(dayDiff(dates[i - 1]!, dates[i]!));
  const typical = median(gaps.slice(-5));
  if (typical === null || typical > WEIGH_IN_TYPICAL_MAX_GAP) return null;
  const gap = dayDiff(latest, inp.today);
  if (gap < WEIGH_IN_GAP_DAYS) return null;
  const lastEntry = inp.weighIns.filter((w) => w.date === latest).at(-1)!;
  return {
    kind: "weigh-in",
    key: "weigh-in:latest",
    title: `It's been ${gap} days since your last weigh-in`,
    detail: `Your last one was ${prettyDay(latest)}, at ${lastEntry.kg} kg. A fresh weigh-in keeps your weight trend honest.`,
    action: { kind: "open-trackers" },
    actionLabel: "Weigh in",
  };
}

/* -------------------------------- selection ------------------------------ */

function isEligible(nudge: Nudge, state: NudgeState, today: string): boolean {
  if (isKindResting(state.dismissed[nudge.kind], today)) return false;
  if (state.snoozed[nudge.key] === today) return false;
  if (state.lastShown[nudge.key] === shiftDay(today, -1)) return false;
  return true;
}

export function selectNudges(inp: NudgeInputs, state: NudgeState): NudgeSelection {
  const candidates = [
    habitCandidate(inp),
    mealCandidate(inp),
    moodCandidate(inp),
    planCandidate(inp),
    weighInCandidate(inp),
  ].filter((n): n is Nudge => n !== null);
  const eligible = candidates
    .filter((n) => isEligible(n, state, inp.today))
    .sort((a, b) => NUDGE_PRIORITY[a.kind] - NUDGE_PRIORITY[b.kind] || (a.key < b.key ? -1 : 1));
  const primary = eligible[0] ?? null;
  const secondary = primary
    ? (eligible.find((n) => n.kind !== primary.kind) ?? null)
    : null;
  return { primary, secondary };
}
