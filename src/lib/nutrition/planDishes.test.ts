import { describe, expect, it } from "vitest";

import {
  EMPTY_CONSTRAINTS,
  EMPTY_DIETARY,
  emptyProfile,
  toSafetyInput,
  type DietaryPattern,
  type HealthProfile,
} from "@/lib/vitalis/domain/profile";
import { observation } from "@/lib/vitalis/domain/provenance";
import { quantity } from "@/lib/vitalis/domain/units";
import { classifySafety } from "@/lib/vitalis/safety/classify";
import { targetsFor } from "@/lib/vitalis/calc/body";
import { DISH_LIBRARY, findDish } from "./data/dishLibrary";
import { dishNutrients, dishPatterns, type Dish } from "./dishes";
import {
  generatePlan,
  parsePlanValue,
  planValueOf,
  type DailyPlan,
  type PlanMeal,
} from "./plan";
import { USDA_REFERENCE_FOODS } from "./usdaReference";
import type { Food } from "./types";

/**
 * P5 acceptance: the dish-first composer. A main meal is a plate of
 * library dishes — a protein anchor, a base and a side where the
 * meal's energy share calls for them — under the plan's own gates
 * (pattern, eligible lines, budget as a hard cap), with simple foods
 * demoted to a top-up layer and the layered food composition kept as
 * the per-slot fallback. The owner's day is the worked example: gain,
 * ~3,288 kcal, ~220 g protein, eggetarian, three meals.
 */

const NOW = "2026-11-17T03:00:00.000Z";
const PROVENANCE = { source: "user_reported", recordedAt: "2026-06-01T07:00:00Z" } as const;

function fullProfile(
  pattern: DietaryPattern | null,
  opts: { mealsPerDay?: number; budgetTier?: 1 | 2 | 3 | null } = {},
): HealthProfile {
  return {
    ...emptyProfile("user-1", "2026-06-01T07:00:00Z"),
    ageYears: 30,
    sex: "male",
    height: observation(quantity(178, "cm"), PROVENANCE),
    weight: observation(quantity(80, "kg"), PROVENANCE),
    goal: "maintain",
    activity: "moderate",
    rateKgPerWeek: 0,
    dietary: {
      ...EMPTY_DIETARY,
      pattern,
      mealsPerDay: opts.mealsPerDay ?? 3,
      budgetTier: opts.budgetTier ?? null,
    },
    constraints: {
      ...EMPTY_CONSTRAINTS,
      pregnantOrBreastfeeding: false,
      eatingDisorderHistory: false,
    },
  };
}

/** The owner's shape: eggetarian, 100 kg, gain — safety questions
 *  unanswered (absence-only block), so targets come from the
 *  body-profile fallback, exactly as his live plan does. */
function ownerProfile(): HealthProfile {
  return {
    ...fullProfile("eggetarian"),
    weight: observation(quantity(100, "kg"), PROVENANCE),
    goal: "gain",
    rateKgPerWeek: 0.25,
    constraints: {
      ...EMPTY_CONSTRAINTS,
      pregnantOrBreastfeeding: null,
      eatingDisorderHistory: null,
    },
  };
}

function gen(
  profile: HealthProfile,
  opts: {
    day?: string;
    foods?: readonly Food[];
    dishes?: readonly Dish[];
    fallbackTargets?: { kcal: number; proteinG: number };
  } = {},
): DailyPlan {
  const day = opts.day ?? "2026-11-17";
  const safety = classifySafety(toSafetyInput(profile));
  const outcome = generatePlan({
    profile,
    safety,
    gatedOutcome: targetsFor(profile, safety, day),
    fallbackTargets: opts.fallbackTargets ?? null,
    foods: opts.foods ?? USDA_REFERENCE_FOODS,
    dishes: opts.dishes ?? DISH_LIBRARY,
    day,
    now: NOW,
    id: "plan-p5",
  });
  if (!outcome.ok) throw new Error(`plan refused: ${JSON.stringify(outcome.refusal)}`);
  return outcome.plan;
}

const ownerDay = (day: string): DailyPlan =>
  gen(ownerProfile(), { day, fallbackTargets: { kcal: 3288, proteinG: 220 } });

const dayTotals = (plan: DailyPlan) => ({
  kcal: plan.meals.reduce(
    (sum, m) =>
      sum +
      m.suggestions.reduce((a, s) => a + s.nutrients.kcal, 0) +
      m.dishes.reduce((a, d) => a + d.nutrients.kcal, 0),
    0,
  ),
  proteinG: plan.meals.reduce(
    (sum, m) =>
      sum +
      m.suggestions.reduce((a, s) => a + s.nutrients.proteinG, 0) +
      m.dishes.reduce((a, d) => a + d.nutrients.proteinG, 0),
    0,
  ),
});

const mainMeals = (plan: DailyPlan): PlanMeal[] => plan.meals.filter((m) => m.meal !== "snack");

describe("plan · P5 dish-first composition", () => {
  it("every main meal is anchored by a real library dish", () => {
    const plan = ownerDay("2026-11-17");
    for (const meal of mainMeals(plan)) {
      expect(meal.dishes.length, meal.meal).toBeGreaterThanOrEqual(1);
      expect(meal.dishes.length, meal.meal).toBeLessThanOrEqual(3);
      const anchor = meal.dishes.find((d) => d.role === "anchor");
      expect(anchor, meal.meal).toBeDefined();
      /* The anchor is a dish from the shipped library — not a food,
         not an invention. */
      expect(findDish(anchor!.dishId)).not.toBeNull();
      expect(anchor!.provenance.kind).toBe("recipe");
      expect(anchor!.provenance.sourceId).toBe(anchor!.dishId);
    }
  });

  it("the anchor is each meal's largest protein source", () => {
    const plan = ownerDay("2026-11-17");
    for (const meal of mainMeals(plan)) {
      const anchor = meal.dishes.find((d) => d.role === "anchor")!;
      for (const other of meal.dishes) {
        if (other !== anchor) expect(anchor.nutrients.proteinG).toBeGreaterThanOrEqual(other.nutrients.proteinG);
      }
      for (const s of meal.suggestions) {
        expect(anchor.nutrients.proteinG).toBeGreaterThanOrEqual(s.nutrients.proteinG);
      }
    }
  });

  it("plan dish numbers ARE the library's numbers for the same dish", () => {
    const plan = ownerDay("2026-11-17");
    for (const meal of plan.meals) {
      for (const planDish of meal.dishes) {
        const dish = findDish(planDish.dishId)!;
        expect(planDish.nutrients).toEqual(dishNutrients(dish).nutrients);
        expect(planDish.name).toBe(dish.name.en);
      }
    }
  });

  it("the day reconciles: energy within ±5% of the guide, protein met or honestly named", () => {
    const plan = ownerDay("2026-11-17");
    const { kcal, proteinG } = dayTotals(plan);
    if (Math.abs(kcal - 3288) > 0.05 * 3288) {
      const note = plan.notes.find((n) => n.includes("kcal guide"));
      expect(note).toBeDefined();
      expect(note).toContain(`about ${Math.round(kcal)} kcal`);
    }
    if (proteinG < 0.95 * 220) {
      const note = plan.notes.find((n) => n.includes("protein guide"));
      expect(note).toBeDefined();
      expect(note).toContain(`about ${Math.round(proteinG)} g of your 220 g protein guide`);
    }
  });

  it("an eggetarian's plan dishes never contain meat or fish", () => {
    for (const day of ["2026-11-17", "2026-11-18", "2026-11-19"]) {
      const plan = ownerDay(day);
      for (const meal of plan.meals) {
        for (const planDish of meal.dishes) {
          const dish = findDish(planDish.dishId)!;
          expect(dishPatterns(dish), `${day}: ${dish.name.en}`).toContain("eggetarian");
        }
      }
    }
  });

  it("a stated budget tier is a hard cap on plan dishes", () => {
    const plan = gen(fullProfile("eggetarian", { budgetTier: 1 }), {
      fallbackTargets: { kcal: 3288, proteinG: 220 },
    });
    const dishes = plan.meals.flatMap((m) => m.dishes);
    expect(dishes.length).toBeGreaterThan(0);
    for (const planDish of dishes) {
      expect(findDish(planDish.dishId)!.budgetTier).toBeLessThanOrEqual(1);
    }
  });

  it("composition is deterministic — the same inputs compose the identical plan", () => {
    const a = ownerDay("2026-11-17");
    const b = ownerDay("2026-11-17");
    expect(JSON.stringify(a.meals)).toBe(JSON.stringify(b.meals));
    expect(JSON.stringify(a.notes)).toBe(JSON.stringify(b.notes));
  });

  it("no dish repeats within a day, and no anchor repeats on consecutive days", () => {
    const days = [
      "2026-11-17",
      "2026-11-18",
      "2026-11-19",
      "2026-11-20",
      "2026-11-21",
      "2026-11-22",
      "2026-11-23",
    ].map(ownerDay);
    for (const plan of days) {
      const ids = plan.meals.flatMap((m) => m.dishes.map((d) => d.dishId));
      expect(new Set(ids).size, plan.day).toBe(ids.length);
    }
    for (let i = 1; i < days.length; i++) {
      for (const meal of mainMeals(days[i]!)) {
        const anchor = meal.dishes.find((d) => d.role === "anchor");
        const prev = mainMeals(days[i - 1]!).find((m) => m.meal === meal.meal)?.dishes.find(
          (d) => d.role === "anchor",
        );
        if (anchor && prev) {
          expect(anchor.dishId, `${days[i]!.day} ${meal.meal}`).not.toBe(prev.dishId);
        }
      }
    }
  });

  it("top-ups stay subordinate: few, simple, and never the meal's headline", () => {
    const plan = ownerDay("2026-11-17");
    for (const meal of mainMeals(plan)) {
      const topUps = meal.suggestions.filter((s) => s.layer === "topup");
      expect(topUps.length).toBeLessThanOrEqual(3);
      /* Every food suggestion on a dish-composed meal is a top-up —
         the layered composition does not leak back in. */
      expect(meal.suggestions.every((s) => s.layer === "topup")).toBe(true);
    }
  });

  it("the layered food composition is the fallback when no dish can anchor", () => {
    /* A pool of desserts only: nothing can anchor, base or side a
       main meal, so every main meal falls back to foods. */
    const desserts = DISH_LIBRARY.filter((d) => d.category === "dessert");
    const plan = gen(ownerProfile(), {
      dishes: desserts,
      fallbackTargets: { kcal: 3288, proteinG: 220 },
    });
    for (const meal of mainMeals(plan)) {
      expect(meal.dishes).toEqual([]);
      expect(meal.suggestions.length).toBeGreaterThan(0);
      expect(meal.suggestions.some((s) => s.layer === "protein")).toBe(true);
    }
    /* And with no dishes supplied at all, composition is unchanged
       from the pre-P5 engine. */
    const plain = gen(ownerProfile(), {
      dishes: [],
      fallbackTargets: { kcal: 3288, proteinG: 220 },
    });
    for (const meal of plain.meals) expect(meal.dishes).toEqual([]);
    expect(plain.meals.some((m) => m.suggestions.some((s) => s.layer === "base"))).toBe(true);
  });

  it("dishes and top-up layers survive a storage round-trip", () => {
    const plan = ownerDay("2026-11-17");
    const parsed = parsePlanValue(JSON.parse(JSON.stringify(planValueOf(plan))));
    expect(parsed).toEqual(plan);
  });

  it("worked example — the owner's week, dish-first", () => {
    const days = [
      "2026-11-17",
      "2026-11-18",
      "2026-11-19",
      "2026-11-20",
      "2026-11-21",
      "2026-11-22",
      "2026-11-23",
    ];
    const lines: string[] = [];
    for (const day of days) {
      const plan = ownerDay(day);
      const { kcal, proteinG } = dayTotals(plan);
      const anchors = mainMeals(plan).map((m) => {
        const anchor = m.dishes.find((d) => d.role === "anchor");
        return `${m.meal}: ${anchor ? anchor.name : "(food fallback)"}`;
      });
      lines.push(
        `${day} — ${Math.round(kcal)} kcal · ${proteinG.toFixed(0)} g protein | ${anchors.join(" | ")}`,
      );
      /* Every day of the week: energy inside ±5% or the miss is named
         on the plan; the same honesty for protein at 95%. */
      if (Math.abs(kcal - 3288) > 0.05 * 3288) {
        expect(plan.notes.some((n) => n.includes("kcal guide")), day).toBe(true);
      }
      if (proteinG < 0.95 * 220) {
        expect(plan.notes.some((n) => n.includes("protein guide")), day).toBe(true);
      }
    }
    console.log(`\nWORKED EXAMPLE — owner fixture (3,288 kcal / 220 g, eggetarian, 3 meals)\n${lines.join("\n")}`);
  });
});
