import { describe, expect, it } from "vitest";

import {
  DIETARY_PATTERNS,
  EMPTY_CONSTRAINTS,
  EMPTY_DIETARY,
  emptyProfile,
  toSafetyInput,
  type CuisinePreference,
  type DietaryPattern,
  type HealthProfile,
} from "@/lib/vitalis/domain/profile";
import { observation } from "@/lib/vitalis/domain/provenance";
import { quantity } from "@/lib/vitalis/domain/units";
import { classifySafety } from "@/lib/vitalis/safety/classify";
import { targetsFor } from "@/lib/vitalis/calc/body";
import { DISH_LIBRARY, findDish } from "./data/dishLibrary";
import { dishNutrients, dishPatterns, type Dish } from "./dishes";
import { dishIsGravyStyle } from "./gravyStyle";
import {
  generatePlan,
  parsePlanValue,
  planPatternOf,
  planValueOf,
  type DailyPlan,
  type PlanMeal,
} from "./plan";
import { isRawBasisFood } from "./preparation";
import { dishRegion } from "./regions";
import { USDA_REFERENCE_FOODS } from "./usdaReference";
import type { Food, Nutrients } from "./types";

/**
 * P8 acceptance: the single-dish composer. A main meal is ONE library
 * dish, portion-scaled in quarter-serving steps (0.5–2.0) to fit the
 * meal's share of the day — never the P5 stack of anchor + base +
 * side, which composed plates no kitchen serves and left the day's
 * totals unrepairable (the owner's worked example under P7 composed
 * 3,454 kcal and 201 g protein against a 3,288 kcal / 220 g guide).
 * Selection is a protein-weighted fit cost with the P6/P7 learning
 * signals and the Assessment's cuisine preference as ranking terms;
 * a day guard then repairs the scales (and, failing that, re-picks
 * the worst meal) until the day sits inside its bands — energy
 * ±5%, protein 95–110% — whenever the pool allows. The pattern gate
 * is re-verified on the composed plan itself before it is returned.
 *
 * Method 14 note (2026-11-20, M-160): the one legal second dish in
 * a main meal is the accompaniment — a gravy anchor at lunch or
 * dinner carries ONE base (steamed rice or phulka, a fixed half
 * serving). It is not the P5 stack revived: the anchor is still
 * the meal, the base is a fixed accompaniment the repair never
 * scales, and every shape assertion below runs through
 * expectDishMealShape, which pins the base's seat, serving, dish
 * and gravy condition as strictly as P8 pinned the single dish.
 */

const NOW = "2026-11-17T03:00:00.000Z";
const PROVENANCE = { source: "user_reported", recordedAt: "2026-06-01T07:00:00Z" } as const;

function fullProfile(
  pattern: DietaryPattern | null,
  opts: { mealsPerDay?: number; budgetTier?: 1 | 2 | 3 | null; cuisinePreference?: CuisinePreference | null } = {},
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
      cuisinePreference: opts.cuisinePreference ?? null,
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
function ownerProfile(cuisinePreference: CuisinePreference | null = null): HealthProfile {
  return {
    ...fullProfile("eggetarian", { cuisinePreference }),
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
    storedPlan?: DailyPlan | null;
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
    ...(opts.storedPlan !== undefined ? { storedPlan: opts.storedPlan } : {}),
    day,
    now: NOW,
    id: "plan-p8",
  });
  if (!outcome.ok) throw new Error(`plan refused: ${JSON.stringify(outcome.refusal)}`);
  return outcome.plan;
}

const OWNER_TARGETS = { kcal: 3288, proteinG: 220 };
const ownerDay = (day: string): DailyPlan =>
  gen(ownerProfile(), { day, fallbackTargets: OWNER_TARGETS });

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

/** The method-14 meal shape: ONE anchor, plus at most ONE
 *  accompaniment — role "base" in the second seat, the fixed half
 *  serving, one of the two base dishes, at lunch or dinner only,
 *  beside an anchor the gravy derivation calls gravy-style. */
const BASE_DISH_IDS = new Set(["dish-steamed-rice", "dish-phulka-roti"]);
function expectDishMealShape(meal: PlanMeal, label: string) {
  expect(meal.dishes.length, label).toBeGreaterThanOrEqual(1);
  expect(meal.dishes.length, label).toBeLessThanOrEqual(2);
  expect(meal.dishes[0]!.role, label).toBe("anchor");
  if (meal.dishes.length === 2) {
    const base = meal.dishes[1]!;
    expect(base.role, label).toBe("base");
    expect(base.servings, label).toBe(0.5);
    expect(BASE_DISH_IDS.has(base.dishId), label).toBe(true);
    expect(meal.meal === "lunch" || meal.meal === "dinner", label).toBe(true);
    expect(dishIsGravyStyle(findDish(meal.dishes[0]!.dishId)!), label).toBe(true);
  }
}

/** The day's bands, asserted strictly — the fixtures below are the
 *  ones the pool CAN land, so there is no honesty escape hatch. */
function expectDayInBand(plan: DailyPlan, targets: { kcal: number; proteinG: number }) {
  const { kcal, proteinG } = dayTotals(plan);
  expect(Math.abs(kcal - targets.kcal), `${plan.day} kcal ${Math.round(kcal)}`).toBeLessThanOrEqual(
    0.05 * targets.kcal,
  );
  expect(proteinG, `${plan.day} protein ${proteinG.toFixed(0)}`).toBeGreaterThanOrEqual(
    0.95 * targets.proteinG,
  );
  expect(proteinG, `${plan.day} protein ${proteinG.toFixed(0)}`).toBeLessThanOrEqual(
    1.1 * targets.proteinG,
  );
}

const NUTRIENT_FIELDS = [
  "kcal",
  "proteinG",
  "carbsG",
  "fatG",
  "fibreG",
  "sodiumMg",
  "potassiumMg",
  "calciumMg",
  "ironMg",
  "magnesiumMg",
  "vitaminCMg",
] as const satisfies readonly (keyof Nutrients)[];

describe("plan · P8 single-dish composition", () => {
  it("every main meal is ONE real library dish as anchor, plus at most its base", () => {
    const plan = ownerDay("2026-11-17");
    for (const meal of mainMeals(plan)) {
      expectDishMealShape(meal, meal.meal);
      const dish = meal.dishes[0]!;
      expect(dish.role, meal.meal).toBe("anchor");
      /* A dish from the shipped library — not a food, not an invention. */
      expect(findDish(dish.dishId)).not.toBeNull();
      expect(dish.provenance.kind).toBe("recipe");
      expect(dish.provenance.sourceId).toBe(dish.dishId);
    }
  });

  it("the dish is the meal's protein headline", () => {
    const plan = ownerDay("2026-11-17");
    for (const meal of mainMeals(plan)) {
      const dish = meal.dishes[0]!;
      for (const s of meal.suggestions) {
        expect(dish.nutrients.proteinG).toBeGreaterThanOrEqual(s.nutrients.proteinG);
      }
      /* And it covers the bulk of its meal's share itself — the
         top-up layer completes the day, it does not carry a meal. */
      expect(dish.nutrients.kcal, meal.meal).toBeGreaterThanOrEqual(0.6 * meal.kcal);
    }
  });

  it("plan dish numbers ARE the library's numbers, scaled by the stated servings", () => {
    const plan = ownerDay("2026-11-17");
    for (const meal of plan.meals) {
      for (const planDish of meal.dishes) {
        const dish = findDish(planDish.dishId)!;
        const perServing = dishNutrients(dish).nutrients;
        /* The scale is a quarter step inside [0.5, 2.0]. */
        expect(planDish.servings).toBeGreaterThanOrEqual(0.5);
        expect(planDish.servings).toBeLessThanOrEqual(2);
        expect(Math.abs(planDish.servings * 4 - Math.round(planDish.servings * 4))).toBeLessThan(1e-9);
        /* Every field is the library's per-serving value × servings,
           to the engine's own 0.1 rounding — never an invented panel. */
        for (const field of NUTRIENT_FIELDS) {
          expect(
            Math.abs((planDish.nutrients[field] ?? 0) - (perServing[field] ?? 0) * planDish.servings),
            `${dish.name.en} ${field}`,
          ).toBeLessThanOrEqual(0.1);
        }
        expect(planDish.name).toBe(dish.name.en);
      }
    }
  });

  it("the owner's week lands inside the day bands, every meal dish-composed", () => {
    const days = [
      "2026-11-17",
      "2026-11-18",
      "2026-11-19",
      "2026-11-20",
      "2026-11-21",
      "2026-11-22",
      "2026-11-23",
    ];
    for (const day of days) {
      const plan = ownerDay(day);
      expectDayInBand(plan, OWNER_TARGETS);
      for (const meal of mainMeals(plan)) expectDishMealShape(meal, `${day} ${meal.meal}`);
    }
  }, 60_000);

  it("the screenshot fixture (2,964 kcal / 165 g) lands inside the day bands", () => {
    const targets = { kcal: 2964, proteinG: 165 };
    for (const day of ["2026-11-17", "2026-11-18", "2026-11-19"]) {
      const plan = gen(ownerProfile(), { day, fallbackTargets: targets });
      expectDayInBand(plan, targets);
      for (const meal of mainMeals(plan)) expectDishMealShape(meal, `${day} ${meal.meal}`);
      for (const meal of plan.meals) {
        for (const planDish of meal.dishes) {
          expect(dishPatterns(findDish(planDish.dishId)!), `${day}: ${planDish.name}`).toContain(
            "eggetarian",
          );
        }
      }
    }
  }, 60_000);

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

  it("pattern matrix: every stated pattern × target levels — zero violating dishes", () => {
    const levels = [
      { kcal: 2400, proteinG: 130 },
      { kcal: 3288, proteinG: 220 },
    ];
    for (const pattern of DIETARY_PATTERNS) {
      const planPattern = planPatternOf(pattern);
      for (const targets of levels) {
        for (const day of ["2026-11-17", "2026-11-19"]) {
          const plan = gen(fullProfile(pattern), { day, fallbackTargets: targets });
          for (const meal of mainMeals(plan)) {
            expectDishMealShape(meal, `${pattern}/${targets.kcal}/${day} ${meal.meal}`);
          }
          if (planPattern === null) continue;
          for (const meal of plan.meals) {
            for (const planDish of meal.dishes) {
              expect(
                dishPatterns(findDish(planDish.dishId)!),
                `${pattern}/${targets.kcal}/${day}: ${planDish.name}`,
              ).toContain(planPattern);
            }
          }
        }
      }
    }
  }, 120_000);

  it("a stated budget tier is a hard cap on plan dishes", () => {
    /* Method 13 note (2026-11-19): the budget is a PREFERENCE in
       dishPoolFor now, not a cap — but only below the pool floor
       does it widen (with a note). This cell (eggetarian, tier 1,
       the largest guide) keeps a viable in-budget pool at the
       re-banded costs, so the cap-shaped outcome still holds here
       and the pin stands as written; the widening cell is pinned
       in planDishFirst.test.ts. */
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

  it("no dish repeats within a day; the week rotates through the pool", () => {
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
      /* Method 14: the repeat rule binds every dish except the
         base — a plain base may serve at lunch AND dinner (rice
         beside two curries), never more than twice. */
      const ids = plan.meals.flatMap((m) =>
        m.dishes.filter((d) => d.role !== "base").map((d) => d.dishId),
      );
      expect(new Set(ids).size, plan.day).toBe(ids.length);
      const baseIds = plan.meals.flatMap((m) =>
        m.dishes.filter((d) => d.role === "base").map((d) => d.dishId),
      );
      expect(baseIds.length, plan.day).toBeLessThanOrEqual(2);
    }
    /* The P5–P7 pin — no anchor repeats on consecutive days — is
       retired with the mechanism that made it true: order-driven
       picks inside a protein band. Under a fit-argmin it cannot be
       kept honestly (a sit-out simulation names the unconstrained
       winner, never the dish actually served — the displaced dish
       repeats; see the build log). What P8 guarantees instead is
       measured variety: the near-tie band + day rotation spread the
       week across the pool. On this fixture the week serves 12
       distinct dishes; breakfasts and dinners rotate through 6
       each. Lunch is the documented exception IN THIS UNCHAINED
       WEEK: at a 1,279 kcal share one dish (Kulajda-style, 632
       kcal / 44 g protein per serving) beats the runner-up by
       ~0.45 of pick cost, so it leads every day here. This test
       passes no stored plan; the app always composes with the
       previous day's plan stored, and the chained week — pinned
       in the two tests below — is where the served-yesterday
       penalty turns that lead into an alternation. */
    const bySlot = new Map<string, Set<string>>();
    const all = new Set<string>();
    for (const plan of days) {
      for (const meal of mainMeals(plan)) {
        for (const d of meal.dishes) {
          /* The variety census counts anchors: a base is an
             accompaniment, not rotation (method 14). */
          if (d.role === "base") continue;
          all.add(d.dishId);
          if (!bySlot.has(meal.meal)) bySlot.set(meal.meal, new Set());
          bySlot.get(meal.meal)!.add(d.dishId);
        }
      }
    }
    expect(all.size).toBeGreaterThanOrEqual(12);
    /* P11 re-measured this pin: the guaranteed snack slot takes its
       share of the day, so breakfast's split shrinks (27.8% → 25%)
       and its standout fit (Tamago Sando) now leads 3 of the 7
       unchained days — 5 distinct breakfasts, dinners still 6. The
       mechanism is unchanged; the chained week below is where the
       served-yesterday penalty does its work in the real app. */
    expect(bySlot.get("breakfast")!.size).toBeGreaterThanOrEqual(5);
    expect(bySlot.get("dinner")!.size).toBeGreaterThanOrEqual(6);
  }, 60_000);

  it("yesterday's dish sits out when a within-band alternative exists", () => {
    /* The app composes each day with the previous day's plan as
       the stored plan (usePlan passes it straight through). The
       first day crowns the lunch share's standout fit and a
       back-to-back dinner; the second day — same profile, same
       targets — must move BOTH slots on, because at both shares
       the pool holds credible alternatives the penalty can reach.
       The day still lands strictly in band. */
    const day1 = ownerDay("2026-11-17");
    const day2 = gen(ownerProfile(), {
      day: "2026-11-18",
      fallbackTargets: OWNER_TARGETS,
      storedPlan: day1,
    });
    const dishOf = (plan: DailyPlan, meal: string) =>
      plan.meals.find((m) => m.meal === meal)?.dishes[0]?.dishId;
    expect(dishOf(day1, "lunch")).toBeDefined();
    expect(dishOf(day2, "lunch")).toBeDefined();
    expect(dishOf(day2, "lunch")).not.toBe(dishOf(day1, "lunch"));
    expect(dishOf(day2, "dinner")).toBeDefined();
    expect(dishOf(day2, "dinner")).not.toBe(dishOf(day1, "dinner"));
    expectDayInBand(day2, OWNER_TARGETS);
  });

  it("the app's chained week: no slot repeats a dish on consecutive days, lunch rotates", () => {
    /* The week as the app actually composes it: each day's plan
       becomes the next day's stored plan. The served-yesterday
       penalty turns the unchained week's lunch lock (one standout
       soup all seven days) into an alternation — the standout
       still leads the days it is not sitting out, which is the
       pool's honest truth at a 1,279 kcal share, but it never
       serves twice in a row, and the cluster behind it (16 dishes
       within +0.65 of its fit) rotates through the off days. */
    const days = [
      "2026-11-17",
      "2026-11-18",
      "2026-11-19",
      "2026-11-20",
      "2026-11-21",
      "2026-11-22",
      "2026-11-23",
    ];
    const plans: DailyPlan[] = [];
    let prev: DailyPlan | null = null;
    for (const day of days) {
      const plan = gen(ownerProfile(), {
        day,
        fallbackTargets: OWNER_TARGETS,
        storedPlan: prev,
      });
      plans.push(plan);
      prev = plan;
    }
    for (const plan of plans) {
      expectDayInBand(plan, OWNER_TARGETS);
      for (const meal of mainMeals(plan)) {
        expectDishMealShape(meal, `${plan.day} ${meal.meal}`);
      }
    }
    const slotSeq = (slot: string) =>
      plans.map((p) => p.meals.find((m) => m.meal === slot)?.dishes[0]?.dishId);
    for (const slot of ["breakfast", "lunch", "dinner"]) {
      const seq = slotSeq(slot);
      for (let i = 1; i < seq.length; i++) {
        expect(seq[i], `${slot} on ${days[i]}`).not.toBe(seq[i - 1]);
      }
    }
    expect(new Set(slotSeq("lunch")).size).toBeGreaterThanOrEqual(4);
  }, 60_000);

  it("top-ups stay subordinate: few, simple, and never the meal's headline", () => {
    const plan = ownerDay("2026-11-17");
    for (const meal of mainMeals(plan)) {
      const topUps = meal.suggestions.filter((s) => s.layer === "topup");
      expect(topUps.length).toBeLessThanOrEqual(3);
      /* Every food suggestion on a dish-composed meal is a top-up —
         the layered composition does not leak back in. */
      expect(meal.suggestions.every((s) => s.layer === "topup")).toBe(true);
      /* And the top-ups never outweigh the dish they complete. */
      const dishKcal = meal.dishes.reduce((a, d) => a + d.nutrients.kcal, 0);
      const topUpKcal = topUps.reduce((a, s) => a + s.nutrients.kcal, 0);
      expect(topUpKcal).toBeLessThanOrEqual(dishKcal);
    }
  });

  it("the layered food composition is the fallback when no dish can headline", () => {
    /* A pool of desserts only: no dish can headline a main meal, so
       every main meal falls back to foods. */
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
    /* And with no dishes supplied at all, composition is the layered
       food composition. Module 06 (spec §4.4) re-pins its shape: the
       protein layer still composes, but no suggestion is a raw/dry-
       basis food and no meal carries a grain base — every classified
       cereal in the reference set is a dry-basis record, and serving
       it raw was the defect this pass removes. */
    const plain = gen(ownerProfile(), {
      dishes: [],
      fallbackTargets: { kcal: 3288, proteinG: 220 },
    });
    const foodById = new Map(USDA_REFERENCE_FOODS.map((f) => [f.id, f]));
    for (const meal of plain.meals) expect(meal.dishes).toEqual([]);
    expect(plain.meals.some((m) => m.suggestions.some((s) => s.layer === "protein"))).toBe(true);
    expect(plain.meals.some((m) => m.suggestions.some((s) => s.layer === "base"))).toBe(false);
    for (const meal of plain.meals) {
      for (const s of meal.suggestions) {
        expect(isRawBasisFood(foodById.get(s.foodId)!)).toBe(false);
      }
    }
  });

  it("dishes and top-up layers survive a storage round-trip", () => {
    const plan = ownerDay("2026-11-17");
    const parsed = parsePlanValue(JSON.parse(JSON.stringify(planValueOf(plan))));
    expect(parsed).toEqual(plan);
  });

  it("the cuisine preference leans the week south — as a bonus, never a filter", () => {
    const days = [
      "2026-11-17",
      "2026-11-18",
      "2026-11-19",
      "2026-11-20",
      "2026-11-21",
      "2026-11-22",
      "2026-11-23",
    ];
    const southCount = (plan: DailyPlan) =>
      plan.meals
        .flatMap((m) => m.dishes)
        .filter((d) => dishRegion(findDish(d.dishId)!) === "south_indian").length;
    let plain = 0;
    let preferred = 0;
    for (const day of days) {
      plain += southCount(ownerDay(day));
      const plan = gen(ownerProfile("south_indian"), { day, fallbackTargets: OWNER_TARGETS });
      preferred += southCount(plan);
      /* The preference never breaks the day's guarantees. */
      expectDayInBand(plan, OWNER_TARGETS);
      for (const meal of plan.meals) {
        for (const planDish of meal.dishes) {
          expect(dishPatterns(findDish(planDish.dishId)!), `${day}: ${planDish.name}`).toContain(
            "eggetarian",
          );
        }
      }
    }
    /* Measured on this fixture: 1 south dish without the preference,
       14 with it. The pin keeps a wide margin under the measurement —
       what it forbids is the preference going inert. */
    expect(preferred).toBeGreaterThan(plain);
    expect(preferred).toBeGreaterThanOrEqual(10);
  }, 120_000);

  it("worked example — the owner's week, one dish per meal", () => {
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
      const meals = mainMeals(plan).map((m) => {
        const dish = m.dishes[0];
        return `${m.meal}: ${dish ? `${dish.name} ×${dish.servings}` : "(food fallback)"}`;
      });
      lines.push(
        `${day} — ${Math.round(kcal)} kcal · ${proteinG.toFixed(0)} g protein | ${meals.join(" | ")}`,
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
  }, 60_000);
});
