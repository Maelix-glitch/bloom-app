/**
 * The grocery list — pinned: the per-serving dish math (the plan's
 * own numbers, run backwards to the shop), aggregation across plan
 * days and suggestions, categories from the data-layer classification
 * only, the honest edges (no plan, unknown dish, missing ingredient
 * data — named, never dropped), and the transparent pantry deduction
 * (recorded amounts deduct and show both numbers; unrecorded amounts
 * flag and deduct nothing). A real library dish against the real
 * USDA pool closes the suite: every line resolves, nothing unlisted.
 */

import { describe, expect, it } from "vitest";

import { findDish } from "@/lib/nutrition/data/dishLibrary";
import type { Dish } from "@/lib/nutrition/dishes";
import type { DailyPlan, PlanDish, PlanMeal, PlanSuggestion } from "@/lib/nutrition/plan";
import type { Food, FoodGroup } from "@/lib/nutrition/types";
import { USDA_REFERENCE_FOODS } from "@/lib/nutrition/usdaReference";
import {
  buildGroceryList,
  formatGramAmount,
  groceryCategoryForGroup,
  type GroceryListResult,
} from "./groceryList";
import type { PantryItem } from "./pantry";

/* ------------------------------- fixtures ------------------------------- */

const ZERO_NUTRIENTS = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };

function food(id: string, name: string, group?: FoodGroup): Food {
  const base: Food = {
    id,
    name,
    per100g: { kcal: 100, proteinG: 5, carbsG: 10, fatG: 2 },
    servings: [],
    provenance: { kind: "usda", sourceId: id, label: "USDA" },
  };
  if (!group) return base;
  return {
    ...base,
    classification: {
      group,
      containsEgg: group === "eggs",
      containsDairy: group === "dairy",
      isFlesh: false,
      isFish: false,
    },
  };
}

const RICE = food("f-rice", "Rice", "cereals_grains");
const SPINACH = food("f-spinach", "Spinach", "vegetables");
const MILK = food("f-milk", "Milk", "dairy");
const MYSTERY = food("f-mystery", "Grandma's mix");
const FOODS = [RICE, SPINACH, MILK, MYSTERY];

/** Makes 2 servings: 200 g rice + 100 g spinach in the whole recipe. */
const BOWL: Dish = {
  id: "dish-bowl",
  name: { en: "Rice bowl", hindi: "" },
  category: "main",
  servings: 2,
  lines: [
    { foodId: "f-rice", grams: 200 },
    { foodId: "f-spinach", grams: 100 },
  ],
  method: [],
  timeMinutes: 15,
  budgetTier: 1,
  enriched: false,
};

function planDish(dishId: string, name: string, servings = 1): PlanDish {
  return {
    dishId,
    name,
    hindi: "",
    role: "anchor",
    servings,
    nutrients: ZERO_NUTRIENTS,
    provenance: { kind: "recipe", sourceId: dishId, label: "recipe" },
  };
}

function suggestion(foodId: string, name: string, grams: number): PlanSuggestion {
  return {
    foodId,
    name,
    grams,
    nutrients: ZERO_NUTRIENTS,
    provenance: { kind: "usda", sourceId: foodId, label: "USDA" },
    layer: "topup",
  };
}

function meal(partial: Partial<PlanMeal>): PlanMeal {
  return { meal: "lunch", kcal: 0, proteinG: 0, dishes: [], suggestions: [], note: null, ...partial };
}

function planOf(day: string, meals: PlanMeal[]): DailyPlan {
  return { day, meals } as unknown as DailyPlan;
}

function pantryItem(partial: Partial<PantryItem>): PantryItem {
  return {
    id: "pantry-1",
    name: "Rice",
    foodId: null,
    quantityGrams: null,
    addedAt: "2026-11-18T05:00:00.000Z",
    ...partial,
  };
}

function ok(result: GroceryListResult) {
  if (result.status !== "ok") throw new Error("expected an ok result");
  return result;
}

function itemOf(result: GroceryListResult, foodId: string) {
  const found = ok(result)
    .groups.flatMap((g) => g.items)
    .find((item) => item.foodId === foodId);
  if (!found) throw new Error(`no grocery item for ${foodId}`);
  return found;
}

/* --------------------------------- tests -------------------------------- */

describe("buildGroceryList — the honest empty state", () => {
  it("no plan → no list, with the reason", () => {
    const result = buildGroceryList({ plans: [], dishes: [BOWL], foods: FOODS, pantry: [] });
    expect(result.status).toBe("no_plan");
    if (result.status === "no_plan") expect(result.reason).toMatch(/no plan yet/i);
  });

  it("a plan with nothing in it lists nothing and names nothing", () => {
    const result = ok(
      buildGroceryList({ plans: [planOf("2026-11-18", [meal({})])], dishes: [BOWL], foods: FOODS, pantry: [] }),
    );
    expect(result.totalItems).toBe(0);
    expect(result.groups).toEqual([]);
    expect(result.unlisted).toEqual([]);
  });
});

describe("buildGroceryList — the plan's math, backwards to the shop", () => {
  it("a dish's lines are scaled per serving, then by the plan's servings", () => {
    const one = buildGroceryList({
      plans: [planOf("2026-11-18", [meal({ dishes: [planDish("dish-bowl", "Rice bowl", 1)] })])],
      dishes: [BOWL],
      foods: FOODS,
      pantry: [],
    });
    expect(itemOf(one, "f-rice").neededGrams).toBe(100);
    expect(itemOf(one, "f-spinach").neededGrams).toBe(50);

    const two = buildGroceryList({
      plans: [planOf("2026-11-18", [meal({ dishes: [planDish("dish-bowl", "Rice bowl", 2)] })])],
      dishes: [BOWL],
      foods: FOODS,
      pantry: [],
    });
    expect(itemOf(two, "f-rice").neededGrams).toBe(200);
  });

  it("quantities sum across plan days and across dishes and suggestions", () => {
    const result = buildGroceryList({
      plans: [
        planOf("2026-11-18", [meal({ dishes: [planDish("dish-bowl", "Rice bowl")] })]),
        planOf("2026-11-19", [
          meal({
            meal: "dinner",
            dishes: [planDish("dish-bowl", "Rice bowl")],
            suggestions: [suggestion("f-rice", "Rice", 30), suggestion("f-milk", "Milk", 200)],
          }),
        ]),
      ],
      dishes: [BOWL],
      foods: FOODS,
      pantry: [],
    });
    expect(ok(result).days).toEqual(["2026-11-18", "2026-11-19"]);
    expect(itemOf(result, "f-rice").neededGrams).toBe(230);
    expect(itemOf(result, "f-spinach").neededGrams).toBe(100);
    expect(itemOf(result, "f-milk").neededGrams).toBe(200);
  });
});

describe("buildGroceryList — categories come from the food data, never a name", () => {
  it("maps every food group to its aisle", () => {
    expect(groceryCategoryForGroup("vegetables")).toBe("produce");
    expect(groceryCategoryForGroup("fruits")).toBe("produce");
    expect(groceryCategoryForGroup("dairy")).toBe("dairy_eggs");
    expect(groceryCategoryForGroup("eggs")).toBe("dairy_eggs");
    expect(groceryCategoryForGroup("cereals_grains")).toBe("pantry_staples");
    expect(groceryCategoryForGroup("pulses_legumes")).toBe("pantry_staples");
    expect(groceryCategoryForGroup("nuts_seeds")).toBe("pantry_staples");
    expect(groceryCategoryForGroup("fats_oils")).toBe("pantry_staples");
    expect(groceryCategoryForGroup("other")).toBe("other");
    expect(groceryCategoryForGroup(undefined)).toBe("other");
  });

  it("groups the list, unclassified foods in Other", () => {
    const result = ok(
      buildGroceryList({
        plans: [
          planOf("2026-11-18", [
            meal({
              dishes: [planDish("dish-bowl", "Rice bowl")],
              suggestions: [suggestion("f-milk", "Milk", 200), suggestion("f-mystery", "Grandma's mix", 50)],
            }),
          ]),
        ],
        dishes: [BOWL],
        foods: FOODS,
        pantry: [],
      }),
    );
    expect(result.groups.map((g) => g.category)).toEqual(["produce", "dairy_eggs", "pantry_staples", "other"]);
    expect(itemOf(result, "f-mystery").category).toBe("other");
  });
});

describe("buildGroceryList — what cannot be listed is named, never dropped", () => {
  it("a dish that is not in the library is named as unlisted", () => {
    const result = ok(
      buildGroceryList({
        plans: [planOf("2026-11-18", [meal({ dishes: [planDish("dish-gone", "Ghost curry")] })])],
        dishes: [BOWL],
        foods: FOODS,
        pantry: [],
      }),
    );
    expect(result.totalItems).toBe(0);
    expect(result.unlisted).toEqual([
      { name: "Ghost curry", where: "2026-11-18 · lunch", reason: expect.stringMatching(/not in the dish library/) },
    ]);
  });

  it("a dish line with no food data: known lines listed, the dish named for the rest", () => {
    const partial: Dish = {
      ...BOWL,
      id: "dish-partial",
      lines: [
        { foodId: "f-rice", grams: 200 },
        { foodId: "f-unknown", grams: 80 },
      ],
    };
    const result = ok(
      buildGroceryList({
        plans: [planOf("2026-11-18", [meal({ dishes: [planDish("dish-partial", "Rice bowl")] })])],
        dishes: [partial],
        foods: FOODS,
        pantry: [],
      }),
    );
    expect(itemOf(result, "f-rice").neededGrams).toBe(100);
    expect(result.unlisted).toHaveLength(1);
    expect(result.unlisted[0]).toMatchObject({ name: "Rice bowl" });
    expect(result.unlisted[0]!.reason).toMatch(/1 of this dish's ingredients have no food data/);
  });

  it("a suggestion whose food is not in the pool still lists — it carries its own name and grams", () => {
    const result = ok(
      buildGroceryList({
        plans: [planOf("2026-11-18", [meal({ suggestions: [suggestion("f-custom", "My protein mix", 40)] })])],
        dishes: [],
        foods: FOODS,
        pantry: [],
      }),
    );
    const item = itemOf(result, "f-custom");
    expect(item.name).toBe("My protein mix");
    expect(item.neededGrams).toBe(40);
    expect(item.category).toBe("other");
    expect(result.unlisted).toEqual([]);
  });
});

describe("buildGroceryList — the pantry deduction, in plain sight", () => {
  const ricePlan = () =>
    buildGroceryList({
      plans: [planOf("2026-11-18", [meal({ dishes: [planDish("dish-bowl", "Rice bowl")] })])],
      dishes: [BOWL],
      foods: FOODS,
      pantry: [
        pantryItem({ foodId: "f-rice", quantityGrams: 60 }),
      ],
    });

  it("a recorded amount deducts, and both numbers ride on the item", () => {
    const item = itemOf(ricePlan(), "f-rice");
    expect(item.neededGrams).toBe(100);
    expect(item.pantryGrams).toBe(60);
    expect(item.toBuyGrams).toBe(40);
    expect(item.pantryUnrecorded).toBe(false);
  });

  it("matches by name when the pantry item has no food id", () => {
    const result = buildGroceryList({
      plans: [planOf("2026-11-18", [meal({ dishes: [planDish("dish-bowl", "Rice bowl")] })])],
      dishes: [BOWL],
      foods: FOODS,
      pantry: [pantryItem({ name: "  rice ", quantityGrams: 25 })],
    });
    expect(itemOf(result, "f-rice").pantryGrams).toBe(25);
  });

  it("the pantry can cover an item entirely — never below zero", () => {
    const result = buildGroceryList({
      plans: [planOf("2026-11-18", [meal({ dishes: [planDish("dish-bowl", "Rice bowl")] })])],
      dishes: [BOWL],
      foods: FOODS,
      pantry: [pantryItem({ foodId: "f-rice", quantityGrams: 5000 })],
    });
    const item = itemOf(result, "f-rice");
    expect(item.pantryGrams).toBe(100);
    expect(item.toBuyGrams).toBe(0);
  });

  it("an unrecorded amount flags the line and deducts nothing", () => {
    const result = buildGroceryList({
      plans: [planOf("2026-11-18", [meal({ dishes: [planDish("dish-bowl", "Rice bowl")] })])],
      dishes: [BOWL],
      foods: FOODS,
      pantry: [pantryItem({ foodId: "f-rice", quantityGrams: null })],
    });
    const item = itemOf(result, "f-rice");
    expect(item.pantryUnrecorded).toBe(true);
    expect(item.pantryGrams).toBe(0);
    expect(item.toBuyGrams).toBe(100);
  });

  it("stock the plan does not need changes nothing", () => {
    const result = buildGroceryList({
      plans: [planOf("2026-11-18", [meal({ dishes: [planDish("dish-bowl", "Rice bowl")] })])],
      dishes: [BOWL],
      foods: FOODS,
      pantry: [pantryItem({ name: "Quinoa", quantityGrams: 900 })],
    });
    expect(itemOf(result, "f-rice").pantryGrams).toBe(0);
    expect(ok(result).totalItems).toBe(2);
  });
});

describe("buildGroceryList — real data: a library dish against the USDA pool", () => {
  it("every line of a real dish resolves; the amounts are the recipe's own", () => {
    const dal = findDish("dish-masoor-dal-tadka")!;
    const result = ok(
      buildGroceryList({
        plans: [planOf("2026-11-18", [meal({ dishes: [planDish(dal.id, dal.name.en)] })])],
        dishes: [dal],
        foods: USDA_REFERENCE_FOODS,
        pantry: [],
      }),
    );
    expect(result.unlisted).toEqual([]);
    expect(result.totalItems).toBe(new Set(dal.lines.map((l) => l.foodId)).size);
    for (const line of dal.lines) {
      const expected = Math.round((line.grams / dal.servings) * 1);
      expect(itemOf(result, line.foodId).neededGrams).toBe(expected);
    }
  });
});

describe("formatGramAmount", () => {
  it("grams under a kilo, kilos at and above it", () => {
    expect(formatGramAmount(250)).toBe("250 g");
    expect(formatGramAmount(999)).toBe("999 g");
    expect(formatGramAmount(1000)).toBe("1 kg");
    expect(formatGramAmount(1250)).toBe("1.25 kg");
    expect(formatGramAmount(1500)).toBe("1.5 kg");
  });
});
