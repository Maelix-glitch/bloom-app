import { describe, expect, it } from "vitest";

import { DISH_LIBRARY } from "@/lib/nutrition/data/dishLibrary";
import type { Dish } from "@/lib/nutrition/dishes";
import {
  caregiverLines,
  householdSuitability,
  judgeDishForHousehold,
  ownerAsMember,
  tableMemberOf,
  unmatchedAllergies,
  type TableMember,
} from "./suitability";

function libraryDish(id: string): Dish {
  const dish = DISH_LIBRARY.find((d) => d.id === id);
  if (!dish) throw new Error(`test fixture: no dish ${id}`);
  return dish;
}

/** Egg rice, from the dishes.test.ts fixture: egg + rice + oil. */
const EGG_DISH: Dish = {
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

/** A dish carrying peanuts (usda-172430, "Peanuts, all types, raw"). */
const PEANUT_DISH: Dish = {
  id: "dish-test-peanut",
  name: { en: "Peanut Mix (test)", hindi: "मूंगफली" },
  category: "snack",
  servings: 2,
  lines: [
    { foodId: "usda-172430", grams: 60 },
    { foodId: "usda-2512381", grams: 100 },
  ],
  method: ["Mix."],
  timeMinutes: 5,
  budgetTier: 1,
  enriched: false,
};

const member = (patch: Partial<TableMember>): TableMember => ({
  id: "m-1",
  name: "Amma",
  self: false,
  pattern: null,
  allergies: [],
  dislikes: [],
  ...patch,
});

describe("ownerAsMember — member #1 comes from the owner's own record", () => {
  it("carries the stored pattern and allergies, marked as self", () => {
    const owner = ownerAsMember({
      pattern: "eggetarian",
      allergies: ["Peanut"],
      dislikes: ["Okra"],
    });
    expect(owner.self).toBe(true);
    expect(owner.pattern).toBe("eggetarian");
    expect(owner.allergies).toEqual(["Peanut"]);
  });

  it("tableMemberOf marks stored members as not-self", () => {
    const m = tableMemberOf({
      id: "m-9",
      name: "Ravi",
      pattern: "vegan",
      allergies: [],
      dislikes: [],
    });
    expect(m.self).toBe(false);
    expect(m.pattern).toBe("vegan");
  });
});

describe("pattern judging — the repo's own rules, for the whole table", () => {
  it("a dish suiting every pattern suits a mixed table", () => {
    const table = [
      ownerAsMember({ pattern: "eggetarian", allergies: [], dislikes: [] }),
      member({ pattern: "vegan" }),
    ];
    const result = judgeDishForHousehold(libraryDish("dish-aloo-gobi"), table);
    expect(result.suitsEveryone).toBe(true);
    expect(result.blockedBy).toEqual([]);
  });

  it("an egg dish is blocked by the vegetarian at the table, named", () => {
    const table = [
      ownerAsMember({ pattern: "eggetarian", allergies: [], dislikes: [] }),
      member({ pattern: "vegetarian" }),
    ];
    const result = judgeDishForHousehold(EGG_DISH, table);
    expect(result.suitsEveryone).toBe(false);
    expect(result.blockedBy).toHaveLength(1);
    expect(result.blockedBy[0]).toMatchObject({ memberName: "Amma", kind: "pattern" });
  });

  it("a member with no stated pattern imposes no pattern filter", () => {
    const result = judgeDishForHousehold(EGG_DISH, [member({ pattern: null })]);
    expect(result.suitsEveryone).toBe(true);
  });
});

describe("allergy judging — name-matching, the plan's way", () => {
  it("a dish containing a member's allergy ingredient is blocked, with the food named", () => {
    const table = [member({ allergies: ["peanut"] })];
    const result = judgeDishForHousehold(PEANUT_DISH, table);
    expect(result.suitsEveryone).toBe(false);
    expect(result.blockedBy[0]).toMatchObject({ memberName: "Amma", kind: "allergy" });
    expect(result.blockedBy[0]?.detail).toContain("Peanuts, all types, raw");
  });

  it("the same dish passes for a member without that allergy", () => {
    const result = judgeDishForHousehold(PEANUT_DISH, [member({ allergies: ["milk"] })]);
    expect(result.suitsEveryone).toBe(true);
  });

  it("matching is case-insensitive and substring-based, like the plan", () => {
    const table = [member({ allergies: ["PEANUT"] })];
    expect(judgeDishForHousehold(PEANUT_DISH, table).suitsEveryone).toBe(false);
  });
});

describe("the honesty rule — unmatched allergies are surfaced, never safe", () => {
  it("a term matching no food name anywhere is reported as no_matching_food", () => {
    const unmatched = unmatchedAllergies([member({ allergies: ["zebra"] })]);
    expect(unmatched).toEqual([
      { memberId: "m-1", memberName: "Amma", term: "zebra", reason: "no_matching_food" },
    ]);
  });

  it("a term under 3 characters is reported as too_short, and never judged", () => {
    const table = [member({ allergies: ["ox"] })];
    expect(unmatchedAllergies(table)).toEqual([
      { memberId: "m-1", memberName: "Amma", term: "ox", reason: "too_short" },
    ]);
    // The unjudgeable term must not block — and must not vanish either:
    // it rides the summary's unmatched list (asserted above), while the
    // dish judgement itself makes no claim about it.
    expect(judgeDishForHousehold(EGG_DISH, table).suitsEveryone).toBe(true);
  });

  it("a matchable allergy is NOT reported as unmatched", () => {
    expect(unmatchedAllergies([member({ allergies: ["peanut"] })])).toEqual([]);
  });

  it("the summary carries the unmatched list alongside its count", () => {
    const summary = householdSuitability(
      [member({ allergies: ["zebra"] })],
      [libraryDish("dish-aloo-gobi")],
    );
    expect(summary.unmatched).toHaveLength(1);
    expect(summary.suitingCount).toBe(1);
  });
});

describe("dislikes — flagged, never blocking", () => {
  it("a disliked ingredient warns but the dish still suits", () => {
    const table = [
      ownerAsMember({ pattern: "eggetarian", allergies: [], dislikes: [] }),
      member({ pattern: "eggetarian", dislikes: ["egg"] }),
    ];
    const result = judgeDishForHousehold(EGG_DISH, table);
    expect(result.suitsEveryone).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("Amma");
  });
});

describe("householdSuitability over a set", () => {
  it("counts only the dishes suiting everyone", () => {
    const table = [member({ pattern: "vegan" })];
    const summary = householdSuitability(table, [
      libraryDish("dish-aloo-gobi"), // suits vegan
      libraryDish("dish-jeera-rice"), // dairy — not vegan
      EGG_DISH, // egg — not vegan
    ]);
    expect(summary.totalDishes).toBe(3);
    expect(summary.suitingCount).toBe(1);
    expect(summary.suiting.map((d) => d.id)).toEqual(["dish-aloo-gobi"]);
  });
});

describe("caregiverLines — what to watch, from the record only", () => {
  it("states the pattern with the app's own label", () => {
    const lines = caregiverLines(member({ pattern: "vegetarian" }));
    expect(lines[0]).toBe("Amma eats Vegetarian.");
  });

  it("separates checkable allergies from check-manually ones", () => {
    const lines = caregiverLines(member({ allergies: ["peanut", "zebra"], dislikes: ["Okra"] }));
    expect(lines.some((l) => l.includes("peanut") && l.includes("checked against"))).toBe(true);
    expect(lines.some((l) => l.includes("zebra") && l.includes("manually"))).toBe(true);
    expect(lines.some((l) => l.includes("Dislikes: Okra"))).toBe(true);
  });

  it("a member with nothing stored gets one honest line", () => {
    const lines = caregiverLines(member({}));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("no dietary pattern stated");
  });
});
