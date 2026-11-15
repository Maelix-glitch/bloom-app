import { describe, expect, it } from "vitest";
import { createEntryFromFood, createEstimateEntry } from "./entries";
import { parseLogEntry } from "./parse";
import type { Food } from "./types";

const NOW = "2026-11-15T03:00:00.000Z";

const FOOD: Food = {
  id: "food-oats",
  name: "Rolled oats",
  per100g: { kcal: 389, proteinG: 16.9, carbsG: 66.3, fatG: 6.9, fibreG: 10.6 },
  servings: [{ label: "1 cup", grams: 81 }],
  provenance: { kind: "usda", sourceId: "169705", dataType: "SR Legacy", label: "USDA" },
};

describe("nutrition entries · factories hold the invariants by construction", () => {
  it("a food-backed entry computes nutrients and inherits the food's provenance", () => {
    const entry = createEntryFromFood({
      food: FOOD,
      amount: { grams: 50 },
      meal: "breakfast",
      day: "2026-11-15",
      source: "search",
      now: NOW,
      id: "e-1",
    })!;
    expect(entry.nutrients).toEqual({ kcal: 195, proteinG: 8.5, carbsG: 33.2, fatG: 3.5, fibreG: 5.3 });
    expect(entry.provenance).toEqual(FOOD.provenance);
    expect(entry.foodId).toBe("food-oats");
    expect(entry.snapshot).toBeNull();
    expect(parseLogEntry(entry)).not.toBeNull();
  });

  it("an unresolvable amount yields no entry", () => {
    expect(
      createEntryFromFood({
        food: FOOD,
        amount: { servings: 1, servingLabel: "1 bucket" },
        meal: "breakfast",
        day: "2026-11-15",
        source: "search",
        now: NOW,
      }),
    ).toBeNull();
  });

  it("an estimate entry always carries the estimate flag, snapshot and no food link", () => {
    const entry = createEstimateEntry({
      name: "Biryani",
      totals: { kcal: 680, proteinG: 42, carbsG: 75, fatG: 24 },
      meal: "lunch",
      day: "2026-11-15",
      now: NOW,
      id: "e-2",
    })!;
    expect(entry.source).toBe("coach_photo");
    expect(entry.provenance.kind).toBe("coach_estimate");
    expect(entry.foodId).toBeNull();
    expect(entry.snapshot).toEqual({
      name: "Biryani",
      totals: { kcal: 680, proteinG: 42, carbsG: 75, fatG: 24 },
    });
    expect(entry.nutrients).toEqual(entry.snapshot!.totals);
    expect(parseLogEntry(entry)).not.toBeNull();
  });

  it("an estimate entry with unusable totals is refused, not repaired", () => {
    expect(
      createEstimateEntry({
        name: "Mystery",
        totals: { kcal: -5, proteinG: 1, carbsG: 1, fatG: 1 },
        meal: "lunch",
        day: "2026-11-15",
        now: NOW,
      }),
    ).toBeNull();
  });
});
