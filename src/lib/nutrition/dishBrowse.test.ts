import { describe, expect, it } from "vitest";

import { EMPTY_DIETARY, emptyProfile, type HealthProfile } from "@/lib/vitalis/domain/profile";
import { DISH_LIBRARY, findDish } from "./data/dishLibrary";
import { dishNutrients, dishPatterns } from "./dishes";
import { NO_DISH_FILTERS, browseDishes, dishIdeaFor, type DishBrowseFilters } from "./dishBrowse";
import { USDA_REFERENCE_FOODS } from "./usdaReference";

const filters = (over: Partial<DishBrowseFilters>): DishBrowseFilters => ({
  ...NO_DISH_FILTERS,
  ...over,
});

describe("browseDishes — the Dishes section's filter logic", () => {
  it("with no filters, returns the whole library in a deterministic order", () => {
    const rows = browseDishes(NO_DISH_FILTERS);
    expect(rows).toHaveLength(DISH_LIBRARY.length);
    expect(browseDishes(NO_DISH_FILTERS).map((r) => r.dish.id)).toEqual(rows.map((r) => r.dish.id));
    /* Category order first (mains lead), then name within a category. */
    const categories = rows.map((r) => r.dish.category);
    expect(categories.indexOf("main")).toBeLessThan(categories.indexOf("drink"));
    const mains = rows.filter((r) => r.dish.category === "main").map((r) => r.dish.name.en);
    expect(mains).toEqual([...mains].sort());
  });

  it("bundles each row with its computed per-serving nutrients and derived patterns", () => {
    const row = browseDishes(filters({ query: "masoor" }))[0]!;
    expect(row.dish.id).toBe("dish-masoor-dal-tadka");
    expect(row.labelled.nutrients).toEqual(dishNutrients(row.dish).nutrients);
    expect(row.labelled.label).toBe("Built from USDA ingredient data");
    expect(row.patterns).toEqual(dishPatterns(row.dish));
  });

  it("searches the English name, case-insensitively", () => {
    const rows = browseDishes(filters({ query: "MASOOR" }));
    expect(rows.map((r) => r.dish.id)).toContain("dish-masoor-dal-tadka");
    expect(rows.every((r) => r.dish.name.en.toLowerCase().includes("masoor"))).toBe(true);
  });

  it("searches the Hindi name too", () => {
    const rows = browseDishes(filters({ query: "मसूर" }));
    expect(rows.map((r) => r.dish.id)).toContain("dish-masoor-dal-tadka");
  });

  it("filters by category", () => {
    const rows = browseDishes(filters({ category: "chutney" }));
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.dish.category === "chutney")).toBe(true);
  });

  it("filters by cuisine — only dishes carrying the tag", () => {
    const kerala = browseDishes(filters({ cuisine: "kerala" }));
    expect(kerala).toHaveLength(131);
    expect(kerala.every((r) => r.dish.cuisine === "kerala")).toBe(true);
    expect(kerala.map((r) => r.dish.id)).toContain("dish-avial");
    expect(kerala.map((r) => r.dish.id)).not.toContain("dish-masoor-dal-tadka");
  });

  it("the cuisine filter composes with the other filters — it only ever narrows", () => {
    const india = browseDishes(filters({ cuisine: "india", query: "masoor" }));
    expect(india.map((r) => r.dish.id)).toContain("dish-masoor-dal-tadka");
    /* The same search under another cuisine is honestly empty. */
    expect(browseDishes(filters({ cuisine: "international", query: "masoor" }))).toEqual([]);
    /* And it sits under the pattern judgement like every other filter. */
    expect(browseDishes(filters({ cuisine: "kerala", pattern: "vegan" }))).toHaveLength(76);
  });

  it("filters by pattern — only dishes whose derived patterns include it", () => {
    const rows = browseDishes(filters({ pattern: "vegan" }));
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => dishPatterns(r.dish).includes("vegan"))).toBe(true);
    /* A ghee dish is never vegan, whatever its name says. */
    expect(rows.map((r) => r.dish.id)).not.toContain("dish-masoor-dal-tadka");
  });

  it("filters by budget tier and by enriched-only", () => {
    const tier1 = browseDishes(filters({ budgetTier: 1 }));
    expect(tier1.length).toBeGreaterThan(0);
    expect(tier1.every((r) => r.dish.budgetTier === 1)).toBe(true);
    const enriched = browseDishes(filters({ enrichedOnly: true }));
    expect(enriched.length).toBeGreaterThan(0);
    expect(enriched.every((r) => r.dish.enriched)).toBe(true);
  });

  it("combines filters — and an impossible combination is honestly empty", () => {
    const rows = browseDishes(filters({ category: "main", pattern: "vegan", budgetTier: 1 }));
    expect(
      rows.every(
        (r) =>
          r.dish.category === "main" &&
          r.dish.budgetTier === 1 &&
          dishPatterns(r.dish).includes("vegan"),
      ),
    ).toBe(true);
    expect(browseDishes(filters({ query: "zzqqx-nothing" }))).toEqual([]);
  });
});

/* ------------------------------ dish idea -------------------------------- */

function profile(over: Partial<HealthProfile["dietary"]>): HealthProfile {
  const base = emptyProfile("user-1");
  return { ...base, dietary: { ...EMPTY_DIETARY, ...over } };
}

const DAYS = [
  "2026-11-16",
  "2026-11-17",
  "2026-11-18",
  "2026-11-19",
  "2026-11-20",
  "2026-11-21",
  "2026-11-22",
  "2026-11-23",
  "2026-11-24",
  "2026-11-25",
  "2026-11-26",
  "2026-11-27",
  "2026-11-28",
  "2026-11-29",
  "2026-11-30",
  "2026-12-01",
];

describe("dishIdeaFor — the plan's dish idea", () => {
  it("gives a main-category dish for lunch and dinner, never for a snack", () => {
    const p = profile({ pattern: "eggetarian" });
    for (const meal of ["lunch", "dinner"] as const) {
      const idea = dishIdeaFor(p, "2026-11-16", meal);
      expect(idea).not.toBeNull();
      expect(idea!.category).toBe("main");
    }
    expect(dishIdeaFor(p, "2026-11-16", "snack")).toBeNull();
  });

  it("breakfast may draw from the breakfast category as well as mains", () => {
    const p = profile({ pattern: null });
    const seen = new Set<string>();
    for (const day of DAYS) {
      const idea = dishIdeaFor(p, day, "breakfast");
      expect(idea).not.toBeNull();
      expect(["breakfast", "main"]).toContain(idea!.category);
      seen.add(idea!.category);
    }
    expect(seen.has("breakfast")).toBe(true);
  });

  it("is the same dish all day and rotates across days", () => {
    const p = profile({ pattern: "eggetarian" });
    expect(dishIdeaFor(p, "2026-11-16", "lunch")!.id).toBe(
      dishIdeaFor(p, "2026-11-16", "lunch")!.id,
    );
    const picks = new Set(DAYS.map((day) => dishIdeaFor(p, day, "lunch")!.id));
    expect(picks.size).toBeGreaterThan(1);
  });

  it("never repeats a dish across a day's meals when the used ids are threaded through (P3)", () => {
    const p = profile({ pattern: "eggetarian" });
    for (const day of DAYS) {
      /* The defect, pinned: lunch and dinner share a category and a
         rotation order, so unthreaded picks are the same dish. */
      expect(dishIdeaFor(p, day, "lunch")!.id).toBe(dishIdeaFor(p, day, "dinner")!.id);
      /* The section's fix: pick in meal order, excluding each pick
         from the next slot — the day's ideas are then all distinct. */
      const used = new Set<string>();
      const picks: string[] = [];
      for (const meal of ["breakfast", "lunch", "dinner"] as const) {
        const idea = dishIdeaFor(p, day, meal, undefined, used);
        if (!idea) continue;
        picks.push(idea.id);
        used.add(idea.id);
      }
      expect(picks.length).toBe(3);
      expect(new Set(picks).size).toBe(picks.length);
      /* Excluding the day's top pick moves lunch to the next qualifier
         rather than repeating it. */
      const top = dishIdeaFor(p, day, "lunch")!;
      const next = dishIdeaFor(p, day, "lunch", undefined, new Set([top.id]));
      expect(next).not.toBeNull();
      expect(next!.id).not.toBe(top.id);
    }
  });

  it("suits the person's pattern — an eggetarian never gets a flesh dish", () => {
    const p = profile({ pattern: "eggetarian" });
    for (const day of DAYS) {
      for (const meal of ["breakfast", "lunch", "dinner"] as const) {
        const idea = dishIdeaFor(p, day, meal);
        expect(idea).not.toBeNull();
        expect(dishPatterns(idea!)).toContain("eggetarian");
      }
    }
  });

  it("honours allergies the way the plan does — by the dish's ingredient names", () => {
    /* "lentils" matches the USDA name of the masoor line food; every
       dish built on a lentil line must fall away, exactly as the food
       itself falls out of the plan's pool. */
    const p = profile({ pattern: null, allergies: ["lentils"] });
    for (const day of DAYS) {
      const idea = dishIdeaFor(p, day, "lunch");
      expect(idea).not.toBeNull();
      const lineNames = idea!.lines.map((line) => findDishLineName(line.foodId));
      expect(lineNames.some((name) => name.includes("lentils"))).toBe(false);
    }
    expect(dishIdeaFor(p, "2026-11-16", "lunch")!.id).not.toBe("dish-masoor-dal-tadka");
  });

  it("returns null when nothing qualifies — the row is absent, never padded", () => {
    const dal = findDish("dish-masoor-dal-tadka")!;
    /* A vegan facing only a ghee dish has no dish idea. */
    const p = profile({ pattern: "vegan" });
    expect(dishIdeaFor(p, "2026-11-16", "lunch", [dal])).toBeNull();
    /* The same dish is a fine idea for a vegetarian. */
    const veg = profile({ pattern: "vegetarian" });
    expect(dishIdeaFor(veg, "2026-11-16", "lunch", [dal])!.id).toBe(dal.id);
  });

  describe("the person's stated budget", () => {
    it("prefers dishes at or under the stated tier, at every meal", () => {
      const p = profile({ pattern: null, budgetTier: 1 });
      for (const day of DAYS) {
        for (const meal of ["breakfast", "lunch", "dinner"] as const) {
          const idea = dishIdeaFor(p, day, meal);
          expect(idea).not.toBeNull();
          expect(idea!.budgetTier).toBeLessThanOrEqual(1);
        }
      }
    });

    it("an over-budget rotation winner steps aside for an in-budget dish", () => {
      const dal = findDish("dish-masoor-dal-tadka")!; /* tier 1 */
      const curry = findDish("dish-chicken-curry")!; /* tier 3 */
      expect(dal.budgetTier).toBe(1);
      expect(curry.budgetTier).toBe(3);
      const shelf = [dal, curry];
      const noBudget = profile({ pattern: null });
      const tier1 = profile({ pattern: null, budgetTier: 1 });
      /* Find a day whose no-budget rotation winner is the curry; on
         that day, the person with a tier-1 budget gets the dal. */
      const day = DAYS.find(
        (d) => dishIdeaFor(noBudget, d, "lunch", shelf)?.id === curry.id,
      );
      expect(day).toBeDefined();
      expect(dishIdeaFor(tier1, day!, "lunch", shelf)?.id).toBe(dal.id);
    });

    it("falls back to any qualifier when nothing qualifies in-budget — never null for budget alone", () => {
      const curry = findDish("dish-chicken-curry")!; /* tier 3, the only dish */
      const p = profile({ pattern: null, budgetTier: 1 });
      expect(dishIdeaFor(p, "2026-11-16", "lunch", [curry])?.id).toBe(curry.id);
    });
  });
});

function findDishLineName(foodId: string): string {
  return USDA_REFERENCE_FOODS.find((f) => f.id === foodId)?.name.toLowerCase() ?? "";
}
