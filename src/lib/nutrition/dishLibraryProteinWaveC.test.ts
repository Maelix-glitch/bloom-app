import { describe, expect, it } from "vitest";

import { DISH_LIBRARY, PROTEIN_WAVE_DISH_IDS } from "./data/dishLibrary";
import { BALANCED_WAVE_C_DISHES, PROTEIN_WAVE_C_DISHES } from "./data/dishLibraryProteinWaveC";
import type { Dish } from "./dishes";
import { dishNutrients, dishPatterns, parseDishList, validateDish } from "./dishes";
import { USDA_REFERENCE_FOODS } from "./usdaReference";

/* The strictest normaliser in the library (PW-3's): parenthetical
   qualifiers are stripped whole, so "Chicken and Chickpea Curry"
   collides with any older chickpea curry of the same stripped
   name. That is the collision class wave A's first full run
   caught; this wave checks itself against the whole library the
   same way before it ships. */
const norm = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\([^)]*\)/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * Protein wave C (2026-11-26, owner directive: three waves adding
 * 200+ healthy, protein-rich or balanced dishes — this is the
 * third and final one, and the programme lands at 210 dishes).
 * The wave ships two shelves from one file, and the split between
 * them is a COMPUTED fact, pinned here, not a claim in the file's
 * header:
 *
 *  - PROTEIN_WAVE_C_DISHES: every dish computes at least 25 g of
 *    protein a serving from the verified foods, the protein
 *    waves' bar, and every dish joins PROTEIN_WAVE_DISH_IDS, the
 *    set whose standing fact is exactly that bar.
 *  - BALANCED_WAVE_C_DISHES: honest plates (a protein anchor,
 *    vegetables and a grain or base) that compute BELOW the bar.
 *    They must never join the protein set, and they hold a 12 g
 *    floor so "balanced" never means token protein.
 *
 * Fresh ground only: waves A and B's peri-peri chicken, kofta,
 * rendang, potstickers, murgh cholay and paneer makhani are not
 * re-skinned here. This wave's ground is yakitori and kung pao,
 * cassoulet, cocido and petit salé, étouffée and cioppino,
 * kibbeh, lablabi and ghormeh sabzi, akara and moin moin, plus
 * tabbouleh, bissara, causa and the yogurt desserts on the
 * balanced shelf. Paneer costs from the UK CoFID paneer entry
 * (cofid-12-495) directly. Beef and pork ship as themselves from
 * the verified set's three beef and pork foods (owner decision
 * 2026-11-26).
 */
describe("protein wave C", () => {
  it("ships 70 dishes: 46 protein-rich and 24 balanced", () => {
    expect(PROTEIN_WAVE_C_DISHES.length).toBe(46);
    expect(BALANCED_WAVE_C_DISHES.length).toBe(24);
  });

  it("every protein-rich dish clears the computed 25 g bar and joins the protein set", () => {
    for (const dish of PROTEIN_WAVE_C_DISHES) {
      const protein = dishNutrients(dish).nutrients.proteinG;
      expect(protein, dish.id).toBeGreaterThanOrEqual(25);
      expect(PROTEIN_WAVE_DISH_IDS.has(dish.id), dish.id).toBe(true);
    }
  });

  it("every balanced plate sits honestly below the bar, above the floor, and outside the protein set", () => {
    for (const dish of BALANCED_WAVE_C_DISHES) {
      const protein = dishNutrients(dish).nutrients.proteinG;
      expect(protein, dish.id).toBeGreaterThanOrEqual(12);
      expect(protein, dish.id).toBeLessThan(25);
      expect(PROTEIN_WAVE_DISH_IDS.has(dish.id), dish.id).toBe(false);
    }
  });

  it("every dish validates clean and survives the strict parser unchanged", () => {
    for (const dish of [...PROTEIN_WAVE_C_DISHES, ...BALANCED_WAVE_C_DISHES]) {
      expect(validateDish(dish), dish.id).toEqual([]);
      expect(parseDishList([dish]), dish.id).toEqual([dish]);
      expect(dishPatterns(dish).length, dish.id).toBeGreaterThanOrEqual(1);
    }
    const all = [...PROTEIN_WAVE_C_DISHES, ...BALANCED_WAVE_C_DISHES];
    expect(parseDishList(JSON.parse(JSON.stringify(all)))).toEqual(all);
  });

  it("ids are unique across the whole library", () => {
    const libraryIds = new Set(DISH_LIBRARY.map((d) => d.id));
    expect(libraryIds.size).toBe(DISH_LIBRARY.length);
    for (const dish of [...PROTEIN_WAVE_C_DISHES, ...BALANCED_WAVE_C_DISHES]) {
      expect(DISH_LIBRARY.filter((d) => d.id === dish.id).length, dish.id).toBe(1);
    }
  });

  it("no dish duplicates an existing dish by normalised English name", () => {
    const waveIds = new Set(
      [...PROTEIN_WAVE_C_DISHES, ...BALANCED_WAVE_C_DISHES].map((d) => d.id),
    );
    const seen = new Map<string, string>();
    for (const dish of DISH_LIBRARY) {
      if (waveIds.has(dish.id)) continue;
      seen.set(norm(dish.name.en), dish.id);
    }
    for (const dish of [...PROTEIN_WAVE_C_DISHES, ...BALANCED_WAVE_C_DISHES]) {
      expect(seen.has(norm(dish.name.en)), `${dish.id} vs ${seen.get(norm(dish.name.en))}`).toBe(
        false,
      );
    }
  });

  it("every dish carries a Hindi name in Devanagari", () => {
    for (const dish of [...PROTEIN_WAVE_C_DISHES, ...BALANCED_WAVE_C_DISHES]) {
      expect(dish.name.hindi, dish.id).toMatch(/[ऀ-ॿ]/);
    }
  });

  it("writes a real method on every dish (5-7 steps)", () => {
    for (const dish of [...PROTEIN_WAVE_C_DISHES, ...BALANCED_WAVE_C_DISHES]) {
      expect(dish.method.length, dish.id).toBeGreaterThanOrEqual(5);
      expect(dish.method.length, dish.id).toBeLessThanOrEqual(7);
    }
  });

  it("no single line runs past 250 g a serving", () => {
    for (const dish of [...PROTEIN_WAVE_C_DISHES, ...BALANCED_WAVE_C_DISHES]) {
      for (const line of dish.lines) {
        expect(line.grams / dish.servings, `${dish.id} -> ${line.foodId}`).toBeLessThanOrEqual(250);
      }
    }
  });

  it("paneer dishes cost from the CoFID paneer entry, never the cottage-cheese stand-in", () => {
    const paneerDishes = [...PROTEIN_WAVE_C_DISHES, ...BALANCED_WAVE_C_DISHES].filter((d) =>
      /paneer/i.test(d.name.en),
    );
    expect(paneerDishes.length).toBeGreaterThanOrEqual(4);
    for (const dish of paneerDishes) {
      const foodIds = dish.lines.map((l) => l.foodId);
      expect(foodIds, dish.id).toContain("cofid-12-495");
      expect(foodIds, dish.id).not.toContain("usda-328841");
    }
  });

  it("beef and pork lines come only from the verified beef and pork foods", () => {
    const VERIFIED_BEEF_PORK = new Set(["usda-168608", "usda-2514745", "usda-2646168"]);
    const nameById = new Map(USDA_REFERENCE_FOODS.map((f) => [f.id, f.name]));
    for (const dish of [...PROTEIN_WAVE_C_DISHES, ...BALANCED_WAVE_C_DISHES]) {
      for (const line of dish.lines) {
        const name = nameById.get(line.foodId) ?? "";
        if (/beef|pork/i.test(name)) {
          expect(VERIFIED_BEEF_PORK.has(line.foodId), `${dish.id} -> ${line.foodId}`).toBe(true);
        }
      }
    }
  });

  it("covers the patterns properly on both shelves, derived not claimed", () => {
    const suited = (dishes: readonly Dish[], pattern: string) =>
      dishes.filter((d) => (dishPatterns(d) as readonly string[]).includes(pattern)).length;
    for (const dishes of [PROTEIN_WAVE_C_DISHES, BALANCED_WAVE_C_DISHES]) {
      expect(suited(dishes, "vegan")).toBeGreaterThan(0);
      expect(suited(dishes, "vegetarian")).toBeGreaterThan(0);
      expect(suited(dishes, "eggetarian")).toBeGreaterThan(0);
      expect(suited(dishes, "pescatarian")).toBeGreaterThan(0);
    }
    const fleshOnly = [...PROTEIN_WAVE_C_DISHES, ...BALANCED_WAVE_C_DISHES].filter(
      (d) => dishPatterns(d).length === 1 && dishPatterns(d)[0] === "non_vegetarian",
    );
    expect(fleshOnly.length).toBeGreaterThan(0);
  });
});
