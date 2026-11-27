import { describe, expect, it } from "vitest";

import {
  dishPatterns,
  parseDishList,
  validateDish,
} from "./dishes";
import { DISH_LIBRARY } from "./data/dishLibrary";
import { BULGARIA2_DISHES } from "./data/dishLibraryBulgaria2";
import { USDA_REFERENCE_FOODS } from "./usdaReference";

/**
 * The Bulgarian wave 2 (2026-11-26, owner ask): the everyday
 * Bulgarian table widened to 138 dishes across both waves — the
 * full chorba range, the skara grill, more kavarma and clay pots,
 * the fried weekday dishes, festive roasts and the sweet shelf,
 * healthy and heavy alike, costed honestly either way.
 *
 * The owner's decision of 2026-11-26 governs this shelf: beef and
 * pork ship AS THEMSELVES (the verified set's ground beef, ground
 * pork and pork loin), the meat named in every dish's name. The
 * wave-1 stand-ins stand (sirene through cottage cheese, kashkaval
 * through cheddar, dill and parsley through coriander leaves,
 * hand-rolled sheets for filo), joined by this wave's own, stated
 * in the data file's header (mayonnaise through a yogurt dressing,
 * sauerkraut through vinegar-soured fresh cabbage, wheat berries
 * through barley, the boza culture through a yogurt starter, the
 * karnache casing absent and the sausage hand-formed).
 */
describe("the Bulgarian wave 2", () => {
  it("ships 86 dishes (138 Bulgarian dishes across both waves)", () => {
    expect(BULGARIA2_DISHES.length).toBe(86);
  });

  it("every dish carries cuisine international", () => {
    for (const dish of BULGARIA2_DISHES) {
      expect(dish.cuisine, dish.id).toBe("international");
    }
  });

  it("spans the wave's category range", () => {
    const categories = new Set(BULGARIA2_DISHES.map((d) => d.category));
    for (const category of [
      "main",
      "side",
      "chutney",
      "breakfast",
      "bread",
      "dessert",
      "drink",
      "snack",
    ] as const) {
      expect(categories.has(category), category).toBe(true);
    }
  });

  it("every dish validates clean and survives the strict parser unchanged", () => {
    for (const dish of BULGARIA2_DISHES) {
      expect(validateDish(dish), dish.id).toEqual([]);
      expect(parseDishList([dish]), dish.id).toEqual([dish]);
      expect(dishPatterns(dish).length, dish.id).toBeGreaterThanOrEqual(1);
    }
    const roundTripped = parseDishList(JSON.parse(JSON.stringify(BULGARIA2_DISHES)));
    expect(roundTripped).toEqual(BULGARIA2_DISHES);
  });

  it("ids are unique across the whole library", () => {
    const libraryIds = new Set(DISH_LIBRARY.map((d) => d.id));
    expect(libraryIds.size).toBe(DISH_LIBRARY.length);
    for (const dish of BULGARIA2_DISHES) {
      expect(DISH_LIBRARY.filter((d) => d.id === dish.id).length, dish.id).toBe(1);
    }
  });

  it("every dish carries a Hindi name in Devanagari", () => {
    for (const dish of BULGARIA2_DISHES) {
      expect(dish.name.hindi, dish.id).toMatch(/[ऀ-ॿ]/);
    }
  });

  it("writes a detailed method on every dish (6-10 steps)", () => {
    for (const dish of BULGARIA2_DISHES) {
      expect(dish.method.length, dish.id).toBeGreaterThanOrEqual(6);
      expect(dish.method.length, dish.id).toBeLessThanOrEqual(10);
    }
  });

  it("beef and pork ship as themselves, costed only from the verified beef and pork foods", () => {
    /* Owner decision 2026-11-26: country shelves carry the
       country's real food. The verified set carries exactly three
       beef/pork foods; any beef or pork line in this wave must be
       one of them, and the wave must actually ship both meats. */
    const VERIFIED_BEEF_PORK = new Set(["usda-168608", "usda-2514745", "usda-2646168"]);
    const nameById = new Map(USDA_REFERENCE_FOODS.map((f) => [f.id, f.name]));
    const used = new Set<string>();
    for (const dish of BULGARIA2_DISHES) {
      for (const line of dish.lines) {
        const name = nameById.get(line.foodId) ?? "";
        if (/beef|pork/i.test(name)) {
          expect(VERIFIED_BEEF_PORK.has(line.foodId), `${dish.id} -> ${line.foodId}`).toBe(true);
          used.add(line.foodId);
        }
      }
    }
    expect(used.has("usda-168608"), "ground beef ships").toBe(true);
    expect(used.has("usda-2514745"), "ground pork ships").toBe(true);
    expect(used.has("usda-2646168"), "pork loin ships").toBe(true);
  });

  it("covers every dietary pattern across the wave, derived not claimed", () => {
    const suited = (pattern: string) =>
      BULGARIA2_DISHES.filter((d) => (dishPatterns(d) as readonly string[]).includes(pattern)).length;
    expect(suited("vegan")).toBeGreaterThan(0);
    expect(suited("vegetarian")).toBeGreaterThan(0);
    expect(suited("eggetarian")).toBeGreaterThan(0);
    // Non-veg dishes exist in the wave: dishes whose ONLY suited
    // pattern is non_vegetarian carry flesh or fish.
    const fleshOnly = BULGARIA2_DISHES.filter(
      (d) => dishPatterns(d).length === 1 && dishPatterns(d)[0] === "non_vegetarian",
    );
    expect(fleshOnly.length).toBeGreaterThan(0);
  });
});
