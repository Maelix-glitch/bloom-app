/**
 * The Overview synthesis — the read-side layer behind Today's command
 * centre. It reads the record the person already keeps (habits, trackers,
 * mood, and the W4-1 assessment) and answers four questions:
 *
 *   1. How am I doing?        → `state`
 *   2. What changed?          → `changes` (deltas vs their own recent past)
 *   3. What matters today?    → `priority` (exactly one)
 *   4. What's my next action? → `action` (exactly one, paired with the priority)
 *
 * Rules this module holds itself to — the same discipline as the rest of
 * Bloom's record math:
 *
 *   · Nothing is invented. Every number comes from the person's own logs,
 *     through the shared definitions in `lib/stats` (entry-weighted average
 *     mood, the shared streak) and the tracker core's own value projection
 *     (`valueOf`). The day count is the distinct-day union the Today hero
 *     already prints — habit days ∪ mood days ∪ tracker days — so this page
 *     can never disagree with itself.
 *   · Every comparison carries its window in words. Deltas compare the
 *     last 7 days with the 7 days before, and say so.
 *   · Averages need at least two logged days (or two check-ins) behind
 *     them before they are spoken as averages. Thinner than that, the
 *     synthesis stays quiet rather than dressing one day up as a trend.
 *   · Priority and action are chosen by the ordered, explainable rules in
 *     `choosePriority` below — each carries its reason in plain language.
 *     No scores, no health claims, no diagnosis. Safety wording, when it
 *     appears, is the assessment domain's own copy, never rephrased.
 *   · Absence is an answer. An empty record produces honest empty states,
 *     not placeholder numbers.
 *
 * Pure: no React, no storage, no clock. The caller passes `today` and the
 * hooks' current data shapes; the same inputs always give the same page.
 */

import type { Habit, HabitLog } from "@/lib/home/habits";
import type { HabitToday } from "@/hooks/useHabits";
import type { MoodEntry } from "@/lib/mood/types";
import {
  TRACKERS,
  valueOf,
  type DayEntry,
  type TrackerAnalysis,
  type TrackerId,
} from "@/lib/trackers/core";
import { averageMood, currentStreak } from "@/lib/stats";
import { localDay, shiftDay } from "@/lib/localDay";
import type { AssessmentState } from "@/lib/assessment/state";
import type { AssessmentSummary } from "@/lib/assessment/summary";
import { GOAL_LABEL } from "@/lib/assessment/questions";
import { SAFETY_CLASS_RANK } from "@/lib/vitalis/domain/safety";

/* --------------------------------- input --------------------------------- */

export interface OverviewInput {
  /** Local day key, "YYYY-MM-DD". */
  today: string;
  habits: {
    all: readonly Habit[];
    logs: readonly HabitLog[];
    todayHabits: readonly HabitToday[];
    completedToday: number;
    dueToday: number;
    points: number | null;
  };
  moodEntries: readonly MoodEntry[];
  /** The tracker store's days — the same array the hero counts from. */
  trackerDays: readonly DayEntry[];
  trackers: TrackerAnalysis;
  assessment: {
    state: AssessmentState;
    /** The completed summary, or null while the assessment is unfinished. */
    summary: AssessmentSummary | null;
  };
}

/* --------------------------------- output -------------------------------- */

export interface OverviewFact {
  id: string;
  label: string;
  value: string;
}

export interface OverviewState {
  headline: string;
  lines: string[];
  facts: OverviewFact[];
  /** Distinct days carrying anything at all — the hero's day count. */
  recordDays: number;
  /** Consecutive logged days ending today (or yesterday), shared definition. */
  streak: number;
}

export type DeltaDirection = "up" | "down" | "flat" | "new";

export interface OverviewDelta {
  id: string;
  /** "Mood", "Sleep", "Habit ticks", "Days logged", … */
  label: string;
  direction: DeltaDirection;
  /** The full sentence, numbers and window included. */
  sentence: string;
}

export interface OverviewChanges {
  /** Spoken wherever the deltas are listed. */
  windowLabel: string;
  deltas: OverviewDelta[];
  /** Set when no delta earned its place — an honest line instead of a list. */
  note: string | null;
}

export type OverviewActionKind =
  | "habit"
  | "mood"
  | "metrics"
  | "assessment"
  | "assessment-summary"
  | "add-habit"
  | "link";

export interface OverviewAction {
  kind: OverviewActionKind;
  label: string;
  habitId?: string | undefined;
  /** For kind "link" only. */
  to?: string | undefined;
}

export interface OverviewPriority {
  id: string;
  title: string;
  /** Why this one — in plain language, from the record. */
  reason: string;
}

export interface OverviewSynthesis {
  state: OverviewState;
  changes: OverviewChanges;
  priority: OverviewPriority;
  action: OverviewAction;
}

/* -------------------------------- windows -------------------------------- */

/** The one comparison window pair every delta on this page uses. */
export const OVERVIEW_WINDOW_LABEL = "Last 7 days vs the 7 days before";

/** An average is only spoken when at least this many samples stand behind it. */
const MIN_SAMPLES = 2;

interface Window {
  start: string;
  end: string;
}

const recentWindow = (today: string): Window => ({ start: shiftDay(today, -6), end: today });
const priorWindow = (today: string): Window => ({
  start: shiftDay(today, -13),
  end: shiftDay(today, -7),
});
const inWindow = (day: string, w: Window) => day >= w.start && day <= w.end;

/* ------------------------------ day counting ----------------------------- */

/**
 * The distinct-day union — the same recipe the Today hero uses for its day
 * count (habit log days ∪ mood check-in days ∪ tracker days), computed in
 * this one place so the command centre and the hero can never disagree.
 */
export function recordDayKeys(input: OverviewInput): Set<string> {
  const keys = new Set<string>();
  for (const l of input.habits.logs) keys.add(l.date);
  for (const e of input.moodEntries) keys.add(localDay(e.timestamp));
  for (const d of input.trackerDays) keys.add(d.date);
  return keys;
}

/* ------------------------------ settledness ------------------------------ */

/**
 * The settle state of the records behind Today's Overview — the same
 * inputs the synthesis counts (habits, mood, tracker days), each with
 * whether its account answer has landed.
 */
export interface OverviewSettleState {
  auth: "checking" | "signed-out" | "signed-in" | "off";
  habitsLoading: boolean;
  moodLoading: boolean;
  /** The tracker store has read its device copy. */
  trackersHydrated: boolean;
  /** Where the tracker account pull stands. */
  trackerSyncState: "off" | "loading" | "signed-out" | "saved" | "pending" | "error";
}

/**
 * Have the records behind Today's numbers settled into their account
 * state? Until they have, the only days the synthesis can count are the
 * ones already on this device — real, but interim: the tracker store
 * hydrates from the device mirror instantly and merges the account's
 * answer later, so totals computed in between are intermediate values
 * over a partial record ("days logged 10" on the way to 14, in the
 * 2026-11-14 sweep). Today used to latch its ready flag off device
 * hydration alone; this predicate is the discipline the Profile totals
 * (`profileRecordsSettled`) and the Rewards gallery
 * (`progressionRecordsSettled`) already follow — signed in, EVERY
 * source must have answered. On a tracker-pull "error" the device days
 * stand in, the same fallback those paths take.
 */
export function overviewRecordsSettled(state: OverviewSettleState): boolean {
  // Still learning whether there is a session at all: nothing has settled.
  if (state.auth === "checking") return false;
  // Device mode (no database, or genuinely signed out): the device
  // record IS the record, once the local reads have landed.
  if (state.auth !== "signed-in") {
    return state.trackersHydrated && !state.habitsLoading && !state.moodLoading;
  }
  if (state.habitsLoading || state.moodLoading || !state.trackersHydrated) return false;
  // The tracker pull starts at "off" and passes through "loading"; every
  // later state means the pull has answered.
  return state.trackerSyncState !== "off" && state.trackerSyncState !== "loading";
}

/* --------------------------------- deltas -------------------------------- */

interface MetricDelta extends OverviewDelta {
  /** |change| relative to the metric's own scale — only used for ordering. */
  weight: number;
}

const trackerDef = (id: TrackerId) => TRACKERS.find((t) => t.id === id)!;

/** Per-metric "too small to call it movement" bands, in the metric's unit. */
const FLAT_EPSILON: Record<TrackerId, number> = {
  sleep: 15,
  water: 100,
  study: 10,
  movement: 5,
  energy: 0.25,
  screen: 15,
};
const MOOD_FLAT_EPSILON = 0.3;

function averageOf(values: readonly number[]): number | null {
  if (values.length < MIN_SAMPLES) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function directionFor(diff: number, epsilon: number): "up" | "down" | "flat" {
  if (Math.abs(diff) <= epsilon) return "flat";
  return diff > 0 ? "up" : "down";
}

const directionWord: Record<Exclude<DeltaDirection, "new">, string> = {
  up: "up from",
  down: "down from",
  flat: " much the same as",
};

interface MoodWindows {
  recentAvg: number | null;
  priorAvg: number | null;
  recentCount: number;
  priorCount: number;
}

function moodWindows(input: OverviewInput): MoodWindows {
  const recent = recentWindow(input.today);
  const prior = priorWindow(input.today);
  const recentEntries = input.moodEntries.filter((e) => inWindow(localDay(e.timestamp), recent));
  const priorEntries = input.moodEntries.filter((e) => inWindow(localDay(e.timestamp), prior));
  return {
    /* The shared average-mood definition (lib/stats): entry-weighted. The
       MIN_SAMPLES gate is applied on top, so a single check-in is never
       spoken as "your average mood". */
    recentAvg:
      recentEntries.length >= MIN_SAMPLES ? averageMood(recentEntries) : null,
    priorAvg: priorEntries.length >= MIN_SAMPLES ? averageMood(priorEntries) : null,
    recentCount: recentEntries.length,
    priorCount: priorEntries.length,
  };
}

function trackerWindowValues(
  input: OverviewInput,
  id: TrackerId,
  w: Window,
): number[] {
  const values: number[] = [];
  for (const day of input.trackerDays) {
    if (!inWindow(day.date, w)) continue;
    const v = valueOf(day, id);
    if (v !== null) values.push(v);
  }
  return values;
}

function computeDeltas(input: OverviewInput, dayKeys: Set<string>): OverviewDelta[] {
  const recent = recentWindow(input.today);
  const prior = priorWindow(input.today);
  const out: MetricDelta[] = [];
  const fmt1 = (v: number) => (Math.round(v * 10) / 10).toString();

  /* Mood — the shared entry-weighted average, in both windows. */
  const mood = moodWindows(input);
  if (mood.recentAvg !== null && mood.priorAvg !== null) {
    const diff = mood.recentAvg - mood.priorAvg;
    const dir = directionFor(diff, MOOD_FLAT_EPSILON);
    out.push({
      id: "mood",
      label: "Mood",
      direction: dir,
      sentence:
        dir === "flat"
          ? `Mood averaged ${fmt1(mood.recentAvg)} over the last 7 days — much the same as the ${fmt1(mood.priorAvg)} of the 7 days before.`
          : `Mood averaged ${fmt1(mood.recentAvg)} over the last 7 days, ${directionWord[dir]} ${fmt1(mood.priorAvg)} in the 7 days before.`,
      weight: Math.abs(diff) / 10,
    });
  } else if (mood.recentAvg !== null) {
    out.push({
      id: "mood",
      label: "Mood",
      direction: "new",
      sentence: `Mood averaged ${fmt1(mood.recentAvg)} across ${mood.recentCount} check-ins in the last 7 days — no earlier week to compare yet.`,
      weight: 0.1,
    });
  }

  /* Trackers — each active tracker's own average, from the core's values. */
  for (const id of input.trackers.active) {
    const def = trackerDef(id);
    const recentAvg = averageOf(trackerWindowValues(input, id, recent));
    const priorAvg = averageOf(trackerWindowValues(input, id, prior));
    if (recentAvg !== null && priorAvg !== null) {
      const diff = recentAvg - priorAvg;
      const dir = directionFor(diff, FLAT_EPSILON[id]);
      out.push({
        id: `tracker-${id}`,
        label: def.name,
        direction: dir,
        sentence:
          dir === "flat"
            ? `${def.name} averaged ${def.format(Math.round(recentAvg))} a day over the last 7 days — much the same as the 7 days before.`
            : `${def.name} averaged ${def.format(Math.round(recentAvg))} a day over the last 7 days, ${directionWord[dir]} ${def.format(Math.round(priorAvg))} in the 7 days before.`,
        weight: Math.abs(diff) / Math.max(1, Math.abs(priorAvg)),
      });
    } else if (recentAvg !== null) {
      out.push({
        id: `tracker-${id}`,
        label: def.name,
        direction: "new",
        sentence: `${def.name} averaged ${def.format(Math.round(recentAvg))} a day over the last 7 days — no earlier week to compare yet.`,
        weight: 0.1,
      });
    }
  }

  /* Habit ticks — a count, honestly a count (due rules live in the habits
     engine; this page does not reinvent them). */
  const recentTicks = input.habits.logs.filter((l) => inWindow(l.date, recent)).length;
  const priorTicks = input.habits.logs.filter((l) => inWindow(l.date, prior)).length;
  if (recentTicks > 0 || priorTicks > 0) {
    const dir = directionFor(recentTicks - priorTicks, 0);
    out.push({
      id: "habit-ticks",
      label: "Habit ticks",
      direction: dir,
      sentence:
        dir === "flat"
          ? `You ticked habits ${recentTicks} times in the last 7 days — the same as the 7 days before.`
          : `You ticked habits ${recentTicks} ${recentTicks === 1 ? "time" : "times"} in the last 7 days, ${directionWord[dir]} ${priorTicks} in the 7 days before.`,
      weight: Math.abs(recentTicks - priorTicks) / Math.max(1, priorTicks),
    });
  }

  /* Days logged — how much of each week the record covers. Only compared
     when the record reaches back into the prior window at all; a record
     that began this week says so instead of scoring itself against
     seven empty days. */
  const recentDays = [...dayKeys].filter((d) => inWindow(d, recent)).length;
  const priorDays = [...dayKeys].filter((d) => inWindow(d, prior)).length;
  const earliest = [...dayKeys].sort()[0];
  if (earliest !== undefined && earliest > prior.end) {
    out.push({
      id: "days-logged",
      label: "Days logged",
      direction: "new",
      sentence: `Your record began this week — ${recentDays} ${recentDays === 1 ? "day" : "days"} logged so far.`,
      weight: 0.05,
    });
  } else if (recentDays > 0 || priorDays > 0) {
    const dir = directionFor(recentDays - priorDays, 0);
    out.push({
      id: "days-logged",
      label: "Days logged",
      direction: dir,
      sentence:
        dir === "flat"
          ? `You logged on ${recentDays} of the last 7 days — the same as the 7 days before.`
          : `You logged on ${recentDays} of the last 7 days, ${directionWord[dir]} ${priorDays} of the 7 days before.`,
      weight: Math.abs(recentDays - priorDays) / 7,
    });
  }

  /* Strongest movement first; genuinely-new series sit below real deltas. */
  return out
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 4)
    .map(({ weight: _weight, ...delta }) => delta);
}

/* --------------------------- priority signals ---------------------------- */

/** The active tracker gone quiet the longest, when one has truly gone quiet. */
function silentTracker(input: OverviewInput): { id: TrackerId; daysSilent: number; daysLogged: number } | null {
  let best: { id: TrackerId; daysSilent: number; daysLogged: number } | null = null;
  for (const id of input.trackers.active) {
    const stat = input.trackers.trackers[id];
    if (stat.daysLogged < 3) continue; // never really started — not "gone quiet"
    let last: string | null = null;
    for (const day of input.trackerDays) {
      if (valueOf(day, id) !== null && (last === null || day.date > last)) last = day.date;
    }
    if (last === null) continue;
    /* whole days between the last log and today, via day-key distance */
    let daysSilent = 0;
    for (let d = shiftDay(last, 1); d <= input.today; d = shiftDay(d, 1)) daysSilent += 1;
    if (daysSilent < 3) continue;
    if (!best || daysSilent > best.daysSilent) {
      best = { id, daysSilent, daysLogged: stat.daysLogged };
    }
  }
  return best;
}

function priorityRankOf(p: string): number {
  return p === "high" ? 0 : p === "medium" ? 1 : 2;
}

/* ------------------------------ the synthesis ---------------------------- */

export function synthesizeOverview(input: OverviewInput): OverviewSynthesis {
  const { today } = input;
  const dayKeys = recordDayKeys(input);
  const recordDays = dayKeys.size;
  const streak = currentStreak(dayKeys, today);
  const mood = moodWindows(input);
  const moodTodayEntry =
    input.moodEntries
      .filter((e) => localDay(e.timestamp) === today)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0] ?? null;
  const moodDown =
    mood.recentAvg !== null && mood.priorAvg !== null && mood.priorAvg - mood.recentAvg >= 1;
  const silent = silentTracker(input);
  const sleepRecent = averageOf(trackerWindowValues(input, "sleep", recentWindow(today)));
  const sleepPrior = averageOf(trackerWindowValues(input, "sleep", priorWindow(today)));
  const sleepDown =
    sleepRecent !== null && sleepPrior !== null && sleepPrior - sleepRecent >= 30;

  const { trackers, habits } = input;
  const sleepToday = trackers.trackers.sleep.today;
  const allHabitsDone = habits.dueToday > 0 && habits.completedToday >= habits.dueToday;
  const todayWritten =
    dayKeys.has(today) || habits.completedToday > 0 || moodTodayEntry !== null;

  /* ------------------------------- state -------------------------------- */
  let headline: string;
  if (recordDays === 0) {
    headline = "Your Bloom record is just beginning.";
  } else if (allHabitsDone && moodTodayEntry) {
    headline = "A settled day — everything you track is written down.";
  } else if (moodDown) {
    headline = "A slower stretch — recent days have felt heavier than the ones before.";
  } else if (!todayWritten) {
    headline = "A blank page so far today — the record underneath it is safe.";
  } else {
    headline = "The day is partly written.";
  }

  const lines: string[] = [];
  if (recordDays > 0) {
    if (habits.dueToday > 0) {
      lines.push(
        habits.completedToday >= habits.dueToday
          ? `All ${habits.dueToday} of today's habits are done.`
          : `${habits.completedToday} of ${habits.dueToday} habits done today.`,
      );
    } else if (habits.all.length > 0) {
      lines.push("No habits are due today.");
    }
    if (moodTodayEntry) {
      lines.push(`Mood logged at ${Math.round(moodTodayEntry.mood)}/10 today.`);
    } else if (mood.recentAvg !== null) {
      lines.push(
        `Mood over the last 7 days averages ${(Math.round(mood.recentAvg * 10) / 10).toString()} across ${mood.recentCount} check-ins.`,
      );
    }
    if (sleepToday !== null) {
      lines.push(`Last night's sleep: ${trackerDef("sleep").format(sleepToday)}.`);
    }
    if (streak >= 2) {
      lines.push(`You've logged ${streak} days in a row.`);
    }
  }

  const recentDays = [...dayKeys].filter((d) => inWindow(d, recentWindow(today))).length;
  const facts: OverviewFact[] = [
    { id: "days", label: "Days logged", value: String(recordDays) },
    { id: "week", label: "This week", value: `${recentDays} of 7 days` },
    { id: "streak", label: "Day streak", value: String(streak) },
  ];
  if (habits.points !== null) {
    facts.push({ id: "points", label: "Points", value: String(habits.points) });
  }

  /* ------------------------------ changes ------------------------------- */
  const deltas = computeDeltas(input, dayKeys);
  const changes: OverviewChanges = {
    windowLabel: OVERVIEW_WINDOW_LABEL,
    deltas,
    note:
      deltas.length > 0
        ? null
        : recordDays === 0
          ? "Nothing to compare yet — changes appear here once a week has something on both sides of it."
          : "Not enough logged days yet to compare weeks honestly. Keep logging, and this fills in.",
  };

  /* ------------------------- priority + action -------------------------- */
  const { priority, action } = choosePriority(input, {
    recordDays,
    moodDown,
    moodRecentAvg: mood.recentAvg,
    moodPriorAvg: mood.priorAvg,
    moodTodayLogged: moodTodayEntry !== null,
    silent,
    sleepDown,
    sleepRecent,
    sleepPrior,
  });

  return {
    state: { headline, lines: lines.slice(0, 3), facts, recordDays, streak },
    changes,
    priority,
    action,
  };
}

interface PrioritySignals {
  recordDays: number;
  moodDown: boolean;
  moodRecentAvg: number | null;
  moodPriorAvg: number | null;
  moodTodayLogged: boolean;
  silent: { id: TrackerId; daysSilent: number; daysLogged: number } | null;
  sleepDown: boolean;
  sleepRecent: number | null;
  sleepPrior: number | null;
}

/**
 * The rule ladder — first match wins, and every rung explains itself.
 * Order is deliberate: safety before everything; beginnings before
 * optimisation; a broken thread before a trend; today before the week.
 */
export function choosePriority(
  input: OverviewInput,
  signals: PrioritySignals,
): { priority: OverviewPriority; action: OverviewAction } {
  const { assessment, habits } = input;
  const summary = assessment.summary;
  const fmt1 = (v: number) => (Math.round(v * 10) / 10).toString();

  /* 1 — Safety outranks every other concern. The reason is the domain's
     own headline copy; this page never rephrases it. */
  if (
    assessment.state.status === "complete" &&
    summary &&
    SAFETY_CLASS_RANK[summary.safety.classification] >= SAFETY_CLASS_RANK.professional_review_required
  ) {
    return {
      priority: {
        id: "safety-review",
        title: "Your assessment comes first",
        reason: summary.safety.headline,
      },
      action: { kind: "assessment-summary", label: "Read your summary" },
    };
  }

  /* 2 — An empty record: the only thing that matters is the first entry. */
  if (signals.recordDays === 0) {
    const firstDue = habits.todayHabits.find((h) => !h.done);
    return {
      priority: {
        id: "first-steps",
        title: "Your record starts with one small log",
        reason:
          "Nothing is logged yet. One entry today starts the record — everything on this page grows from what you write down.",
      },
      action: firstDue
        ? { kind: "habit", label: `Tick ${firstDue.name}`, habitId: firstDue.id }
        : habits.all.length === 0
          ? { kind: "add-habit", label: "Add your first habit" }
          : { kind: "mood", label: "Log today's mood" },
    };
  }

  /* 3 — A part-finished assessment: finishing it sharpens everything else. */
  if (assessment.state.status === "in_progress") {
    return {
      priority: {
        id: "assessment-finish",
        title: "Finish your assessment",
        reason:
          "You started it, and your answers so far are saved. The remaining sections take a few minutes — and once it's complete, what this page suggests can be shaped around you.",
      },
      action: { kind: "assessment", label: "Continue assessment" },
    };
  }

  /* 4 — Not yet taken (and the record is alive): the ASSESS step feeds
     every later step of the cycle. */
  if (assessment.state.status === "not_started") {
    return {
      priority: {
        id: "assessment-start",
        title: "Take the short assessment",
        reason:
          "Seven short sections on how you eat, move, sleep and recover. It's what turns this page from a summary of your record into guidance shaped around your goal.",
      },
      action: { kind: "assessment", label: "Begin assessment" },
    };
  }

  /* 5 — A tracker that has gone quiet: gentle re-entry, never a backlog. */
  if (signals.silent) {
    const def = trackerDef(signals.silent.id);
    return {
      priority: {
        id: "silent-tracker",
        title: `${def.name} has gone quiet`,
        reason: `You last logged ${def.name.toLowerCase()} ${signals.silent.daysSilent} days ago, after ${signals.silent.daysLogged} logged ${signals.silent.daysLogged === 1 ? "day" : "days"}. One entry restarts the thread — there's nothing to catch up on.`,
      },
      action: { kind: "metrics", label: `Log ${def.name.toLowerCase()}` },
    };
  }

  /* 6 — Mood trending down against the person's own baseline: weight the
     day gently. The numbers are spoken, never a claim about why. */
  if (signals.moodDown && signals.moodRecentAvg !== null && signals.moodPriorAvg !== null) {
    return {
      priority: {
        id: "mood-down",
        title: "A lighter day is a reasonable plan",
        reason: `Your average mood over the last 7 days (${fmt1(signals.moodRecentAvg)}) sits below the 7 days before (${fmt1(signals.moodPriorAvg)}). Worth weighting today gently rather than loading it up.`,
      },
      action: signals.moodTodayLogged
        ? { kind: "link", label: "Talk it over with Coach", to: "/coach" }
        : { kind: "mood", label: "Log today's mood" },
    };
  }

  /* 7 — Sleep slipping by half an hour or more against their own baseline. */
  if (signals.sleepDown && signals.sleepRecent !== null && signals.sleepPrior !== null) {
    const def = trackerDef("sleep");
    return {
      priority: {
        id: "sleep-down",
        title: "Sleep has been slipping",
        reason: `You averaged ${def.format(Math.round(signals.sleepRecent))} a night over the last 7 days, down from ${def.format(Math.round(signals.sleepPrior))} in the 7 days before.`,
      },
      action:
        input.trackers.trackers.sleep.today === null
          ? { kind: "metrics", label: "Log last night's sleep" }
          : { kind: "link", label: "See your sleep record", to: "/trackers" },
    };
  }

  /* 8 — The highest-priority habit still open today (the Focus panel's
     own ordering, so the two surfaces never argue). */
  const openHabits = habits.todayHabits
    .filter((h) => !h.done)
    .sort((a, b) => priorityRankOf(a.priority) - priorityRankOf(b.priority));
  const topHabit = openHabits[0];
  if (topHabit) {
    return {
      priority: {
        id: "top-habit",
        title: topHabit.name,
        reason:
          topHabit.priority === "high"
            ? "It's due today, still open — and it's the one you marked as high priority."
            : "It's due today and still open. One tick and today is fully written.",
      },
      action: { kind: "habit", label: "Tick it off", habitId: topHabit.id },
    };
  }

  /* 9 — Everything due is done; the day's check-in is the missing piece. */
  if (!signals.moodTodayLogged) {
    return {
      priority: {
        id: "mood-today",
        title: "Today's mood check-in",
        reason: "Thirty seconds, and today's picture is complete.",
      },
      action: { kind: "mood", label: "Log today's mood" },
    };
  }

  /* 10 — A steady day: nothing needs chasing. When the assessment is
     complete, its goal is named as the thing being steered by. */
  const goal = assessment.state.answers.goal;
  return {
    priority: {
      id: "steady",
      title: "Nothing needs chasing today",
      reason:
        summary && goal
          ? `Everything due is done and today's check-ins are in. This page is quietly steering by your assessment goal — ${GOAL_LABEL[goal].toLowerCase()} — and will speak up when something changes.`
          : "Everything due is done and today's check-ins are in. This page will speak up when something changes.",
    },
    action: { kind: "link", label: "See your weekly report", to: "/report" },
  };
}
