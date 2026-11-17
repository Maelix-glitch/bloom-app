/**
 * P7 learning pass — unit pins for the signals themselves:
 * acceptance counts only dish entries inside the window, a served
 * dish is deprioritised only when the log truly never took it up,
 * a micronutrient gap needs reporting days (not wishes), portions
 * speak only as a signal, and an empty log teaches nothing at all.
 */

import { describe, expect, it } from "vitest";

import { findDish } from "./data/dishLibrary";
import { createDishEntry } from "./dishLog";
import {
  dishAcceptanceFor,
  microGapsFor,
  offeredButUnloggedFor,
  planLearningFor,
  portionSignalsFor,
} from "./planAdaptation";
import type { DailyPlan, PlanDish } from "./plan";
import type { LogEntry, Nutrients } from "./types";

const DAY = "2026-11-18";
const TARGETS = { kcal: 3288, proteinG: 220 };

let seq = 0;
function foodEntry(
  day: string,
  nutrients: Nutrients,
  foodId: string | null = null,
  grams = 100,
): LogEntry {
  seq += 1;
  return {
    id: `e-${seq}`,
    day,
    meal: "lunch",
    foodId,
    snapshot: null,
    name: foodId ?? "logged",
    amount: { grams },
    nutrients,
    provenance: { kind: "user_entered", sourceId: "fixture", label: "Your value" },
    source: "search",
    createdAt: `${day}T12:00:00.000Z`,
  };
}

function dishEntry(day: string, dishId: string): LogEntry {
  const dish = findDish(dishId);
  if (!dish) throw new Error(`unknown dish ${dishId}`);
  const entry = createDishEntry({ dish, meal: "lunch", day, now: `${day}T12:00:00.000Z` });
  if (!entry) throw new Error(`dish entry refused for ${dishId}`);
  return entry;
}

const planDish = (dishId: string, name: string): PlanDish => ({
  dishId,
  name,
  hindi: "",
  role: "anchor",
  servings: 1,
  nutrients: { kcal: 400, proteinG: 30, carbsG: 0, fatG: 0 },
  provenance: { kind: "recipe", sourceId: dishId, label: "Built from USDA ingredient data" },
});

function storedPlan(
  day: string,
  dishes: PlanDish[],
  suggestionGrams = 0,
  foodId = "f-1",
): DailyPlan {
  return {
    day,
    meals: [
      {
        meal: "lunch",
        kcal: 0,
        proteinG: 0,
        dishes,
        suggestions:
          suggestionGrams > 0
            ? [
                {
                  foodId,
                  name: "Fixture food",
                  grams: suggestionGrams,
                  nutrients: { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
                  provenance: { kind: "usda", sourceId: foodId, label: "USDA" },
                },
              ]
            : [],
        note: null,
      },
    ],
  } as unknown as DailyPlan;
}

describe("dishAcceptanceFor", () => {
  it("counts dish entries inside the 28-day window only", () => {
    const entries = [
      dishEntry("2026-11-17", "dish-intl-tempeh-taco-cups"),
      dishEntry("2026-11-10", "dish-intl-tempeh-taco-cups"),
      dishEntry("2026-10-21", "dish-intl-tempeh-taco-cups"), // exactly 28 days back: in
      dishEntry("2026-10-20", "dish-intl-tempeh-taco-cups"), // 29 days back: out
      dishEntry("2026-11-18", "dish-intl-tempeh-taco-cups"), // the plan day itself: out
      dishEntry("2026-11-15", "dish-intl-menemen"),
      foodEntry("2026-11-16", { kcal: 500, proteinG: 20, carbsG: 0, fatG: 0 }),
    ];
    const acceptance = dishAcceptanceFor(entries, DAY);
    expect(acceptance).toEqual([
      { dishId: "dish-intl-tempeh-taco-cups", name: "Tempeh Taco Cabbage Cups", count: 3 },
      { dishId: "dish-intl-menemen", name: "Menemen with Mozzarella", count: 1 },
    ]);
  });
});

describe("offeredButUnloggedFor", () => {
  const plan = storedPlan("2026-11-16", [
    planDish("dish-x", "X Dish"),
    planDish("dish-y", "Y Dish"),
    planDish("dish-z", "Z Dish"),
  ]);

  it("names only the served dish the log never took up", () => {
    const entries = [
      dishEntryRaw("2026-11-16", "dish-y", "Y Dish"), // logged on the plan day
      dishEntryRaw("2026-11-05", "dish-z", "Z Dish"), // logged inside the window
    ];
    expect(offeredButUnloggedFor(entries, plan, DAY)).toEqual([
      { dishId: "dish-x", name: "X Dish" },
    ]);
  });

  it("a same-day stored plan is not a skipped cycle", () => {
    expect(offeredButUnloggedFor([], storedPlan(DAY, [planDish("dish-x", "X Dish")]), DAY)).toEqual(
      [],
    );
  });

  it("no stored plan, no signal", () => {
    expect(offeredButUnloggedFor([], null, DAY)).toEqual([]);
  });
});

/** A dish entry for an id outside the library (the X/Y/Z fixtures). */
function dishEntryRaw(day: string, dishId: string, name: string): LogEntry {
  seq += 1;
  return {
    id: `e-${seq}`,
    day,
    meal: "lunch",
    foodId: null,
    snapshot: { name, totals: { kcal: 400, proteinG: 30, carbsG: 0, fatG: 0 } },
    name,
    amount: { servings: 1, servingLabel: "1 serving" },
    nutrients: { kcal: 400, proteinG: 30, carbsG: 0, fatG: 0 },
    provenance: { kind: "recipe", sourceId: dishId, label: "Built from USDA ingredient data" },
    source: "dish",
    createdAt: `${day}T12:00:00.000Z`,
  };
}

describe("microGapsFor", () => {
  const ironPoor = (day: string) =>
    foodEntry(day, { kcal: 2000, proteinG: 150, carbsG: 0, fatG: 0, ironMg: 2 });
  const sevenDays = [
    "2026-11-11",
    "2026-11-12",
    "2026-11-13",
    "2026-11-14",
    "2026-11-15",
    "2026-11-16",
    "2026-11-17",
  ].map(ironPoor);

  it("finds the persistent gap with its real average and reference", () => {
    const gaps = microGapsFor(sevenDays, DAY, "male");
    const iron = gaps.find((g) => g.key === "ironMg");
    expect(iron).toMatchObject({ label: "Iron", reference: 19, avg: 2, days: 7 });
    expect(iron!.coverage).toBeCloseTo(2 / 19);
  });

  it("uses the sex-specific reference", () => {
    const iron = microGapsFor(sevenDays, DAY, "female").find((g) => g.key === "ironMg");
    expect(iron?.reference).toBe(29);
  });

  it("three logged days are an anecdote, not a gap", () => {
    expect(microGapsFor(sevenDays.slice(0, 3), DAY, "male")).toEqual([]);
  });

  it("a nutrient no food reported is never claimed as a gap", () => {
    const gaps = microGapsFor(sevenDays, DAY, "male");
    expect(gaps.some((g) => g.key === "vitaminCMg")).toBe(false);
    expect(gaps.some((g) => g.key === "sodiumMg")).toBe(false);
  });
});

describe("portionSignalsFor", () => {
  const plan = storedPlan("2026-11-17", [], 200, "f-1");
  const logAt = (day: string, grams: number) =>
    foodEntry(day, { kcal: 300, proteinG: 10, carbsG: 0, fatG: 0 }, "f-1", grams);

  it("names the divergence with both numbers", () => {
    const entries = [logAt("2026-11-15", 100), logAt("2026-11-16", 110), logAt("2026-11-17", 90)];
    expect(portionSignalsFor(entries, plan, DAY)).toEqual([
      { foodId: "f-1", name: "f-1", plannedGrams: 200, typicalGrams: 100, logs: 3 },
    ]);
  });

  it("portions near the plan's are not a signal", () => {
    const entries = [logAt("2026-11-15", 190), logAt("2026-11-16", 210)];
    expect(portionSignalsFor(entries, plan, DAY)).toEqual([]);
  });

  it("one log is not a pattern", () => {
    expect(portionSignalsFor([logAt("2026-11-16", 80)], plan, DAY)).toEqual([]);
  });
});

describe("planLearningFor", () => {
  it("an empty log teaches nothing", () => {
    expect(planLearningFor([], DAY, TARGETS)).toBeNull();
  });

  it("a repeated dish leads, with the count in the note", () => {
    const entries = [
      dishEntry("2026-11-12", "dish-intl-tempeh-taco-cups"),
      dishEntry("2026-11-14", "dish-intl-tempeh-taco-cups"),
      dishEntry("2026-11-16", "dish-intl-tempeh-taco-cups"),
    ];
    const learning = planLearningFor(entries, DAY, TARGETS);
    expect(learning?.favouredDishes).toEqual([
      { dishId: "dish-intl-tempeh-taco-cups", name: "Tempeh Taco Cabbage Cups", count: 3 },
    ]);
    expect(
      learning?.notes.some((n) => n.includes("Tempeh Taco Cabbage Cups (logged 3 times)")),
    ).toBe(true);
  });

  it("the same inputs give the same learning, object for object", () => {
    const entries = [
      dishEntry("2026-11-12", "dish-intl-tempeh-taco-cups"),
      dishEntry("2026-11-14", "dish-intl-tempeh-taco-cups"),
    ];
    expect(planLearningFor(entries, DAY, TARGETS)).toEqual(planLearningFor(entries, DAY, TARGETS));
  });
});
