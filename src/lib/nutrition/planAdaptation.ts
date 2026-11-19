/**
 * Plan adaptation — the plan learns from the days actually logged.
 *
 * Until now the composer composed from targets alone: the same person,
 * eating the same way, got the same shape of plan whether their logged
 * days showed them landing far under their protein target or far over
 * their energy target. This module reads the recent food log and
 * turns it into a small, explainable bias the composer applies while
 * choosing — never while aiming:
 *
 *   · **Targets never change.** The adaptation reads the targets to
 *     judge the log against them; it cannot move them, and nothing in
 *     it is written back into the plan's targets, inputs snapshot or
 *     fingerprint. It biases *selection within the composer's own
 *     rules* — which dish anchors a meal, which top-up is picked,
 *     whether the energy top-up round runs at all.
 *   · **Fewer than two logged days, no adaptation.** One day is an
 *     anecdote; the function returns null and the composer behaves
 *     exactly as it did before this module existed.
 *   · **Only completed days count.** Days strictly before the plan's
 *     own day — today's log is still being written, and judging a
 *     plan by a half-eaten day would punish a person for logging
 *     breakfast. At most the three most recent logged days are read.
 *   · **Every adaptation explains itself**, in a note carrying the
 *     real averaged numbers, which the plan surfaces with its other
 *     composition notes.
 *
 * Day totals are the sums of the entries' stored nutrients — the same
 * numbers the Nutrition tab shows for those days, computed at log
 * time from each food's values. Nothing is re-estimated here.
 *
 * Pure: entries in, an adaptation (or null) out.
 */

import { shiftDay } from "@/lib/localDay";
import type { PlanReason } from "@/lib/reasons";
import { spectrumForDay, type SpectrumSex } from "./dayView";
import type { DailyPlan } from "./plan";
import type { NutritionTargets } from "./targets";
import type { LogEntry, OptionalNutrientKey } from "./types";

/** How many recent logged days the adaptation reads at most. */
export const ADAPTATION_MAX_DAYS = 3;
/** Fewer logged days than this and there is nothing to learn from. */
export const ADAPTATION_MIN_DAYS = 2;
/** Average protein under this share of the target, across the logged
 *  days, is a pattern — not a bad day — and the plan leans protein-first. */
export const PROTEIN_SHORTFALL_RATIO = 0.85;
/** Average energy over this share of the target, across the logged
 *  days, and the plan stops spending top-ups on energy. */
export const ENERGY_OVERSHOOT_RATIO = 1.1;

export interface PlanAdaptation {
  /** How many logged days the signals were computed over (2–3). */
  days: number;
  /** The logged days' mean energy, as logged (unrounded). */
  avgKcal: number;
  /** The logged days' mean protein, as logged (unrounded). */
  avgProteinG: number;
  /** Lean on higher-protein anchors and top-ups. */
  proteinShortfall: boolean;
  /** Leave the energy top-ups out; the dishes carry the day. */
  energyOvershoot: boolean;
  /** The explanations, as STRUCTURED reasons (brief v4: the words
   *  live in src/lib/reasons.ts; this module returns the numbers).
   *  They lead the plan's reasons. */
  reasons: PlanReason[];
}

interface DayTotals {
  day: string;
  kcal: number;
  proteinG: number;
}

/** The recent logged days before `day`, newest first, capped. A day
 *  counts as logged when it holds at least one entry. */
function recentLoggedDays(entries: readonly LogEntry[], day: string): DayTotals[] {
  const byDay = new Map<string, DayTotals>();
  for (const entry of entries) {
    if (entry.day >= day) continue;
    const totals = byDay.get(entry.day) ?? { day: entry.day, kcal: 0, proteinG: 0 };
    totals.kcal += entry.nutrients.kcal;
    totals.proteinG += entry.nutrients.proteinG;
    byDay.set(entry.day, totals);
  }
  return [...byDay.values()].sort((a, b) => (a.day < b.day ? 1 : -1)).slice(0, ADAPTATION_MAX_DAYS);
}

const whole = (n: number) => Math.round(n).toLocaleString("en-US");

/**
 * The adaptation for a plan, or null when there is nothing honest to
 * adapt from: too few logged days, or logged days that land close
 * enough to the targets that the unbiased composer is the right answer.
 */
export function planAdaptationFor(
  entries: readonly LogEntry[],
  day: string,
  targets: NutritionTargets,
): PlanAdaptation | null {
  const days = recentLoggedDays(entries, day);
  if (days.length < ADAPTATION_MIN_DAYS) return null;
  if (!(targets.kcal > 0) || !(targets.proteinG > 0)) return null;

  const avgKcal = days.reduce((sum, d) => sum + d.kcal, 0) / days.length;
  const avgProteinG = days.reduce((sum, d) => sum + d.proteinG, 0) / days.length;
  const proteinShortfall = avgProteinG < PROTEIN_SHORTFALL_RATIO * targets.proteinG;
  const energyOvershoot = avgKcal > ENERGY_OVERSHOOT_RATIO * targets.kcal;
  if (!proteinShortfall && !energyOvershoot) return null;

  const reasons: PlanReason[] = [];
  if (proteinShortfall) {
    reasons.push({
      kind: "log-protein-shortfall",
      days: days.length,
      avgProteinG,
      targetProteinG: targets.proteinG,
    });
  }
  if (energyOvershoot) {
    reasons.push({
      kind: "log-energy-overshoot",
      days: days.length,
      avgKcal,
      targetKcal: targets.kcal,
    });
  }
  return { days: days.length, avgKcal, avgProteinG, proteinShortfall, energyOvershoot, reasons };
}

/* ============================ v2: deeper learning ============================
 *
 * The P7 pass: the plan learns the person, not just their last three
 * days' totals.
 *
 *   · **Acceptance.** A dish the person logs again and again is a dish
 *     they like — it leads the picks. A dish the last stored plan
 *     served on a completed day that was never logged that day, and
 *     has not been logged at all in the window, sits further back.
 *     (Bloom keeps ONE stored plan, not a plan history, so "offered
 *     and skipped" is judged on the most recent completed plan only —
 *     several cycles are not observable and are never claimed.)
 *   · **Micronutrient gaps.** The Spectrum computation, averaged over
 *     the last logged week: a nutrient persistently under ~70% of its
 *     ICMR reference — from the foods that report it, floors stated
 *     as floors — biases selection toward dishes whose COMPUTED
 *     panels are rich in it. No nutrient value is ever invented:
 *     the gaps come from the log's own stored panels, the richness
 *     from the dishes' recipe-computed panels.
 *   · **Portion realism.** When the grams a person actually logs for
 *     a food persistently differ from the grams the plan serves, that
 *     is recorded as a signal. It changes nothing by itself — it is
 *     surfaced, with both numbers, on the "what your plan learned"
 *     surface.
 *
 * Everything is a count, a sum or a stated comparison over the log —
 * deterministic, and silent (no bias, no note) when the data is not
 * there. Targets are never touched: like the P6 signals, these bias
 * selection inside the composer's own rules only.
 */

/** Days of log the acceptance and portion learning read back over. */
export const LEARNING_WINDOW_DAYS = 28;
/** A dish logged at least this many times in the window is a dish
 *  the person returns to — it leads the picks. */
export const FAVOURED_MIN_LOGS = 2;
/** Logged days the micronutrient averaging reads at most. */
export const MICRO_WINDOW_DAYS = 7;
/** A nutrient needs at least this many reporting days before a gap
 *  is claimed — fewer is an anecdote, not a pattern. */
export const MICRO_MIN_DAYS = 4;
/** Average coverage under this share of the reference is a gap. */
export const MICRO_GAP_RATIO = 0.7;
/** A dish counts as rich in a nutrient when one serving carries at
 *  least this share of the nutrient's daily reference. The composer
 *  applies it to the dish's computed panel. */
export const MICRO_RICH_SHARE = 0.2;
/** Days of log the portion-realism signal reads back over. */
export const PORTION_WINDOW_DAYS = 14;
/** Portions need at least this many logs before a pattern is named. */
export const PORTION_MIN_LOGS = 2;
/** A typical logged portion this far from the planned portion (as a
 *  share of the planned portion) is a pattern worth surfacing. */
export const PORTION_DIVERGENCE = 0.25;

/** The dish a log entry came from, or null: dish entries carry the
 *  `recipe` provenance whose sourceId IS the dish's id (dishLog.ts). */
function dishIdOf(entry: LogEntry): string | null {
  return entry.provenance.kind === "recipe" ? entry.provenance.sourceId : null;
}

export interface FavouredDish {
  dishId: string;
  /** The dish's name as logged (the library's English name). */
  name: string;
  /** How many times it was logged inside the window. */
  count: number;
}

export interface DeprioritisedDish {
  dishId: string;
  name: string;
}

/** Per-dish acceptance over the window before `day`: how often each
 *  dish was actually logged, most-logged first (count desc, then
 *  name, then id — a total order, so the result never depends on
 *  entry order). */
export function dishAcceptanceFor(
  entries: readonly LogEntry[],
  day: string,
): { dishId: string; name: string; count: number }[] {
  const windowStart = shiftDay(day, -LEARNING_WINDOW_DAYS);
  const byDish = new Map<string, { name: string; count: number }>();
  for (const entry of entries) {
    if (entry.day < windowStart || entry.day >= day) continue;
    const dishId = dishIdOf(entry);
    if (dishId === null) continue;
    const seen = byDish.get(dishId) ?? { name: entry.name, count: 0 };
    seen.count += 1;
    byDish.set(dishId, seen);
  }
  return [...byDish.entries()]
    .map(([dishId, v]) => ({ dishId, name: v.name, count: v.count }))
    .sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name) || (a.dishId < b.dishId ? -1 : 1),
    );
}

/** Dishes the most recent stored plan served on a completed day that
 *  the person did not log that day and has not logged at all in the
 *  window. Empty when there is no stored plan, when the stored plan
 *  is for `day` itself or later (a same-day regeneration is not a
 *  skipped cycle), or when every served dish was logged. */
export function offeredButUnloggedFor(
  entries: readonly LogEntry[],
  storedPlan: DailyPlan | null,
  day: string,
): DeprioritisedDish[] {
  if (!storedPlan || storedPlan.day >= day) return [];
  const acceptance = new Map(dishAcceptanceFor(entries, day).map((d) => [d.dishId, d.count]));
  const loggedOnPlanDay = new Set<string>();
  for (const entry of entries) {
    if (entry.day !== storedPlan.day) continue;
    const dishId = dishIdOf(entry);
    if (dishId !== null) loggedOnPlanDay.add(dishId);
  }
  const out: DeprioritisedDish[] = [];
  const seen = new Set<string>();
  for (const meal of storedPlan.meals) {
    for (const dish of meal.dishes) {
      if (seen.has(dish.dishId)) continue;
      seen.add(dish.dishId);
      if (loggedOnPlanDay.has(dish.dishId)) continue;
      if ((acceptance.get(dish.dishId) ?? 0) > 0) continue;
      out.push({ dishId: dish.dishId, name: dish.name });
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name) || (a.dishId < b.dishId ? -1 : 1));
}

export interface MicroGap {
  key: OptionalNutrientKey;
  label: string;
  unit: "g" | "mg";
  /** The ICMR reference for the nutrient, in its own unit. */
  reference: number;
  /** The mean of the reporting days' totals, in the same unit. */
  avg: number;
  /** How many logged days reported the nutrient (≥ MICRO_MIN_DAYS). */
  days: number;
  /** avg ÷ reference, unrounded. */
  coverage: number;
}

/**
 * The micronutrient gaps in the recent log: the Spectrum rows (the
 * day view's own computation, ICMR references) averaged over the
 * last MICRO_WINDOW_DAYS logged days before `day`. A nutrient is a
 * gap when at least MICRO_MIN_DAYS of those days reported it and the
 * reporting days average under MICRO_GAP_RATIO of the reference.
 * Sodium is a ceiling, not a goal, and is never a "gap". Averages
 * rest only on days that reported the nutrient — a day whose foods
 * reported nothing about iron says nothing about iron.
 */
export function microGapsFor(
  entries: readonly LogEntry[],
  day: string,
  sex: SpectrumSex,
): MicroGap[] {
  const byDay = new Map<string, LogEntry[]>();
  for (const entry of entries) {
    if (entry.day >= day) continue;
    const list = byDay.get(entry.day) ?? [];
    list.push(entry);
    byDay.set(entry.day, list);
  }
  const loggedDays = [...byDay.keys()].sort().slice(-MICRO_WINDOW_DAYS);
  if (loggedDays.length < MICRO_MIN_DAYS) return [];
  const rowsByDay = loggedDays.map((d) => spectrumForDay(byDay.get(d)!, sex));
  const references = rowsByDay[0]!.filter((r) => !r.limit);
  const gaps: MicroGap[] = [];
  for (const ref of references) {
    const values: number[] = [];
    for (const rows of rowsByDay) {
      const row = rows.find((r) => r.key === ref.key);
      if (row && row.value !== null) values.push(row.value);
    }
    if (values.length < MICRO_MIN_DAYS) continue;
    const avg = values.reduce((s, v) => s + v, 0) / values.length;
    const coverage = avg / ref.reference;
    if (coverage < MICRO_GAP_RATIO) {
      gaps.push({
        key: ref.key,
        label: ref.label,
        unit: ref.unit,
        reference: ref.reference,
        avg,
        days: values.length,
        coverage,
      });
    }
  }
  return gaps.sort((a, b) => a.coverage - b.coverage || a.label.localeCompare(b.label)).slice(0, 3);
}

export interface PortionSignal {
  foodId: string;
  name: string;
  /** The grams the stored plan serves for this food. */
  plannedGrams: number;
  /** The median grams actually logged, over the window. */
  typicalGrams: number;
  /** How many gram-logs the median rests on. */
  logs: number;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/**
 * Portion realism, as a signal only: foods whose typical logged
 * portion (the median of their gram amounts over the last
 * PORTION_WINDOW_DAYS days) sits more than PORTION_DIVERGENCE away
 * from the portion the stored plan serves. Nothing is resized —
 * the signal is surfaced with both numbers and the person decides.
 */
export function portionSignalsFor(
  entries: readonly LogEntry[],
  storedPlan: DailyPlan | null,
  day: string,
): PortionSignal[] {
  if (!storedPlan) return [];
  const planned = new Map<string, number>();
  for (const meal of storedPlan.meals) {
    for (const s of meal.suggestions) {
      if (!planned.has(s.foodId)) planned.set(s.foodId, s.grams);
    }
  }
  if (planned.size === 0) return [];
  const windowStart = shiftDay(day, -PORTION_WINDOW_DAYS);
  const gramsByFood = new Map<string, { name: string; grams: number[] }>();
  for (const entry of entries) {
    if (entry.day < windowStart || entry.day >= day) continue;
    if (entry.foodId === null || !planned.has(entry.foodId)) continue;
    if (!("grams" in entry.amount)) continue;
    const seen = gramsByFood.get(entry.foodId) ?? { name: entry.name, grams: [] };
    seen.grams.push(entry.amount.grams);
    gramsByFood.set(entry.foodId, seen);
  }
  const out: PortionSignal[] = [];
  for (const [foodId, seen] of gramsByFood) {
    if (seen.grams.length < PORTION_MIN_LOGS) continue;
    const plannedGrams = planned.get(foodId)!;
    if (!(plannedGrams > 0)) continue;
    const typical = median(seen.grams);
    if (Math.abs(typical - plannedGrams) / plannedGrams > PORTION_DIVERGENCE) {
      out.push({
        foodId,
        name: seen.name,
        plannedGrams,
        typicalGrams: Math.round(typical),
        logs: seen.grams.length,
      });
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name) || (a.foodId < b.foodId ? -1 : 1));
}

export interface PlanLearning {
  /** The P6 totals adaptation, when the recent days speak to one. */
  adaptation: PlanAdaptation | null;
  /** The recent logged days' averages, whenever at least two
   *  completed days are logged — shown on the learned surface even
   *  when no bias fired, because "on target" is also a finding. */
  adherence: { days: number; avgKcal: number; avgProteinG: number } | null;
  favouredDishes: FavouredDish[];
  deprioritisedDishes: DeprioritisedDish[];
  microGaps: MicroGap[];
  portionSignals: PortionSignal[];
  /** Explanations for the behavioural and micronutrient biases, as
   *  STRUCTURED reasons (brief v4: words live in src/lib/reasons.ts).
   *  They join the plan's reasons after the P6 adaptation reasons.
   *  (Portion signals are surface-only and carry no reason here.) */
  reasons: PlanReason[];
}

const lowerFirst = (s: string) => (s.length > 0 ? s[0]!.toLowerCase() + s.slice(1) : s);
const avgText = (gap: MicroGap) =>
  gap.unit === "g" ? String(Math.round(gap.avg * 10) / 10) : String(Math.round(gap.avg));

/**
 * Everything the log teaches the plan, in one deterministic pass —
 * or null when the log teaches nothing at all (too few days, no
 * repeated dish, no gap, no stored plan to judge portions against).
 */
export function planLearningFor(
  entries: readonly LogEntry[],
  day: string,
  targets: NutritionTargets,
  opts: { storedPlan?: DailyPlan | null; sex?: SpectrumSex } = {},
): PlanLearning | null {
  const adaptation = planAdaptationFor(entries, day, targets);
  const recent = recentLoggedDays(entries, day);
  const adherence =
    recent.length >= ADAPTATION_MIN_DAYS
      ? {
          days: recent.length,
          avgKcal: recent.reduce((s, d) => s + d.kcal, 0) / recent.length,
          avgProteinG: recent.reduce((s, d) => s + d.proteinG, 0) / recent.length,
        }
      : null;
  const favouredDishes = dishAcceptanceFor(entries, day).filter(
    (d) => d.count >= FAVOURED_MIN_LOGS,
  );
  const deprioritisedDishes = offeredButUnloggedFor(entries, opts.storedPlan ?? null, day);
  const microGaps = microGapsFor(entries, day, opts.sex ?? null);
  const portionSignals = portionSignalsFor(entries, opts.storedPlan ?? null, day);
  if (
    !adaptation &&
    !adherence &&
    favouredDishes.length === 0 &&
    deprioritisedDishes.length === 0 &&
    microGaps.length === 0 &&
    portionSignals.length === 0
  ) {
    return null;
  }
  const reasons: PlanReason[] = [];
  if (favouredDishes.length > 0) {
    reasons.push({
      kind: "favoured-dishes",
      dishes: favouredDishes.slice(0, 3).map((d) => ({ name: d.name, count: d.count })),
      windowDays: LEARNING_WINDOW_DAYS,
    });
  }
  if (deprioritisedDishes.length > 0 && opts.storedPlan) {
    reasons.push({
      kind: "deprioritised-dishes",
      names: deprioritisedDishes.slice(0, 3).map((d) => d.name),
      planDay: opts.storedPlan.day,
      windowDays: LEARNING_WINDOW_DAYS,
    });
  }
  for (const gap of microGaps) {
    reasons.push({
      kind: "micro-gap",
      label: gap.label,
      days: gap.days,
      avg: gap.avg,
      unit: gap.unit,
      reference: gap.reference,
    });
  }
  return {
    adaptation,
    adherence,
    favouredDishes,
    deprioritisedDishes,
    microGaps,
    portionSignals,
    reasons,
  };
}
