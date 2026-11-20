import { describe, expect, it } from "vitest";

import {
  DISH_CATEGORIES,
  dishNutrients,
  dishPatterns,
  validateDish,
} from "./dishes";
import { DISH_LIBRARY, findDish } from "./data/dishLibrary";

/**
 * The assembled library (D2): the owner's 200+ dish bar, with the whole
 * library held to the D1 integrity rules at once — unique ids, every
 * dish valid, every dish's numbers computable, every pattern served.
 */
describe("the dish library", () => {
  it("clears the owner's 200-dish bar", () => {
    /* 1,203 after method 14 (2026-11-20) added the plain Steamed
       Rice — the base dish the accompaniment rule serves beside a
       gravy (M-160); before that, 1,202 after the 2026-11-17 protein
       waves added 300 dishes (PW-1
       shakes, PW-2 breakfasts & snacks, PW-3 Indian/Kerala mains, PW-4
       international mains) to the cleaned 903, minus one cross-wave
       duplicate found at integration (PW-2's bacalhau à brás duplicated
       PW-4's main-course version). 903 after the borderline removal took
       out 7 dishes the owner delegated to Muse's call (sugar-defined
       condiments and deep-fried breads); 910 before that, after the same
       day's duplicate audit removed 31 twice-authored dishes (941 before
       the dedupe). */
    expect(DISH_LIBRARY.length).toBe(1203);
    expect(DISH_LIBRARY.length).toBeGreaterThanOrEqual(200);
  });

  it("has unique ids, and findDish resolves them", () => {
    const ids = new Set(DISH_LIBRARY.map((d) => d.id));
    expect(ids.size).toBe(DISH_LIBRARY.length);
    for (const dish of DISH_LIBRARY) {
      expect(findDish(dish.id)).toBe(dish);
    }
    expect(findDish("dish-no-such-dish")).toBeNull();
  });

  it("every dish validates clean and computes finite nutrients", () => {
    for (const dish of DISH_LIBRARY) {
      expect(validateDish(dish), dish.id).toEqual([]);
      const { nutrients } = dishNutrients(dish);
      expect(Number.isFinite(nutrients.kcal), dish.id).toBe(true);
      expect(nutrients.kcal, dish.id).toBeGreaterThan(0);
    }
  });

  it("every dish carries a Hindi name in Devanagari", () => {
    for (const dish of DISH_LIBRARY) {
      expect(dish.name.hindi, dish.id).toMatch(/[ऀ-ॿ]/);
      expect(dish.name.en.length, dish.id).toBeGreaterThan(2);
    }
  });

  it("tags every dish with a cuisine from the three-value taxonomy", () => {
    /* Counts computed from the assembled library and pinned: the
       original dishes and the India wave carry "india" (300), the
       Kerala wave is its own shelf (97), and the four international
       waves carry "international" (506). No dish is untagged, and no
       dish carries a value outside the taxonomy. (India 313 → 306 and
       international 530 → 506 in the 2026-11-17 dedupe: 7 Indian and
       24 international duplicates removed; then india 306 → 300 and
       kerala 98 → 97 in the same day's borderline removal of 6 Indian
       and 1 Kerala dish.) */
    const counts: Record<string, number> = { india: 0, kerala: 0, international: 0 };
    for (const dish of DISH_LIBRARY) {
      expect(dish.cuisine, dish.id).toBeDefined();
      expect(Object.keys(counts), dish.id).toContain(dish.cuisine);
      const tag = dish.cuisine as string;
      counts[tag] = (counts[tag] ?? 0) + 1;
    }
    expect(counts).toEqual({ india: 376, kerala: 125, international: 702 });
  });

  it("covers every category", () => {
    for (const category of DISH_CATEGORIES) {
      const count = DISH_LIBRARY.filter((d) => d.category === category).length;
      /* Dessert is the deliberate exception: the owner's unhealthy-dish
         removal took the sweets out of the library, leaving only the
         fruit salad — every other category keeps its breadth floor. */
      expect(count, category).toBeGreaterThanOrEqual(category === "dessert" ? 1 : 5);
    }
  });

  it("serves every dietary pattern properly, not just one", () => {
    const suits = (p: string) =>
      DISH_LIBRARY.filter((d) => dishPatterns(d).includes(p as never)).length;
    expect(suits("vegan")).toBeGreaterThanOrEqual(100);
    expect(suits("vegetarian")).toBeGreaterThanOrEqual(190);
    expect(suits("eggetarian")).toBeGreaterThanOrEqual(200);
    expect(suits("ovo_vegetarian")).toBeGreaterThanOrEqual(100);
    expect(suits("pescatarian")).toBeGreaterThanOrEqual(200);
    // The flesh core: dishes no vegetarian pattern admits (meat, poultry
    // and fish — fish dishes also suit pescatarian by design).
    const fleshCore = DISH_LIBRARY.filter((d) => !dishPatterns(d).includes("vegetarian"));
    expect(fleshCore.length).toBeGreaterThanOrEqual(25);
    const meatOnly = DISH_LIBRARY.filter((d) => {
      const patterns = dishPatterns(d);
      return patterns.length === 1 && patterns[0] === "non_vegetarian";
    });
    expect(meatOnly.length).toBeGreaterThanOrEqual(10);
    // And every dish suits at least one pattern.
    for (const dish of DISH_LIBRARY) {
      expect(dishPatterns(dish).length, dish.id).toBeGreaterThanOrEqual(1);
    }
  });

  it("carries a real enriched set, each stating its boost", () => {
    const enriched = DISH_LIBRARY.filter((d) => d.enriched);
    expect(enriched.length).toBeGreaterThanOrEqual(20);
    for (const dish of enriched) {
      expect(dish.enrichment, dish.id).toBeTruthy();
    }
  });
});
