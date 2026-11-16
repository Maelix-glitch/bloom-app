/**
 * The micronutrient panel (N-UI): optional fields that exist only when
 * a source published them — parsed under caps, scaled and summed with
 * the absence rule intact, and shipped in the USDA reference set
 * exactly as FoodData Central published them.
 */
import { describe, expect, it } from "vitest";

import { USDA_REFERENCE_FOODS } from "./usdaReference";
import { incompleteOptionalFields, nutrientsForGrams, sumNutrients } from "./math";
import { parseLogEntry, parseNutrients } from "./parse";
import type { Nutrients } from "./types";

const BASE: Nutrients = { kcal: 100, proteinG: 10, carbsG: 10, fatG: 5 };

describe("micronutrients — parser", () => {
  it("accepts the panel within caps and drops a field beyond its cap without dropping the food", () => {
    const parsed = parseNutrients({
      ...BASE,
      potassiumMg: 350,
      magnesiumMg: 60,
      calciumMg: 120,
      ironMg: 2.5,
      vitaminCMg: 30,
    });
    expect(parsed).toMatchObject({
      potassiumMg: 350,
      magnesiumMg: 60,
      calciumMg: 120,
      ironMg: 2.5,
      vitaminCMg: 30,
    });
    const over = parseNutrients({ ...BASE, potassiumMg: 99999 });
    expect(over).not.toBeNull();
    expect(over!.potassiumMg).toBeUndefined();
  });

  it("round-trips the panel through a stored log entry", () => {
    const entry = parseLogEntry({
      id: "e1",
      day: "2026-11-15",
      meal: "lunch",
      foodId: "usda-171287",
      snapshot: null,
      name: "Egg",
      amount: { grams: 100 },
      nutrients: { ...BASE, potassiumMg: 138, ironMg: 1.8 },
      provenance: { kind: "usda", sourceId: "171287", label: "USDA FoodData Central" },
      source: "search",
      createdAt: "2026-11-15T07:00:00.000Z",
    });
    expect(entry?.nutrients.potassiumMg).toBe(138);
    expect(entry?.nutrients.ironMg).toBe(1.8);
  });
});

describe("micronutrients — math", () => {
  it("scales the panel with the core four, field by field", () => {
    const scaled = nutrientsForGrams(
      { ...BASE, potassiumMg: 350, ironMg: 2.4, vitaminCMg: 60 },
      200,
    );
    expect(scaled.potassiumMg).toBe(700);
    expect(scaled.ironMg).toBe(4.8);
    expect(scaled.vitaminCMg).toBe(120);
    expect(scaled.calciumMg).toBeUndefined();
  });

  it("sums over the foods that report a field, and knows the total is incomplete", () => {
    const a: Nutrients = { ...BASE, potassiumMg: 100, fibreG: 3 };
    const b: Nutrients = { ...BASE };
    const total = sumNutrients([a, b]);
    expect(total.potassiumMg).toBe(100);
    expect(total.fibreG).toBe(3);
    const incomplete = incompleteOptionalFields([a, b]);
    expect(incomplete.has("potassiumMg")).toBe(true);
    expect(incomplete.has("fibreG")).toBe(true);
    expect(incompleteOptionalFields([a]).size).toBe(5);
    expect(incompleteOptionalFields([]).size).toBe(0);
  });
});

describe("micronutrients — the shipped USDA set", () => {
  it("carries the panel exactly as published (whole egg, per 100 g)", () => {
    const egg = USDA_REFERENCE_FOODS.find((f) => f.id === "usda-171287");
    expect(egg).toBeDefined();
    expect(egg!.per100g.potassiumMg).toBe(138);
    expect(egg!.per100g.calciumMg).toBe(56);
    expect(egg!.per100g.magnesiumMg).toBe(12);
    expect(egg!.per100g.ironMg).toBe(1.75);
  });

  it("coverage is broad but honestly partial — absence stays absence", () => {
    const withPotassium = USDA_REFERENCE_FOODS.filter(
      (f) => f.per100g.potassiumMg !== undefined,
    ).length;
    const withVitaminC = USDA_REFERENCE_FOODS.filter(
      (f) => f.per100g.vitaminCMg !== undefined,
    ).length;
    expect(withPotassium).toBeGreaterThanOrEqual(95);
    expect(withVitaminC).toBeGreaterThanOrEqual(50);
    expect(withVitaminC).toBeLessThan(USDA_REFERENCE_FOODS.length);
  });
});
