import { describe, expect, it } from "vitest";

import { DISH_LIBRARY } from "./data/dishLibrary";
import { INTL1_DISHES } from "./data/dishLibraryIntl1";
import { INTL2_DISHES } from "./data/dishLibraryIntl2";
import { INTL3_DISHES } from "./data/dishLibraryIntl3";
import { INTL4_DISHES } from "./data/dishLibraryIntl4";
import { INDIA_DISHES } from "./data/dishLibraryIndia";
import {
  dishNutrients,
  parseDishList,
  validateDish,
} from "./dishes";
import { USDA_REFERENCE_FOODS } from "./usdaReference";

/**
 * Wave X-1 — the international high-protein dishes. The owner's rule
 * for outside-India dishes is a hard bar: at least 25 g of protein in
 * a serving. Nothing here asserts that number from the recipe text —
 * every dish's protein is COMPUTED by `dishNutrients` from its lines
 * against the USDA reference set, and the bar test below fails the
 * build if any dish slips under it. Categories are main and breakfast
 * only: a 25 g snack is not a credible dish.
 */

const groupByFoodId = new Map(
  USDA_REFERENCE_FOODS.map((f) => [f.id, f.classification?.group]),
);

/** The dry-pulse cap is about dals and beans weighed dry. Tofu, tempeh
 *  and edamame sit in the pulses_legumes data group but are eaten
 *  fresh, cooked-weight, in much larger portions — the mains library
 *  makes the same distinction for fresh peas. */
const FRESH_SOY_IDS = new Set(["usda-172448", "usda-174272", "usda-168410"]);

describe("wave X-1 — international high-protein dishes", () => {
  it("holds 120–140 dishes, every one international, main or breakfast", () => {
    expect(INTL1_DISHES.length).toBe(132);
    expect(INTL1_DISHES.length).toBeGreaterThanOrEqual(120);
    expect(INTL1_DISHES.length).toBeLessThanOrEqual(140);
    for (const dish of INTL1_DISHES) {
      expect(dish.cuisine, dish.id).toBe("international");
      expect(["main", "breakfast"], dish.id).toContain(dish.category);
      expect(dish.id.startsWith("dish-intl-"), dish.id).toBe(true);
    }
  });

  it("has unique ids that never collide with the rest of the library", () => {
    const ids = INTL1_DISHES.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    const waveIds = new Set(ids);
    for (const dish of DISH_LIBRARY) {
      if (!waveIds.has(dish.id)) continue;
      /* The only library entries carrying a wave id are the wave itself. */
      expect(INTL1_DISHES).toContain(dish);
    }
    expect(DISH_LIBRARY.length).toBe(
      360 +
        INTL1_DISHES.length +
        INTL2_DISHES.length +
        INTL3_DISHES.length +
        INTL4_DISHES.length +
        INDIA_DISHES.length,
    );
  });

  it("is complete against the reference set — every dish validates clean", () => {
    for (const dish of INTL1_DISHES) {
      expect(validateDish(dish), dish.id).toEqual([]);
    }
  });

  it("survives the strict parser unchanged", () => {
    const roundTripped = parseDishList(JSON.parse(JSON.stringify(INTL1_DISHES)));
    expect(roundTripped).toEqual(INTL1_DISHES);
  });

  it("clears the high-protein bar — computed, never asserted", () => {
    for (const dish of INTL1_DISHES) {
      const protein = dishNutrients(dish).nutrients.proteinG;
      expect(protein, `${dish.id} computes ${protein.toFixed(1)} g protein/serving`)
        .toBeGreaterThanOrEqual(25);
    }
  });

  it("carries a Devanagari name and a detailed method for every dish", () => {
    for (const dish of INTL1_DISHES) {
      expect(dish.name.hindi, dish.id).toMatch(/[ऀ-ॿ]/);
      expect(dish.name.en.trim().length, dish.id).toBeGreaterThan(0);
      expect(dish.method.length, dish.id).toBeGreaterThanOrEqual(6);
      expect(dish.method.length, dish.id).toBeLessThanOrEqual(10);
    }
  });

  it("keeps portions inside the sanity caps a real serving respects", () => {
    for (const dish of INTL1_DISHES) {
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
    for (const dish of INTL1_DISHES) {
      for (const line of dish.lines) {
        expect(banned.has(line.foodId), `${dish.id} uses ${line.foodId}`).toBe(false);
      }
    }
  });
});
