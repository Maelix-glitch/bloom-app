import { describe, expect, it } from "vitest";

import { dishPatterns, parseDishList, validateDish, type Dish } from "./dishes";
import { DISH_LIBRARY } from "./data/dishLibrary";
import { INDIA_DISHES } from "./data/dishLibraryIndia";
import { USDA_REFERENCE_FOODS } from "./usdaReference";

/**
 * Wave I-2 — the India wave: the rest of India beyond the original
 * pan-Indian set and the Kerala wave (WAVE I-1). North (Punjabi,
 * Kashmiri, Awadhi/UP, Himachali, Delhi), West (Gujarati,
 * Maharashtrian, Goan, Rajasthani, Sindhi, Parsi), East (Bengali,
 * Odia, Assamese, Bihari, North-East), Central (MP, Chhattisgarh)
 * and the non-Kerala South (Tamil incl. Chettinad, Andhra/Telangana
 * incl. Hyderabadi, Karnataka). There is NO protein bar on this wave
 * (that bar was international-only); the pins are the programme's
 * honesty standard instead: every dish validates clean (including
 * the budget heuristic — the computed tier wins), survives the
 * strict parser unchanged, uses only the verified USDA ingredient
 * set, carries a Devanagari name and a detailed 6–10 step method,
 * and suits at least one dietary pattern DERIVED by dishPatterns.
 * Patterns are computed from the ingredient lines, never asserted.
 */
describe("wave I-2 India dishes", () => {
  it("ships 100–110 dishes", () => {
    expect(INDIA_DISHES.length).toBe(103);
    expect(INDIA_DISHES.length).toBeGreaterThanOrEqual(100);
    expect(INDIA_DISHES.length).toBeLessThanOrEqual(110);
  });

  it("every dish carries cuisine india", () => {
    for (const dish of INDIA_DISHES) {
      expect(dish.cuisine, dish.id).toBe("india");
    }
  });

  it("uses the full category range", () => {
    const categories = new Set<Dish["category"]>(INDIA_DISHES.map((d) => d.category));
    /* Dessert is absent by design: the owner's unhealthy-dish removal
       took this wave's sweets (mithai, kheer, payasam-style desserts)
       out of the library. Every other category is still represented. */
    const expected: readonly Dish["category"][] = [
      "main",
      "side",
      "rice",
      "bread",
      "breakfast",
      "snack",
      "chutney",
      "drink",
    ];
    for (const category of expected) {
      expect(categories.has(category), category).toBe(true);
    }
  });

  it("every dish validates clean and survives the strict parser unchanged", () => {
    for (const dish of INDIA_DISHES) {
      expect(validateDish(dish), dish.id).toEqual([]);
      expect(parseDishList([dish]), dish.id).toEqual([dish]);
      expect(dishPatterns(dish).length, dish.id).toBeGreaterThanOrEqual(1);
    }
    // Round-trip the wave on its own: parseDishList caps a list at
    // MAX_DISHES (1000) and the whole library is now past that.
    const roundTripped = parseDishList(JSON.parse(JSON.stringify(INDIA_DISHES)));
    expect(roundTripped).toEqual(INDIA_DISHES);
  });

  it("ids are unique across the whole library", () => {
    const libraryIds = new Set(DISH_LIBRARY.map((d) => d.id));
    expect(libraryIds.size).toBe(DISH_LIBRARY.length);
    for (const dish of INDIA_DISHES) {
      expect(DISH_LIBRARY.filter((d) => d.id === dish.id).length, dish.id).toBe(1);
    }
  });

  it("every dish carries a Hindi name in Devanagari", () => {
    for (const dish of INDIA_DISHES) {
      expect(dish.name.hindi, dish.id).toMatch(/[ऀ-ॿ]/);
    }
  });

  it("writes a detailed method on every dish (6-10 steps)", () => {
    for (const dish of INDIA_DISHES) {
      expect(dish.method.length, dish.id).toBeGreaterThanOrEqual(6);
      expect(dish.method.length, dish.id).toBeLessThanOrEqual(10);
    }
  });

  it("no dish uses beef or pork (deliberate exclusion, as in every wave)", () => {
    const nameById = new Map(USDA_REFERENCE_FOODS.map((f) => [f.id, f.name]));
    for (const dish of INDIA_DISHES) {
      for (const line of dish.lines) {
        expect(nameById.get(line.foodId) ?? "", `${dish.id} -> ${line.foodId}`).not.toMatch(
          /beef|pork|bacon|\bham\b/i,
        );
      }
    }
  });

  it("covers every dietary pattern across the wave, derived not claimed", () => {
    const suited = (pattern: string) =>
      INDIA_DISHES.filter((d) => (dishPatterns(d) as readonly string[]).includes(pattern)).length;
    expect(suited("vegan")).toBeGreaterThan(0);
    expect(suited("vegetarian")).toBeGreaterThan(0);
    expect(suited("eggetarian")).toBeGreaterThan(0);
    // Non-veg dishes exist in the wave: dishes whose ONLY suited
    // pattern is non_vegetarian carry flesh or fish.
    const fleshOnly = INDIA_DISHES.filter(
      (d) => dishPatterns(d).length === 1 && dishPatterns(d)[0] === "non_vegetarian",
    );
    expect(fleshOnly.length).toBeGreaterThan(0);
  });
});
