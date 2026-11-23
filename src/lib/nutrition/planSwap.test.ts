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
import { dishNutrients, dishPatterns, type Dish } from "./dishes";
import {
  generatePlan,
  parsePlanValue,
  planValueOf,
  planWithDishSwapped,
  type DailyPlan,
  type PlanDish,
} from "./plan";
import { USDA_REFERENCE_FOODS } from "./usdaReference";
import type { Nutrients } from "./types";

/**
 * The dish-swap seam (Vitalis's swap_dish tool): one dish in one meal
 * of a composed plan is replaced by another library dish — the plan's
 * targets, inputs and fingerprint untouched, the replacement carrying
 * its own computed numbers and recipe provenance, in the old dish's
 * role. The swapped plan must still parse as a plan this engine made.
 *
 * Servings (P8): in a single-dish meal — the shape the current
 * composer writes — the replacement is RE-FIT to the meal's share:
 * the scale whose computed panel best fits the meal, judged by the
 * composer's own fit cost. In a legacy stacked meal (plans stored by
 * the P5–P7 composers) the replacement keeps the old dish's servings
 * exactly: a swap on an old plan changes the dish, never the plan's
 * structure.
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
      /* M-219: answered — the unanswered fixture rode the retired
         absence fallback (audit F-02). */
      pregnantOrBreastfeeding: false,
      eatingDisorderHistory: false,
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
    foods: USDA_REFERENCE_FOODS,
    dishes: DISH_LIBRARY,
    day: "2026-11-17",
    now: NOW,
    id: "plan-swap",
  });
  if (!outcome.ok) throw new Error("plan refused");
  return outcome.plan;
}

const NUTRIENT_FIELDS = [
  "kcal",
  "proteinG",
  "carbsG",
  "fatG",
  "fibreG",
  "sodiumMg",
  "potassiumMg",
  "calciumMg",
  "ironMg",
  "magnesiumMg",
  "vitaminCMg",
] as const satisfies readonly (keyof Nutrients)[];

/** A plan dish's panel is the library's per-serving panel × its
 *  servings, to the engine's 0.1 rounding — never an invented panel. */
function expectScaledPanel(planDish: PlanDish, dish: Dish) {
  const perServing = dishNutrients(dish).nutrients;
  for (const field of NUTRIENT_FIELDS) {
    expect(
      Math.abs((planDish.nutrients[field] ?? 0) - (perServing[field] ?? 0) * planDish.servings),
      `${dish.name.en} ${field}`,
    ).toBeLessThanOrEqual(0.1);
  }
}

describe("planWithDishSwapped", () => {
  it("replaces one dish in a single-dish meal, re-fitting its scale to the meal share", () => {
    const plan = ownerPlan();
    const meal = plan.meals.find((m) => m.dishes.length > 0)!;
    expect(meal.dishes.length).toBe(1);
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
    expect(swapped.name).toBe(replacement.name.en);
    expect(swapped.provenance.kind).toBe("recipe");
    expect(swapped.provenance.sourceId).toBe(replacement.id);
    /* The re-fit: a quarter step inside [0.5, 2.0], and the panel is
       the replacement's own numbers at that scale. On this fixture
       the replacement is a light dal (244 kcal per serving) swapped
       into a 913 kcal breakfast, so the fitter takes it to the 2.0
       bound — the least-bad scale, honestly at the cap. */
    expect(swapped.servings).toBe(2);
    expect(Math.abs(swapped.servings * 4 - Math.round(swapped.servings * 4))).toBeLessThan(1e-9);
    expectScaledPanel(swapped, replacement);
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

  it("a legacy stacked meal keeps the old dish's role and servings exactly", () => {
    const plan = ownerPlan();
    const anchorDish = findDish("dish-dal-fry")!;
    const sideDish = findDish("dish-moong-dal-tadka")!;
    const replacement = findDish("dish-urad-dal")!;
    const literal = (dish: Dish, role: PlanDish["role"], servings: number): PlanDish => {
      const perServing = dishNutrients(dish).nutrients;
      const nutrients = Object.fromEntries(
        NUTRIENT_FIELDS.map((f) => [f, Math.round((perServing[f] ?? 0) * servings * 10) / 10]),
      ) as unknown as Nutrients;
      return {
        dishId: dish.id,
        name: dish.name.en,
        hindi: dish.name.hindi,
        role,
        servings,
        nutrients,
        provenance: { kind: "recipe", sourceId: dish.id, label: "Built from USDA ingredient data" },
      };
    };
    /* A P5-shaped breakfast: an anchor at ×1 and a side at ×1.75. */
    const legacy: DailyPlan = {
      ...plan,
      meals: plan.meals.map((m) =>
        m.meal === "breakfast"
          ? { ...m, dishes: [literal(anchorDish, "anchor", 1), literal(sideDish, "side", 1.75)] }
          : m,
      ),
    };
    const next = planWithDishSwapped(legacy, "breakfast", sideDish.id, replacement);
    expect(next).not.toBeNull();
    const swapped = next!.meals
      .find((m) => m.meal === "breakfast")!
      .dishes.find((d) => d.dishId === replacement.id)!;
    expect(swapped.role).toBe("side");
    expect(swapped.servings).toBe(1.75);
    expectScaledPanel(swapped, replacement);
    /* The untouched anchor is the same object the legacy plan held. */
    expect(next!.meals.find((m) => m.meal === "breakfast")!.dishes[0]).toBe(
      legacy.meals.find((m) => m.meal === "breakfast")!.dishes[0],
    );
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
