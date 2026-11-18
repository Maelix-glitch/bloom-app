import { describe, expect, it } from "vitest";

import { DISH_LIBRARY, findDish } from "@/lib/nutrition/data/dishLibrary";
import { browseDishes, NO_DISH_FILTERS } from "@/lib/nutrition/dishBrowse";
import { dishNutrients, type Dish } from "@/lib/nutrition/dishes";
import type { Nutrients } from "@/lib/nutrition/types";
import {
  ADDED_SUGAR_FOODS,
  BLOOD_PRESSURE_SODIUM_LIMIT_MG,
  BLOOD_SUGAR_CARB_LIMIT_G,
  MODE_DEFINITIONS,
  addedSugarFoodsResolve,
  dishPassesModes,
  filterByModes,
  modeDefinition,
  modeExclusionsFor,
  modeHiddenCounts,
  parseModesValue,
} from "./modes";

const nutrientsOf = (dish: Dish): Nutrients => dishNutrients(dish).nutrients;

const BASE: Nutrients = { kcal: 400, proteinG: 20, carbsG: 40, fatG: 12 };

describe("mode definitions — only what the data can honestly support", () => {
  it("ships exactly the three modes, as data", () => {
    expect(MODE_DEFINITIONS.map((m) => m.id)).toEqual(["blood_sugar", "blood_pressure", "thyroid"]);
  });

  it("thyroid is information-only with zero rules — Bloom's data has no iodine or selenium", () => {
    const thyroid = modeDefinition("thyroid");
    expect(thyroid.informationOnly).toBe(true);
    expect(thyroid.rules).toEqual([]);
    expect(thyroid.dataNote).toMatch(/iodine/i);
    /* And it therefore excludes nothing, ever. */
    const dish = findDish("dish-intl-honey-garlic-salmon")!;
    expect(modeExclusionsFor(dish, nutrientsOf(dish), ["thyroid"])).toEqual([]);
    expect(dishPassesModes(dish, nutrientsOf(dish), ["thyroid"])).toBe(true);
  });

  it("the filtering modes state their limits in their rule lines", () => {
    expect(modeDefinition("blood_sugar").ruleLines.join(" ")).toContain(
      `${BLOOD_SUGAR_CARB_LIMIT_G} g of carbohydrate`,
    );
    expect(modeDefinition("blood_pressure").ruleLines.join(" ")).toContain(
      `${BLOOD_PRESSURE_SODIUM_LIMIT_MG} mg of sodium`,
    );
  });

  it("every added-sugar food id resolves in the reference set it names", () => {
    expect(addedSugarFoodsResolve()).toBe(true);
    expect(ADDED_SUGAR_FOODS.map((f) => f.name)).toEqual(["granulated sugar", "honey"]);
  });
});

describe("blood-sugar aware — ingredient identity and computed carbs, never sugar grams", () => {
  it("excludes a real dish with a honey line, and names honey as the reason", () => {
    const dish = findDish("dish-intl-honey-garlic-salmon")!;
    const exclusions = modeExclusionsFor(dish, nutrientsOf(dish), ["blood_sugar"]);
    const sugar = exclusions.find((e) => e.ruleId === "added-sugar-ingredient");
    expect(sugar).toBeDefined();
    expect(sugar!.modeId).toBe("blood_sugar");
    expect(sugar!.reason).toBe("Added sugar in the ingredients (honey)");
    expect(dishPassesModes(dish, nutrientsOf(dish), ["blood_sugar"])).toBe(false);
  });

  it("excludes a dish over the carb limit on its computed nutrients, naming the value", () => {
    const dish = findDish("dish-aloo-gobi")!;
    const exclusions = modeExclusionsFor(dish, { ...BASE, carbsG: 92 }, ["blood_sugar"]);
    expect(exclusions).toEqual([
      {
        modeId: "blood_sugar",
        ruleId: "carbs-per-serving",
        reason: `92 g of carbohydrate in a serving — over this mode's ${BLOOD_SUGAR_CARB_LIMIT_G} g limit`,
      },
    ]);
  });

  it("passes a plain dish with no sugar line and moderate carbs", () => {
    const dish = findDish("dish-aloo-gobi")!;
    expect(modeExclusionsFor(dish, nutrientsOf(dish), ["blood_sugar"])).toEqual([]);
  });
});

describe("blood-pressure aware — computed sodium, absence never judged", () => {
  it("excludes a dish over the sodium limit, naming the computed value", () => {
    const dish = findDish("dish-aloo-gobi")!;
    const exclusions = modeExclusionsFor(dish, { ...BASE, sodiumMg: 940 }, ["blood_pressure"]);
    expect(exclusions).toEqual([
      {
        modeId: "blood_pressure",
        ruleId: "sodium-per-serving",
        reason: `940 mg of sodium in a serving — over this mode's ${BLOOD_PRESSURE_SODIUM_LIMIT_MG} mg limit`,
      },
    ]);
  });

  it("never judges a dish whose sodium is absent — absent is not zero", () => {
    const dish = findDish("dish-aloo-gobi")!;
    const noSodium: Nutrients = { ...BASE };
    expect("sodiumMg" in noSodium).toBe(false);
    expect(modeExclusionsFor(dish, noSodium, ["blood_pressure"])).toEqual([]);
  });

  it("passes a dish under the limit", () => {
    const dish = findDish("dish-aloo-gobi")!;
    expect(modeExclusionsFor(dish, { ...BASE, sodiumMg: 320 }, ["blood_pressure"])).toEqual([]);
  });
});

describe("composition — a dish must pass pattern AND budget AND modes", () => {
  const plainEggRice: Dish = {
    id: "dish-test-plain-egg-rice",
    name: { en: "Plain Egg Rice (test)", hindi: "अंडा चावल" },
    category: "main",
    servings: 2,
    lines: [
      { foodId: "usda-171287", grams: 200 },
      { foodId: "usda-2512381", grams: 150 },
      { foodId: "usda-171025", grams: 20 },
    ],
    method: ["Cook."],
    timeMinutes: 15,
    budgetTier: 1,
    enriched: false,
  };
  const honeyEggRice: Dish = {
    ...plainEggRice,
    id: "dish-test-honey-egg-rice",
    name: { en: "Honey Egg Rice (test)", hindi: "शहद अंडा चावल" },
    lines: [...plainEggRice.lines, { foodId: "usda-169640", grams: 25 }],
  };

  it("pattern + budget admit both dishes; the mode layer then removes only the honey one", () => {
    const rows = browseDishes(
      { ...NO_DISH_FILTERS, pattern: "eggetarian", budgetTier: 1 },
      [plainEggRice, honeyEggRice],
    );
    expect(rows.map((r) => r.dish.id).sort()).toEqual([
      "dish-test-honey-egg-rice",
      "dish-test-plain-egg-rice",
    ]);
    const kept = filterByModes(
      rows.map((r) => ({ dish: r.dish, nutrients: r.labelled.nutrients })),
      ["blood_sugar"],
    );
    expect(kept.map((c) => c.dish.id)).toEqual(["dish-test-plain-egg-rice"]);
  });

  it("with no active modes the filter is the identity", () => {
    const candidates = [plainEggRice, honeyEggRice].map((dish) => ({
      dish,
      nutrients: nutrientsOf(dish),
    }));
    expect(filterByModes(candidates, [])).toEqual(candidates);
  });

  it("hidden counts over the real library are real, computable numbers", () => {
    const all = DISH_LIBRARY.map((dish) => ({ dish, nutrients: nutrientsOf(dish) }));
    const counts = modeHiddenCounts(all, ["blood_sugar", "blood_pressure", "thyroid"]);
    /* The library ground truth (2026-11-18): 98 dishes carry a sugar or
     * honey line; the carb rule hides more on top of those. */
    expect(counts.get("blood_sugar")!).toBeGreaterThanOrEqual(98);
    expect(counts.get("blood_sugar")!).toBeLessThan(DISH_LIBRARY.length);
    expect(counts.get("blood_pressure")!).toBeGreaterThan(0);
    expect(counts.get("blood_pressure")!).toBeLessThan(DISH_LIBRARY.length);
    expect(counts.get("thyroid")).toBe(0);
  });
});

describe("storage parsing — strict, unknown ids dropped", () => {
  it("round-trips a valid value and dedupes", () => {
    expect(parseModesValue({ version: 1, active: ["blood_sugar", "blood_sugar", "thyroid"] })).toEqual({
      version: 1,
      active: ["blood_sugar", "thyroid"],
    });
  });

  it("drops unknown mode ids rather than honouring them", () => {
    expect(parseModesValue({ version: 1, active: ["keto", "blood_pressure"] })).toEqual({
      version: 1,
      active: ["blood_pressure"],
    });
  });

  it("refuses malformed values", () => {
    expect(parseModesValue(null)).toBeNull();
    expect(parseModesValue("blood_sugar")).toBeNull();
    expect(parseModesValue({ version: 2, active: [] })).toBeNull();
    expect(parseModesValue({ version: 1, active: "blood_sugar" })).toBeNull();
  });
});
