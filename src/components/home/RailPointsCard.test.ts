import { describe, expect, it } from "vitest";

import { railPointsModel } from "./RailPointsCard";

/**
 * The rail Level card's derivation: every figure must come from Bloom's
 * real rank ladder (rankFor) — never from hardcoded threshold maths.
 * Expected values below are read straight off lib/progression/ranks:
 * Seedling 0, First Bloom 500, Sprout 1,200, Budding 2,200 …
 * Bloomkeeper 25,000, then cycle seasons every 6,000. Since brief v4
 * (M-47) the model also carries the meter's label values (intoRank of
 * span) and the points still needed for the next rank — the card
 * prints no bare percentage.
 */
describe("railPointsModel", () => {
  it("starts at Seedling with First Bloom next and no progress", () => {
    expect(railPointsModel(0)).toEqual({
      rankName: "Seedling",
      nextName: "First Bloom",
      pct: 0,
      intoRank: 0,
      span: 500,
      pointsToNext: 500,
    });
  });

  it("derives the percent from the current rank's span, not the next threshold", () => {
    // 865 sits in First Bloom (500–1,200): (865 − 500) / 700 = 52%.
    // The prototype's points/next-threshold formula would say 72%.
    expect(railPointsModel(865)).toEqual({
      rankName: "First Bloom",
      nextName: "Sprout",
      pct: 52,
      intoRank: 365,
      span: 700,
      pointsToNext: 335,
    });
  });

  it("matches the live account's shape: 965 is First Bloom, 235 to Sprout", () => {
    // Sprout's threshold is 1,200 (not the 1,000 sometimes quoted):
    // 965 − 500 = 465 into the rank, 1,200 − 965 = 235 remaining.
    expect(railPointsModel(965)).toEqual({
      rankName: "First Bloom",
      nextName: "Sprout",
      pct: 66,
      intoRank: 465,
      span: 700,
      pointsToNext: 235,
    });
  });

  it("rolls into the next rank exactly at its threshold", () => {
    expect(railPointsModel(1200)).toEqual({
      rankName: "Sprout",
      nextName: "Budding",
      pct: 0,
      intoRank: 0,
      span: 1000,
      pointsToNext: 1000,
    });
  });

  it("crosses from the named ladder into the cycle seasons", () => {
    expect(railPointsModel(25000)).toEqual({
      rankName: "Bloomkeeper",
      nextName: "Season of Light",
      pct: 0,
      intoRank: 0,
      span: 6000,
      pointsToNext: 6000,
    });
    // Halfway through the first season's 6,000-point span.
    expect(railPointsModel(28000).pct).toBe(50);
    expect(railPointsModel(28000).pointsToNext).toBe(3000);
  });
});
