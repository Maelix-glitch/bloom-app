/**
 * Water target — single source (Brief v7 WATER slice; owner directive
 * 2026-11-20: the target is auto-set and synced between Nutrition and
 * Trackers).
 *
 * The one guide: `bodyTargetsOf` in lib/health/body.ts — the function the
 * plan composer itself consults (directly as usePlan's fallback input,
 * and wrapped by `targetsFor` for the gated outcome). These tests pin
 * that the resolver Trackers read returns THAT figure, and that a plan
 * composed the way usePlan composes it carries the identical number in
 * its hydration schedule. Same source, not same-looking.
 */
import { describe, expect, it } from "vitest";

import { bodyTargetsOf, DEFAULT_BODY, type BodyProfile } from "@/lib/health/body";
import {
  EMPTY_ANSWERS,
  EMPTY_ASSESSMENT_STATE,
  toHealthProfile,
  type AssessmentState,
} from "@/lib/assessment/state";
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
import { targetsFor, toLegacyBodyProfile } from "@/lib/vitalis/calc/body";
import { DISH_LIBRARY } from "@/lib/nutrition/data/dishLibrary";
import { generatePlan } from "@/lib/nutrition/plan";
import { USDA_REFERENCE_FOODS } from "@/lib/nutrition/usdaReference";

import { DEFAULT_GOALS } from "./core";
import { goalsWithWaterTarget, planWaterTargetMlOf, waterTargetMlOf } from "./waterTarget";

const DAY = "2026-11-19";
const NOW = "2026-11-19T03:00:00.000Z";
const PROVENANCE = { source: "user_reported", recordedAt: "2026-06-01T07:00:00Z" } as const;

/** 80 kg, 178 cm, male, 30, moderate — the planDayStart fixture person. */
function fullProfile(): HealthProfile {
  return {
    ...emptyProfile("user-1", "2026-06-01T07:00:00Z"),
    ageYears: 30,
    sex: "male",
    height: observation(quantity(178, "cm"), PROVENANCE),
    weight: observation(quantity(80, "kg"), PROVENANCE),
    goal: "maintain",
    activity: "moderate",
    rateKgPerWeek: 0,
    dietary: { ...EMPTY_DIETARY, pattern: "omnivore", mealsPerDay: 3 },
    constraints: { ...EMPTY_CONSTRAINTS, pregnantOrBreastfeeding: false, eatingDisorderHistory: false },
  };
}

describe("waterTargetMlOf — the resolver reads the plan's own guide", () => {
  it("returns bodyTargetsOf's waterMl for a complete profile", () => {
    const legacy = toLegacyBodyProfile(fullProfile());
    expect(legacy).not.toBeNull();
    const targets = bodyTargetsOf(legacy!, DAY);
    expect(targets).not.toBeNull();
    /* M-219 (audit F-07): the drinking-water basis — male base
       1,900 + 300 (moderate) = 2,200. The old pin (80 kg × 35 +
       500 = 3,300) was the total-water formula the audit retired. */
    expect(targets!.waterMl).toBe(2200);
    expect(waterTargetMlOf(legacy!, DAY)).toBe(2200);
  });

  it("is null when the body profile cannot produce targets", () => {
    expect(bodyTargetsOf(DEFAULT_BODY, DAY)).toBeNull();
    expect(waterTargetMlOf(DEFAULT_BODY, DAY)).toBeNull();
  });

  it("equals the hydration target of a plan composed the way usePlan composes it", () => {
    const profile = fullProfile();
    const legacy = toLegacyBodyProfile(profile)!;
    const guide = waterTargetMlOf(legacy, DAY);
    expect(guide).not.toBeNull();

    const safety = classifySafety(toSafetyInput(profile));
    const outcome = generatePlan({
      profile,
      safety,
      gatedOutcome: targetsFor(profile, safety, DAY),
      fallbackTargets: null,
      foods: USDA_REFERENCE_FOODS,
      dishes: DISH_LIBRARY,
      /* usePlan's own wiring: the body profile's water target rides along. */
      waterMl: bodyTargetsOf(legacy, DAY)?.waterMl ?? null,
      day: DAY,
      now: NOW,
      id: "plan-water-sync",
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.plan.hydration).toBeDefined();
    expect(outcome.plan.hydration!.targetMl).toBe(guide);
  });
});

/* The Assessment-only account (live failure, PR #210 sweep): the plan
 * resolves its targets from the Assessment; Trackers must resolve the
 * water target from that SAME assembled profile. */
const ASSESSMENT_COMPLETE: AssessmentState = {
  version: 1,
  status: "complete",
  step: "summary",
  answers: {
    ...EMPTY_ANSWERS,
    ageYears: 30,
    heightCm: 175,
    weightKg: 82,
    sex: "female",
    goal: "lose",
    activity: "light",
    pregnantOrBreastfeeding: false,
    eatingDisorderHistory: false,
    unexplainedWeightChange: false,
  },
  consents: [],
  startedAt: "2026-11-15T03:00:00.000Z",
  completedAt: "2026-11-15T03:05:00.000Z",
  updatedAt: "2026-11-15T03:05:00.000Z",
};

/* 80 kg · 178 cm · 30 · male · moderate → body-guide water 2,200 ml (M-219 basis). */
const BODY_PROFILE: BodyProfile = {
  units: "metric",
  heightCm: 178,
  weightKg: 80,
  targetWeightKg: null,
  age: 30,
  sex: "male",
  activity: "moderate",
  goal: "maintain",
  rateKgPerWeek: 0.5,
  updatedAt: "2026-06-01T07:00:00.000Z",
};

describe("planWaterTargetMlOf — the plan's own resolution, shared", () => {
  it("resolves from the Assessment alone (no body pref) and equals the composed plan's hydration target", () => {
    const resolved = planWaterTargetMlOf({
      assessmentState: ASSESSMENT_COMPLETE,
      bodyProfile: DEFAULT_BODY,
      today: DAY,
    });
    /* M-219 (audit F-07): female drinking base 1,500 + 150 (light)
       = 1,650. The old pin (82 kg × 35 + 250 = 3,100) was the
       retired total-water formula. */
    expect(resolved).toBe(1650);

    const profile = toHealthProfile(ASSESSMENT_COMPLETE, "local");
    const safety = classifySafety(toSafetyInput(profile));
    const outcome = generatePlan({
      profile,
      safety,
      gatedOutcome: targetsFor(profile, safety, DAY),
      fallbackTargets: null,
      foods: USDA_REFERENCE_FOODS,
      dishes: DISH_LIBRARY,
      waterMl: null,
      day: DAY,
      now: NOW,
      id: "plan-water-assessment-only",
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.plan.hydration!.targetMl).toBe(resolved);
  });

  it("when both sources exist and differ, the Assessment (gated) figure stands — the plan's order", () => {
    /* Assessment guide: 1,650. Body-pref guide: 2,200. The plan's
       targets come from the gated outcome, so its water does too. */
    expect(
      planWaterTargetMlOf({
        assessmentState: ASSESSMENT_COMPLETE,
        bodyProfile: BODY_PROFILE,
        today: DAY,
      }),
    ).toBe(1650);
  });

  it("a body-pref-only account keeps the body guide's figure", () => {
    expect(
      planWaterTargetMlOf({
        assessmentState: EMPTY_ASSESSMENT_STATE,
        bodyProfile: BODY_PROFILE,
        today: DAY,
      }),
    ).toBe(2200);
  });

  it("is null when neither source can produce a figure", () => {
    expect(
      planWaterTargetMlOf({
        assessmentState: EMPTY_ASSESSMENT_STATE,
        bodyProfile: DEFAULT_BODY,
        today: DAY,
      }),
    ).toBeNull();
  });
});

describe("goalsWithWaterTarget", () => {
  it("replaces only the water goal", () => {
    const next = goalsWithWaterTarget({ ...DEFAULT_GOALS }, 3300);
    expect(next.waterMl).toBe(3300);
    expect(next.sleepMinutes).toBe(DEFAULT_GOALS.sleepMinutes);
    expect(next.studyMinutes).toBe(DEFAULT_GOALS.studyMinutes);
    expect(next.movementMinutes).toBe(DEFAULT_GOALS.movementMinutes);
    expect(next.energy).toBe(DEFAULT_GOALS.energy);
    expect(next.screenMinutes).toBe(DEFAULT_GOALS.screenMinutes);
  });

  it("leaves the goals untouched when there is no guide value", () => {
    const goals = { ...DEFAULT_GOALS, waterMl: 1800 };
    expect(goalsWithWaterTarget(goals, null)).toEqual(goals);
  });
});
