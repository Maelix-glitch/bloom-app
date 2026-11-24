import { describe, expect, it } from "vitest";

import {
  EMPTY_BEHAVIOURAL,
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
import { DISH_LIBRARY } from "./data/dishLibrary";
import { nutrientsForGrams } from "./math";
import {
  MILK_CURD_FOOD_IDS,
  countsTowardMilkCurdFloor,
  floorTotalsOf,
  generatePlan,
  type PlanMeal,
} from "./plan";
import { USDA_REFERENCE_FOODS } from "./usdaReference";
import type { Food } from "./types";

/**
 * P12 tally pins (live finding, 2026-11-19): the plan's notes said
 * "Milk, curd and cheese reach 0 g — at least 300 g is the aim" on
 * a day serving an Enriched Fruit and Curd Bowl and a ricotta
 * snack. The bowl's curd is Greek yogurt (10.3 g protein per
 * 100 g), which the composition predicate isMilkOrCurd excludes
 * (protein ≥ 5 = a protein-layer food). Composition may treat it
 * as protein; the TALLY must count what was served. These tests
 * pin the serving predicate, the dish-line counting, and one
 * end-to-end day whose note now states its true figure.
 */

const FOOD_BY_ID = new Map(USDA_REFERENCE_FOODS.map((f) => [f.id, f]));
const DISH_BY_ID = new Map(DISH_LIBRARY.map((d) => [d.id, d]));
const food = (id: string): Food => {
  const f = FOOD_BY_ID.get(id);
  if (!f) throw new Error(`no reference food ${id}`);
  return f;
};

describe("the milk-and-curd serving tally", () => {
  it("counts milks and curd/yogurts, including Greek yogurt, and not the cheeses", () => {
    const dairy = USDA_REFERENCE_FOODS.filter((f) => f.classification?.group === "dairy");
    const counted = dairy.filter(countsTowardMilkCurdFloor).map((f) => f.id).sort();
    expect(counted).toEqual([...MILK_CURD_FOOD_IDS].sort());
    /* The pinned set is exactly the milks and yogurts: ricotta,
       cottage cheese and the hard cheeses are protein foods and
       stay out of the floor tally — a data refresh that adds a
       dairy food fails here until the set is re-judged. */
    /* 6 since PF-1 (2026-11-19): the lowfat Greek yogurt (the same
       curd as its nonfat sibling) and the skimmed milk powder (milk
       in dry form) joined the set — see plan.ts at the set. */
    expect(MILK_CURD_FOOD_IDS.size).toBe(6);
    expect(countsTowardMilkCurdFloor(food("usda-330137"))).toBe(true); // Greek yogurt (hung curd)
    expect(countsTowardMilkCurdFloor(food("usda-323444"))).toBe(false); // ricotta
    expect(countsTowardMilkCurdFloor(food("usda-328841"))).toBe(false); // cottage cheese
    expect(countsTowardMilkCurdFloor(food("usda-328637"))).toBe(false); // cheddar
  });

  it("counts a dish's curd line at the servings served", () => {
    const dish = DISH_BY_ID.get("dish-enriched-fruit-curd-bowl");
    if (!dish) throw new Error("dish missing");
    const meals: PlanMeal[] = [
      {
        meal: "breakfast",
        kcal: 300,
        proteinG: 30,
        dishes: [
          {
            dishId: dish.id,
            name: dish.name.en,
            hindi: dish.name.hindi,
            role: "anchor",
            servings: 1,
            nutrients: { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
            provenance: { kind: "recipe", sourceId: dish.id, label: dish.name.en },
          },
        ],
        suggestions: [],
        note: null,
      },
      {
        meal: "snack",
        kcal: 120,
        proteinG: 10,
        dishes: [],
        suggestions: [
          {
            foodId: "usda-323444", // ricotta — a protein food, not milk/curd
            name: food("usda-323444").name,
            grams: 75,
            nutrients: nutrientsForGrams(food("usda-323444").per100g, 75),
            provenance: food("usda-323444").provenance,
            layer: "snack",
          },
        ],
        note: null,
      },
    ];
    /* The bowl carries 250 g of Greek yogurt across 2 servings:
       one serving is 125 g of curd. The ricotta adds nothing. */
    expect(floorTotalsOf(meals, FOOD_BY_ID, DISH_BY_ID).milkCurdG).toBe(125);
    /* A glass of milk on top counts in full. */
    meals[1]!.suggestions.push({
      foodId: "usda-322892",
      name: food("usda-322892").name,
      grams: 250,
      nutrients: nutrientsForGrams(food("usda-322892").per100g, 250),
      provenance: food("usda-322892").provenance,
      layer: "snack",
    });
    expect(floorTotalsOf(meals, FOOD_BY_ID, DISH_BY_ID).milkCurdG).toBe(375);
  });

  it("end to end: a day serving Greek yogurt states its true tally, not 0 g", () => {
    const profile: HealthProfile = {
      ...emptyProfile("user-tally", "2026-06-01T07:00:00Z"),
      ageYears: 34,
      sex: "male",
      height: observation(quantity(188, "cm"), {
        source: "user_reported",
        recordedAt: "2026-06-01T07:00:00Z",
      }),
      weight: observation(quantity(112, "kg"), {
        source: "user_reported",
        recordedAt: "2026-06-01T07:00:00Z",
      }),
      goal: "gain",
      activity: "active",
      rateKgPerWeek: 0.3,
      dietary: { ...EMPTY_DIETARY, pattern: "eggetarian", mealsPerDay: 2, cuisinePreference: "north_indian" },
      constraints: { ...EMPTY_CONSTRAINTS, pregnantOrBreastfeeding: false, eatingDisorderHistory: false },
      behavioural: { ...EMPTY_BEHAVIOURAL, cookingAbility: "basic", prepTimeMaxMinutes: 20 },
    };
    const safety = classifySafety(toSafetyInput(profile));
    const gated = targetsFor(profile, safety, "2026-11-21");
    if (!gated.ok) throw new Error("gated refused");
    const outcome = generatePlan({
      profile,
      safety,
      gatedOutcome: gated,
      foods: USDA_REFERENCE_FOODS,
      dishes: DISH_LIBRARY,
      day: "2026-11-21",
      now: "2026-11-19T03:00:00.000Z",
      id: "tally-e2e",
    });
    if (!outcome.ok) throw new Error("plan refused");
    /* This day serves 100 g of milk and curd: the note must state
       100 g — before the fix it stated 0 g.
       M-219 re-pin: at the corrected protein guide (129 g, dosed
       on the reference weight) the 2026-11-20 composition serves
       no dairy; on 2026-11-21 the day's dishes carry exactly
       100 g of milk and curd and the note states it — the tally
       property pinned here is unchanged. */
    const milkNotes = outcome.plan.notes.filter((n) => n.includes("g of milk and curd"));
    expect(milkNotes).toEqual([
      "Today's suggestions reach 100 g of milk and curd, the ICMR-NIN guideline aims for at least 300 g across the day.",
    ]);
    expect(outcome.plan.notes.some((n) => n.includes("reach 0 g of milk and curd"))).toBe(false);
  });
});
