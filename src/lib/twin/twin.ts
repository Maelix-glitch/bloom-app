/**
 * The Metabolic Twin — a living model of the person, computed on read
 * from their own recorded data. Nothing here is stored, and nothing
 * here is invented: every field of the snapshot is either a value
 * derived by a stated computation over the real record, or an honest
 * `insufficient` carrying what exists, why it is not enough, and what
 * would unlock it.
 *
 * The Twin owns almost no mathematics of its own. Where Bloom already
 * has a gated estimator, the Twin consumes it rather than growing a
 * second one that could disagree with the first:
 *
 *   · **Expenditure** is `estimateExpenditure` (nutrition/expenditure)
 *     — the energy-balance identity over logged intake and weigh-ins,
 *     gated at 10 logged days between two weigh-ins spanning 10–35
 *     days, weight change converted at a stated 7,700 kcal/kg.
 *   · **Nutrient gaps** are `microGapsFor` (nutrition/planAdaptation)
 *     — the Spectrum averaged over the last logged week against ICMR
 *     references; a gap is a reporting-days average under 70%.
 *   · **Habit due-days** are `isDueOn` (home/habits) — the same rule
 *     the Today screen uses to decide what a habit asks of a day.
 *
 * What the Twin adds is the assembly: a weight trend from the
 * weigh-in record, habit-completion and food-log-coverage patterns
 * over the last 14 completed days, and one snapshot whose fields all
 * speak the same honest-state language.
 *
 * Completed days only for the pattern windows: today is still being
 * written, and judging a person by a half-logged day would punish
 * them for logging breakfast. Weigh-ins and the expenditure window
 * follow their own modules' rules (weigh-ins up to and including
 * today).
 *
 * Pure and deterministic: same record, same day → same snapshot.
 * No AI anywhere in the computation.
 */

import { shiftDay } from "@/lib/localDay";
import type { WeighIn } from "@/lib/health/body";
import { isDueOn, type Habit, type HabitLog } from "@/lib/home/habits";
import {
  estimateExpenditure,
  EXPENDITURE_MIN_LOGGED_DAYS,
  type ExpenditureEstimate,
} from "@/lib/nutrition/expenditure";
import {
  microGapsFor,
  MICRO_GAP_RATIO,
  MICRO_MIN_DAYS,
  MICRO_WINDOW_DAYS,
  type MicroGap,
} from "@/lib/nutrition/planAdaptation";
import type { SpectrumSex } from "@/lib/nutrition/dayView";
import type { NutritionTargets } from "@/lib/nutrition/targets";
import type { LogEntry } from "@/lib/nutrition/types";

/** Completed days the habit and food-log patterns read back over. */
export const TWIN_PATTERN_WINDOW_DAYS = 14;
/** The weight trend reads weigh-ins within this many days of the
 *  latest one; older points describe an older body. */
export const TWIN_TREND_WINDOW_DAYS = 35;
/** Logged days an intake average must rest on before the Twin states
 *  one — one day is an anecdote (the plan adaptation's rule). */
export const TWIN_MIN_AVERAGE_DAYS = 2;

/**
 * One field of the Twin. A `value` always travels with the provenance
 * of the computation that produced it; an `insufficient` says what
 * the record holds, why no honest value can be stated, and the
 * concrete thing that would unlock it.
 */
export type TwinField<T> =
  | { state: "value"; value: T; provenance: string }
  | { state: "insufficient"; reason: string; unlock: string; provenance: string };

export interface WeightTrend {
  fromDate: string;
  toDate: string;
  fromKg: number;
  toKg: number;
  /** Last minus first weigh-in in the window, kg (one decimal, as recorded). */
  changeKg: number;
  /** Days between the two weigh-ins. */
  spanDays: number;
  /** Weigh-ins inside the judged window. */
  points: number;
  /** changeKg per week, one decimal; null when the span is 0 days. */
  rateKgPerWeek: number | null;
}

export interface HabitAdherence {
  /** Active (non-archived) habits judged. */
  habits: number;
  /** Days in the window at least one habit was due, summed per habit. */
  dueDays: number;
  /** Of those, the days the habit was actually completed. */
  doneDays: number;
  /** doneDays ÷ dueDays, unrounded. */
  rate: number;
  windowDays: number;
}

export interface LogCoverage {
  /** Days in the window holding at least one food-log entry. */
  daysLogged: number;
  windowDays: number;
  /** Mean logged energy over the logged days; null under
   *  TWIN_MIN_AVERAGE_DAYS logged days — an average is not stated
   *  from a single day. */
  avgKcal: number | null;
  /** Mean logged protein over the logged days; same rule. */
  avgProteinG: number | null;
  /** avgKcal ÷ target kcal; null when there are no targets or no
   *  stated average. A comparison, never a moved target. */
  kcalVsTarget: number | null;
  /** avgProteinG ÷ target protein; same rule. */
  proteinVsTarget: number | null;
}

export interface TwinSnapshot {
  /** The local day the snapshot was computed for. */
  day: string;
  /** Estimated daily maintenance energy, from the record itself. */
  expenditure: TwinField<ExpenditureEstimate>;
  /** Where the weigh-in record says the weight is heading. */
  weightTrend: TwinField<WeightTrend>;
  /** Habit completion over the last completed fortnight. */
  habitAdherence: TwinField<HabitAdherence>;
  /** Food-log coverage (and, when it can be stated, the recent
   *  intake average against the targets). Always a value: zero
   *  logged days in the window is a true measurement, not a gap
   *  in the data. */
  logCoverage: TwinField<LogCoverage>;
  /** Micronutrients persistently under the ICMR reference. A value
   *  of [] is a judged finding — none under the line — not silence. */
  nutrientGaps: TwinField<MicroGap[]>;
  /** How many of the fields carry a value (logCoverage always does). */
  readyCount: number;
  totalFields: number;
}

export interface TwinInputs {
  entries: readonly LogEntry[];
  weighIns: readonly WeighIn[];
  habits: readonly Habit[];
  habitLogs: readonly HabitLog[];
  /** The person's intake targets, or null when the engine states
   *  none (safety refusal / incomplete profile). Used only to
   *  compare the recent average against — never moved. */
  targets: NutritionTargets | null;
  sex: SpectrumSex;
  day: string;
}

function daySpan(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/* ------------------------------ weight trend ------------------------------ */

function weightTrendFor(weighIns: readonly WeighIn[], day: string): TwinField<WeightTrend> {
  const points = weighIns
    .filter((w) => w.date <= day)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  if (points.length === 0) {
    return {
      state: "insufficient",
      reason: "No weigh-ins on record yet.",
      unlock: "Log your weight on two different days and the trend appears.",
      provenance: "From your weigh-ins — none recorded",
    };
  }
  const last = points[points.length - 1]!;
  if (points.length === 1) {
    return {
      state: "insufficient",
      reason: `One weigh-in on record: ${last.kg} kg on ${last.date}.`,
      unlock: "One more weigh-in on a different day starts the trend.",
      provenance: "From your weigh-ins — 1 recorded",
    };
  }
  /* The judged window ends at the latest weigh-in (not today: a
     trend is a statement about the recorded points, and its dates
     are stated). If the window holds fewer than two points, the
     last two points overall are judged, with their real span. */
  const windowStart = shiftDay(last.date, -TWIN_TREND_WINDOW_DAYS);
  let judged = points.filter((w) => w.date >= windowStart);
  if (judged.length < 2) judged = points.slice(-2);
  const first = judged[0]!;
  const spanDays = daySpan(first.date, last.date);
  const changeKg = round1(last.kg - first.kg);
  return {
    state: "value",
    value: {
      fromDate: first.date,
      toDate: last.date,
      fromKg: first.kg,
      toKg: last.kg,
      changeKg,
      spanDays,
      points: judged.length,
      rateKgPerWeek: spanDays > 0 ? round1((changeKg / spanDays) * 7) : null,
    },
    provenance: `From ${judged.length} weigh-ins, ${first.date} to ${last.date}`,
  };
}

/* ---------------------------- habit adherence ----------------------------- */

function habitAdherenceFor(
  habits: readonly Habit[],
  habitLogs: readonly HabitLog[],
  day: string,
): TwinField<HabitAdherence> {
  const active = habits.filter((h) => !h.archived);
  if (active.length === 0) {
    return {
      state: "insufficient",
      reason: "No active habits.",
      unlock: "Add a habit and its completion pattern joins your twin.",
      provenance: "From your habits — none active",
    };
  }
  const completed = new Set(habitLogs.map((l) => `${l.habitId}|${l.date}`));
  let dueDays = 0;
  let doneDays = 0;
  for (let back = TWIN_PATTERN_WINDOW_DAYS; back >= 1; back -= 1) {
    const date = shiftDay(day, -back);
    for (const habit of active) {
      if (!isDueOn(habit, date, habitLogs)) continue;
      dueDays += 1;
      if (completed.has(`${habit.id}|${date}`)) doneDays += 1;
    }
  }
  if (dueDays === 0) {
    return {
      state: "insufficient",
      reason: `No habit was due in the last ${TWIN_PATTERN_WINDOW_DAYS} completed days.`,
      unlock: "As your habits come due, their completion pattern appears here.",
      provenance: `From ${active.length} active ${plural(active.length, "habit", "habits")} and their logs`,
    };
  }
  return {
    state: "value",
    value: {
      habits: active.length,
      dueDays,
      doneDays,
      rate: doneDays / dueDays,
      windowDays: TWIN_PATTERN_WINDOW_DAYS,
    },
    provenance: `From ${active.length} active ${plural(active.length, "habit", "habits")} over the last ${TWIN_PATTERN_WINDOW_DAYS} completed days`,
  };
}

/* ----------------------------- log coverage ------------------------------- */

function logCoverageFor(
  entries: readonly LogEntry[],
  day: string,
  targets: NutritionTargets | null,
): TwinField<LogCoverage> {
  const windowStart = shiftDay(day, -TWIN_PATTERN_WINDOW_DAYS);
  const byDay = new Map<string, { kcal: number; proteinG: number }>();
  for (const entry of entries) {
    if (entry.day < windowStart || entry.day >= day) continue;
    const totals = byDay.get(entry.day) ?? { kcal: 0, proteinG: 0 };
    totals.kcal += entry.nutrients.kcal;
    totals.proteinG += entry.nutrients.proteinG;
    byDay.set(entry.day, totals);
  }
  const daysLogged = byDay.size;
  let avgKcal: number | null = null;
  let avgProteinG: number | null = null;
  if (daysLogged >= TWIN_MIN_AVERAGE_DAYS) {
    let kcal = 0;
    let proteinG = 0;
    for (const totals of byDay.values()) {
      kcal += totals.kcal;
      proteinG += totals.proteinG;
    }
    avgKcal = kcal / daysLogged;
    avgProteinG = proteinG / daysLogged;
  }
  return {
    state: "value",
    value: {
      daysLogged,
      windowDays: TWIN_PATTERN_WINDOW_DAYS,
      avgKcal,
      avgProteinG,
      kcalVsTarget: targets && avgKcal !== null && targets.kcal > 0 ? avgKcal / targets.kcal : null,
      proteinVsTarget:
        targets && avgProteinG !== null && targets.proteinG > 0 ? avgProteinG / targets.proteinG : null,
    },
    provenance: `From your food log, last ${TWIN_PATTERN_WINDOW_DAYS} completed days`,
  };
}

/* ----------------------------- nutrient gaps ------------------------------ */

function nutrientGapsFor(
  entries: readonly LogEntry[],
  day: string,
  sex: SpectrumSex,
): TwinField<MicroGap[]> {
  const loggedDays = new Set<string>();
  for (const entry of entries) {
    if (entry.day < day) loggedDays.add(entry.day);
  }
  if (loggedDays.size < MICRO_MIN_DAYS) {
    return {
      state: "insufficient",
      reason: `${loggedDays.size} ${plural(loggedDays.size, "logged day", "logged days")} on record — a nutrient pattern needs at least ${MICRO_MIN_DAYS}.`,
      unlock: `Log ${MICRO_MIN_DAYS} or more days and the nutrients your foods report can be judged against their references.`,
      provenance: "From your food log's nutrient panels",
    };
  }
  return {
    state: "value",
    value: microGapsFor(entries, day, sex),
    provenance: `Spectrum averaged over your last ${MICRO_WINDOW_DAYS} logged days · ICMR references · a gap is under ${Math.round(MICRO_GAP_RATIO * 100)}% of the reference`,
  };
}

/* ------------------------------- snapshot --------------------------------- */

/**
 * The Twin, assembled in one deterministic pass over the record.
 * Each field is judged by its own gate; one field's insufficiency
 * never silences another's value.
 */
export function buildTwinSnapshot(inputs: TwinInputs): TwinSnapshot {
  const { entries, weighIns, habits, habitLogs, targets, sex, day } = inputs;

  const expenditureResult = estimateExpenditure(entries, weighIns, day);
  const expenditure: TwinField<ExpenditureEstimate> =
    expenditureResult.kind === "ready"
      ? {
          state: "value",
          value: expenditureResult.estimate,
          provenance: `From ${expenditureResult.estimate.loggedDays} logged days and your weigh-ins, ${expenditureResult.estimate.fromDate} to ${expenditureResult.estimate.toDate} · weight change converted at 7,700 kcal per kg`,
        }
      : {
          state: "insufficient",
          reason: `${expenditureResult.loggedDays} of the ${EXPENDITURE_MIN_LOGGED_DAYS} logged days, and ${expenditureResult.weightPoints} ${plural(expenditureResult.weightPoints, "weigh-in", "weigh-ins")} spanning ${expenditureResult.spanDays} ${plural(expenditureResult.spanDays, "day", "days")}, are on record.`,
          unlock: `Log food on ${EXPENDITURE_MIN_LOGGED_DAYS} days between two weigh-ins at least 10 days apart and your maintenance estimate appears — no formula guess in the meantime.`,
          provenance: "From your food log and weigh-ins so far",
        };

  const weightTrend = weightTrendFor(weighIns, day);
  const habitAdherence = habitAdherenceFor(habits, habitLogs, day);
  const logCoverage = logCoverageFor(entries, day, targets);
  const nutrientGaps = nutrientGapsFor(entries, day, sex);

  const fields = [expenditure, weightTrend, habitAdherence, logCoverage, nutrientGaps];
  return {
    day,
    expenditure,
    weightTrend,
    habitAdherence,
    logCoverage,
    nutrientGaps,
    readyCount: fields.filter((f) => f.state === "value").length,
    totalFields: fields.length,
  };
}
