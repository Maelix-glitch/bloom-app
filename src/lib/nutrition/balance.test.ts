/**
 * Today's balance (brief v4, Slice 4) — the tally behind the Bloom
 * flower. The pins that matter:
 *
 *  · the floor groups (vegetables, fruit, milk & curd) are walked
 *    EXACTLY as the composer's own `floorTotalsOf` walks them — on
 *    real composed plans the two tallies are equal, so the picture
 *    can never drift from the numbers the composer judged;
 *  · the guideline constants equal the `guidelineG` the composer
 *    emits in its shortfall reasons (its own twins in plan.ts);
 *  · the group set is the classifier's eight coverage groups, in
 *    plate order — flesh/fish arrives by flag (its data group is
 *    the residual `other`), fats/oils and residuals fill no petal.
 */
import { describe, expect, it } from "vitest";

import { EMPTY_ANSWERS, toHealthProfile, type AssessmentState } from "@/lib/assessment/state";
import { targetsFor } from "@/lib/vitalis/calc/body";
import { toSafetyInput } from "@/lib/vitalis/domain/profile";
import { classifySafety } from "@/lib/vitalis/safety/classify";

import {
  coverage,
  dayBalance,
  floorTotalsOf,
  generatePlan,
  GUIDELINE_FRUIT_G,
  GUIDELINE_VEGETABLES_G,
  type Food,
  type PlanMeal,
} from "@/lib/nutrition";
import { DISH_LIBRARY } from "@/lib/nutrition/data/dishLibrary";
import { USDA_REFERENCE_FOODS } from "@/lib/nutrition/usdaReference";

const FOOD_BY_ID = new Map(USDA_REFERENCE_FOODS.map((f) => [f.id, f]));
const DISH_BY_ID = new Map(DISH_LIBRARY.map((d) => [d.id, d]));

function planFor(answers: Partial<AssessmentState["answers"]>, day: string) {
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
    gatedOutcome: targetsFor(profile, safety, day),
    fallbackTargets: null,
    foods: USDA_REFERENCE_FOODS,
    dishes: DISH_LIBRARY,
    day,
    now: `${day}T03:00:00.000Z`,
    id: "balance-test",
  });
  if (!outcome.ok) throw new Error("expected a plan");
  return outcome.plan;
}

const ROTATION = {
  ageYears: 30,
  heightCm: 175,
  weightKg: 82,
  sex: "female" as const,
  goal: "lose" as const,
  activity: "light" as const,
  pregnantOrBreastfeeding: false,
  eatingDisorderHistory: false,
  unexplainedWeightChange: false,
};

const OWNER: Partial<AssessmentState["answers"]> = {
  ageYears: 19,
  heightCm: 165,
  weightKg: 95,
  sex: "unspecified" as const,
  goal: "lose" as const,
  rateKgPerWeek: 1,
  activity: "sedentary" as const,
  dietaryPattern: "omnivore" as const,
  mealsPerDay: 3,
  foodBudget: 2,
  cuisinePreference: "south_indian" as const,
  cookingAbility: "none" as const,
  prepTimeMaxMinutes: 10,
  equipment: ["stove", "pressure_cooker", "mixer_grinder", "fridge"],
  pregnantOrBreastfeeding: false,
  eatingDisorderHistory: false,
  unexplainedWeightChange: false,
};

describe("coverage (brief v4 Part 3.2)", () => {
  it("computes share, gap and met for a goal", () => {
    expect(coverage(360, 400)).toEqual({ pct: 90, gap: 40, met: false });
    expect(coverage(400, 400)).toEqual({ pct: 100, gap: 0, met: true });
    expect(coverage(520, 400)).toEqual({ pct: 100, gap: 0, met: true });
    expect(coverage(0, 100)).toEqual({ pct: 0, gap: 100, met: false });
  });
});

describe("dayBalance — the flower's tally", () => {
  it("returns the eight coverage groups in plate order", () => {
    const groups = dayBalance([], FOOD_BY_ID, DISH_BY_ID);
    expect(groups.map((g) => g.key)).toEqual([
      "vegetables",
      "fruits",
      "cereals_grains",
      "pulses_legumes",
      "milk_curd",
      "eggs",
      "flesh_fish",
      "nuts_seeds",
    ]);
    expect(groups.every((g) => !g.covered && g.grams === 0)).toBe(true);
  });

  it("its floor totals equal floorTotalsOf's on real composed plans", () => {
    for (const plan of [planFor(ROTATION, "2026-11-18"), planFor(OWNER, "2026-11-19")]) {
      const floors = floorTotalsOf(plan.meals, FOOD_BY_ID, DISH_BY_ID);
      const groups = dayBalance(plan.meals, FOOD_BY_ID, DISH_BY_ID);
      const byKey = new Map(groups.map((g) => [g.key, g.grams]));
      expect(byKey.get("vegetables")).toBeCloseTo(floors.vegG, 6);
      expect(byKey.get("fruits")).toBeCloseTo(floors.fruitG, 6);
      expect(byKey.get("milk_curd")).toBeCloseTo(floors.milkCurdG, 6);
      /* The fixtures must actually exercise the tally — a day of
         zeros would make the equality vacuous. */
      expect(floors.vegG + floors.fruitG + floors.milkCurdG).toBeGreaterThan(0);
    }
  });

  it("the guideline constants equal the composer's own reason values", () => {
    const plan = planFor(ROTATION, "2026-11-18");
    const veg = plan.reasons?.find((r) => r.kind === "veg-shortfall");
    const fruit = plan.reasons?.find((r) => r.kind === "fruit-shortfall");
    if (!veg || veg.kind !== "veg-shortfall") throw new Error("fixture lost its veg shortfall");
    if (!fruit || fruit.kind !== "fruit-shortfall")
      throw new Error("fixture lost its fruit shortfall");
    expect(veg.guidelineG).toBe(GUIDELINE_VEGETABLES_G);
    expect(fruit.guidelineG).toBe(GUIDELINE_FRUIT_G);
    /* And the reason's measured actual is the tally the flower reads. */
    const groups = dayBalance(plan.meals, FOOD_BY_ID, DISH_BY_ID);
    expect(groups.find((g) => g.key === "vegetables")!.grams).toBeCloseTo(veg.actualG, 6);
    expect(groups.find((g) => g.key === "fruits")!.grams).toBeCloseTo(fruit.actualG, 6);
  });

  it("buckets by the classifier's facts: flesh by flag, curd by the floor predicate, oil nowhere", () => {
    const food = (id: string): Food => {
      const f = FOOD_BY_ID.get(id);
      if (!f) throw new Error(`fixture food ${id} missing`);
      return f;
    };
    /* Chicken breast: group `other`, isFlesh — the flesh petal. */
    const chicken = USDA_REFERENCE_FOODS.find((f) => f.classification?.isFlesh);
    if (!chicken) throw new Error("no flesh food in the reference set");
    /* Olive oil: fats_oils — a cooking medium, no petal. */
    const oil = USDA_REFERENCE_FOODS.find((f) => f.classification?.group === "fats_oils");
    if (!oil) throw new Error("no fats_oils food in the reference set");
    /* Greek yogurt: dairy the floor predicate counts as curd. */
    const greekYogurt = food("usda-330137");
    const meals: PlanMeal[] = [
      {
        meal: "lunch",
        kcal: 600,
        proteinG: 40,
        suggestions: [
          { foodId: chicken.id, name: chicken.name, grams: 120, nutrients: chicken.per100g, provenance: chicken.provenance, layer: "protein" },
          { foodId: oil.id, name: oil.name, grams: 10, nutrients: oil.per100g, provenance: oil.provenance, layer: "finishing" },
          { foodId: greekYogurt.id, name: greekYogurt.name, grams: 100, nutrients: greekYogurt.per100g, provenance: greekYogurt.provenance, layer: "finishing" },
        ],
        dishes: [],
        note: null,
      },
    ];
    const groups = dayBalance(meals, FOOD_BY_ID, DISH_BY_ID);
    const byKey = new Map(groups.map((g) => [g.key, g]));
    expect(byKey.get("flesh_fish")).toMatchObject({ grams: 120, covered: true });
    expect(byKey.get("milk_curd")).toMatchObject({ grams: 100, covered: true });
    expect(groups.filter((g) => g.covered).map((g) => g.key)).toEqual(["milk_curd", "flesh_fish"]);
  });
});
