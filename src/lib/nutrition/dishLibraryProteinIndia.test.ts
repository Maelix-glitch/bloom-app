import { describe, expect, it } from "vitest";

import {
  computeBudgetTier,
  dishNutrients,
  dishPatterns,
  parseDishList,
  validateDish,
} from "./dishes";
import { DISH_LIBRARY } from "./data/dishLibrary";
import { PROTEIN_INDIA_DISHES } from "./data/dishLibraryProteinIndia";
import { USDA_REFERENCE_FOODS } from "./usdaReference";

/**
 * Wave PW-3 — high-protein Indian and Kerala MAINS. The wave's hard
 * bar: EVERY dish computes to at least 25 g protein per serving via
 * dishNutrients — computed from the verified USDA ingredient lines,
 * never asserted. Vegetarian and eggetarian mains dominate (the
 * owner's own pattern is eggetarian): 56 of the 75 suit an eggetarian
 * pattern, 21 are fully vegan; the remaining 19 are fish, prawn,
 * chicken and lamb classics for other patterns. Every dish is a
 * "main"; cuisine splits 50 india / 25 kerala.
 */
describe("wave PW-3 protein India & Kerala mains", () => {
  it("ships exactly 75 dishes — 50 india, 25 kerala, all mains", () => {
    expect(PROTEIN_INDIA_DISHES.length).toBe(75);
    const byCuisine = { india: 0, kerala: 0 };
    for (const dish of PROTEIN_INDIA_DISHES) {
      expect(dish.category, dish.id).toBe("main");
      expect(["india", "kerala"], dish.id).toContain(dish.cuisine);
      byCuisine[dish.cuisine as "india" | "kerala"] += 1;
    }
    expect(byCuisine).toEqual({ india: 50, kerala: 25 });
  });

  it("every dish clears the 25 g protein-per-serving bar, computed", () => {
    for (const dish of PROTEIN_INDIA_DISHES) {
      const { nutrients } = dishNutrients(dish);
      expect(nutrients.proteinG, dish.id).toBeGreaterThanOrEqual(25);
    }
  });

  it("every dish validates clean, and every line names a verified food", () => {
    const known = new Set(USDA_REFERENCE_FOODS.map((f) => f.id));
    for (const dish of PROTEIN_INDIA_DISHES) {
      expect(validateDish(dish), dish.id).toEqual([]);
      for (const line of dish.lines) {
        expect(known.has(line.foodId), `${dish.id} -> ${line.foodId}`).toBe(true);
      }
    }
  });

  it("budget tiers are the computed tiers, never authored numbers", () => {
    for (const dish of PROTEIN_INDIA_DISHES) {
      expect(dish.budgetTier, dish.id).toBe(computeBudgetTier(dish));
    }
  });

  it("every dish survives the parse round-trip, wave on its own", () => {
    for (const dish of PROTEIN_INDIA_DISHES) {
      expect(parseDishList([dish]), dish.id).toEqual([dish]);
    }
    // Round-trip the wave on its own: parseDishList caps a list at
    // MAX_DISHES (1000) and the whole library is now past that.
    const roundTripped = parseDishList(JSON.parse(JSON.stringify(PROTEIN_INDIA_DISHES)));
    expect(roundTripped).toEqual(PROTEIN_INDIA_DISHES);
  });

  it("ids are unique across the whole library", () => {
    const libraryIds = new Set(DISH_LIBRARY.map((d) => d.id));
    expect(libraryIds.size).toBe(DISH_LIBRARY.length);
    for (const dish of PROTEIN_INDIA_DISHES) {
      expect(DISH_LIBRARY.filter((d) => d.id === dish.id).length, dish.id).toBe(1);
    }
  });

  it("no dish duplicates an existing dish by normalised name", () => {
    /* The library already carries many paneer, dal and egg curries;
       this wave was audited against the duplicate-dishes report.
       Normalisation: NFKD, diacritics stripped, parentheticals
       stripped, case- and punctuation-insensitive — so "Soya Pepper
       Fry (Kerala)" must still not collide with any plain "Soya
       Pepper Fry" already on the shelf, here or anywhere else. */
    const normalise = (name: string) =>
      name
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/\([^)]*\)/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
    const waveIds = new Set(PROTEIN_INDIA_DISHES.map((d) => d.id));
    const taken = new Map<string, string>();
    for (const dish of DISH_LIBRARY) {
      if (waveIds.has(dish.id)) continue;
      taken.set(normalise(dish.name.en), dish.id);
    }
    const seen = new Set<string>();
    for (const dish of PROTEIN_INDIA_DISHES) {
      const key = normalise(dish.name.en);
      expect(taken.get(key), `${dish.id} collides with ${taken.get(key)}`).toBeUndefined();
      expect(seen.has(key), `${dish.id} duplicates a wave-mate`).toBe(false);
      seen.add(key);
    }
  });

  it("every dish carries a Hindi name in Devanagari", () => {
    for (const dish of PROTEIN_INDIA_DISHES) {
      expect(dish.name.hindi, dish.id).toMatch(/[ऀ-ॿ]/);
    }
  });

  it("methods run 6–10 steps each", () => {
    for (const dish of PROTEIN_INDIA_DISHES) {
      expect(dish.method.length, dish.id).toBeGreaterThanOrEqual(6);
      expect(dish.method.length, dish.id).toBeLessThanOrEqual(10);
    }
  });

  it("vegetarian and eggetarian mains dominate, as the mandate requires", () => {
    const suits = (p: string) =>
      PROTEIN_INDIA_DISHES.filter((d) => dishPatterns(d).includes(p as never)).length;
    /* Suitability falls out of the ingredients: 21 vegan, 37 suiting
       a vegetarian pattern, 56 suiting eggetarian — the flesh and
       fish classics are the remaining 19, never the majority. */
    expect(suits("vegan")).toBe(21);
    expect(suits("vegetarian")).toBe(37);
    expect(suits("eggetarian")).toBe(56);
    expect(suits("eggetarian")).toBeGreaterThanOrEqual(55);
  });

  it("no dish uses beef or pork (the library's standing precedent)", () => {
    const nameById = new Map(USDA_REFERENCE_FOODS.map((f) => [f.id, f.name]));
    for (const dish of PROTEIN_INDIA_DISHES) {
      for (const line of dish.lines) {
        expect(nameById.get(line.foodId) ?? "", `${dish.id} -> ${line.foodId}`).not.toMatch(
          /beef|pork|bacon|\bham\b/i,
        );
      }
    }
  });
});
