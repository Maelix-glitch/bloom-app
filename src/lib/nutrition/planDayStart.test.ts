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
import type { Dish } from "./dishes";
import {
  generatePlan,
  isProteinPowder,
  parsePlanValue,
  planValueOf,
  type DailyPlan,
} from "./plan";
import { USDA_REFERENCE_FOODS } from "./usdaReference";
import type { Food } from "./types";

/**
 * P11 acceptance — the day-completeness pass (owner directive
 * 2026-11-19): a snack in every plan, a morning element and an
 * exact hydration schedule from the day's own water target, the
 * protein powders (PW-1) reachable as top-ups, and a protein
 * overshoot that is trimmed toward its band and named when it
 * remains. The 500-run matrix (planMatrix500.test.ts) proves these
 * across the input space; this file pins the mechanisms.
 */

const NOW = "2026-11-19T03:00:00.000Z";
const DAY = "2026-11-19";
const PROVENANCE = { source: "user_reported", recordedAt: "2026-06-01T07:00:00Z" } as const;

function fullProfile(
  pattern: DietaryPattern | null,
  opts: { mealsPerDay?: number | null; answered?: boolean } = {},
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
      mealsPerDay: "mealsPerDay" in opts ? opts.mealsPerDay : 3,
    },
    constraints: {
      ...EMPTY_CONSTRAINTS,
      pregnantOrBreastfeeding: opts.answered === false ? null : false,
      eatingDisorderHistory: opts.answered === false ? null : false,
    },
  };
}

function gen(
  profile: HealthProfile,
  opts: {
    day?: string;
    foods?: readonly Food[];
    dishes?: readonly Dish[] | null;
    fallbackTargets?: { kcal: number; proteinG: number } | null;
    waterMl?: number | null;
  } = {},
): DailyPlan {
  const day = opts.day ?? DAY;
  const safety = classifySafety(toSafetyInput(profile));
  const outcome = generatePlan({
    profile,
    safety,
    gatedOutcome: targetsFor(profile, safety, day),
    fallbackTargets: opts.fallbackTargets ?? null,
    foods: opts.foods ?? USDA_REFERENCE_FOODS,
    ...(opts.dishes === null ? {} : { dishes: opts.dishes ?? DISH_LIBRARY }),
    ...(opts.waterMl !== undefined ? { waterMl: opts.waterMl } : {}),
    day,
    now: NOW,
    id: "plan-p11",
  });
  if (!outcome.ok) throw new Error(`plan refused: ${JSON.stringify(outcome.refusal)}`);
  return outcome.plan;
}

const dayProtein = (plan: DailyPlan) =>
  plan.meals.reduce(
    (a, m) =>
      a +
      m.dishes.reduce((x, d) => x + d.nutrients.proteinG, 0) +
      m.suggestions.reduce((x, s) => x + s.nutrients.proteinG, 0),
    0,
  );

/* ------------------------------ the powders ------------------------------- */

describe("P11 · protein powders", () => {
  it("the powder identity matches exactly the two PW-1 records in the pinned set", () => {
    expect(USDA_REFERENCE_FOODS.filter(isProteinPowder).map((f) => f.id)).toEqual([
      "usda-173177",
      "usda-173181",
    ]);
  });

  it("a protein-short dish day is closed with powder top-ups, in scoop-sized portions", () => {
    /* Three light dals as the whole dish pool: the dishes alone
       cannot reach a 150 g protein guide, so the top-up pass must
       speak — and the densest honest closers are the powders. */
    const dishes = [
      findDish("dish-dal-fry")!,
      findDish("dish-moong-dal-tadka")!,
      findDish("dish-urad-dal")!,
    ];
    const days = [
      "2026-11-16",
      "2026-11-17",
      "2026-11-18",
      "2026-11-19",
      "2026-11-20",
      "2026-11-21",
      "2026-11-22",
    ];
    for (const day of days) {
      const plan = gen(fullProfile("omnivore", { answered: false }), {
        day,
        dishes,
        fallbackTargets: { kcal: 2000, proteinG: 150 },
      });
      const topUps = plan.meals.flatMap((m) =>
        m.suggestions.filter((s) => s.layer === "topup"),
      );
      const powders = topUps.filter((s) => isProteinPowder(USDA_REFERENCE_FOODS.find((f) => f.id === s.foodId)!));
      expect(powders.length, day).toBeGreaterThanOrEqual(1);
      for (const p of powders) {
        expect(p.grams).toBeLessThanOrEqual(45);
        expect(p.grams).toBeGreaterThanOrEqual(15);
      }
      /* A powder is a top-up, never a meal: no main meal's dish is
         a powder, and no meal is built from one. */
      for (const meal of plan.meals) {
        expect(meal.dishes.every((d) => !d.dishId.includes("173177"))).toBe(true);
      }
    }
  });

  it("a vegan plan never sees whey (dairy) — the pattern gate judges powders too", () => {
    const dishes = [
      findDish("dish-dal-fry")!,
      findDish("dish-moong-dal-tadka")!,
      findDish("dish-urad-dal")!,
    ];
    const plan = gen(fullProfile("vegan", { answered: false }), {
      dishes,
      fallbackTargets: { kcal: 2000, proteinG: 150 },
    });
    const ids = plan.meals.flatMap((m) => m.suggestions.map((s) => s.foodId));
    expect(ids).not.toContain("usda-173177");
  });
});

/* -------------------------------- the snack -------------------------------- */

describe("P11 · the snack belongs to the day", () => {
  it.each([1, 2, 3])("a stated %i-meal day still carries a real snack", (mealsPerDay) => {
    const plan = gen(fullProfile("omnivore", { mealsPerDay }));
    const snack = plan.meals.find((m) => m.meal === "snack");
    expect(snack).toBeDefined();
    /* Method 13 (2026-11-19): the snack is a real DISH now (a
       shake / protein snack / breakfast dish) rather than plain
       foods, so the "real snack" count reads dishes + suggestions
       — the property pinned is unchanged: the snack slot is never
       empty. */
    expect(snack!.dishes.length + snack!.suggestions.length).toBeGreaterThanOrEqual(1);
    expect(
      plan.notes.some((n) => n.includes("this plan adds a snack")),
    ).toBe(true);
    /* The day's splits still sum exactly to the targets. */
    expect(plan.meals.reduce((a, m) => a + m.kcal, 0)).toBe(Math.round(plan.targets.kcal));
  });

  it("an unanswered meals-per-day carries the snack with no addition note", () => {
    const plan = gen(fullProfile("omnivore", { mealsPerDay: null }));
    expect(plan.meals.some((m) => m.meal === "snack")).toBe(true);
    expect(plan.notes.some((n) => n.includes("this plan adds a snack"))).toBe(false);
  });
});

/* ----------------------------- morning + water ----------------------------- */

describe("P11 · morning and hydration", () => {
  it("the gated path schedules the outcome's own water figure, exactly", () => {
    const profile = fullProfile("omnivore");
    const safety = classifySafety(toSafetyInput(profile));
    const gated = targetsFor(profile, safety, DAY);
    expect(gated.ok).toBe(true);
    const plan = gen(profile);
    expect(plan.morning).toEqual({ waterMl: 250 });
    expect(plan.hydration).toBeDefined();
    if (!gated.ok) throw new Error("unreachable");
    expect(plan.hydration!.targetMl).toBe(Math.round(gated.targets.waterMl));
    const sum = plan.hydration!.wakeMl + plan.hydration!.perMeal.reduce((a, p) => a + p.ml, 0);
    expect(sum).toBe(plan.hydration!.targetMl);
    expect(plan.hydration!.totalMl).toBe(plan.hydration!.targetMl);
    expect(plan.hydration!.perMeal.map((p) => p.meal)).toEqual(plan.meals.map((m) => m.meal));
  });

  it("the fallback path schedules the caller's body-profile figure", () => {
    const plan = gen(fullProfile("omnivore", { answered: false }), {
      fallbackTargets: { kcal: 2400, proteinG: 130 },
      waterMl: 2650,
    });
    expect(plan.targetsSource).toBe("body_profile");
    expect(plan.hydration?.targetMl).toBe(2650);
  });

  it("no water figure anywhere: the morning glass stands, no schedule is invented", () => {
    const plan = gen(fullProfile("omnivore", { answered: false }), {
      fallbackTargets: { kcal: 2400, proteinG: 130 },
    });
    expect(plan.morning).toEqual({ waterMl: 250 });
    expect(plan.hydration).toBeUndefined();
  });

  it("morning and hydration survive a storage round-trip; a tampered schedule is refused", () => {
    const plan = gen(fullProfile("omnivore"));
    const parsed = parsePlanValue(JSON.parse(JSON.stringify(planValueOf(plan))));
    expect(parsed).toEqual(plan);
    const tampered = JSON.parse(JSON.stringify(planValueOf(plan)));
    tampered.plan.hydration.perMeal[0].ml += 50;
    expect(parsePlanValue(tampered)).toBeNull();
  });
});

/* --------------------------- protein overshoot ----------------------------- */

describe("P11 · protein overshoot", () => {
  it("the small-target food-composed day no longer sails past its band unnamed", () => {
    /* Pre-P11 measurement of this exact shape: 127 g against a
       90 g guide (+41%), with no note saying so. */
    const plan = gen(fullProfile("eggetarian", { answered: false }), {
      fallbackTargets: { kcal: 1800, proteinG: 90 },
      dishes: null,
    });
    const protein = dayProtein(plan);
    const named = plan.notes.some((n) => n.includes("g of protein — above your"));
    expect(protein <= 1.1 * 90 || named).toBe(true);
    expect(protein).toBeLessThan(127);
  });
});
