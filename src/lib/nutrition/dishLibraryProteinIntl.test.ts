import { describe, expect, it } from "vitest";

import {
  dishNutrients,
  dishPatterns,
  parseDishList,
  validateDish,
} from "./dishes";
import { DISH_LIBRARY } from "./data/dishLibrary";
import { PROTEIN_INTL_DISHES } from "./data/dishLibraryProteinIntl";
import { USDA_REFERENCE_FOODS } from "./usdaReference";

/**
 * Wave PW-4 — protein wave: international high-protein mains from
 * the cuisines and preparations X-1..X-4 did not reach. The wave's
 * hard bar: EVERY dish computes to at least 25 g protein per serving
 * via dishNutrients — computed from the verified USDA ingredient
 * lines, never asserted. Every dish is category "main" and cuisine
 * "international", and — the wave's novelty discipline, after the
 * duplicate audit found 29 collision groups across earlier waves —
 * no dish's normalised name may collide with any other dish in the
 * library.
 */

/** Lowercase, strip diacritics and punctuation, drop parentheticals. */
function normalisedName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

describe("wave PW-4 protein international mains", () => {
  it("ships exactly 75 dishes", () => {
    expect(PROTEIN_INTL_DISHES.length).toBe(75);
  });

  it("every dish is international, category main only", () => {
    for (const dish of PROTEIN_INTL_DISHES) {
      expect(dish.cuisine, dish.id).toBe("international");
      expect(dish.category, dish.id).toBe("main");
    }
  });

  it("every dish clears the 25 g protein-per-serving bar, computed", () => {
    for (const dish of PROTEIN_INTL_DISHES) {
      const { nutrients } = dishNutrients(dish);
      expect(nutrients.proteinG, dish.id).toBeGreaterThanOrEqual(25);
    }
  });

  it("every dish validates clean and survives the strict parser unchanged", () => {
    for (const dish of PROTEIN_INTL_DISHES) {
      expect(validateDish(dish), dish.id).toEqual([]);
      expect(parseDishList([dish]), dish.id).toEqual([dish]);
      expect(dishPatterns(dish).length, dish.id).toBeGreaterThanOrEqual(1);
    }
    const roundTripped = parseDishList(JSON.parse(JSON.stringify(PROTEIN_INTL_DISHES)));
    expect(roundTripped).toEqual(PROTEIN_INTL_DISHES);
  });

  it("ids are unique across the whole library", () => {
    const libraryIds = new Set(DISH_LIBRARY.map((d) => d.id));
    expect(libraryIds.size).toBe(DISH_LIBRARY.length);
    for (const dish of PROTEIN_INTL_DISHES) {
      expect(DISH_LIBRARY.filter((d) => d.id === dish.id).length, dish.id).toBe(1);
    }
  });

  it("no normalised name collides with any other dish in the library", () => {
    const mine = new Map(PROTEIN_INTL_DISHES.map((d) => [d.id, normalisedName(d.name.en)]));
    // Unique within the wave itself.
    expect(new Set(mine.values()).size).toBe(PROTEIN_INTL_DISHES.length);
    for (const dish of DISH_LIBRARY) {
      if (mine.has(dish.id)) continue;
      const other = normalisedName(dish.name.en);
      for (const [id, name] of mine) {
        expect(other, `${id} vs ${dish.id}`).not.toBe(name);
      }
    }
  });

  it("every dish carries a Hindi name in Devanagari", () => {
    for (const dish of PROTEIN_INTL_DISHES) {
      expect(dish.name.hindi, dish.id).toMatch(/[ऀ-ॿ]/);
    }
  });

  it("writes a detailed method on every dish (6-10 steps)", () => {
    for (const dish of PROTEIN_INTL_DISHES) {
      expect(dish.method.length, dish.id).toBeGreaterThanOrEqual(6);
      expect(dish.method.length, dish.id).toBeLessThanOrEqual(10);
    }
  });

  it("no dish uses beef or pork (deliberate omission for this wave)", () => {
    const nameById = new Map(USDA_REFERENCE_FOODS.map((f) => [f.id, f.name]));
    for (const dish of PROTEIN_INTL_DISHES) {
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
    for (const dish of PROTEIN_INTL_DISHES) {
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
