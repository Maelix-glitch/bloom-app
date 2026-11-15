import { describe, expect, it } from "vitest";

import { MEAL_IMAGES, mealImage } from "./mealImages";
import { MEALS } from "./types";

/**
 * The plan banners are illustrative photographs, never data: this pins
 * the rules that keep them honest — every slot has one, each is the
 * slot's own bundled derivative (no hotlinks, no shared stand-ins), and
 * every alt names the image an illustration rather than describing it
 * as the meal the composer suggested.
 */
describe("mealImages", () => {
  it("has exactly one image per meal slot", () => {
    expect(Object.keys(MEAL_IMAGES).sort()).toEqual([...MEALS].sort());
    for (const meal of MEALS) {
      expect(mealImage(meal)).toBe(MEAL_IMAGES[meal]);
    }
  });

  it("gives every slot its own bundled derivative", () => {
    const srcs = MEALS.map((meal) => MEAL_IMAGES[meal].src);
    expect(new Set(srcs).size).toBe(MEALS.length);
    for (const meal of MEALS) {
      const src = MEAL_IMAGES[meal].src;
      expect(src).toContain(`meal-${meal}`);
      expect(src).not.toMatch(/^https?:\/\//);
    }
  });

  it("alt text always names the image an illustration", () => {
    for (const meal of MEALS) {
      expect(MEAL_IMAGES[meal].alt).toBe(`Illustration — a balanced ${meal}`);
    }
  });
});
