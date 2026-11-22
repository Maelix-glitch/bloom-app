/**
 * M-219 — the engine evidence-audit fixes, pinned.
 *
 * Each describe is one audit finding (F-01…F-12). Every pin here
 * fails on the pre-fix code: the audit's report
 * (~/workspace/your_files/bloom-engine-evidence-audit.md) carries
 * the measurements these pins now hold shut. The owner's own
 * stored shape (19, 165 cm, 95 kg, lose, sedentary, stored pace
 * 1 kg/wk, target 60 kg, sex unstated) is the F-05/F-06/F-07
 * fixture because his trace is the one the audit re-derived.
 */
import { describe, expect, it } from "vitest";

import { CONDITION_OPTIONS, RATE_OPTIONS } from "@/lib/assessment/questions";
import { EMPTY_ANSWERS, parseAnswers } from "@/lib/assessment/state";
import { bodyTargetsOf, parseBodyProfile, type BodyProfile } from "@/lib/health/body";
import { autoModesForConditions, BLOOD_SUGAR_CARB_LIMIT_G, effectiveModes } from "@/lib/modes/modes";
import { targetsFor } from "@/lib/vitalis/calc/body";
import {
  EMPTY_CONSTRAINTS,
  EMPTY_DIETARY,
  emptyProfile,
  toSafetyInput,
  type HealthProfile,
} from "@/lib/vitalis/domain/profile";
import { observation } from "@/lib/vitalis/domain/provenance";
import { quantity } from "@/lib/vitalis/domain/units";
import { classifySafety } from "@/lib/vitalis/safety/classify";
import { CAUTION_CONDITIONS, MAX_RATE_KG_PER_WEEK as SAFETY_MAX_RATE } from "@/lib/vitalis/domain/safety";

import {
  allergensForTerm,
  declaredAllergens,
  foodAllergenState,
  foodExcludedByAllergens,
} from "./allergens";
import { DISH_LIBRARY } from "./data/dishLibrary";
import { dishNutrients } from "./dishes";
import { completeLoggedDayTotals, loggedDayTotals } from "./loggedDays";
import { spectrumForDay } from "./dayView";
import { generatePlan, eligiblePool, type DailyPlan } from "./plan";
import { planAdaptationFor } from "./planAdaptation";
import { adjustedTargets } from "./targetAdjustment";
import { assertPlausibleTargets } from "./targets";
import type { Food, LogEntry } from "./types";
import { USDA_REFERENCE_FOODS } from "./usdaReference";

const PROVENANCE = { source: "user_reported", recordedAt: "2026-06-01T07:00:00Z" } as const;
const DAY = "2026-11-22";

function profileWith(over: Partial<HealthProfile>): HealthProfile {
  return {
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
    ...over,
  };
}

/** The owner's stored shape, as the audit traced it. */
function ownerProfile(): HealthProfile {
  return profileWith({
    ageYears: 19,
    sex: "unspecified",
    height: observation(quantity(165, "cm"), PROVENANCE),
    weight: observation(quantity(95, "kg"), PROVENANCE),
    targetWeight: observation(quantity(60, "kg"), PROVENANCE),
    goal: "lose",
    activity: "sedentary",
    rateKgPerWeek: 1,
    dietary: { ...EMPTY_DIETARY, pattern: "omnivore", mealsPerDay: 3, budgetTier: 3 },
  });
}

function ownerTargets() {
  const profile = ownerProfile();
  const safety = classifySafety(toSafetyInput(profile));
  const outcome = targetsFor(profile, safety, DAY);
  if (!outcome.ok) throw new Error("owner gated outcome refused");
  return outcome.targets;
}

const foodByName = (prefix: string): Food => {
  const food = USDA_REFERENCE_FOODS.find((f) => f.name.startsWith(prefix));
  if (!food) throw new Error(`no USDA food named ${prefix}`);
  return food;
};

let seq = 0;
function entry(day: string, meal: LogEntry["meal"], kcal: number, proteinG: number): LogEntry {
  seq += 1;
  return {
    id: `g-${seq}`,
    day,
    meal,
    foodId: null,
    snapshot: null,
    name: "logged",
    amount: { grams: 100 },
    nutrients: { kcal, proteinG, carbsG: 0, fatG: 0 },
    provenance: { kind: "user_entered", sourceId: "guard-fixture", label: "Your value" },
    source: "search",
    createdAt: `${day}T12:00:00.000Z`,
  };
}

/* ---------------------------------- F-01 ---------------------------------- */

describe("F-01 · confirmed adjustments pass the same calorie floor", () => {
  it("a −700 kcal adjustment to a 2,000 kcal target is refused (it lands under the 1,350 floor)", () => {
    /* Pre-fix the only check was an 800–6,000 band: 1,300 kcal was
       confirmable. The floor for unstated sex is 1,350. */
    expect(adjustedTargets({ kcal: 2000, proteinG: 100 }, -700, "unspecified")).toBeNull();
  });

  it("an adjustment landing exactly on the floor stands", () => {
    expect(adjustedTargets({ kcal: 2000, proteinG: 100 }, -650, "unspecified")).toEqual({
      kcal: 1350,
      proteinG: 100,
    });
  });

  it("the female floor (1,200) binds the same way", () => {
    expect(adjustedTargets({ kcal: 1500, proteinG: 90 }, -400, "female")).toBeNull();
    expect(adjustedTargets({ kcal: 1500, proteinG: 90 }, -300, "female")?.kcal).toBe(1200);
  });

  it("the audit's case: the owner's floor-bound 1,350 cannot be adjusted to 800", () => {
    expect(adjustedTargets({ kcal: 1350, proteinG: 112 }, -550, "unspecified")).toBeNull();
  });
});

/* ---------------------------------- F-02 ---------------------------------- */

describe("F-02 · unanswered safety questions fail closed", () => {
  it("generatePlan refuses — the absence refusal names the safety answers, and no fallback rescues it", () => {
    const profile = profileWith({
      constraints: {
        ...EMPTY_CONSTRAINTS,
        pregnantOrBreastfeeding: null,
        eatingDisorderHistory: null,
      },
    });
    const safety = classifySafety(toSafetyInput(profile));
    const outcome = generatePlan({
      profile,
      safety,
      gatedOutcome: targetsFor(profile, safety, DAY),
      foods: USDA_REFERENCE_FOODS,
      dishes: DISH_LIBRARY,
      day: DAY,
      now: `${DAY}T03:00:00.000Z`,
      id: "guard-f02",
    });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      /* Absence-only block → the insufficient-data refusal (an
         information gap, named as one). Pre-fix this call RETURNED
         A PLAN built on body-profile fallback targets. */
      expect(outcome.refusal.kind).toBe("insufficient_data");
      if (outcome.refusal.kind === "insufficient_data") {
        expect(outcome.refusal.missing).toContain("your safety answers in the Assessment");
      }
    }
  });

  it("a substantive safety answer refuses as safety_blocked", () => {
    const profile = profileWith({
      constraints: {
        ...EMPTY_CONSTRAINTS,
        pregnantOrBreastfeeding: false,
        eatingDisorderHistory: true,
      },
    });
    const safety = classifySafety(toSafetyInput(profile));
    const outcome = generatePlan({
      profile,
      safety,
      gatedOutcome: targetsFor(profile, safety, DAY),
      foods: USDA_REFERENCE_FOODS,
      dishes: DISH_LIBRARY,
      day: DAY,
      now: `${DAY}T03:00:00.000Z`,
      id: "guard-f02-substantive",
    });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.refusal.kind).toBe("safety_blocked");
  });

  it("the legacy body-profile store no longer accepts a 13–17 age", () => {
    expect(parseBodyProfile({ age: 15 })?.age).toBeNull();
    expect(parseBodyProfile({ age: 17 })?.age).toBeNull();
    expect(parseBodyProfile({ age: 18 })?.age).toBe(18);
  });
});

/* ---------------------------------- F-03 ---------------------------------- */

describe("F-03 · an underweight target endpoint is gated", () => {
  it("the classifier blocks a lose goal whose target BMI is under 18.5", () => {
    const profile = profileWith({
      goal: "lose",
      /* 45 kg at 165 cm → BMI 16.5. */
      targetWeight: observation(quantity(45, "kg"), PROVENANCE),
      height: observation(quantity(165, "cm"), PROVENANCE),
      weight: observation(quantity(70, "kg"), PROVENANCE),
    });
    const result = classifySafety(toSafetyInput(profile));
    const finding = result.findings.find((f) => f.ruleId === "underweight_target");
    expect(finding).toBeDefined();
    expect(finding?.blocking).toBe(true);
    expect(result.classification).toBe("professional_review_required");
  });

  it("the body-target maths projects no countdown to an underweight endpoint", () => {
    const body: BodyProfile = {
      units: "metric",
      sex: "female",
      age: 30,
      heightCm: 165,
      weightKg: 70,
      targetWeightKg: 45,
      goal: "lose",
      activity: "sedentary",
      rateKgPerWeek: 0.5,
      updatedAt: "",
    };
    expect(bodyTargetsOf(body).weeksToGoal).toBeNull();
  });
});

/* ---------------------------------- F-04 ---------------------------------- */

describe("F-04 · the fastest offered pace is the guideline cap", () => {
  it("the cap is 0.75 kg/week in both engines", () => {
    expect(SAFETY_MAX_RATE).toBe(0.75);
  });

  it("the Assessment offers no pace above the cap", () => {
    const values = RATE_OPTIONS.map((o) => o.value);
    expect(Math.max(...values)).toBe(0.75);
    expect(values).not.toContain(1);
  });

  it("a stored 1 kg/week pace parses as the cap, not as 1", () => {
    expect(parseAnswers({ ...EMPTY_ANSWERS, rateKgPerWeek: 1 }).rateKgPerWeek).toBe(0.75);
  });
});

/* ------------------------------- F-05 + F-06 ------------------------------- */

describe("F-05 · protein is dosed on the reference weight, and plausibility is wired", () => {
  it("the owner's gated targets are 1,350 kcal / 112 g — and plausible", () => {
    const targets = ownerTargets();
    expect(targets.calorieTargetKcal).toBe(1350);
    /* 62.3 kg healthy-ceiling reference × 1.8 — not 95 kg × 1.8 = 171. */
    expect(targets.proteinG).toBe(112);
    expect(targets.targetsPlausible).toBe(true);
  });

  it("the old pair (1,350 kcal / 171 g) is exactly what the plausibility check rejects", () => {
    expect(assertPlausibleTargets({ kcal: 1350, proteinG: 171 })).toBe(false);
    expect(assertPlausibleTargets({ kcal: 1350, proteinG: 112 })).toBe(true);
  });
});

describe("F-06 · the goal timeline uses the effective, floor-bound deficit", () => {
  it("the owner is told ~47 weeks, not the 35 his requested pace implied", () => {
    /* 35 kg at the delivered −820 kcal/day: 35 × 7,700 / 820 / 7 ≈ 47. */
    expect(ownerTargets().weeksToGoal).toBe(47);
  });
});

/* ---------------------------------- F-07 ---------------------------------- */

describe("F-07 · water is a drinking figure, not a total-water schedule", () => {
  it("the owner's water target is the 1,700 ml unstated-sex drinking base (sedentary)", () => {
    /* Pre-fix: 95 kg × 35 ml = 3,325 → 3,350 ml of DRINKING water,
       above EFSA's 2.5 L total-water AI for men before food. */
    expect(ownerTargets().waterMl).toBe(1700);
  });
});

/* ---------------------------------- F-08 ---------------------------------- */

describe("F-08 · BMI bands are the Indian consensus bands", () => {
  it("the owner's healthy range tops out at the 22.9 ceiling (62.3 kg at 165 cm)", () => {
    expect(ownerTargets().healthyWeightKg).toEqual({ min: 50.4, max: 62.3 });
  });

  it("BMI 23–24.9 reads overweight, not healthy", () => {
    const body: BodyProfile = {
      units: "metric",
      sex: "male",
      age: 30,
      heightCm: 170,
      weightKg: 69.4 /* BMI 24.0 */,
      targetWeightKg: null,
      goal: "maintain",
      activity: "sedentary",
      rateKgPerWeek: 0.5,
      updatedAt: "",
    };
    expect(bodyTargetsOf(body).bmiBand).toBe("overweight");
  });
});

/* ---------------------------------- F-09 ---------------------------------- */

describe("F-09 · Spectrum references are the ICMR-NIN RDA 2020 values", () => {
  it("magnesium is the RDA (440 men / 370 women), not the EAR (370 / 310)", () => {
    expect(spectrumForDay([], "male").find((r) => r.key === "magnesiumMg")?.reference).toBe(440);
    expect(spectrumForDay([], "female").find((r) => r.key === "magnesiumMg")?.reference).toBe(370);
  });

  it("vitamin C is sex-specific (80 men / 65 women)", () => {
    expect(spectrumForDay([], "male").find((r) => r.key === "vitaminCMg")?.reference).toBe(80);
    expect(spectrumForDay([], "female").find((r) => r.key === "vitaminCMg")?.reference).toBe(65);
  });
});

/* ---------------------------------- F-10 ---------------------------------- */

describe("F-10 · allergen protection is structural and fails closed", () => {
  it("a generic 'nuts' declaration maps to tree nut + peanut", () => {
    const declared = declaredAllergens(["nuts"]);
    expect(declared.structured.has("tree_nut")).toBe(true);
    expect(declared.structured.has("peanut")).toBe(true);
    expect(declared.unmappedTerms).toEqual([]);
  });

  it("'groundnut' is peanut — the substring era missed it entirely", () => {
    expect(allergensForTerm("groundnut")).toEqual(["peanut"]);
  });

  it("almonds and cashews are excluded by a 'nuts' declaration", () => {
    const { structured } = declaredAllergens(["nuts"]);
    expect(foodExcludedByAllergens(foodByName("Nuts, almonds"), structured)).toBe(true);
    expect(foodExcludedByAllergens(foodByName("Nuts, cashew"), structured)).toBe(true);
    expect(foodExcludedByAllergens(foodByName("Peanuts"), structured)).toBe(true);
  });

  it("whole-token matching: buckwheat is not wheat", () => {
    const { structured } = declaredAllergens(["gluten"]);
    const buckwheat = USDA_REFERENCE_FOODS.find((f) => f.name.startsWith("Buckwheat"));
    expect(buckwheat).toBeDefined();
    expect(foodExcludedByAllergens(buckwheat!, structured)).toBe(false);
  });

  it("an unverifiable food fails closed while a structured allergen is declared", () => {
    const userFood: Food = {
      id: "user-mystery",
      name: "Mystery bar",
      per100g: { kcal: 400, proteinG: 10, carbsG: 40, fatG: 20 },
      servings: [],
      provenance: { kind: "user_entered", sourceId: "user-mystery", label: "Your value" },
    };
    expect(foodAllergenState(userFood).kind).toBe("unverified");
    expect(foodExcludedByAllergens(userFood, new Set(["peanut"]))).toBe(true);
    /* With nothing declared, nothing is excluded. */
    expect(foodExcludedByAllergens(userFood, new Set())).toBe(false);
  });

  it("the eligible pool drops nut foods for a 'nuts' declaration and keeps plain foods", () => {
    const profile = profileWith({
      dietary: { ...EMPTY_DIETARY, pattern: "omnivore", mealsPerDay: 3, allergies: ["nuts"] },
    });
    const pool = eligiblePool(profile, USDA_REFERENCE_FOODS);
    const names = pool.map((f) => f.name);
    expect(names.some((n) => n.startsWith("Nuts, almonds"))).toBe(false);
    expect(names.some((n) => n.startsWith("Nuts, cashew"))).toBe(false);
    expect(names.some((n) => n.startsWith("Rice"))).toBe(true);
  });
});

/* ---------------------------------- F-11 ---------------------------------- */

describe("F-11 · adaptation reads complete logged days only", () => {
  /* The M-153 shape: two days, one lunch entry each, averaging
     23 g protein — fragmentary logging that used to steer the plan. */
  const fragmentary: LogEntry[] = [
    entry("2026-11-20", "lunch", 900, 25),
    entry("2026-11-21", "lunch", 850, 21),
  ];

  it("fragmentary days are logged days, but not complete days", () => {
    expect(loggedDayTotals(fragmentary).size).toBe(2);
    expect(completeLoggedDayTotals(fragmentary).size).toBe(0);
  });

  it("a day split across two meals is complete, totals preserved", () => {
    const split: LogEntry[] = [
      entry("2026-11-20", "lunch", 500, 30),
      entry("2026-11-20", "dinner", 400, 20),
    ];
    const complete = completeLoggedDayTotals(split);
    expect(complete.size).toBe(1);
    expect(complete.get("2026-11-20")?.proteinG).toBe(50);
  });

  it("the M-153 log produces no adaptation", () => {
    expect(planAdaptationFor(fragmentary, DAY, { kcal: 1350, proteinG: 112 })).toBeNull();
  });
});

/* ---------------------------------- F-12 ---------------------------------- */

describe("F-12 · common conditions are structured, cautionary, and mode-linked", () => {
  it("the Assessment offers the four caution conditions", () => {
    const values = CONDITION_OPTIONS.map((o) => o.value);
    for (const code of CAUTION_CONDITIONS) expect(values).toContain(code);
    expect(CAUTION_CONDITIONS).toEqual([
      "type_2_diabetes",
      "pcos",
      "thyroid_disorder",
      "hypertension",
    ]);
  });

  it("condition answers auto-enable their Modes; PCOS honestly has none", () => {
    expect(autoModesForConditions(["type_2_diabetes"])).toEqual(["blood_sugar"]);
    expect(autoModesForConditions(["hypertension"])).toEqual(["blood_pressure"]);
    expect(autoModesForConditions(["thyroid_disorder"])).toEqual(["thyroid"]);
    expect(autoModesForConditions(["pcos"])).toEqual([]);
    expect(effectiveModes([], ["type_2_diabetes"])).toContain("blood_sugar");
  });

  it("a type-2-diabetes plan serves no dish over the blood-sugar carb limit — with no Mode ever toggled", () => {
    const profile = profileWith({
      constraints: {
        ...EMPTY_CONSTRAINTS,
        pregnantOrBreastfeeding: false,
        eatingDisorderHistory: false,
        conditions: ["type_2_diabetes"],
      },
    });
    const safety = classifySafety(toSafetyInput(profile));
    const outcome = generatePlan({
      profile,
      safety,
      gatedOutcome: targetsFor(profile, safety, DAY),
      foods: USDA_REFERENCE_FOODS,
      dishes: DISH_LIBRARY,
      activeModes: effectiveModes([], profile.constraints.conditions),
      day: DAY,
      now: `${DAY}T03:00:00.000Z`,
      id: "guard-f12",
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const plan: DailyPlan = outcome.plan;
    expect(plan.meals.length).toBeGreaterThan(0);
    for (const meal of plan.meals) {
      for (const served of meal.dishes) {
        const dish = DISH_LIBRARY.find((d) => d.id === served.dishId)!;
        const perServing = dishNutrients(dish).nutrients.carbsG;
        expect(perServing, `${dish.id} in ${meal.meal}`).toBeLessThanOrEqual(
          BLOOD_SUGAR_CARB_LIMIT_G,
        );
      }
    }
    /* The limit bites somewhere in the library, so the pin is not
       vacuous: dishes over it exist and were available to pick. */
    expect(
      DISH_LIBRARY.some((d) => dishNutrients(d).nutrients.carbsG > BLOOD_SUGAR_CARB_LIMIT_G),
    ).toBe(true);
  });
});
