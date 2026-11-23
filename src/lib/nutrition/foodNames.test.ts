import { describe, expect, it } from "vitest";

import { FOOD_NAMES, foodNamesFor } from "./data/foodNames";
import { REFERENCE_FOODS } from "./referenceFoods";
import { USDA_REFERENCE_FOODS } from "./usdaReference";

/**
 * Display-name coverage (D1): the friendly + Hindi name layer is total
 * over the reference set — a food added to the set without names fails
 * here, so nothing can ship wearing only its USDA analyst description.
 * The names themselves are words, not values: this suite also pins that
 * the display layer never leaks the legalese it exists to strip.
 */

describe("food display + Hindi names", () => {
  /* M-229: the library ships from two sources now (USDA + UK CoFID), so
     coverage is asserted over the combined reference set. */
  it("covers every reference food, exactly — no gaps, no orphans", () => {
    const ids = REFERENCE_FOODS.map((f) => f.id).sort();
    expect(Object.keys(FOOD_NAMES).sort()).toEqual(ids);
  });

  it("every entry carries both names, non-empty", () => {
    for (const food of REFERENCE_FOODS) {
      const names = foodNamesFor(food.id);
      expect(names, food.id).not.toBeNull();
      expect(names!.display.trim().length, food.id).toBeGreaterThan(0);
      expect(names!.hindi.trim().length, food.id).toBeGreaterThan(0);
    }
  });

  it("Hindi names are Devanagari, as a Hindi-speaking cook writes them", () => {
    for (const [id, names] of Object.entries(FOOD_NAMES)) {
      expect(names.hindi, id).toMatch(/[ऀ-ॿ]/);
    }
  });

  it("display names strip the USDA legalese the data layer keeps", () => {
    for (const names of Object.values(FOOD_NAMES)) {
      expect(names.display).not.toMatch(/mature seeds|Food Distribution Program|raw, fresh/i);
    }
    /* The two worst offenders, pinned by name. */
    expect(foodNamesFor("usda-168893")!.display).toBe("Whole wheat flour (atta)");
    expect(foodNamesFor("usda-175199")!.display).toBe("Pinto beans");
    /* And the USDA record itself is untouched — the stripping is display-only. */
    const atta = USDA_REFERENCE_FOODS.find((f) => f.id === "usda-168893")!;
    expect(atta.name).toContain("Food Distribution Program");
  });

  it("the kitchen staples carry their real Hindi names", () => {
    expect(foodNamesFor("usda-172436")!.hindi).toBe("अरहर दाल");
    expect(foodNamesFor("usda-174256")!.hindi).toBe("मूंग दाल");
    expect(foodNamesFor("usda-174259")!.hindi).toBe("उड़द दाल");
    expect(foodNamesFor("usda-172231")!.hindi).toBe("हल्दी");
    expect(foodNamesFor("usda-170923")!.hindi).toBe("जीरा");
    expect(foodNamesFor("usda-174288")!.hindi).toBe("बेसन");
    expect(foodNamesFor("usda-171314")!.hindi).toBe("घी");
  });

  it("a non-reference id has no names — user foods keep their own", () => {
    expect(foodNamesFor("usda-999999")).toBeNull();
    expect(foodNamesFor("my-own-food")).toBeNull();
  });
});
