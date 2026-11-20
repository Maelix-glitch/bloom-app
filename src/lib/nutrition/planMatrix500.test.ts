import { describe, expect, it } from "vitest";

import {
  EMPTY_BEHAVIOURAL,
  EMPTY_CONSTRAINTS,
  EMPTY_DIETARY,
  emptyProfile,
  toSafetyInput,
  type BehaviouralProfile,
  type CuisinePreference,
  type DietaryPattern,
  type HealthProfile,
} from "@/lib/vitalis/domain/profile";
import { observation } from "@/lib/vitalis/domain/provenance";
import { quantity } from "@/lib/vitalis/domain/units";
import { classifySafety } from "@/lib/vitalis/safety/classify";
import { targetsFor } from "@/lib/vitalis/calc/body";
import { DISH_LIBRARY } from "./data/dishLibrary";
import { PW2_DISHES } from "./data/dishLibraryProteinBreakfasts";
import { PROTEIN_INDIA_DISHES } from "./data/dishLibraryProteinIndia";
import { PROTEIN_INTL_DISHES } from "./data/dishLibraryProteinIntl";
import { SHAKES_DISHES } from "./data/dishLibraryShakes";
import { dishPatterns } from "./dishes";
import { dishIsGravyStyle } from "./gravyStyle";
import {
  generatePlan,
  patternAllowsClassification,
  planPatternOf,
  type DailyPlan,
} from "./plan";
import { USDA_REFERENCE_FOODS } from "./usdaReference";
import type { Food } from "./types";

/**
 * P11 verification: the 500-run matrix. The plan composer is
 * deterministic, so "test it 500 times" means 500 DISTINCT inputs —
 * dietary patterns × goals × target sizes × cuisine preferences ×
 * behavioural profiles × meal counts × day indices — each generated
 * once and judged on the guarantees the owner was promised:
 *
 *   · day energy inside ±5% of the guide, protein inside 95–110%;
 *   · zero dietary-pattern violations (dishes AND plain foods);
 *   · one dish in a main meal — plus, since method 14, the ONE legal
 *     second dish: the accompaniment (role "base", fixed half
 *     serving, steamed rice or phulka, beside a gravy-style anchor
 *     at lunch or dinner); no dish repeated in a day, the base
 *     excepted (at most two base servings, lunch and dinner);
 *   · a real snack every day; a morning element every day;
 *   · hydration present and summing exactly to the day's water
 *     target whenever one was supplied;
 *   · main meals sanely proportioned against their share of the day.
 *
 * The run also measures what the owner asked after: how often the
 * protein-wave dishes carry the mains, and whether the protein
 * powders (PW-1) close the days the dishes leave protein-short.
 * Stats are logged as one summary line per block.
 *
 * Method 13 extension (2026-11-19, the dish-first repair): the
 * shipped matrix never set a budget tier and never counted
 * dish-vs-food composition — the two blind spots the raw-plan
 * diagnosis walked through. The dish blocks now rotate the stated
 * budget (unset / 1 / 2 / 3 / 2) across cells, and the judge counts
 * composition: dish-main share, protein-wave servings BY SLOT
 * (breakfast / lunch / dinner / snack — shakes included), snack
 * dishes, and food-composed mains, which may appear only on plans
 * whose notes label the relaxation that caused them. A dedicated
 * block pins the owner's exact corner across a week × four budget
 * states.
 *
 * Method 14 extension (2026-11-20, M-160/M-161): the accompaniment
 * moves this suite's two shape tallies to the method-14 contract,
 * at equal strictness. multiDishMains counts only a second dish
 * that is NOT the accompaniment; a base malformed in any
 * particular (seat, serving, dish, meal, non-gravy anchor) is a
 * judged failure, as in the 1000 matrix's bad_base class. The
 * repeat tally binds every non-base dish; a base may repeat
 * across lunch and dinner, never more. Dish-composition counting
 * (mainDishes, proteinDishes) reads the anchor, so a based main
 * counts as the dish-composed main it is.
 */

const NOW = "2026-11-19T03:00:00.000Z";
const PROVENANCE = { source: "user_reported", recordedAt: "2026-06-01T07:00:00Z" } as const;
const MEASURE = process.env["PLAN_MATRIX_MEASURE"] === "1";

const PATTERNS: DietaryPattern[] = ["vegetarian", "eggetarian", "vegan", "pescatarian", "omnivore"];
const GOALS: HealthProfile["goal"][] = ["lose", "maintain", "gain", "recomp", "general_health"];
const SIZES = [
  { kcal: 1600, proteinG: 70 },
  { kcal: 2200, proteinG: 120 },
  { kcal: 2964, proteinG: 165 },
  { kcal: 3288, proteinG: 220 },
] as const;
const CUISINES: (CuisinePreference | null)[] = [null, "north_indian", "south_indian", "both"];
const DAYS = [
  "2026-11-16",
  "2026-11-17",
  "2026-11-18",
  "2026-11-19",
  "2026-11-20",
  "2026-11-21",
  "2026-11-22",
];
const MEALS_PER_DAY: (number | null)[] = [3, 3, null, 4, 2];
/** Method 13: the stated-budget rotation — unset, then each tier,
 *  tier 2 twice (the owner's own tier, and the commonest answer). */
const BUDGET_ROTATION: (1 | 2 | 3 | null)[] = [null, 1, 2, 3, 2];

const BEHAVIOURS: { name: string; profile: BehaviouralProfile }[] = [
  { name: "plain", profile: EMPTY_BEHAVIOURAL },
  {
    name: "no-cook",
    profile: { ...EMPTY_BEHAVIOURAL, cookingAbility: "none", equipment: ["none"] },
  },
  { name: "hostel", profile: { ...EMPTY_BEHAVIOURAL, eatingSetting: "hostel" } },
  { name: "low-confidence", profile: { ...EMPTY_BEHAVIOURAL, confidence: 1, motivation: 2 } },
  {
    name: "prep-cap-20",
    profile: { ...EMPTY_BEHAVIOURAL, cookingAbility: "basic", prepTimeMaxMinutes: 20 },
  },
  {
    name: "hunger-nights",
    profile: { ...EMPTY_BEHAVIOURAL, hungerPattern: "nights", cravingKinds: ["sweet"] },
  },
];

const PROTEIN_DISH_IDS = new Set(
  [...PW2_DISHES, ...PROTEIN_INDIA_DISHES, ...PROTEIN_INTL_DISHES, ...SHAKES_DISHES].map(
    (d) => d.id,
  ),
);
const POWDER_IDS = new Set(["usda-173177", "usda-173181"]);
const FOOD_BY_ID = new Map(USDA_REFERENCE_FOODS.map((f) => [f.id, f]));
const DISH_BY_ID = new Map(DISH_LIBRARY.map((d) => [d.id, d]));

interface CellResult {
  label: string;
  plan: DailyPlan;
}

function buildProfile(
  pattern: DietaryPattern,
  goal: HealthProfile["goal"],
  opts: {
    mealsPerDay?: number | null;
    cuisine?: CuisinePreference | null;
    behaviour?: BehaviouralProfile;
    answered?: boolean;
    weightKg?: number;
    budgetTier?: 1 | 2 | 3 | null;
  } = {},
): HealthProfile {
  return {
    ...emptyProfile("user-matrix", "2026-06-01T07:00:00Z"),
    ageYears: 30,
    sex: "male",
    height: observation(quantity(178, "cm"), PROVENANCE),
    weight: observation(quantity(opts.weightKg ?? 80, "kg"), PROVENANCE),
    goal,
    activity: "moderate",
    rateKgPerWeek: 0,
    dietary: {
      ...EMPTY_DIETARY,
      pattern,
      mealsPerDay: opts.mealsPerDay ?? 3,
      cuisinePreference: opts.cuisine ?? null,
      budgetTier: opts.budgetTier ?? null,
    },
    constraints: {
      ...EMPTY_CONSTRAINTS,
      pregnantOrBreastfeeding: opts.answered ? false : null,
      eatingDisorderHistory: opts.answered ? false : null,
    },
    behavioural: opts.behaviour ?? EMPTY_BEHAVIOURAL,
  };
}

function gen(profile: HealthProfile, day: string, opts: { dishes?: boolean; size?: (typeof SIZES)[number]; waterMl?: number } = {}): DailyPlan {
  const safety = classifySafety(toSafetyInput(profile));
  const outcome = generatePlan({
    profile,
    safety,
    gatedOutcome: targetsFor(profile, safety, day),
    fallbackTargets: opts.size ? { kcal: opts.size.kcal, proteinG: opts.size.proteinG } : null,
    foods: USDA_REFERENCE_FOODS,
    ...(opts.dishes === false ? {} : { dishes: DISH_LIBRARY }),
    ...(opts.waterMl !== undefined ? { waterMl: opts.waterMl } : {}),
    day,
    now: NOW,
    id: "plan-matrix",
  } as Parameters<typeof generatePlan>[0]);
  if (!outcome.ok) throw new Error(`plan refused: ${JSON.stringify(outcome.refusal)}`);
  return outcome.plan;
}

/* ------------------------------- judging ---------------------------------- */

interface Stats {
  n: number;
  kcalBand: number;
  proteinBand: number;
  worstKcalOver: number;
  worstKcalUnder: number;
  worstProteinOver: number;
  worstProteinUnder: number;
  patternViolations: number;
  multiDishMains: number;
  dishDays: number;
  mainDishes: number;
  proteinDishes: number;
  repeatDays: number;
  snackPresent: number;
  morningPresent: number;
  hydrationPresent: number;
  hydrationExact: number;
  mealSanityBad: number;
  proteinShortDishDays: number;
  powderTopUpDays: number;
  powderOnShortDays: number;
  /* Method 13 composition counters. */
  mains: number;
  foodMains: number;
  pwBySlot: { breakfast: number; lunch: number; dinner: number; snack: number };
  shakeServings: number;
  snackDishDays: number;
  unlabelledFoodMainPlans: number;
}

function newStats(): Stats {
  return {
    n: 0,
    kcalBand: 0,
    proteinBand: 0,
    worstKcalOver: 0,
    worstKcalUnder: 0,
    worstProteinOver: 0,
    worstProteinUnder: 0,
    patternViolations: 0,
    multiDishMains: 0,
    dishDays: 0,
    mainDishes: 0,
    proteinDishes: 0,
    repeatDays: 0,
    snackPresent: 0,
    morningPresent: 0,
    hydrationPresent: 0,
    hydrationExact: 0,
    mealSanityBad: 0,
    proteinShortDishDays: 0,
    powderTopUpDays: 0,
    powderOnShortDays: 0,
    mains: 0,
    foodMains: 0,
    pwBySlot: { breakfast: 0, lunch: 0, dinner: 0, snack: 0 },
    shakeServings: 0,
    snackDishDays: 0,
    unlabelledFoodMainPlans: 0,
  };
}

const failures: string[] = [];

/** The product's honesty contract, in the notes' own words: a day
 *  outside its bands must NAME the miss with its true figure. The
 *  matrix asserts band-or-named for every plan, and reports the raw
 *  band rates alongside — a named miss is honest, a silent one is
 *  a failure. */
const kcalNamed = (plan: DailyPlan) =>
  plan.notes.some((n) => n.includes("kcal — above your") || n.includes("kcal — below your"));
const proteinNamed = (plan: DailyPlan, over: boolean) =>
  over
    ? plan.notes.some((n) => n.includes("g of protein — above your"))
    : /* Any shortfall note that states the figure against the guide
         names the miss — the caps-bind wording ("— the portion caps
         bind…") or the energy-bind wordings ("— a top-up is in the
         day, but the day is already over its energy guide…"). The
         detector keys on the shared "protein guide —" stem, not
         one sentence: the same generalisation the 1000 matrix
         already carries. Method 14 made the energy-bind wording
         reachable on cells the caps-bind wording used to cover —
         a gravy anchor's rice base can carry the day over its
         energy guide, and the top-up discipline then honestly
         withholds the protein top-up and says so. */
      plan.notes.some((n) => n.includes("protein guide —"));

/** Method 13: the notes that honestly label a plan whose mains
 *  could not all be dish-composed — a kitchen relaxation, a budget
 *  widening, or a prep-cap widening. A food-composed main on a plan
 *  carrying none of these is a silent fallback: the exact failure
 *  the owner was served. */
const relaxationLabelled = (plan: DailyPlan) =>
  plan.notes.some(
    (n) =>
      n.includes("leave almost no real dishes") ||
      n.includes("treats it as a preference") ||
      n.includes("aim for about"),
  );

function judge(
  stats: Stats,
  label: string,
  plan: DailyPlan,
  opts: { expectHydration: boolean; expectDishComposition?: boolean },
) {
  stats.n += 1;
  const t = plan.targets;
  let kcal = 0;
  let protein = 0;
  let dishProtein = 0;
  let planHasFoodMain = false;
  const dishIds: string[] = [];
  let baseCount = 0;
  for (const meal of plan.meals) {
    const mealKcal =
      meal.dishes.reduce((a, d) => a + d.nutrients.kcal, 0) +
      meal.suggestions.reduce((a, s) => a + s.nutrients.kcal, 0);
    kcal += mealKcal;
    protein +=
      meal.dishes.reduce((a, d) => a + d.nutrients.proteinG, 0) +
      meal.suggestions.reduce((a, s) => a + s.nutrients.proteinG, 0);
    dishProtein += meal.dishes.reduce((a, d) => a + d.nutrients.proteinG, 0);
    /* Method 13 composition counting: every dish served counts
       toward its slot's protein-wave tally; shakes count wherever
       they land; a main meal with no dish is a food-composed main. */
    for (const d of meal.dishes) {
      const dish = DISH_BY_ID.get(d.dishId);
      if (PROTEIN_DISH_IDS.has(d.dishId)) stats.pwBySlot[meal.meal] += 1;
      if (dish?.category === "shake") stats.shakeServings += 1;
    }
    if (meal.meal === "snack" && meal.dishes.length > 0) stats.snackDishDays += 1;
    if (meal.meal !== "snack") {
      stats.mains += 1;
      if (meal.dishes.length === 0 && meal.suggestions.length > 0) {
        stats.foodMains += 1;
        planHasFoodMain = true;
      }
      /* Method 14: the accompaniment is the one legal second
         dish — a well-formed base beside a gravy anchor. A second
         dish that is not one counts as the old multi-dish defect;
         a base malformed in any particular is a judged failure. */
      const base = meal.dishes.find((d) => d.role === "base");
      if (base) {
        const anchorDish = DISH_BY_ID.get(meal.dishes[0]!.dishId);
        const wellFormed =
          meal.dishes.length === 2 &&
          meal.dishes[1] === base &&
          (meal.meal === "lunch" || meal.meal === "dinner") &&
          base.servings === 0.5 &&
          (base.dishId === "dish-steamed-rice" || base.dishId === "dish-phulka-roti") &&
          anchorDish !== undefined &&
          dishIsGravyStyle(anchorDish);
        if (!wellFormed && !MEASURE) {
          failures.push(`${label}: malformed base in ${meal.meal}`);
        }
      }
      if (meal.dishes.length > 2 || (meal.dishes.length > 1 && !base)) {
        stats.multiDishMains += 1;
      }
      if (meal.dishes.length >= 1) {
        stats.mainDishes += 1;
        if (PROTEIN_DISH_IDS.has(meal.dishes[0]!.dishId)) stats.proteinDishes += 1;
      }
      const ratio = meal.kcal > 0 ? mealKcal / meal.kcal : 0;
      /* The floor is 0.45×, not 0.5×: on the hardest cells (vegan,
         no-cook, largest guide) a main meal can land at almost
         exactly half its share with every cap binding and the day
         note saying so — the skew this window exists to catch is a
         meal collapsing far below its share, not the cap edge. */
      if (meal.dishes.length + meal.suggestions.length > 0 && (ratio < 0.45 || ratio > 1.6)) {
        stats.mealSanityBad += 1;
        if (!MEASURE) failures.push(`${label}: ${meal.meal} at ${ratio.toFixed(2)}× its share`);
      }
    }
    for (const d of meal.dishes) {
      /* Method 14: the repeat tally binds non-base dishes; bases
         are counted apart (at most two servings, lunch + dinner). */
      if (d.role === "base") baseCount += 1;
      else dishIds.push(d.dishId);
    }
  }
  if (dishIds.length > 0) stats.dishDays += 1;
  /* Method 13: a food-composed main is a labelled last resort,
     never a silent one. (The food-composed fallback block below
     opts out via expectDishComposition: false — there the layered
     composer IS the subject under test.) */
  if (planHasFoodMain && opts.expectDishComposition !== false && !relaxationLabelled(plan)) {
    stats.unlabelledFoodMainPlans += 1;
    if (!MEASURE) failures.push(`${label}: food-composed main with no relaxation note`);
  }
  if (new Set(dishIds).size !== dishIds.length || baseCount > 2) {
    stats.repeatDays += 1;
    if (!MEASURE) failures.push(`${label}: a dish repeats within the day`);
  }
  const kcalDev = kcal / t.kcal - 1;
  const proteinDev = protein / t.proteinG - 1;
  /* Band edges carry a 0.1pp tolerance: the composer and this
     harness sum the same nutrients in different orders, and days
     the trim/guard park exactly on an edge (95.000% / 110.000%)
     flip sides on float noise alone. Beyond the tolerance, a miss
     must be named in the notes — that is asserted, not assumed. */
  if (Math.abs(kcalDev) <= 0.051) stats.kcalBand += 1;
  else if (!kcalNamed(plan) && !MEASURE) {
    failures.push(`${label}: kcal ${(kcalDev * 100).toFixed(1)}% off guide, unnamed`);
  }
  if (proteinDev >= -0.051 && proteinDev <= 0.101) stats.proteinBand += 1;
  else if (!proteinNamed(plan, proteinDev > 0) && !MEASURE) {
    failures.push(`${label}: protein ${(proteinDev * 100).toFixed(1)}% off guide, unnamed`);
  }
  stats.worstKcalOver = Math.max(stats.worstKcalOver, kcalDev);
  stats.worstKcalUnder = Math.min(stats.worstKcalUnder, kcalDev);
  stats.worstProteinOver = Math.max(stats.worstProteinOver, proteinDev);
  stats.worstProteinUnder = Math.min(stats.worstProteinUnder, proteinDev);

  const snack = plan.meals.find((m) => m.meal === "snack");
  if (snack && snack.suggestions.length + snack.dishes.length > 0) stats.snackPresent += 1;
  else if (!MEASURE) failures.push(`${label}: no real snack`);

  if (plan.morning && plan.morning.waterMl > 0) stats.morningPresent += 1;
  else if (!MEASURE) failures.push(`${label}: no morning element`);

  if (opts.expectHydration) {
    if (plan.hydration) {
      stats.hydrationPresent += 1;
      const sum =
        plan.hydration.wakeMl + plan.hydration.perMeal.reduce((a, p) => a + p.ml, 0);
      if (sum === plan.hydration.targetMl && plan.hydration.totalMl === plan.hydration.targetMl) {
        stats.hydrationExact += 1;
      } else if (!MEASURE) {
        failures.push(`${label}: hydration sums to ${sum}, target ${plan.hydration.targetMl}`);
      }
    } else if (!MEASURE) {
      failures.push(`${label}: hydration missing despite a supplied water target`);
    }
  }

  const topUps = plan.meals.flatMap((m) => m.suggestions.filter((s) => s.layer === "topup"));
  const hasPowder = topUps.some((s) => POWDER_IDS.has(s.foodId));
  if (hasPowder) stats.powderTopUpDays += 1;
  if (dishIds.length > 0 && dishProtein < 0.95 * t.proteinG) {
    stats.proteinShortDishDays += 1;
    if (hasPowder) stats.powderOnShortDays += 1;
  }
}

function judgePattern(stats: Stats, label: string, plan: DailyPlan, pattern: DietaryPattern) {
  const planPattern = planPatternOf(pattern);
  if (!planPattern) return;
  for (const meal of plan.meals) {
    for (const d of meal.dishes) {
      const dish = DISH_BY_ID.get(d.dishId);
      if (dish && !dishPatterns(dish).includes(planPattern)) {
        stats.patternViolations += 1;
        if (!MEASURE) failures.push(`${label}: dish ${d.dishId} violates ${pattern}`);
      }
    }
    for (const s of meal.suggestions) {
      const food: Food | undefined = FOOD_BY_ID.get(s.foodId);
      if (
        food?.classification &&
        !patternAllowsClassification(planPattern, food.classification)
      ) {
        stats.patternViolations += 1;
        if (!MEASURE) failures.push(`${label}: food ${s.foodId} violates ${pattern}`);
      }
    }
  }
}

function report(name: string, s: Stats) {
  console.log(
    `[matrix ${name}] n=${s.n} kcalBand=${s.kcalBand} proteinBand=${s.proteinBand} ` +
      `worstKcal=${(s.worstKcalUnder * 100).toFixed(1)}%..+${(s.worstKcalOver * 100).toFixed(1)}% ` +
      `worstProtein=${(s.worstProteinUnder * 100).toFixed(1)}%..+${(s.worstProteinOver * 100).toFixed(1)}% ` +
      `patternViol=${s.patternViolations} multiDish=${s.multiDishMains} repeatDays=${s.repeatDays} ` +
      `snack=${s.snackPresent} morning=${s.morningPresent} hydration=${s.hydrationPresent}/${s.hydrationExact} ` +
      `sanityBad=${s.mealSanityBad} proteinDishShare=${s.mainDishes ? ((s.proteinDishes / s.mainDishes) * 100).toFixed(1) : "0"}% ` +
      `shortDishDays=${s.proteinShortDishDays} powderDays=${s.powderTopUpDays} powderOnShort=${s.powderOnShortDays} ` +
      `dishMainShare=${s.mains ? ((s.mainDishes / s.mains) * 100).toFixed(1) : "0"}% foodMains=${s.foodMains} ` +
      `pwBySlot=b${s.pwBySlot.breakfast}/l${s.pwBySlot.lunch}/d${s.pwBySlot.dinner}/s${s.pwBySlot.snack} ` +
      `shakes=${s.shakeServings} snackDishDays=${s.snackDishDays} unlabelledFoodMainPlans=${s.unlabelledFoodMainPlans}`,
  );
}

/* -------------------------------- blocks ----------------------------------- */

function dishMatrixBlock(offset: number, count: number): Stats {
  const stats = newStats();
  /* 100 base cells (pattern × goal × size) × 5 rotations = 500 plans;
     a block covers a [offset, offset+count) slice of the global index. */
  let g = 0;
  for (const pattern of PATTERNS) {
    for (const goal of GOALS) {
      for (const size of SIZES) {
        for (let rotation = 0; rotation < 5; rotation++) {
          if (g >= offset && g < offset + count) {
            const day = DAYS[g % DAYS.length]!;
            const cuisine = CUISINES[Math.floor(g / 7) % CUISINES.length]!;
            const behaviour = BEHAVIOURS[Math.floor(g / 3) % BEHAVIOURS.length]!;
            const mealsPerDay = MEALS_PER_DAY[Math.floor(g / 5) % MEALS_PER_DAY.length]!;
            const budgetTier = BUDGET_ROTATION[g % BUDGET_ROTATION.length]!;
            const label = `${pattern}/${goal}/${size.kcal}k/${cuisine ?? "nocuisine"}/${behaviour.name}/mpd${mealsPerDay ?? "null"}/b${budgetTier ?? "u"}/${day}`;
            const profile = buildProfile(pattern, goal, {
              mealsPerDay,
              cuisine,
              behaviour: behaviour.profile,
              budgetTier,
            });
            const plan = gen(profile, day, { size, waterMl: 2800 });
            judge(stats, label, plan, { expectHydration: true });
            judgePattern(stats, label, plan, pattern);
          }
          g += 1;
        }
      }
    }
  }
  return stats;
}

describe("plan matrix 500", () => {
  it(
    "dish-composed matrix, first 250",
    { timeout: 300_000 },
    () => {
      const s = dishMatrixBlock(0, 250);
      report("dish A", s);
      expect(s.n).toBe(250);
      /* Method 13 composition pins: shakes are servable and served
         (45 in this half at first measurement — the pin is > 0, the
         structural fact, not the census), and every snack carries
         a dish. Food-composed mains appear only on labelled plans
         (the judge's failures above) — at first measurement there
         were none at all: dish-main share 100%. */
      expect(s.shakeServings).toBeGreaterThan(0);
      expect(s.snackDishDays).toBe(250);
      expect(s.unlabelledFoodMainPlans).toBe(0);
      if (!MEASURE) expect(failures).toEqual([]);
    },
  );

  it(
    "dish-composed matrix, second 250",
    { timeout: 300_000 },
    () => {
      const before = failures.length;
      const s = dishMatrixBlock(250, 250);
      report("dish B", s);
      expect(s.n).toBe(250);
      expect(s.shakeServings).toBeGreaterThan(0);
      expect(s.snackDishDays).toBe(250);
      expect(s.unlabelledFoodMainPlans).toBe(0);
      if (!MEASURE) expect(failures.slice(before)).toEqual([]);
    },
  );

  it(
    "the owner's corner across a week × budget states, 28",
    { timeout: 300_000 },
    () => {
      /* The exact corner the diagnosis measured (omnivore, south
         indian, cooking "none", prep 10, his equipment, guide
         1,350 kcal / 171 g): at method 12 its dish mains were
         73.4% dish-composed and the protein wave's share of them
         was 7.4% with the budget unset and 81.1% at tier 2 (the
         hard cap let nothing else in). Method 13's contract: every
         main dish-composed at every budget state, the relaxation
         named, shakes served, and — F4 — the wave's share of dish
         mains at least 40% at tier 2 AND unset, where the pick
         preference (guide density 171/1350 ≈ 0.127) is active. */
      const ownerBehaviour: BehaviouralProfile = {
        ...EMPTY_BEHAVIOURAL,
        cookingAbility: "none",
        equipment: ["stove", "pressure_cooker", "mixer_grinder", "fridge"],
        prepTimeMaxMinutes: 10,
      };
      const shares = new Map<string, { mains: number; pw: number }>();
      let shakes = 0;
      for (const budgetTier of [null, 1, 2, 3] as const) {
        const key = budgetTier === null ? "unset" : `tier${budgetTier}`;
        shares.set(key, { mains: 0, pw: 0 });
        for (const day of DAYS) {
          const profile = buildProfile("omnivore", "lose", {
            cuisine: "south_indian",
            behaviour: ownerBehaviour,
            budgetTier,
          });
          const safety = classifySafety(toSafetyInput(profile));
          const outcome = generatePlan({
            profile,
            safety,
            gatedOutcome: { ok: false, reason: "profile_incomplete", missing: [] },
            fallbackTargets: { kcal: 1350, proteinG: 171 },
            foods: USDA_REFERENCE_FOODS,
            dishes: DISH_LIBRARY,
            day,
            now: NOW,
            id: "plan-matrix-owner",
          });
          if (!outcome.ok) throw new Error(`owner corner refused: ${key}/${day}`);
          const plan = outcome.plan;
          /* The relaxation note is owed on WEEKDAYS, where the
             10-minute cap binds: at the weekend the cap lifts by
             the Assessment's own terms and his no-cook + equipment
             pool holds exactly enough main dishes (3) to serve
             unrelaxed — no relaxation, no claim of one. */
          const dow = new Date(`${day}T12:00:00Z`).getUTCDay();
          if (dow >= 1 && dow <= 5) {
            expect(
              plan.notes.some((n) => n.includes("leave almost no real dishes")),
              `${key}/${day}: relaxation unlabelled`,
            ).toBe(true);
          }
          const acc = shares.get(key)!;
          for (const meal of plan.meals) {
            for (const d of meal.dishes) {
              if (DISH_BY_ID.get(d.dishId)?.category === "shake") shakes += 1;
            }
            if (meal.meal === "snack") continue;
            /* Method 14: one anchor, plus at most its base. */
            expect(meal.dishes.length, `${key}/${day}/${meal.meal}`).toBeGreaterThanOrEqual(1);
            expect(meal.dishes.length, `${key}/${day}/${meal.meal}`).toBeLessThanOrEqual(2);
            if (meal.dishes.length === 2) {
              const base = meal.dishes[1]!;
              expect(base.role, `${key}/${day}/${meal.meal}`).toBe("base");
              expect(base.servings, `${key}/${day}/${meal.meal}`).toBe(0.5);
              expect(
                dishIsGravyStyle(DISH_BY_ID.get(meal.dishes[0]!.dishId)!),
                `${key}/${day}/${meal.meal}`,
              ).toBe(true);
            }
            acc.mains += 1;
            if (PROTEIN_DISH_IDS.has(meal.dishes[0]!.dishId)) acc.pw += 1;
          }
        }
      }
      for (const key of ["unset", "tier2"]) {
        const acc = shares.get(key)!;
        console.log(
          `[matrix owner ${key}] dishMains=${acc.mains} pwShare=${((acc.pw / acc.mains) * 100).toFixed(1)}%`,
        );
        expect(acc.pw / acc.mains, `owner ${key} PW share`).toBeGreaterThanOrEqual(0.4);
      }
      console.log(`[matrix owner] shakes across 28 days=${shakes}`);
      expect(shakes).toBeGreaterThan(0);
    },
  );

  it(
    "food-composed fallback matrix, 60",
    { timeout: 300_000 },
    () => {
      const before = failures.length;
      const stats = newStats();
      let i = 0;
      for (const pattern of PATTERNS) {
        for (const size of SIZES) {
          for (const day of [DAYS[0]!, DAYS[2]!, DAYS[4]!]) {
            const label = `food/${pattern}/${size.kcal}k/${day}`;
            const profile = buildProfile(pattern, "maintain", {});
            const plan = gen(profile, day, { size, dishes: false, waterMl: 2800 });
            judge(stats, label, plan, { expectHydration: true, expectDishComposition: false });
            judgePattern(stats, label, plan, pattern);
            i += 1;
          }
        }
      }
      report("food", stats);
      expect(i).toBe(60);
      if (!MEASURE) expect(failures.slice(before)).toEqual([]);
    },
  );

  it(
    "gated-path spot cells, 20",
    { timeout: 300_000 },
    () => {
      const before = failures.length;
      const stats = newStats();
      let i = 0;
      for (const pattern of PATTERNS) {
        for (const goal of ["maintain", "recomp"] as const) {
          for (const day of [DAYS[1]!, DAYS[5]!]) {
            const label = `gated/${pattern}/${goal}/${day}`;
            const profile = buildProfile(pattern, goal, { answered: true, weightKg: 90 });
            const plan = gen(profile, day, {});
            judge(stats, label, plan, { expectHydration: true });
            judgePattern(stats, label, plan, pattern);
            i += 1;
          }
        }
      }
      report("gated", stats);
      expect(i).toBe(20);
      if (!MEASURE) expect(failures.slice(before)).toEqual([]);
    },
  );
});
