import { describe, expect, it } from "vitest";

import { DISH_LIBRARY } from "./data/dishLibrary";
import { SHAKES_DISHES } from "./data/dishLibraryShakes";
import {
  computeBudgetTier,
  dishNutrients,
  dishPatterns,
  parseDishList,
  validateDish,
} from "./dishes";
import { USDA_REFERENCE_FOODS } from "./usdaReference";

/**
 * Protein wave PW-1 — protein shakes & smoothies, the first wave of
 * the owner's protein mandate (300+ protein-related additions across
 * the waves). The bar is the standing one: at least 25 g of protein
 * in a serving, COMPUTED by `dishNutrients` from the lines, never
 * asserted — and the health rules that removed 99 dishes overnight
 * hold here too: no shake in this wave carries added sugar or honey
 * at all (ripe fruit sweetens), and no egg is blended raw (the egg
 * shakes boil the egg first, and their methods say so).
 */

const foodById = new Map(USDA_REFERENCE_FOODS.map((f) => [f.id, f]));

/** Sugar and honey — banned as lines outright in this wave, not
 *  merely capped: fruit does the sweetening. */
const SWEETENER_IDS = new Set(["usda-334247", "usda-169640"]);

/** Per-line sanity caps a real shake serving respects, by the role
 *  the food plays in a blender. */
function lineCap(foodId: string): number {
  switch (foodId) {
    case "usda-330137": // greek yogurt
    case "usda-328841": // cottage cheese
    case "usda-322892": // whole milk
    case "usda-322559": // skim milk
    case "usda-323444": // ricotta
      return 300;
    case "usda-172448": // tofu
      return 250;
    case "usda-174272": // tempeh
      return 120;
    case "usda-173177": // whey protein powder isolate
    case "usda-173181": // soy protein powder
      return 45;
    case "usda-2346396": // oats
    case "usda-168874": // quinoa
      return 60;
    default:
      return 250;
  }
}

describe("protein wave PW-1 — shakes & smoothies", () => {
  it("holds exactly 75 shakes, every one in the shake category", () => {
    expect(SHAKES_DISHES.length).toBe(75);
    for (const dish of SHAKES_DISHES) {
      expect(dish.category, dish.id).toBe("shake");
      expect(dish.id.startsWith("dish-shake-"), dish.id).toBe(true);
      expect(dish.servings, dish.id).toBe(1);
      /* The five sattu shakes are India's own protein drink and are
         tagged india; the rest of the wave is global. */
      expect(["india", "international"], dish.id).toContain(dish.cuisine);
    }
    expect(SHAKES_DISHES.filter((d) => d.cuisine === "india").length).toBe(5);
    expect(SHAKES_DISHES.filter((d) => d.cuisine === "international").length).toBe(70);
  });

  it("has unique ids that never collide with the rest of the library", () => {
    const ids = SHAKES_DISHES.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    const waveIds = new Set(ids);
    for (const dish of DISH_LIBRARY) {
      if (!waveIds.has(dish.id)) continue;
      /* The only library entries carrying a wave id are the wave itself. */
      expect(SHAKES_DISHES).toContain(dish);
    }
    /* Rest of library at integration: 903 cleaned base + PW-2 (74 after
       the bacalhau dedupe) + PW-3 (75) + PW-4 (75) = 1,127; 1,128 after
       method 14 (2026-11-20) added the plain Steamed Rice; 1,180 after
       the Bulgarian wave (2026-11-26) added its 52 dishes; 1,266 after
       the Bulgarian wave 2 (2026-11-26) added its 86 dishes; 1,336
       after protein wave A (2026-11-26) added its 70 dishes; 1,406
       after protein wave B (2026-11-26) added its 70 dishes; 1,476
       after protein wave C (2026-11-26) added its 70 dishes. */
    expect(DISH_LIBRARY.length).toBe(1476 + SHAKES_DISHES.length);
  });

  it("is complete against the reference set — every dish validates clean", () => {
    for (const dish of SHAKES_DISHES) {
      expect(validateDish(dish), dish.id).toEqual([]);
    }
  });

  it("stores the budget tier the heuristic computes — never an authored one", () => {
    for (const dish of SHAKES_DISHES) {
      expect(dish.budgetTier, dish.id).toBe(computeBudgetTier(dish));
    }
  });

  it("survives the strict parser unchanged", () => {
    const roundTripped = parseDishList(JSON.parse(JSON.stringify(SHAKES_DISHES)));
    expect(roundTripped).toEqual(SHAKES_DISHES);
  });

  it("clears the protein bar — every shake, computed, never asserted", () => {
    const proteins = SHAKES_DISHES.map(
      (d) => dishNutrients(d).nutrients.proteinG,
    );
    for (const [i, protein] of proteins.entries()) {
      const dish = SHAKES_DISHES[i];
      expect(
        protein,
        `${dish ? dish.id : `shake #${i}`} computes ${protein.toFixed(1)} g protein/serving`,
      ).toBeGreaterThanOrEqual(25);
    }
    const mean = proteins.reduce((a, b) => a + b, 0) / proteins.length;
    expect(mean).toBeGreaterThanOrEqual(27);
  });

  it("carries no added sugar and no honey — fruit sweetens, nothing else", () => {
    for (const dish of SHAKES_DISHES) {
      for (const line of dish.lines) {
        expect(SWEETENER_IDS.has(line.foodId), `${dish.id} uses ${line.foodId}`).toBe(false);
      }
    }
  });

  it("uses no flesh and no fish — shakes are dairy, egg or plant, by construction", () => {
    for (const dish of SHAKES_DISHES) {
      for (const line of dish.lines) {
        const food = foodById.get(line.foodId);
        expect(food?.classification?.isFlesh, `${dish.id} uses ${line.foodId}`).toBe(false);
        expect(food?.classification?.isFish, `${dish.id} uses ${line.foodId}`).toBe(false);
      }
    }
  });

  it("carries a Devanagari name and a real method for every shake", () => {
    for (const dish of SHAKES_DISHES) {
      expect(dish.name.hindi, dish.id).toMatch(/[ऀ-ॿ]/);
      expect(dish.name.en.trim().length, dish.id).toBeGreaterThan(0);
      expect(dish.method.length, dish.id).toBeGreaterThanOrEqual(4);
      expect(dish.method.length, dish.id).toBeLessThanOrEqual(6);
    }
  });

  it("keeps portions inside the sanity caps a real serving respects", () => {
    for (const dish of SHAKES_DISHES) {
      const { nutrients } = dishNutrients(dish);
      expect(nutrients.kcal, `${dish.id} kcal/serving`).toBeGreaterThanOrEqual(150);
      expect(nutrients.kcal, `${dish.id} kcal/serving`).toBeLessThanOrEqual(750);
      for (const line of dish.lines) {
        const perServing = line.grams / dish.servings;
        expect(perServing, `${dish.id} line ${line.foodId}`).toBeLessThanOrEqual(
          lineCap(line.foodId),
        );
        /* No oils in a shake — the fats_oils group never appears. */
        expect(foodById.get(line.foodId)?.classification?.group, dish.id).not.toBe(
          "fats_oils",
        );
        /* Nuts and seeds are boosters, not the glass: ≤ 40 g a line.
           The coconut foods are the exception — FDC groups coconut
           with the nuts & seeds, but coconut milk is a liquid base
           and coconut meat a fruit flesh, not a booster sprinkle. */
        if (
          foodById.get(line.foodId)?.classification?.group === "nuts_seeds" &&
          line.foodId !== "usda-170172" &&
          line.foodId !== "usda-170169"
        ) {
          expect(perServing, `${dish.id} nuts/seeds`).toBeLessThanOrEqual(40);
        }
      }
    }
  });

  it("serves the patterns honestly — a real vegan bench, not a token one", () => {
    const suits = (p: string) =>
      SHAKES_DISHES.filter((d) => dishPatterns(d).includes(p as never)).length;
    /* Every shake suits at least one pattern (an unclassified line
       would silently suit none — that is a data error here). */
    for (const dish of SHAKES_DISHES) {
      expect(dishPatterns(dish).length, dish.id).toBeGreaterThanOrEqual(1);
    }
    expect(suits("vegan")).toBeGreaterThanOrEqual(15);
    expect(suits("vegetarian")).toBeGreaterThanOrEqual(70);
    expect(suits("eggetarian")).toBe(75);
    /* Ovo-vegetarian counts the vegan bench exactly: every egg shake
       in this wave also carries dairy, so no shake is ovo-only. */
    expect(suits("ovo_vegetarian")).toBeGreaterThanOrEqual(18);
  });

  it("builds on the two generic protein powders — and only those two", () => {
    const powderUsers = SHAKES_DISHES.filter((d) =>
      d.lines.some((l) => l.foodId === "usda-173177" || l.foodId === "usda-173181"),
    );
    expect(powderUsers.length).toBe(9);
    expect(
      SHAKES_DISHES.filter((d) => d.lines.some((l) => l.foodId === "usda-173177")).length,
    ).toBe(6);
    expect(
      SHAKES_DISHES.filter((d) => d.lines.some((l) => l.foodId === "usda-173181")).length,
    ).toBe(3);
  });
});
