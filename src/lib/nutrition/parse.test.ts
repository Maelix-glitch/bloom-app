import { describe, expect, it } from "vitest";
import { parseFood, parseFoodList, parseLogEntry, parseLogEntryList } from "./parse";
import type { Food, LogEntry } from "./types";

const USDA_FOOD = {
  id: "food-usda-1",
  name: "Rolled oats",
  per100g: { kcal: 389, proteinG: 16.9, carbsG: 66.3, fatG: 6.9, fibreG: 10.6, sodiumMg: 2 },
  servings: [{ label: "1 cup", grams: 81 }],
  provenance: { kind: "usda", sourceId: "169705", dataType: "SR Legacy", label: "USDA" },
};

const FOOD_ENTRY = {
  id: "entry-1",
  day: "2026-11-15",
  meal: "breakfast",
  foodId: "food-usda-1",
  snapshot: null,
  name: "Rolled oats",
  amount: { grams: 50 },
  nutrients: { kcal: 195, proteinG: 8.5, carbsG: 33.2, fatG: 3.5 },
  provenance: { kind: "usda", sourceId: "169705", label: "USDA" },
  source: "search",
  createdAt: "2026-11-15T03:00:00.000Z",
};

const COACH_ENTRY = {
  id: "entry-2",
  day: "2026-11-15",
  meal: "lunch",
  foodId: null,
  snapshot: {
    name: "Biryani",
    totals: { kcal: 680, proteinG: 42, carbsG: 75, fatG: 24 },
  },
  name: "Biryani",
  amount: { servings: 1, servingLabel: "Photo portion" },
  nutrients: { kcal: 680, proteinG: 42, carbsG: 75, fatG: 24 },
  provenance: { kind: "coach_estimate", label: "Estimate — based on your photo" },
  source: "coach_photo",
  createdAt: "2026-11-15T07:10:00.000Z",
};

describe("nutrition parse · Food", () => {
  it("accepts a well-formed food and keeps its provenance", () => {
    const food = parseFood(USDA_FOOD) as Food;
    expect(food.name).toBe("Rolled oats");
    expect(food.provenance).toEqual({
      kind: "usda",
      sourceId: "169705",
      dataType: "SR Legacy",
      label: "USDA",
    });
    expect(food.per100g.fibreG).toBe(10.6);
    expect(food.per100g.sodiumMg).toBe(2);
  });

  it("drops unknown fields by construction", () => {
    const food = parseFood({ ...USDA_FOOD, brand: "Acme", rating: 5 }) as Food;
    expect(Object.keys(food).sort()).toEqual(["id", "name", "per100g", "provenance", "servings"]);
    expect((food as unknown as Record<string, unknown>)["brand"]).toBeUndefined();
  });

  it("optional nutrients are absent, never zero-filled, when the source lacks them", () => {
    const core = { kcal: 389, proteinG: 16.9, carbsG: 66.3, fatG: 6.9 };
    const food = parseFood({ ...USDA_FOOD, per100g: core }) as Food;
    expect("fibreG" in food.per100g).toBe(false);
    expect("sodiumMg" in food.per100g).toBe(false);
  });

  it("an invalid optional nutrient drops alone; the food survives", () => {
    const food = parseFood({
      ...USDA_FOOD,
      per100g: { ...USDA_FOOD.per100g, fibreG: -3 },
    }) as Food;
    expect("fibreG" in food.per100g).toBe(false);
    expect(food.per100g.kcal).toBe(389);
  });

  it("refuses foods with missing or malformed core values", () => {
    expect(parseFood(null)).toBeNull();
    expect(parseFood({ ...USDA_FOOD, name: "  " })).toBeNull();
    expect(parseFood({ ...USDA_FOOD, per100g: { kcal: 389, proteinG: 16.9, carbsG: 66.3 } })).toBeNull();
    expect(parseFood({ ...USDA_FOOD, per100g: { ...USDA_FOOD.per100g, kcal: "389" } })).toBeNull();
    expect(parseFood({ ...USDA_FOOD, per100g: { ...USDA_FOOD.per100g, proteinG: -1 } })).toBeNull();
    expect(parseFood({ ...USDA_FOOD, provenance: { kind: "guess", sourceId: "x", label: "?" } })).toBeNull();
  });

  it("a Food can never carry estimate provenance", () => {
    expect(
      parseFood({ ...USDA_FOOD, provenance: { kind: "coach_estimate", label: "Estimate" } }),
    ).toBeNull();
  });

  it("drops malformed servings, keeps valid ones", () => {
    const food = parseFood({
      ...USDA_FOOD,
      servings: [{ label: "1 cup", grams: 81 }, { label: "", grams: 10 }, { label: "x", grams: -1 }, "junk"],
    }) as Food;
    expect(food.servings).toEqual([{ label: "1 cup", grams: 81 }]);
  });

  it("parseFoodList keeps the valid, drops the malformed, dedupes ids", () => {
    const foods = parseFoodList([USDA_FOOD, { id: "bad" }, USDA_FOOD, null]);
    expect(foods).toHaveLength(1);
    expect(foods[0]!.id).toBe("food-usda-1");
    expect(parseFoodList("nope")).toEqual([]);
  });
});

describe("nutrition parse · LogEntry", () => {
  it("accepts a food-backed entry and an estimate entry", () => {
    expect(parseLogEntry(FOOD_ENTRY)).not.toBeNull();
    const coach = parseLogEntry(COACH_ENTRY) as LogEntry;
    expect(coach.foodId).toBeNull();
    expect(coach.snapshot?.name).toBe("Biryani");
    expect(coach.provenance.kind).toBe("coach_estimate");
  });

  it("an estimate entry without the estimate flag is refused, in every direction", () => {
    // coach_photo source but a food provenance
    expect(parseLogEntry({ ...COACH_ENTRY, provenance: FOOD_ENTRY.provenance })).toBeNull();
    // coach_photo source but pointing at a reusable food
    expect(parseLogEntry({ ...COACH_ENTRY, foodId: "food-usda-1" })).toBeNull();
    // coach_photo source but no snapshot
    expect(parseLogEntry({ ...COACH_ENTRY, snapshot: null })).toBeNull();
    // food-backed source wearing estimate provenance
    expect(parseLogEntry({ ...FOOD_ENTRY, provenance: COACH_ENTRY.provenance })).toBeNull();
    // food-backed entry with no food
    expect(parseLogEntry({ ...FOOD_ENTRY, foodId: null })).toBeNull();
  });

  it("refuses malformed entries outright — nothing is repaired", () => {
    expect(parseLogEntry({ ...FOOD_ENTRY, day: "15/11/2026" })).toBeNull();
    expect(parseLogEntry({ ...FOOD_ENTRY, meal: "brunch" })).toBeNull();
    expect(parseLogEntry({ ...FOOD_ENTRY, source: "barcode" })).toBeNull();
    expect(parseLogEntry({ ...FOOD_ENTRY, amount: { servings: 1 } })).toBeNull();
    expect(parseLogEntry({ ...FOOD_ENTRY, amount: { grams: 0 } })).toBeNull();
    expect(parseLogEntry({ ...FOOD_ENTRY, nutrients: { kcal: 195 } })).toBeNull();
    expect(parseLogEntry({ ...FOOD_ENTRY, name: "" })).toBeNull();
  });

  it("parseLogEntryList keeps valid entries sorted by day, drops the rest", () => {
    const entries = parseLogEntryList([COACH_ENTRY, { id: "bad" }, FOOD_ENTRY, COACH_ENTRY]);
    expect(entries.map((e) => e.id)).toEqual(["entry-1", "entry-2"]);
    expect(parseLogEntryList(undefined)).toEqual([]);
  });
});
