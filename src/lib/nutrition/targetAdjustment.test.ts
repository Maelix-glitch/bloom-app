// @vitest-environment jsdom
/**
 * The confirmed target adjustment — the one path by which an
 * expenditure estimate may move a target. Pinned here: the strict
 * parser, the shared apply rule (band-refusing, protein-untouched),
 * the storage round-trip through the real prefs document with its
 * export/erasure inheritance, and the plan engine applying the
 * delta inside the snapshot — reproducible, and stale by name when
 * it changes.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { buildExport } from "@/lib/data/exportAll";
import { eraseDevice } from "@/lib/data/erase";
import { loadDoc } from "@/lib/prefs";
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
import { targetsFor } from "@/lib/vitalis/calc/body";
import { DISH_LIBRARY } from "./data/dishLibrary";
import { generatePlan, planInputsSnapshotOf, planStaleness, type DailyPlan } from "./plan";
import {
  TARGET_ADJUSTMENT_KEY,
  adjustedTargets,
  clearTargetAdjustment,
  confirmTargetAdjustment,
  parseTargetAdjustment,
  readTargetAdjustment,
  type TargetAdjustment,
} from "./targetAdjustment";
import { USDA_REFERENCE_FOODS } from "./usdaReference";

const BASIS = {
  maintenanceKcal: 2867,
  engineTdeeKcal: 3100,
  loggedDays: 12,
  spanDays: 21,
  weightChangeKg: -1,
};
const ADJUSTMENT: Omit<TargetAdjustment, "version"> = {
  kcalDelta: -233,
  confirmedAt: "2026-11-18T05:00:00.000Z",
  basedOn: BASIS,
};

describe("parseTargetAdjustment", () => {
  it("accepts a well-formed adjustment", () => {
    expect(parseTargetAdjustment({ ...ADJUSTMENT, version: 1 })).toEqual({
      ...ADJUSTMENT,
      version: 1,
    });
  });

  it("refuses wrong versions, zero and oversized deltas, missing basis", () => {
    expect(parseTargetAdjustment({ ...ADJUSTMENT, version: 2 })).toBeNull();
    expect(parseTargetAdjustment({ ...ADJUSTMENT, version: 1, kcalDelta: 0 })).toBeNull();
    expect(parseTargetAdjustment({ ...ADJUSTMENT, version: 1, kcalDelta: 751 })).toBeNull();
    expect(parseTargetAdjustment({ ...ADJUSTMENT, version: 1, kcalDelta: -751 })).toBeNull();
    expect(parseTargetAdjustment({ kcalDelta: -233, confirmedAt: "x", version: 1 })).toBeNull();
    expect(parseTargetAdjustment(null)).toBeNull();
    expect(parseTargetAdjustment("nope")).toBeNull();
  });
});

describe("adjustedTargets — the shared apply rule", () => {
  it("shifts energy only; protein is never adjusted", () => {
    expect(adjustedTargets({ kcal: 3288, proteinG: 220 }, -233, "male")).toEqual({
      kcal: 3055,
      proteinG: 220,
    });
  });

  it("a zero delta is the targets themselves", () => {
    const targets = { kcal: 3288, proteinG: 220 };
    expect(adjustedTargets(targets, 0, "male")).toBe(targets);
  });

  it("results outside the sane band are refused, never clamped", () => {
    expect(adjustedTargets({ kcal: 1000, proteinG: 100 }, -300, "male")).toBeNull();
    expect(adjustedTargets({ kcal: 5800, proteinG: 200 }, 300, "male")).toBeNull();
  });

  it("results below the person's own calorie floor are refused (M-219, F-01)", () => {
    /* The audit's worked case: a floor-bound person at 1,350 kcal
       (unspecified-sex floor) confirming −550 would land on 800 —
       inside the old band, under the floor. Refused. */
    expect(adjustedTargets({ kcal: 1350, proteinG: 112 }, -550, "unspecified")).toBeNull();
    /* Exactly at the floor is allowed; one kcal under is not. */
    expect(adjustedTargets({ kcal: 2000, proteinG: 100 }, -500, "male")).toEqual({
      kcal: 1500,
      proteinG: 100,
    });
    expect(adjustedTargets({ kcal: 2000, proteinG: 100 }, -501, "male")).toBeNull();
    expect(adjustedTargets({ kcal: 2000, proteinG: 100 }, -800, "female")).toEqual({
      kcal: 1200,
      proteinG: 100,
    });
  });
});

describe("storage — the real prefs document", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("confirm → read round-trips; clear removes", () => {
    expect(readTargetAdjustment()).toBeNull();
    expect(confirmTargetAdjustment(ADJUSTMENT)).toBe(true);
    expect(readTargetAdjustment()).toEqual({ ...ADJUSTMENT, version: 1 });
    clearTargetAdjustment();
    expect(readTargetAdjustment()).toBeNull();
  });

  it("an invalid adjustment is never written", () => {
    expect(confirmTargetAdjustment({ ...ADJUSTMENT, kcalDelta: 900 })).toBe(false);
    expect(readTargetAdjustment()).toBeNull();
  });

  it("rides in the export bundle's prefs, verbatim", () => {
    confirmTargetAdjustment(ADJUSTMENT);
    const bundle = buildExport({ exportedAt: "2026-11-18T06:00:00.000Z", prefs: loadDoc() });
    const prefs = bundle.prefs as Record<string, { value: unknown }>;
    expect(prefs[TARGET_ADJUSTMENT_KEY]?.value).toEqual({ ...ADJUSTMENT, version: 1 });
  });

  it("the device erase removes the document that holds it", () => {
    confirmTargetAdjustment(ADJUSTMENT);
    eraseDevice();
    expect(loadDoc()[TARGET_ADJUSTMENT_KEY]).toBeUndefined();
    expect(readTargetAdjustment()).toBeNull();
  });
});

/* ------------------------- the engine applies it ------------------------- */

const NOW = "2026-11-18T03:00:00.000Z";
const PROVENANCE = { source: "user_reported", recordedAt: "2026-06-01T07:00:00Z" } as const;

/** The owner's shape (as planLearning.test.ts): eggetarian, 100 kg,
 *  gain. Since M-219 the plan's targets come from the gated engine
 *  alone (the body-profile fallback this fixture once rode is
 *  retired): male, 178 cm, 100 kg, moderate, gain at 0.25 kg/wk →
 *  BMR 1,968, TDEE 3,050, +275 surplus = 3,325 kcal; protein dosed
 *  on the healthy-ceiling reference weight (72.6 kg × 1.6) = 116 g. */
const ENGINE_TARGETS = { kcal: 3325, proteinG: 116 };

function ownerProfile(): HealthProfile {
  return {
    ...emptyProfile("user-1", "2026-06-01T07:00:00Z"),
    ageYears: 30,
    sex: "male",
    height: observation(quantity(178, "cm"), PROVENANCE),
    weight: observation(quantity(100, "kg"), PROVENANCE),
    goal: "gain",
    activity: "moderate",
    rateKgPerWeek: 0.25,
    dietary: { ...EMPTY_DIETARY, pattern: "eggetarian", mealsPerDay: 3, budgetTier: null },
    constraints: {
      ...EMPTY_CONSTRAINTS,
      pregnantOrBreastfeeding: false,
      eatingDisorderHistory: false,
    },
  };
}

function gen(targetAdjustmentKcal?: number): DailyPlan {
  const profile = ownerProfile();
  const safety = classifySafety(toSafetyInput(profile));
  const outcome = generatePlan({
    profile,
    safety,
    gatedOutcome: targetsFor(profile, safety, "2026-11-18"),
    foods: USDA_REFERENCE_FOODS,
    dishes: DISH_LIBRARY,
    ...(targetAdjustmentKcal !== undefined ? { targetAdjustmentKcal } : {}),
    day: "2026-11-18",
    now: NOW,
    id: "plan-adj",
  });
  if (!outcome.ok) throw new Error(`plan refused: ${JSON.stringify(outcome.refusal)}`);
  return outcome.plan;
}

describe("generatePlan with a confirmed adjustment", () => {
  it("the delta lands inside the targets and the inputs snapshot", () => {
    const plan = gen(-233);
    expect(plan.targets).toEqual({ kcal: 3092, proteinG: 116 });
    expect(plan.inputs.targetsKcal).toBe(3092);
    expect(plan.inputs.targetsProteinG).toBe(116);
  });

  it("confirming one makes the unadjusted plan stale by name: your targets", () => {
    const plan = gen();
    const profile = ownerProfile();
    const safety = classifySafety(toSafetyInput(profile));
    const adjusted = gen(-233);
    expect(planStaleness(plan, adjusted.inputs).changed).toContain("your targets");
    /* And the snapshot the adjusted plan carries is exactly the one
       the same stored inputs reproduce. */
    expect(planInputsSnapshotOf(profile, safety, { kcal: 3092, proteinG: 116 })).toEqual(
      adjusted.inputs,
    );
  });

  it("an out-of-band result leaves the engine's targets standing", () => {
    /* 3,325 − 2,600 would land under the band: refused, not clamped.
       (The stored delta can never be this large — the parser caps it
       at 750 — but the engine's apply rule refuses regardless.) */
    expect(gen(-2600).targets).toEqual(ENGINE_TARGETS);
  });

  it("a result below the calorie floor leaves the engine's targets standing (M-219, F-01)", () => {
    /* The male floor is 1,500: a −1,900 delta would land at 1,425 —
       inside the old 800–6,000 band, under the floor. Refused. */
    expect(gen(-1900).targets).toEqual(ENGINE_TARGETS);
  });
});
