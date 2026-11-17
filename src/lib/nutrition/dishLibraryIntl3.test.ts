import { describe, expect, it } from "vitest";

import { dishNutrients, validateDish } from "./dishes";
import { DISH_LIBRARY } from "./data/dishLibrary";
import { INTL3_DISHES } from "./data/dishLibraryIntl3";
import { USDA_REFERENCE_FOODS } from "./usdaReference";

/**
 * Wave X-3 — international high-protein dishes (Japanese, Korean,
 * Chinese, Thai, Vietnamese, Indonesian/Malaysian, American,
 * Mexican/Latin). The wave's hard bar: EVERY dish computes to at
 * least 25 g protein per serving via dishNutrients — computed from
 * the verified USDA ingredient lines, never asserted. Categories are
 * main and breakfast only; every dish carries cuisine "international".
 */
describe("wave X-3 international high-protein dishes", () => {
  it("ships 120–140 dishes", () => {
    expect(INTL3_DISHES.length).toBe(128);
    expect(INTL3_DISHES.length).toBeGreaterThanOrEqual(120);
    expect(INTL3_DISHES.length).toBeLessThanOrEqual(140);
  });

  it("every dish is international, main or breakfast only", () => {
    for (const dish of INTL3_DISHES) {
      expect(dish.cuisine, dish.id).toBe("international");
      expect(["main", "breakfast"], dish.id).toContain(dish.category);
    }
  });

  it("every dish clears the 25 g protein-per-serving bar, computed", () => {
    for (const dish of INTL3_DISHES) {
      const { nutrients } = dishNutrients(dish);
      expect(nutrients.proteinG, dish.id).toBeGreaterThanOrEqual(25);
    }
  });

  it("every dish validates clean", () => {
    for (const dish of INTL3_DISHES) {
      expect(validateDish(dish), dish.id).toEqual([]);
    }
  });

  it("ids are unique across the whole library", () => {
    const libraryIds = new Set(DISH_LIBRARY.map((d) => d.id));
    expect(libraryIds.size).toBe(DISH_LIBRARY.length);
    for (const dish of INTL3_DISHES) {
      expect(DISH_LIBRARY.filter((d) => d.id === dish.id).length, dish.id).toBe(1);
    }
  });

  it("every dish carries a Hindi name in Devanagari", () => {
    for (const dish of INTL3_DISHES) {
      expect(dish.name.hindi, dish.id).toMatch(/[ऀ-ॿ]/);
    }
  });

  it("no dish uses beef or pork (deliberate omission for this wave)", () => {
    // The verified set does contain beef/pork records from earlier
    // waves; this wave composes without them, so a line resolving to
    // a beef or pork food fails loudly here.
    const nameById = new Map(USDA_REFERENCE_FOODS.map((f) => [f.id, f.name]));
    for (const dish of INTL3_DISHES) {
      for (const line of dish.lines) {
        expect(nameById.get(line.foodId) ?? "", `${dish.id} -> ${line.foodId}`).not.toMatch(
          /beef|pork|bacon|\bham\b/i,
        );
      }
    }
  });
});
