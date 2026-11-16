/**
 * Food-and-mood patterns (N-UI): the two-days-each-side minimum, the
 * counts travelling with the averages, confidence that grows only
 * with n, and the honest empty result when the data has not earned a
 * pattern.
 */
import { describe, expect, it } from "vitest";

import { moodPatterns, type PatternDayInput } from "./patterns";

function day(partial: Partial<PatternDayInput> & { day: string }): PatternDayInput {
  return {
    mood: null,
    hasFood: false,
    proteinG: 0,
    fibreG: null,
    breakfastProteinG: 0,
    ...partial,
  };
}

const GUIDES = { proteinTargetG: 100, fibreReferenceG: 30 };

describe("moodPatterns", () => {
  it("returns nothing until both sides of a comparison have two days", () => {
    const days = [
      day({ day: "2026-11-01", mood: 8, hasFood: true, breakfastProteinG: 30 }),
      day({ day: "2026-11-02", mood: 6, hasFood: true, breakfastProteinG: 5 }),
    ];
    expect(moodPatterns(days, GUIDES)).toEqual([]);
    expect(moodPatterns([], GUIDES)).toEqual([]);
  });

  it("compares breakfast-protein days against lighter breakfasts, with counts", () => {
    const days = [
      day({ day: "2026-11-01", mood: 8, hasFood: true, breakfastProteinG: 30 }),
      day({ day: "2026-11-02", mood: 9, hasFood: true, breakfastProteinG: 40 }),
      day({ day: "2026-11-03", mood: 6, hasFood: true, breakfastProteinG: 5 }),
      day({ day: "2026-11-04", mood: 5, hasFood: true, breakfastProteinG: 10 }),
      /* No check-in / no food: takes part in nothing. */
      day({ day: "2026-11-05", mood: null, hasFood: true, breakfastProteinG: 40 }),
      day({ day: "2026-11-06", mood: 10, hasFood: false, breakfastProteinG: 40 }),
    ];
    const patterns = moodPatterns(days, GUIDES);
    const breakfast = patterns.find((p) => p.id === "breakfast-protein");
    expect(breakfast).toBeDefined();
    expect(breakfast!.withAvg).toBe(8.5);
    expect(breakfast!.withoutAvg).toBe(5.5);
    expect(breakfast!.delta).toBe(3);
    expect(breakfast!.withN).toBe(2);
    expect(breakfast!.withoutN).toBe(2);
    expect(breakfast!.confidence).toBe("tentative");
  });

  it("confidence grows to emerging only at fourteen compared days", () => {
    const days: PatternDayInput[] = [];
    for (let i = 0; i < 7; i += 1) {
      days.push(
        day({ day: `2026-10-${10 + i}`, mood: 8, hasFood: true, breakfastProteinG: 30 }),
      );
      days.push(
        day({ day: `2026-10-${20 + i}`, mood: 6, hasFood: true, breakfastProteinG: 5 }),
      );
    }
    const breakfast = moodPatterns(days, GUIDES).find((p) => p.id === "breakfast-protein");
    expect(breakfast!.confidence).toBe("emerging");
    expect(breakfast!.withN + breakfast!.withoutN).toBe(14);
  });

  it("a day whose fibre is unreported stands on neither side of the fibre comparison", () => {
    const days = [
      day({ day: "2026-11-01", mood: 8, hasFood: true, fibreG: 30 }),
      day({ day: "2026-11-02", mood: 8, hasFood: true, fibreG: 32 }),
      day({ day: "2026-11-03", mood: 5, hasFood: true, fibreG: 10 }),
      day({ day: "2026-11-04", mood: 5, hasFood: true, fibreG: null }),
      day({ day: "2026-11-05", mood: 5, hasFood: true, fibreG: 12 }),
    ];
    const fibre = moodPatterns(days, GUIDES).find((p) => p.id === "fibre");
    expect(fibre).toBeDefined();
    expect(fibre!.withN).toBe(2);
    expect(fibre!.withoutN).toBe(2); /* the null-fibre day is excluded, not counted short */
  });

  it("the protein-pace comparison needs a target to pace against", () => {
    const days = [
      day({ day: "2026-11-01", mood: 8, hasFood: true, proteinG: 95 }),
      day({ day: "2026-11-02", mood: 8, hasFood: true, proteinG: 120 }),
      day({ day: "2026-11-03", mood: 5, hasFood: true, proteinG: 40 }),
      day({ day: "2026-11-04", mood: 5, hasFood: true, proteinG: 50 }),
    ];
    expect(
      moodPatterns(days, { proteinTargetG: null, fibreReferenceG: 30 }).some(
        (p) => p.id === "protein-pace",
      ),
    ).toBe(false);
    expect(moodPatterns(days, GUIDES).some((p) => p.id === "protein-pace")).toBe(true);
  });
});
