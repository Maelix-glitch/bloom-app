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
import {
  generatePlan,
  parsePlanValue,
  planPatternOf,
  planStaleness,
  planValueOf,
  patternAllowsClassification,
  PLAN_METHOD_VERSION,
  type DailyPlan,
  type PlanSuggestion,
} from "./plan";
import type { Food, FoodClassification, FoodGroup } from "./types";
import { USDA_REFERENCE_FOODS } from "./usdaReference";

/**
 * P2 acceptance: the layered, patterned, capped composer. The P1 suite
 * (plan.test.ts) pins targets, splits, refusals and storage; this file
 * pins composition — patterns as ingredient filters, layers, portion
 * caps, day floors, rotation, dominance, and the method-version
 * staleness reason.
 */

const NOW = "2026-11-15T03:00:00.000Z";
const DAY = "2026-11-15";
const PROVENANCE = { source: "user_reported", recordedAt: "2026-06-01T07:00:00Z" } as const;

function fullProfile(pattern: DietaryPattern | null, mealsPerDay = 3): HealthProfile {
  return {
    ...emptyProfile("user-1", "2026-06-01T07:00:00Z"),
    ageYears: 30,
    sex: "male",
    height: observation(quantity(178, "cm"), PROVENANCE),
    weight: observation(quantity(80, "kg"), PROVENANCE),
    goal: "maintain",
    activity: "moderate",
    rateKgPerWeek: 0,
    dietary: { ...EMPTY_DIETARY, pattern, mealsPerDay },
    constraints: {
      ...EMPTY_CONSTRAINTS,
      pregnantOrBreastfeeding: false,
      eatingDisorderHistory: false,
    },
  };
}

/** The owner's shape: safety questions unanswered (absence-only block),
 *  so targets come from the Trackers body-profile fallback. */
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
  opts: { day?: string; foods?: readonly Food[]; fallbackTargets?: { kcal: number; proteinG: number } } = {},
): DailyPlan {
  const day = opts.day ?? DAY;
  const safety = classifySafety(toSafetyInput(profile));
  const outcome = generatePlan({
    profile,
    safety,
    gatedOutcome: targetsFor(profile, safety, day),
    fallbackTargets: opts.fallbackTargets ?? null,
    foods: opts.foods ?? USDA_REFERENCE_FOODS,
    day,
    now: NOW,
    id: "plan-p2",
  });
  if (!outcome.ok) throw new Error(`plan refused: ${JSON.stringify(outcome.refusal)}`);
  return outcome.plan;
}

const BY_ID = new Map(USDA_REFERENCE_FOODS.map((f) => [f.id, f]));
const clsOf = (s: PlanSuggestion): FoodClassification | undefined => BY_ID.get(s.foodId)?.classification;
const groupOf = (s: PlanSuggestion): FoodGroup | undefined => clsOf(s)?.group;
const allSuggestions = (plan: DailyPlan): PlanSuggestion[] => plan.meals.flatMap((m) => m.suggestions);

/* ------------------------------ pattern table ------------------------------ */

const CLS = {
  egg: { group: "eggs", containsEgg: true, containsDairy: false, isFlesh: false, isFish: false },
  dairy: { group: "dairy", containsEgg: false, containsDairy: true, isFlesh: false, isFish: false },
  ghee: { group: "fats_oils", containsEgg: false, containsDairy: true, isFlesh: false, isFish: false },
  meat: { group: "other", containsEgg: false, containsDairy: false, isFlesh: true, isFish: false },
  fish: { group: "other", containsEgg: false, containsDairy: false, isFlesh: true, isFish: true },
  vegetable: { group: "vegetables", containsEgg: false, containsDairy: false, isFlesh: false, isFish: false },
} satisfies Record<string, FoodClassification>;

describe("plan · dietary patterns", () => {
  it("maps the app's stated patterns onto plan patterns", () => {
    expect(planPatternOf("vegetarian")).toBe("vegetarian");
    expect(planPatternOf("eggetarian")).toBe("eggetarian");
    expect(planPatternOf("vegan")).toBe("vegan");
    expect(planPatternOf("pescatarian")).toBe("pescatarian");
    expect(planPatternOf("omnivore")).toBe("non_vegetarian");
    expect(planPatternOf("other")).toBeNull();
    expect(planPatternOf(null)).toBeNull();
  });

  it("judges patterns on ingredients, never on veg/non-veg labels", () => {
    /* Egg: the eggetarian's protein — FSSAI classes it non-veg, so a
       label filter would wrongly exclude it. */
    expect(patternAllowsClassification("eggetarian", CLS.egg)).toBe(true);
    expect(patternAllowsClassification("vegetarian", CLS.egg)).toBe(false);
    expect(patternAllowsClassification("vegan", CLS.egg)).toBe(false);
    expect(patternAllowsClassification("ovo_vegetarian", CLS.egg)).toBe(true);
    /* Dairy: lacto patterns allow it, vegan and ovo do not — ghee is
       dairy by ingredient whatever group it sits in. */
    expect(patternAllowsClassification("vegetarian", CLS.dairy)).toBe(true);
    expect(patternAllowsClassification("eggetarian", CLS.ghee)).toBe(true);
    expect(patternAllowsClassification("vegan", CLS.ghee)).toBe(false);
    expect(patternAllowsClassification("ovo_vegetarian", CLS.dairy)).toBe(false);
    /* Flesh: only the unrestricted pattern allows meat; fish is the
       pescatarian's sole flesh exception. */
    expect(patternAllowsClassification("eggetarian", CLS.meat)).toBe(false);
    expect(patternAllowsClassification("pescatarian", CLS.meat)).toBe(false);
    expect(patternAllowsClassification("pescatarian", CLS.fish)).toBe(true);
    expect(patternAllowsClassification("non_vegetarian", CLS.meat)).toBe(true);
    /* Vegetables pass every pattern; no pattern means no filter. */
    for (const p of ["vegetarian", "eggetarian", "vegan", "ovo_vegetarian", "pescatarian", "non_vegetarian"] as const) {
      expect(patternAllowsClassification(p, CLS.vegetable)).toBe(true);
    }
    expect(patternAllowsClassification(null, CLS.meat)).toBe(true);
  });

  it("eggetarian plan contains eggs and NEVER flesh", () => {
    const plan = gen(fullProfile("eggetarian"));
    const suggestions = allSuggestions(plan);
    expect(suggestions.some((s) => clsOf(s)?.containsEgg)).toBe(true);
    expect(suggestions.some((s) => clsOf(s)?.isFlesh)).toBe(false);
  });

  it("vegetarian plan contains no egg and no flesh, but keeps dairy", () => {
    const plan = gen(fullProfile("vegetarian"));
    const suggestions = allSuggestions(plan);
    expect(suggestions.some((s) => clsOf(s)?.containsEgg)).toBe(false);
    expect(suggestions.some((s) => clsOf(s)?.isFlesh)).toBe(false);
    expect(suggestions.some((s) => clsOf(s)?.containsDairy)).toBe(true);
  });

  it("vegan plan contains no egg, no dairy and no flesh — and says so about the milk floor", () => {
    const plan = gen(fullProfile("vegan"));
    const suggestions = allSuggestions(plan);
    expect(suggestions.some((s) => clsOf(s)?.containsEgg)).toBe(false);
    expect(suggestions.some((s) => clsOf(s)?.containsDairy)).toBe(false);
    expect(suggestions.some((s) => clsOf(s)?.isFlesh)).toBe(false);
    /* The milk/curd floor is unreachable by pattern: the plan notes it
       honestly, and no meal note calls dairy "missing" — by pattern is
       not a data gap. */
    expect(plan.notes.some((n) => n.includes("milk and curd"))).toBe(true);
    expect(plan.meals.every((m) => !(m.note ?? "").includes("dairy"))).toBe(true);
  });

  it("pescatarian plan never suggests meat, and the unrestricted plan can suggest flesh", () => {
    const pesca = gen(fullProfile("pescatarian"));
    expect(allSuggestions(pesca).some((s) => clsOf(s)?.isFlesh && !clsOf(s)?.isFish)).toBe(false);
    const omni = ["2026-11-15", "2026-11-16", "2026-11-17"].map((day) =>
      gen(fullProfile("omnivore"), { day }),
    );
    expect(omni.flatMap(allSuggestions).some((s) => clsOf(s)?.isFlesh)).toBe(true);
  });
});

/* --------------------------------- layers ---------------------------------- */

describe("plan · layered composition", () => {
  it("every main meal carries base + protein + ≥2 vegetables + a finishing layer", () => {
    const plan = gen(fullProfile("eggetarian"));
    for (const meal of plan.meals) {
      const layers = meal.suggestions.map((s) => s.layer);
      expect(layers).toContain("base");
      expect(layers).toContain("protein");
      expect(layers.filter((l) => l === "vegetables").length).toBeGreaterThanOrEqual(2);
      expect(layers).toContain("finishing");
      expect(meal.suggestions.some((s) => s.layer === "finishing" && groupOf(s) === "fats_oils")).toBe(true);
      expect(meal.note).toBeNull();
    }
  });

  it("snacks are one or two snack-layered items from the snack groups", () => {
    const plan = gen(fullProfile("eggetarian", 4));
    const snack = plan.meals.find((m) => m.meal === "snack");
    expect(snack).toBeDefined();
    expect(snack!.suggestions.length).toBeGreaterThanOrEqual(1);
    expect(snack!.suggestions.length).toBeLessThanOrEqual(2);
    for (const s of snack!.suggestions) {
      expect(s.layer).toBe("snack");
      expect(["fruits", "nuts_seeds", "dairy", "eggs"]).toContain(groupOf(s));
    }
  });

  it("a thin pool leaves layers honestly empty, with the gap named", () => {
    const rice = USDA_REFERENCE_FOODS.find((f) => f.name.startsWith("Rice, brown"))!;
    const lentils = USDA_REFERENCE_FOODS.find((f) => f.name.startsWith("Lentils"))!;
    const plan = gen(fullProfile(null), { foods: [rice, lentils] });
    const breakfast = plan.meals[0]!;
    expect(breakfast.suggestions.some((s) => s.layer === "base")).toBe(true);
    expect(breakfast.suggestions.some((s) => s.layer === "protein")).toBe(true);
    expect(breakfast.note).toContain("Part of this meal is missing");
    expect(breakfast.note).toContain("vegetables");
    /* …and the day-level shortfalls are named too, as pool facts. */
    expect(plan.notes.some((n) => n.includes("reach 0 g of vegetables"))).toBe(true);
    expect(plan.notes.some((n) => n.includes("reach 0 g of fruit"))).toBe(true);
    expect(plan.notes.some((n) => n.includes("span 2 food groups"))).toBe(true);
  });
});

/* ---------------------------------- caps ----------------------------------- */

function expectCapsHold(plan: DailyPlan, targetProteinG: number) {
  for (const meal of plan.meals) {
    let vegTotal = 0;
    for (const s of meal.suggestions) {
      const group = groupOf(s);
      const food = BY_ID.get(s.foodId)!;
      if (group === "cereals_grains") expect(s.grams).toBeLessThanOrEqual(90);
      if (group === "pulses_legumes") expect(s.grams).toBeLessThanOrEqual(60);
      if (group === "eggs") expect(s.grams).toBeLessThanOrEqual(120);
      if (group === "vegetables") {
        expect(s.grams).toBeLessThanOrEqual(200);
        vegTotal += s.grams;
      }
      if (group === "fats_oils") expect(s.grams).toBeLessThanOrEqual(14);
      if (group === "fruits") expect(s.grams).toBeLessThanOrEqual(200);
      if (group === "nuts_seeds") expect(s.grams).toBeLessThanOrEqual(30);
      if (group === "dairy") {
        if (s.layer === "protein") {
          expect(s.grams).toBeLessThanOrEqual(food.per100g.kcal >= 350 ? 30 : 100);
        } else {
          expect(s.grams).toBeLessThanOrEqual(250);
        }
      }
      if (clsOf(s)?.isFlesh) expect(s.grams).toBeLessThanOrEqual(200);
      expect(s.grams % 5).toBe(0);
    }
    expect(vegTotal).toBeLessThanOrEqual(300);
  }
  /* Dominance: no single food over ~40% of the day's protein. */
  const proteinByFood = new Map<string, number>();
  for (const s of allSuggestions(plan)) {
    proteinByFood.set(s.foodId, (proteinByFood.get(s.foodId) ?? 0) + s.nutrients.proteinG);
  }
  for (const protein of proteinByFood.values()) {
    expect(protein).toBeLessThanOrEqual(0.4 * targetProteinG + 1);
  }
}

describe("plan · portion caps", () => {
  it("caps hold at ordinary targets", () => {
    expectCapsHold(gen(ownerProfile(), { fallbackTargets: { kcal: 3288, proteinG: 220 } }), 220);
  });

  it("caps hold under adversarial targets — huge numbers never break a cap", () => {
    const plan = gen(ownerProfile(), { fallbackTargets: { kcal: 9000, proteinG: 600 } });
    expectCapsHold(plan, 600);
    /* The unmet remainder is honest: suggestions do not pretend to
       reach a 9,000 kcal / 600 g day with capped whole foods. */
    const suggestedProtein = allSuggestions(plan).reduce((sum, s) => sum + s.nutrients.proteinG, 0);
    expect(suggestedProtein).toBeLessThan(600);
  });

  it("the dominance trim fires when one food would carry the day", () => {
    const rice = USDA_REFERENCE_FOODS.find((f) => f.name.startsWith("Rice, brown"))!;
    const soy = USDA_REFERENCE_FOODS.find((f) => f.name.startsWith("Soybeans"))!;
    const spinach = USDA_REFERENCE_FOODS.find((f) => f.name.startsWith("Spinach"))!;
    const oil = USDA_REFERENCE_FOODS.find((f) => f.name.startsWith("Oil, olive"))!;
    const milk = USDA_REFERENCE_FOODS.find((f) => f.name.startsWith("Milk, whole"))!;
    const plan = gen(ownerProfile(), {
      foods: [rice, soy, spinach, oil, milk],
      fallbackTargets: { kcal: 2400, proteinG: 120 },
    });
    const soyProtein = allSuggestions(plan)
      .filter((s) => s.foodId === soy.id)
      .reduce((sum, s) => sum + s.nutrients.proteinG, 0);
    expect(soyProtein).toBeGreaterThan(0);
    expect(soyProtein).toBeLessThanOrEqual(0.4 * 120 + 1);
  });
});

/* ------------------------------ floors & notes ----------------------------- */

describe("plan · day floors", () => {
  it("the owner's day reaches every floor — no shortfall notes", () => {
    const plan = gen(ownerProfile(), { fallbackTargets: { kcal: 3288, proteinG: 220 } });
    expect(plan.notes).toEqual([]);
    const veg = allSuggestions(plan)
      .filter((s) => groupOf(s) === "vegetables")
      .reduce((sum, s) => sum + s.grams, 0);
    expect(veg).toBeGreaterThanOrEqual(400);
    const fruit = allSuggestions(plan)
      .filter((s) => groupOf(s) === "fruits")
      .reduce((sum, s) => sum + s.grams, 0);
    expect(fruit).toBeGreaterThanOrEqual(100);
    const groups = new Set(allSuggestions(plan).map((s) => groupOf(s)));
    expect(groups.size).toBeGreaterThanOrEqual(8);
    const proteinSources = new Set(
      plan.meals.flatMap((m) =>
        m.suggestions.filter((s) => s.layer === "protein").map((s) => s.foodId),
      ),
    );
    expect(proteinSources.size).toBeGreaterThanOrEqual(3);
  });
});

/* --------------------------------- rotation -------------------------------- */

describe("plan · rotation", () => {
  it("the same day always composes the identical plan", () => {
    const a = gen(fullProfile("eggetarian"));
    const b = gen(fullProfile("eggetarian"));
    expect(JSON.stringify(a.meals)).toBe(JSON.stringify(b.meals));
  });

  it("consecutive days rotate the composition", () => {
    const a = gen(fullProfile("eggetarian"), { day: "2026-11-15" });
    const b = gen(fullProfile("eggetarian"), { day: "2026-11-16" });
    const ids = (p: DailyPlan) => allSuggestions(p).map((s) => s.foodId).join(",");
    expect(ids(a)).not.toBe(ids(b));
    const proteinOf = (p: DailyPlan) =>
      new Set(p.meals.flatMap((m) => m.suggestions.filter((s) => s.layer === "protein").map((s) => s.foodId)));
    expect(proteinOf(a)).not.toEqual(proteinOf(b));
  });
});

/* ----------------------------- method staleness ---------------------------- */

describe("plan · method version", () => {
  it("new plans carry the current method and are not stale", () => {
    const plan = gen(fullProfile("eggetarian"));
    expect(plan.methodVersion).toBe(PLAN_METHOD_VERSION);
    expect(planStaleness(plan, plan.inputs)).toEqual({ stale: false, changed: [] });
  });

  it("a P1-shaped stored plan reads stale with 'the plan method improved'", () => {
    const plan = gen(fullProfile("eggetarian"));
    const stored = JSON.parse(JSON.stringify(plan)) as Record<string, unknown>;
    delete stored["methodVersion"];
    delete stored["notes"];
    for (const meal of stored["meals"] as Array<Record<string, unknown>>) {
      for (const s of meal["suggestions"] as Array<Record<string, unknown>>) delete s["layer"];
    }
    const parsed = parsePlanValue({ version: 1, plan: stored });
    expect(parsed).not.toBeNull();
    expect(parsed!.methodVersion).toBe(1);
    expect(parsed!.notes).toEqual([]);
    const staleness = planStaleness(parsed!, parsed!.inputs);
    expect(staleness.stale).toBe(true);
    expect(staleness.changed).toContain("the plan method improved");
  });

  it("layers, notes and the method version survive a storage round-trip", () => {
    const plan = gen(fullProfile("eggetarian"));
    const parsed = parsePlanValue(JSON.parse(JSON.stringify(planValueOf(plan))));
    expect(parsed).toEqual(plan);
  });
});

/* ------------------------------ owner's day -------------------------------- */

describe("plan · the owner's day (worked example)", () => {
  it("gain · 3,288 kcal · 220 g protein · eggetarian — balanced layers, eggs in, flesh out", () => {
    const plan = gen(ownerProfile(), { fallbackTargets: { kcal: 3288, proteinG: 220 } });
    expect(plan.targetsSource).toBe("body_profile");
    expect(plan.targets).toEqual({ kcal: 3288, proteinG: 220 });
    const suggestions = allSuggestions(plan);
    expect(suggestions.some((s) => clsOf(s)?.containsEgg)).toBe(true);
    expect(suggestions.some((s) => clsOf(s)?.isFlesh)).toBe(false);
    for (const meal of plan.meals) {
      expect(meal.suggestions.some((s) => s.layer === "base")).toBe(true);
      expect(meal.suggestions.filter((s) => s.layer === "protein").length).toBeGreaterThanOrEqual(2);
      expect(meal.suggestions.filter((s) => s.layer === "vegetables").length).toBe(2);
    }
    expectCapsHold(plan, 220);
  });
});
