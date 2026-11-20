/**
 * Nutrition — the day-rhythm preference and the whole-day care
 * derivation (M-162).
 *
 * The plan's caretaker layer: the food plan says what the day eats;
 * this module says how the day around the meals is held — a set
 * sleep window, the movement target placed in the day, and the
 * evening's do / avoid lines. It is a GUIDANCE layer over data the
 * person already gave Bloom, and it computes nothing medical:
 *
 *   · the wake time is the person's own, stored as a preference in
 *     the shared preferences document under its own versioned key
 *     — so it syncs, exports and erases with every other
 *     preference, exactly like the snack placement (see
 *     snackPlacement.ts). A person who has never chosen gets the
 *     default below.
 *   · the bedtime is arithmetic, not advice: wake time minus the
 *     sleep target from the Trackers goals. No target read, the
 *     Trackers' own default stands in (480 minutes).
 *   · movement and screen figures are the Trackers goals verbatim
 *     (their defaults stand in the same way: 30 and 180 minutes).
 *   · the meal facts — which meal is the day's largest, when the
 *     last meal sits — come from the composed plan itself: its
 *     meals' own totals and its timeline's own clock times. A
 *     plan whose timeline carries no clock (a relative day) gives
 *     no last-meal time, and the derivation says so (null) rather
 *     than inventing one.
 *
 * The evening windows are general care rules, stated as the plain
 * constants they are: caffeine in the last eight hours, a heavy
 * meal in the last two, screens in the last one. They are rules of
 * thumb for the day's rhythm — never a prescription, and the
 * section that renders them says so.
 *
 * Nothing here touches composition: PLAN_METHOD_VERSION, the
 * targets and the composer are exactly as they were. Changing the
 * wake time rewrites no plan and names nothing stale — the plan's
 * own timeline keeps its sleep-log anchor; this frame is the
 * caretaker's, laid beside it.
 */

import type { PlanMeal, PlanTimeline, PlanTimelineItem } from "./plan";
import type { Meal } from "./types";

/* ------------------------------ the preference ------------------------------ */

export const DAY_RHYTHM_KEY = "health.dayRhythm.v1";

export interface DayRhythm {
  /** The time the day starts, "HH:MM", 24-hour — the person's own
   *  statement, edited in the whole-day section. */
  wakeTime: string;
}

/** The wake time a person who has never chosen gets. */
export const DEFAULT_DAY_RHYTHM: DayRhythm = { wakeTime: "06:30" };

/** A clock time as the plan's timeline states it: "HH:MM", 24-hour
 *  (the same shape plan.ts validates its anchors against). */
const CLOCK_TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isClockTime(raw: unknown): raw is string {
  return typeof raw === "string" && CLOCK_TIME_RE.test(raw);
}

/** Parse a stored preference value. Only an object carrying a
 *  well-formed wake time is a preference; anything else is not —
 *  the default stands, never a guess. */
export function parseDayRhythm(raw: unknown): DayRhythm | null {
  if (!raw || typeof raw !== "object") return null;
  const wakeTime = (raw as Record<string, unknown>)["wakeTime"];
  return isClockTime(wakeTime) ? { wakeTime } : null;
}

/* ------------------------------- clock math -------------------------------- */

/** "HH:MM" → minutes since midnight. The caller validates the
 *  shape first (isClockTime); malformed pieces read as zero. */
export function clockToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Minutes → "HH:MM", wrapped onto the clock face. */
export function minutesToClock(total: number): string {
  const wrapped = ((Math.round(total) % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** A span of minutes in words: "8 hours", "1 hour", "7 hours 30
 *  minutes", "45 minutes", "1 minute". */
export function durationText(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  const hours = h === 1 ? "1 hour" : `${h} hours`;
  const mins = m === 1 ? "1 minute" : `${m} minutes`;
  if (h === 0) return mins;
  if (m === 0) return hours;
  return `${hours} ${mins}`;
}

/* ------------------------------ the derivation ----------------------------- */

/** The Trackers' own defaults, standing in when a goal cannot be
 *  read (DEFAULT_GOALS in lib/trackers/core — the same figures,
 *  named here so the fallback is a decision, not a drift). */
export const FALLBACK_SLEEP_MINUTES = 480;
export const FALLBACK_MOVEMENT_MINUTES = 30;
export const FALLBACK_SCREEN_MINUTES = 180;

/** The evening's general care windows, in minutes before bed. */
export const CAFFEINE_BEFORE_BED_MINUTES = 8 * 60;
export const LAST_MEAL_BEFORE_BED_MINUTES = 2 * 60;
export const WIND_DOWN_BEFORE_BED_MINUTES = 60;

const SLOT_LABEL: Record<Meal, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export interface DayCaretakerInput {
  /** The rhythm preference's wake time, "HH:MM". */
  wakeTime: string;
  /** The Trackers goals, verbatim; null when a goal cannot be read
   *  (its fallback above then stands in). */
  sleepGoalMinutes: number | null;
  movementGoalMinutes: number | null;
  screenGoalMinutes: number | null;
  /** The composed plan's meals — their own totals pick the day's
   *  largest meal. */
  meals: readonly Pick<PlanMeal, "meal" | "kcal">[];
  /** The composed plan's timeline — its own clock times place the
   *  meals; a relative timeline (or none) places none. */
  timeline: PlanTimeline | null | undefined;
}

export interface DayCaretakerMeal {
  meal: Meal;
  /** The plan's own name for the meal (the timeline's label where
   *  the timeline names it, the slot's plain name otherwise). */
  label: string;
  /** The timeline's clock for the meal, "HH:MM"; null when the
   *  plan's day carries no clock for it. */
  time: string | null;
}

export interface DayCaretaker {
  wakeTime: string;
  /** Wake minus the sleep target, wrapped onto the clock face —
   *  a 06:30 wake on an 8-hour target is in bed by 22:30. */
  bedTime: string;
  sleepMinutes: number;
  movementMinutes: number;
  screenMinutes: number;
  /** Bedtime minus one hour: where the evening's wind-down starts. */
  windDownTime: string;
  /** Bedtime minus eight hours: the day's caffeine boundary. */
  caffeineCutoff: string;
  /** Bedtime minus two hours: a last meal wants to end by here. */
  lastMealEndsBy: string;
  /** The composed meal carrying the day's most energy, from the
   *  meals' own totals (the first such meal, on a tie). Null when
   *  the plan holds no meal with any energy at all. */
  largestMeal: DayCaretakerMeal | null;
  /** The day's final eating item on the plan's own clock, or null
   *  when the timeline carries no clock times. */
  lastMeal: DayCaretakerMeal | null;
  /** Whether the last meal sits inside the two hours before bed.
   *  Null when there is no clock to judge by — the section then
   *  states the rule against the bedtime alone. */
  lastMealInsideWindow: boolean | null;
}

function timelineMealItems(timeline: PlanTimeline | null | undefined): readonly PlanTimelineItem[] {
  return (timeline?.items ?? []).filter((i) => i.kind === "meal" && i.meal);
}

export function dayCaretakerOf(input: DayCaretakerInput): DayCaretaker {
  const sleepMinutes = input.sleepGoalMinutes ?? FALLBACK_SLEEP_MINUTES;
  const movementMinutes = input.movementGoalMinutes ?? FALLBACK_MOVEMENT_MINUTES;
  const screenMinutes = input.screenGoalMinutes ?? FALLBACK_SCREEN_MINUTES;

  const wakeMinutes = clockToMinutes(input.wakeTime);
  const bedTime = minutesToClock(wakeMinutes - sleepMinutes);
  const bedMinutes = clockToMinutes(bedTime);

  const items = timelineMealItems(input.timeline);
  const itemFor = (meal: Meal) => items.find((i) => i.meal === meal);
  const mealFact = (meal: Meal): DayCaretakerMeal => {
    const item = itemFor(meal);
    return {
      meal,
      label: item?.label ?? SLOT_LABEL[meal],
      time: item?.time ?? null,
    };
  };

  /* The largest meal, from the composed totals alone. */
  let largest: DayCaretakerMeal | null = null;
  let largestKcal = 0;
  for (const m of input.meals) {
    if (m.kcal > largestKcal) {
      largestKcal = m.kcal;
      largest = mealFact(m.meal);
    }
  }

  /* The last meal on the plan's own clock: the final meal item the
     timeline gives a time to (the timeline is laid out in day
     order). No timed meal item — no last-meal time, honestly. */
  const timed = items.filter((i): i is PlanTimelineItem & { time: string } => i.time !== null);
  const lastItem = timed[timed.length - 1];
  const lastMeal: DayCaretakerMeal | null = lastItem
    ? { meal: lastItem.meal!, label: lastItem.label, time: lastItem.time }
    : null;

  /* The window judgement, on the caretaker's own frame: offsets
     from the wake time, so a bedtime past midnight and a meal
     after midnight both land on the same line. A sleep target
     that leaves no sane awake span (zero, or a full day or more)
     gives no frame to judge in — null, like a missing clock. */
  let lastMealInsideWindow: boolean | null = null;
  if (lastMeal?.time && sleepMinutes > 0 && sleepMinutes < 1440) {
    const awakeSpan = 1440 - sleepMinutes;
    const mealOffset = (clockToMinutes(lastMeal.time) - wakeMinutes + 1440) % 1440;
    lastMealInsideWindow =
      mealOffset > awakeSpan - LAST_MEAL_BEFORE_BED_MINUTES && mealOffset <= awakeSpan;
  }

  return {
    wakeTime: input.wakeTime,
    bedTime,
    sleepMinutes,
    movementMinutes,
    screenMinutes,
    windDownTime: minutesToClock(bedMinutes - WIND_DOWN_BEFORE_BED_MINUTES),
    caffeineCutoff: minutesToClock(bedMinutes - CAFFEINE_BEFORE_BED_MINUTES),
    lastMealEndsBy: minutesToClock(bedMinutes - LAST_MEAL_BEFORE_BED_MINUTES),
    largestMeal: largest,
    lastMeal,
    lastMealInsideWindow,
  };
}
