/**
 * Plan view (brief v7, N1) — the Plan tab's single source of
 * truth. The pins:
 *
 *  · ONE meal order (M-159): breakfast, lunch, snack, dinner,
 *    whatever order the plan stored its meals in;
 *  · ONE totals function: a meal's dishes + every suggestion it
 *    serves, top-ups INCLUDED (M-147 — the audit's own breakfast:
 *    dish 276 + yogurt 37 = the 313 the header showed);
 *  · ONE primary meal, picked by the clock (M-149's function —
 *    wired to the button in N3, landed and tested here);
 *  · ONE balance groups array: flower count, headline and chips
 *    all derive from it, and its meters keep eaten / planned /
 *    target as separate numbers (M-151);
 *  · ONE adjustments array (M-138's data half): tier-ordered, at
 *    most three, derived from the plan's structured reasons only.
 */
import { describe, expect, it } from "vitest";

import { EMPTY_ANSWERS, toHealthProfile, type AssessmentState } from "@/lib/assessment/state";
import { targetsFor } from "@/lib/vitalis/calc/body";
import { toSafetyInput } from "@/lib/vitalis/domain/profile";
import { classifySafety } from "@/lib/vitalis/safety/classify";
import type { PlanReason } from "@/lib/reasons";

import {
  adjustmentsOf,
  buildPlanView,
  generatePlan,
  isAdjustmentKind,
  mealAddOns,
  mealTotals,
  pickPrimaryMeal,
  sortMeals,
  type DailyPlan,
  type Food,
  type FoodGroup,
  type LogEntry,
  type Meal,
  type Nutrients,
  type PlanDish,
  type PlanMeal,
  type PlanSuggestion,
} from "@/lib/nutrition";
import { DISH_LIBRARY } from "@/lib/nutrition/data/dishLibrary";
import { USDA_REFERENCE_FOODS } from "@/lib/nutrition/usdaReference";

/* ------------------------------ fixtures ------------------------------ */

const nutrients = (kcal: number, proteinG = 0, carbsG = 0, fatG = 0): Nutrients => ({
  kcal,
  proteinG,
  carbsG,
  fatG,
});

function suggestion(
  foodId: string,
  n: Nutrients,
  grams: number,
  layer?: PlanSuggestion["layer"],
): PlanSuggestion {
  return {
    foodId,
    name: foodId,
    grams,
    nutrients: n,
    provenance: { kind: "usda", sourceId: foodId, label: "USDA" },
    ...(layer ? { layer } : {}),
  };
}

function dish(dishId: string, n: Nutrients): PlanDish {
  return {
    dishId,
    name: dishId,
    hindi: "",
    role: "anchor",
    servings: 1,
    nutrients: n,
    provenance: { kind: "recipe", sourceId: dishId, label: "Recipe" },
  };
}

function planMeal(
  slot: Meal,
  dishes: PlanDish[] = [],
  suggestions: PlanSuggestion[] = [],
): PlanMeal {
  return { meal: slot, kcal: 0, proteinG: 0, dishes, suggestions, note: null };
}

function food(id: string, group: FoodGroup): Food {
  return {
    id,
    name: id,
    per100g: nutrients(0),
    servings: [{ label: "1 serving", grams: 100 }],
    provenance: { kind: "usda", sourceId: id, label: "USDA" },
    classification: {
      group,
      containsEgg: false,
      containsDairy: false,
      isFlesh: false,
      isFish: false,
    },
  };
}

const VEG = food("test-veg", "vegetables");
const FRUIT = food("test-fruit", "fruits");
const BY_FOOD = new Map([
  [VEG.id, VEG],
  [FRUIT.id, FRUIT],
]);

/** A real composed plan to spread overrides over (the balance
 *  suite's pattern) — the view only reads the plan's shape. */
function basePlan(): DailyPlan {
  const answers: Partial<AssessmentState["answers"]> = {
    ageYears: 30,
    heightCm: 175,
    weightKg: 82,
    sex: "female",
    goal: "lose",
    activity: "light",
    pregnantOrBreastfeeding: false,
    eatingDisorderHistory: false,
    unexplainedWeightChange: false,
  };
  const state: AssessmentState = {
    version: 1,
    status: "complete",
    step: "summary",
    answers: { ...EMPTY_ANSWERS, ...answers },
    consents: [],
    startedAt: null,
    completedAt: "2026-11-10T03:05:00.000Z",
    updatedAt: "2026-11-10T03:05:00.000Z",
  };
  const profile = toHealthProfile(state, "user-1");
  const safety = classifySafety(toSafetyInput(profile));
  const outcome = generatePlan({
    profile,
    safety,
    gatedOutcome: targetsFor(profile, safety, "2026-11-20"),
    fallbackTargets: null,
    foods: USDA_REFERENCE_FOODS,
    dishes: DISH_LIBRARY,
    day: "2026-11-20",
    now: "2026-11-20T03:00:00.000Z",
    id: "planview-test",
  });
  if (!outcome.ok) throw new Error("expected a plan");
  return outcome.plan;
}

const PLAN = basePlan();
const planWith = (over: Partial<DailyPlan>): DailyPlan => ({ ...PLAN, ...over });

/** The plan with one optional field genuinely absent (a stored plan
 *  from before the field existed) — `exactOptionalPropertyTypes`
 *  forbids spelling that as `field: undefined`. */
const planWithout = (key: "timeline" | "hydration"): DailyPlan => {
  const copy = { ...PLAN };
  delete copy[key];
  return copy;
};

const entry = (over: Partial<LogEntry> = {}): LogEntry => ({
  id: "e1",
  day: PLAN.day,
  meal: "breakfast",
  foodId: VEG.id,
  snapshot: null,
  name: VEG.id,
  amount: { grams: 100 },
  nutrients: nutrients(25, 1),
  provenance: { kind: "usda", sourceId: VEG.id, label: "USDA" },
  source: "search",
  createdAt: "2026-11-20T08:00:00.000Z",
  ...over,
});

const NO_LOG = { loggedMealIds: new Set<Meal>(), entries: [] as LogEntry[] };
const at = (hhmm: string) => new Date(`2026-11-20T${hhmm}:00`);

/* ------------------------------- order -------------------------------- */

describe("planView — sortMeals (M-159)", () => {
  it("is the one canonical order: breakfast, lunch, snack, dinner", () => {
    const stored: { meal: Meal }[] = [
      { meal: "dinner" },
      { meal: "snack" },
      { meal: "breakfast" },
      { meal: "lunch" },
    ];
    expect(sortMeals(stored).map((m) => m.meal)).toEqual([
      "breakfast",
      "lunch",
      "snack",
      "dinner",
    ]);
    // The stored array itself is not mutated.
    expect(stored.map((m) => m.meal)).toEqual(["dinner", "snack", "breakfast", "lunch"]);
  });

  it("the view's meals come out in that order whatever the plan stored", () => {
    const view = buildPlanView({
      plan: planWith({ meals: [planMeal("dinner"), planMeal("breakfast")] }),
      log: NO_LOG,
      now: at("09:00"),
      byFoodId: BY_FOOD,
    });
    expect(view.meals.map((m) => m.meal)).toEqual(["breakfast", "dinner"]);
  });
});

/* ------------------------------- totals ------------------------------- */

describe("planView — mealTotals (M-147)", () => {
  it("includes the 'to complete the day' top-up: dish 276 + yogurt 37 = 313", () => {
    const m = planMeal(
      "breakfast",
      [dish("dish-a", nutrients(276, 38, 10, 12))],
      [suggestion("yogurt", nutrients(37, 6, 3, 0), 100, "topup")],
    );
    expect(mealTotals(m).kcal).toBe(313);
    expect(mealTotals(m).proteinG).toBe(44);
    // …and the inclusion is stated on the data.
    expect(mealAddOns(m)).toEqual([
      { suggestion: m.suggestions[0], included: true },
    ]);
  });

  it("sums dishes and layered suggestions; an empty meal is zeros", () => {
    const m = planMeal(
      "lunch",
      [dish("dish-b", { ...nutrients(400, 30), fibreG: 5 })],
      [suggestion("veg", nutrients(50, 2), 200, "vegetables")],
    );
    const t = mealTotals(m);
    expect(t.kcal).toBe(450);
    expect(t.fibreG).toBe(5);
    expect(mealTotals(planMeal("snack"))).toEqual({
      kcal: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
    });
  });
});

/* ------------------------------ primary ------------------------------- */

describe("planView — pickPrimaryMeal (M-149)", () => {
  const open = (logged: Meal[] = []) =>
    (["breakfast", "lunch", "snack", "dinner"] as Meal[]).map((meal) => ({
      meal,
      logged: logged.includes(meal),
    }));

  it("09:00 → breakfast (in its window)", () => {
    expect(pickPrimaryMeal(open(), 9 * 60)).toBe("breakfast");
  });

  it("19:00 → dinner, not the unlogged breakfast", () => {
    expect(pickPrimaryMeal(open(), 19 * 60)).toBe("dinner");
  });

  it("dinner logged at 19:00 → null (nothing earlier is highlighted)", () => {
    expect(pickPrimaryMeal(open(["dinner"]), 19 * 60)).toBeNull();
  });

  it("23:00 → null", () => {
    expect(pickPrimaryMeal(open(), 23 * 60)).toBeNull();
  });

  it("lunch logged at 12:00 → snack (the next unlogged)", () => {
    expect(pickPrimaryMeal(open(["lunch"]), 12 * 60)).toBe("snack");
  });

  it("everything logged → null; between windows → the next upcoming", () => {
    expect(pickPrimaryMeal(open(["breakfast", "lunch", "snack", "dinner"]), 12 * 60)).toBeNull();
    expect(pickPrimaryMeal(open(), 11 * 60)).toBe("lunch");
  });
});

/* ----------------------------- adjustments ---------------------------- */

const KITCHEN: PlanReason = {
  kind: "kitchen-relaxed",
  answers: { noCook: true, capMinutes: 10, equipmentListed: false },
  stages: [{ stage: "cooking-included" }],
};
const PROTEIN: PlanReason = {
  kind: "log-protein-shortfall",
  days: 2,
  avgProteinG: 23,
  targetProteinG: 171,
};
const SNACK: PlanReason = { kind: "snack-added", mealsPerDay: 3 };

describe("planView — adjustmentsOf (M-138)", () => {
  it("one array, tier order, whatever order the plan stored", () => {
    const plan = planWith({ reasons: [SNACK, PROTEIN, KITCHEN] });
    const adj = adjustmentsOf(plan);
    expect(adj.map((a) => a.kind)).toEqual(["kitchen-relaxed", "protein-lean", "meal-added"]);
    const lean = adj.find((a) => a.kind === "protein-lean");
    expect(lean).toMatchObject({ days: 2, avgG: 23, targetG: 171 });
    const added = adj.find((a) => a.kind === "meal-added");
    expect(added).toMatchObject({ slot: "snack", assessmentMeals: 3 });
  });

  it("at most three; non-adjustment kinds never enter the array", () => {
    const plan = planWith({
      reasons: [
        { kind: "budget-widened", ceilingRupees: 45 },
        { kind: "log-energy-overshoot", days: 3, avgKcal: 2400, targetKcal: 1350 },
        KITCHEN,
        SNACK,
        PROTEIN,
        { kind: "veg-shortfall", actualG: 100, guidelineG: 400 },
      ],
    });
    const adj = adjustmentsOf(plan);
    expect(adj).toHaveLength(3);
    expect(adj.map((a) => a.kind)).toEqual([
      "budget-widened",
      "kitchen-relaxed",
      "log-energy-overshoot",
    ]);
    expect(isAdjustmentKind("veg-shortfall")).toBe(false);
    expect(isAdjustmentKind("kitchen-relaxed")).toBe(true);
  });

  it("the country widenings are tier-0 adjustments carrying their data (M-251)", () => {
    const adj = adjustmentsOf(
      planWith({
        reasons: [
          { kind: "country-widened", countryName: "Bulgaria" },
          { kind: "food-side-widened", countryName: "India", sideLabel: "East Indian" },
        ],
      }),
    );
    expect(adj.find((a) => a.kind === "country-widened")).toMatchObject({
      countryName: "Bulgaria",
    });
    expect(adj.find((a) => a.kind === "food-side-widened")).toMatchObject({
      countryName: "India",
      sideLabel: "East Indian",
    });
    expect(isAdjustmentKind("country-widened")).toBe(true);
    expect(isAdjustmentKind("food-side-widened")).toBe(true);
  });

  it("gate and adaptation adjustments carry their data on the array (brief v7 N4)", () => {
    /* N4 renders the rows from this array through `adjustmentCopy`
       alone, so the numbers its copy needs ride on the adjustment
       itself, not only on the originating reason. */
    const adj = adjustmentsOf(
      planWith({
        reasons: [
          { kind: "budget-widened", ceilingRupees: 45 },
          { kind: "kitchen-cap-raised", capMinutes: 10, stageMinutes: 25 },
          { kind: "log-energy-overshoot", days: 3, avgKcal: 2400, targetKcal: 1350 },
        ],
      }),
    );
    expect(adj.find((a) => a.kind === "budget-widened")).toMatchObject({ ceilingRupees: 45 });
    expect(adj.find((a) => a.kind === "kitchen-cap-raised")).toMatchObject({
      capMinutes: 10,
      stageMinutes: 25,
    });
    expect(adj.find((a) => a.kind === "log-energy-overshoot")).toMatchObject({
      days: 3,
      avgKcal: 2400,
      targetKcal: 1350,
    });
    const quickest = adjustmentsOf(
      planWith({ reasons: [{ kind: "kitchen-cap-quickest", capMinutes: 10 }] }),
    );
    expect(quickest[0]).toMatchObject({ kind: "kitchen-cap-quickest", capMinutes: 10 });
  });

  it("a plan with no reasons has an empty adjustments array — the data, not prose", () => {
    expect(adjustmentsOf(planWith({ reasons: [] }))).toEqual([]);
    const view = buildPlanView({
      plan: planWith({ reasons: [], meals: [planMeal("breakfast")] }),
      log: NO_LOG,
      now: at("09:00"),
      byFoodId: BY_FOOD,
    });
    expect(view.adjustments).toEqual([]);
  });
});

/* ------------------------------ balance ------------------------------- */

describe("planView — balance groups (M-151)", () => {
  const vegBreakfast = planMeal("breakfast", [], [suggestion(VEG.id, nutrients(90, 3), 360)]);

  it("one array: the count and the groups are the same data", () => {
    const view = buildPlanView({
      plan: planWith({ meals: [vegBreakfast] }),
      log: NO_LOG,
      now: at("09:00"),
      byFoodId: BY_FOOD,
    });
    expect(view.balance.total).toBe(8);
    expect(view.balance.groups).toHaveLength(8);
    expect(view.balance.inPlan).toBe(
      view.balance.groups.filter((g) => g.state !== "open").length,
    );
    expect(view.balance.groups.find((g) => g.key === "vegetables")!.state).toBe("planned");
  });

  it("a logged group is eaten; meters keep eaten, planned and target apart", () => {
    const view = buildPlanView({
      plan: planWith({ meals: [vegBreakfast] }),
      log: { loggedMealIds: new Set<Meal>(), entries: [entry()] },
      now: at("09:00"),
      byFoodId: BY_FOOD,
    });
    expect(view.balance.groups.find((g) => g.key === "vegetables")!.state).toBe("eaten");
    const veg = view.balance.meters.find((m) => m.key === "vegetables")!;
    expect(veg).toMatchObject({ eaten: 100, planned: 360, reach: 460, target: 400, unit: "g" });
  });

  it("an untouched group is open", () => {
    const view = buildPlanView({
      plan: planWith({ meals: [vegBreakfast] }),
      log: NO_LOG,
      now: at("09:00"),
      byFoodId: BY_FOOD,
    });
    expect(view.balance.groups.find((g) => g.key === "fruits")!.state).toBe("open");
  });
});

/* -------------------------------- rail -------------------------------- */

describe("planView — the day rail", () => {
  const timed = planWith({
    meals: [planMeal("dinner"), planMeal("breakfast")],
    timeline: {
      anchor: "sleep_log",
      items: [
        { kind: "wake", label: "On waking", time: "07:00" },
        { kind: "meal", label: "Breakfast", time: "07:40", meal: "breakfast" },
        { kind: "meal", label: "Dinner", time: "20:00", meal: "dinner" },
        { kind: "wind_down", label: "Wind down", time: "22:30" },
        { kind: "sleep", label: "Bedtime", time: "23:00" },
      ],
    },
  });

  it("mirrors the timeline: estimated times are marked, never a dash", () => {
    const view = buildPlanView({
      plan: timed,
      log: NO_LOG,
      now: at("19:00"),
      byFoodId: BY_FOOD,
    });
    expect(view.rail.map((s) => s.key)).toEqual([
      "wake",
      "breakfast",
      "dinner",
      "winddown",
      "bed",
    ]);
    const breakfast = view.rail.find((s) => s.key === "breakfast")!;
    expect(breakfast.whenText).toBe("~7:40 AM");
    expect(breakfast.whenEstimated).toBe(true);
    expect(view.rail.every((s) => s.whenText !== "—" && !s.whenText.includes("—"))).toBe(true);
    // At 19:00 the primary meal is dinner — the rail agrees with the rows.
    expect(view.rail.find((s) => s.key === "dinner")!.state).toBe("now");
    expect(view.meals.find((m) => m.meal === "dinner")!.primary).toBe(true);
  });

  it("without times the rail speaks in words; a logged meal reads done", () => {
    const view = buildPlanView({
      plan: { ...planWithout("timeline"), meals: [planMeal("breakfast")] },
      log: { loggedMealIds: new Set<Meal>(["breakfast"]), entries: [] },
      now: at("09:00"),
      byFoodId: BY_FOOD,
    });
    const breakfast = view.rail.find((s) => s.key === "breakfast")!;
    expect(breakfast.whenText).toBe("Morning");
    expect(breakfast.whenEstimated).toBe(false);
    expect(breakfast.state).toBe("done");
  });
});

/* --------------------------- totals & prefs --------------------------- */

describe("planView — totals, goal, showKcal", () => {
  it("plan totals are the sum of mealTotals; the guide is the plan's targets", () => {
    const view = buildPlanView({
      plan: {
        ...planWithout("hydration"),
        meals: [
          planMeal("breakfast", [dish("d1", nutrients(313, 44))]),
          planMeal("dinner", [dish("d2", nutrients(400, 30))]),
        ],
      },
      log: NO_LOG,
      now: at("09:00"),
      byFoodId: BY_FOOD,
    });
    expect(view.totals.plan.kcal).toBe(713);
    expect(view.totals.plan.proteinG).toBe(74);
    expect(view.totals.plan.meals).toBe(2);
    expect(view.totals.plan.waterMl).toBeNull();
    expect(view.totals.guide).toEqual({ kcal: PLAN.targets.kcal, proteinG: PLAN.targets.proteinG });
    expect(view.goal.key).toBe(PLAN.goalProfile);
  });

  it("showKcal follows the hide-calories preference when one exists", () => {
    const base = { plan: planWith({ meals: [] }), log: NO_LOG, now: at("09:00"), byFoodId: BY_FOOD };
    expect(buildPlanView(base).showKcal).toBe(true);
    expect(buildPlanView({ ...base, prefs: { hideCalories: true } }).showKcal).toBe(false);
    expect(buildPlanView({ ...base, prefs: { hideCalories: false } }).showKcal).toBe(true);
  });
});
