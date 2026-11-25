/**
 * Plan view — the Plan tab's single source of truth (brief v7, N1).
 *
 * Pure, no DOM, no prose. Everything the Plan tab shows is computed
 * here, once: the meal order, each meal's totals, which meal is
 * primary, the day rail, the balance groups and meters, and the
 * adjustments array. The components render this view; they do not
 * re-derive any of it. Words live in `src/lib/reasons.ts`
 * (`reasonCopy` / `adjustmentCopy`); this module carries data only.
 *
 * The census this module answers (brief v7 audit, 2026-11-19):
 *
 * · M-159 — the page showed two meal orders: the cards followed the
 *   stored `plan.meals` order (composer slots over `MEALS`:
 *   breakfast, lunch, dinner, snack) while the "Your day" timeline
 *   is sorted by clock minutes (the snack's afternoon stop precedes
 *   dinner). `sortMeals` is now the ONE canonical display order.
 *   (`MEALS` itself is unchanged — it is the composer's split and
 *   storage order across the lib, not a display order.)
 *
 * · M-138 — the plan carried no adjustments array: "Today's
 *   balance" and "How today's plan was adjusted" partitioned
 *   `plan.reasons` independently at render, so the two lists could
 *   disagree (a reason-less stored plan renders ALL its notes as
 *   balance prose while the adjusted list, which needs a structured
 *   reason, stands empty). `adjustmentsOf` is the ONE derivation;
 *   both surfaces read from it and from `isAdjustmentKind`.
 *
 * · M-147 — a "to complete the day" top-up IS included in the meal's
 *   totals: the card header always summed every suggestion, top-ups
 *   included (the audit's own figures: dish 276 + yogurt 37 = the
 *   313 header), and logging the meal logs them. The view records
 *   that on the data: `addOns[].included` is true for every top-up
 *   the plan serves, and `mealTotals` is the one summing function.
 *
 * · M-151 — the flower's "5 of 8" and the prose's "span 6 groups"
 *   came from two counters over two taxonomies (balance.ts's eight
 *   coverage buckets vs the composer's distinct raw `FoodGroup`
 *   values). The view's balance carries ONE groups array — the
 *   coverage walk — and meters that keep eaten, planned and target
 *   as separate numbers, so "to go" has no data to grow from.
 *
 * House adaptations of the brief's vanilla contract: the input also
 * carries the food/dish lookup maps the group walk needs (the same
 * maps the section already builds for the flower), and each
 * adjustment keeps its originating `reason` + `index` so the N1
 * section wiring renders byte-identical copy while the array is
 * already the single source (N4 renders from `adjustmentCopy`).
 */

import { reasonCopy, type PlanReason } from "@/lib/reasons";
import {
  balanceGroupKeyOf,
  dayBalance,
  GUIDELINE_FRUIT_G,
  GUIDELINE_VEGETABLES_G,
  type BalanceGroupKey,
} from "./balance";
import { incompleteOptionalFields, sumNutrients } from "./math";
import type { Dish } from "./dishes";
import type { DailyPlan, PlanGoalProfile, PlanMeal, PlanSuggestion } from "./plan";
import type { Food, LogEntry, Meal, Nutrients } from "./types";

/* ------------------------------- order --------------------------------- */

/** The ONE meal order for every Plan surface (brief v7): breakfast,
 *  lunch, snack, dinner. The rail and the meal rows both consume
 *  this; nothing sorts meals any other way on the page again. */
const SLOT_ORDER: Record<Meal, number> = { breakfast: 1, lunch: 2, snack: 3, dinner: 4 };

export function sortMeals<T extends { meal: Meal }>(meals: readonly T[]): T[] {
  return [...meals].sort((a, b) => SLOT_ORDER[a.meal] - SLOT_ORDER[b.meal]);
}

/* ------------------------------- totals -------------------------------- */

/**
 * A meal's totals — the ONLY place they are computed. The sum runs
 * over the meal's dishes and every suggestion the plan serves,
 * including the "to complete the day" top-ups: a top-up is an
 * INCLUDED add-on (M-147 — it is inside the header total and logs
 * with the meal), so nothing the plan serves is left out. If a
 * suggestion ever gains an excluded state, this function is where
 * it is honoured — nowhere else sums a meal.
 */
export function mealTotals(meal: PlanMeal): Nutrients {
  return sumNutrients([
    ...meal.dishes.map((d) => d.nutrients),
    ...meal.suggestions.map((s) => s.nutrients),
  ]);
}

/** The meal's add-ons: its top-up suggestions ("To complete the
 *  day"), each with its inclusion stated on the data (M-147). */
export function mealAddOns(meal: PlanMeal): { suggestion: PlanSuggestion; included: boolean }[] {
  return meal.suggestions
    .filter((s) => s.layer === "topup")
    .map((suggestion) => ({ suggestion, included: true }));
}

/* ------------------------------ primary -------------------------------- */

/**
 * Meal windows for "which meal is primary now" — minutes since
 * midnight. These are UI windows for button emphasis, not nutrition
 * advice.
 */
export const MEAL_WINDOWS: Record<Meal, readonly [number, number]> = {
  breakfast: [300, 630], // 05:00–10:30
  lunch: [690, 900], // 11:30–15:00
  snack: [900, 1080], // 15:00–18:00
  dinner: [1080, 1350], // 18:00–22:30
};

/**
 * Exactly one meal may be primary. Order of preference:
 *  1. an unlogged meal whose window contains `nowMin`;
 *  2. the next unlogged meal whose window starts later;
 *  3. none (everything left is earlier today: no gold button).
 * Earlier unlogged meals are not shamed; they simply are not
 * highlighted. This replaces the pre-v7 rule — "the first unlogged
 * meal in the plan's stored order" — under which Breakfast kept the
 * gold button all evening (M-149). N1 lands the function and its
 * tests; N3 wires it to the button.
 */
export function pickPrimaryMeal(
  meals: readonly { meal: Meal; logged: boolean }[],
  nowMin: number,
): Meal | null {
  const open = sortMeals(meals.filter((m) => !m.logged));
  const inWindow = open.find((m) => {
    const [a, b] = MEAL_WINDOWS[m.meal];
    return nowMin >= a && nowMin < b;
  });
  if (inWindow) return inWindow.meal;
  const upcoming = open.find((m) => MEAL_WINDOWS[m.meal][0] > nowMin);
  return upcoming ? upcoming.meal : null;
}

/* ---------------------------- adjustments ------------------------------ */

/**
 * The adjusted list's priority (moved here from the plan section,
 * brief v4 3.3): the planner's gates first — the answers that bent
 * the plan — then what it learned from the log, then the day's
 * structure. Keyed by REASON kind; this record is the one
 * definition of what an adjustment is, shared by the adjusted list
 * and the balance partition (M-138).
 */
export const ADJUSTMENT_TIER: Record<string, number> = {
  "budget-widened": 0,
  "kitchen-relaxed": 0,
  "kitchen-cap-raised": 0,
  "kitchen-cap-quickest": 0,
  "log-protein-shortfall": 1,
  "log-energy-overshoot": 1,
  "snack-added": 2,
};

/** Is this reason kind one of the plan's adjustments? The balance
 *  prose partition and the adjusted list both ask this one
 *  question, so they can never disagree about a kind again. */
export function isAdjustmentKind(kind: string): boolean {
  return kind in ADJUSTMENT_TIER;
}

/**
 * One entry of the plan's adjustments array: planner-owned data
 * (`{kind, ...data}`), in the brief v7 vocabulary. The three brief
 * kinds map from the composer's reason kinds (log-protein-shortfall
 * → protein-lean, snack-added → meal-added); the remaining gate and
 * adaptation kinds keep their composer names as further variants,
 * so no adjustment the plan reports is dropped from the array.
 * `reason` + `index` ride along for the N1 render wiring.
 */
export type PlanAdjustment =
  | {
      kind: "protein-lean";
      days: number;
      avgG: number;
      targetG: number;
      reason: PlanReason;
      index: number;
    }
  | { kind: "kitchen-relaxed"; reason: PlanReason; index: number }
  | {
      kind: "meal-added";
      slot: Meal;
      assessmentMeals: number;
      reason: PlanReason;
      index: number;
    }
  /* The gate/adaptation variants carry their measured data at the
     top level too (brief v7 N4): the adjusted section renders from
     this array through `adjustmentCopy` alone, so the numbers the
     row copy needs ride on the adjustment, not only on `reason`. */
  | {
      kind: "budget-widened";
      ceilingRupees: number | null;
      reason: PlanReason;
      index: number;
    }
  | {
      kind: "kitchen-cap-raised";
      capMinutes: number;
      stageMinutes: number;
      reason: PlanReason;
      index: number;
    }
  | { kind: "kitchen-cap-quickest"; capMinutes: number; reason: PlanReason; index: number }
  | {
      kind: "log-energy-overshoot";
      days: number;
      avgKcal: number;
      targetKcal: number;
      reason: PlanReason;
      index: number;
    };

function toAdjustment(reason: PlanReason, index: number): PlanAdjustment | null {
  switch (reason.kind) {
    case "log-protein-shortfall":
      return {
        kind: "protein-lean",
        days: reason.days,
        avgG: reason.avgProteinG,
        targetG: reason.targetProteinG,
        reason,
        index,
      };
    case "kitchen-relaxed":
      return { kind: "kitchen-relaxed", reason, index };
    case "snack-added":
      return {
        kind: "meal-added",
        slot: "snack",
        assessmentMeals: reason.mealsPerDay,
        reason,
        index,
      };
    case "budget-widened":
      return { kind: "budget-widened", ceilingRupees: reason.ceilingRupees, reason, index };
    case "kitchen-cap-raised":
      return {
        kind: "kitchen-cap-raised",
        capMinutes: reason.capMinutes,
        stageMinutes: reason.stageMinutes,
        reason,
        index,
      };
    case "kitchen-cap-quickest":
      return { kind: "kitchen-cap-quickest", capMinutes: reason.capMinutes, reason, index };
    case "log-energy-overshoot":
      return {
        kind: "log-energy-overshoot",
        days: reason.days,
        avgKcal: reason.avgKcal,
        targetKcal: reason.targetKcal,
        reason,
        index,
      };
    default:
      return null;
  }
}

/**
 * THE adjustments array — the one derivation (M-138's data half).
 * From the plan's structured reasons only (never from note
 * strings): the adjustment kinds, in tier order, stable by plan
 * order inside a tier, at most three. A kind whose copy
 * `reasonCopy` does not know is not an adjustment the page can
 * state, so it is filtered here exactly as the section filtered it
 * before — the difference is that now there is one place that
 * decides, and the balance partition asks the same place.
 */
export function adjustmentsOf(plan: DailyPlan): PlanAdjustment[] {
  return (plan.reasons ?? [])
    .map((reason, index) => ({ reason, index }))
    .filter(({ reason }) => isAdjustmentKind(reason.kind) && reasonCopy(reason) !== null)
    .sort(
      (a, b) =>
        ADJUSTMENT_TIER[a.reason.kind]! - ADJUSTMENT_TIER[b.reason.kind]! || a.index - b.index,
    )
    .slice(0, 3)
    .map(({ reason, index }) => toAdjustment(reason, index))
    .filter((a): a is PlanAdjustment => a !== null);
}

/* -------------------------------- rail --------------------------------- */

export type RailStopKind = "water" | "meal" | "rest";

export interface PlanRailStop {
  key: string;
  label: string;
  kind: RailStopKind;
  /** "~7:40 AM" when the sleep log supports a time (an estimate —
   *  `whenEstimated` says so, and the UI underlines it dashed);
   *  otherwise a word ("Morning"). Never a dash. */
  whenText: string;
  whenEstimated: boolean;
  state: "done" | "now" | "later";
  /** The meal slot, on meal stops — the stop links to its row. */
  meal?: Meal;
  /** The meal's kcal (from `mealTotals`), on meal stops. */
  kcal?: number;
}

const WINDOW_WORD: Record<string, string> = {
  wake: "Morning",
  breakfast: "Morning",
  lunch: "Midday",
  snack: "Afternoon",
  dinner: "Evening",
  winddown: "Night",
  bed: "Night",
};

const SLOT_LABEL: Record<Meal, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  snack: "Snack",
  dinner: "Dinner",
};

/** "HH:MM" (the timeline's stored clock) → "7:40 AM" — the same
 *  reading the timeline renders today (mirrors `formatClock` in
 *  lib/smart/usual; kept local so this lib stays dependency-light). */
function clockText(hhmm: string): string {
  const mins = Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h24 < 12 ? "AM" : "PM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return m === 0 ? `${h12}:00 ${period}` : `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function buildRail(
  plan: DailyPlan,
  viewMeals: readonly PlanViewMeal[],
  primary: Meal | null,
): PlanRailStop[] {
  const bySlot = new Map(viewMeals.map((m) => [m.meal, m] as const));
  const mealStop = (slot: Meal, label: string, time: string | null): PlanRailStop => {
    const vm = bySlot.get(slot);
    return {
      key: slot,
      label,
      kind: "meal",
      whenText: time ? `~${clockText(time)}` : WINDOW_WORD[slot]!,
      whenEstimated: time !== null,
      state: vm?.logged ? "done" : slot === primary ? "now" : "later",
      meal: slot,
      ...(vm ? { kcal: vm.totals.kcal } : {}),
    };
  };
  const frameStop = (
    key: "wake" | "winddown" | "bed",
    label: string,
    kind: RailStopKind,
    time: string | null,
  ): PlanRailStop => ({
    key,
    label,
    kind,
    whenText: time ? `~${clockText(time)}` : WINDOW_WORD[key]!,
    whenEstimated: time !== null,
    state: "later",
  });

  if (plan.timeline) {
    /* The composer's timeline already lays the day out in clock
       order (wake → meals → wind down → bed); the rail keeps that
       order and borrows its labels and times. */
    const stops: PlanRailStop[] = [];
    for (const item of plan.timeline.items) {
      if (item.kind === "wake") stops.push(frameStop("wake", item.label, "water", item.time));
      else if (item.kind === "meal" && item.meal) stops.push(mealStop(item.meal, item.label, item.time));
      else if (item.kind === "wind_down")
        stops.push(frameStop("winddown", item.label, "rest", item.time));
      else if (item.kind === "sleep") stops.push(frameStop("bed", item.label, "rest", item.time));
    }
    return stops;
  }
  /* A plan stored before timelines existed: the day's structure
     from the meals alone, words instead of times. */
  return [
    frameStop("wake", "On waking", "water", null),
    ...viewMeals.map((m) => mealStop(m.meal, SLOT_LABEL[m.meal], null)),
    frameStop("winddown", "Wind down", "rest", null),
    frameStop("bed", "Bedtime", "rest", null),
  ];
}

/* ------------------------------- balance ------------------------------- */

export type PlanGroupState = "eaten" | "planned" | "open";

export interface PlanViewGroup {
  key: BalanceGroupKey;
  label: string;
  state: PlanGroupState;
}

export interface PlanViewMeter {
  key: "vegetables" | "fruits";
  label: string;
  /** Grams in the day's LOG (measured). */
  eaten: number;
  /** Grams the plan's meals carry (planned). */
  planned: number;
  /** eaten + planned — what the day reaches if the plan is followed. */
  reach: number;
  /** The ICMR-NIN guideline the meter measures against. */
  target: number;
  unit: "g";
}

/**
 * What the day's log ate, by coverage group: the keys it touched
 * and the grams per group. Food-backed entries walk through the
 * same bucket the plan's tally uses (`balanceGroupKeyOf`); dish
 * entries walk their ingredient lines, scaled by the servings
 * logged. Snapshot entries Bloom cannot classify (Coach estimates)
 * are skipped — no group is claimed for food Bloom did not curate.
 */
function eatenByGroup(
  entries: readonly LogEntry[],
  byFoodId: ReadonlyMap<string, Food>,
  byDishId: ReadonlyMap<string, Dish>,
): { keys: ReadonlySet<BalanceGroupKey>; grams: ReadonlyMap<BalanceGroupKey, number> } {
  const keys = new Set<BalanceGroupKey>();
  const grams = new Map<BalanceGroupKey, number>();
  const add = (food: Food, g: number | null) => {
    const key = balanceGroupKeyOf(food);
    if (!key) return;
    keys.add(key);
    if (g !== null) grams.set(key, (grams.get(key) ?? 0) + g);
  };
  for (const entry of entries) {
    if (entry.foodId) {
      const food = byFoodId.get(entry.foodId);
      if (!food) continue;
      let g: number | null = null;
      if ("grams" in entry.amount) {
        g = entry.amount.grams;
      } else {
        const amount = entry.amount;
        const serving = food.servings.find((s) => s.label === amount.servingLabel);
        if (serving) g = serving.grams * amount.servings;
      }
      add(food, g);
    } else if (entry.provenance.kind === "recipe") {
      const dish = byDishId.get(entry.provenance.sourceId);
      if (!dish) continue;
      const servings = "servings" in entry.amount ? entry.amount.servings : 1;
      for (const line of dish.lines) {
        const food = byFoodId.get(line.foodId);
        if (food) add(food, (line.grams / dish.servings) * servings);
      }
    }
  }
  return { keys, grams };
}

/* ------------------------------ the view ------------------------------- */

export interface PlanViewLog {
  /** Slots whose every dish and food is in the day's log (the plan
   *  section's own all-logged test, supplied by the caller — this
   *  lib does not read the log store). */
  loggedMealIds: ReadonlySet<Meal>;
  /** The day's log entries (any day's entries are filtered to the
   *  plan's day here). */
  entries: readonly LogEntry[];
}

export interface PlanViewPrefs {
  /** The person's hide-calories preference, when it exists. No such
   *  setting ships yet — the contract lands ahead of it (brief v7
   *  rule 8); absent means calories show. */
  hideCalories?: boolean;
}

export interface PlanViewInput {
  plan: DailyPlan;
  log: PlanViewLog;
  prefs?: PlanViewPrefs;
  /** "Now" for the primary-meal clock; defaults to the real now. */
  now?: Date;
  /** The food universe the plan was composed over (the person's
   *  foods + the USDA reference set), keyed by food id. */
  byFoodId: ReadonlyMap<string, Food>;
  /** The dish library, keyed by dish id. */
  byDishId?: ReadonlyMap<string, Dish>;
}

export interface PlanViewMeal {
  meal: Meal;
  /** The plan's own meal record — rendering reads names, dishes and
   *  suggestions from it; every NUMBER comes from this view. */
  source: PlanMeal;
  totals: Nutrients;
  logged: boolean;
  primary: boolean;
  addOns: { suggestion: PlanSuggestion; included: boolean }[];
}

/** The sodium ceiling the plan is judged against, mg/day: WHO's
 *  salt limit (under 5 g of salt a day) is ≈ 2,000 mg of sodium,
 *  and ICMR-NIN's Dietary Guidelines for Indians 2024 state the
 *  same salt line. The day spectrum judges logged days against
 *  the same figure (dayView.ts) — one ceiling, both surfaces. */
export const PLAN_SODIUM_CEILING_MG = 2000;

/** The sugar line the plan is judged against, % of the day's
 *  energy: ICMR-NIN DGI 2024 — sugar under 5% of total energy.
 *  Sugar energy is counted at 4 kcal per gram, the standard
 *  Atwater factor the source data itself uses. */
export const PLAN_SUGAR_LIMIT_PCT = 5;
export const SUGAR_KCAL_PER_G = 4;

export interface PlanChecks {
  /** The plan's sodium, summed over the dishes and foods that
   *  report it. `mg` is null when nothing in the plan reports
   *  sodium at all (the check then renders nothing — an absent
   *  field is never dressed as zero). `complete` is false when
   *  at least one served item does not report sodium: the total
   *  is then a floor, and the copy says "at least". */
  sodium: { mg: number | null; ceilingMg: number; complete: boolean };
  /** The plan's total sugars, same absence rules. `shareOfEnergyPct`
   *  is the sugar share of the plan's own energy, and is null when
   *  calories are hidden (the share is an energy fact) or when the
   *  plan carries no energy to divide by. */
  sugar: { g: number | null; shareOfEnergyPct: number | null; limitPct: number; complete: boolean };
}

export interface PlanView {
  goal: { key: PlanGoalProfile };
  showKcal: boolean;
  totals: {
    plan: { kcal: number; proteinG: number; meals: number; waterMl: number | null };
    guide: { kcal: number; proteinG: number };
  };
  /** M-244 (research R-2511-09 + R-2511-10): the plan judged
   *  against the two published ceilings the day's targets do not
   *  carry — sodium (display first; nothing blocks on it) and
   *  sugar's share of energy. Data only; the words live in
   *  reasons.ts, per the house rule. */
  checks: PlanChecks;
  rail: PlanRailStop[];
  /** The day's meals in the ONE canonical order (`sortMeals`). */
  meals: PlanViewMeal[];
  balance: {
    /** ONE array: the flower's petals, the headline count and the
     *  open-group chips all derive from this (M-151). */
    groups: PlanViewGroup[];
    inPlan: number;
    total: number;
    meters: PlanViewMeter[];
  };
  /** At most three, from the one derivation (`adjustmentsOf`). */
  adjustments: PlanAdjustment[];
}

export function buildPlanView(input: PlanViewInput): PlanView {
  const { plan, log } = input;
  const byDishId = input.byDishId ?? new Map<string, Dish>();
  const now = input.now ?? new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const loggedOf = (meal: PlanMeal) => log.loggedMealIds.has(meal.meal);
  const primary = pickPrimaryMeal(
    plan.meals.map((m) => ({ meal: m.meal, logged: loggedOf(m) })),
    nowMin,
  );

  const meals: PlanViewMeal[] = sortMeals(plan.meals).map((source) => ({
    meal: source.meal,
    source,
    totals: mealTotals(source),
    logged: loggedOf(source),
    primary: source.meal === primary,
    addOns: mealAddOns(source),
  }));

  const planKcal = meals.reduce((s, m) => s + m.totals.kcal, 0);
  const planProteinG = Math.round(meals.reduce((s, m) => s + m.totals.proteinG, 0) * 10) / 10;

  /* Balance: the plan's groups from the composer's own tally walk
     (dayBalance — pinned equal to floorTotalsOf), the log's groups
     from the same buckets. One array, three states. */
  const planGroups = dayBalance(plan.meals, input.byFoodId, byDishId);
  const eaten = eatenByGroup(
    log.entries.filter((e) => e.day === plan.day),
    input.byFoodId,
    byDishId,
  );
  const groups: PlanViewGroup[] = planGroups.map((g) => ({
    key: g.key,
    label: g.label,
    state: eaten.keys.has(g.key) ? "eaten" : g.covered ? "planned" : "open",
  }));
  const meter = (
    key: "vegetables" | "fruits",
    label: string,
    target: number,
  ): PlanViewMeter => {
    const eatenG = Math.round(eaten.grams.get(key) ?? 0);
    const plannedG = Math.round(planGroups.find((g) => g.key === key)?.grams ?? 0);
    return { key, label, eaten: eatenG, planned: plannedG, reach: eatenG + plannedG, target, unit: "g" };
  };

  /* M-244: the plan checks — sodium and sugar over EVERY panel the
     * plan serves (the same item set mealTotals sums: dishes plus
     * every suggestion, top-ups included), with completeness read
     * per field, so a total built from partial reporting is named
     * a floor by the copy, never read as the whole. */
  const servedPanels = plan.meals.flatMap((m) => [
    ...m.dishes.map((d) => d.nutrients),
    ...m.suggestions.map((s) => s.nutrients),
  ]);
  const servedTotals = sumNutrients(servedPanels);
  const servedIncomplete = incompleteOptionalFields(servedPanels);
  const checks: PlanChecks = {
    sodium: {
      mg: servedTotals.sodiumMg ?? null,
      ceilingMg: PLAN_SODIUM_CEILING_MG,
      complete: !servedIncomplete.has("sodiumMg"),
    },
    sugar: {
      g: servedTotals.sugarG ?? null,
      shareOfEnergyPct:
        servedTotals.sugarG !== undefined &&
        planKcal > 0 &&
        !(input.prefs?.hideCalories ?? false)
          ? Math.round(((servedTotals.sugarG * SUGAR_KCAL_PER_G) / planKcal) * 1000) / 10
          : null,
      limitPct: PLAN_SUGAR_LIMIT_PCT,
      complete: !servedIncomplete.has("sugarG"),
    },
  };

  return {
    goal: { key: plan.goalProfile },
    showKcal: !(input.prefs?.hideCalories ?? false),
    checks,
    totals: {
      plan: {
        kcal: planKcal,
        proteinG: planProteinG,
        meals: meals.length,
        waterMl: plan.hydration?.targetMl ?? null,
      },
      guide: { kcal: plan.targets.kcal, proteinG: plan.targets.proteinG },
    },
    rail: buildRail(plan, meals, primary),
    meals,
    balance: {
      groups,
      inPlan: groups.filter((g) => g.state !== "open").length,
      total: groups.length,
      meters: [
        meter("vegetables", "Vegetables", GUIDELINE_VEGETABLES_G),
        meter("fruits", "Fruit", GUIDELINE_FRUIT_G),
      ],
    },
    adjustments: adjustmentsOf(plan),
  };
}
