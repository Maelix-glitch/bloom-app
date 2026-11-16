import { describe, expect, it } from "vitest";

import {
  DISH_CATEGORIES,
  dishNutrients,
  dishPatterns,
  validateDish,
} from "./dishes";
import { DISH_LIBRARY, findDish } from "./data/dishLibrary";

/**
 * The assembled library (D2): the owner's 200+ dish bar, with the whole
 * library held to the D1 integrity rules at once — unique ids, every
 * dish valid, every dish's numbers computable, every pattern served.
 */
describe("the dish library", () => {
  it("clears the owner's 200-dish bar", () => {
    expect(DISH_LIBRARY.length).toBe(492);
    expect(DISH_LIBRARY.length).toBeGreaterThanOrEqual(200);
  });

  it("has unique ids, and findDish resolves them", () => {
    const ids = new Set(DISH_LIBRARY.map((d) => d.id));
    expect(ids.size).toBe(DISH_LIBRARY.length);
    for (const dish of DISH_LIBRARY) {
      expect(findDish(dish.id)).toBe(dish);
    }
    expect(findDish("dish-no-such-dish")).toBeNull();
  });

  it("every dish validates clean and computes finite nutrients", () => {
    for (const dish of DISH_LIBRARY) {
      expect(validateDish(dish), dish.id).toEqual([]);
      const { nutrients } = dishNutrients(dish);
      expect(Number.isFinite(nutrients.kcal), dish.id).toBe(true);
      expect(nutrients.kcal, dish.id).toBeGreaterThan(0);
    }
  });

  it("every dish carries a Hindi name in Devanagari", () => {
    for (const dish of DISH_LIBRARY) {
      expect(dish.name.hindi, dish.id).toMatch(/[ऀ-ॿ]/);
      expect(dish.name.en.length, dish.id).toBeGreaterThan(2);
    }
  });

  it("covers every category", () => {
    for (const category of DISH_CATEGORIES) {
      const count = DISH_LIBRARY.filter((d) => d.category === category).length;
      expect(count, category).toBeGreaterThanOrEqual(5);
    }
  });

  it("serves every dietary pattern properly, not just one", () => {
    const suits = (p: string) =>
      DISH_LIBRARY.filter((d) => dishPatterns(d).includes(p as never)).length;
    expect(suits("vegan")).toBeGreaterThanOrEqual(100);
    expect(suits("vegetarian")).toBeGreaterThanOrEqual(190);
    expect(suits("eggetarian")).toBeGreaterThanOrEqual(200);
    expect(suits("ovo_vegetarian")).toBeGreaterThanOrEqual(100);
    expect(suits("pescatarian")).toBeGreaterThanOrEqual(200);
    // The flesh core: dishes no vegetarian pattern admits (meat, poultry
    // and fish — fish dishes also suit pescatarian by design).
    const fleshCore = DISH_LIBRARY.filter((d) => !dishPatterns(d).includes("vegetarian"));
    expect(fleshCore.length).toBeGreaterThanOrEqual(25);
    const meatOnly = DISH_LIBRARY.filter((d) => {
      const patterns = dishPatterns(d);
      return patterns.length === 1 && patterns[0] === "non_vegetarian";
    });
    expect(meatOnly.length).toBeGreaterThanOrEqual(10);
    // And every dish suits at least one pattern.
    for (const dish of DISH_LIBRARY) {
      expect(dishPatterns(dish).length, dish.id).toBeGreaterThanOrEqual(1);
    }
  });

  it("carries a real enriched set, each stating its boost", () => {
    const enriched = DISH_LIBRARY.filter((d) => d.enriched);
    expect(enriched.length).toBeGreaterThanOrEqual(20);
    for (const dish of enriched) {
      expect(dish.enrichment, dish.id).toBeTruthy();
    }
  });
});
