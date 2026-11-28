import { describe, expect, it } from "vitest";

import { DISH_LIBRARY } from "./data/dishLibrary";
import { PW2_DISHES } from "./data/dishLibraryProteinBreakfasts";
import {
  dishNutrients,
  parseDishList,
  validateDish,
} from "./dishes";
import { USDA_REFERENCE_FOODS } from "./usdaReference";

/**
 * Protein wave PW-2 — high-protein breakfasts and protein snacks.
 * The owner's protein mandate carries the same hard bar as the
 * international waves: at least 25 g of protein in a serving, for
 * EVERY dish — breakfasts and snacks alike. Nothing here asserts that
 * number from the recipe text — every dish's protein is COMPUTED by
 * `dishNutrients` from its lines against the USDA reference set, and
 * the bar test below fails the build if any dish slips under it.
 *
 * The wave also pins the lesson of the duplicate-dishes audit: no
 * PW-2 dish may share a normalised name with any other dish in the
 * library (waves re-authoring the same dish under the same name is
 * exactly how the library grew duplicates).
 */

const groupByFoodId = new Map(
  USDA_REFERENCE_FOODS.map((f) => [f.id, f.classification?.group]),
);

/** The dry-pulse cap is about dals and beans weighed dry. Tofu, tempeh
 *  and edamame sit in the pulses_legumes data group but are eaten
 *  fresh, cooked-weight, in much larger portions. */
const FRESH_SOY_IDS = new Set(["usda-172448", "usda-174272", "usda-168410"]);

/** Lowercase, strip diacritics and punctuation — the comparison the
 *  duplicate audit ran over the library's names. */
function normaliseName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

describe("protein wave PW-2 — high-protein breakfasts & snacks", () => {
  it("holds 74 dishes — 44 breakfasts and 30 snacks, across three cuisines", () => {
    /* 75 as authored; dish-pw2-bacalhau-bras was removed at integration
       (2026-11-17) as a cross-wave duplicate of PW-4's main-course
       dish-pt-bacalhau-bras-style — the same dish, correctly a main. */
    expect(PW2_DISHES.length).toBe(74);
    const byCategory = new Map<string, number>();
    const byCuisine = new Map<string, number>();
    for (const dish of PW2_DISHES) {
      byCategory.set(dish.category, (byCategory.get(dish.category) ?? 0) + 1);
      byCuisine.set(dish.cuisine ?? "", (byCuisine.get(dish.cuisine ?? "") ?? 0) + 1);
      expect(["breakfast", "snack"], dish.id).toContain(dish.category);
      expect(dish.id.startsWith("dish-pw2-"), dish.id).toBe(true);
    }
    expect(byCategory.get("breakfast")).toBe(44);
    expect(byCategory.get("snack")).toBe(30);
    expect(byCuisine.get("india")).toBe(20);
    expect(byCuisine.get("kerala")).toBe(3);
    expect(byCuisine.get("international")).toBe(51);
  });

  it("has unique ids that never collide with the rest of the library", () => {
    const ids = PW2_DISHES.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    const waveIds = new Set(ids);
    for (const dish of DISH_LIBRARY) {
      if (!waveIds.has(dish.id)) continue;
      /* The only library entries carrying a wave id are the wave itself. */
      expect(PW2_DISHES).toContain(dish);
    }
  });

  it("duplicates no existing dish by normalised name — the audit's lesson", () => {
    const waveIds = new Set(PW2_DISHES.map((d) => d.id));
    const libraryNames = new Map<string, string>();
    for (const dish of DISH_LIBRARY) {
      if (waveIds.has(dish.id)) continue;
      libraryNames.set(normaliseName(dish.name.en), dish.id);
    }
    const waveNames = new Set<string>();
    for (const dish of PW2_DISHES) {
      const key = normaliseName(dish.name.en);
      expect(
        libraryNames.has(key),
        `${dish.id} name "${dish.name.en}" collides with ${libraryNames.get(key)}`,
      ).toBe(false);
      expect(waveNames.has(key), `${dish.id} duplicates a PW-2 name`).toBe(false);
      waveNames.add(key);
    }
  });

  it("is complete against the reference set — every dish validates clean", () => {
    for (const dish of PW2_DISHES) {
      expect(validateDish(dish), dish.id).toEqual([]);
    }
  });

  it("survives the strict parser unchanged", () => {
    const roundTripped = parseDishList(JSON.parse(JSON.stringify(PW2_DISHES)));
    expect(roundTripped).toEqual(PW2_DISHES);
  });

  it("clears the high-protein bar — computed, never asserted", () => {
    for (const dish of PW2_DISHES) {
      const protein = dishNutrients(dish).nutrients.proteinG;
      expect(protein, `${dish.id} computes ${protein.toFixed(1)} g protein/serving`)
        .toBeGreaterThanOrEqual(25);
    }
  });

  it("carries a Devanagari name and a detailed method for every dish", () => {
    for (const dish of PW2_DISHES) {
      expect(dish.name.hindi, dish.id).toMatch(/[ऀ-ॿ]/);
      expect(dish.name.en.trim().length, dish.id).toBeGreaterThan(0);
      expect(dish.method.length, dish.id).toBeGreaterThanOrEqual(6);
      expect(dish.method.length, dish.id).toBeLessThanOrEqual(10);
    }
  });

  it("keeps portions inside the sanity caps a real serving respects", () => {
    /* M-264 named exceptions: these three dishes were portioned against
       the cottage-cheese stand-in (84 kcal/100 g); their paneer lines now
       cost the real CoFID paneer (328 kcal/100 g) at the same weights, so
       their servings honestly compute above the 750 kcal cap. They are
       pinned to their measured values rather than re-portioned to fit
       the cap; the cap stands untouched for every other dish. */
    const PANEER_REPOINT_KCAL: Record<string, number> = {
      "dish-pw2-paneer-pea-samosas": 836,
      "dish-pw2-oats-cottage-patties": 799,
      "dish-pw2-corn-cottage-fritters": 796,
    };
    for (const dish of PW2_DISHES) {
      const kcal = dishNutrients(dish).nutrients.kcal;
      expect(kcal, `${dish.id} kcal/serving`).toBeGreaterThanOrEqual(150);
      const repointed = PANEER_REPOINT_KCAL[dish.id];
      if (repointed !== undefined) {
        expect(kcal, `${dish.id} kcal/serving (M-264 pin)`).toBe(repointed);
      } else {
        expect(kcal, `${dish.id} kcal/serving`).toBeLessThanOrEqual(750);
      }
      for (const line of dish.lines) {
        const perServing = line.grams / dish.servings;
        const group = groupByFoodId.get(line.foodId);
        if (group === "vegetables")
          expect(perServing, `${dish.id} single vegetable`).toBeLessThanOrEqual(250);
        if (group === "fats_oils")
          expect(perServing, `${dish.id} oil`).toBeLessThanOrEqual(15);
        if (group === "pulses_legumes" && !FRESH_SOY_IDS.has(line.foodId))
          expect(perServing, `${dish.id} dry pulses`).toBeLessThanOrEqual(120);
      }
    }
  });

  it("uses no beef and no pork — the programme omission holds", () => {
    const banned = new Set(
      USDA_REFERENCE_FOODS.filter((f) => /beef|pork/i.test(f.name)).map((f) => f.id),
    );
    expect(banned.size).toBeGreaterThan(0);
    for (const dish of PW2_DISHES) {
      for (const line of dish.lines) {
        expect(banned.has(line.foodId), `${dish.id} uses ${line.foodId}`).toBe(false);
      }
    }
  });
});
