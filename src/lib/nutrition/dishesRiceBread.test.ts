import { describe, expect, it } from "vitest";

import { DISHES_RICE_BREAD } from "./data/dishesRiceBread";
import { PROOF_DISHES } from "./data/proofDishes";
import {
  computeBudgetTier,
  dishNutrients,
  dishPatterns,
  parseDish,
  validateDish,
  type Dish,
} from "./dishes";
import { USDA_REFERENCE_FOODS } from "./usdaReference";

/**
 * The rice / breads / breakfast / snacks library (D2, part B). Every
 * dish is held to the D1 discipline: lines resolve against the USDA
 * reference set, the stored budget tier is the heuristic's own answer,
 * patterns are derived (never asserted in the data), and a dish's
 * numbers exist only as `dishNutrients` computes them. Two nutrient
 * values are pinned below against hand-summation from the generated
 * USDA data file, independently of the dish code.
 */

const byId = (id: string): Dish => {
  const dish = DISHES_RICE_BREAD.find((d) => d.id === id);
  if (!dish) throw new Error(`library dish ${id} missing`);
  return dish;
};

const foodById = new Map(USDA_REFERENCE_FOODS.map((f) => [f.id, f]));

describe("the rice/bread/breakfast/snack library", () => {
  it("holds at least 69 dishes across the four categories", () => {
    expect(DISHES_RICE_BREAD.length).toBeGreaterThanOrEqual(69);
    const counts = new Map<string, number>();
    for (const dish of DISHES_RICE_BREAD) {
      counts.set(dish.category, (counts.get(dish.category) ?? 0) + 1);
    }
    /* Rice 20 / breakfast 20: rice was 19 after the 2026-11-17 dedupe
       removed five duplicates from this file (21 / 23 before), and
       method 14 (2026-11-20) added the plain Steamed Rice; bread
       16 → 14 after the same day's borderline removal took poori
       and bhatura. */
    expect(Object.fromEntries(counts)).toEqual({
      rice: 20,
      bread: 14,
      breakfast: 20,
      snack: 16,
    });
  });

  it("has unique ids, and none collides with a proof dish", () => {
    const ids = DISHES_RICE_BREAD.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    const proofIds = new Set(PROOF_DISHES.map((d) => d.id));
    for (const id of ids) expect(proofIds.has(id)).toBe(false);
    for (const id of ids) expect(id).toMatch(/^dish-[a-z0-9-]+$/);
  });

  it("gives every dish a Devanagari Hindi name and a real method", () => {
    for (const dish of DISHES_RICE_BREAD) {
      expect(dish.name.hindi, dish.id).toMatch(/[ऀ-ॿ]/);
      expect(dish.name.en.length, dish.id).toBeGreaterThan(0);
      expect(dish.method.length, dish.id).toBeGreaterThanOrEqual(4);
      expect(dish.method.length, dish.id).toBeLessThanOrEqual(8);
      expect(dish.timeMinutes, dish.id).toBeGreaterThanOrEqual(5);
    }
  });

  it("is complete against the reference set — every line resolves, tiers agree", () => {
    for (const dish of DISHES_RICE_BREAD) {
      expect(validateDish(dish), dish.id).toEqual([]);
      expect(computeBudgetTier(dish), dish.id).toBe(dish.budgetTier);
    }
  });

  it("survives a strict-parser round trip unchanged, dish by dish", () => {
    for (const dish of DISHES_RICE_BREAD) {
      expect(parseDish(JSON.parse(JSON.stringify(dish))), dish.id).toEqual(dish);
    }
  });

  it("computes finite nutrients for every dish — no line throws", () => {
    for (const dish of DISHES_RICE_BREAD) {
      const { nutrients } = dishNutrients(dish);
      for (const value of Object.values(nutrients)) {
        expect(Number.isFinite(value), `${dish.id}`).toBe(true);
      }
      expect(nutrients.kcal, dish.id).toBeGreaterThan(0);
    }
  });

  it("keeps per-serving energy in the sane band for its category", () => {
    for (const dish of DISHES_RICE_BREAD) {
      const kcal = dishNutrients(dish).nutrients.kcal;
      if (dish.category === "snack") {
        expect(kcal, dish.id).toBeGreaterThanOrEqual(60);
        expect(kcal, dish.id).toBeLessThanOrEqual(400);
      } else {
        expect(kcal, dish.id).toBeGreaterThanOrEqual(120);
        expect(kcal, dish.id).toBeLessThanOrEqual(650);
      }
    }
  });

  it("keeps portions sane per serving, judged by food group", () => {
    const perServingCaps: Record<string, number> = {
      cereals_grains: 110, // dry grains and flours
      pulses_legumes: 80, // dry pulses
      fats_oils: 15, // oils, ghee, butter
      vegetables: 250, // a single vegetable
    };
    for (const dish of DISHES_RICE_BREAD) {
      for (const line of dish.lines) {
        const group = foodById.get(line.foodId)?.classification?.group;
        if (!group) continue;
        const cap = perServingCaps[group];
        if (cap === undefined) continue;
        expect(line.grams / dish.servings, `${dish.id} · ${line.foodId}`).toBeLessThanOrEqual(cap);
      }
    }
  });

  it("carries exactly 7 enriched dishes, each stating its boost", () => {
    const enriched = DISHES_RICE_BREAD.filter((d) => d.enriched);
    expect(enriched).toHaveLength(7);
    for (const dish of enriched) {
      expect(dish.enrichment, dish.id).toBeTruthy();
      expect(dish.enrichment!.length, dish.id).toBeGreaterThan(20);
    }
    for (const dish of DISHES_RICE_BREAD) {
      if (!dish.enriched) expect(dish.enrichment).toBeUndefined();
    }
  });
});

describe("derived patterns — representatives", () => {
  it("chicken biryani suits only the non-vegetarian pattern", () => {
    expect(dishPatterns(byId("dish-chicken-biryani"))).toEqual(["non_vegetarian"]);
    expect(dishPatterns(byId("dish-chicken-pulao"))).toEqual(["non_vegetarian"]);
  });

  it("egg dishes suit eggetarian and ovo, never vegetarian or vegan", () => {
    /* Representative was dish-egg-bhurji until the 2026-11-17 dedupe
       removed it as a duplicate of Anda Bhurji (mains); egg fried rice
       is this file's remaining oil-only egg dish. */
    const bhurji = dishPatterns(byId("dish-egg-fried-rice")); // oil, no dairy
    expect(bhurji).toContain("eggetarian");
    expect(bhurji).toContain("ovo_vegetarian");
    expect(bhurji).not.toContain("vegetarian");
    expect(bhurji).not.toContain("vegan");

    const biryani = dishPatterns(byId("dish-egg-biryani")); // egg + yogurt
    expect(biryani).toContain("eggetarian");
    expect(biryani).not.toContain("ovo_vegetarian"); // the yogurt rules ovo out
    expect(biryani).not.toContain("vegetarian");
    expect(biryani).not.toContain("vegan");
  });

  it("a vegan rice suits every pattern, vegan included", () => {
    const patterns = dishPatterns(byId("dish-lemon-rice"));
    expect(patterns).toContain("vegan");
    expect(patterns).toHaveLength(6);
    expect(dishPatterns(byId("dish-mushroom-pulao"))).toContain("vegan");
  });

  it("a ghee-and-dairy dish is vegetarian but never vegan", () => {
    const patterns = dishPatterns(byId("dish-veg-pulao"));
    expect(patterns).toContain("vegetarian");
    expect(patterns).not.toContain("vegan");
    expect(patterns).not.toContain("ovo_vegetarian");
  });

  it("every dish suits at least one pattern, and the spread is wide", () => {
    const spread = new Map<string, number>();
    for (const dish of DISHES_RICE_BREAD) {
      const patterns = dishPatterns(dish);
      expect(patterns.length, dish.id).toBeGreaterThan(0);
      for (const p of patterns) spread.set(p, (spread.get(p) ?? 0) + 1);
    }
    /* Spread recomputed after the 2026-11-17 dedupe removed five
       dishes from this file (76 dishes before, 71 then), again
       after the same day's borderline removal took poori and bhatura
       (69 then), and again after method 14 (2026-11-20) added the
       plain Steamed Rice, which suits every pattern (70 now). */
    expect(Object.fromEntries(spread)).toEqual({
      vegetarian: 63,
      eggetarian: 68,
      vegan: 31,
      ovo_vegetarian: 34,
      pescatarian: 68,
      non_vegetarian: 70,
    });
  });
});

describe("hand-summed nutrient pins", () => {
  it("lemon rice: ≈372 kcal per serving, summed from the USDA rows by hand", () => {
    // rice 300×3.6964 + peanut oil 20×8.84 + peanuts 25×5.67 + mustard
    // seed 3×5.08 + cumin 2×3.75 + turmeric 2×3.12 + green chilli 10×0.40
    // + ginger 10×0.80 + lemon 60×0.29 + coriander 10×0.23 ≈ 1488, ÷ 4.
    expect(dishNutrients(byId("dish-lemon-rice")).nutrients.kcal).toBeCloseTo(372.0, 0);
  });

  it("chicken biryani: ≈27 g protein per serving, summed by hand", () => {
    // chicken thigh 400×0.18613 + rice 300×0.07039 + yogurt 150×0.03824
    // + onion 200×0.0083 + garlic 20×0.0662 + the aromatics ≈ 107.9, ÷ 4.
    expect(dishNutrients(byId("dish-chicken-biryani")).nutrients.proteinG).toBeCloseTo(27.0, 0);
  });
});
