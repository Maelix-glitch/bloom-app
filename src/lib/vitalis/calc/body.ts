/**
 * Adapter from the Vitalis profile to Bloom's existing body module.
 *
 * `src/lib/health/body.ts` stays the single implementation of BMI banding,
 * Mifflin–St Jeor BMR, the calorie floor and hydration sizing. This file only
 * translates: it never re-derives those numbers, so the two cannot disagree.
 *
 * Planning is gated on safety before any arithmetic happens. A blocked safety
 * state returns no targets at all, which is the whole point of classifying
 * before planning.
 */

import {
  bodyTargetsOf,
  type ActivityLevel as LegacyActivityLevel,
  type BmiBand,
  type BodyGoal,
  type BodyProfile,
} from "../../health/body";
import { assertPlausibleTargets } from "../../nutrition/targets";
import type { Provenance } from "../domain/provenance";
import {
  bodyMassIndex,
  clampRate,
  profileHeightCm,
  profileTargetWeightKg,
  profileWeightKg,
  type ActivityLevel,
  type HealthProfile,
  type VitalisGoal,
} from "../domain/profile";
import type { SafetyAssessment } from "../domain/safety";

export const BODY_TARGETS_METHOD = "bloom-body-targets";
/* 1.1.0 (P1): the engine gained a recomposition profile — maintenance
   energy at the 2.2 g/kg protein band. The other goals' numbers are
   unchanged from 1.0.0; the bump exists so a target computed before the
   profile existed is distinguishable from one computed after.
   1.2.0 (M-219, engine evidence audit): the pace cap fell to
   0.75 kg/wk; protein is dosed on the healthy-ceiling reference
   weight above BMI 23; hydration is a drinking-water share of EFSA's
   total-water AI instead of 35 ml/kg; BMI bands and the healthy
   range follow the Indian consensus (23 / 25 / 22.9); the timeline
   runs on the effective (floor-bound) rate. Every number a target
   carries can differ from 1.1.0 for the same profile. */
export const BODY_TARGETS_METHOD_VERSION = "1.2.0";

const LEGACY_ACTIVITY: Record<ActivityLevel, LegacyActivityLevel> = {
  sedentary: "sedentary",
  light: "light",
  moderate: "moderate",
  active: "active",
  very_active: "very-active",
};

/**
 * `general_health` has no legacy goal and maps to `maintain`, which is the
 * honest reading: no deficit, no surplus. `recomp` has its own legacy goal
 * since P1 — maintenance energy at the highest protein band (see
 * `bodyTargetsOf`), not maintenance values with a note.
 */
export function legacyGoal(goal: VitalisGoal | null): BodyGoal {
  if (goal === "lose" || goal === "gain" || goal === "maintain" || goal === "recomp") return goal;
  return "maintain";
}

export interface VitalisBodyTargets {
  readonly bmi: number;
  readonly bmiBand: BmiBand;
  readonly healthyWeightKg: { readonly min: number; readonly max: number };
  readonly bmrKcal: number;
  readonly tdeeKcal: number;
  readonly calorieTargetKcal: number;
  readonly calorieDelta: number;
  readonly floorApplied: boolean;
  readonly proteinG: number;
  readonly waterMl: number;
  readonly weeksToGoal: number | null;
  readonly goalDate: string | null;
  readonly targetWeightKg: number | null;
  /** The M-82 plausibility verdict on this pair (protein ≤ 35% of
   *  energy, kcal ≥ 1,200), computed by the ONE gate in
   *  nutrition/targets on every gated resolution (M-219, audit F-05:
   *  the gate existed since v4 but was called nowhere outside its own
   *  test, so implausible pairs shipped silently). It never rewrites
   *  the targets — it names them, so a surface can say so. */
  readonly targetsPlausible: boolean;
  /** The rate actually used, after clamping. */
  readonly rateKgPerWeek: number;
  readonly rateClamped: boolean;
  readonly provenance: Provenance;
}

export type BodyTargetsOutcome =
  | { readonly ok: true; readonly targets: VitalisBodyTargets }
  | {
      readonly ok: false;
      readonly reason: "safety_blocked";
      readonly classification: SafetyAssessment["classification"];
      readonly blockingFindings: readonly string[];
    }
  | { readonly ok: false; readonly reason: "profile_incomplete"; readonly missing: readonly string[] };

/** Translate to the legacy shape. Null when the measurements are not there yet. */
export function toLegacyBodyProfile(profile: HealthProfile): BodyProfile | null {
  const heightCm = profileHeightCm(profile);
  const weightKg = profileWeightKg(profile);
  if (heightCm === null || weightKg === null) return null;
  return {
    units: profile.units,
    heightCm,
    weightKg,
    targetWeightKg: profileTargetWeightKg(profile),
    age: profile.ageYears,
    sex: profile.sex,
    activity: profile.activity ? LEGACY_ACTIVITY[profile.activity] : "light",
    goal: legacyGoal(profile.goal),
    rateKgPerWeek: clampRate(profile.rateKgPerWeek),
    updatedAt: profile.updatedAt,
  };
}

export function missingBodyFields(profile: HealthProfile): string[] {
  const missing: string[] = [];
  if (profile.ageYears === null) missing.push("ageYears");
  if (profileHeightCm(profile) === null) missing.push("height");
  if (profileWeightKg(profile) === null) missing.push("weight");
  if (profile.activity === null) missing.push("activity");
  return missing;
}

/** True when the legacy module would be able to produce a target at all. */
export function isTargetReady(profile: HealthProfile): boolean {
  return missingBodyFields(profile).length === 0 && bodyMassIndex(profile) !== null;
}

export function targetsFor(
  profile: HealthProfile,
  safety: SafetyAssessment,
  today: string = new Date().toISOString().slice(0, 10),
): BodyTargetsOutcome {
  if (safety.blocking) {
    return {
      ok: false,
      reason: "safety_blocked",
      classification: safety.classification,
      blockingFindings: safety.findings.filter((finding) => finding.blocking).map((finding) => finding.ruleId),
    };
  }

  const missing = missingBodyFields(profile);
  const legacy = toLegacyBodyProfile(profile);
  if (missing.length > 0 || legacy === null) {
    return { ok: false, reason: "profile_incomplete", missing: missing.length > 0 ? missing : ["height", "weight"] };
  }

  const targets = bodyTargetsOf(legacy, today);
  if (targets === null) {
    return { ok: false, reason: "profile_incomplete", missing: ["height", "weight", "ageYears"] };
  }

  const usedRate = clampRate(profile.rateKgPerWeek);

  /* M-219 (audit F-05): the plausibility gate runs on EVERY gated
     resolution — the assert warns in the console exactly as designed,
     and the verdict rides the outcome so surfaces and tests can see
     it. Before this wiring the gate was dead code and the M-82 pair
     (1,350 kcal, 171 g protein, 50.7%E) shipped with no signal at
     all; the reference-weight dosing in bodyTargetsOf now keeps the
     pair inside the AMDR, and this call is what would catch a
     regression. */
  const targetsPlausible = assertPlausibleTargets({
    kcal: targets.calories,
    proteinG: targets.proteinG,
  });

  return {
    ok: true,
    targets: {
      bmi: targets.bmi,
      bmiBand: targets.bmiBand,
      healthyWeightKg: targets.healthyWeight,
      bmrKcal: targets.bmr,
      tdeeKcal: targets.tdee,
      calorieTargetKcal: targets.calories,
      calorieDelta: targets.calorieDelta,
      floorApplied: targets.floorApplied,
      proteinG: targets.proteinG,
      waterMl: targets.waterMl,
      weeksToGoal: targets.weeksToGoal,
      goalDate: targets.goalDate,
      targetWeightKg: targets.targetWeightKg,
      targetsPlausible,
      rateKgPerWeek: usedRate,
      rateClamped: profile.rateKgPerWeek !== usedRate,
      provenance: {
        source: "calculated",
        recordedAt: new Date().toISOString(),
        method: BODY_TARGETS_METHOD,
        methodVersion: BODY_TARGETS_METHOD_VERSION,
        note: "Mifflin–St Jeor estimate with Bloom's calorie floor applied.",
      },
    },
  };
}
