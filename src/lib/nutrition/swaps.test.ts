/**
 * Calorie-matched swaps (N-UI): same food group, energy matched within
 * ±25%, ranked by the focus nutrient's gain, filtered by the plan's own
 * eligibility (pattern + allergy), and never across the provenance
 * line — an estimate or an own value cannot be swapped into a fake.
 */
import { describe, expect, it } from "vitest";

import { USDA_REFERENCE_FOODS, findUsdaReference } from "./usdaReference";
import { eligiblePool } from "./plan";
import { buildSwapEntry, swapFocusFor, swapsFor } from "./swaps";
import { createEntryFromFood } from "./entries";
import type { Food, LogEntry } from "./types";
import type { HealthProfile } from "@/lib/vitalis/domain/profile";

const NOW = "2026-11-15T08:00:00.000Z";

function logOf(food: Food, grams: number): LogEntry {
  const entry = createEntryFromFood({
    food,
    amount: { grams },
    meal: "breakfast",
    day: "2026-11-15",
    source: "search",
    now: NOW,
  });
  if (!entry) throw new Error("entry refused");
  return entry;
}

const egg = findUsdaReference("usda-171287")!;
const eggWhite = findUsdaReference("usda-172183")!;

describe("swapsFor", () => {
  it("offers same-group, calorie-matched options ranked by protein gain", () => {
    const entry = logOf(egg, 100); /* 143 kcal, 12.6 g protein */
    const options = swapsFor(entry, egg, USDA_REFERENCE_FOODS, "protein");
    expect(options.length).toBeGreaterThan(0);
    expect(options[0]!.food.id).toBe(eggWhite.id);
    for (const option of options) {
      expect(option.food.classification?.group).toBe("eggs");
      expect(Math.abs(option.nutrients.kcal - entry.nutrients.kcal)).toBeLessThanOrEqual(
        entry.nutrients.kcal * 0.25,
      );
      expect(option.delta).toBeGreaterThan(0);
    }
    const deltas = options.map((o) => o.delta);
    expect(deltas).toEqual([...deltas].sort((a, b) => b - a));
  });

  it("excludes the food itself and anything outside its group", () => {
    const entry = logOf(egg, 100);
    const options = swapsFor(entry, egg, USDA_REFERENCE_FOODS, "protein");
    expect(options.some((o) => o.food.id === egg.id)).toBe(false);
  });

  it("honours the plan's pattern filter: an eggetarian pool holds no flesh swaps", () => {
    const chicken = findUsdaReference("usda-2646170")!;
    const entry = logOf(chicken, 100);
    const eggetarianProfile = {
      dietary: { pattern: "eggetarian", allergies: [], intolerances: [], dislikedFoods: [] },
    } as unknown as HealthProfile;
    const pool = eligiblePool(eggetarianProfile, USDA_REFERENCE_FOODS);
    expect(pool.some((f) => f.id === chicken.id)).toBe(false);
    /* PF-1 (2026-11-19): this used to equal [] because the eggetarian
       pool held no same-group ("other"), calorie-matched protein swap
       for chicken at all. The wave added two eggetarian-legal group-
       "other" powders, so swaps now exist — the invariant this test
       guards is unchanged and now exercised against real candidates:
       every offered swap is flesh-free and fish-free. */
    const eggetarianSwaps = swapsFor(entry, chicken, pool, "protein");
    expect(eggetarianSwaps.map((o) => o.food.id).sort()).toEqual([
      "usda-173180",
      "usda-173427",
    ]);
    for (const option of eggetarianSwaps) {
      expect(option.food.classification?.isFlesh).toBe(false);
      expect(option.food.classification?.isFish).toBe(false);
    }
    /* …while the unfiltered pool does offer same-group options. */
    expect(swapsFor(entry, chicken, USDA_REFERENCE_FOODS, "protein").length).toBeGreaterThan(0);
  });

  it("a fibre focus needs the entry itself to report fibre", () => {
    const entry = logOf(egg, 100);
    expect(entry.nutrients.fibreG).toBe(0); /* USDA publishes 0 for egg */
    const options = swapsFor(entry, egg, USDA_REFERENCE_FOODS, "fibre");
    /* Egg white and yolk report no fibre gain over 0 in the eggs group —
       an honest empty, not a fabricated ranking. */
    expect(options.every((o) => o.delta > 0)).toBe(true);
  });
});

describe("swapFocusFor", () => {
  it("picks fibre only when fibre is the bigger known gap", () => {
    const targets = { kcal: 2000, proteinG: 100 };
    expect(
      swapFocusFor({ kcal: 500, proteinG: 90, carbsG: 50, fatG: 20, fibreG: 3 }, targets, 30),
    ).toBe("fibre");
    expect(
      swapFocusFor({ kcal: 500, proteinG: 20, carbsG: 50, fatG: 20, fibreG: 29 }, targets, 30),
    ).toBe("protein");
    /* Fibre unreported → protein, the quantity Bloom knows. */
    expect(
      swapFocusFor({ kcal: 500, proteinG: 20, carbsG: 50, fatG: 20 }, targets, 30),
    ).toBe("protein");
    expect(swapFocusFor({ kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }, null, 30)).toBe("protein");
  });
});

describe("buildSwapEntry", () => {
  it("keeps the entry's identity and takes the candidate's USDA values", () => {
    const entry = logOf(egg, 100);
    const option = swapsFor(entry, egg, USDA_REFERENCE_FOODS, "protein")[0]!;
    const swapped = buildSwapEntry(entry, option);
    expect(swapped).not.toBeNull();
    expect(swapped!.id).toBe(entry.id);
    expect(swapped!.day).toBe(entry.day);
    expect(swapped!.meal).toBe(entry.meal);
    expect(swapped!.createdAt).toBe(entry.createdAt);
    expect(swapped!.foodId).toBe(eggWhite.id);
    expect(swapped!.provenance.kind).toBe("usda");
    expect(swapped!.nutrients.kcal).toBe(option.nutrients.kcal);
  });

  it("refuses to swap an estimate entry — a guess never becomes a reference food", () => {
    const estimate: LogEntry = {
      id: "est-1",
      day: "2026-11-15",
      meal: "lunch",
      foodId: null,
      snapshot: { name: "Biryani", totals: { kcal: 500, proteinG: 20, carbsG: 60, fatG: 18 } },
      name: "Biryani",
      amount: { servings: 1, servingLabel: "Photo portion" },
      nutrients: { kcal: 500, proteinG: 20, carbsG: 60, fatG: 18 },
      provenance: { kind: "coach_estimate", label: "Estimate — based on your photo" },
      source: "coach_photo",
      createdAt: NOW,
    };
    const option = {
      food: eggWhite,
      grams: 100,
      nutrients: { kcal: 52, proteinG: 10.9, carbsG: 0.7, fatG: 0.2 },
      delta: 1,
    };
    expect(buildSwapEntry(estimate, option)).toBeNull();
  });
});
