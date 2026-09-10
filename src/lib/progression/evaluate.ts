/**
 * Bloom Progression — the verification engine.
 *
 * Pure functions, no I/O. Given Bloom's real records (habit logs, tracker
 * days, mood days) and the earned-point total, this resolves:
 *
 *   · each goal's verified progress and whether it may be awarded,
 *   · each achievement's condition,
 *   · the rank the points actually correspond to,
 *   · the calm next step.
 *
 * Design rules held here:
 *   · Missing a day never deletes progress — runs restart, totals stay.
 *   · Progress is never estimated: a day either has a record or it doesn't.
 *   · Windows are counted back from the person's *local* today.
 *   · Nothing is awarded twice: an award needs a complete goal AND an
 *     unclaimed period key (see store.ts / the server RPC).
 */

import { todayLocal, shiftDay } from "@/lib/localDay";

import { ACHIEVEMENTS } from "./achievements";
import { DAILY_GOALS, MILESTONE_GOALS, MONTHLY_GOALS, WEEKLY_GOALS, recommendNext } from "./goals";
import { rankFor } from "./ranks";
import type {
  AchievementState,
  GoalDef,
  GoalProgress,
  GoalSpec,
  ProgressionInput,
  ProgressionSnapshot,
  RankState,
  TrackedField,
} from "./types";

const DAY_MS = 86_400_000;

/* ------------------------------ small helpers ----------------------------- */

/** Local "HH:MM" → minutes past midnight, or null when unreadable. */
export function clockMinutes(value: string | null | undefined): number | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** The local days covered by a rolling window ending today (inclusive). */
export function windowDays(today: string, window: number): { from: string; to: string } {
  const span = Math.max(1, Math.floor(window));
  return { from: shiftDay(today, -(span - 1)), to: today };
}

/** Distinct days from a list of local dates, limited to a rolling window. */
function daySetWithin(dates: readonly string[], today: string, window: number): Set<string> {
  const { from, to } = windowDays(today, window);
  const out = new Set<string>();
  for (const date of dates) {
    if (!date) continue;
    if (date >= from && date <= to) out.add(date);
  }
  return out;
}

/** ISO-8601 week key, e.g. "2026-W37" — Monday-based, local. */
export function isoWeekKey(today: string): string {
  const date = new Date(`${today}T12:00:00`);
  const target = new Date(date.valueOf());
  const dayNumber = (date.getDay() + 6) % 7; // Monday = 0
  target.setDate(target.getDate() - dayNumber + 3); // Thursday of this week
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const firstDayNumber = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstDayNumber + 3);
  const week = 1 + Math.round((target.valueOf() - firstThursday.valueOf()) / (7 * DAY_MS));
  return `${target.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** The idempotency key an award is stored under, for a goal's cadence. */
export function periodKeyFor(goal: GoalDef, today: string): string {
  switch (goal.cadence) {
    case "daily":
      return today;
    case "weekly":
      return isoWeekKey(today);
    case "monthly":
      return today.slice(0, 7);
    case "one-time":
      return "once";
    default:
      return today;
  }
}

/** Longest run of consecutive ticked days in a set of local dates. */
export function longestRun(days: ReadonlySet<string>): number {
  if (days.size === 0) return 0;
  const sorted = [...days].sort();
  let best = 0;
  let run = 0;
  let previous: string | null = null;
  for (const day of sorted) {
    run = previous !== null && shiftDay(previous, 1) === day ? run + 1 : 1;
    previous = day;
    if (run > best) best = run;
  }
  return best;
}

/* ------------------------------- spec resolver ---------------------------- */

const TRACKER_VALUE = (
  day: ProgressionInput["trackerDays"][number],
  tracker: TrackedField,
): number | null => {
  switch (tracker) {
    case "sleep":
      return day.sleepMinutes;
    case "water":
      return day.waterMl;
    case "movement":
      return day.movementMinutes;
    case "study":
      return day.studyMinutes > 0 ? day.studyMinutes : null;
    case "energy":
      return day.energy;
    case "screen":
      return null; // screen time is deliberately never a goal or achievement
    default:
      return null;
  }
};

/**
 * Resolve a verification spec to a counter. Returns 0 when nothing in the
 * records supports the condition — never a guess.
 */
export function resolveSpec(spec: GoalSpec, input: ProgressionInput): number {
  const habitDaysAll = new Set(input.logs.map((log) => log.date).filter((d) => d));
  const today = input.today;

  switch (spec.on) {
    case "habitDays":
      return daySetWithin([...habitDaysAll], today, spec.window).size;

    case "habitTicks": {
      const { from, to } = windowDays(today, spec.window);
      return input.logs.filter((log) => log.date >= from && log.date <= to).length;
    }

    case "habitRun":
      return longestRun(habitDaysAll);

    case "trackerDays": {
      const days = input.trackerDays
        .filter((day) => {
          const value = TRACKER_VALUE(day, spec.tracker);
          return value !== null && value !== undefined;
        })
        .map((day) => day.date);
      return daySetWithin(days, today, spec.window).size;
    }

    case "trackerGoalDays": {
      const goal = goalForTracker(spec.tracker, input.trackerGoals);
      const days = input.trackerDays
        .filter((day) => {
          const value = TRACKER_VALUE(day, spec.tracker);
          return typeof value === "number" && goal !== null && value >= goal;
        })
        .map((day) => day.date);
      return daySetWithin(days, today, spec.window).size;
    }

    case "movementSessions": {
      const { from, to } = windowDays(today, spec.window);
      return input.trackerDays.filter(
        (day) => day.date >= from && day.date <= to && (day.movementMinutes ?? 0) > 0,
      ).length;
    }

    case "studySessions": {
      const { from, to } = windowDays(today, spec.window);
      return input.trackerDays
        .filter((day) => day.date >= from && day.date <= to)
        .reduce((sum, day) => sum + Math.max(0, Math.round(day.studySessions)), 0);
    }

    case "moodDays":
      return daySetWithin(input.moodDays, today, spec.window).size;

    case "recoveryDays": {
      const sleepGoal = input.trackerGoals.sleepMinutes;
      const days = input.trackerDays
        .filter(
          (day) =>
            typeof day.sleepMinutes === "number" &&
            day.sleepMinutes >= sleepGoal &&
            typeof day.sleepQuality === "number" &&
            day.sleepQuality >= 3,
        )
        .map((day) => day.date);
      return daySetWithin(days, today, spec.window).size;
    }

    case "earlyDays": {
      const before = clockMinutes(spec.before);
      if (before === null) return 0;
      const days = input.trackerDays
        .filter((day) => {
          const woke = clockMinutes(day.wakeTime);
          return woke !== null && woke < before;
        })
        .map((day) => day.date);
      return daySetWithin(days, today, spec.window).size;
    }

    case "balanceDays": {
      const checked = new Set<string>(habitDaysAll);
      for (const day of input.trackerDays) {
        const touched =
          day.sleepMinutes !== null ||
          day.waterMl !== null ||
          day.movementMinutes !== null ||
          day.energy !== null ||
          day.studyMinutes > 0;
        if (touched) checked.add(day.date);
      }
      for (const day of input.moodDays) {
        if (day) checked.add(day);
      }
      return daySetWithin([...checked], today, spec.window).size;
    }

    case "firstTick":
      return input.logs.length > 0 ? 1 : 0;

    case "points":
      return (input.earnedLifetime ?? 0) >= spec.amount ? 1 : 0;

    case "rankTier":
      return rankFor(input.earnedLifetime ?? 0).rank.tier >= spec.tier ? 1 : 0;

    default:
      return 0;
  }
}

function goalForTracker(
  tracker: TrackedField,
  goals: ProgressionInput["trackerGoals"],
): number | null {
  switch (tracker) {
    case "sleep":
      return goals.sleepMinutes;
    case "water":
      return goals.waterMl;
    case "movement":
      return goals.movementMinutes;
    case "study":
      return goals.studyMinutes;
    case "energy":
      return goals.energy;
    default:
      return null;
  }
}

/* --------------------------------- goals --------------------------------- */

/** Habits scheduled today, used by the "complete today's routine" goal. */
function habitsDueToday(input: ProgressionInput): number {
  return Math.max(1, input.habits.length);
}

export function goalTarget(goal: GoalDef, input: ProgressionInput): number {
  if (goal.targetMode === "todayHabits") return habitsDueToday(input);
  return goal.target;
}

export interface ClaimLookup {
  /** Goal ids already awarded for a given period key. */
  has: (goalId: string, periodKey: string) => boolean;
}

/**
 * Catalog order used everywhere: today, then this week, then this month, then
 * the lifetime milestones from nearest to furthest. The page groups by
 * cadence, so the order here only has to be stable and sensible.
 */
export const GOALS_ORDER: readonly GoalDef[] = [
  ...DAILY_GOALS,
  ...WEEKLY_GOALS,
  ...MONTHLY_GOALS,
  ...[...MILESTONE_GOALS].sort((a, b) => a.points - b.points),
];

export function evaluateGoals(input: ProgressionInput, claimed: ClaimLookup): GoalProgress[] {
  return GOALS_ORDER.map((goal) => {
    const target = goalTarget(goal, input);
    const periodKey = periodKeyFor(goal, input.today);
    const raw = resolveSpec(goal.spec, input);
    const progress = Math.min(raw, target);
    const complete = progress >= target && target > 0;
    const already = claimed.has(goal.id, periodKey);
    return {
      goal,
      progress,
      ratio: target > 0 ? Math.min(1, progress / target) : 0,
      complete,
      periodKey,
      claimed: already,
      claimable: complete && !already,
      remaining: Math.max(0, target - progress),
    };
  });
}

/* ------------------------------ achievements ----------------------------- */

export function evaluateAchievements(
  input: ProgressionInput,
  meta: { achievedAt: (id: string) => string | null },
): AchievementState[] {
  return ACHIEVEMENTS.map((def) => {
    const raw = resolveSpec(def.spec, input);
    const progress = Math.min(raw, def.target);
    const unlocked = raw >= def.target && def.target > 0;
    return {
      def,
      progress,
      ratio: def.target > 0 ? Math.min(1, progress / def.target) : 0,
      unlocked,
      achievedAt: meta.achievedAt(def.id),
    };
  });
}

/* -------------------------------- snapshot ------------------------------- */

export interface SnapshotParts {
  input: ProgressionInput;
  goals: GoalProgress[];
  achievements: AchievementState[];
  /** Points that came from awarded goals/achievements (the real ledger). */
  ledgerPoints: number;
}

/** Rank state plus the goals/achievements, in one pass. Pure. */
export function buildSnapshot(parts: SnapshotParts): Omit<ProgressionSnapshot, "ledger" | "rankEvents"> {
  const points = Math.max(0, Math.floor(parts.input.earnedLifetime ?? 0));
  const rank: RankState = rankFor(points);
  const nextMilestone = recommendNext(parts.goals);
  const earnedFromMilestones = Math.max(0, Math.round(parts.ledgerPoints));
  return {
    points,
    loading: parts.input.earnedLifetime === null,
    rank,
    goals: parts.goals,
    nextMilestone,
    achievements: parts.achievements,
    awardedTotal: earnedFromMilestones,
    earnedFromHabits: Math.max(0, points - earnedFromMilestones),
    earnedFromMilestones,
  };
}

/** Local day for a mood timestamp (kept here so evaluate stays dependency-free). */
export function moodDayOf(timestamp: string): string | null {
  const ms = Date.parse(timestamp);
  if (Number.isNaN(ms)) return null;
  return todayLocal(new Date(ms));
}
