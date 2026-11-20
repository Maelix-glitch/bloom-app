import { describe, expect, it } from "vitest";

import {
  EMPTY_BEHAVIOURAL,
  EMPTY_CONSTRAINTS,
  EMPTY_DIETARY,
  emptyProfile,
  toSafetyInput,
  type HealthProfile,
} from "@/lib/vitalis/domain/profile";
import { observation } from "@/lib/vitalis/domain/provenance";
import { quantity } from "@/lib/vitalis/domain/units";
import { classifySafety } from "@/lib/vitalis/safety/classify";
import { DISH_LIBRARY } from "./data/dishLibrary";
import { dishIsGravyStyle } from "./gravyStyle";
import { generatePlan, type DailyPlan, type PlanMeal } from "./plan";
import { dishRegion } from "./regions";
import { USDA_REFERENCE_FOODS } from "./usdaReference";

/**
 * Method 14 (M-160) — a curry gets its base. The owner's words:
 * his plan was "just plain curries" with nothing to eat them
 * with. The accompaniment rule: a gravy-style lunch/dinner
 * anchor (dishIsGravyStyle — recipe structure, never the name)
 * is served with ONE base at a fixed half serving — phulka
 * where the anchor is North Indian, steamed rice otherwise —
 * counted in the meal and the day like everything else the
 * plan serves. These pins hold the rule's shape: where a base
 * appears, where it never does, and that the day still lands
 * on its guide with the bases counted.
 */

const PROVENANCE = { source: "user_reported", recordedAt: "2026-06-01T07:00:00Z" } as const;
const NOW = "2026-11-20T03:00:00.000Z";

const BY_ID = new Map(DISH_LIBRARY.map((d) => [d.id, d]));
const BASE_IDS = new Set(["dish-steamed-rice", "dish-phulka-roti"]);

function gen(profile: HealthProfile, day: string, kcal: number, proteinG: number): DailyPlan {
  const outcome = generatePlan({
    profile,
    safety: classifySafety(toSafetyInput(profile)),
    gatedOutcome: { ok: false, reason: "profile_incomplete", missing: [] },
    fallbackTargets: { kcal, proteinG },
    foods: USDA_REFERENCE_FOODS,
    dishes: DISH_LIBRARY,
    day,
    now: NOW,
    id: `plan-m14-${day}`,
  });
  if (!outcome.ok) throw new Error(`plan refused: ${JSON.stringify(outcome.refusal)}`);
  return outcome.plan;
}

/** The owner's exact stored answers — the same fixture
 *  planDishFirst.test.ts pins (Assessment, 18 Nov 2026). */
function ownerCornerProfile(): HealthProfile {
  return {
    ...emptyProfile("user-1", "2026-06-01T07:00:00Z"),
    ageYears: 19,
    sex: "male",
    height: observation(quantity(165, "cm"), PROVENANCE),
    weight: observation(quantity(95, "kg"), PROVENANCE),
    goal: "lose",
    activity: "light",
    rateKgPerWeek: 0.5,
    dietary: {
      ...EMPTY_DIETARY,
      pattern: "omnivore",
      budgetTier: 2,
      cuisinePreference: "south_indian",
      mealsPerDay: 3,
    },
    behavioural: {
      ...EMPTY_BEHAVIOURAL,
      cookingAbility: "none",
      equipment: ["stove", "pressure_cooker", "mixer_grinder", "fridge"],
      prepTimeMaxMinutes: 10,
    },
    constraints: {
      ...EMPTY_CONSTRAINTS,
      pregnantOrBreastfeeding: false,
      eatingDisorderHistory: false,
    },
  };
}

const plainOmnivore: HealthProfile = {
  ...emptyProfile("user-1", "2026-06-01T07:00:00Z"),
  ageYears: 30,
  sex: "male",
  height: observation(quantity(178, "cm"), PROVENANCE),
  weight: observation(quantity(80, "kg"), PROVENANCE),
  goal: "maintain",
  activity: "moderate",
  dietary: { ...EMPTY_DIETARY, pattern: "omnivore", mealsPerDay: 3 },
  constraints: {
    ...EMPTY_CONSTRAINTS,
    pregnantOrBreastfeeding: false,
    eatingDisorderHistory: false,
  },
};

const mealKcal = (meal: PlanMeal): number =>
  meal.dishes.reduce((x, d) => x + d.nutrients.kcal, 0) +
  meal.suggestions.reduce((x, s) => x + s.nutrients.kcal, 0);

const dayTotals = (plan: DailyPlan) =>
  plan.meals.reduce(
    (a, m) => ({
      kcal: a.kcal + mealKcal(m),
      proteinG:
        a.proteinG +
        m.dishes.reduce((x, d) => x + d.nutrients.proteinG, 0) +
        m.suggestions.reduce((x, s) => x + s.nutrients.proteinG, 0),
    }),
    { kcal: 0, proteinG: 0 },
  );

/* ------------------------- the owner's day, before/after ------------------------ */

describe("method 14 · the owner's day (2026-11-19)", () => {
  const plan = gen(ownerCornerProfile(), "2026-11-19", 1350, 171);
  const byMeal = new Map(plan.meals.map((m) => [m.meal, m]));

  it("the gravy lunch (Chicken Rezala) is served WITH a base", () => {
    const lunch = byMeal.get("lunch")!;
    expect(lunch.dishes[0]!.dishId).toBe("dish-chicken-rezala");
    expect(lunch.dishes.length).toBe(2);
    const base = lunch.dishes[1]!;
    expect(base.role).toBe("base");
    expect(base.servings).toBe(0.5);
    /* Rezala is an eastern dish, not North Indian: the base is
       steamed rice, not phulka. */
    expect(base.dishId).toBe("dish-steamed-rice");
  });

  it("the base is counted in the meal — its kcal are part of the meal's sum", () => {
    const lunch = byMeal.get("lunch")!;
    const anchor = lunch.dishes[0]!;
    const base = lunch.dishes[1]!;
    expect(base.nutrients.kcal).toBeGreaterThan(0);
    expect(mealKcal(lunch)).toBeCloseTo(
      anchor.nutrients.kcal +
        base.nutrients.kcal +
        lunch.suggestions.reduce((x, s) => x + s.nutrients.kcal, 0),
      5,
    );
  });

  it("the dinner (Bakso Ayam, a soup) gets NO base", () => {
    /* Method 13's dinner was Mathi Pepper Fry; with the lunch
       base on the plate the day guard re-picks dinner — judged
       as whole plates now, so a gravy candidate is priced WITH
       its rice — and lands on a soup, which the derivation
       rightly refuses: a soup is already complete. */
    const dinner = byMeal.get("dinner")!;
    expect(dinner.dishes[0]!.dishId).toBe("dish-id-bakso-ayam");
    expect(dinner.dishes.length).toBe(1);
  });

  it("breakfast and the snack never carry a base", () => {
    for (const meal of plan.meals) {
      if (meal.meal === "breakfast" || meal.meal === "snack") {
        expect(meal.dishes.length, meal.meal).toBe(1);
        expect(meal.dishes[0]!.role, meal.meal).toBe("anchor");
      }
    }
  });

  it("the day still lands on its guide with the base counted", () => {
    const totals = dayTotals(plan);
    expect(Math.abs(totals.kcal - 1350) / 1350).toBeLessThan(0.1);
    expect(totals.proteinG).toBeGreaterThanOrEqual(160);
  });
});

/* ------------------------------ the rule's shape ------------------------------ */

describe("method 14 · the accompaniment rule's shape, over real weeks", () => {
  const weeks: { profile: HealthProfile; kcal: number; proteinG: number; days: string[] }[] = [
    {
      profile: ownerCornerProfile(),
      kcal: 1350,
      proteinG: 171,
      days: ["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20"],
    },
    {
      profile: plainOmnivore,
      kcal: 2200,
      proteinG: 140,
      days: ["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20"],
    },
  ];

  for (const { profile, kcal, proteinG, days } of weeks) {
    for (const day of days) {
      it(`holds on ${day} (${kcal} kcal guide)`, () => {
        const plan = gen(profile, day, kcal, proteinG);
        for (const meal of plan.meals) {
          const anchor = BY_ID.get(meal.dishes[0]!.dishId)!;
          if (meal.dishes.length === 2) {
            /* A base exists ONLY beside a gravy lunch/dinner anchor,
               exactly one, at the fixed serving, from the base shelf. */
            expect(meal.meal === "lunch" || meal.meal === "dinner", meal.meal).toBe(true);
            expect(dishIsGravyStyle(anchor), anchor.id).toBe(true);
            const base = meal.dishes[1]!;
            expect(base.role).toBe("base");
            expect(base.servings).toBe(0.5);
            expect(BASE_IDS.has(base.dishId), base.dishId).toBe(true);
            /* Phulka is served only where the anchor is North Indian. */
            if (base.dishId === "dish-phulka-roti") {
              expect(dishRegion(anchor)).toBe("north_indian");
            }
          } else {
            expect(meal.dishes.length, meal.meal).toBe(1);
            /* …and the converse: a gravy lunch/dinner anchor is
               never left bare. A base may repeat across meals
               (rice beside two curries is a kitchen's normal), so
               there is no exhaustion exception; and in these
               fixtures both bases sit in the gated pool (tier-1,
               stove, pattern-clean), so the shelf is never empty. */
            if (
              (meal.meal === "lunch" || meal.meal === "dinner") &&
              dishIsGravyStyle(anchor) &&
              anchor.category === "main"
            ) {
              throw new Error(`${meal.meal}: gravy anchor ${anchor.id} served bare on ${day}`);
            }
          }
          /* Breakfast and the snack are never based, whatever anchors them. */
          if (meal.meal === "breakfast" || meal.meal === "snack") {
            expect(meal.dishes.length, meal.meal).toBe(1);
          }
          /* A rice/bread anchor is its own base — never based. */
          if (anchor.category === "rice" || anchor.category === "bread") {
            expect(meal.dishes.length, `${meal.meal}: ${anchor.id}`).toBe(1);
          }
        }
      });
    }
  }

  it("bases actually appear across the owner's week — the fix is not theoretical", () => {
    const based = weeks[0]!.days.flatMap((day) =>
      gen(ownerCornerProfile(), day, 1350, 171).meals.filter((m) => m.dishes.length === 2),
    );
    expect(based.length).toBeGreaterThanOrEqual(3);
  });
});
