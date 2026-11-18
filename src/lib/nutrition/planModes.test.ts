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
import type { Dish } from "./dishes";
import { generatePlan, type DailyPlan } from "./plan";
import { USDA_REFERENCE_FOODS } from "./usdaReference";
import type { Food } from "./types";

/**
 * System 14 (Condition Modes) at the plan seam: the modes judge the
 * dish pool INSIDE generatePlan, on top of the pattern and budget
 * gates — a dish that passes pattern and budget but fails an active
 * mode is never served, and with no modes the plan is untouched.
 */

const NOW = "2026-11-18T03:00:00.000Z";
const PROVENANCE = { source: "user_reported", recordedAt: "2026-06-01T07:00:00Z" } as const;

function eggetarianProfile(): HealthProfile {
  return {
    ...emptyProfile("user-1", "2026-06-01T07:00:00Z"),
    ageYears: 30,
    sex: "male",
    height: observation(quantity(178, "cm"), PROVENANCE),
    weight: observation(quantity(80, "kg"), PROVENANCE),
    goal: "maintain",
    activity: "moderate",
    rateKgPerWeek: 0,
    dietary: { ...EMPTY_DIETARY, pattern: "eggetarian", mealsPerDay: 3, budgetTier: null },
    constraints: { ...EMPTY_CONSTRAINTS, pregnantOrBreastfeeding: false, eatingDisorderHistory: false },
  };
}

/** An eggetarian main that passes pattern + budget, carrying honey
 *  (blood-sugar ingredient rule) and enough salt to pass 800 mg of
 *  sodium per serving (blood-pressure rule). Carbs stay under the
 *  blood-sugar carb limit, so each mode's verdict rests on its own
 *  named rule. */
const HONEY_SALT_EGG_RICE: Dish = {
  id: "dish-test-honey-salt-egg-rice",
  name: { en: "Honey Salt Egg Rice (test)", hindi: "शहद अंडा चावल" },
  category: "main",
  servings: 2,
  lines: [
    { foodId: "usda-171287", grams: 200 }, // egg
    { foodId: "usda-2512381", grams: 150 }, // rice
    { foodId: "usda-171025", grams: 20 }, // sunflower oil
    { foodId: "usda-169640", grams: 25 }, // honey
    { foodId: "usda-173468", grams: 10 }, // salt
  ],
  method: ["Cook."],
  timeMinutes: 15,
  budgetTier: 1,
  enriched: false,
};

function gen(opts: { activeModes?: readonly ("blood_sugar" | "blood_pressure" | "thyroid")[] } = {}): DailyPlan {
  const profile = eggetarianProfile();
  const day = "2026-11-18";
  const safety = classifySafety(toSafetyInput(profile));
  const outcome = generatePlan({
    profile,
    safety,
    gatedOutcome: targetsFor(profile, safety, day),
    fallbackTargets: null,
    foods: USDA_REFERENCE_FOODS as readonly Food[],
    dishes: [HONEY_SALT_EGG_RICE],
    ...(opts.activeModes ? { activeModes: opts.activeModes } : {}),
    day,
    now: NOW,
    id: "plan-modes",
  });
  if (!outcome.ok) throw new Error(`plan refused: ${JSON.stringify(outcome.refusal)}`);
  return outcome.plan;
}

const servedDishIds = (plan: DailyPlan): string[] =>
  plan.meals.flatMap((m) => m.dishes.map((d) => d.dishId));

describe("plan · System 14 condition modes at the dish-pool seam", () => {
  it("serves the dish when no mode is on — pattern and budget pass it", () => {
    expect(servedDishIds(gen())).toContain(HONEY_SALT_EGG_RICE.id);
  });

  it("never serves it with blood-sugar aware on (honey in the ingredients)", () => {
    const plan = gen({ activeModes: ["blood_sugar"] });
    expect(servedDishIds(plan)).not.toContain(HONEY_SALT_EGG_RICE.id);
    /* The plan itself still composes — from foods, the standing fallback. */
    expect(plan.meals.length).toBeGreaterThan(0);
  });

  it("never serves it with blood-pressure aware on (sodium over the limit)", () => {
    const plan = gen({ activeModes: ["blood_pressure"] });
    expect(servedDishIds(plan)).not.toContain(HONEY_SALT_EGG_RICE.id);
  });

  it("thyroid aware changes nothing — it has no dish rules", () => {
    expect(servedDishIds(gen({ activeModes: ["thyroid"] }))).toContain(HONEY_SALT_EGG_RICE.id);
  });
});
