import { describe, expect, it } from "vitest";

import { DISH_LIBRARY } from "./data/dishLibrary";
import type { Dish } from "./dishes";
import {
  COUNTRIES,
  COUNTRY_CODES,
  CUISINE_COUNTRY,
  countryNameOf,
  dishCountry,
  dishOnShelf,
  dishSide,
  foodSidesForCountry,
  isCountryCode,
} from "./countries";

/**
 * M-251: the country model. The list is the full ISO 3166-1 alpha-2
 * list; placement is measured against the REAL dish library, the
 * way regions.test.ts pins dishRegion — a mapping that drifts from
 * the shelf it describes fails here, not in a user's plan.
 */

const byId = (id: string): Dish => {
  const dish = DISH_LIBRARY.find((d) => d.id === id);
  if (!dish) throw new Error(`fixture dish ${id} not in the library`);
  return dish;
};

describe("the country list", () => {
  it("is the full list: 247 codes, unique, alphabetical by name", () => {
    expect(COUNTRIES.length).toBe(247);
    expect(new Set(COUNTRY_CODES).size).toBe(247);
    const names = COUNTRIES.map((c) => c.name);
    expect([...names].sort((a, b) => a.localeCompare(b))).toEqual(names);
    for (const c of COUNTRIES) {
      expect(c.code).toMatch(/^[A-Z]{2}$/);
      expect(c.name.length).toBeGreaterThan(0);
    }
  });

  it("names the countries this slice is exercised with", () => {
    expect(countryNameOf("IN")).toBe("India");
    expect(countryNameOf("BG")).toBe("Bulgaria");
    expect(countryNameOf("GR")).toBe("Greece");
    expect(countryNameOf(null)).toBeNull();
    expect(countryNameOf("XX")).toBeNull();
    expect(isCountryCode("IN")).toBe(true);
    expect(isCountryCode("XX")).toBe(false);
    expect(isCountryCode(42)).toBe(false);
  });

  it("maps whole-cuisine tags to their country in the one place", () => {
    expect(CUISINE_COUNTRY["india"]).toBe("IN");
    expect(CUISINE_COUNTRY["kerala"]).toBe("IN");
    /* The Bulgarian wave tags its dishes cuisine: "bulgaria" — the
       mapping is already here, so that wave's dishes land in the
       Bulgaria shelf the day it merges, with no second change. */
    expect(CUISINE_COUNTRY["bulgaria"]).toBe("BG");
  });

  it("offers sides only where the data has them", () => {
    expect(foodSidesForCountry("IN")).toEqual([
      "north_indian",
      "south_indian",
      "east_indian",
      "west_indian",
    ]);
    expect(foodSidesForCountry("GR")).toEqual([]);
    expect(foodSidesForCountry("BG")).toEqual([]);
    expect(foodSidesForCountry(null)).toEqual([]);
  });
});

describe("dishCountry over the real library", () => {
  it("places the cuisine tags wholesale", () => {
    expect(dishCountry(byId("dish-varutharacha-sambar"))).toBe("IN");
    expect(dishCountry(byId("dish-veg-biryani"))).toBe("IN");
  });

  it("places international dishes by their names, one country only", () => {
    expect(dishCountry(byId("dish-intl-greek-chicken-souvlaki"))).toBe("GR");
    /* Already in the library today, tagged international: the one
       Bulgarian dish the marker table exists for. */
    expect(dishCountry(byId("dish-blk-kavarma"))).toBe("BG");
  });

  it("leaves the generic protein-wave dishes honestly unplaced", () => {
    expect(dishCountry(byId("dish-intl-herb-grilled-chicken"))).toBeNull();
  });

  it("leaves a dish claimed by two countries unplaced", () => {
    /* Ghanaian jollof: jollof claims Nigeria, the name claims Ghana. */
    expect(dishCountry(byId("dish-gh-jollof"))).toBeNull();
  });

  it("places a real share of the international shelf and never invents the rest", () => {
    const intl = DISH_LIBRARY.filter((d) => d.cuisine === "international");
    const placed = intl.filter((d) => dishCountry(d) !== null);
    expect(placed.length).toBeGreaterThanOrEqual(300);
    expect(intl.length - placed.length).toBeGreaterThanOrEqual(300);
    /* Greece is the deepest placed shelf in the library. */
    expect(DISH_LIBRARY.filter((d) => dishCountry(d) === "GR").length).toBeGreaterThanOrEqual(40);
    expect(DISH_LIBRARY.filter((d) => dishCountry(d) === "IN").length).toBeGreaterThanOrEqual(490);
  });
});

describe("dishSide over the real library", () => {
  it("reads the sides from the dishes' own names and tags", () => {
    expect(dishSide(byId("dish-dal-makhani"))).toBe("north_indian");
    expect(dishSide(byId("dish-varutharacha-sambar"))).toBe("south_indian");
    expect(dishSide(byId("dish-goan-fish-curry"))).toBe("west_indian");
    expect(dishSide(byId("dish-shorshe-machh"))).toBe("east_indian");
    expect(dishSide(byId("dish-khopra-patties"))).toBe("central_indian");
  });

  it("leaves pan-Indian dishes side-less — biryani belongs to no side", () => {
    expect(dishSide(byId("dish-veg-biryani"))).toBeNull();
  });

  it("gives non-Indian dishes no side at all", () => {
    expect(dishSide(byId("dish-intl-greek-chicken-souvlaki"))).toBeNull();
  });

  it("every offered side has a real shelf behind it", () => {
    for (const side of foodSidesForCountry("IN")) {
      const count = DISH_LIBRARY.filter((d) => dishSide(d) === side).length;
      expect(count, side).toBeGreaterThanOrEqual(10);
    }
  });
});

describe("dishOnShelf", () => {
  it("a side shelf holds its side's dishes and the shared dishes, not other sides'", () => {
    const north = byId("dish-dal-makhani");
    const south = byId("dish-varutharacha-sambar");
    const shared = byId("dish-veg-biryani");
    expect(dishOnShelf(north, "IN", "north_indian")).toBe(true);
    expect(dishOnShelf(south, "IN", "north_indian")).toBe(false);
    expect(dishOnShelf(shared, "IN", "north_indian")).toBe(true);
    expect(dishOnShelf(shared, "IN", "south_indian")).toBe(true);
  });

  it("no side chosen means the whole country; another country is never on the shelf", () => {
    const greek = byId("dish-intl-greek-chicken-souvlaki");
    expect(dishOnShelf(greek, "GR", null)).toBe(true);
    expect(dishOnShelf(greek, "IN", null)).toBe(false);
    expect(dishOnShelf(byId("dish-intl-herb-grilled-chicken"), "GR", null)).toBe(false);
  });
});
