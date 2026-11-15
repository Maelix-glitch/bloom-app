import { describe, expect, it } from "vitest";
import type { BodyTargets } from "@/lib/health/body";
import type { BodyTargetsOutcome } from "@/lib/vitalis/calc/body";
import {
  dayLogOf,
  entryNutrientsFor,
  gramsForAmount,
  groupByDay,
  nutrientsForGrams,
  sumNutrients,
} from "./math";
import {
  compareTotalsToTargets,
  nutritionTargetsFromBodyTargets,
  nutritionTargetsFromOutcome,
} from "./targets";
import type { Food, LogEntry, Nutrients } from "./types";

const SIMPLE: Food = {
  id: "food-simple",
  name: "Simple",
  per100g: { kcal: 200, proteinG: 10, carbsG: 20, fatG: 5, fibreG: 4 },
  servings: [{ label: "1 bowl", grams: 250 }],
  provenance: { kind: "user_entered", sourceId: "food-simple", label: "Your value" },
};

function entry(id: string, day: string, nutrients: Nutrients): LogEntry {
  return {
    id,
    day,
    meal: "lunch",
    foodId: "food-simple",
    snapshot: null,
    name: "Simple",
    amount: { grams: 100 },
    nutrients,
    provenance: SIMPLE.provenance,
    source: "custom",
    createdAt: `${day}T08:00:00.000Z`,
  };
}

describe("nutrition math · portion scaling", () => {
  it("scales per-100 g values by grams, exactly", () => {
    expect(nutrientsForGrams(SIMPLE.per100g, 150)).toEqual({
      kcal: 300,
      proteinG: 15,
      carbsG: 30,
      fatG: 7.5,
      fibreG: 6,
    });
    expect(nutrientsForGrams(SIMPLE.per100g, 100)).toEqual(SIMPLE.per100g);
  });

  it("resolves servings through the food's serving grams", () => {
    expect(gramsForAmount(SIMPLE, { grams: 42 })).toBe(42);
    expect(gramsForAmount(SIMPLE, { servings: 2, servingLabel: "1 bowl" })).toBe(500);
    expect(entryNutrientsFor(SIMPLE, { servings: 2, servingLabel: "1 bowl" })).toEqual({
      kcal: 1000,
      proteinG: 50,
      carbsG: 100,
      fatG: 25,
      fibreG: 20,
    });
  });

  it("an amount naming an undefined serving cannot resolve — null, not a guess", () => {
    expect(gramsForAmount(SIMPLE, { servings: 1, servingLabel: "1 plate" })).toBeNull();
    expect(entryNutrientsFor(SIMPLE, { servings: 1, servingLabel: "1 plate" })).toBeNull();
  });

  it("scaling never invents optional nutrients the source lacks", () => {
    const bare: Nutrients = { kcal: 100, proteinG: 5, carbsG: 10, fatG: 2 };
    const scaled = nutrientsForGrams(bare, 200);
    expect("fibreG" in scaled).toBe(false);
    expect("sodiumMg" in scaled).toBe(false);
  });
});

describe("nutrition math · totals and day bucketing", () => {
  const a = entry("a", "2026-11-15", { kcal: 300, proteinG: 15, carbsG: 30, fatG: 7.5, fibreG: 6 });
  const b = entry("b", "2026-11-15", { kcal: 100, proteinG: 5, carbsG: 10, fatG: 2 });
  const c = entry("c", "2026-11-14", { kcal: 50, proteinG: 2, carbsG: 5, fatG: 1 });

  it("totals are the plain sum over the day's entries", () => {
    const log = dayLogOf([a, b, c], "2026-11-15");
    expect(log.entries.map((e) => e.id)).toEqual(["a", "b"]);
    expect(log.totals).toEqual({ kcal: 400, proteinG: 20, carbsG: 40, fatG: 9.5, fibreG: 6 });
  });

  it("an entry belongs to exactly its stored local day — no leakage across midnight", () => {
    expect(dayLogOf([a, b, c], "2026-11-14").entries.map((e) => e.id)).toEqual(["c"]);
    expect(dayLogOf([a, b, c], "2026-11-16").entries).toEqual([]);
    expect(dayLogOf([a, b, c], "2026-11-16").totals).toEqual({
      kcal: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
    });
  });

  it("groupByDay returns each day once, oldest first, with totals", () => {
    const days = groupByDay([b, c, a]);
    expect(days.map((d) => d.day)).toEqual(["2026-11-14", "2026-11-15"]);
    expect(days[1]!.totals.kcal).toBe(400);
  });

  it("optional totals: absent when no entry carries them, summed over carriers only", () => {
    const none = sumNutrients([b.nutrients, c.nutrients]);
    expect("fibreG" in none).toBe(false);
    const some = sumNutrients([a.nutrients, b.nutrients]);
    expect(some.fibreG).toBe(6);
    expect(sumNutrients([])).toEqual({ kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  });
});

describe("nutrition targets · comparison against the real engine shapes", () => {
  const totals: Nutrients = { kcal: 1500, proteinG: 60, carbsG: 180, fatG: 50 };

  it("compares kcal and protein only — the engine sets no macro targets", () => {
    const cmp = compareTotalsToTargets(totals, { kcal: 2000, proteinG: 100 });
    expect(cmp.kcalRemaining).toBe(500);
    expect(cmp.proteinRemaining).toBe(40);
    expect(cmp.kcalFraction).toBe(0.75);
    expect(cmp.proteinFraction).toBe(0.6);
    expect(Object.keys(cmp).sort()).toEqual([
      "kcalFraction",
      "kcalRemaining",
      "proteinFraction",
      "proteinRemaining",
      "targets",
      "totals",
    ]);
  });

  it("no targets → totals stand alone, every comparison field null", () => {
    const cmp = compareTotalsToTargets(totals, null);
    expect(cmp.targets).toBeNull();
    expect(cmp.kcalRemaining).toBeNull();
    expect(cmp.proteinRemaining).toBeNull();
    expect(cmp.kcalFraction).toBeNull();
    expect(cmp.totals).toEqual(totals);
  });

  it("adapts the legacy BodyTargets shape (calories / proteinG)", () => {
    const legacy = { calories: 2200, proteinG: 120 } as BodyTargets;
    expect(nutritionTargetsFromBodyTargets(legacy)).toEqual({ kcal: 2200, proteinG: 120 });
    expect(nutritionTargetsFromBodyTargets(null)).toBeNull();
  });

  it("adapts the safety-gated outcome; any refusal means no targets", () => {
    const ok = {
      ok: true,
      targets: { calorieTargetKcal: 1800, proteinG: 90 },
    } as unknown as BodyTargetsOutcome;
    expect(nutritionTargetsFromOutcome(ok)).toEqual({ kcal: 1800, proteinG: 90 });

    const blocked = {
      ok: false,
      reason: "safety_blocked",
      classification: "urgent",
      blockingFindings: ["x"],
    } as unknown as BodyTargetsOutcome;
    expect(nutritionTargetsFromOutcome(blocked)).toBeNull();

    const incomplete = {
      ok: false,
      reason: "profile_incomplete",
      missing: ["ageYears"],
    } as unknown as BodyTargetsOutcome;
    expect(nutritionTargetsFromOutcome(incomplete)).toBeNull();
  });
});
