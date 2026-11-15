/**
 * Nutrition — goal-based plan generation (P1, spec v2 §6/§10).
 *
 * A plan is computed, never imagined: every number in it comes from the
 * deterministic targets engine (`targetsFor`, safety-gated, over the same
 * `bodyTargetsOf` the rest of Bloom uses) or from the nutrition lib's own
 * portion math over foods whose values carry provenance. There is no AI
 * anywhere in this module, and no food value is invented: suggestions are
 * drawn only from the user's own foods and the USDA reference set, sized
 * in grams, with their nutrients computed by `nutrientsForGrams` — the
 * same math the log uses, so a suggestion and the entry it becomes can
 * never disagree.
 *
 * The gate order is the spec's Stage-3 rule, in order:
 *   1. A substantive safety block refuses outright — safety overrides any
 *      plan request, every time. An absence-only block (the person was
 *      never asked) is NOT substantive: like the Nutrition tab, the plan
 *      falls back to the body-profile targets, so the surfaces agree.
 *   2. No goal, no plan — the missing inputs are named, never guessed.
 *   3. No targets from either path, no plan — again, named.
 *
 * A plan is a dated daily structure: per-meal kcal/protein splits that sum
 * EXACTLY to the day's targets (largest-remainder reconciliation, pinned
 * by tests), plus up to two food suggestions per meal. A meal no clean
 * food fits stays empty with an honest note — the plan never pads itself
 * with a fabricated dish.
 */

import { getPref, setPref } from "@/lib/prefs";
import {
  profileHeightCm,
  profileTargetWeightKg,
  profileWeightKg,
  type ActivityLevel,
  type DietaryPattern,
  type HealthProfile,
  type Sex,
  type VitalisGoal,
} from "@/lib/vitalis/domain/profile";
import {
  ABSENCE_BLOCK_RULE_IDS,
  SAFETY_CLASSES,
  hasSubstantiveBlock,
  type SafetyAssessment,
  type SafetyClass,
} from "@/lib/vitalis/domain/safety";
import { missingBodyFields, type BodyTargetsOutcome } from "@/lib/vitalis/calc/body";
import { newNutritionId } from "./ids";
import { nutrientsForGrams } from "./math";
import { isRealDayKey, parseEntryNutrients, parseFoodProvenance } from "./parse";
import { nutritionTargetsFromOutcome, type NutritionTargets } from "./targets";
import { MEALS, type Food, type FoodProvenance, type Meal, type Nutrients } from "./types";

/* --------------------------------- shapes --------------------------------- */

/** Which target profile produced a plan's numbers. `general_health` runs
 *  on the maintenance profile (the adapter's honest reading: no deficit,
 *  no surplus) while keeping its own name as the plan's stated goal. */
export type PlanGoalProfile = "lose" | "gain" | "maintain" | "recomp";

export function goalProfileOf(goal: VitalisGoal): PlanGoalProfile {
  return goal === "general_health" ? "maintain" : goal;
}

/** The generation inputs a plan was made from, kept beside it so a later
 *  change is detectable and nameable (see `planStaleness`). */
export interface PlanInputsSnapshot {
  goal: VitalisGoal | null;
  ageYears: number | null;
  sex: Sex;
  heightCm: number | null;
  weightKg: number | null;
  targetWeightKg: number | null;
  activity: ActivityLevel | null;
  rateKgPerWeek: number;
  mealsPerDay: number | null;
  dietaryPattern: DietaryPattern | null;
  safetyClassification: SafetyClass;
  targetsKcal: number;
  targetsProteinG: number;
}

export interface PlanSuggestion {
  foodId: string;
  name: string;
  grams: number;
  /** Computed by the lib's portion math at generation time. */
  nutrients: Nutrients;
  provenance: FoodProvenance;
}

export interface PlanMeal {
  meal: Meal;
  /** This meal's share of the day's targets. Meals sum exactly to them. */
  kcal: number;
  proteinG: number;
  suggestions: PlanSuggestion[];
  /** Set when no clean food fits this meal — the honest empty state. */
  note: string | null;
}

export interface DailyPlan {
  id: string;
  /** The day this plan is for (a local day key). */
  day: string;
  generatedAt: string;
  goal: VitalisGoal;
  goalProfile: PlanGoalProfile;
  targets: NutritionTargets;
  /** Where the targets came from: the safety-gated Assessment path, or
   *  the Trackers body profile (the fallback the Nutrition tab also uses). */
  targetsSource: "assessment" | "body_profile";
  safetyClassification: SafetyClass;
  /** Non-blocking safety findings, in the classifier's own words. */
  cautions: string[];
  meals: PlanMeal[];
  inputs: PlanInputsSnapshot;
  fingerprint: string;
}

export type PlanRefusal =
  | {
      kind: "safety_blocked";
      classification: SafetyClass;
      requiresProfessionalReview: boolean;
      /** The substantive blocking findings, in the classifier's words. */
      findings: { ruleId: string; summary: string }[];
    }
  | {
      kind: "insufficient_data";
      /** Friendly names of the missing inputs, in a stable order. */
      missing: string[];
    };

export type PlanOutcome = { ok: true; plan: DailyPlan } | { ok: false; refusal: PlanRefusal };

/* ------------------------------ input snapshot ----------------------------- */

const round1 = (n: number) => Math.round(n * 10) / 10;

export function planInputsSnapshotOf(
  profile: HealthProfile,
  safety: SafetyAssessment,
  targets: NutritionTargets,
): PlanInputsSnapshot {
  const heightCm = profileHeightCm(profile);
  const weightKg = profileWeightKg(profile);
  const targetWeightKg = profileTargetWeightKg(profile);
  return {
    goal: profile.goal,
    ageYears: profile.ageYears,
    sex: profile.sex,
    heightCm: heightCm === null ? null : round1(heightCm),
    weightKg: weightKg === null ? null : round1(weightKg),
    targetWeightKg: targetWeightKg === null ? null : round1(targetWeightKg),
    activity: profile.activity,
    rateKgPerWeek: Math.round(profile.rateKgPerWeek * 100) / 100,
    mealsPerDay: profile.dietary.mealsPerDay,
    dietaryPattern: profile.dietary.pattern,
    safetyClassification: safety.classification,
    targetsKcal: targets.kcal,
    targetsProteinG: targets.proteinG,
  };
}

/** A compact, deterministic fingerprint of the generation inputs. Two
 *  snapshots with the same fingerprint were made from the same inputs. */
export function fingerprintOfInputs(inputs: PlanInputsSnapshot): string {
  const canonical = JSON.stringify([
    inputs.goal,
    inputs.ageYears,
    inputs.sex,
    inputs.heightCm,
    inputs.weightKg,
    inputs.targetWeightKg,
    inputs.activity,
    inputs.rateKgPerWeek,
    inputs.mealsPerDay,
    inputs.dietaryPattern,
    inputs.safetyClassification,
    inputs.targetsKcal,
    inputs.targetsProteinG,
  ]);
  let h = 0x811c9dc5;
  for (let i = 0; i < canonical.length; i++) {
    h ^= canonical.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `fnv1a-${(h >>> 0).toString(16).padStart(8, "0")}`;
}

export interface PlanStaleness {
  stale: boolean;
  /** Friendly names of what changed since the plan was made. */
  changed: string[];
}

const CHANGED_LABELS: readonly (readonly [keyof PlanInputsSnapshot, string])[] = [
  ["goal", "your goal"],
  ["ageYears", "your age"],
  ["heightCm", "your height"],
  ["weightKg", "your weight"],
  ["targetWeightKg", "your target weight"],
  ["activity", "your activity level"],
  ["rateKgPerWeek", "your pace"],
  ["mealsPerDay", "your meals per day"],
  ["dietaryPattern", "your eating pattern"],
  ["safetyClassification", "your safety answers"],
];

/** Compare a stored plan's inputs with the current ones. Sex is compared
 *  through its effect: a sex change moves the targets, which is the
 *  change the plan actually embodies, so it reports as "your targets". */
export function planStaleness(plan: DailyPlan, current: PlanInputsSnapshot): PlanStaleness {
  const changed: string[] = [];
  for (const [key, label] of CHANGED_LABELS) {
    if (plan.inputs[key] !== current[key]) changed.push(label);
  }
  if (
    plan.inputs.targetsKcal !== current.targetsKcal ||
    plan.inputs.targetsProteinG !== current.targetsProteinG
  ) {
    changed.push("your targets");
  }
  return { stale: changed.length > 0, changed };
}

/* ------------------------------- meal splits ------------------------------- */

/** Base shares of the day per meal slot, before renormalising over the
 *  slots a person's meal count actually uses. */
const MEAL_SHARE: Record<Meal, number> = {
  breakfast: 0.25,
  lunch: 0.35,
  dinner: 0.3,
  snack: 0.1,
};

/** When fewer meals are eaten, the main meals are kept first: a two-meal
 *  day is lunch and dinner, a one-meal day is lunch. */
const SLOT_PRIORITY: readonly Meal[] = ["lunch", "dinner", "breakfast", "snack"];

/** The meal slots for a plan, in canonical day order. An unanswered
 *  meals-per-day gets the full four-slot structure. */
export function mealSlotsFor(mealsPerDay: number | null): Meal[] {
  const n =
    mealsPerDay === null ? MEALS.length : Math.min(MEALS.length, Math.max(1, Math.floor(mealsPerDay)));
  const chosen = new Set(SLOT_PRIORITY.slice(0, n));
  return MEALS.filter((meal) => chosen.has(meal));
}

/**
 * Split an integer total across shares by largest remainder: floor every
 * share, then hand the leftover units one at a time to the largest
 * fractional parts (ties break by slot order). The parts sum EXACTLY to
 * the total — a plan's meals never drift a kilocalorie from its targets.
 */
function splitUnits(total: number, shares: readonly number[]): number[] {
  const raw = shares.map((s) => total * s);
  const out = raw.map((r) => Math.floor(r));
  let remainder = total - out.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; remainder > 0 && order.length > 0; k = (k + 1) % order.length) {
    out[order[k]!.i]! += 1;
    remainder -= 1;
  }
  return out;
}

export interface MealSplit {
  meal: Meal;
  kcal: number;
  proteinG: number;
}

/** Per-meal shares of the day's targets, reconciled to sum exactly —
 *  kcal in whole units, protein in tenths of a gram (the lib's rounding). */
export function splitTargets(targets: NutritionTargets, slots: readonly Meal[]): MealSplit[] {
  const shareTotal = slots.reduce((sum, meal) => sum + MEAL_SHARE[meal], 0);
  const shares = slots.map((meal) => MEAL_SHARE[meal] / shareTotal);
  const kcals = splitUnits(Math.round(targets.kcal), shares);
  const proteinTenths = splitUnits(Math.round(targets.proteinG * 10), shares);
  return slots.map((meal, i) => ({
    meal,
    kcal: kcals[i]!,
    proteinG: Math.round(proteinTenths[i]!) / 10,
  }));
}

/* ------------------------------- suggestions ------------------------------- */

/**
 * Suggestion portions are sized to a meal's share of the day and kept
 * inside the range a person would actually serve: 25–500 g. A primary is
 * sized to ~65% of the meal so a second food can complete it; a food that
 * is essentially only fat (an oil, a butter) is a condiment, not a meal
 * base, so a primary must carry some protein or carbohydrate, and the
 * protein-completing second food must actually carry protein.
 */
const PRIMARY_SHARE_OF_MEAL = 0.65;
const MIN_PORTION_GRAMS = 25;
const MAX_PORTION_GRAMS = 500;
const MIN_SECONDARY_GRAMS = 25;
const MAX_SECONDARY_GRAMS = 400;
/** Below this many kcal left over, a meal counts as covered. */
const COVERED_WITHIN_KCAL = 60;

const EMPTY_MEAL_NOTE =
  "No food with known values fits this meal yet. Add a food you eat, then regenerate the plan.";

interface PortionFit {
  grams: number;
  nutrients: Nutrients;
  score: number;
}

/** The portion of `food` that best fits a kcal/protein budget, or null
 *  when no sane portion of it fits. Nutrients come from the lib's own
 *  portion math — never re-derived here. */
function portionFit(
  food: Food,
  kcalBudget: number,
  proteinBudget: number,
  minGrams: number,
  maxGrams: number,
): PortionFit | null {
  const per100g = food.per100g;
  if (!(per100g.kcal > 0) || !(kcalBudget > 0)) return null;
  const needed = (kcalBudget / per100g.kcal) * 100;
  if (!Number.isFinite(needed)) return null;
  const grams = Math.round(needed / 5) * 5;
  if (grams < minGrams || grams > maxGrams) return null;
  const nutrients = nutrientsForGrams(per100g, grams);
  const score =
    Math.abs(nutrients.kcal - kcalBudget) / kcalBudget +
    (proteinBudget > 0 ? Math.abs(nutrients.proteinG - proteinBudget) / proteinBudget : 0);
  return { grams, nutrients, score };
}

function toSuggestion(food: Food, fit: PortionFit): PlanSuggestion {
  return {
    foodId: food.id,
    name: food.name,
    grams: fit.grams,
    nutrients: fit.nutrients,
    provenance: food.provenance,
  };
}

/** The eligible pool: the user's own foods and the USDA reference set —
 *  the two sources whose values Bloom may plan with today. Anything else
 *  (an IFCT or OFF food arriving in the pool before its licence lands)
 *  is refused here, whatever assembled the pool. Name-matching then drops
 *  foods the person said they are allergic to, cannot tolerate, or
 *  dislike — their own words against food names, nothing inferred. */
function eligiblePool(profile: HealthProfile, foods: readonly Food[]): Food[] {
  const terms = [...profile.dietary.allergies, ...profile.dietary.intolerances, ...profile.dietary.dislikedFoods]
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length >= 3);
  return foods.filter((food) => {
    if (food.provenance.kind !== "usda" && food.provenance.kind !== "user_entered") return false;
    const name = food.name.toLowerCase();
    return !terms.some((term) => name.includes(term));
  });
}

function bestFit(
  pool: readonly Food[],
  kcalBudget: number,
  proteinBudget: number,
  minGrams: number,
  maxGrams: number,
  require: (food: Food) => boolean,
): { food: Food; fit: PortionFit } | null {
  let best: { food: Food; fit: PortionFit } | null = null;
  for (const food of pool) {
    if (!require(food)) continue;
    const fit = portionFit(food, kcalBudget, proteinBudget, minGrams, maxGrams);
    if (!fit) continue;
    /* Strictly better replaces; a tie keeps the earlier food, so pool
       order (the caller's own foods first, then the reference set in its
       curated order) is the deterministic tie-break. */
    if (!best || fit.score < best.fit.score) best = { food, fit };
  }
  return best;
}

const isMealBase = (food: Food) => food.per100g.proteinG >= 2 || food.per100g.carbsG >= 10;
const isProteinSource = (food: Food) => food.per100g.proteinG >= 5;

/** Suggestions for one meal from `pool`. Deterministic: same pool, same
 *  budgets, same answer. */
function suggestForMeal(
  pool: readonly Food[],
  split: MealSplit,
): { suggestions: PlanSuggestion[]; usedIds: string[] } {
  const primary = bestFit(
    pool,
    PRIMARY_SHARE_OF_MEAL * split.kcal,
    PRIMARY_SHARE_OF_MEAL * split.proteinG,
    MIN_PORTION_GRAMS,
    MAX_PORTION_GRAMS,
    isMealBase,
  );
  if (!primary) {
    /* Nothing fits at 65% — try one food for the whole meal before
       conceding the meal is empty. */
    const single = bestFit(pool, split.kcal, split.proteinG, MIN_PORTION_GRAMS, MAX_PORTION_GRAMS, isMealBase);
    if (!single) return { suggestions: [], usedIds: [] };
    return { suggestions: [toSuggestion(single.food, single.fit)], usedIds: [single.food.id] };
  }
  const suggestions = [toSuggestion(primary.food, primary.fit)];
  const usedIds = [primary.food.id];
  const kcalLeft = split.kcal - primary.fit.nutrients.kcal;
  const proteinLeft = Math.max(0, split.proteinG - primary.fit.nutrients.proteinG);
  if (kcalLeft >= COVERED_WITHIN_KCAL) {
    const secondary = bestFit(
      pool.filter((f) => f.id !== primary.food.id),
      kcalLeft,
      proteinLeft,
      MIN_SECONDARY_GRAMS,
      MAX_SECONDARY_GRAMS,
      isProteinSource,
    );
    if (secondary) {
      suggestions.push(toSuggestion(secondary.food, secondary.fit));
      usedIds.push(secondary.food.id);
    }
  }
  return { suggestions, usedIds };
}

/* ------------------------------- generation -------------------------------- */

export interface PlanGenerationInput {
  profile: HealthProfile;
  safety: SafetyAssessment;
  /** `targetsFor(profile, safety, day)` — the safety-gated engine outcome. */
  gatedOutcome: BodyTargetsOutcome;
  /** Targets from the legacy body profile (the Nutrition tab's fallback),
   *  already adapted through `nutritionTargetsFromBodyTargets`. Consulted
   *  only when the gated path refuses for completeness or absence. */
  fallbackTargets: NutritionTargets | null;
  /** The suggestion pool: the user's own foods first, then the USDA
   *  reference set. Eligibility is re-checked inside regardless. */
  foods: readonly Food[];
  /** The day the plan is for. */
  day: string;
  now: string;
  id?: string;
}

const MISSING_LABEL: Record<string, string> = {
  goal: "your goal",
  ageYears: "your age",
  height: "your height",
  weight: "your weight",
  activity: "your activity level",
  safetyAnswers: "your safety answers in the Assessment",
  body: "your body numbers",
};

/** Missing-input names in the order a person would fix them. */
function missingNames(profile: HealthProfile, extra: readonly string[]): string[] {
  const wanted = new Set<string>(extra);
  if (profile.goal === null) wanted.add("goal");
  for (const field of missingBodyFields(profile)) wanted.add(field);
  const ordered = ["goal", "ageYears", "height", "weight", "activity", "safetyAnswers", "body"].filter(
    (key) => wanted.has(key),
  );
  return ordered.map((key) => MISSING_LABEL[key]!);
}

function validTargets(targets: NutritionTargets | null): NutritionTargets | null {
  if (!targets) return null;
  if (!Number.isFinite(targets.kcal) || !Number.isFinite(targets.proteinG)) return null;
  if (targets.kcal <= 0 || targets.proteinG <= 0) return null;
  return targets;
}

export function generatePlan(input: PlanGenerationInput): PlanOutcome {
  const { profile, safety } = input;

  /* 1. Safety first, always. A substantive block refuses the plan in the
        classifier's own words; an absence-only block is an information
        gap and falls through to the same fallback the Nutrition tab
        uses — never to a plan built over a real finding. */
  const blockingIds = safety.findings.filter((f) => f.blocking).map((f) => f.ruleId);
  if (safety.blocking && hasSubstantiveBlock(blockingIds)) {
    return {
      ok: false,
      refusal: {
        kind: "safety_blocked",
        classification: safety.classification,
        requiresProfessionalReview: safety.requiresProfessionalReview,
        findings: safety.findings
          .filter((f) => f.blocking && !ABSENCE_BLOCK_RULE_IDS.has(f.ruleId))
          .map((f) => ({ ruleId: f.ruleId, summary: f.summary })),
      },
    };
  }

  /* 2 + 3. Targets: the gated engine first, the body-profile fallback
        second — the Nutrition tab's exact resolution order. */
  let targets: NutritionTargets | null = null;
  let targetsSource: DailyPlan["targetsSource"] = "assessment";
  if (input.gatedOutcome.ok) {
    targets = validTargets(nutritionTargetsFromOutcome(input.gatedOutcome));
  }
  if (!targets) {
    targets = validTargets(input.fallbackTargets);
    targetsSource = "body_profile";
  }
  if (!targets || profile.goal === null) {
    const extra: string[] = [];
    if (!targets && blockingIds.includes("safety_answers_missing")) extra.push("safetyAnswers");
    if (!targets && extra.length === 0 && missingBodyFields(profile).length === 0 && profile.goal !== null) {
      extra.push("body");
    }
    return { ok: false, refusal: { kind: "insufficient_data", missing: missingNames(profile, extra) } };
  }

  const goal = profile.goal;
  const snapshot = planInputsSnapshotOf(profile, safety, targets);
  const splits = splitTargets(targets, mealSlotsFor(profile.dietary.mealsPerDay));
  const pool = eligiblePool(profile, input.foods);

  /* Variety across the day first: each meal prefers foods no earlier meal
     used. A meal that finds nothing unused retries against the whole
     pool — a repeated food beats an empty meal when data exists. */
  const used = new Set<string>();
  const meals: PlanMeal[] = splits.map((split) => {
    const unused = pool.filter((f) => !used.has(f.id));
    let result = suggestForMeal(unused, split);
    if (result.suggestions.length === 0 && unused.length !== pool.length) {
      result = suggestForMeal(pool, split);
    }
    for (const id of result.usedIds) used.add(id);
    return {
      meal: split.meal,
      kcal: split.kcal,
      proteinG: split.proteinG,
      suggestions: result.suggestions,
      note: result.suggestions.length === 0 ? EMPTY_MEAL_NOTE : null,
    };
  });

  return {
    ok: true,
    plan: {
      id: input.id ?? newNutritionId("plan"),
      day: input.day,
      generatedAt: input.now,
      goal,
      goalProfile: goalProfileOf(goal),
      targets,
      targetsSource,
      safetyClassification: safety.classification,
      cautions: safety.findings.filter((f) => !f.blocking).map((f) => f.summary),
      meals,
      inputs: snapshot,
      fingerprint: fingerprintOfInputs(snapshot),
    },
  };
}

/* --------------------------------- storage --------------------------------- */

/**
 * The plan lives in the shared preferences document under its own
 * versioned key, exactly the pattern the foods and the food log set
 * (design §4.3): sync (per-key merge into `user_prefs`), export
 * (`loadDoc()` wholesale) and erasure (`erase_my_data()` deletes the
 * caller's `user_prefs` row wholesale) are inherited by construction —
 * verified against `prefs.ts`, `useExportBundle` and the erase function,
 * none of which enumerate keys.
 */
export const PLAN_KEY = "health.plan.v1";
export const PLAN_VERSION = 1;

export interface PlanValue {
  version: typeof PLAN_VERSION;
  plan: DailyPlan;
}

export function planValueOf(plan: DailyPlan): PlanValue {
  return { version: PLAN_VERSION, plan };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function numIn(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    return null;
  }
  return value;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

function numOrNull(value: unknown, min: number, max: number): number | null {
  return value === null ? null : numIn(value, min, max);
}

const GOALS: readonly VitalisGoal[] = ["lose", "maintain", "gain", "recomp", "general_health"];
const GOAL_PROFILES: readonly PlanGoalProfile[] = ["lose", "gain", "maintain", "recomp"];
const ACTIVITIES: readonly ActivityLevel[] = ["sedentary", "light", "moderate", "active", "very_active"];
const PATTERNS: readonly DietaryPattern[] = [
  "omnivore",
  "vegetarian",
  "vegan",
  "eggetarian",
  "pescatarian",
  "other",
];
const SEXES: readonly Sex[] = ["female", "male", "unspecified"];
const TARGET_SOURCES: readonly DailyPlan["targetsSource"][] = ["assessment", "body_profile"];

function parseSnapshot(raw: unknown): PlanInputsSnapshot | null {
  if (!isRecord(raw)) return null;
  const goal = raw["goal"] === null ? null : oneOf(raw["goal"], GOALS);
  if (raw["goal"] !== null && goal === null) return null;
  const sex = oneOf(raw["sex"], SEXES);
  if (!sex) return null;
  const ageYears = numOrNull(raw["ageYears"], 13, 110);
  if (raw["ageYears"] !== null && ageYears === null) return null;
  const heightCm = numOrNull(raw["heightCm"], 100, 250);
  if (raw["heightCm"] !== null && heightCm === null) return null;
  const weightKg = numOrNull(raw["weightKg"], 25, 350);
  if (raw["weightKg"] !== null && weightKg === null) return null;
  const targetWeightKg = numOrNull(raw["targetWeightKg"], 25, 350);
  if (raw["targetWeightKg"] !== null && targetWeightKg === null) return null;
  const activity = raw["activity"] === null ? null : oneOf(raw["activity"], ACTIVITIES);
  if (raw["activity"] !== null && activity === null) return null;
  const rateKgPerWeek = numIn(raw["rateKgPerWeek"], 0, 2);
  if (rateKgPerWeek === null) return null;
  const mealsPerDay = numOrNull(raw["mealsPerDay"], 1, 12);
  if (raw["mealsPerDay"] !== null && mealsPerDay === null) return null;
  const dietaryPattern = raw["dietaryPattern"] === null ? null : oneOf(raw["dietaryPattern"], PATTERNS);
  if (raw["dietaryPattern"] !== null && dietaryPattern === null) return null;
  const safetyClassification = oneOf(raw["safetyClassification"], SAFETY_CLASSES);
  if (!safetyClassification) return null;
  const targetsKcal = numIn(raw["targetsKcal"], 0.01, 10000);
  const targetsProteinG = numIn(raw["targetsProteinG"], 0.01, 1000);
  if (targetsKcal === null || targetsProteinG === null) return null;
  return {
    goal,
    ageYears: ageYears === null ? null : Math.round(ageYears),
    sex,
    heightCm,
    weightKg,
    targetWeightKg,
    activity,
    rateKgPerWeek,
    mealsPerDay: mealsPerDay === null ? null : Math.round(mealsPerDay),
    dietaryPattern,
    safetyClassification,
    targetsKcal,
    targetsProteinG,
  };
}

function parseSuggestion(raw: unknown): PlanSuggestion | null {
  if (!isRecord(raw)) return null;
  const foodId = text(raw["foodId"], 80);
  const name = text(raw["name"], 120);
  if (!foodId || !name) return null;
  const grams = numIn(raw["grams"], 0.1, 5000);
  if (grams === null) return null;
  const nutrients = parseEntryNutrients(raw["nutrients"]);
  if (!nutrients) return null;
  const provenance = parseFoodProvenance(raw["provenance"]);
  /* A stored suggestion may only carry a source the generator itself
     would use — a plan that claims IFCT values is not a plan Bloom made. */
  if (!provenance || (provenance.kind !== "usda" && provenance.kind !== "user_entered")) return null;
  return { foodId, name, grams, nutrients, provenance };
}

function parsePlan(raw: unknown): DailyPlan | null {
  if (!isRecord(raw)) return null;
  const id = text(raw["id"], 80);
  if (!id) return null;
  const day = raw["day"];
  if (typeof day !== "string" || !isRealDayKey(day)) return null;
  const generatedAt = typeof raw["generatedAt"] === "string" ? raw["generatedAt"] : "";
  const goal = oneOf(raw["goal"], GOALS);
  if (!goal) return null;
  const goalProfile = oneOf(raw["goalProfile"], GOAL_PROFILES);
  /* The profile must be the one the goal implies — a relabelled plan is
     refused, not reinterpreted. */
  if (!goalProfile || goalProfile !== goalProfileOf(goal)) return null;
  if (!isRecord(raw["targets"])) return null;
  const kcal = numIn(raw["targets"]["kcal"], 0.01, 10000);
  const proteinG = numIn(raw["targets"]["proteinG"], 0.01, 1000);
  if (kcal === null || proteinG === null) return null;
  const targets: NutritionTargets = { kcal, proteinG };
  const targetsSource = oneOf(raw["targetsSource"], TARGET_SOURCES);
  if (!targetsSource) return null;
  const safetyClassification = oneOf(raw["safetyClassification"], SAFETY_CLASSES);
  if (!safetyClassification) return null;
  const cautions: string[] = [];
  if (Array.isArray(raw["cautions"])) {
    for (const item of raw["cautions"].slice(0, 10)) {
      const line = text(item, 400);
      if (line) cautions.push(line);
    }
  }
  if (!Array.isArray(raw["meals"]) || raw["meals"].length < 1 || raw["meals"].length > MEALS.length) {
    return null;
  }
  const meals: PlanMeal[] = [];
  const seenMeals = new Set<Meal>();
  for (const item of raw["meals"]) {
    if (!isRecord(item)) return null;
    const meal = oneOf(item["meal"], MEALS);
    if (!meal || seenMeals.has(meal)) return null;
    seenMeals.add(meal);
    const mealKcal = numIn(item["kcal"], 0, 10000);
    const mealProtein = numIn(item["proteinG"], 0, 1000);
    if (mealKcal === null || mealProtein === null) return null;
    const suggestions: PlanSuggestion[] = [];
    if (Array.isArray(item["suggestions"])) {
      for (const s of item["suggestions"].slice(0, 4)) {
        const suggestion = parseSuggestion(s);
        if (suggestion) suggestions.push(suggestion);
      }
    }
    meals.push({
      meal,
      kcal: Math.round(mealKcal),
      proteinG: round1(mealProtein),
      suggestions,
      note: item["note"] === null ? null : text(item["note"], 240) || null,
    });
  }
  /* The split invariant is part of the plan's identity: meals that do not
     sum exactly to the targets are not a plan this engine generated. */
  if (meals.reduce((sum, m) => sum + m.kcal, 0) !== Math.round(targets.kcal)) return null;
  const proteinTenths = meals.reduce((sum, m) => sum + Math.round(m.proteinG * 10), 0);
  if (proteinTenths !== Math.round(targets.proteinG * 10)) return null;
  const inputs = parseSnapshot(raw["inputs"]);
  if (!inputs) return null;
  const fingerprint = typeof raw["fingerprint"] === "string" ? raw["fingerprint"] : "";
  /* The fingerprint must be the one the inputs produce — a plan whose
     stated inputs were edited after generation is refused whole. */
  if (!fingerprint || fingerprint !== fingerprintOfInputs(inputs)) return null;
  return {
    id,
    day,
    generatedAt,
    goal,
    goalProfile,
    targets,
    targetsSource,
    safetyClassification,
    cautions,
    meals,
    inputs,
    fingerprint,
  };
}

/** Strict envelope parse for the plan value. Null on anything malformed —
 *  `getPref` then falls back, so a corrupt or tampered plan can never
 *  reach a screen as if Bloom had generated it. */
export function parsePlanValue(raw: unknown): DailyPlan | null {
  if (!isRecord(raw)) return null;
  if (raw["version"] !== PLAN_VERSION) return null;
  return parsePlan(raw["plan"]);
}

/* ------------------------------- pref access ------------------------------- */

export function readPlan(): DailyPlan | null {
  return getPref(PLAN_KEY, parsePlanValue, null);
}

export function writePlan(plan: DailyPlan): void {
  setPref(PLAN_KEY, planValueOf(plan));
}
