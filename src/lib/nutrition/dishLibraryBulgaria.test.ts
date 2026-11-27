import { describe, expect, it } from "vitest";

import {
  dishPatterns,
  parseDishList,
  validateDish,
} from "./dishes";
import { DISH_LIBRARY } from "./data/dishLibrary";
import { BULGARIA_DISHES } from "./data/dishLibraryBulgaria";
import { USDA_REFERENCE_FOODS } from "./usdaReference";

/**
 * The Bulgarian wave (2026-11-26, owner ask): the classic Bulgarian
 * table across the full category range — salads and spreads, chorba
 * soups, clay-pot stews, the grill, banitsa, desserts and drinks.
 * Composed from the same verified foods as the rest of the library,
 * with the wave's stand-ins stated in the data file's header (sirene
 * through cottage cheese, Bulgarian yogurt through the set's yogurts,
 * dill and parsley through coriander leaves, leeks through onion,
 * hand-rolled sheets for filo, sweet potato for the tikvenik's
 * pumpkin) and the programme's standing rules kept: no beef and no
 * pork anywhere, so the grill and mince dishes are lamb and turkey
 * and name their meat.
 */
describe("the Bulgarian wave", () => {
  it("ships 52 dishes", () => {
    expect(BULGARIA_DISHES.length).toBe(52);
  });

  it("every dish carries cuisine international", () => {
    for (const dish of BULGARIA_DISHES) {
      expect(dish.cuisine, dish.id).toBe("international");
    }
  });

  it("spans the wave's category range", () => {
    const categories = new Set(BULGARIA_DISHES.map((d) => d.category));
    for (const category of [
      "main",
      "side",
      "chutney",
      "breakfast",
      "bread",
      "dessert",
      "drink",
      "snack",
    ] as const) {
      expect(categories.has(category), category).toBe(true);
    }
  });

  it("every dish validates clean and survives the strict parser unchanged", () => {
    for (const dish of BULGARIA_DISHES) {
      expect(validateDish(dish), dish.id).toEqual([]);
      expect(parseDishList([dish]), dish.id).toEqual([dish]);
      expect(dishPatterns(dish).length, dish.id).toBeGreaterThanOrEqual(1);
    }
    const roundTripped = parseDishList(JSON.parse(JSON.stringify(BULGARIA_DISHES)));
    expect(roundTripped).toEqual(BULGARIA_DISHES);
  });

  it("ids are unique across the whole library", () => {
    const libraryIds = new Set(DISH_LIBRARY.map((d) => d.id));
    expect(libraryIds.size).toBe(DISH_LIBRARY.length);
    for (const dish of BULGARIA_DISHES) {
      expect(DISH_LIBRARY.filter((d) => d.id === dish.id).length, dish.id).toBe(1);
    }
  });

  it("every dish carries a Hindi name in Devanagari", () => {
    for (const dish of BULGARIA_DISHES) {
      expect(dish.name.hindi, dish.id).toMatch(/[ऀ-ॿ]/);
    }
  });

  it("writes a detailed method on every dish (6-10 steps)", () => {
    for (const dish of BULGARIA_DISHES) {
      expect(dish.method.length, dish.id).toBeGreaterThanOrEqual(6);
      expect(dish.method.length, dish.id).toBeLessThanOrEqual(10);
    }
  });

  it("no dish uses beef or pork (deliberate exclusion, as in every wave)", () => {
    const nameById = new Map(USDA_REFERENCE_FOODS.map((f) => [f.id, f.name]));
    for (const dish of BULGARIA_DISHES) {
      for (const line of dish.lines) {
        expect(nameById.get(line.foodId) ?? "", `${dish.id} -> ${line.foodId}`).not.toMatch(
          /beef|pork|bacon|\bham\b/i,
        );
      }
    }
  });

  it("covers every dietary pattern across the wave, derived not claimed", () => {
    const suited = (pattern: string) =>
      BULGARIA_DISHES.filter((d) => (dishPatterns(d) as readonly string[]).includes(pattern)).length;
    expect(suited("vegan")).toBeGreaterThan(0);
    expect(suited("vegetarian")).toBeGreaterThan(0);
    expect(suited("eggetarian")).toBeGreaterThan(0);
    // Non-veg dishes exist in the wave: dishes whose ONLY suited
    // pattern is non_vegetarian carry flesh or fish.
    const fleshOnly = BULGARIA_DISHES.filter(
      (d) => dishPatterns(d).length === 1 && dishPatterns(d)[0] === "non_vegetarian",
    );
    expect(fleshOnly.length).toBeGreaterThan(0);
  });
});
