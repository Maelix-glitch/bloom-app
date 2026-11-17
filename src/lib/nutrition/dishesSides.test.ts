import { describe, expect, it } from "vitest";

import { DISHES_SIDES } from "./data/dishesSides";
import { PROOF_DISHES } from "./data/proofDishes";
import {
  RECIPE_PROVENANCE_LABEL,
  dishNutrients,
  dishPatterns,
  parseDishList,
  validateDish,
  type Dish,
  type DishCategory,
} from "./dishes";
import { USDA_REFERENCE_FOODS } from "./usdaReference";

/**
 * The sides / chutneys / raitas / desserts / drinks library (slice C).
 * A dish's numbers exist only as a computation, so this suite proves
 * the library end to end against the real reference set: every line
 * resolves (dishNutrients would throw otherwise), every dish is
 * complete under validateDish (which also pins each stored budgetTier
 * against the heuristic), every dish survives the strict parser
 * unchanged, and the portions sit inside the sane bands the library
 * was authored to — per-serving weight and energy by category, and a
 * hard cap on fat per serving in the sides.
 */

const byId = (id: string): Dish => {
  const dish = DISHES_SIDES.find((d) => d.id === id);
  if (!dish) throw new Error(`library dish ${id} missing`);
  return dish;
};

const countBy = (category: DishCategory): number =>
  DISHES_SIDES.filter((d) => d.category === category).length;

const weightPerServing = (dish: Dish): number =>
  dish.lines.reduce((sum, line) => sum + line.grams, 0) / dish.servings;

const foodGroupById = new Map(
  USDA_REFERENCE_FOODS.map((f) => [f.id, f.classification?.group]),
);

const fatPerServing = (dish: Dish): number =>
  dish.lines
    .filter((line) => foodGroupById.get(line.foodId) === "fats_oils")
    .reduce((sum, line) => sum + line.grams, 0) / dish.servings;

describe("the sides library — coverage", () => {
  it("ships at least 50 dishes across the five categories, and only those", () => {
    expect(DISHES_SIDES.length).toBeGreaterThanOrEqual(50);
    /* 52 dishes / 24 sides after the 2026-11-17 dedupe removed the
       shahi paneer-style and sprouted moong duplicates (55 / 26 before)
       and the same day's borderline removal took mango chutney
       (chutneys 10 → 9). */
    expect(DISHES_SIDES.length).toBe(52);
    expect(countBy("side")).toBe(24);
    expect(countBy("chutney")).toBe(9);
    expect(countBy("raita")).toBe(11);
    expect(countBy("dessert")).toBe(1);
    expect(countBy("drink")).toBe(7);
    for (const dish of DISHES_SIDES) {
      expect(["side", "chutney", "raita", "dessert", "drink"], dish.id).toContain(dish.category);
    }
  });

  it("has unique dish- ids that never collide with the proof dishes", () => {
    const ids = DISHES_SIDES.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    const proofIds = new Set(PROOF_DISHES.map((d) => d.id));
    for (const id of ids) {
      expect(id.startsWith("dish-"), id).toBe(true);
      expect(proofIds.has(id), id).toBe(false);
    }
  });

  it("carries Hindi names in Devanagari for every dish", () => {
    for (const dish of DISHES_SIDES) {
      expect(dish.name.hindi, dish.id).toMatch(/[ऀ-ॿ]/);
      expect(dish.name.en.trim().length, dish.id).toBeGreaterThan(0);
    }
  });

  it("gives every dish 3–7 method steps", () => {
    for (const dish of DISHES_SIDES) {
      expect(dish.method.length, dish.id).toBeGreaterThanOrEqual(3);
      expect(dish.method.length, dish.id).toBeLessThanOrEqual(7);
    }
  });
});

describe("the sides library — completeness against the reference set", () => {
  it("is complete under validateDish — every line resolves, tiers agree", () => {
    for (const dish of DISHES_SIDES) {
      expect(validateDish(dish), dish.id).toEqual([]);
    }
  });

  it("survives a strict-parser round trip unchanged", () => {
    const roundTripped = parseDishList(JSON.parse(JSON.stringify(DISHES_SIDES)));
    expect(roundTripped).toEqual(DISHES_SIDES);
  });

  it("computes finite nutrients for every dish — no line throws", () => {
    for (const dish of DISHES_SIDES) {
      const { nutrients, label, estimate } = dishNutrients(dish);
      expect(label, dish.id).toBe(RECIPE_PROVENANCE_LABEL);
      expect(estimate, dish.id).toBe(false);
      for (const [key, value] of Object.entries(nutrients)) {
        expect(Number.isFinite(value), `${dish.id} ${key}`).toBe(true);
      }
      expect(nutrients.kcal, dish.id).toBeGreaterThan(0);
    }
  });
});

describe("the sides library — sane portions", () => {
  const KCAL_BANDS: Record<string, [number, number]> = {
    chutney: [15, 120],
    raita: [40, 180],
    side: [60, 300],
    dessert: [120, 400],
    drink: [30, 220],
  };

  it("keeps per-serving energy inside each category's band", () => {
    for (const dish of DISHES_SIDES) {
      const [lo, hi] = KCAL_BANDS[dish.category]!;
      const kcal = dishNutrients(dish).nutrients.kcal;
      expect(kcal, `${dish.id} at ${kcal} kcal`).toBeGreaterThanOrEqual(lo);
      expect(kcal, `${dish.id} at ${kcal} kcal`).toBeLessThanOrEqual(hi);
    }
  });

  const WEIGHT_BANDS: Record<string, [number, number]> = {
    chutney: [20, 60],
    raita: [80, 150],
    side: [100, 250],
  };

  it("keeps per-serving weight inside each category's band", () => {
    for (const dish of DISHES_SIDES) {
      const band = WEIGHT_BANDS[dish.category];
      if (!band) continue;
      const [lo, hi] = band;
      const grams = weightPerServing(dish);
      expect(grams, `${dish.id} at ${grams} g`).toBeGreaterThanOrEqual(lo);
      expect(grams, `${dish.id} at ${grams} g`).toBeLessThanOrEqual(hi);
    }
  });

  it("caps fat at 12 g per serving in every side", () => {
    for (const dish of DISHES_SIDES.filter((d) => d.category === "side")) {
      expect(fatPerServing(dish), dish.id).toBeLessThanOrEqual(12);
    }
  });
});

describe("the sides library — enriched variants", () => {
  it("ships four enriched dishes, each stating its boost", () => {
    /* Four since the 2026-11-17 dedupe removed dish-shahi-paneer-style,
       the fifth: it duplicated the mains library's Shahi Paneer (same
       dish, same photograph), so its enriched side entry went with it. */
    const enriched = DISHES_SIDES.filter((d) => d.enriched);
    expect(enriched.length).toBe(4);
    for (const dish of enriched) {
      expect(dish.enrichment?.trim().length, dish.id).toBeGreaterThan(0);
    }
    expect(enriched.map((d) => d.id).sort()).toEqual([
      "dish-badam-doodh",
      "dish-greek-yogurt-raita",
      "dish-shahi-coconut-chutney",
      "dish-shahi-mixed-veg",
    ]);
  });
});

describe("the sides library — patterns are derived, never asserted", () => {
  it("derives a pattern set for every dish (no unclassified lines)", () => {
    for (const dish of DISHES_SIDES) {
      expect(dishPatterns(dish).length, dish.id).toBeGreaterThan(0);
    }
  });

  it("the coconut chutney derives vegan — coconut, herbs and oil only", () => {
    const patterns = dishPatterns(byId("dish-coconut-chutney"));
    expect(patterns).toContain("vegan");
    expect(patterns).toContain("vegetarian");
  });

  it("a curd raita excludes vegan but suits vegetarian and eggetarian", () => {
    const patterns = dishPatterns(byId("dish-boondi-raita"));
    expect(patterns).not.toContain("vegan");
    expect(patterns).not.toContain("ovo_vegetarian");
    expect(patterns).toContain("vegetarian");
    expect(patterns).toContain("eggetarian");
  });

  it("haldi doodh excludes vegan but suits vegetarian and eggetarian", () => {
    const patterns = dishPatterns(byId("dish-haldi-doodh"));
    expect(patterns).not.toContain("vegan");
    expect(patterns).toContain("vegetarian");
    expect(patterns).toContain("eggetarian");
  });

  it("pins the library's pattern spread", () => {
    const spread: Record<string, number> = {};
    for (const dish of DISHES_SIDES) {
      for (const pattern of dishPatterns(dish)) {
        spread[pattern] = (spread[pattern] ?? 0) + 1;
      }
    }
    /* Spread recomputed after the 2026-11-17 dedupe removed two
       dishes from this file (55 dishes before, 53 then), and again
       after the same day's borderline removal took mango chutney
       (52 now). */
    expect(spread).toEqual({
      vegetarian: 52,
      eggetarian: 52,
      vegan: 29,
      ovo_vegetarian: 29,
      pescatarian: 52,
      non_vegetarian: 52,
    });
  });
});
