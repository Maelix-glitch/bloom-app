import { describe, expect, it } from "vitest";

import { DISHES_MAINS } from "./data/dishesMains";
import { PROOF_DISHES } from "./data/proofDishes";
import {
  RECIPE_PROVENANCE_LABEL,
  dishNutrients,
  dishPatterns,
  parseDishList,
  validateDish,
  type Dish,
} from "./dishes";
import type { PlanPattern } from "./plan";
import { USDA_REFERENCE_FOODS } from "./usdaReference";

/**
 * The mains library (D2). These tests hold the library to the same
 * discipline as the dish model itself: every line resolves against the
 * reference set, every dish survives the strict parser unchanged, its
 * stored budget tier is the heuristic's own output, its patterns are
 * what the derivation says (never what the author hoped), and its
 * portions stay inside the sanity caps a main dish must respect.
 */

const byId = (id: string): Dish => {
  const dish = DISHES_MAINS.find((d) => d.id === id);
  if (!dish) throw new Error(`mains dish ${id} missing`);
  return dish;
};

const groupByFoodId = new Map(
  USDA_REFERENCE_FOODS.map((f) => [f.id, f.classification?.group]),
);

/** Fresh green peas are a vegetable in the kitchen whatever their data
 *  group; the dry-pulse cap is about dals and beans weighed dry. */
const FRESH_PEAS_ID = "usda-170419";

describe("the mains library", () => {
  it("holds at least 70 dishes, every one of them a main", () => {
    expect(DISHES_MAINS.length).toBeGreaterThanOrEqual(70);
    for (const dish of DISHES_MAINS) {
      expect(dish.category, dish.id).toBe("main");
      expect(dish.id.startsWith("dish-"), dish.id).toBe(true);
    }
  });

  it("has unique ids that never reuse the proof dishes' ids", () => {
    const ids = DISHES_MAINS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    const proofIds = new Set(PROOF_DISHES.map((d) => d.id));
    for (const id of ids) expect(proofIds.has(id), id).toBe(false);
  });

  it("is complete against the reference set — every dish validates clean", () => {
    for (const dish of DISHES_MAINS) {
      expect(validateDish(dish), dish.id).toEqual([]);
    }
  });

  it("survives a strict-parser round trip unchanged, dish for dish", () => {
    const roundTripped = parseDishList(JSON.parse(JSON.stringify(DISHES_MAINS)));
    expect(roundTripped).toEqual(DISHES_MAINS);
  });

  it("carries a Hindi name in Devanagari and a real method for every dish", () => {
    for (const dish of DISHES_MAINS) {
      expect(dish.name.hindi, dish.id).toMatch(/[ऀ-ॿ]/);
      expect(dish.name.en.trim().length, dish.id).toBeGreaterThan(0);
      expect(dish.method.length, dish.id).toBeGreaterThanOrEqual(4);
      expect(dish.method.length, dish.id).toBeLessThanOrEqual(8);
    }
  });

  it("includes enriched variants, each stating its boost in words", () => {
    const enriched = DISHES_MAINS.filter((d) => d.enriched);
    expect(enriched.length).toBeGreaterThanOrEqual(10);
    for (const dish of enriched) {
      expect(dish.enrichment?.trim().length, dish.id).toBeGreaterThan(0);
    }
    for (const dish of DISHES_MAINS) {
      if (!dish.enriched) expect(dish.enrichment, dish.id).toBeUndefined();
    }
  });
});

describe("computed nutrients — finite, and sized like a main", () => {
  it("dishNutrients never throws and returns finite values for every dish", () => {
    for (const dish of DISHES_MAINS) {
      const labelled = dishNutrients(dish);
      expect(labelled.label, dish.id).toBe(RECIPE_PROVENANCE_LABEL);
      expect(labelled.estimate, dish.id).toBe(false);
      for (const [key, value] of Object.entries(labelled.nutrients)) {
        expect(Number.isFinite(value), `${dish.id} ${key}`).toBe(true);
        expect(value, `${dish.id} ${key}`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("every main lands in the per-serving energy band of a main dish", () => {
    for (const dish of DISHES_MAINS) {
      const { kcal } = dishNutrients(dish).nutrients;
      expect(kcal, dish.id).toBeGreaterThanOrEqual(150);
      expect(kcal, dish.id).toBeLessThanOrEqual(700);
    }
  });
});

describe("portion sanity — the caps a main dish must respect", () => {
  it("keeps dry pulses and legumes at or under 80 g per serving", () => {
    for (const dish of DISHES_MAINS) {
      for (const line of dish.lines) {
        if (groupByFoodId.get(line.foodId) !== "pulses_legumes") continue;
        if (line.foodId === FRESH_PEAS_ID) continue;
        expect(line.grams / dish.servings, `${dish.id} ${line.foodId}`).toBeLessThanOrEqual(80);
      }
    }
  });

  it("keeps any single vegetable at or under 250 g per serving", () => {
    for (const dish of DISHES_MAINS) {
      for (const line of dish.lines) {
        if (groupByFoodId.get(line.foodId) !== "vegetables") continue;
        expect(line.grams / dish.servings, `${dish.id} ${line.foodId}`).toBeLessThanOrEqual(250);
      }
    }
  });

  it("keeps oils, ghee and butter at or under 15 g per serving", () => {
    for (const dish of DISHES_MAINS) {
      for (const line of dish.lines) {
        if (groupByFoodId.get(line.foodId) !== "fats_oils") continue;
        expect(line.grams / dish.servings, `${dish.id} ${line.foodId}`).toBeLessThanOrEqual(15);
      }
    }
  });
});

describe("dish patterns — derived from ingredients, never asserted", () => {
  const ALL: PlanPattern[] = [
    "vegetarian",
    "eggetarian",
    "vegan",
    "ovo_vegetarian",
    "pescatarian",
    "non_vegetarian",
  ];

  it("a plain dal suits every pattern, vegan included", () => {
    expect(dishPatterns(byId("dish-arhar-dal"))).toEqual(ALL);
    expect(dishPatterns(byId("dish-chole-masala"))).toEqual(ALL);
  });

  it("a chicken dish derives ONLY the non-vegetarian pattern", () => {
    expect(dishPatterns(byId("dish-chicken-curry"))).toEqual(["non_vegetarian"]);
    expect(dishPatterns(byId("dish-mutton-keema-matar"))).toEqual(["non_vegetarian"]);
  });

  it("a paneer dish suits vegetarian and eggetarian but never vegan or ovo", () => {
    const patterns = dishPatterns(byId("dish-matar-paneer"));
    expect(patterns).toContain("vegetarian");
    expect(patterns).toContain("eggetarian");
    expect(patterns).not.toContain("vegan");
    expect(patterns).not.toContain("ovo_vegetarian");
  });

  it("an egg dish suits eggetarian and ovo-vegetarian but not vegetarian or vegan", () => {
    const patterns = dishPatterns(byId("dish-egg-curry"));
    expect(patterns).toContain("eggetarian");
    expect(patterns).toContain("ovo_vegetarian");
    expect(patterns).not.toContain("vegetarian");
    expect(patterns).not.toContain("vegan");
  });

  it("an egg dish finished with ghee keeps eggetarian but loses ovo", () => {
    const patterns = dishPatterns(byId("dish-egg-curry-enriched"));
    expect(patterns).toContain("eggetarian");
    expect(patterns).not.toContain("ovo_vegetarian");
    expect(patterns).not.toContain("vegetarian");
    expect(patterns).not.toContain("vegan");
  });

  it("a fish dish suits pescatarian and non-vegetarian, nothing stricter", () => {
    expect(dishPatterns(byId("dish-goan-fish-curry"))).toEqual([
      "pescatarian",
      "non_vegetarian",
    ]);
  });

  it("the spread across the library is wide on every pattern", () => {
    const count = (pattern: PlanPattern) =>
      DISHES_MAINS.filter((d) => dishPatterns(d).includes(pattern)).length;
    expect(count("vegan")).toBeGreaterThanOrEqual(30);
    expect(count("vegetarian")).toBeGreaterThanOrEqual(50);
    expect(count("eggetarian")).toBeGreaterThanOrEqual(55);
    expect(count("ovo_vegetarian")).toBeGreaterThanOrEqual(35);
    expect(count("pescatarian")).toBeGreaterThanOrEqual(60);
    /* The non-veg set: meat dishes that suit nothing else, plus fish. */
    const meatOnly = DISHES_MAINS.filter(
      (d) => dishPatterns(d).length === 1 && dishPatterns(d)[0] === "non_vegetarian",
    );
    const fish = DISHES_MAINS.filter((d) => {
      const patterns = dishPatterns(d);
      return patterns.includes("pescatarian") && !patterns.includes("vegetarian");
    });
    expect(meatOnly.length).toBeGreaterThanOrEqual(10);
    expect(fish.length).toBeGreaterThanOrEqual(5);
  });
});
