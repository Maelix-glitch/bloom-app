import { describe, expect, it } from "vitest";

import { railPointsModel } from "./RailPointsCard";

/**
 * The rail points card's derivation (Reskin slice 2): the percentage and
 * the "next level" must come from Bloom's real rank ladder (rankFor) —
 * never from the prototype's hardcoded threshold maths. Expected values
 * below are read straight off lib/progression/ranks: Seedling 0,
 * First Bloom 500, Sprout 1,200, Budding 2,200 … Bloomkeeper 25,000,
 * then cycle seasons every 6,000.
 */
describe("railPointsModel", () => {
  it("starts at Seedling with First Bloom next and no progress", () => {
    expect(railPointsModel(0)).toEqual({
      rankName: "Seedling",
      nextName: "First Bloom",
      pct: 0,
    });
  });

  it("derives the percent from the current rank's span, not the next threshold", () => {
    // 865 sits in First Bloom (500–1,200): (865 − 500) / 700 = 52%.
    // The prototype's points/next-threshold formula would say 72%.
    expect(railPointsModel(865)).toEqual({
      rankName: "First Bloom",
      nextName: "Sprout",
      pct: 52,
    });
  });

  it("rolls into the next rank exactly at its threshold", () => {
    expect(railPointsModel(1200)).toEqual({
      rankName: "Sprout",
      nextName: "Budding",
      pct: 0,
    });
  });

  it("crosses from the named ladder into the cycle seasons", () => {
    expect(railPointsModel(25000)).toEqual({
      rankName: "Bloomkeeper",
      nextName: "Season of Light",
      pct: 0,
    });
    // Halfway through the first season's 6,000-point span.
    expect(railPointsModel(28000).pct).toBe(50);
  });
});
