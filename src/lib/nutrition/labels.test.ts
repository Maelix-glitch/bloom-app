import { describe, expect, it } from "vitest";
import { createEntryFromFood, createEstimateEntry } from "./entries";
import {
  USER_ENTERED_LABEL,
  isEstimateProvenance,
  labelledEntryNutrients,
  labelledFoodNutrients,
  provenanceLabel,
} from "./labels";
import type { EntryProvenance, Food } from "./types";

const NOW = "2026-11-15T03:00:00.000Z";

function foodWith(provenance: Food["provenance"]): Food {
  return {
    id: "f-1",
    name: "Something",
    per100g: { kcal: 100, proteinG: 5, carbsG: 10, fatG: 2 },
    servings: [],
    provenance,
  };
}

describe("nutrition labels · one label per provenance kind", () => {
  it("the source's own shipped label wins for reference data", () => {
    expect(
      provenanceLabel({ kind: "usda", sourceId: "1", label: "USDA FoodData Central" }),
    ).toBe("USDA FoodData Central");
    expect(provenanceLabel({ kind: "off", sourceId: "3017620422003", label: "Open Food Facts" })).toBe(
      "Open Food Facts",
    );
  });

  it("a missing stored label falls back to the kind's own name — never blank", () => {
    expect(provenanceLabel({ kind: "usda", sourceId: "1", label: "" })).toBe("USDA FoodData Central");
    expect(provenanceLabel({ kind: "off", sourceId: "1", label: "" })).toBe("Open Food Facts");
    expect(provenanceLabel({ kind: "ifct", sourceId: "1", label: "" })).toBe("ICMR-NIN IFCT");
  });

  it("user-entered is always 'Your value', whatever was stored", () => {
    expect(provenanceLabel({ kind: "user_entered", sourceId: "f-1", label: "anything" })).toBe(
      USER_ENTERED_LABEL,
    );
  });

  it("a coach estimate is labelled as an estimate", () => {
    const label = provenanceLabel({ kind: "coach_estimate", label: "" });
    expect(label).toContain("Estimate");
    expect(isEstimateProvenance({ kind: "coach_estimate", label: "" })).toBe(true);
    expect(isEstimateProvenance({ kind: "usda", sourceId: "1", label: "x" })).toBe(false);
  });

  it("every provenance kind yields a non-empty label", () => {
    const kinds: EntryProvenance[] = [
      { kind: "usda", sourceId: "1", label: "" },
      { kind: "user_entered", sourceId: "1", label: "" },
      { kind: "off", sourceId: "1", label: "" },
      { kind: "ifct", sourceId: "1", label: "" },
      { kind: "coach_estimate", label: "" },
    ];
    for (const p of kinds) expect(provenanceLabel(p).length).toBeGreaterThan(0);
  });
});

describe("nutrition labels · display bundles carry numbers and label together", () => {
  it("a food's nutrients come bundled with their provenance label", () => {
    const food = foodWith({ kind: "usda", sourceId: "169705", label: "USDA FoodData Central" });
    const labelled = labelledFoodNutrients(food);
    expect(labelled.nutrients).toEqual(food.per100g);
    expect(labelled.label).toBe("USDA FoodData Central");
    expect(labelled.estimate).toBe(false);
  });

  it("an estimate entry's bundle is flagged as an estimate", () => {
    const entry = createEstimateEntry({
      name: "Biryani",
      totals: { kcal: 680, proteinG: 42, carbsG: 75, fatG: 24 },
      meal: "lunch",
      day: "2026-11-15",
      now: NOW,
      id: "entry-est",
    })!;
    const labelled = labelledEntryNutrients(entry);
    expect(labelled.estimate).toBe(true);
    expect(labelled.label).toContain("Estimate");
    expect(labelled.nutrients.kcal).toBe(680);
  });

  it("a food-backed entry's bundle inherits the food's label, not an estimate flag", () => {
    const food = foodWith({ kind: "user_entered", sourceId: "f-1", label: USER_ENTERED_LABEL });
    const entry = createEntryFromFood({
      food,
      amount: { grams: 100 },
      meal: "breakfast",
      day: "2026-11-15",
      source: "custom",
      now: NOW,
      id: "entry-food",
    })!;
    const labelled = labelledEntryNutrients(entry);
    expect(labelled.estimate).toBe(false);
    expect(labelled.label).toBe(USER_ENTERED_LABEL);
  });
});
