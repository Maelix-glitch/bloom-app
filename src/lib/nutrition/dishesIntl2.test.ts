import { describe, expect, it } from "vitest";

import { INTL2_DISHES } from "./data/dishLibraryIntl2";
import { DISH_LIBRARY } from "./data/dishLibrary";
import {
  dishNutrients,
  dishPatterns,
  parseDishList,
  validateDish,
} from "./dishes";

/**
 * The international wave X-2 (Mediterranean, European, Middle Eastern).
 * The wave's defining rule is the owner's high-protein bar for
 * outside-India dishes: EVERY dish must compute — through
 * `dishNutrients`, the only way a dish's numbers exist — to at least
 * 25 g of protein per serving. Nothing here asserts a protein value;
 * each dish's lines are summed and the sum is held against the bar.
 */
describe("the international X-2 library", () => {
  it("holds 120-140 dishes, every one a main or a breakfast", () => {
    expect(INTL2_DISHES.length).toBeGreaterThanOrEqual(120);
    expect(INTL2_DISHES.length).toBeLessThanOrEqual(140);
    for (const dish of INTL2_DISHES) {
      expect(["main", "breakfast"], dish.id).toContain(dish.category);
    }
  });

  it("clears the 25 g protein bar on every dish, computed not asserted", () => {
    for (const dish of INTL2_DISHES) {
      const { nutrients } = dishNutrients(dish);
      expect(nutrients.proteinG, dish.id).toBeGreaterThanOrEqual(25);
    }
  });

  it("every dish is tagged cuisine: international", () => {
    for (const dish of INTL2_DISHES) {
      expect(dish.cuisine, dish.id).toBe("international");
    }
  });

  it("every dish validates clean and survives the strict parser unchanged", () => {
    for (const dish of INTL2_DISHES) {
      expect(validateDish(dish), dish.id).toEqual([]);
      expect(parseDishList([dish]), dish.id).toEqual([dish]);
      expect(dishPatterns(dish).length, dish.id).toBeGreaterThanOrEqual(1);
    }
  });

  it("uses no beef and no pork line anywhere", () => {
    const banned = new Set(["usda-168608", "usda-2514745", "usda-2646168"]);
    for (const dish of INTL2_DISHES) {
      for (const line of dish.lines) {
        expect(banned.has(line.foodId), `${dish.id}: ${line.foodId}`).toBe(false);
      }
    }
  });

  it("has unique ids, none colliding with the rest of the library", () => {
    const waveIds = new Set(INTL2_DISHES.map((d) => d.id));
    expect(waveIds.size).toBe(INTL2_DISHES.length);
    const libraryIds = DISH_LIBRARY.map((d) => d.id);
    expect(new Set(libraryIds).size).toBe(libraryIds.length);
    for (const dish of INTL2_DISHES) {
      expect(DISH_LIBRARY, dish.id).toContain(dish);
    }
  });

  it("carries a Hindi name in Devanagari on every dish", () => {
    for (const dish of INTL2_DISHES) {
      expect(dish.name.hindi, dish.id).toMatch(/[ऀ-ॿ]/);
    }
  });

  it("writes a detailed method on every dish (6-10 steps)", () => {
    for (const dish of INTL2_DISHES) {
      expect(dish.method.length, dish.id).toBeGreaterThanOrEqual(6);
      expect(dish.method.length, dish.id).toBeLessThanOrEqual(10);
    }
  });
});
