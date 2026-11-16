import { describe, expect, it } from "vitest";

import { PROOF_DISHES } from "./data/proofDishes";
import {
  RECIPE_PROVENANCE_LABEL,
  computeBudgetTier,
  dishCostPerServingEstimate,
  dishNutrients,
  dishPatterns,
  dishProvenance,
  parseDish,
  parseDishList,
  validateDish,
  type Dish,
} from "./dishes";
import { provenanceLabel } from "./labels";
import { referenceProvenanceGate } from "./usdaReference";

/**
 * Dishes (D1). A dish's numbers exist only as a computation: the
 * expected values below were hand-summed from the generated USDA data
 * file with plain arithmetic (per line: per-100 g × grams ÷ servings ÷
 * 100, the log's rounding, summed) — independently of the dish code —
 * and are pinned here as literals.
 */

const byId = (id: string): Dish => {
  const dish = PROOF_DISHES.find((d) => d.id === id);
  if (!dish) throw new Error(`proof dish ${id} missing`);
  return dish;
};

describe("the proof dishes", () => {
  it("are five, one per role the library will need", () => {
    expect(PROOF_DISHES.map((d) => d.id)).toEqual([
      "dish-masoor-dal-tadka",
      "dish-jeera-rice",
      "dish-mint-coriander-chutney",
      "dish-cucumber-raita",
      "dish-aloo-gobi",
    ]);
    expect(PROOF_DISHES.map((d) => d.category)).toEqual([
      "main",
      "rice",
      "chutney",
      "raita",
      "main",
    ]);
  });

  it("survive a strict-parser round trip unchanged", () => {
    const roundTripped = parseDishList(JSON.parse(JSON.stringify(PROOF_DISHES)));
    expect(roundTripped).toEqual(PROOF_DISHES);
  });

  it("are complete against the reference set — every line resolves", () => {
    for (const dish of PROOF_DISHES) {
      expect(validateDish(dish), dish.id).toEqual([]);
    }
  });

  it("carry Hindi names in Devanagari", () => {
    for (const dish of PROOF_DISHES) {
      expect(dish.name.hindi, dish.id).toMatch(/[ऀ-ॿ]/);
      expect(dish.name.en.trim().length, dish.id).toBeGreaterThan(0);
    }
    expect(byId("dish-masoor-dal-tadka").name.hindi).toBe("मसूर दाल तड़का");
  });
});

describe("dishNutrients — computed, never stored", () => {
  it("matches the hand-summed per-serving values for every proof dish", () => {
    expect(dishNutrients(byId("dish-masoor-dal-tadka")).nutrients).toEqual({
      kcal: 244, proteinG: 12.9, carbsG: 36.8, fatG: 5.4,
      fibreG: 6.8, sodiumMg: 491, potassiumMg: 493, magnesiumMg: 43,
      calciumMg: 42, ironMg: 4.7, vitaminCMg: 10.6,
    });
    expect(dishNutrients(byId("dish-jeera-rice")).nutrients).toEqual({
      kcal: 304, proteinG: 5.4, carbsG: 60.7, fatG: 3.5,
      fibreG: 0.3, sodiumMg: 389, potassiumMg: 76, magnesiumMg: 23,
      calciumMg: 12, ironMg: 0.7, vitaminCMg: 0.2,
    });
    expect(dishNutrients(byId("dish-mint-coriander-chutney")).nutrients).toEqual({
      kcal: 12, proteinG: 0.7, carbsG: 2.2, fatG: 0.2,
      fibreG: 1.1, sodiumMg: 300, potassiumMg: 122, magnesiumMg: 11,
      calciumMg: 27, ironMg: 1.2, vitaminCMg: 11.3,
    });
    expect(dishNutrients(byId("dish-cucumber-raita")).nutrients).toEqual({
      kcal: 88, proteinG: 4.2, carbsG: 7.6, fatG: 4.7,
      fibreG: 0.3, sodiumMg: 335, potassiumMg: 267, magnesiumMg: 19,
      calciumMg: 143, ironMg: 0.4, vitaminCMg: 0.2,
    });
    expect(dishNutrients(byId("dish-aloo-gobi")).nutrients).toEqual({
      kcal: 179, proteinG: 4.9, carbsG: 28.3, fatG: 6,
      fibreG: 3.7, sodiumMg: 510, potassiumMg: 900, magnesiumMg: 54,
      calciumMg: 50, ironMg: 1.9, vitaminCMg: 88.1,
    });
  });

  it("travels under the recipe label — built from USDA ingredient data", () => {
    const labelled = dishNutrients(byId("dish-aloo-gobi"));
    expect(labelled.label).toBe("Built from USDA ingredient data");
    expect(labelled.label).toBe(RECIPE_PROVENANCE_LABEL);
    expect(labelled.estimate).toBe(false);
    const provenance = dishProvenance(byId("dish-aloo-gobi"));
    expect(provenance.kind).toBe("recipe");
    expect(provenance.sourceId).toBe("dish-aloo-gobi");
    expect(provenanceLabel(provenance)).toBe("Built from USDA ingredient data");
  });

  it("fails loudly on a line naming an unknown food — never under-counts quietly", () => {
    const broken: Dish = {
      ...byId("dish-jeera-rice"),
      lines: [{ foodId: "usda-424242", grams: 100 }],
    };
    expect(() => dishNutrients(broken)).toThrow(/unknown food usda-424242/);
    expect(validateDish(broken)).toContain("line names unknown food usda-424242");
  });
});

describe("dish patterns — derived from ingredients, never asserted", () => {
  it("a no-egg, no-dairy, no-flesh dish suits every pattern, vegan included", () => {
    const all = ["vegetarian", "eggetarian", "vegan", "ovo_vegetarian", "pescatarian", "non_vegetarian"];
    expect(dishPatterns(byId("dish-mint-coriander-chutney"))).toEqual(all);
    expect(dishPatterns(byId("dish-aloo-gobi"))).toEqual(all);
  });

  it("a dairy dish (ghee, yogurt) suits vegetarian + eggetarian but never vegan or ovo", () => {
    const dairyPatterns = ["vegetarian", "eggetarian", "pescatarian", "non_vegetarian"];
    expect(dishPatterns(byId("dish-masoor-dal-tadka"))).toEqual(dairyPatterns);
    expect(dishPatterns(byId("dish-jeera-rice"))).toEqual(dairyPatterns);
    expect(dishPatterns(byId("dish-cucumber-raita"))).toEqual(dairyPatterns);
  });

  it("an egg dish suits eggetarian and ovo, but not vegetarian or vegan", () => {
    const eggDish: Dish = {
      id: "dish-test-egg-rice",
      name: { en: "Egg Rice (test)", hindi: "अंडा चावल" },
      category: "main",
      servings: 2,
      lines: [
        { foodId: "usda-171287", grams: 100 }, // egg
        { foodId: "usda-2512381", grams: 150 }, // rice
        { foodId: "usda-171025", grams: 10 }, // sunflower oil
      ],
      method: ["Cook."],
      timeMinutes: 15,
      budgetTier: 1,
      enriched: false,
    };
    expect(dishPatterns(eggDish)).toEqual([
      "eggetarian",
      "ovo_vegetarian",
      "pescatarian",
      "non_vegetarian",
    ]);
  });

  it("a chicken dish suits only the non-vegetarian pattern", () => {
    const chickenDish: Dish = {
      id: "dish-test-chicken",
      name: { en: "Chicken (test)", hindi: "चिकन" },
      category: "main",
      servings: 2,
      lines: [
        { foodId: "usda-2646170", grams: 200 }, // chicken breast
        { foodId: "usda-790646", grams: 50 }, // onion
      ],
      method: ["Cook."],
      timeMinutes: 25,
      budgetTier: 2,
      enriched: false,
    };
    expect(dishPatterns(chickenDish)).toEqual(["non_vegetarian"]);
  });
});

describe("the budget heuristic", () => {
  it("the stored tier of every proof dish is the tier the heuristic computes", () => {
    for (const dish of PROOF_DISHES) {
      expect(computeBudgetTier(dish), dish.id).toBe(dish.budgetTier);
    }
  });

  it("prices a dal as an everyday dish and a two-vegetable sabzi a tier up", () => {
    expect(dishCostPerServingEstimate(byId("dish-masoor-dal-tadka"))).toBeCloseTo(18.23, 1);
    expect(computeBudgetTier(byId("dish-masoor-dal-tadka"))).toBe(1);
    expect(dishCostPerServingEstimate(byId("dish-aloo-gobi"))).toBeCloseTo(25.08, 1);
    expect(computeBudgetTier(byId("dish-aloo-gobi"))).toBe(2);
  });
});

describe("the dish parser — strict, drops rather than repairs", () => {
  const good = (): Record<string, unknown> =>
    JSON.parse(JSON.stringify(byId("dish-jeera-rice"))) as Record<string, unknown>;

  it("drops a dish with an unknown category, a bad tier or no lines", () => {
    expect(parseDish({ ...good(), category: "feast" })).toBeNull();
    expect(parseDish({ ...good(), budgetTier: 4 })).toBeNull();
    expect(parseDish({ ...good(), lines: [] })).toBeNull();
    expect(parseDish({ ...good(), method: [] })).toBeNull();
  });

  it("drops a line with a weightless or absurd amount", () => {
    const zero = good();
    (zero["lines"] as { grams: number }[])[0]!.grams = 0;
    expect(parseDish(zero)).toBeNull();
    const huge = good();
    (huge["lines"] as { grams: number }[])[0]!.grams = 9000;
    expect(parseDish(huge)).toBeNull();
  });

  it("an enriched dish must state its boost; an unenriched one keeps none", () => {
    expect(parseDish({ ...good(), enriched: true })).toBeNull();
    const boosted = parseDish({
      ...good(),
      enriched: true,
      enrichment: "Double the cumin, plus a spoon of ghee at the end.",
    });
    expect(boosted?.enriched).toBe(true);
    expect(boosted?.enrichment).toContain("ghee");
    const plain = parseDish({ ...good(), enrichment: "should be dropped" });
    expect(plain?.enrichment).toBeUndefined();
  });

  it("a list keeps the valid dishes, drops the malformed, dedupes by id", () => {
    const parsed = parseDishList([good(), { id: "broken" }, good(), null, "junk"]);
    expect(parsed.map((d) => d.id)).toEqual(["dish-jeera-rice"]);
    expect(parseDishList("not a list")).toEqual([]);
  });
});

describe("the cuisine tag — optional, preserved when present", () => {
  it("a dish carrying a cuisine round-trips the parser with the tag intact", () => {
    const tagged: Dish = { ...byId("dish-jeera-rice"), cuisine: "north-indian" };
    const roundTripped = parseDish(JSON.parse(JSON.stringify(tagged)));
    expect(roundTripped).toEqual(tagged);
    expect(roundTripped?.cuisine).toBe("north-indian");
    expect(parseDishList([tagged]).map((d) => d.cuisine)).toEqual(["north-indian"]);
  });

  it("a cuisine tag is not a completeness problem — the dish still validates clean", () => {
    const tagged: Dish = { ...byId("dish-aloo-gobi"), cuisine: "kerala" };
    expect(validateDish(tagged)).toEqual([]);
  });

  it("a dish without a cuisine parses with the tag absent, never invented", () => {
    const parsed = parseDish(JSON.parse(JSON.stringify(byId("dish-jeera-rice"))));
    expect(parsed).not.toBeNull();
    expect(parsed?.cuisine).toBeUndefined();
    expect("cuisine" in (parsed ?? {})).toBe(false);
  });

  it("an unusable cuisine value (not text) is dropped, not repaired into a tag", () => {
    const raw = JSON.parse(JSON.stringify(byId("dish-jeera-rice"))) as Record<string, unknown>;
    raw["cuisine"] = 42;
    const parsed = parseDish(raw);
    expect(parsed).not.toBeNull();
    expect(parsed?.cuisine).toBeUndefined();
  });
});

describe("the licence discipline", () => {
  it("recipe provenance is not registry reference data — the gate fails closed on it", () => {
    expect(referenceProvenanceGate(dishProvenance(byId("dish-jeera-rice")))).toBe(false);
  });

  it("no proof dish reaches for an IFCT/INDB value — every line is a USDA food", () => {
    for (const dish of PROOF_DISHES) {
      for (const line of dish.lines) {
        expect(line.foodId, dish.id).toMatch(/^usda-\d+$/);
      }
    }
  });
});
