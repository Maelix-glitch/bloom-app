import { describe, expect, it } from "vitest";

import {
  EMPTY_BEHAVIOURAL,
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
import { DISH_LIBRARY, PROTEIN_WAVE_DISH_IDS } from "./data/dishLibrary";
import { dishPatterns } from "./dishes";
import { eligiblePool, generatePlan, planPatternOf, type DailyPlan } from "./plan";
import { rawBasisFraming } from "./preparation";
import { USDA_REFERENCE_FOODS } from "./usdaReference";

/**
 * Method 13 — the dish-first repair (2026-11-19). The raw-plan
 * diagnosis (~/workspace/nutrition-diagnosis-log.md) measured the
 * old composer serving the owner layered RAW plain foods with no
 * protein dishes at all. Its causes, and the pins that keep them
 * closed:
 *
 *  D1 — the budget was a hard filter over mis-priced protein:
 *       flesh, fish and protein powders sat in the almond cost
 *       band, so at budget tier 1 ZERO servable protein-wave
 *       dishes existed for any pattern. → the census pins below.
 *  D2 — shakes and protein snacks were structurally unservable:
 *       the snack slot was built with an empty dish list and no
 *       slot accepted their categories. → the snack pins below.
 *  D3 — kitchen gates starved the pool into a silent raw-food
 *       fallback. → the owner's exact corner, pinned whole.
 *  D5 — raw-basis grams rendered unexplained. → the framing pin.
 */

const PROVENANCE = { source: "user_reported", recordedAt: "2026-06-01T07:00:00Z" } as const;
const NOW = "2026-11-19T03:00:00.000Z";

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
    id: `plan-m13-${day}`,
  });
  if (!outcome.ok) throw new Error(`plan refused: ${JSON.stringify(outcome.refusal)}`);
  return outcome.plan;
}

const DISH_BY_ID = new Map(DISH_LIBRARY.map((d) => [d.id, d]));

/* ------------------------------- D1 census -------------------------------- */

describe("method 13 · the protein-wave census (D1)", () => {
  const wave = DISH_LIBRARY.filter((d) => PROTEIN_WAVE_DISH_IDS.has(d.id));

  it("the wave is the 299 dedicated protein dishes", () => {
    expect(wave.length).toBe(299);
  });

  it("the wave's budget tiers are no longer stacked at the top tier", () => {
    /* At the old bands the distribution was 3 / 122 / 174 — 58% of
       the wave priced into tier 3 by the almond band. Measured at
       the re-banded costs: 8 / 151 / 140. The pin is the shape,
       not the exact census: tier 3 must hold under half the wave. */
    const tier3 = wave.filter((d) => d.budgetTier === 3).length;
    expect(tier3 / wave.length).toBeLessThan(0.5);
  });

  it("every pattern has servable protein-wave dishes at tier 1 AND tier 2", () => {
    /* Servable = the plan's own judgements: the dish suits the
       pattern (dishPatterns), every ingredient line sits in the
       pattern's eligible pool, and the category is one a slot can
       serve (main / rice / breakfast / shake / snack). At the old
       bands the tier-1 count was ZERO for every pattern — the
       single number behind "no protein dishes". Measured at the
       re-banded costs, the minimums across patterns are 6 (tier 1)
       and 39 (tier 2); the pins sit below them with room for small
       library changes, far above the old zero. */
    const SERVABLE = new Set(["main", "rice", "breakfast", "shake", "snack"]);
    const patterns: DietaryPattern[] = [
      "vegetarian",
      "eggetarian",
      "vegan",
      "pescatarian",
      "omnivore",
    ];
    for (const pattern of patterns) {
      const profile: HealthProfile = {
        ...emptyProfile("user-census", "2026-06-01T07:00:00Z"),
        dietary: { ...EMPTY_DIETARY, pattern },
      };
      const eligible = new Set(eligiblePool(profile, USDA_REFERENCE_FOODS).map((f) => f.id));
      const planPattern = planPatternOf(pattern);
      const servable = wave.filter(
        (d) =>
          SERVABLE.has(d.category) &&
          d.lines.every((l) => eligible.has(l.foodId)) &&
          (planPattern === null || dishPatterns(d).includes(planPattern)),
      );
      expect(
        servable.filter((d) => d.budgetTier <= 1).length,
        `${pattern} at tier 1`,
      ).toBeGreaterThanOrEqual(4);
      expect(
        servable.filter((d) => d.budgetTier <= 2).length,
        `${pattern} at tier 2`,
      ).toBeGreaterThanOrEqual(25);
    }
  });
});

/* --------------------------- D3 · the owner's corner ----------------------- */

/** The owner's exact stored answers (Assessment, 18 Nov 2026):
 *  omnivore, budget tier 2, south indian, cooking "no cooking",
 *  prep ~10 minutes, his equipment set — against his live guide of
 *  ~1,350 kcal / ~171 g protein. This is the day that was served
 *  raw; it is pinned whole so it cannot quietly come back. */
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

describe("method 13 · the owner's corner (D3/F9)", () => {
  const plan = gen(ownerCornerProfile(), "2026-11-19", 1350, 171);

  it("every meal is dish-composed — no raw composite anywhere", () => {
    /* Method 14 (M-160): a gravy lunch/dinner anchor now carries
       ONE base beside it, so a meal is one dish (anchor) or two
       (anchor + base) — never a layered raw composite, which is
       what this pin exists to keep out. The base's own shape is
       pinned in planAccompaniment.test.ts. */
    for (const meal of plan.meals) {
      expect(meal.dishes.length, meal.meal).toBeGreaterThanOrEqual(1);
      expect(meal.dishes.length, meal.meal).toBeLessThanOrEqual(2);
      expect(meal.dishes[0]!.role, meal.meal).toBe("anchor");
      if (meal.dishes.length === 2) expect(meal.dishes[1]!.role, meal.meal).toBe("base");
    }
  });

  it("a shake is served, and the protein wave is on the day", () => {
    const served = plan.meals.flatMap((m) => m.dishes.map((d) => DISH_BY_ID.get(d.dishId)!));
    expect(served.some((d) => d.category === "shake")).toBe(true);
    expect(served.some((d) => PROTEIN_WAVE_DISH_IDS.has(d.id))).toBe(true);
  });

  it("the kitchen relaxation is named, never silent", () => {
    /* Brief v4 (Slice 1): named as the kitchen-relaxed reason; the
       note is reasons.ts's derived detail for it. */
    expect(plan.reasons?.some((r) => r.kind === "kitchen-relaxed")).toBe(true);
    expect(plan.notes.some((n) => n.includes("leave almost no real dishes"))).toBe(true);
  });

  it("the day lands on its guide", () => {
    const totals = plan.meals.reduce(
      (a, m) => ({
        kcal:
          a.kcal +
          m.dishes.reduce((x, d) => x + d.nutrients.kcal, 0) +
          m.suggestions.reduce((x, s) => x + s.nutrients.kcal, 0),
        proteinG:
          a.proteinG +
          m.dishes.reduce((x, d) => x + d.nutrients.proteinG, 0) +
          m.suggestions.reduce((x, s) => x + s.nutrients.proteinG, 0),
      }),
      { kcal: 0, proteinG: 0 },
    );
    expect(Math.abs(totals.kcal - 1350) / 1350).toBeLessThan(0.1);
    expect(totals.proteinG).toBeGreaterThanOrEqual(160);
  });
});

/* ------------------------------ D2 · servability --------------------------- */

describe("method 13 · the snack slot serves dishes (D2)", () => {
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

  it("the snack meal carries a real dish from the snack categories", () => {
    const plan = gen(plainOmnivore, "2026-11-19", 2200, 140);
    const snack = plan.meals.find((m) => m.meal === "snack")!;
    expect(snack.dishes.length).toBe(1);
    const dish = DISH_BY_ID.get(snack.dishes[0]!.dishId)!;
    expect(["shake", "snack", "breakfast"]).toContain(dish.category);
  });

  it("shakes are served across a week — at breakfast or snack", () => {
    const days = [
      "2026-11-16",
      "2026-11-17",
      "2026-11-18",
      "2026-11-19",
      "2026-11-20",
      "2026-11-21",
      "2026-11-22",
    ];
    const shakeDays = days.filter((day) =>
      gen(plainOmnivore, day, 2200, 140).meals.some((m) =>
        m.dishes.some((d) => DISH_BY_ID.get(d.dishId)?.category === "shake"),
      ),
    );
    expect(shakeDays.length).toBeGreaterThanOrEqual(1);
  });
});

/* --------------------------- F1 · budget preference ------------------------ */

describe("method 13 · the budget is a preference (F1)", () => {
  it("a budget that starves the pool widens — and the plan says so", () => {
    /* Vegan at tier 1 is the tightest budget cell in the library:
       measured, its in-budget pool falls below the dishPoolFor
       floor, so the pool widens to the full pattern pool and the
       widening is named. The contract pinned is the honest one:
       the note is present, and dishes above the tier may serve —
       never the old silent cut, never a silent widening either. */
    const veganTier1: HealthProfile = {
      ...emptyProfile("user-1", "2026-06-01T07:00:00Z"),
      ageYears: 30,
      sex: "female",
      height: observation(quantity(165, "cm"), PROVENANCE),
      weight: observation(quantity(65, "kg"), PROVENANCE),
      goal: "maintain",
      activity: "moderate",
      dietary: { ...EMPTY_DIETARY, pattern: "vegan", budgetTier: 1, mealsPerDay: 3 },
      constraints: {
        ...EMPTY_CONSTRAINTS,
        pregnantOrBreastfeeding: false,
        eatingDisorderHistory: false,
      },
    };
    const plan = gen(veganTier1, "2026-11-19", 2000, 120);
    /* Brief v4 (Slice 1): the widening is the budget-widened reason;
       its derived detail names the budget as a preference. */
    expect(plan.reasons?.some((r) => r.kind === "budget-widened")).toBe(true);
    expect(plan.notes.some((n) => n.includes("leaves too few main dishes"))).toBe(true);
    const served = plan.meals.flatMap((m) => m.dishes.map((d) => DISH_BY_ID.get(d.dishId)!));
    expect(served.some((d) => d.budgetTier > 1)).toBe(true);
  });
});

/* ------------------------------ D5 · framing ------------------------------- */

describe("method 13 · raw-basis framing (D5)", () => {
  it("a raw-basis food carries the dry framing; an as-eaten food does not", () => {
    const raw = USDA_REFERENCE_FOODS.find((f) => f.preparation?.state === "raw")!;
    expect(rawBasisFraming(raw)).toBe("dry — weighed before cooking");
    const asEaten = USDA_REFERENCE_FOODS.find((f) => f.preparation?.state === "as_purchased")!;
    expect(rawBasisFraming(asEaten)).toBeNull();
  });
});
