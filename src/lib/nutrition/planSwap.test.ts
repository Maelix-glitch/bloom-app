import { describe, expect, it } from "vitest";

import {
  EMPTY_CONSTRAINTS,
  EMPTY_DIETARY,
  emptyProfile,
  toSafetyInput,
  type HealthProfile,
} from "@/lib/vitalis/domain/profile";
import { observation } from "@/lib/vitalis/domain/provenance";
import { quantity } from "@/lib/vitalis/domain/units";
import { classifySafety } from "@/lib/vitalis/safety/classify";
import { targetsFor } from "@/lib/vitalis/calc/body";
import { DISH_LIBRARY, findDish } from "./data/dishLibrary";
import { dishNutrients, dishPatterns } from "./dishes";
import {
  generatePlan,
  parsePlanValue,
  planValueOf,
  planWithDishSwapped,
  type DailyPlan,
} from "./plan";
import { USDA_REFERENCE_FOODS } from "./usdaReference";

/**
 * The dish-swap seam (Vitalis's swap_dish tool): one dish in one meal
 * of a composed plan is replaced by another library dish — the plan's
 * targets, inputs and fingerprint untouched, the replacement carrying
 * its own computed numbers and recipe provenance, in the old dish's
 * role. The swapped plan must still parse as a plan this engine made.
 */

const NOW = "2026-11-17T03:00:00.000Z";
const PROVENANCE = { source: "user_reported", recordedAt: "2026-06-01T07:00:00Z" } as const;

function ownerProfile(): HealthProfile {
  return {
    ...emptyProfile("user-1", "2026-06-01T07:00:00Z"),
    ageYears: 30,
    sex: "male",
    height: observation(quantity(178, "cm"), PROVENANCE),
    weight: observation(quantity(100, "kg"), PROVENANCE),
    goal: "gain",
    activity: "moderate",
    rateKgPerWeek: 0.25,
    dietary: { ...EMPTY_DIETARY, pattern: "eggetarian", mealsPerDay: 3 },
    constraints: {
      ...EMPTY_CONSTRAINTS,
      pregnantOrBreastfeeding: null,
      eatingDisorderHistory: null,
    },
  };
}

function ownerPlan(): DailyPlan {
  const profile = ownerProfile();
  const safety = classifySafety(toSafetyInput(profile));
  const outcome = generatePlan({
    profile,
    safety,
    gatedOutcome: targetsFor(profile, safety, "2026-11-17"),
    fallbackTargets: { kcal: 3288, proteinG: 220 },
    foods: USDA_REFERENCE_FOODS,
    dishes: DISH_LIBRARY,
    day: "2026-11-17",
    now: NOW,
    id: "plan-swap",
  });
  if (!outcome.ok) throw new Error("plan refused");
  return outcome.plan;
}

describe("planWithDishSwapped", () => {
  it("replaces one dish, keeping role, targets and parseability", () => {
    const plan = ownerPlan();
    const meal = plan.meals.find((m) => m.dishes.length > 0)!;
    const original = meal.dishes[0]!;
    /* A suitable replacement the meal does not already hold and the
       person's pattern allows — the same gates the proposal checks. */
    const replacement = DISH_LIBRARY.find(
      (d) =>
        d.id !== original.dishId &&
        !meal.dishes.some((x) => x.dishId === d.id) &&
        dishPatterns(d).includes("eggetarian"),
    )!;
    const next = planWithDishSwapped(plan, meal.meal, original.dishId, replacement);
    expect(next).not.toBeNull();
    const swappedMeal = next!.meals.find((m) => m.meal === meal.meal)!;
    const swapped = swappedMeal.dishes.find((d) => d.dishId === replacement.id)!;
    expect(swapped).toBeTruthy();
    expect(swapped.role).toBe(original.role);
    expect(swapped.servings).toBe(original.servings);
    expect(swapped.name).toBe(replacement.name.en);
    expect(swapped.nutrients.kcal).toBeCloseTo(dishNutrients(replacement).nutrients.kcal, 0);
    expect(swapped.provenance.kind).toBe("recipe");
    expect(swapped.provenance.sourceId).toBe(replacement.id);
    /* The old dish is gone from that meal; other meals are untouched. */
    expect(swappedMeal.dishes.some((d) => d.dishId === original.dishId)).toBe(false);
    for (const other of next!.meals) {
      if (other.meal !== meal.meal) expect(other).toBe(plan.meals.find((m) => m.meal === other.meal));
    }
    /* Targets and identity untouched — and the plan still parses. */
    expect(next!.targets).toEqual(plan.targets);
    expect(next!.fingerprint).toBe(plan.fingerprint);
    expect(parsePlanValue(planValueOf(next!))).not.toBeNull();
    /* The input plan was not mutated. */
    expect(meal.dishes[0]!.dishId).toBe(original.dishId);
  });

  it("refuses what is not there, and a dish already in the meal", () => {
    const plan = ownerPlan();
    const meal = plan.meals.find((m) => m.dishes.length > 0)!;
    const anyDish = findDish("dish-paneer-tikka") ?? DISH_LIBRARY[0]!;
    expect(planWithDishSwapped(plan, meal.meal, "dish-not-in-the-plan", anyDish)).toBeNull();
    expect(planWithDishSwapped(plan, "snack", meal.dishes[0]!.dishId, anyDish)).toBeNull();
    if (meal.dishes.length > 1) {
      expect(
        planWithDishSwapped(plan, meal.meal, meal.dishes[0]!.dishId, findDish(meal.dishes[1]!.dishId)!),
      ).toBeNull();
    }
  });
});
