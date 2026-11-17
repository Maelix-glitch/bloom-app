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
    expect(adjustedTargets({ kcal: 3288, proteinG: 220 }, -233)).toEqual({
      kcal: 3055,
      proteinG: 220,
    });
  });

  it("a zero delta is the targets themselves", () => {
    const targets = { kcal: 3288, proteinG: 220 };
    expect(adjustedTargets(targets, 0)).toBe(targets);
  });

  it("results outside the sane band are refused, never clamped", () => {
    expect(adjustedTargets({ kcal: 1000, proteinG: 100 }, -300)).toBeNull();
    expect(adjustedTargets({ kcal: 5800, proteinG: 200 }, 300)).toBeNull();
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
 *  gain — targets from the body-profile fallback, 3,288 / 220. */
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
      pregnantOrBreastfeeding: null,
      eatingDisorderHistory: null,
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
    fallbackTargets: { kcal: 3288, proteinG: 220 },
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
    expect(plan.targets).toEqual({ kcal: 3055, proteinG: 220 });
    expect(plan.inputs.targetsKcal).toBe(3055);
    expect(plan.inputs.targetsProteinG).toBe(220);
  });

  it("confirming one makes the unadjusted plan stale by name: your targets", () => {
    const plan = gen();
    const profile = ownerProfile();
    const safety = classifySafety(toSafetyInput(profile));
    const adjusted = gen(-233);
    expect(planStaleness(plan, adjusted.inputs).changed).toContain("your targets");
    /* And the snapshot the adjusted plan carries is exactly the one
       the same stored inputs reproduce. */
    expect(planInputsSnapshotOf(profile, safety, { kcal: 3055, proteinG: 220 })).toEqual(
      adjusted.inputs,
    );
  });

  it("an out-of-band result leaves the engine's targets standing", () => {
    /* 3,288 − 2,600 would land under the floor: refused, not clamped.
       (The stored delta can never be this large — the parser caps it
       at 750 — but the engine's apply rule refuses regardless.) */
    expect(gen(-2600).targets).toEqual({ kcal: 3288, proteinG: 220 });
  });
});
