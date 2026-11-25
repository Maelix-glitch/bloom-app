/**
 * M-244 (research R-2511-09 + R-2511-10) — the plan's sodium and
 * sugar checks. The pins:
 *
 *  · a total sums only the items that REPORT the nutrient — an
 *    absent field is never read as zero;
 *  · when at least one served item stays silent, the total is
 *    marked incomplete and the copy calls it "at least" (a floor);
 *  · when nothing reports the nutrient, the figure is null and
 *    the copy renders no line at all;
 *  · sugar's share of energy is computed on the plan's own kcal,
 *    and is withheld when calories are hidden.
 */
import { describe, expect, it } from "vitest";

import { EMPTY_ANSWERS, toHealthProfile, type AssessmentState } from "@/lib/assessment/state";
import { targetsFor } from "@/lib/vitalis/calc/body";
import { toSafetyInput } from "@/lib/vitalis/domain/profile";
import { classifySafety } from "@/lib/vitalis/safety/classify";
import { planChecksCopy } from "@/lib/reasons";

import {
  buildPlanView,
  generatePlan,
  PLAN_SODIUM_CEILING_MG,
  PLAN_SUGAR_LIMIT_PCT,
  type DailyPlan,
  type Nutrients,
  type PlanDish,
  type PlanMeal,
  type PlanSuggestion,
} from "@/lib/nutrition";
import { DISH_LIBRARY } from "@/lib/nutrition/data/dishLibrary";
import { USDA_REFERENCE_FOODS } from "@/lib/nutrition/usdaReference";

function basePlan(): DailyPlan {
  const state: AssessmentState = {
    version: 1,
    status: "complete",
    step: "summary",
    answers: {
      ...EMPTY_ANSWERS,
      ageYears: 30,
      heightCm: 175,
      weightKg: 82,
      sex: "female",
      goal: "lose",
      activity: "light",
      pregnantOrBreastfeeding: false,
      eatingDisorderHistory: false,
      unexplainedWeightChange: false,
    },
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
  });
  if (!outcome.ok) throw new Error("fixture plan refused");
  return outcome.plan;
}

const dish = (dishId: string, n: Nutrients): PlanDish => ({
  dishId,
  name: dishId,
  hindi: "",
  role: "anchor",
  servings: 1,
  nutrients: n,
  provenance: { kind: "recipe", sourceId: dishId, label: "Recipe" },
});

const suggestion = (foodId: string, n: Nutrients): PlanSuggestion => ({
  foodId,
  name: foodId,
  grams: 100,
  nutrients: n,
  provenance: { kind: "usda", sourceId: foodId, label: "USDA" },
});

const meal = (dishes: PlanDish[], suggestions: PlanSuggestion[] = []): PlanMeal => ({
  meal: "lunch",
  kcal: 0,
  proteinG: 0,
  dishes,
  suggestions,
  note: null,
});

function viewWith(meals: PlanMeal[], hideCalories = false) {
  const plan = { ...basePlan(), meals };
  return buildPlanView({
    plan,
    log: { loggedMealIds: new Set(), entries: [] },
    byFoodId: new Map(),
    ...(hideCalories ? { prefs: { hideCalories: true } } : {}),
  });
}

const core = (kcal: number): Nutrients => ({ kcal, proteinG: 0, carbsG: 0, fatG: 0 });

describe("M-244 · plan sodium check (R-2511-10)", () => {
  it("sums sodium over dishes and suggestions that report it", () => {
    const view = viewWith([
      meal([dish("d1", { ...core(700), sodiumMg: 900 })], [suggestion("s1", { ...core(100), sodiumMg: 300 })]),
    ]);
    expect(view.checks.sodium).toEqual({ mg: 1200, ceilingMg: PLAN_SODIUM_CEILING_MG, complete: true });
    expect(planChecksCopy(view.checks).sodium).toBe("Sodium 1,200 mg of the 2,000 mg daily guide.");
  });

  it("a silent item makes the total a floor, and the copy says so", () => {
    const view = viewWith([
      meal([dish("d1", { ...core(700), sodiumMg: 900 }), dish("d2", core(300))]),
    ]);
    expect(view.checks.sodium.mg).toBe(900);
    expect(view.checks.sodium.complete).toBe(false);
    expect(planChecksCopy(view.checks).sodium).toBe("Sodium at least 900 mg of the 2,000 mg daily guide.");
  });

  it("nothing reporting sodium reads null, and no line renders", () => {
    const view = viewWith([meal([dish("d1", core(700))])]);
    expect(view.checks.sodium.mg).toBeNull();
    expect(planChecksCopy(view.checks).sodium).toBeNull();
  });
});

describe("M-244 · plan sugar check (R-2511-09)", () => {
  it("sums sugar and reads its share of the plan's own energy", () => {
    /* 15 g of sugar at 4 kcal/g = 60 kcal of a 1,500 kcal plan = 4%. */
    const view = viewWith([
      meal([dish("d1", { ...core(1400), sugarG: 10 })], [suggestion("s1", { ...core(100), sugarG: 5 })]),
    ]);
    expect(view.checks.sugar.g).toBe(15);
    expect(view.checks.sugar.shareOfEnergyPct).toBe(4);
    expect(view.checks.sugar.limitPct).toBe(PLAN_SUGAR_LIMIT_PCT);
    expect(planChecksCopy(view.checks).sugar).toBe(
      "Sugar 15 g, 4% of the day's energy. The guide is under 5%.",
    );
  });

  it("hidden calories withhold the share, never the grams", () => {
    const view = viewWith([meal([dish("d1", { ...core(1400), sugarG: 10 })])], true);
    expect(view.checks.sugar.g).toBe(10);
    expect(view.checks.sugar.shareOfEnergyPct).toBeNull();
    expect(planChecksCopy(view.checks).sugar).toBe("Sugar 10 g in the day's plan.");
  });

  it("nothing reporting sugar reads null, and no line renders", () => {
    const view = viewWith([meal([dish("d1", core(700))])]);
    expect(view.checks.sugar.g).toBeNull();
    expect(planChecksCopy(view.checks).sugar).toBeNull();
  });
});
