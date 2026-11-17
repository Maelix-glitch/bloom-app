import { describe, expect, it } from "vitest";

import {
  dishNutrients,
  dishPatterns,
  parseDishList,
  validateDish,
} from "./dishes";
import { DISH_LIBRARY } from "./data/dishLibrary";
import { INTL4_DISHES } from "./data/dishLibraryIntl4";
import { USDA_REFERENCE_FOODS } from "./usdaReference";

/**
 * Wave X-4 — international high-protein dishes (Central & Eastern
 * Europe, the Nordics, Britain & Ireland, Central Asia & the
 * Caucasus, Africa, the Caribbean, and Argentina/Chile/Colombia/
 * Venezuela). The wave's hard bar: EVERY dish computes to at least
 * 25 g protein per serving via dishNutrients — computed from the
 * verified USDA ingredient lines, never asserted. Categories are
 * main and breakfast only; every dish carries cuisine
 * "international".
 */
describe("wave X-4 international high-protein dishes", () => {
  it("ships 135–145 dishes", () => {
    expect(INTL4_DISHES.length).toBe(138);
    expect(INTL4_DISHES.length).toBeGreaterThanOrEqual(135);
    expect(INTL4_DISHES.length).toBeLessThanOrEqual(145);
  });

  it("every dish is international, main or breakfast only", () => {
    for (const dish of INTL4_DISHES) {
      expect(dish.cuisine, dish.id).toBe("international");
      expect(["main", "breakfast"], dish.id).toContain(dish.category);
    }
  });

  it("every dish clears the 25 g protein-per-serving bar, computed", () => {
    for (const dish of INTL4_DISHES) {
      const { nutrients } = dishNutrients(dish);
      expect(nutrients.proteinG, dish.id).toBeGreaterThanOrEqual(25);
    }
  });

  it("every dish validates clean and survives the strict parser unchanged", () => {
    for (const dish of INTL4_DISHES) {
      expect(validateDish(dish), dish.id).toEqual([]);
      expect(parseDishList([dish]), dish.id).toEqual([dish]);
      expect(dishPatterns(dish).length, dish.id).toBeGreaterThanOrEqual(1);
    }
    const roundTripped = parseDishList(JSON.parse(JSON.stringify(INTL4_DISHES)));
    expect(roundTripped).toEqual(INTL4_DISHES);
  });

  it("ids are unique across the whole library", () => {
    const libraryIds = new Set(DISH_LIBRARY.map((d) => d.id));
    expect(libraryIds.size).toBe(DISH_LIBRARY.length);
    for (const dish of INTL4_DISHES) {
      expect(DISH_LIBRARY.filter((d) => d.id === dish.id).length, dish.id).toBe(1);
    }
  });

  it("every dish carries a Hindi name in Devanagari", () => {
    for (const dish of INTL4_DISHES) {
      expect(dish.name.hindi, dish.id).toMatch(/[ऀ-ॿ]/);
    }
  });

  it("writes a detailed method on every dish (6-10 steps)", () => {
    for (const dish of INTL4_DISHES) {
      expect(dish.method.length, dish.id).toBeGreaterThanOrEqual(6);
      expect(dish.method.length, dish.id).toBeLessThanOrEqual(10);
    }
  });

  it("no dish uses beef or pork (deliberate omission for this wave)", () => {
    // The verified set does contain beef/pork records from earlier
    // waves; this wave composes without them, so a line resolving to
    // a beef or pork food fails loudly here.
    const nameById = new Map(USDA_REFERENCE_FOODS.map((f) => [f.id, f.name]));
    for (const dish of INTL4_DISHES) {
      for (const line of dish.lines) {
        expect(nameById.get(line.foodId) ?? "", `${dish.id} -> ${line.foodId}`).not.toMatch(
          /beef|pork|bacon|\bham\b/i,
        );
      }
    }
  });

  it("keeps portions inside the sanity caps a real serving respects", () => {
    const groupByFoodId = new Map(
      USDA_REFERENCE_FOODS.map((f) => [f.id, f.classification?.group]),
    );
    const freshSoyIds = new Set(["usda-172448", "usda-174272", "usda-168410"]);
    for (const dish of INTL4_DISHES) {
      const kcal = dishNutrients(dish).nutrients.kcal;
      expect(kcal, `${dish.id} kcal/serving`).toBeGreaterThanOrEqual(150);
      expect(kcal, `${dish.id} kcal/serving`).toBeLessThanOrEqual(750);
      for (const line of dish.lines) {
        const perServing = line.grams / dish.servings;
        const group = groupByFoodId.get(line.foodId);
        if (group === "vegetables")
          expect(perServing, `${dish.id} single vegetable`).toBeLessThanOrEqual(250);
        if (group === "fats_oils")
          expect(perServing, `${dish.id} oil`).toBeLessThanOrEqual(15);
        if (group === "pulses_legumes" && !freshSoyIds.has(line.foodId))
          expect(perServing, `${dish.id} dry pulses`).toBeLessThanOrEqual(120);
      }
    }
  });
});
