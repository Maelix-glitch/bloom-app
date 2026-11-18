import { describe, expect, it } from "vitest";

import { DISH_LIBRARY, findDish } from "./data/dishLibrary";
import { dishRegion } from "./regions";

/**
 * The cuisine-preference region derivation (plan v8): a documented
 * mapping over the signals the library actually carries — its coarse
 * cuisine tag plus curated name markers. The census pins are the
 * point: a preference the library cannot answer for BOTH regions
 * would be a broken promise, so both regions must be deep.
 */

describe("dishRegion — census over the shipped library", () => {
  it("both regions hold more than 50 dishes", () => {
    let north = 0;
    let south = 0;
    for (const dish of DISH_LIBRARY) {
      const region = dishRegion(dish);
      if (region === "north_indian") north++;
      if (region === "south_indian") south++;
    }
    expect(north).toBeGreaterThan(50);
    expect(south).toBeGreaterThan(50);
  });

  it("every dish gets exactly one answer: north, south or neither", () => {
    for (const dish of DISH_LIBRARY) {
      const region = dishRegion(dish);
      expect(region === "north_indian" || region === "south_indian" || region === null).toBe(
        true,
      );
    }
  });
});

describe("dishRegion — named examples", () => {
  it("Thalassery Chicken Biryani is south (Kerala)", () => {
    const dish = DISH_LIBRARY.find((d) => d.name.en === "Thalassery Chicken Biryani")!;
    expect(dish).toBeDefined();
    expect(dishRegion(dish)).toBe("south_indian");
  });

  it("Amritsari Kulcha is north (Punjab)", () => {
    const dish = DISH_LIBRARY.find((d) => d.name.en === "Amritsari Kulcha")!;
    expect(dish).toBeDefined();
    expect(dishRegion(dish)).toBe("north_indian");
  });

  it("Bacalhau is neither (international)", () => {
    const dish = DISH_LIBRARY.find((d) => d.name.en.startsWith("Bacalhau"))!;
    expect(dish).toBeDefined();
    expect(dishRegion(dish)).toBeNull();
  });

  it("a Kerala-tagged dish is south even without a name marker", () => {
    const kerala = DISH_LIBRARY.find((d) => d.cuisine === "kerala")!;
    expect(kerala).toBeDefined();
    expect(dishRegion(kerala)).toBe("south_indian");
  });

  it("every international dish is neither", () => {
    for (const dish of DISH_LIBRARY) {
      if (dish.cuisine === "international") expect(dishRegion(dish)).toBeNull();
    }
  });

  it("pan-Indian staples with no regional name make no claim", () => {
    for (const name of ["Chicken Curry", "Vegetable Biryani", "Egg Curry"]) {
      const dish = DISH_LIBRARY.find((d) => d.name.en === name);
      if (dish) expect(dishRegion(dish), name).toBeNull();
    }
  });

  it("findDish round-trips the examples (library integrity)", () => {
    expect(findDish("dish-amritsari-kulcha")?.name.en).toBe("Amritsari Kulcha");
  });
});
