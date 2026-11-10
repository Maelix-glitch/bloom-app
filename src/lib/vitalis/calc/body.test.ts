import { describe, expect, it } from "vitest";

import { bodyTargetsOf } from "../../health/body";
import {
  bodyMassIndex,
  emptyProfile,
  toSafetyInput,
  type HealthProfile,
} from "../domain/profile";
import { EMPTY_CONSTRAINTS, EMPTY_DIETARY } from "../domain/profile";
import { observation } from "../domain/provenance";
import { classifySafety } from "../safety/classify";
import { quantity } from "../domain/units";
import {
  BODY_TARGETS_METHOD,
  BODY_TARGETS_METHOD_VERSION,
  isTargetReady,
  missingBodyFields,
  targetsFor,
  toLegacyBodyProfile,
} from "./body";

const PROVENANCE = { source: "user_reported", recordedAt: "2026-06-01T07:00:00Z" } as const;

function profile(overrides: Partial<HealthProfile> = {}): HealthProfile {
  return {
    ...emptyProfile("user-1", "2026-06-01T07:00:00Z"),
    ageYears: 30,
    sex: "female",
    height: observation(quantity(175, "cm"), PROVENANCE),
    weight: observation(quantity(82, "kg"), PROVENANCE),
    targetWeight: observation(quantity(70, "kg"), PROVENANCE),
    goal: "lose",
    activity: "light",
    rateKgPerWeek: 0.5,
    dietary: { ...EMPTY_DIETARY, pattern: "omnivore" },
    constraints: { ...EMPTY_CONSTRAINTS, pregnantOrBreastfeeding: false, eatingDisorderHistory: false },
    ...overrides,
  };
}

const safetyOf = (p: HealthProfile) => classifySafety(toSafetyInput(p));

describe("vitalis body adapter", () => {
  it("maps the Vitalis profile onto the legacy shape", () => {
    const legacy = toLegacyBodyProfile(profile({ activity: "very_active" }));
    expect(legacy).not.toBeNull();
    expect(legacy?.activity).toBe("very-active");
    expect(legacy?.heightCm).toBe(175);
    expect(legacy?.weightKg).toBe(82);
    expect(legacy?.goal).toBe("lose");
  });

  it("treats recomp and general health as maintenance, never as a deficit", () => {
    expect(toLegacyBodyProfile(profile({ goal: "recomp" }))?.goal).toBe("maintain");
    expect(toLegacyBodyProfile(profile({ goal: "general_health" }))?.goal).toBe("maintain");
  });

  it("uses the legacy BMI calculation, so the two cannot drift", () => {
    expect(bodyMassIndex(profile())).toBe(26.8);
  });

  it("returns no targets at all when safety blocks", () => {
    const blocked = profile({
      constraints: { ...EMPTY_CONSTRAINTS, eatingDisorderHistory: true },
    });
    const outcome = targetsFor(blocked, safetyOf(blocked), "2026-06-01");
    expect(outcome.ok).toBe(false);
    if (!outcome.ok && outcome.reason === "safety_blocked") {
      expect(outcome.classification).toBe("professional_review_required");
      expect(outcome.blockingFindings).toContain("eating_disorder_history");
    } else {
      throw new Error("expected a safety block");
    }
  });

  it("reports precisely which fields are missing", () => {
    const incomplete = profile({ height: null, activity: null });
    expect(missingBodyFields(incomplete)).toEqual(["height", "activity"]);
    expect(isTargetReady(incomplete)).toBe(false);
    const outcome = targetsFor(incomplete, safetyOf(incomplete), "2026-06-01");
    expect(outcome.ok).toBe(false);
    if (!outcome.ok && outcome.reason === "profile_incomplete") {
      expect(outcome.missing).toEqual(["height", "activity"]);
    } else {
      throw new Error("expected an incomplete profile");
    }
  });

  it("matches the legacy module field for field", () => {
    const p = profile();
    const outcome = targetsFor(p, safetyOf(p), "2026-06-01");
    if (!outcome.ok) throw new Error(`expected targets, got ${outcome.reason}`);
    const legacy = bodyTargetsOf(toLegacyBodyProfile(p)!, "2026-06-01")!;

    expect(outcome.targets.bmi).toBe(legacy.bmi);
    expect(outcome.targets.bmiBand).toBe(legacy.bmiBand);
    expect(outcome.targets.bmrKcal).toBe(legacy.bmr);
    expect(outcome.targets.tdeeKcal).toBe(legacy.tdee);
    expect(outcome.targets.calorieTargetKcal).toBe(legacy.calories);
    expect(outcome.targets.proteinG).toBe(legacy.proteinG);
    expect(outcome.targets.waterMl).toBe(legacy.waterMl);
    expect(outcome.targets.floorApplied).toBe(legacy.floorApplied);
    expect(outcome.targets.weeksToGoal).toBe(legacy.weeksToGoal);
    expect(outcome.targets.goalDate).toBe(legacy.goalDate);
  });

  it("clamps the requested pace and says that it did", () => {
    const fast = profile({ rateKgPerWeek: 1.6 });
    const outcome = targetsFor(fast, safetyOf(fast), "2026-06-01");
    if (!outcome.ok) throw new Error(`expected targets, got ${outcome.reason}`);
    expect(outcome.targets.rateKgPerWeek).toBe(1);
    expect(outcome.targets.rateClamped).toBe(true);

    const clamped = profile({ rateKgPerWeek: 1 });
    const reference = targetsFor(clamped, safetyOf(clamped), "2026-06-01");
    if (!reference.ok) throw new Error("expected reference targets");
    expect(outcome.targets.calorieTargetKcal).toBe(reference.targets.calorieTargetKcal);
  });

  it("labels its output as calculated, with a method and version", () => {
    const p = profile();
    const outcome = targetsFor(p, safetyOf(p), "2026-06-01");
    if (!outcome.ok) throw new Error("expected targets");
    expect(outcome.targets.provenance.source).toBe("calculated");
    expect(outcome.targets.provenance.method).toBe(BODY_TARGETS_METHOD);
    expect(outcome.targets.provenance.methodVersion).toBe(BODY_TARGETS_METHOD_VERSION);
  });
});
