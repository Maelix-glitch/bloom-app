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
 * by tests), plus food suggestions per meal.
 *
 * Composition (P2) is layered, patterned and capped, grounded in the
 * balanced-diet composition research (ICMR-NIN My Plate / DGI-2024, ISSN
 * protein distribution, BNF portions): each main meal is built as a grain
 * base + a protein layer + at least two vegetables + a measured fat + a
 * dairy extra, filtered by the person's dietary pattern (encoded on
 * ingredient identity, never on veg/non-veg labels), sized inside hard
 * per-food-group portion caps, rotated deterministically by day, and
 * checked against the ICMR day floors it aims at — with any shortfall
 * named on the plan rather than padded over. Where a rule below is an
 * engine derivation rather than a guideline quotation, the comment says
 * so. A meal no clean food fits stays empty with an honest note — the
 * plan never pads itself with a fabricated dish.
 *
 * Maturity (P3) then reconciles what composition produced: each main
 * meal is capped at a plate a person assembles (8 suggestions), a
 * protein shortfall under 95% of the target is actively closed
 * (resize → swap → add, inside the same caps), and the day's energy is
 * trimmed or fed back to within ±3% of its guide — floors unbroken,
 * protein and vegetables never trimmed. Whatever still misses is
 * named in the plan's notes with its true figure.
 *
 * Dish-first (P5): when the caller supplies the dish library, a main
 * meal is composed from DISHES first — a protein anchor dish, plus a
 * rice/bread base and a side where the meal's energy share calls for
 * them — chosen under the same gates the plan applies everywhere
 * (the dish suits the person's pattern, every ingredient line sits in
 * the eligible pool, the person's stated budget tier is a hard cap).
 * A dish's numbers are its computed `dishNutrients` — the day's totals
 * are the dishes' totals, so the plan and the dish library can never
 * disagree. Simple foods return only as a subordinate top-up layer
 * that closes the day's remaining protein/energy gap, and the layered
 * food composition above survives as the per-meal fallback for a slot
 * no suitable dish can fill — never an empty meal while food fits.
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
import {
  dishNutrients,
  dishPatterns,
  dishProvenance,
  type Dish,
  type DishCategory,
} from "./dishes";
import { newNutritionId } from "./ids";
import { nutrientsForGrams } from "./math";
import { isRealDayKey, parseEntryNutrients, parseFoodProvenance } from "./parse";
import { MICRO_RICH_SHARE, planLearningFor, type PlanLearning } from "./planAdaptation";
import { adjustedTargets } from "./targetAdjustment";
import { nutritionTargetsFromOutcome, type NutritionTargets } from "./targets";
import { USDA_REFERENCE_FOODS } from "./usdaReference";
import {
  MEALS,
  type Food,
  type FoodClassification,
  type FoodGroup,
  type FoodProvenance,
  type LogEntry,
  type Meal,
  type Nutrients,
} from "./types";

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

/** The composition layer a suggestion belongs to (P2). Main meals are
 *  built in layers — a grain base, the protein layer, vegetables, and the
 *  finishing touches (measured fat, dairy extra, breakfast fruit/nuts);
 *  snack items carry `snack`; P5 top-up foods — the simple foods that
 *  close a dish-composed day's remaining gap — carry `topup`. Absent on
 *  plans stored by the P1 composer, which suggested without layers. */
export type SuggestionLayer = "base" | "protein" | "vegetables" | "finishing" | "snack" | "topup";

export interface PlanSuggestion {
  foodId: string;
  name: string;
  grams: number;
  /** Computed by the lib's portion math at generation time. */
  nutrients: Nutrients;
  provenance: FoodProvenance;
  layer?: SuggestionLayer;
}

/** The role a dish plays in a dish-composed meal (P5): the anchor is
 *  the meal's protein centrepiece; a base (rice/bread) and a side join
 *  it where the meal's energy share calls for them. */
export type PlanDishRole = "anchor" | "base" | "side";

/**
 * One dish placed in a plan meal (P5). The dish is served whole — one
 * serving of the library recipe — and its nutrients are the dish's own
 * computed `dishNutrients` at generation time, under the recipe
 * provenance: the plan's numbers ARE the library's numbers for the
 * same dish, by construction.
 */
export interface PlanDish {
  dishId: string;
  /** The dish's English name, as the library states it. */
  name: string;
  /** The dish's Hindi name, as the library states it. */
  hindi: string;
  role: PlanDishRole;
  /** Servings of the dish in this meal. The P5 composer serves 1. */
  servings: number;
  /** `dishNutrients(dish)` for `servings` servings, computed at
   *  generation time — never stored on the dish itself. */
  nutrients: Nutrients;
  provenance: FoodProvenance;
}

export interface PlanMeal {
  meal: Meal;
  /** This meal's share of the day's targets. Meals sum exactly to them. */
  kcal: number;
  proteinG: number;
  /** The meal's dishes (P5) — the meal itself, when a suitable dish
   *  filled its slots. Empty on food-composed meals (the fallback, and
   *  every plan stored before P5). */
  dishes: PlanDish[];
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
  /**
   * Composition notes (P2): the day-level guideline aims the suggestions
   * could not reach — a vegetable/fruit/milk floor missed, too few
   * protein sources or food groups — named in plain words. A plan that
   * meets every aim carries none. Absent (read as empty) on P1 plans.
   */
  notes: string[];
  /** The composition method that built this plan. Plans from an older
   *  method read as stale — see `planStaleness`. */
  methodVersion: number;
  meals: PlanMeal[];
  inputs: PlanInputsSnapshot;
  fingerprint: string;
}

/** The current composition method: 1 = the P1 protein-density composer,
 *  2 = the P2 layered composer (patterns, food groups, portion caps),
 *  3 = the P3 maturity pass (energy reconciliation back to the target,
 *  protein-gap closing, an 8-item plate cap, egg-part portions, honest
 *  protein/energy shortfall notes), 4 = the P4 soy-form portion fix
 *  (cooked soy forms — tofu, tempeh, edamame — portioned as the cooked
 *  foods they are, not under the dry-pulse cap), 5 = the P5 dish-first
 *  composer (meals built from library dishes — a protein anchor, a
 *  base and a side — with simple foods demoted to a top-up layer and
 *  the layered food composition kept as the per-slot fallback),
 *  6 = the log-adaptive pass (the recent logged days bias selection —
 *  protein-first anchors and top-ups after a protein-shortfall log,
 *  no energy top-ups after an energy-overshoot log; targets, splits
 *  and every composition rule untouched, and with too little log the
 *  output is the P5 composer's exactly),
 *  7 = the deeper-learning pass (P7): dishes the person logs
 *  repeatedly lead the picks, a dish the last completed plan served
 *  but the log never took up sits further back, and dishes rich in a
 *  micronutrient the logged week runs short of are preferred — all
 *  still selection bias inside the same rules, targets moved only by
 *  a user-confirmed expenditure adjustment (see targetAdjustment),
 *  and with no usable log the output is the P6 composer's exactly). */
export const PLAN_METHOD_VERSION = 7;

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
 *  change the plan actually embodies, so it reports as "your targets".
 *  A plan built by an older composition method is stale on that ground
 *  alone — the method improved, and regenerating is how the person gets
 *  the better composition; the reason is named, never silent. */
export function planStaleness(plan: DailyPlan, current: PlanInputsSnapshot): PlanStaleness {
  const changed: string[] = [];
  if ((plan.methodVersion ?? 1) < PLAN_METHOD_VERSION) changed.push("the plan method improved");
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
    mealsPerDay === null
      ? MEALS.length
      : Math.min(MEALS.length, Math.max(1, Math.floor(mealsPerDay)));
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

/* --------------------- dietary patterns (ingredient facts) ------------------ */

/**
 * Dietary patterns as first-class filters (P2). A pattern is a set of
 * allowances over ingredient identity — egg, dairy, flesh, fish — read
 * from each reference food's data-layer classification. Patterns are
 * NEVER encoded on veg/non-veg labels: FSSAI legally classes egg as
 * non-vegetarian food, so a label-based filter would exclude the eggs an
 * eggetarian eats (composition research §6). The app's `vegetarian`
 * answer carries its usual Indian meaning, lacto-vegetarian (dairy, no
 * egg); `eggetarian` is lacto-ovo — no flesh of any kind, eggs and dairy
 * allowed. `ovo_vegetarian` (eggs, no dairy) has no app answer today but
 * is a distinct pattern in the literature and is encoded here so the
 * filter table is complete rather than quietly conflated with another.
 */
export type PlanPattern =
  "vegetarian" | "eggetarian" | "vegan" | "ovo_vegetarian" | "pescatarian" | "non_vegetarian";

/** The plan pattern for a stated dietary pattern. `other` and unanswered
 *  map to null — no pattern filter; allergies and dislikes still apply. */
export function planPatternOf(pattern: DietaryPattern | null): PlanPattern | null {
  switch (pattern) {
    case "vegetarian":
      return "vegetarian";
    case "eggetarian":
      return "eggetarian";
    case "vegan":
      return "vegan";
    case "pescatarian":
      return "pescatarian";
    case "omnivore":
      return "non_vegetarian";
    default:
      return null;
  }
}

interface PatternAllowances {
  egg: boolean;
  dairy: boolean;
  flesh: boolean;
  fish: boolean;
}

const PATTERN_ALLOWANCES: Record<PlanPattern, PatternAllowances> = {
  vegetarian: { egg: false, dairy: true, flesh: false, fish: false },
  eggetarian: { egg: true, dairy: true, flesh: false, fish: false },
  vegan: { egg: false, dairy: false, flesh: false, fish: false },
  ovo_vegetarian: { egg: true, dairy: false, flesh: false, fish: false },
  pescatarian: { egg: true, dairy: true, flesh: false, fish: true },
  non_vegetarian: { egg: true, dairy: true, flesh: true, fish: true },
};

/** Whether a classified food's ingredient identity fits a pattern. */
export function patternAllowsClassification(
  pattern: PlanPattern | null,
  classification: FoodClassification,
): boolean {
  if (pattern === null) return true;
  const allow = PATTERN_ALLOWANCES[pattern];
  if (classification.containsEgg && !allow.egg) return false;
  if (classification.containsDairy && !allow.dairy) return false;
  if (classification.isFish) return allow.fish;
  if (classification.isFlesh) return allow.flesh;
  return true;
}

/* ------------------------------- suggestions ------------------------------- */

/**
 * The eligible pool: the user's own foods and the USDA reference set —
 * the two sources whose values Bloom may plan with today. Anything else
 * (an IFCT or OFF food arriving in the pool before its licence lands)
 * is refused here, whatever assembled the pool. The dietary-pattern
 * filter then judges every CLASSIFIED food by its ingredient identity.
 * A person's own foods carry no classification — Bloom does not claim
 * to know what is in a food it did not curate — so they pass the pattern
 * filter; name-matching still drops foods the person said they are
 * allergic to, cannot tolerate, or dislike — their own words against
 * food names, nothing inferred.
 *
 * Exported for the Nutrition tab's swap suggestions (N-UI): a swap is a
 * one-food plan decision, so it is held to exactly this filter — same
 * provenance gate, same pattern judgement, same name-matching.
 */
export function eligiblePool(profile: HealthProfile, foods: readonly Food[]): Food[] {
  const terms = [
    ...profile.dietary.allergies,
    ...profile.dietary.intolerances,
    ...profile.dietary.dislikedFoods,
  ]
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length >= 3);
  const pattern = planPatternOf(profile.dietary.pattern);
  return foods.filter((food) => {
    if (food.provenance.kind !== "usda" && food.provenance.kind !== "user_entered") return false;
    if (food.classification && !patternAllowsClassification(pattern, food.classification)) {
      return false;
    }
    const name = food.name.toLowerCase();
    return !terms.some((term) => name.includes(term));
  });
}

/* ------------------------------ rotation ---------------------------------- */

function fnv1a(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * The day's rotation order over the pool: candidates sorted by a hash of
 * (plan day, food id). Deterministic — the same day always composes the
 * same plan, and regenerating a day never re-rolls it — while consecutive
 * days order the pool differently, so grains, protein sources and
 * vegetables rotate across days. The guidelines prescribe rotation
 * across food types as the variety mechanism (ICMR-NIN DGI-2024
 * Guideline 1 and the My Plate variety footnote; composition research
 * §7); the per-day hash is the engine's operationalisation of that
 * principle — a derivation, not a quoted rule.
 */
function rotationOrder(day: string, pool: readonly Food[]): Food[] {
  return pool
    .map((food) => ({ food, key: fnv1a(`${day}:${food.id}`) }))
    .sort((a, b) => a.key - b.key || (a.food.id < b.food.id ? -1 : 1))
    .map((entry) => entry.food);
}

/* ---------------------------- portion caps (hard) --------------------------- */

/**
 * Per-meal portion caps, from the composition research (§5). These are
 * hard constraints: a solver that meets a macro target by breaking one
 * has failed at composition even when the numbers sum. The two cases
 * that forced this rebuild — 235 g of dry lentils and 400 g of one
 * vegetable in a single meal — are exactly what the pulse and vegetable
 * caps exist to refuse.
 */
const CAP_GRAIN_DRY_G = 90; // dry cereals/millets per meal (brief; BNF dry rice portion 65 g, research flags >120 g)
const CAP_UNCLASSIFIED_BASE_G = 200; // own foods: dry/cooked basis unknown — a middle bound, derivation
const CAP_DRY_PULSES_G = 60; // dry pulses/legumes per meal; normal range 30–50 g, 85 g is the whole ICMR day
const CAP_COOKED_SOY_G = 120; // cooked soy forms per meal (P4) — tofu/tempeh/edamame are eaten
// cooked, at cooked portions: 120 g is a normal serving of tempeh or a bowl of edamame,
// where the 60 g dry-pulse cap (60 g dry ≈ 180 g cooked) silently halved them.
const CAP_EGGS_G = 120; // ≈ 2 eggs (BNF: 2 eggs = 120 g, one protein portion)
const CAP_EGG_PART_G = 60; // egg yolk / egg white alone (P3): the parts are components a cook
// folds into a dish, not standalone portions — 120 g of yolk is ~7 yolks. Whole egg keeps 120 g.
const CAP_DAIRY_PROTEIN_G = 100; // paneer-type dairy in the protein layer (BNF cottage-cheese portion 100 g; research flags >150 g)
const CAP_HARD_CHEESE_G = 30; // hard grating cheeses are condiment-density foods — BNF portions hard cheese at 30 g
const CAP_FLESH_G = 200; // a single meat/fish portion, derivation from BNF protein portions
const CAP_UNCLASSIFIED_PROTEIN_G = 200; // own foods in the protein layer, derivation
const CAP_SINGLE_VEGETABLE_G = 200; // one vegetable in one meal (research §5)
const CAP_MEAL_VEGETABLES_G = 300; // all vegetables in one meal (research §5)
const CAP_FAT_G = 14; // measured visible fat per meal ≈ 1 tbsp (research flags >15 g)
const CAP_FINISHING_DAIRY_G = 250; // milk/curd extra per meal — the tighter of the research serving flags (curd 250 g, milk 300 ml)
const CAP_FRUIT_G = 200; // one fruit portion per sitting, derivation (BNF fruit portion 80 g; ICMR day 100 g)
const CAP_NUTS_G = 30; // nuts/seeds per sitting (BNF portion 20 g; ICMR day 35 g)
/** Portions are sized in 5 g steps and never below this floor. */
const MIN_PORTION_G = 5;

/* Day floors from the ICMR-NIN My Plate (2,000 kcal reference day),
   HELD — not linearly scaled — at higher energy needs, per the policy
   brief's own scaling warning (composition research §1): the extra
   energy and protein of a larger target go to cereals, pulses, dairy,
   eggs and oils, not to ever-larger vegetable piles. */
const FLOOR_VEGETABLES_G = 400;
const FLOOR_FRUIT_G = 100;
const FLOOR_MILK_CURD_G = 300;
/** Diversity aims (research §1, §7): at least 8 food groups a day is the
 *  ICMR floor; ≥3 distinct protein sources and the ≤40% single-source
 *  share are the research's operationalisation — derivations. */
const AIM_DISTINCT_PROTEIN_SOURCES = 3;
const AIM_FOOD_GROUPS = 8;
const MAX_SINGLE_FOOD_PROTEIN_SHARE = 0.4;

/* Layer energy shares for a main meal — DERIVATIONS (composition
   research §3): no guideline publishes per-meal layer shares; these
   translate the ICMR day shares (cereals 42%E, pulses 14%E, milk 11%E,
   oils 12%E) to a thali whose protein layer is enlarged, because a
   high-protein target (~27%E of the day) cannot be met at the
   general-population protein share. Vegetables are sized by grams, not
   energy — they dominate plate volume, not calories. */
const GRAIN_SHARE_OF_MEAL = 0.35;
const FAT_SHARE_OF_MEAL = 0.1;
/** The protein layer may not crowd out more than this share of a meal's
 *  energy — a guard (derivation) against protein-dense picks eating the
 *  whole plate; items after the first are sized down to respect it. */
const PROTEIN_LAYER_MAX_MEAL_SHARE = 0.6;
const MAX_PROTEIN_ITEMS_PER_MEAL = 4;
/** Within this many grams, a meal's protein counts as landed. */
const PROTEIN_CLOSE_ENOUGH_G = 3;

const EMPTY_MEAL_NOTE =
  "No food with known values fits this meal yet. Add a food you eat, then regenerate the plan.";

/* --------------------------------- sizing --------------------------------- */

interface SizedPortion {
  grams: number;
  nutrients: Nutrients;
}

/** Round a gram amount to the plan's 5 g steps, never above the cap. */
function roundToStep(grams: number, capG: number): number {
  const stepped = Math.round(grams / 5) * 5;
  return stepped > capG ? Math.floor(capG / 5) * 5 : stepped;
}

/**
 * Size a portion of `food` toward a kcal or protein aim, clamped to the
 * layer's hard cap. Nutrients always come from the lib's own portion
 * math — never re-derived here. Null when no sane portion exists: the
 * food has no density to size by, or the sized portion falls below the
 * 5 g floor.
 */
function sizedPortion(
  food: Food,
  aim: { kcal?: number; proteinG?: number },
  capG: number,
): SizedPortion | null {
  let grams: number | null = null;
  if (aim.proteinG !== undefined && food.per100g.proteinG > 0) {
    grams = (aim.proteinG / food.per100g.proteinG) * 100;
  } else if (aim.kcal !== undefined && food.per100g.kcal > 0) {
    grams = (aim.kcal / food.per100g.kcal) * 100;
  }
  if (grams === null || !Number.isFinite(grams)) return null;
  grams = roundToStep(grams, capG);
  if (grams < MIN_PORTION_G) return null;
  return { grams, nutrients: nutrientsForGrams(food.per100g, grams) };
}

/* ------------------------------ composition ------------------------------- */

const groupOf = (food: Food): FoodGroup | null => food.classification?.group ?? null;

/** Milk/curd for the day floor and the finishing layer: the dairy group's
 *  fluid and fermented foods. The protein-bearing dairy foods (Greek
 *  yogurt, cottage cheese, hard cheeses) are protein-layer foods; what
 *  remains in this set is milk and plain curd/yogurt — the foods the
 *  ICMR 300 ml floor is stated in. */
const isMilkOrCurd = (food: Food): boolean =>
  groupOf(food) === "dairy" && food.per100g.proteinG < 5;

/** Shared composition state for one day: the pool in rotation order, the
 *  foods already suggested (variety prefers the unused), and the running
 *  day-floor totals the later meals can react to. */
interface ComposeContext {
  ordered: readonly Food[];
  pattern: PlanPattern | null;
  used: Set<string>;
  vegG: number;
  fruitG: number;
  milkCurdG: number;
  /** Log-adaptive bias (P6): the person's recent logged days averaged
   *  well under their protein target, so protein-bearing choices are
   *  ranked by protein density first. Absent/false = the unbiased
   *  composer, exactly as before P6. */
  proteinFirst?: boolean;
}

function recordSuggestion(
  ctx: ComposeContext,
  food: Food,
  portion: SizedPortion,
  layer: SuggestionLayer,
): PlanSuggestion {
  ctx.used.add(food.id);
  if (groupOf(food) === "vegetables") ctx.vegG += portion.grams;
  if (groupOf(food) === "fruits") ctx.fruitG += portion.grams;
  if (isMilkOrCurd(food)) ctx.milkCurdG += portion.grams;
  return {
    foodId: food.id,
    name: food.name,
    grams: portion.grams,
    nutrients: portion.nutrients,
    provenance: food.provenance,
    layer,
  };
}

/** First food in rotation order matching `pred`, preferring one not yet
 *  suggested today; when every match is used, the first match (a repeated
 *  food beats an empty layer when data exists — the P1 principle).
 *  Foods already in the current meal are always excluded. */
function pickFood(
  ctx: ComposeContext,
  inMeal: ReadonlySet<string>,
  pred: (food: Food) => boolean,
): Food | null {
  let fallback: Food | null = null;
  for (const food of ctx.ordered) {
    if (inMeal.has(food.id) || !pred(food)) continue;
    if (!ctx.used.has(food.id)) return food;
    fallback ??= food;
  }
  return fallback;
}

/* ------------------------------ protein kinds ------------------------------ */

type ProteinKind = "eggs" | "pulses" | "dairy" | "flesh" | "own";

const PROTEIN_CAP_G: Record<ProteinKind, number> = {
  eggs: CAP_EGGS_G,
  pulses: CAP_DRY_PULSES_G,
  dairy: CAP_DAIRY_PROTEIN_G,
  flesh: CAP_FLESH_G,
  own: CAP_UNCLASSIFIED_PROTEIN_G,
};

/** An egg part — yolk or white alone — as opposed to the whole egg. The
 *  reference set's eggs group holds exactly three foods (whole, white,
 *  yolk) with the part named in the pinned USDA description; a food in
 *  the group whose name does not say "whole" is a part. Parts are
 *  capped tighter (P3) and lose rotation ties to the whole egg: a plan
 *  suggests eggs a person cracks, not bowls of separated yolks. */
function isEggPart(food: Food): boolean {
  return groupOf(food) === "eggs" && !/whole/i.test(food.name);
}

/** A seasoning-class vegetable (P3): in this reference set, the hot
 *  chillies — "Peppers, hot chili, …" — whose pinned USDA names carry
 *  their heat in the name. They belong to the vegetables group in the
 *  data (a cook buys them there; the dish library prices their tadka
 *  lines there), but a plan's vegetables layer serves portions, and a
 *  chilli is never a portion. The name test is exact for the pinned
 *  set: the sweet peppers ("Peppers, sweet, …") do not match and stay
 *  eligible, as they should — they are eaten by the piece. */
function isSeasoningClass(food: Food): boolean {
  return groupOf(food) === "vegetables" && /hot chili|chilli/i.test(food.name);
}

/** The cooked soy forms in the reference set (P4): the foods the USDA
 *  set carries as ready-to-eat soy — firm tofu (FDC 172448), tempeh
 *  (FDC 174272) and edamame (FDC 168410), keyed by their pinned
 *  reference ids (`usda-<fdcId>`). They sit in the pulses_legumes
 *  group, but unlike the group's dry seeds they are eaten cooked, so
 *  the dry-pulse cap misapplies to them (60 g of tempeh is half a
 *  serving). Keyed on id, not name: the ids are the stable FDC
 *  identity the generator pins. If a further cooked soy form joins
 *  the set, it joins this list with its FDC id — dry soybeans
 *  (FDC 174270) deliberately do not: they are a dry seed and keep the
 *  dry cap. */
export const COOKED_SOY_FORM_IDS: ReadonlySet<string> = new Set([
  "usda-172448", // Tofu, firm — FDC 172448
  "usda-174272", // Tempeh — FDC 174272
  "usda-168410", // Edamame, frozen — FDC 168410
]);

/** The protein-layer cap for one food. Dairy splits by the food's own
 *  energy density: at ≥350 kcal per 100 g a dairy food is a hard grating
 *  cheese (in this set, parmesan), portioned by BNF at 30 g — not a
 *  paneer-type food, whose 100 g portion the wider cap comes from. The
 *  density threshold is a derivation from the food's stated values. */
function proteinCapG(food: Food, kind: ProteinKind): number {
  if (kind === "dairy" && food.per100g.kcal >= 350) return CAP_HARD_CHEESE_G;
  if (kind === "eggs" && isEggPart(food)) return CAP_EGG_PART_G;
  if (kind === "pulses" && COOKED_SOY_FORM_IDS.has(food.id)) return CAP_COOKED_SOY_G;
  return PROTEIN_CAP_G[kind];
}

/** The protein-layer kind of a food, or null when it cannot carry a
 *  meal's protein layer. Classified foods qualify by group; an own food
 *  qualifies on its own stated values (≥5 g protein per 100 g — the P1
 *  protein-source threshold, a fact about the food, not a guess at its
 *  identity). */
function proteinKindOf(food: Food): ProteinKind | null {
  const group = groupOf(food);
  if (group === "eggs") return "eggs";
  if (group === "pulses_legumes") return "pulses";
  if (group === "dairy") return food.per100g.proteinG >= 5 ? "dairy" : null;
  if (group === "other") return food.classification?.isFlesh ? "flesh" : null;
  if (group !== null) return null;
  return food.per100g.proteinG >= 5 ? "own" : null;
}

/** Grain-base eligibility: classified cereals, or an own food whose own
 *  stated values are predominantly carbohydrate (P1's meal-base rule). */
function isGrainBase(food: Food): boolean {
  const group = groupOf(food);
  if (group !== null) return group === "cereals_grains";
  return food.per100g.carbsG >= 10;
}

/* ------------------------------- main meals ------------------------------- */

interface MainMealComposition {
  suggestions: PlanSuggestion[];
  /** Which expected layers produced nothing, in plain names. */
  missingLayers: string[];
}

function composeMainMeal(
  ctx: ComposeContext,
  split: MealSplit,
  opts: { vegTargetG: number; fruitAtBreakfast: boolean; isBreakfast: boolean },
): MainMealComposition {
  const suggestions: PlanSuggestion[] = [];
  const inMeal = new Set<string>();
  const missing: string[] = [];
  let kcalTally = 0;
  const add = (food: Food, portion: SizedPortion, layer: SuggestionLayer) => {
    suggestions.push(recordSuggestion(ctx, food, portion, layer));
    inMeal.add(food.id);
    kcalTally += portion.nutrients.kcal;
  };

  /* (a) Grain base — ~35% of the meal's energy (derivation, §3). */
  const grain = pickFood(ctx, inMeal, isGrainBase);
  const grainPortion =
    grain &&
    sizedPortion(
      grain,
      { kcal: GRAIN_SHARE_OF_MEAL * split.kcal },
      groupOf(grain) === "cereals_grains" ? CAP_GRAIN_DRY_G : CAP_UNCLASSIFIED_BASE_G,
    );
  if (grain && grainPortion) add(grain, grainPortion, "base");
  else missing.push("a grain base");

  /* (b) Protein layer — up to four sources, distinct kinds first, each
     sized toward the protein still owed and clamped to its group cap.
     Items after the first are also sized down so the layer stays within
     its share of the meal's energy. The meal's protein split is the
     aim; the caps are the law. Where the split runs above what capped
     whole foods can carry (a 220 g day puts 55 g+ into a meal, above
     the classic 20–40 g serving band — research §4), the meal lands
     under its split honestly rather than breaking a cap to reach it. */
  let proteinLeft = split.proteinG;
  let proteinKcal = 0;
  const kindsUsed = new Set<ProteinKind>();
  for (
    let slot = 0;
    slot < MAX_PROTEIN_ITEMS_PER_MEAL && proteinLeft > PROTEIN_CLOSE_ENOUGH_G;
    slot++
  ) {
    /* Rank candidates: unused-today before used, a new kind before a
       repeat kind — rotation order breaks the remaining ties. An egg
       part also loses to the whole egg at equal standing (P3): parts
       are components, and the whole egg is the portion a person eats. */
    let best: { food: Food; kind: ProteinKind; score: number } | null = null;
    for (const food of ctx.ordered) {
      if (inMeal.has(food.id)) continue;
      const kind = proteinKindOf(food);
      if (kind === null) continue;
      const score =
        (ctx.used.has(food.id) ? 4 : 0) + (kindsUsed.has(kind) ? 2 : 0) + (isEggPart(food) ? 1 : 0);
      if (!best || score < best.score) best = { food, kind, score };
    }
    if (!best) break;
    let portion = sizedPortion(
      best.food,
      { proteinG: proteinLeft },
      proteinCapG(best.food, best.kind),
    );
    if (
      portion &&
      slot > 0 &&
      proteinKcal + portion.nutrients.kcal > PROTEIN_LAYER_MAX_MEAL_SHARE * split.kcal
    ) {
      portion = sizedPortion(
        best.food,
        { kcal: PROTEIN_LAYER_MAX_MEAL_SHARE * split.kcal - proteinKcal },
        proteinCapG(best.food, best.kind),
      );
    }
    /* A later protein item sized down to a garnish is not a source —
       the layer stops instead of suggesting a token portion. */
    if (portion && slot > 0 && portion.grams < 15) portion = null;
    if (!portion) break;
    add(best.food, portion, "protein");
    kindsUsed.add(best.kind);
    proteinLeft -= portion.nutrients.proteinG;
    proteinKcal += portion.nutrients.kcal;
  }
  if (!suggestions.some((s) => s.layer === "protein")) missing.push("a protein food");

  /* (c) Vegetables — at least two distinct when the pool allows, sized
     by grams toward the day's 400 g floor spread across the main meals:
     volume first, energy second (§3). Seasoning-class vegetables (the
     hot chillies) are excluded: they sit in the vegetables group in
     the reference data — a cook buys them there, and the dish library
     prices them there — but nobody eats 70 g of fresh chilli as a
     vegetable portion (P3). Sweet peppers are eaten in portions and
     stay eligible. */
  let vegTotal = 0;
  for (let i = 0; i < 2; i++) {
    const veg = pickFood(ctx, inMeal, (f) => groupOf(f) === "vegetables" && !isSeasoningClass(f));
    if (!veg) break;
    const room = Math.min(CAP_SINGLE_VEGETABLE_G, CAP_MEAL_VEGETABLES_G - vegTotal);
    const target = i === 0 ? Math.ceil(opts.vegTargetG / 2) : opts.vegTargetG - vegTotal;
    const grams = roundToStep(Math.min(target, room), room);
    if (grams < MIN_PORTION_G) break;
    add(veg, { grams, nutrients: nutrientsForGrams(veg.per100g, grams) }, "vegetables");
    vegTotal += grams;
  }
  if (vegTotal === 0) missing.push("vegetables");

  /* (d) Measured fat — ~10% of the meal's energy (derivation, §3),
     inside the ~1 tbsp cap. Butter and ghee live in this group too;
     the pattern filter has already judged them. */
  const fat = pickFood(ctx, inMeal, (f) => groupOf(f) === "fats_oils");
  const fatPortion = fat && sizedPortion(fat, { kcal: FAT_SHARE_OF_MEAL * split.kcal }, CAP_FAT_G);
  if (fat && fatPortion) add(fat, fatPortion, "finishing");
  else missing.push("a cooking fat");

  /* (e) Finishing — the day's floor-carrying extras, lightest first so a
     heavy extra cannot crowd the others out of the meal's tolerance:
     at breakfast, fruit (when the day has no snack slot to carry the
     fruit floor) and a small nuts/seeds item; then, at every main meal,
     the dairy extra when the pattern allows it — milk or curd sized to
     the meal's remaining energy, and sized up toward the 300 ml ICMR
     floor while the day is short of it, provided the meal is not
     already far over its split (both are aims; the floor is the one a
     guideline numbers). When the pattern excludes dairy the dairy layer
     is empty BY PATTERN, which is not a gap and is never noted as one.
     Research §3 places fruit and nuts/seeds at breakfast/snacks. */
  const withinTolerance = () => kcalTally <= 1.25 * split.kcal;
  if (opts.isBreakfast) {
    if (opts.fruitAtBreakfast) {
      const fruit = pickFood(ctx, inMeal, (f) => groupOf(f) === "fruits");
      if (fruit) {
        const remaining = split.kcal - kcalTally;
        let portion = remaining > 0 ? sizedPortion(fruit, { kcal: remaining }, CAP_FRUIT_G) : null;
        if (ctx.fruitG < FLOOR_FRUIT_G && withinTolerance()) {
          const want = Math.min(CAP_FRUIT_G, FLOOR_FRUIT_G - ctx.fruitG);
          if (!portion || portion.grams < want) {
            const grams = roundToStep(want, CAP_FRUIT_G);
            if (grams >= 50)
              portion = { grams, nutrients: nutrientsForGrams(fruit.per100g, grams) };
          }
        }
        if (portion && portion.grams >= 50) add(fruit, portion, "finishing");
      }
    }
    const nuts = pickFood(ctx, inMeal, (f) => groupOf(f) === "nuts_seeds");
    if (nuts) {
      const remaining = split.kcal - kcalTally;
      let portion =
        remaining >= 60 ? sizedPortion(nuts, { kcal: Math.min(remaining, 120) }, CAP_NUTS_G) : null;
      if (!portion && withinTolerance()) {
        portion = { grams: 15, nutrients: nutrientsForGrams(nuts.per100g, 15) };
      }
      if (portion) add(nuts, portion, "finishing");
    }
  }
  const dairyAllowed = ctx.pattern === null || PATTERN_ALLOWANCES[ctx.pattern].dairy;
  if (dairyAllowed) {
    const dairy = pickFood(ctx, inMeal, isMilkOrCurd);
    if (!dairy) {
      missing.push("a dairy extra");
    } else {
      const remaining = split.kcal - kcalTally;
      let portion =
        remaining >= 60 ? sizedPortion(dairy, { kcal: remaining }, CAP_FINISHING_DAIRY_G) : null;
      if (ctx.milkCurdG < FLOOR_MILK_CURD_G && withinTolerance()) {
        const want = Math.min(CAP_FINISHING_DAIRY_G, FLOOR_MILK_CURD_G - ctx.milkCurdG);
        if (!portion || portion.grams < want) {
          const grams = roundToStep(want, CAP_FINISHING_DAIRY_G);
          if (grams >= 50) portion = { grams, nutrients: nutrientsForGrams(dairy.per100g, grams) };
        }
      }
      if (portion && portion.grams >= 50) add(dairy, portion, "finishing");
    }
  }

  return { suggestions, missingLayers: missing };
}

/* --------------------------------- snacks --------------------------------- */

function snackCapG(food: Food): number {
  const group = groupOf(food);
  if (group === "fruits") return CAP_FRUIT_G;
  if (group === "nuts_seeds") return CAP_NUTS_G;
  if (group === "eggs") return isEggPart(food) ? CAP_EGG_PART_G : CAP_EGGS_G;
  if (group === "dairy")
    return food.per100g.proteinG >= 5 ? CAP_DAIRY_PROTEIN_G : CAP_FINISHING_DAIRY_G;
  return CAP_UNCLASSIFIED_PROTEIN_G;
}

const isSnackFood = (food: Food): boolean => {
  const group = groupOf(food);
  return (
    group === "fruits" ||
    group === "nuts_seeds" ||
    group === "dairy" ||
    group === "eggs" ||
    group === null
  );
};

/** A snack is one or two items — fruit, nuts, dairy or egg, per pattern
 *  (the pattern filter has already run). The first item leans protein
 *  when the snack's split carries real protein; the second prefers
 *  fruit while the day is still short of the fruit floor. */
function composeSnack(ctx: ComposeContext, split: MealSplit): PlanSuggestion[] {
  const suggestions: PlanSuggestion[] = [];
  const inMeal = new Set<string>();
  let kcalTally = 0;
  const add = (food: Food, portion: SizedPortion) => {
    suggestions.push(recordSuggestion(ctx, food, portion, "snack"));
    inMeal.add(food.id);
    kcalTally += portion.nutrients.kcal;
  };

  const first =
    (split.proteinG >= 10 &&
      pickFood(ctx, inMeal, (f) => isSnackFood(f) && f.per100g.proteinG >= 5)) ||
    pickFood(ctx, inMeal, isSnackFood);
  const firstPortion = first && sizedPortion(first, { kcal: 0.6 * split.kcal }, snackCapG(first));
  if (first && firstPortion) add(first, firstPortion);

  const remaining = split.kcal - kcalTally;
  if (remaining >= 40) {
    const second =
      (ctx.fruitG < FLOOR_FRUIT_G && pickFood(ctx, inMeal, (f) => groupOf(f) === "fruits")) ||
      pickFood(ctx, inMeal, isSnackFood);
    const portion = second && sizedPortion(second, { kcal: remaining }, snackCapG(second));
    if (second && portion) add(second, portion);
  }
  return suggestions;
}

/* --------------------------- day-level honesty ----------------------------- */

/**
 * No single food may supply more than ~40% of the day's protein
 * (research §7 operationalisation — a derivation). Rotation and the
 * portion caps make this rare; when a thin pool forces one food to
 * dominate, later portions of it are trimmed (never below a real
 * portion, and an item trimmed to nothing is removed) so the plan's
 * protein is genuinely spread.
 */
function applyProteinDominanceCap(
  meals: PlanMeal[],
  byId: ReadonlyMap<string, Food>,
  targetProteinG: number,
): void {
  const cap = MAX_SINGLE_FOOD_PROTEIN_SHARE * targetProteinG;
  const totals = new Map<string, number>();
  for (const meal of meals) {
    for (const s of meal.suggestions) {
      totals.set(s.foodId, (totals.get(s.foodId) ?? 0) + s.nutrients.proteinG);
    }
  }
  for (const [foodId, protein] of totals) {
    if (protein <= cap) continue;
    const food = byId.get(foodId);
    if (!food || food.per100g.proteinG <= 0) continue;
    let excess = protein - cap;
    for (let i = meals.length - 1; i >= 0 && excess > 0; i--) {
      const meal = meals[i]!;
      const idx = meal.suggestions.findIndex((s) => s.foodId === foodId);
      if (idx < 0) continue;
      const suggestion = meal.suggestions[idx]!;
      const cutG = Math.ceil(((excess / food.per100g.proteinG) * 100) / 5) * 5;
      const newGrams = suggestion.grams - cutG;
      if (newGrams < 10) {
        excess -= suggestion.nutrients.proteinG;
        meal.suggestions.splice(idx, 1);
        if (meal.suggestions.length === 0 && meal.dishes.length === 0) {
          meal.note = EMPTY_MEAL_NOTE;
        }
      } else {
        const nutrients = nutrientsForGrams(food.per100g, newGrams);
        excess -= suggestion.nutrients.proteinG - nutrients.proteinG;
        meal.suggestions[idx] = { ...suggestion, grams: newGrams, nutrients };
      }
    }
  }
}

/* --------------------- P3 maturity passes (post-compose) -------------------- */

/** A main meal a person can actually assemble: at most this many
 *  suggestions. The P2 composer could stack eleven (base + four protein
 *  items + two vegetables + fat + fruit + nuts + dairy at breakfast) —
 *  a spreadsheet, not a plate. Snacks keep their own 1–2 item shape. */
const MAX_MAIN_MEAL_ITEMS = 8;
/** Protein closing (P3): below this share of the target the gap is
 *  worth closing actively; the notes name whatever remains below it. */
const PROTEIN_CLOSE_FRACTION = 0.95;
/** Energy reconciliation (P3): composition may land within ±3% of the
 *  target untouched; outside that, the trim/add-back passes work it
 *  back toward the target. The notes judge the result at ±5%. */
const ENERGY_TRIM_TRIGGER = 1.03;
const ENERGY_ADD_TRIGGER = 0.97;
const ENERGY_NOTE_BAND = 0.05;

const dayKcalOf = (meals: readonly PlanMeal[]): number =>
  meals.reduce(
    (sum, m) =>
      sum +
      m.suggestions.reduce((a, s) => a + s.nutrients.kcal, 0) +
      m.dishes.reduce((a, d) => a + d.nutrients.kcal, 0),
    0,
  );

const dayProteinOf = (meals: readonly PlanMeal[]): number =>
  meals.reduce(
    (sum, m) =>
      sum +
      m.suggestions.reduce((a, s) => a + s.nutrients.proteinG, 0) +
      m.dishes.reduce((a, d) => a + d.nutrients.proteinG, 0),
    0,
  );

/** The day's ICMR floor totals as the meals NOW stand — recomputed from
 *  the suggestions themselves, so post-composition passes (and the
 *  notes that judge them) always speak about the plan's real numbers,
 *  never the composer's running tally. P5: a plan dish contributes its
 *  ingredient lines' grams (per serving, at the servings the plan
 *  serves) under each line food's group — a vegetable curry's
 *  vegetables are vegetables, wherever they were composed. */
function floorTotalsOf(
  meals: readonly PlanMeal[],
  byId: ReadonlyMap<string, Food>,
  dishById: ReadonlyMap<string, Dish> = new Map(),
): { vegG: number; fruitG: number; milkCurdG: number } {
  let vegG = 0;
  let fruitG = 0;
  let milkCurdG = 0;
  const addFood = (food: Food, grams: number) => {
    if (groupOf(food) === "vegetables") vegG += grams;
    if (groupOf(food) === "fruits") fruitG += grams;
    if (isMilkOrCurd(food)) milkCurdG += grams;
  };
  for (const meal of meals) {
    for (const s of meal.suggestions) {
      const food = byId.get(s.foodId);
      if (food) addFood(food, s.grams);
    }
    for (const planDish of meal.dishes) {
      const dish = dishById.get(planDish.dishId);
      if (!dish) continue;
      for (const line of dish.lines) {
        const food = byId.get(line.foodId);
        if (food) addFood(food, (line.grams / dish.servings) * planDish.servings);
      }
    }
  }
  return { vegG, fruitG, milkCurdG };
}

/** Replace a suggestion's portion, recomputing its nutrients through
 *  the lib's portion math — the only way grams ever change (P3). */
function setPortion(meal: PlanMeal, idx: number, food: Food, grams: number): void {
  const suggestion = meal.suggestions[idx]!;
  meal.suggestions[idx] = {
    ...suggestion,
    grams,
    nutrients: nutrientsForGrams(food.per100g, grams),
  };
}

const floor5 = (grams: number): number => Math.floor(grams / 5) * 5;
const ceil5 = (grams: number): number => Math.ceil(grams / 5) * 5;

/**
 * The plate cap (P3): trim each main meal to at most eight suggestions.
 * What goes, in order: the nuts extra (the one finishing item no floor
 * or layer needs); a garnish protein item (≤8 g of protein — a token,
 * not a source); a dairy or fruit extra the day's floor can spare;
 * the weakest remaining protein item; and only then a floor-carrying
 * extra. The base, the vegetables, the measured fat and the protein
 * anchor (the meal's strongest protein item) are never dropped, and a
 * meal is never emptied.
 */
function applyItemCap(
  meals: PlanMeal[],
  byId: ReadonlyMap<string, Food>,
  dishById: ReadonlyMap<string, Dish> = new Map(),
): void {
  for (const meal of meals) {
    if (meal.meal === "snack") continue;
    while (meal.suggestions.length > MAX_MAIN_MEAL_ITEMS) {
      const victim = itemCapVictim(meal, meals, byId, dishById);
      if (victim < 0) break;
      meal.suggestions.splice(victim, 1);
    }
    if (meal.suggestions.length === 0 && meal.dishes.length === 0) {
      meal.note = EMPTY_MEAL_NOTE;
    }
  }
}

function itemCapVictim(
  meal: PlanMeal,
  meals: readonly PlanMeal[],
  byId: ReadonlyMap<string, Food>,
  dishById: ReadonlyMap<string, Dish> = new Map(),
): number {
  const items = meal.suggestions;
  const foodAt = (i: number) => byId.get(items[i]!.foodId);
  let anchor = -1;
  let anchorProtein = -1;
  items.forEach((s, i) => {
    if (s.layer === "protein" && s.nutrients.proteinG > anchorProtein) {
      anchor = i;
      anchorProtein = s.nutrients.proteinG;
    }
  });
  const droppable = (i: number): boolean => {
    const layer = items[i]!.layer;
    if (layer === "base" || layer === "vegetables") return false;
    if (groupOf(foodAt(i)!) === "fats_oils") return false;
    return i !== anchor;
  };
  const totals = floorTotalsOf(meals, byId, dishById);
  /* 1. The nuts/seeds extra — no floor, no layer depends on it. */
  for (let i = 0; i < items.length; i++) {
    if (droppable(i) && groupOf(foodAt(i)!) === "nuts_seeds") return i;
  }
  /* 2. A garnish protein item — present, but not a source. */
  let garnish = -1;
  let garnishProtein = Infinity;
  items.forEach((s, i) => {
    if (
      droppable(i) &&
      s.layer === "protein" &&
      s.nutrients.proteinG <= 8 &&
      s.nutrients.proteinG < garnishProtein
    ) {
      garnish = i;
      garnishProtein = s.nutrients.proteinG;
    }
  });
  if (garnish >= 0) return garnish;
  /* 3. A floor-carrying extra the day can spare. */
  for (let i = 0; i < items.length; i++) {
    const food = foodAt(i)!;
    if (!droppable(i) || items[i]!.layer !== "finishing") continue;
    if (isMilkOrCurd(food) && totals.milkCurdG - items[i]!.grams >= FLOOR_MILK_CURD_G) return i;
    if (groupOf(food) === "fruits" && totals.fruitG - items[i]!.grams >= FLOOR_FRUIT_G) return i;
  }
  /* 4. The weakest remaining protein item. */
  let weakest = -1;
  let weakestProtein = Infinity;
  items.forEach((s, i) => {
    if (droppable(i) && s.layer === "protein" && s.nutrients.proteinG < weakestProtein) {
      weakest = i;
      weakestProtein = s.nutrients.proteinG;
    }
  });
  if (weakest >= 0) return weakest;
  /* 5. A floor-carrying extra, when nothing else can go. */
  for (let i = 0; i < items.length; i++) {
    const food = foodAt(i)!;
    if (!droppable(i) || items[i]!.layer !== "finishing") continue;
    if (isMilkOrCurd(food) || groupOf(food) === "fruits") return i;
  }
  return -1;
}

/* ---------------------------- protein closing ------------------------------ */

const proteinLayerKcal = (meal: PlanMeal): number =>
  meal.suggestions
    .filter((s) => s.layer === "protein")
    .reduce((sum, s) => sum + s.nutrients.kcal, 0);

/** Size a swap/add candidate into a meal's protein layer exactly the
 *  way the composer sizes its own later items: toward the protein aim,
 *  inside the food's cap, then down to the layer's energy share. */
function layerPortion(
  meal: PlanMeal,
  food: Food,
  proteinAimG: number,
  replacedKcal: number,
): SizedPortion | null {
  const kind = proteinKindOf(food);
  if (kind === null) return null;
  let portion = sizedPortion(food, { proteinG: proteinAimG }, proteinCapG(food, kind));
  if (!portion) return null;
  const layerKcal = proteinLayerKcal(meal) - replacedKcal + portion.nutrients.kcal;
  if (layerKcal > PROTEIN_LAYER_MAX_MEAL_SHARE * meal.kcal) {
    portion = sizedPortion(
      food,
      { kcal: PROTEIN_LAYER_MAX_MEAL_SHARE * meal.kcal - (proteinLayerKcal(meal) - replacedKcal) },
      proteinCapG(food, kind),
    );
  }
  return portion;
}

/** Eligible protein candidates for a meal, in closing order: the
 *  density band first (foods whose at-cap protein is within 80% of the
 *  best available — density leads, but near-equals keep the day's
 *  rotation, so consecutive days do not converge on one food), each
 *  band ordered unused-today first, then by rotation order. */
function proteinCandidates(ctx: ComposeContext, meal: PlanMeal): Food[] {
  const inMeal = new Set(meal.suggestions.map((s) => s.foodId));
  const eligible = ctx.ordered.filter((food) => {
    if (inMeal.has(food.id)) return false;
    const kind = proteinKindOf(food);
    return kind !== null;
  });
  const effective = (food: Food): number => {
    const kind = proteinKindOf(food)!;
    return nutrientsForGrams(food.per100g, proteinCapG(food, kind)).proteinG;
  };
  const best = eligible.reduce((max, food) => Math.max(max, effective(food)), 0);
  const inBand = (food: Food) => effective(food) >= 0.8 * best;
  const band = eligible
    .filter(inBand)
    .sort((a, b) => Number(ctx.used.has(a.id)) - Number(ctx.used.has(b.id)));
  const rest = eligible.filter((food) => !inBand(food)).sort((a, b) => effective(b) - effective(a));
  return [...band, ...rest];
}

/** Resize every protein item that sits below its cap up as far as the
 *  cap and the layer's energy share allow. Returns true if any moved. */
function resizeProteinItems(meals: PlanMeal[], byId: ReadonlyMap<string, Food>): boolean {
  let moved = false;
  for (const meal of meals) {
    if (meal.meal === "snack") continue;
    meal.suggestions.forEach((s, idx) => {
      if (s.layer !== "protein") return;
      const food = byId.get(s.foodId);
      if (!food) return;
      const kind = proteinKindOf(food);
      if (kind === null) return;
      const cap = proteinCapG(food, kind);
      if (s.grams >= cap || food.per100g.kcal <= 0) return;
      const headroomKcal = PROTEIN_LAYER_MAX_MEAL_SHARE * meal.kcal - proteinLayerKcal(meal);
      if (headroomKcal <= 0) return;
      const maxGrams = s.grams + headroomKcal / (food.per100g.kcal / 100);
      const newGrams = Math.min(cap, floor5(maxGrams));
      if (newGrams >= s.grams + 5) {
        setPortion(meal, idx, food, newGrams);
        moved = true;
      }
    });
  }
  return moved;
}

/** Swap a meal's protein items for denser eligible sources when the
 *  swap honestly gains (≥2 g of protein after caps and the layer
 *  energy share). Items are tried weakest-first — the weakest is where
 *  the gain lives, but when its slot cannot take a denser food (the
 *  layer's energy share binds), the next item gets its chance. One
 *  swap per meal per call. */
function swapWeakestProteinItems(
  ctx: ComposeContext,
  meals: PlanMeal[],
  targetProteinG: number,
): boolean {
  let moved = false;
  for (const meal of meals) {
    if (meal.meal === "snack") continue;
    if (dayProteinOf(meals) >= targetProteinG) break;
    const proteinIdx = meal.suggestions
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => s.layer === "protein")
      .sort((a, b) => a.s.nutrients.proteinG - b.s.nutrients.proteinG);
    let swapped = false;
    for (const { s: item, i } of proteinIdx) {
      if (swapped) break;
      const deficit = targetProteinG - dayProteinOf(meals);
      for (const candidate of proteinCandidates(ctx, meal)) {
        const portion = layerPortion(
          meal,
          candidate,
          item.nutrients.proteinG + deficit,
          item.nutrients.kcal,
        );
        if (!portion) continue;
        if (portion.nutrients.proteinG - item.nutrients.proteinG < 2) continue;
        meal.suggestions[i] = recordSuggestion(ctx, candidate, portion, "protein");
        moved = true;
        swapped = true;
        break;
      }
    }
  }
  return moved;
}

/** Add a protein source to a meal that still has room — under the
 *  protein-item limit and the plate cap — when swaps and resizes were
 *  not enough. A garnish is not an add: the portion must carry ≥3 g. */
function addProteinItems(ctx: ComposeContext, meals: PlanMeal[], targetProteinG: number): boolean {
  let moved = false;
  for (const meal of meals) {
    if (meal.meal === "snack") continue;
    /* P5: a dish-composed meal's protein closing belongs to the
       top-up pass — this pass must not stock its plate with raw
       protein foods behind the dishes' back. */
    if (meal.dishes.length > 0) continue;
    if (dayProteinOf(meals) >= targetProteinG) break;
    const proteinItems = meal.suggestions.filter((s) => s.layer === "protein").length;
    if (proteinItems >= MAX_PROTEIN_ITEMS_PER_MEAL) continue;
    if (meal.suggestions.length >= MAX_MAIN_MEAL_ITEMS) continue;
    const deficit = targetProteinG - dayProteinOf(meals);
    for (const candidate of proteinCandidates(ctx, meal)) {
      const portion = layerPortion(meal, candidate, deficit, 0);
      if (!portion || portion.nutrients.proteinG < 3) continue;
      meal.suggestions.push(recordSuggestion(ctx, candidate, portion, "protein"));
      moved = true;
      break;
    }
  }
  return moved;
}

/**
 * Protein closing (P3): the P2 composer aims each meal at its protein
 * split but stops at four capped items, so a high-protein day landed
 * at 80–95% of its guide with nothing said. When the composed day
 * falls below 95% of the target, this pass works it toward the full
 * target — resizes first (the rotation's own foods, grown to their
 * caps), then swaps (the weakest item in a meal for a denser source),
 * then adds (a further source where the plate has room) — always
 * inside the portion caps and the protein layer's energy share. What
 * it cannot close, the plan's notes name with the true figure.
 */
function closeProteinGap(
  ctx: ComposeContext,
  meals: PlanMeal[],
  byId: ReadonlyMap<string, Food>,
  targetProteinG: number,
): void {
  if (dayProteinOf(meals) >= PROTEIN_CLOSE_FRACTION * targetProteinG) return;
  for (let round = 0; round < 8; round++) {
    if (dayProteinOf(meals) >= targetProteinG) break;
    let moved = resizeProteinItems(meals, byId);
    if (dayProteinOf(meals) >= targetProteinG) break;
    moved = swapWeakestProteinItems(ctx, meals, targetProteinG) || moved;
    if (dayProteinOf(meals) >= targetProteinG) break;
    moved = addProteinItems(ctx, meals, targetProteinG) || moved;
    if (!moved) break;
  }
}

/* --------------------------- energy reconciliation -------------------------- */

/**
 * Energy reconciliation (P3): the P2 composer stacked its layers and
 * floor-chasing extras and never reconciled — the owner's day landed
 * at 108–114% of its energy guide. After composition, a day over
 * +3% is trimmed back, in an order that costs the day the least of
 * what it values: finishing extras beyond the day's floors first
 * (within a food, the least protein per kcal goes first), then grain
 * bases (never below 60 g), then measured oils (never below 5 g). A
 * day under −3% is fed back up: oils to their cap, then nuts/seeds,
 * then dairy extras, then bases. Vegetables and protein items are
 * never trimmed, and a floor once met is never broken by trimming.
 */
function reconcileEnergy(
  meals: PlanMeal[],
  byId: ReadonlyMap<string, Food>,
  targets: NutritionTargets,
  dishById: ReadonlyMap<string, Dish> = new Map(),
): void {
  const kcal = dayKcalOf(meals);
  if (kcal > ENERGY_TRIM_TRIGGER * targets.kcal) trimEnergy(meals, byId, targets, dishById);
  else if (kcal < ENERGY_ADD_TRIGGER * targets.kcal) addEnergy(meals, byId, targets);
}

function trimEnergy(
  meals: PlanMeal[],
  byId: ReadonlyMap<string, Food>,
  targets: NutritionTargets,
  dishById: ReadonlyMap<string, Dish> = new Map(),
): void {
  let excess = dayKcalOf(meals) - ENERGY_TRIM_TRIGGER * targets.kcal;
  const kcalPerGram = (food: Food) => food.per100g.kcal / 100;
  const proteinPerKcal = (s: PlanSuggestion) =>
    s.nutrients.kcal > 0 ? s.nutrients.proteinG / s.nutrients.kcal : Infinity;

  /* A cut target: the meal plus the suggestion OBJECT. Cuts replace or
     remove suggestions, shifting indices — the object is re-located by
     identity at cut time, so a caller's ordering is never staled. */
  interface Ref {
    meal: PlanMeal;
    s: PlanSuggestion;
  }
  const refsWhere = (pred: (s: PlanSuggestion, food: Food) => boolean): Ref[] => {
    const refs: Ref[] = [];
    for (const meal of meals) {
      for (const s of meal.suggestions) {
        const food = byId.get(s.foodId);
        if (food && pred(s, food)) refs.push({ meal, s });
      }
    }
    return refs;
  };
  /* Cut one item by up to `maxCutG` grams (in 5 g steps toward the
     excess), keeping at least `minG`; an item the cut would take under
     `removeBelowG` is removed whole instead. Returns the kcal saved,
     measured on the stored (rounded) nutrients the plan displays. */
  const cut = (ref: Ref, maxCutG: number, minG: number, removeBelowG: number): number => {
    const idx = ref.meal.suggestions.indexOf(ref.s);
    if (idx < 0) return 0;
    const food = byId.get(ref.s.foodId);
    if (!food || kcalPerGram(food) <= 0) return 0;
    const wanted = Math.min(maxCutG, ceil5(excess / kcalPerGram(food)));
    if (wanted <= 0) return 0;
    const newGrams = ref.s.grams - wanted;
    if (newGrams < removeBelowG) {
      const saved = ref.s.nutrients.kcal;
      ref.meal.suggestions.splice(idx, 1);
      if (ref.meal.suggestions.length === 0 && ref.meal.dishes.length === 0) {
        ref.meal.note = EMPTY_MEAL_NOTE;
      }
      return saved;
    }
    const kept = Math.max(minG, newGrams);
    if (kept >= ref.s.grams) return 0;
    const before = ref.s.nutrients.kcal;
    setPortion(ref.meal, idx, food, kept);
    return before - ref.meal.suggestions[idx]!.nutrients.kcal;
  };
  const cutCategory = (
    refs: Ref[],
    maxCutOf: (s: PlanSuggestion) => number,
    minG: number,
    removeBelowG: number,
  ): void => {
    for (const ref of refs) {
      if (excess <= 0) return;
      excess -= cut(ref, maxCutOf(ref.s), minG, removeBelowG);
    }
  };
  const byProteinPerKcal = (a: Ref, b: Ref) => proteinPerKcal(a.s) - proteinPerKcal(b.s);
  const byKcalDesc = (a: Ref, b: Ref) => b.s.nutrients.kcal - a.s.nutrients.kcal;

  /* 1a. Nuts/seeds extras — no floor rides on them. An item cut under
     15 g is a garnish; it goes whole rather than shrinking to one. */
  cutCategory(
    refsWhere((s, food) => groupOf(food) === "nuts_seeds").sort(byKcalDesc),
    () => Infinity,
    15,
    15,
  );
  /* 1b. Fruit beyond the day's floor — only the surplus is cut (the
     cap is re-read per item, so the floor itself is never crossed),
     and a fruit portion is never trimmed below a real portion. */
  if (excess > 0 && floorTotalsOf(meals, byId, dishById).fruitG > FLOOR_FRUIT_G) {
    cutCategory(
      refsWhere((s, food) => groupOf(food) === "fruits").sort(byProteinPerKcal),
      () => floorTotalsOf(meals, byId, dishById).fruitG - FLOOR_FRUIT_G,
      50,
      0,
    );
  }
  /* 1c. Milk/curd beyond the day's floor — same discipline. */
  if (excess > 0 && floorTotalsOf(meals, byId, dishById).milkCurdG > FLOOR_MILK_CURD_G) {
    cutCategory(
      refsWhere((s, food) => isMilkOrCurd(food)).sort(byProteinPerKcal),
      () => floorTotalsOf(meals, byId, dishById).milkCurdG - FLOOR_MILK_CURD_G,
      50,
      0,
    );
  }
  /* 2. Grain bases, least protein per kcal first, never below 60 g. */
  if (excess > 0) {
    cutCategory(
      refsWhere((s) => s.layer === "base").sort(byProteinPerKcal),
      (s) => s.grams - 60,
      60,
      0,
    );
  }
  /* 3. Measured oils, never below 5 g. */
  if (excess > 0) {
    cutCategory(
      refsWhere((s, food) => groupOf(food) === "fats_oils").sort(byKcalDesc),
      (s) => s.grams - 5,
      5,
      0,
    );
  }
}

function addEnergy(
  meals: PlanMeal[],
  byId: ReadonlyMap<string, Food>,
  targets: NutritionTargets,
): void {
  const ceiling = (ENERGY_TRIM_TRIGGER - 0.01) * targets.kcal;
  const grow = (
    pred: (s: PlanSuggestion, food: Food) => boolean,
    capOf: (food: Food) => number,
  ) => {
    for (const meal of meals) {
      for (let idx = 0; idx < meal.suggestions.length; idx++) {
        if (dayKcalOf(meals) >= targets.kcal) return;
        const s = meal.suggestions[idx]!;
        const food = byId.get(s.foodId);
        if (!food || !pred(s, food) || food.per100g.kcal <= 0) continue;
        const headroom = capOf(food) - s.grams;
        if (headroom < 5) continue;
        const room = ceiling - dayKcalOf(meals);
        if (room <= 0) return;
        const add = Math.min(headroom, floor5(room / (food.per100g.kcal / 100)));
        if (add >= 5) setPortion(meal, idx, food, s.grams + add);
      }
    }
  };
  grow(
    (s, food) => groupOf(food) === "fats_oils",
    () => CAP_FAT_G,
  );
  grow(
    (s, food) => groupOf(food) === "nuts_seeds",
    () => CAP_NUTS_G,
  );
  grow(
    (s, food) => isMilkOrCurd(food),
    () => CAP_FINISHING_DAIRY_G,
  );
  grow(
    (s) => s.layer === "base",
    (food) => (groupOf(food) === "cereals_grains" ? CAP_GRAIN_DRY_G : CAP_UNCLASSIFIED_BASE_G),
  );
}

/**
 * The plan's composition notes: every day-level aim the suggestions
 * could not reach, named in plain words with the guideline it comes
 * from. Floors are ICMR-NIN My Plate amounts (held, not scaled — §1);
 * the diversity aims are the research's operationalisation (§7). A pool
 * that simply does not contain a group is a pool fact and is worded as
 * one — noted, never faked. Since P3 the notes also judge the day's
 * own targets: a protein total still under 95% of the guide after
 * closing, or an energy total outside ±5% after reconciliation, is
 * named with its true figure. Every number here is recomputed from
 * the final suggestions — the notes describe the plan as it stands,
 * never as it was first composed.
 */
function compositionNotes(
  meals: readonly PlanMeal[],
  pool: readonly Food[],
  targets: NutritionTargets,
  dishById: ReadonlyMap<string, Dish> = new Map(),
): string[] {
  const notes: string[] = [];
  const byId = new Map(pool.map((f) => [f.id, f]));
  const totals = floorTotalsOf(meals, byId, dishById);
  if (totals.vegG < FLOOR_VEGETABLES_G) {
    notes.push(
      `Today's suggestions reach ${totals.vegG} g of vegetables — the ICMR-NIN guideline aims for at least 400 g across the day.`,
    );
  }
  if (totals.fruitG < FLOOR_FRUIT_G) {
    notes.push(
      `Today's suggestions reach ${totals.fruitG} g of fruit — the ICMR-NIN guideline aims for at least 100 g across the day.`,
    );
  }
  if (totals.milkCurdG < FLOOR_MILK_CURD_G) {
    notes.push(
      `Today's suggestions reach ${totals.milkCurdG} g of milk and curd — the ICMR-NIN guideline aims for at least 300 ml across the day.`,
    );
  }
  const proteinSources = new Set<string>();
  const poolGroups = new Set<FoodGroup>();
  for (const meal of meals) {
    for (const s of meal.suggestions) {
      /* Protein-layer items count by role; top-ups and snack items
         count when they carry real protein (≥5 g). */
      if (s.layer === "protein") proteinSources.add(s.foodId);
      else if (s.nutrients.proteinG >= 5) proteinSources.add(s.foodId);
    }
    /* P5: a plan dish carrying real protein is a protein source, and
       its ingredient lines speak for their food groups — a dish-based
       day is judged by the same diversity aims as a food-based one. */
    for (const planDish of meal.dishes) {
      if (planDish.nutrients.proteinG >= 5) proteinSources.add(`dish:${planDish.dishId}`);
    }
  }
  for (const food of pool) {
    if (food.classification) poolGroups.add(food.classification.group);
  }
  const suggestedGroups = new Set<FoodGroup>();
  for (const meal of meals) {
    for (const s of meal.suggestions) {
      const group = byId.get(s.foodId)?.classification?.group;
      if (group) suggestedGroups.add(group);
    }
    for (const planDish of meal.dishes) {
      const dish = dishById.get(planDish.dishId);
      if (!dish) continue;
      for (const line of dish.lines) {
        const group = byId.get(line.foodId)?.classification?.group;
        if (group) suggestedGroups.add(group);
      }
    }
  }
  if (proteinSources.size < AIM_DISTINCT_PROTEIN_SOURCES) {
    notes.push(
      `Today's protein comes from ${proteinSources.size} source${proteinSources.size === 1 ? "" : "s"} — three or more across the day is the aim, for variety.`,
    );
  }
  if (suggestedGroups.size < AIM_FOOD_GROUPS) {
    notes.push(
      poolGroups.size < AIM_FOOD_GROUPS
        ? `The foods Bloom can plan with today span ${poolGroups.size} food groups — the ICMR-NIN guideline aims for foods from at least 8 groups a day.`
        : `Today's suggestions span ${suggestedGroups.size} food groups — the ICMR-NIN guideline aims for foods from at least 8 groups a day.`,
    );
  }
  const protein = dayProteinOf(meals);
  if (protein < PROTEIN_CLOSE_FRACTION * targets.proteinG) {
    notes.push(
      `Today's suggestions reach about ${Math.round(protein)} g of your ${Math.round(targets.proteinG)} g protein guide — the portion caps bind before the target does.`,
    );
  }
  const kcal = dayKcalOf(meals);
  if (kcal > (1 + ENERGY_NOTE_BAND) * targets.kcal) {
    notes.push(
      `Today's suggestions reach about ${Math.round(kcal)} kcal — above your ${Math.round(targets.kcal)} kcal guide. The day's guideline floors and layers add up past it.`,
    );
  } else if (kcal < (1 - ENERGY_NOTE_BAND) * targets.kcal) {
    notes.push(
      `Today's suggestions reach about ${Math.round(kcal)} kcal — below your ${Math.round(targets.kcal)} kcal guide. The portion caps bind before the target does.`,
    );
  }
  return notes;
}

/* ------------------------- P5 dish-first composition ----------------------- */

interface DishCandidate {
  dish: Dish;
  /** Per-serving nutrients, computed — the only way they exist. */
  nutrients: Nutrients;
}

interface DishPoolData {
  candidates: DishCandidate[];
  byId: Map<string, Dish>;
}

/**
 * The dishes a plan may serve this person, judged by the plan's own
 * gates — the qualification the plan's dish idea has always used,
 * tightened where a plan (followed daily) must be stricter than an
 * idea (an occasional alternative):
 *  · the dish suits the person's dietary pattern — `dishPatterns`,
 *    every ingredient line judged by its classification;
 *  · every ingredient line sits in the eligible pool for the reference
 *    set — the provenance gate, the pattern judgement and the person's
 *    own allergy / intolerance / dislike name-matching, applied to the
 *    dish's line foods exactly as the plan applies them to foods;
 *  · the budget tier the person stated in the Assessment (and only
 *    there) is a HARD cap — the dish idea treats it as a preference,
 *    but a plan is followed, so it holds.
 * A dish Bloom cannot price — a line naming a food outside the
 * reference set — is skipped, never guessed at.
 */
function dishPoolFor(profile: HealthProfile, dishes: readonly Dish[]): DishPoolData | null {
  const pattern = planPatternOf(profile.dietary.pattern);
  const eligible = new Set(eligiblePool(profile, USDA_REFERENCE_FOODS).map((f) => f.id));
  const budgetTier = profile.dietary.budgetTier;
  const candidates: DishCandidate[] = [];
  const byId = new Map<string, Dish>();
  for (const dish of dishes) {
    if (budgetTier !== null && dish.budgetTier > budgetTier) continue;
    if (!dish.lines.every((line) => eligible.has(line.foodId))) continue;
    try {
      if (pattern !== null && !dishPatterns(dish).includes(pattern)) continue;
      candidates.push({ dish, nutrients: dishNutrients(dish).nutrients });
      byId.set(dish.id, dish);
    } catch {
      /* An unresolvable line — the dish is not planned with. */
      continue;
    }
  }
  return candidates.length > 0 ? { candidates, byId } : null;
}

/** The day's rotation order over dish candidates: FNV-1a over
 *  `day:dish:id` — the dish idea's discipline (D4), so the same day
 *  always orders the pool the same way and consecutive days differ. */
function orderDishesForDay(candidates: readonly DishCandidate[], day: string): DishCandidate[] {
  return candidates
    .map((c) => ({ c, key: fnv1a(`${day}:dish:${c.dish.id}`) }))
    .sort((a, b) => a.key - b.key || (a.c.dish.id < b.c.dish.id ? -1 : 1))
    .map((entry) => entry.c);
}

/** The anchor protein aims: a main meal's centrepiece carries at
 *  least ~25 g of protein where the pool offers one (the dish waves'
 *  own bar); breakfast, a lighter meal, aims at ~20 g. */
const ANCHOR_AIM_MAIN_G = 25;
const ANCHOR_AIM_BREAKFAST_G = 20;

/**
 * The anchor band for a slot: the dishes at or above the slot's
 * protein aim when the pool offers any; otherwise the pool's top band
 * (≥70% of its best) — the density-band discipline the P3 protein
 * closing uses, so a thin pool still anchors on its strongest dish
 * rather than a random one.
 */
function anchorBand(cands: readonly DishCandidate[], aim: number): DishCandidate[] {
  if (cands.length === 0) return [];
  const best = cands.reduce((max, c) => Math.max(max, c.nutrients.proteinG), 0);
  const threshold = best >= aim ? Math.max(aim, 0.7 * best) : 0.7 * best;
  return cands.filter((c) => c.nutrients.proteinG >= threshold);
}

/** The slot's candidates in pick order: for breakfast, the breakfast
 *  category leads and mains are the overflow; lunch and dinner draw
 *  on mains alone. */
function anchorCandidates(
  ordered: readonly DishCandidate[],
  meal: Meal,
  used: ReadonlySet<string>,
): DishCandidate[] {
  const free = ordered.filter((c) => !used.has(c.dish.id));
  if (meal === "breakfast") {
    const breakfast = free.filter((c) => c.dish.category === "breakfast");
    const mains = free.filter((c) => c.dish.category === "main");
    return [...breakfast, ...mains];
  }
  return free.filter((c) => c.dish.category === "main");
}

function prevDayKey(day: string): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Within the anchor band, dishes carrying at least this much protein
 *  per 100 kcal are preferred (a derivation): at a high-protein guide
 *  the day's energy budget is the binding constraint, and a band pick
 *  at 4 g/100 kcal spends it twice as fast as one at 8. The band's
 *  protein aim is never traded away — density only orders the band. */
const ANCHOR_DENSITY_AIM = 6;

/** The P7 dish bias: which dishes the learning pass has an opinion
 *  about. Groups, in the order they lead: dishes the person logs
 *  repeatedly; dishes rich in a micronutrient the logged week runs
 *  short of; everything else; dishes a completed plan served that
 *  the log never took up. A dish in several groups takes its best
 *  group — a micro-rich dish is never pushed back for going
 *  unlogged, and a favourite is never demoted. */
interface DishBias {
  favoured: ReadonlySet<string>;
  microRich: ReadonlySet<string>;
  deprioritised: ReadonlySet<string>;
}

function dishBiasGroup(bias: DishBias | undefined, dishId: string): number {
  if (!bias) return 2;
  if (bias.favoured.has(dishId)) return 0;
  if (bias.microRich.has(dishId)) return 1;
  if (bias.deprioritised.has(dishId)) return 3;
  return 2;
}

/** Stable partition by bias group: within a group the incoming order
 *  (rotation, band, density) is preserved exactly, so with no bias —
 *  or a bias that names none of the list — this is the identity: the
 *  pre-P7 order, untouched. */
function orderByDishBias(list: readonly DishCandidate[], bias?: DishBias): DishCandidate[] {
  if (!bias) return [...list];
  return [...list].sort((a, b) => dishBiasGroup(bias, a.dish.id) - dishBiasGroup(bias, b.dish.id));
}

/** The ordered preference list for a slot's anchor: the protein band,
 *  density-preferred inside it, in the day's rotation order. Shared by
 *  the composer and the pure pick so the two can never drift.
 *  Protein-first (P6, the log-adaptive bias): the same list, ordered
 *  by protein density — the band and its protein aim are never traded
 *  away; density only orders, now strictly, and the sort is stable so
 *  equal densities keep the day's rotation order. The P7 dish bias
 *  partitions the result last (see orderByDishBias), on both the
 *  composer's and the pure pick's path, so the two stay in step. */
function anchorPickList(
  cands: readonly DishCandidate[],
  aim: number,
  proteinFirst = false,
  bias?: DishBias,
): DishCandidate[] {
  const band = anchorBand(cands, aim);
  const pool = band.length > 0 ? band : [...cands];
  const dense = pool.filter(
    (c) =>
      c.nutrients.kcal > 0 && (c.nutrients.proteinG / c.nutrients.kcal) * 100 >= ANCHOR_DENSITY_AIM,
  );
  const list = dense.length > 0 ? dense : pool;
  if (!proteinFirst) return orderByDishBias(list, bias);
  const density = (c: DishCandidate) =>
    c.nutrients.kcal > 0 ? c.nutrients.proteinG / c.nutrients.kcal : 0;
  return orderByDishBias(
    [...list].sort((a, b) => density(b) - density(a)),
    bias,
  );
}

/**
 * The anchor a slot would get on a given day with nothing else known
 * — the pure pick. Today's composer sits yesterday's pure pick out
 * (when the band offers an alternative), so an anchor never repeats
 * on consecutive days by construction, not by luck. The simulation
 * runs under the same protein-first bias as today's composition, so
 * the sit-out names the anchor yesterday's biased composer would
 * actually have served.
 */
function pureAnchorId(
  data: DishPoolData,
  day: string,
  meal: Meal,
  proteinFirst = false,
  bias?: DishBias,
): string | null {
  const aim = meal === "breakfast" ? ANCHOR_AIM_BREAKFAST_G : ANCHOR_AIM_MAIN_G;
  const cands = anchorCandidates(orderDishesForDay(data.candidates, day), meal, new Set());
  return anchorPickList(cands, aim, proteinFirst, bias)[0]?.dish.id ?? null;
}

function toPlanDish(candidate: DishCandidate, role: PlanDishRole): PlanDish {
  return {
    dishId: candidate.dish.id,
    name: candidate.dish.name.en,
    hindi: candidate.dish.name.hindi,
    role,
    servings: 1,
    nutrients: candidate.nutrients,
    provenance: dishProvenance(candidate.dish),
  };
}

/** Scale a per-serving nutrient panel by a serving count — every field
 *  the source published, absence preserved (absent is not zero). */
function scaleNutrientPanel(perServing: Nutrients, servings: number): Nutrients {
  if (servings === 1) return perServing;
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(perServing)) {
    if (typeof value === "number") out[key] = Math.round(value * servings * 10) / 10;
  }
  return out as unknown as Nutrients;
}

/**
 * The dish-swap seam (Vitalis's swap_dish tool, 2026-11-17): the same
 * plan with ONE dish in ONE meal replaced by another library dish —
 * the replacement the person confirmed on Vitalis's card. The new
 * PlanDish is built exactly as the composer builds one (computed
 * `dishNutrients`, recipe provenance, the old dish's role and
 * servings); targets, meal shares, inputs and the plan's fingerprint
 * are untouched — a swap changes what is on the plate, never what the
 * day aims for. Null when the meal or the from-dish is not in the
 * plan, or the replacement is already in that meal.
 */
export function planWithDishSwapped(
  plan: DailyPlan,
  meal: Meal,
  fromDishId: string,
  dish: Dish,
): DailyPlan | null {
  const mealIndex = plan.meals.findIndex((m) => m.meal === meal);
  if (mealIndex < 0) return null;
  const target = plan.meals[mealIndex]!;
  const dishIndex = target.dishes.findIndex((d) => d.dishId === fromDishId);
  if (dishIndex < 0) return null;
  if (target.dishes.some((d) => d.dishId === dish.id)) return null;
  const old = target.dishes[dishIndex]!;
  const replacement: PlanDish = {
    dishId: dish.id,
    name: dish.name.en,
    hindi: dish.name.hindi,
    role: old.role,
    servings: old.servings,
    nutrients: scaleNutrientPanel(dishNutrients(dish).nutrients, old.servings),
    provenance: dishProvenance(dish),
  };
  const dishes = target.dishes.map((d, i) => (i === dishIndex ? replacement : d));
  const meals = plan.meals.map((m, i) => (i === mealIndex ? { ...m, dishes } : m));
  return { ...plan, meals };
}

/** A main meal's energy-share thresholds for joining dishes —
 *  derivations, in the P2 spirit: the anchor alone carries a meal
 *  whose share it nearly meets; below ~75% of the share a base joins,
 *  and below ~85% a side joins. A plate is anchor + base + side at
 *  most — three dishes, never a buffet. */
const DISH_BASE_JOIN_SHARE = 0.75;
const DISH_SIDE_JOIN_SHARE = 0.85;
const BASE_CATEGORIES: readonly DishCategory[] = ["rice", "bread"];
const SIDE_CATEGORIES: readonly DishCategory[] = ["side", "raita", "chutney"];

/**
 * Compose one main meal from dishes: the protein anchor first, then
 * a rice/bread base and a side where the meal's energy share calls
 * for them. Null when no suitable anchor exists for the slot — the
 * caller falls back to the layered food composition for that meal,
 * so a slot the dish pool cannot fill is composed, never empty.
 */
function composeDishMeal(
  data: DishPoolData,
  ordered: readonly DishCandidate[],
  used: Set<string>,
  day: string,
  split: MealSplit,
  proteinFirst = false,
  bias?: DishBias,
): PlanDish[] | null {
  const aim = split.meal === "breakfast" ? ANCHOR_AIM_BREAKFAST_G : ANCHOR_AIM_MAIN_G;
  const cands = anchorCandidates(ordered, split.meal, used);
  let pickList = anchorPickList(cands, aim, proteinFirst, bias);
  /* Yesterday's anchor sits this slot out when an alternative exists. */
  const yesterday = pureAnchorId(data, prevDayKey(day), split.meal, proteinFirst, bias);
  if (yesterday !== null && pickList.length > 1) {
    const without = pickList.filter((c) => c.dish.id !== yesterday);
    if (without.length > 0) pickList = without;
  }
  const anchor = pickList[0];
  if (!anchor) return null;
  const dishes: PlanDish[] = [toPlanDish(anchor, "anchor")];
  used.add(anchor.dish.id);
  let kcal = anchor.nutrients.kcal;
  if (kcal < DISH_BASE_JOIN_SHARE * split.kcal) {
    /* Bases join in the meal's own idiom — breads lead at breakfast,
       rice at lunch and dinner — and a protein-carrying base (≥10 g)
       is preferred where the pool offers one: the base is a third of
       the plate, and its protein is not free. */
    const bases = ordered.filter(
      (c) => BASE_CATEGORIES.includes(c.dish.category) && !used.has(c.dish.id),
    );
    const lead: DishCategory = split.meal === "breakfast" ? "bread" : "rice";
    const base =
      bases.find((c) => c.dish.category === lead && c.nutrients.proteinG >= 10) ??
      bases.find((c) => c.nutrients.proteinG >= 10) ??
      bases.find((c) => c.dish.category === lead) ??
      bases[0];
    if (base) {
      dishes.push(toPlanDish(base, "base"));
      used.add(base.dish.id);
      kcal += base.nutrients.kcal;
    }
  }
  if (kcal < DISH_SIDE_JOIN_SHARE * split.kcal) {
    /* A protein-carrying side (≥8 g — a soya or paneer side, not a
       chutney) is preferred where the pool offers one. */
    const sides = ordered.filter(
      (c) => SIDE_CATEGORIES.includes(c.dish.category) && !used.has(c.dish.id),
    );
    const side = sides.find((c) => c.nutrients.proteinG >= 8) ?? sides[0];
    if (side) {
      dishes.push(toPlanDish(side, "side"));
      used.add(side.dish.id);
      kcal += side.nutrients.kcal;
    }
  }
  return dishes;
}

/* ------------------------------ P5 top-ups -------------------------------- */

/** At most this many top-up foods join one meal — they complete a
 *  day; they never become the meal. */
const MAX_TOPUPS_PER_MEAL = 3;

/**
 * Add one top-up food to a meal, sized toward the aim inside the
 * food's own portion cap — the composer's caps bind top-ups exactly
 * as they bind composition — and inside the day's remaining energy
 * room: a top-up that would push the day past its guide is sized
 * down to the room or not added at all. Protein mode draws on the
 * protein-bearing dairy and egg foods, ranked by protein density
 * (the P3 band idiom: within 80% of the best density, the day's
 * rotation decides; beyond the band, density decides) — at a
 * high-protein guide, protein bought at 17 g/100 kcal and protein
 * bought at 8 are different purchases. Energy mode draws on
 * milk/curd and nuts/seeds. Unused-today first, the whole egg ahead
 * of its parts. Returns false when nothing honest can be added.
 */
function addOneTopUp(
  ctx: ComposeContext,
  meal: PlanMeal,
  aim: { kcal?: number; proteinG?: number },
  roomKcal: number,
): boolean {
  if (roomKcal < 25) return false;
  const inMeal = new Set(meal.suggestions.map((s) => s.foodId));
  const proteinMode = aim.proteinG !== undefined;
  const eligible = ctx.ordered.filter((food) => {
    if (inMeal.has(food.id)) return false;
    const group = groupOf(food);
    if (proteinMode) {
      /* Egg parts are excluded outright: a top-up is a food a person
         eats (a yogurt, an egg), never a separated component — the
         P3 parts principle, held at the top-up layer too. */
      return (
        (group === "dairy" || group === "eggs") && proteinKindOf(food) !== null && !isEggPart(food)
      );
    }
    return isMilkOrCurd(food) || group === "nuts_seeds";
  });
  const density = (food: Food): number =>
    food.per100g.kcal > 0 ? food.per100g.proteinG / food.per100g.kcal : 0;
  const bestDensity = eligible.reduce((max, f) => Math.max(max, density(f)), 0);
  const candidates = eligible.sort((a, b) => {
    if (proteinMode) {
      /* Protein-first (P6): density decides outright, not just beyond
         the band — after a shortfall log, the densest protein the
         caps allow is the honest purchase. The used/egg-part order
         below still breaks the ties. */
      if (ctx.proteinFirst && density(a) !== density(b)) return density(b) - density(a);
      const bandA = density(a) >= 0.8 * bestDensity ? 0 : 1;
      const bandB = density(b) >= 0.8 * bestDensity ? 0 : 1;
      if (bandA !== bandB) return bandA - bandB;
      if (bandA === 1 && density(a) !== density(b)) return density(b) - density(a);
    }
    return (
      Number(ctx.used.has(a.id)) - Number(ctx.used.has(b.id)) ||
      Number(isEggPart(a)) - Number(isEggPart(b))
    );
  });
  for (const food of candidates) {
    let portion: SizedPortion | null;
    if (proteinMode) {
      const kind = proteinKindOf(food)!;
      portion = sizedPortion(food, aim, proteinCapG(food, kind));
      if (portion && portion.nutrients.kcal > roomKcal) {
        portion = sizedPortion(food, { kcal: roomKcal }, proteinCapG(food, kind));
      }
      if (portion && portion.nutrients.proteinG < 3) continue;
    } else {
      const cap = isMilkOrCurd(food) ? CAP_FINISHING_DAIRY_G : CAP_NUTS_G;
      portion = sizedPortion(food, { kcal: Math.min(aim.kcal ?? 0, roomKcal) }, cap);
      if (portion && portion.nutrients.kcal < 40) continue;
    }
    if (!portion) continue;
    meal.suggestions.push(recordSuggestion(ctx, food, portion, "topup"));
    return true;
  }
  return false;
}

/**
 * The top-up pass (P5): when dishes alone leave the day short, a few
 * simple foods close the gap — protein first (toward the full guide,
 * meal by meal from the largest split deficit), then energy (toward
 * the reconciliation trigger, after which `reconcileEnergy` fine-tunes
 * as it always has). Top-ups are sized inside the same portion caps
 * as composed foods, and what they cannot close, the day's notes name
 * with its true figure — the P3 honesty, unchanged.
 */
function addTopUps(
  ctx: ComposeContext,
  meals: PlanMeal[],
  targets: NutritionTargets,
  skipEnergyTopUps = false,
): void {
  const mains = meals.filter((m) => m.meal !== "snack");
  const topUpCount = (m: PlanMeal) => m.suggestions.filter((s) => s.layer === "topup").length;
  const byDeficit = (key: (m: PlanMeal) => number) =>
    mains.filter((m) => topUpCount(m) < MAX_TOPUPS_PER_MEAL).sort((a, b) => key(b) - key(a));

  /* Protein top-ups may spend the day up to its note band (+5%) —
     the same tolerance the day's energy is judged at — and no
     further: protein bought past the guide is not closing, it is
     overshooting, and the shortfall note exists for what the room
     cannot buy. */
  for (let round = 0; round < 12 && dayProteinOf(meals) < targets.proteinG; round++) {
    const room = (1 + ENERGY_NOTE_BAND) * targets.kcal - dayKcalOf(meals);
    if (room < 25) break;
    const gap = targets.proteinG - dayProteinOf(meals);
    const ordered = byDeficit(
      (m) =>
        m.proteinG -
        (m.suggestions.reduce((a, s) => a + s.nutrients.proteinG, 0) +
          m.dishes.reduce((a, d) => a + d.nutrients.proteinG, 0)),
    );
    let added = false;
    for (const meal of ordered) {
      if (addOneTopUp(ctx, meal, { proteinG: gap }, room)) {
        added = true;
        break;
      }
    }
    if (!added) break;
  }

  /* The energy round is skipped whole on an energy-overshoot log
     (P6): the person's logged days already run over the guide, so the
     plan does not spend top-ups pushing a dish day up toward it —
     reconciliation still fine-tunes what the dishes themselves left,
     and the day's notes judge the result honestly either way. */
  for (
    let round = 0;
    round < 12 && !skipEnergyTopUps && dayKcalOf(meals) < ENERGY_ADD_TRIGGER * targets.kcal;
    round++
  ) {
    const room = targets.kcal - dayKcalOf(meals);
    if (room < 25) break;
    const ordered = byDeficit(
      (m) =>
        m.kcal -
        (m.suggestions.reduce((a, s) => a + s.nutrients.kcal, 0) +
          m.dishes.reduce((a, d) => a + d.nutrients.kcal, 0)),
    );
    let added = false;
    for (const meal of ordered) {
      if (addOneTopUp(ctx, meal, { kcal: Math.min(room, meal.kcal) }, room)) {
        added = true;
        break;
      }
    }
    if (!added) break;
  }
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
  /** The dish library (P5): when supplied, main meals are composed
   *  dish-first and foods serve as top-ups and the per-slot fallback.
   *  Absent or empty, composition is the layered food composition
   *  alone — the behaviour every plan before P5 was built with. */
  dishes?: readonly Dish[];
  /** The person's food log (P6): when supplied, the recent logged
   *  days bias composition (see planAdaptation) — protein-first
   *  selection after a protein-shortfall log, no energy top-ups
   *  after an energy-overshoot log. Targets are never touched.
   *  Absent, or too little logged, composition is exactly P5's. */
  recentLog?: readonly LogEntry[];
  /** The currently stored plan (P7): the learning pass judges it for
   *  dishes it served on a completed day that the log never took up,
   *  and for the portions it serves, against the portions actually
   *  logged. Absent, those two signals simply do not speak. */
  storedPlan?: DailyPlan | null;
  /** A user-confirmed target adjustment in kcal (P7, see
   *  targetAdjustment.ts): applied to the resolved energy target
   *  AFTER the engine and the fallback have spoken, before the
   *  inputs snapshot — so the plan's targets stay reproducible from
   *  stored inputs, and confirming or clearing one makes an existing
   *  plan stale by name ("your targets"). Protein is never adjusted.
   *  Out-of-range results are refused, never clamped silently. */
  targetAdjustmentKcal?: number;
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
  const ordered = [
    "goal",
    "ageYears",
    "height",
    "weight",
    "activity",
    "safetyAnswers",
    "body",
  ].filter((key) => wanted.has(key));
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
    if (
      !targets &&
      extra.length === 0 &&
      missingBodyFields(profile).length === 0 &&
      profile.goal !== null
    ) {
      extra.push("body");
    }
    return {
      ok: false,
      refusal: { kind: "insufficient_data", missing: missingNames(profile, extra) },
    };
  }

  /* P7: a user-confirmed expenditure adjustment shifts the resolved
     energy target by exactly the stored delta — the engine's goal
     delta is preserved because the delta was derived against the
     engine's own maintenance estimate (see expenditure.ts). The
     shared apply rule (targetAdjustment.ts) refuses results outside
     the sane band; a refused adjustment leaves the engine's targets
     standing rather than clamping to a number nobody confirmed. */
  if (input.targetAdjustmentKcal) {
    targets = adjustedTargets(targets, input.targetAdjustmentKcal) ?? targets;
  }

  const goal = profile.goal;
  const snapshot = planInputsSnapshotOf(profile, safety, targets);
  const splits = splitTargets(targets, mealSlotsFor(profile.dietary.mealsPerDay));
  const pool = eligiblePool(profile, input.foods);

  /* P6+P7: the log-adaptive bias. The recent logged days are judged
     against the targets just resolved — the targets themselves are
     never moved by what the log shows; only selection is biased,
     and only when the log actually speaks. P7 widens what the log
     can teach: which dishes the person returns to, which served
     dish they never took up, and which micronutrients the logged
     week runs short of (see planAdaptation's learning pass). */
  const learning: PlanLearning | null = input.recentLog
    ? planLearningFor(input.recentLog, input.day, targets, {
        storedPlan: input.storedPlan ?? null,
        sex: profile.sex === "unspecified" ? null : profile.sex,
      })
    : null;
  const adaptation = learning?.adaptation ?? null;

  /* Compose the day (P2): the pool in the day's rotation order, layered
     per meal over shared day state — foods already suggested are
     deprioritised (variety), and the floor totals accumulate so later
     meals can react. The vegetable aim spreads the 400 g ICMR floor
     across the main meals, held inside the per-meal caps. */
  const ctx: ComposeContext = {
    ordered: rotationOrder(input.day, pool),
    pattern: planPatternOf(profile.dietary.pattern),
    used: new Set<string>(),
    vegG: 0,
    fruitG: 0,
    milkCurdG: 0,
    proteinFirst: adaptation?.proteinShortfall ?? false,
  };
  const mainCount = splits.filter((s) => s.meal !== "snack").length;
  const hasSnack = splits.some((s) => s.meal === "snack");
  const vegTargetG = mainCount > 0 ? Math.min(240, Math.max(130, Math.round(420 / mainCount))) : 0;
  /* P5: the dish pool, judged once against the person's own gates.
     When it can fill a main meal's anchor slot the meal is composed
     of dishes; where it cannot, the layered food composition fills
     that meal — the two never mix within a meal's main structure. */
  const dishData =
    input.dishes && input.dishes.length > 0 ? dishPoolFor(profile, input.dishes) : null;
  /* P7: the dish bias. Micro-richness is judged here, where the
     candidates' computed panels exist: a dish is rich in a gap
     nutrient when one serving carries at least MICRO_RICH_SHARE of
     that nutrient's reference. The bias partitions the day's
     rotation order (favourites and micro-rich dishes forward,
     served-but-unlogged dishes back) and rides into the anchor
     pick, so bases, sides and anchors all hear it. With nothing
     learned, there is no bias and the order is P6's exactly. */
  const microRich = new Set<string>();
  if (learning && dishData) {
    for (const gap of learning.microGaps) {
      for (const c of dishData.candidates) {
        const value = c.nutrients[gap.key];
        if (value !== undefined && value >= MICRO_RICH_SHARE * gap.reference) {
          microRich.add(c.dish.id);
        }
      }
    }
  }
  const dishBias: DishBias | undefined =
    learning &&
    (learning.favouredDishes.length > 0 ||
      learning.deprioritisedDishes.length > 0 ||
      microRich.size > 0)
      ? {
          favoured: new Set(learning.favouredDishes.map((d) => d.dishId)),
          microRich,
          deprioritised: new Set(learning.deprioritisedDishes.map((d) => d.dishId)),
        }
      : undefined;
  const dishOrdered = dishData
    ? orderByDishBias(orderDishesForDay(dishData.candidates, input.day), dishBias)
    : [];
  const usedDishIds = new Set<string>();
  const meals: PlanMeal[] = splits.map((split) => {
    if (split.meal === "snack") {
      const suggestions = composeSnack(ctx, split);
      return {
        meal: split.meal,
        kcal: split.kcal,
        proteinG: split.proteinG,
        dishes: [],
        suggestions,
        note: suggestions.length === 0 ? EMPTY_MEAL_NOTE : null,
      };
    }
    if (dishData) {
      const dishes = composeDishMeal(
        dishData,
        dishOrdered,
        usedDishIds,
        input.day,
        split,
        adaptation?.proteinShortfall ?? false,
        dishBias,
      );
      if (dishes) {
        return {
          meal: split.meal,
          kcal: split.kcal,
          proteinG: split.proteinG,
          dishes,
          suggestions: [],
          note: null,
        };
      }
    }
    const { suggestions, missingLayers } = composeMainMeal(ctx, split, {
      vegTargetG,
      fruitAtBreakfast: !hasSnack,
      isBreakfast: split.meal === "breakfast",
    });
    return {
      meal: split.meal,
      kcal: split.kcal,
      proteinG: split.proteinG,
      dishes: [],
      suggestions,
      note:
        suggestions.length === 0
          ? EMPTY_MEAL_NOTE
          : missingLayers.length > 0
            ? `Part of this meal is missing: ${missingLayers.join(", ")} — no food with known values fits yet. Add a food you eat, then regenerate the plan.`
            : null,
    };
  });
  const byId = new Map(pool.map((f) => [f.id, f]));
  const dishById = dishData?.byId ?? new Map<string, Dish>();
  /* P3 maturity: cap the plate, close the protein gap toward the
     target, reconcile the day's energy back to its guide, then hold
     the dominance line — in that order, so each pass judges the plan
     the previous one left, and the notes judge them all. P5 inserts
     its top-up pass between the protein closing and the energy
     reconciliation: the closing works the food-composed meals, the
     top-ups complete the dish-composed day, and reconciliation then
     fine-tunes the whole. */
  applyItemCap(meals, byId, dishById);
  closeProteinGap(ctx, meals, byId, targets.proteinG);
  if (meals.some((m) => m.dishes.length > 0)) {
    addTopUps(ctx, meals, targets, adaptation?.energyOvershoot ?? false);
  }
  reconcileEnergy(meals, byId, targets, dishById);
  applyProteinDominanceCap(meals, byId, targets.proteinG);
  /* The adaptation's explanations lead the notes: they say why this
     plan leans the way it does, before the notes judge the result.
     The P7 learning notes follow the P6 ones — what the log taught,
     in the order it was learned. */
  const notes = [
    ...(adaptation?.notes ?? []),
    ...(learning?.notes ?? []),
    ...compositionNotes(meals, pool, targets, dishById),
  ];

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
      notes,
      methodVersion: PLAN_METHOD_VERSION,
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
const SUGGESTION_LAYERS: readonly SuggestionLayer[] = [
  "base",
  "protein",
  "vegetables",
  "finishing",
  "snack",
  "topup",
];
const PLAN_DISH_ROLES: readonly PlanDishRole[] = ["anchor", "base", "side"];
const ACTIVITIES: readonly ActivityLevel[] = [
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
];
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
  const dietaryPattern =
    raw["dietaryPattern"] === null ? null : oneOf(raw["dietaryPattern"], PATTERNS);
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
  if (!provenance || (provenance.kind !== "usda" && provenance.kind !== "user_entered"))
    return null;
  const suggestion: PlanSuggestion = { foodId, name, grams, nutrients, provenance };
  /* The composition layer (P2): absent on P1 plans, which suggested
     without layers; present-but-invalid is a tamper and drops the
     suggestion, like any other malformed field. */
  if ("layer" in raw) {
    const layer = oneOf(raw["layer"], SUGGESTION_LAYERS);
    if (!layer) return null;
    suggestion.layer = layer;
  }
  return suggestion;
}

/** A stored plan dish (P5): absent on plans stored before P5, read as
 *  an empty list. The provenance must be the recipe provenance the
 *  generator itself writes, naming the dish it prices — anything else
 *  is a tamper and drops the dish, like any other malformed field. */
function parsePlanDish(raw: unknown): PlanDish | null {
  if (!isRecord(raw)) return null;
  const dishId = text(raw["dishId"], 80);
  const name = text(raw["name"], 120);
  if (!dishId || !name) return null;
  const hindi = text(raw["hindi"], 120);
  const role = oneOf(raw["role"], PLAN_DISH_ROLES);
  if (!role) return null;
  const servings = numIn(raw["servings"], 0.25, 10);
  if (servings === null) return null;
  const nutrients = parseEntryNutrients(raw["nutrients"]);
  if (!nutrients) return null;
  const provenance = parseFoodProvenance(raw["provenance"]);
  if (!provenance || provenance.kind !== "recipe" || provenance.sourceId !== dishId) return null;
  return { dishId, name, hindi, role, servings, nutrients, provenance };
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
  /* Composition notes (P2): absent on P1 plans, read as empty. */
  const notes: string[] = [];
  if (Array.isArray(raw["notes"])) {
    for (const item of raw["notes"].slice(0, 8)) {
      const line = text(item, 300);
      if (line) notes.push(line);
    }
  }
  /* The composition method (P2): absent on P1 plans, which are method 1
     by definition; present-but-invalid is a tamper and refuses the plan. */
  let methodVersion = 1;
  if ("methodVersion" in raw) {
    const parsed = numIn(raw["methodVersion"], 1, 999);
    if (parsed === null || Math.round(parsed) !== parsed) return null;
    methodVersion = parsed;
  }
  if (
    !Array.isArray(raw["meals"]) ||
    raw["meals"].length < 1 ||
    raw["meals"].length > MEALS.length
  ) {
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
      for (const s of item["suggestions"].slice(0, 12)) {
        const suggestion = parseSuggestion(s);
        if (suggestion) suggestions.push(suggestion);
      }
    }
    /* The meal's dishes (P5): absent on plans stored before P5, read
       as empty — a pre-P5 plan is a food-composed plan, whole. */
    const dishes: PlanDish[] = [];
    if (Array.isArray(item["dishes"])) {
      for (const d of item["dishes"].slice(0, 6)) {
        const dish = parsePlanDish(d);
        if (dish) dishes.push(dish);
      }
    }
    meals.push({
      meal,
      kcal: Math.round(mealKcal),
      proteinG: round1(mealProtein),
      dishes,
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
    notes,
    methodVersion,
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
