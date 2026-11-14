import { describe, expect, it } from "vitest";

import { levelModel } from "./LevelCard";

/**
 * The LevelCard's derivations (Reskin slice A) must come from Bloom's
 * real rank ladder (rankFor / journeyRanks) — never the prototype's
 * Seed/Seedling/Sprout/Bloom names or its hardcoded 1,200 threshold.
 * Expected values are read straight off lib/progression/ranks:
 * Seedling 0, First Bloom 500, Sprout 1,200, Budding 2,200 …
 */
describe("levelModel", () => {
  it("starts at Seedling, heading for First Bloom, with the full span to go", () => {
    const m = levelModel(0);
    expect(m.rankName).toBe("Seedling");
    expect(m.nextName).toBe("First Bloom");
    expect(m.pct).toBe(0);
    expect(m.remaining).toBe(500);
    expect(m.affirmation).toBe("Everything begins quietly. You began.");
  });

  it("derives percent and remaining from the current rank's span", () => {
    // 865 sits in First Bloom (500–1,200): (865 − 500) / 700 = 52%, 335 to go.
    const m = levelModel(865);
    expect(m.rankName).toBe("First Bloom");
    expect(m.nextName).toBe("Sprout");
    expect(m.pct).toBe(52);
    expect(m.remaining).toBe(335);
  });

  it("rolls into the next rank exactly at its threshold", () => {
    const m = levelModel(1200);
    expect(m.rankName).toBe("Sprout");
    expect(m.nextName).toBe("Budding");
    expect(m.pct).toBe(0);
    expect(m.remaining).toBe(1000);
  });

  it("stepper is a window of real ladder ranks around the current one", () => {
    const m = levelModel(865);
    const names = m.stepper.map((s) => s.name);
    // Two behind would be one (Seedling), trimmed to the last four at most.
    expect(names).toEqual(["Seedling", "First Bloom", "Sprout", "Budding"]);
    expect(m.stepper.find((s) => s.current)?.name).toBe("First Bloom");
    expect(m.stepper.filter((s) => s.reached).map((s) => s.name)).toEqual([
      "Seedling",
      "First Bloom",
    ]);
  });

  it("never uses the prototype's rank names", () => {
    for (const balance of [0, 865, 5000, 30000]) {
      const m = levelModel(balance);
      expect(m.stepper.map((s) => s.name)).not.toContain("Seed");
      expect(m.rankName).not.toBe("Bloom");
    }
  });
});
