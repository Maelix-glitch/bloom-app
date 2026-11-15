import { beforeEach, describe, expect, it, vi } from "vitest";

const mockDoc = new Map<string, unknown>();

vi.mock("@/lib/prefs", () => ({
  getPref: (key: string, parse: (raw: unknown) => unknown, fallback: unknown) => {
    if (!mockDoc.has(key)) return fallback;
    const parsed = parse(mockDoc.get(key));
    return parsed === null ? fallback : parsed;
  },
  setPref: (key: string, value: unknown) => {
    mockDoc.set(key, value);
  },
  clearPref: (key: string) => {
    mockDoc.delete(key);
  },
}));

import { setPref } from "@/lib/prefs";
import {
  EMPTY_CONSTRAINTS,
  EMPTY_DIETARY,
  emptyProfile,
  profileWeightKg,
  toSafetyInput,
  type HealthProfile,
} from "@/lib/vitalis/domain/profile";
import { observation } from "@/lib/vitalis/domain/provenance";
import { quantity } from "@/lib/vitalis/domain/units";
import { classifySafety } from "@/lib/vitalis/safety/classify";
import { targetsFor } from "@/lib/vitalis/calc/body";
import { entryNutrientsFor, nutrientsForGrams } from "./math";
import { nutritionTargetsFromOutcome, type NutritionTargets } from "./targets";
import { USDA_REFERENCE_FOODS } from "./usdaReference";
import {
  PLAN_KEY,
  fingerprintOfInputs,
  generatePlan,
  mealSlotsFor,
  parsePlanValue,
  planInputsSnapshotOf,
  planStaleness,
  readPlan,
  splitTargets,
  writePlan,
  type PlanOutcome,
} from "./plan";
import type { Food } from "./types";

const DAY = "2026-11-15";
const NOW = "2026-11-15T03:00:00.000Z";
const PROVENANCE = { source: "user_reported", recordedAt: "2026-06-01T07:00:00Z" } as const;

function profile(overrides: Partial<HealthProfile> = {}): HealthProfile {
  return {
    ...emptyProfile("user-1", "2026-06-01T07:00:00Z"),
    ageYears: 30,
    sex: "female",
    height: observation(quantity(175, "cm"), PROVENANCE),
    weight: observation(quantity(82, "kg"), PROVENANCE),
    goal: "lose",
    activity: "light",
    rateKgPerWeek: 0.5,
    dietary: { ...EMPTY_DIETARY, pattern: "omnivore" },
    constraints: { ...EMPTY_CONSTRAINTS, pregnantOrBreastfeeding: false, eatingDisorderHistory: false },
    ...overrides,
  };
}

const userFood = (id: string, name: string, per100g: Food["per100g"]): Food => ({
  id,
  name,
  per100g,
  servings: [],
  provenance: { kind: "user_entered", sourceId: id, label: "Your value" },
});

const OATS = userFood("user-oats", "My oats mix", { kcal: 380, proteinG: 13, carbsG: 60, fatG: 7 });
const CHICKEN = userFood("user-chicken", "Chicken breast, home", {
  kcal: 165,
  proteinG: 31,
  carbsG: 0,
  fatG: 3.6,
});
const POOL: readonly Food[] = [OATS, CHICKEN, ...USDA_REFERENCE_FOODS];

function generate(
  p: HealthProfile,
  overrides: { fallbackTargets?: NutritionTargets | null; foods?: readonly Food[] } = {},
): PlanOutcome {
  const safety = classifySafety(toSafetyInput(p));
  return generatePlan({
    profile: p,
    safety,
    gatedOutcome: targetsFor(p, safety, DAY),
    fallbackTargets: overrides.fallbackTargets ?? null,
    foods: overrides.foods ?? POOL,
    day: DAY,
    now: NOW,
    id: "plan-test",
  });
}

function expectPlan(outcome: PlanOutcome) {
  if (!outcome.ok) throw new Error(`expected a plan, got refusal ${outcome.refusal.kind}`);
  return outcome.plan;
}

beforeEach(() => {
  mockDoc.clear();
});

/* ------------------------------ golden cases ------------------------------ */

describe("plan · golden cases per goal", () => {
  /* Fixture: female, 30, 175 cm, 82 kg, light activity.
     BMR 1603, TDEE 2204 (the body engine's own numbers). */
  const cases = [
    { goal: "lose", kcal: 2204 - 550, proteinG: Math.round(82 * 1.8), profile: "lose" },
    { goal: "gain", kcal: 2204 + 550, proteinG: Math.round(82 * 1.6), profile: "gain" },
    { goal: "maintain", kcal: 2204, proteinG: Math.round(82 * 1.4), profile: "maintain" },
    { goal: "recomp", kcal: 2204, proteinG: Math.round(82 * 2.2), profile: "recomp" },
    { goal: "general_health", kcal: 2204, proteinG: Math.round(82 * 1.4), profile: "maintain" },
  ] as const;

  for (const c of cases) {
    it(`builds the ${c.goal} plan on the engine's targets`, () => {
      const p = profile({ goal: c.goal });
      const plan = expectPlan(generate(p));
      expect(plan.goal).toBe(c.goal);
      expect(plan.goalProfile).toBe(c.profile);
      expect(plan.targets).toEqual({ kcal: c.kcal, proteinG: c.proteinG });
      expect(plan.targetsSource).toBe("assessment");
      /* The plan's targets ARE the gated engine's, not a recomputation. */
      const safety = classifySafety(toSafetyInput(p));
      expect(plan.targets).toEqual(
        nutritionTargetsFromOutcome(targetsFor(p, safety, DAY)),
      );
      /* Splits reconcile exactly. */
      expect(plan.meals.reduce((s, m) => s + m.kcal, 0)).toBe(c.kcal);
      expect(plan.meals.reduce((s, m) => s + Math.round(m.proteinG * 10), 0)).toBe(
        Math.round(c.proteinG * 10),
      );
    });
  }

  it("gives recomposition the highest protein target of the four goals", () => {
    const protein = (goal: HealthProfile["goal"]) =>
      expectPlan(generate(profile({ goal }))).targets.proteinG;
    const recomp = protein("recomp");
    expect(recomp).toBeGreaterThan(protein("lose"));
    expect(recomp).toBeGreaterThan(protein("gain"));
    expect(recomp).toBeGreaterThan(protein("maintain"));
    /* …at maintenance energy, identical to the maintain plan's kcal. */
    expect(expectPlan(generate(profile({ goal: "recomp" }))).targets.kcal).toBe(
      expectPlan(generate(profile({ goal: "maintain" }))).targets.kcal,
    );
  });

  it("prefers the gated targets when both paths could answer", () => {
    const plan = expectPlan(
      generate(profile(), { fallbackTargets: { kcal: 1111, proteinG: 99 } }),
    );
    expect(plan.targetsSource).toBe("assessment");
    expect(plan.targets.kcal).not.toBe(1111);
  });
});

/* ------------------------------ meal splits ------------------------------- */

describe("plan · meal splits reconcile exactly", () => {
  it("picks slots by meal count, mains first", () => {
    expect(mealSlotsFor(null)).toEqual(["breakfast", "lunch", "dinner", "snack"]);
    expect(mealSlotsFor(1)).toEqual(["lunch"]);
    expect(mealSlotsFor(2)).toEqual(["lunch", "dinner"]);
    expect(mealSlotsFor(3)).toEqual(["breakfast", "lunch", "dinner"]);
    expect(mealSlotsFor(4)).toEqual(["breakfast", "lunch", "dinner", "snack"]);
    expect(mealSlotsFor(9)).toEqual(["breakfast", "lunch", "dinner", "snack"]);
  });

  it("sums exactly across odd targets and every meal count", () => {
    const targetsList: NutritionTargets[] = [
      { kcal: 2137, proteinG: 151 },
      { kcal: 2204, proteinG: 137.3 },
      { kcal: 999, proteinG: 88.8 },
      { kcal: 4500, proteinG: 300 },
      { kcal: 1200, proteinG: 60 },
      { kcal: 3, proteinG: 0.4 },
    ];
    for (const targets of targetsList) {
      for (const mealsPerDay of [null, 1, 2, 3, 4, 5, 8]) {
        const slots = mealSlotsFor(mealsPerDay);
        const splits = splitTargets(targets, slots);
        expect(splits.reduce((s, m) => s + m.kcal, 0)).toBe(Math.round(targets.kcal));
        expect(splits.reduce((s, m) => s + Math.round(m.proteinG * 10), 0)).toBe(
          Math.round(targets.proteinG * 10),
        );
        for (const split of splits) {
          expect(split.kcal).toBeGreaterThanOrEqual(0);
          expect(split.proteinG).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });
});

/* ------------------------------ suggestions ------------------------------- */

describe("plan · suggestions", () => {
  it("computes every suggestion with the engine's own portion math", () => {
    const plan = expectPlan(generate(profile()));
    const byId = new Map(POOL.map((f) => [f.id, f]));
    let seen = 0;
    for (const meal of plan.meals) {
      for (const suggestion of meal.suggestions) {
        seen += 1;
        const food = byId.get(suggestion.foodId)!;
        expect(suggestion.nutrients).toEqual(nutrientsForGrams(food.per100g, suggestion.grams));
        expect(suggestion.nutrients).toEqual(entryNutrientsFor(food, { grams: suggestion.grams }));
        expect(suggestion.grams % 5).toBe(0);
        expect(suggestion.grams).toBeGreaterThanOrEqual(25);
        expect(suggestion.grams).toBeLessThanOrEqual(500);
        expect(suggestion.provenance).toEqual(food.provenance);
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it("is deterministic — same inputs, same plan", () => {
    const a = generate(profile());
    const b = generate(profile());
    expect(a).toEqual(b);
  });

  it("never suggests a food the person ruled out by name", () => {
    const peanutButter = userFood("user-pb", "Peanut butter, home jar", {
      kcal: 588,
      proteinG: 25,
      carbsG: 20,
      fatG: 50,
    });
    const p = profile({
      dietary: {
        ...EMPTY_DIETARY,
        pattern: "omnivore",
        allergies: ["peanut"],
        dislikedFoods: ["rice"],
      },
    });
    const plan = expectPlan(generate(p, { foods: [peanutButter, OATS, CHICKEN, ...USDA_REFERENCE_FOODS] }));
    for (const meal of plan.meals) {
      for (const suggestion of meal.suggestions) {
        expect(suggestion.name.toLowerCase()).not.toContain("peanut");
        expect(suggestion.name.toLowerCase()).not.toContain("rice");
      }
    }
  });

  it("never suggests data Bloom may not use — IFCT and OFF stay out", () => {
    const perfectFit: Food = {
      id: "ifct-perfect",
      name: "Perfect fit food",
      per100g: { kcal: 200, proteinG: 20, carbsG: 20, fatG: 5 },
      servings: [],
      provenance: { kind: "ifct", sourceId: "0001", label: "ICMR-NIN IFCT" },
    };
    const offFood: Food = {
      ...perfectFit,
      id: "off-perfect",
      provenance: { kind: "off", sourceId: "123", label: "Open Food Facts" },
    };
    const plan = expectPlan(generate(profile(), { foods: [perfectFit, offFood] }));
    for (const meal of plan.meals) {
      expect(meal.suggestions).toEqual([]);
      expect(meal.note).not.toBeNull();
    }
  });

  it("leaves a meal honestly empty when no clean food exists at all", () => {
    const plan = expectPlan(generate(profile(), { foods: [] }));
    expect(plan.meals.length).toBeGreaterThan(0);
    for (const meal of plan.meals) {
      expect(meal.suggestions).toEqual([]);
      expect(meal.note).toContain("No food with known values");
    }
    /* The plan itself — targets and splits — still stands. */
    expect(plan.meals.reduce((s, m) => s + m.kcal, 0)).toBe(plan.targets.kcal);
  });
});

/* --------------------------------- refusals ------------------------------- */

describe("plan · safety refusals are complete", () => {
  const substantive: { name: string; overrides: Partial<HealthProfile>; rule: string }[] = [
    {
      name: "pregnancy",
      overrides: {
        constraints: { ...EMPTY_CONSTRAINTS, pregnantOrBreastfeeding: true, eatingDisorderHistory: false },
      },
      rule: "pregnancy",
    },
    {
      name: "eating-disorder history",
      overrides: {
        constraints: { ...EMPTY_CONSTRAINTS, pregnantOrBreastfeeding: false, eatingDisorderHistory: true },
      },
      rule: "eating_disorder_history",
    },
    {
      name: "an urgent symptom",
      overrides: {
        constraints: {
          ...EMPTY_CONSTRAINTS,
          pregnantOrBreastfeeding: false,
          eatingDisorderHistory: false,
          symptoms: ["chest_pain"],
        },
      },
      rule: "urgent_symptom",
    },
    {
      name: "a high-risk condition (type 1 diabetes)",
      overrides: {
        constraints: {
          ...EMPTY_CONSTRAINTS,
          pregnantOrBreastfeeding: false,
          eatingDisorderHistory: false,
          conditions: ["type_1_diabetes"],
        },
      },
      rule: "high_risk_condition",
    },
    {
      name: "a high-risk condition (chronic kidney disease)",
      overrides: {
        constraints: {
          ...EMPTY_CONSTRAINTS,
          pregnantOrBreastfeeding: false,
          eatingDisorderHistory: false,
          conditions: ["chronic_kidney_disease"],
        },
      },
      rule: "high_risk_condition",
    },
    {
      name: "unexplained weight change",
      overrides: {
        constraints: {
          ...EMPTY_CONSTRAINTS,
          pregnantOrBreastfeeding: false,
          eatingDisorderHistory: false,
          unexplainedWeightChange: true,
        },
      },
      rule: "unexplained_weight_change",
    },
    { name: "under 18", overrides: { ageYears: 17 }, rule: "adult_only" },
    {
      name: "severe underweight",
      overrides: { weight: observation(quantity(45, "kg"), PROVENANCE), goal: "maintain" },
      rule: "severe_underweight",
    },
    {
      name: "underweight with a loss goal",
      overrides: { weight: observation(quantity(52, "kg"), PROVENANCE), goal: "lose" },
      rule: "underweight_loss_goal",
    },
  ];

  for (const c of substantive) {
    it(`refuses for ${c.name} — and no fallback can override it`, () => {
      const outcome = generate(profile(c.overrides), {
        fallbackTargets: { kcal: 2000, proteinG: 120 },
      });
      expect(outcome.ok).toBe(false);
      if (outcome.ok) return;
      expect(outcome.refusal.kind).toBe("safety_blocked");
      if (outcome.refusal.kind !== "safety_blocked") return;
      expect(outcome.refusal.findings.map((f) => f.ruleId)).toContain(c.rule);
      expect(outcome.refusal.findings.length).toBeGreaterThan(0);
      for (const finding of outcome.refusal.findings) {
        expect(finding.summary.length).toBeGreaterThan(0);
      }
    });
  }

  it("marks urgent escalation as requiring professional review", () => {
    const outcome = generate(
      profile({
        constraints: {
          ...EMPTY_CONSTRAINTS,
          pregnantOrBreastfeeding: false,
          eatingDisorderHistory: false,
          symptoms: ["fainting"],
        },
      }),
    );
    expect(outcome.ok).toBe(false);
    if (outcome.ok || outcome.refusal.kind !== "safety_blocked") return;
    expect(outcome.refusal.classification).toBe("urgent_escalation");
    expect(outcome.refusal.requiresProfessionalReview).toBe(true);
  });

  it("carries non-blocking cautions into the plan instead of refusing", () => {
    const plan = expectPlan(
      generate(
        profile({
          constraints: {
            ...EMPTY_CONSTRAINTS,
            pregnantOrBreastfeeding: false,
            eatingDisorderHistory: false,
            medications: ["metformin"],
          },
        }),
      ),
    );
    expect(plan.safetyClassification).toBe("caution");
    expect(plan.cautions.some((c) => c.toLowerCase().includes("medication"))).toBe(true);
  });
});

describe("plan · absence and insufficiency", () => {
  const unansweredSafety = {
    constraints: { ...EMPTY_CONSTRAINTS, pregnantOrBreastfeeding: null, eatingDisorderHistory: null },
  };

  it("falls back to body-profile targets on an absence-only block, like the tab", () => {
    const plan = expectPlan(
      generate(profile(unansweredSafety), { fallbackTargets: { kcal: 2000, proteinG: 120 } }),
    );
    expect(plan.targetsSource).toBe("body_profile");
    expect(plan.targets).toEqual({ kcal: 2000, proteinG: 120 });
  });

  it("names the unanswered safety questions when no fallback exists either", () => {
    const outcome = generate(profile(unansweredSafety));
    expect(outcome.ok).toBe(false);
    if (outcome.ok || outcome.refusal.kind !== "insufficient_data") return;
    expect(outcome.refusal.missing).toContain("your safety answers in the Assessment");
  });

  it("names a missing goal — a fallback target cannot substitute for one", () => {
    const outcome = generate(profile({ goal: null }), {
      fallbackTargets: { kcal: 2000, proteinG: 120 },
    });
    expect(outcome.ok).toBe(false);
    if (outcome.ok || outcome.refusal.kind !== "insufficient_data") return;
    expect(outcome.refusal.missing).toContain("your goal");
  });

  it("names each missing body input", () => {
    const outcome = generate(profile({ ageYears: null, height: null, activity: null }));
    expect(outcome.ok).toBe(false);
    if (outcome.ok || outcome.refusal.kind !== "insufficient_data") return;
    expect(outcome.refusal.missing).toEqual(
      expect.arrayContaining(["your age", "your height", "your activity level"]),
    );
  });
});

/* -------------------------------- staleness ------------------------------- */

describe("plan · staleness", () => {
  it("is not stale when nothing changed", () => {
    const p = profile();
    const plan = expectPlan(generate(p));
    const safety = classifySafety(toSafetyInput(p));
    const current = planInputsSnapshotOf(p, safety, plan.targets);
    expect(planStaleness(plan, current)).toEqual({ stale: false, changed: [] });
    expect(plan.fingerprint).toBe(fingerprintOfInputs(plan.inputs));
  });

  it("names a changed goal and a changed weight", () => {
    const plan = expectPlan(generate(profile()));
    const heavier = profile({
      goal: "maintain",
      weight: observation(quantity(85, "kg"), PROVENANCE),
    });
    const safety = classifySafety(toSafetyInput(heavier));
    const outcome = targetsFor(heavier, safety, DAY);
    if (!outcome.ok) throw new Error("expected targets");
    const current = planInputsSnapshotOf(
      heavier,
      safety,
      nutritionTargetsFromOutcome(outcome)!,
    );
    const staleness = planStaleness(plan, current);
    expect(staleness.stale).toBe(true);
    expect(staleness.changed).toContain("your goal");
    expect(staleness.changed).toContain("your weight");
    expect(staleness.changed).toContain("your targets");
    expect(profileWeightKg(heavier)).toBe(85);
  });
});

/* ------------------------------ storage ----------------------------------- */

describe("plan · storage", () => {
  it("round-trips a generated plan through the prefs document", () => {
    const plan = expectPlan(generate(profile()));
    writePlan(plan);
    expect(mockDoc.has(PLAN_KEY)).toBe(true);
    expect(readPlan()).toEqual(plan);
  });

  it("refuses a wrong envelope and garbage", () => {
    expect(parsePlanValue(null)).toBeNull();
    expect(parsePlanValue("garbage")).toBeNull();
    expect(parsePlanValue({ version: 99, plan: {} })).toBeNull();
    expect(parsePlanValue({ version: 1, plan: null })).toBeNull();
  });

  it("refuses a plan whose fingerprint no longer matches its inputs", () => {
    const plan = expectPlan(generate(profile()));
    writePlan(plan);
    const stored = mockDoc.get(PLAN_KEY) as { version: number; plan: Record<string, unknown> };
    const tamperedInputs = {
      ...(stored.plan["inputs"] as Record<string, unknown>),
      weightKg: 120,
    };
    setPref(PLAN_KEY, { version: 1, plan: { ...stored.plan, inputs: tamperedInputs } });
    expect(readPlan()).toBeNull();
  });

  it("refuses a plan whose meals no longer sum to its targets", () => {
    const plan = expectPlan(generate(profile()));
    writePlan(plan);
    const stored = mockDoc.get(PLAN_KEY) as { version: number; plan: Record<string, unknown> };
    const meals = stored.plan["meals"] as Record<string, unknown>[];
    const tamperedMeals = meals.map((m, i) => (i === 0 ? { ...m, kcal: (m["kcal"] as number) + 5 } : m));
    setPref(PLAN_KEY, { version: 1, plan: { ...stored.plan, meals: tamperedMeals } });
    expect(readPlan()).toBeNull();
  });

  it("refuses a plan relabelled with another goal's profile", () => {
    const plan = expectPlan(generate(profile({ goal: "recomp" })));
    writePlan(plan);
    const stored = mockDoc.get(PLAN_KEY) as { version: number; plan: Record<string, unknown> };
    setPref(PLAN_KEY, { version: 1, plan: { ...stored.plan, goalProfile: "maintain" } });
    expect(readPlan()).toBeNull();
  });

  it("drops a stored suggestion whose provenance Bloom may not plan with", () => {
    const plan = expectPlan(generate(profile()));
    writePlan(plan);
    const stored = mockDoc.get(PLAN_KEY) as { version: number; plan: Record<string, unknown> };
    const meals = stored.plan["meals"] as Record<string, unknown>[];
    const withIfct = meals.map((m, i) =>
      i === 0
        ? {
            ...m,
            suggestions: [
              {
                foodId: "ifct-x",
                name: "Injected",
                grams: 100,
                nutrients: { kcal: 200, proteinG: 10, carbsG: 20, fatG: 5 },
                provenance: { kind: "ifct", sourceId: "1", label: "ICMR-NIN IFCT" },
              },
            ],
          }
        : m,
    );
    setPref(PLAN_KEY, { version: 1, plan: { ...stored.plan, meals: withIfct } });
    const parsed = readPlan();
    expect(parsed).not.toBeNull();
    expect(parsed!.meals[0]!.suggestions).toEqual([]);
  });
});
