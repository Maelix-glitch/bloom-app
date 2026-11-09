/**
 * The personal health profile for Bloom Vitalis.
 *
 * This is the Vitalis domain model. It wraps — and does not replace — the
 * existing Bloom body profile in `src/lib/health/body.ts`: that module stays the
 * single place where BMI bands and the calorie floor are defined, and
 * `vitalis/calc/body.ts` adapts this profile to it.
 *
 * Two deliberate differences from the legacy model:
 *   • every measurement is an `Observation`, so provenance travels with it;
 *   • unanswered questions are `null`, distinct from a real "no" or "sedentary".
 */

import { convert, type Quantity, type Unit } from "./units";
import { bmiOf } from "../../health/body";
import type { Observation } from "./provenance";
import {
  MAX_RATE_KG_PER_WEEK,
  MIN_RATE_KG_PER_WEEK,
  type SafetyInput,
  type SafetyGoal,
  type UrgentSymptom,
} from "./safety";

export const HEALTH_PROFILE_VERSION = 1;

export type UnitSystem = "metric" | "imperial";
export type Sex = "female" | "male" | "unspecified";

/** Vitalis activity levels. `very_active` maps to legacy `very-active`. */
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";

export type VitalisGoal = SafetyGoal;

export const DIETARY_PATTERNS = [
  "omnivore",
  "vegetarian",
  "vegan",
  "eggetarian",
  "pescatarian",
  "other",
] as const;

export type DietaryPattern = (typeof DIETARY_PATTERNS)[number];

export interface DietaryProfile {
  /** Null means not answered yet. */
  readonly pattern: DietaryPattern | null;
  readonly allergies: readonly string[];
  readonly intolerances: readonly string[];
  readonly dislikedFoods: readonly string[];
  readonly cuisines: readonly string[];
  readonly mealsPerDay: number | null;
}

export interface HealthConstraints {
  /** Stable condition codes where known; free-text otherwise. */
  readonly conditions: readonly string[];
  readonly medications: readonly string[];
  readonly pregnantOrBreastfeeding: boolean | null;
  readonly eatingDisorderHistory: boolean | null;
  readonly unexplainedWeightChange: boolean | null;
  readonly symptoms: readonly UrgentSymptom[];
}

export interface HealthProfile {
  readonly userId: string;
  readonly version: typeof HEALTH_PROFILE_VERSION;
  readonly units: UnitSystem;
  readonly ageYears: number | null;
  readonly sex: Sex;
  /** Stored in a canonical unit (cm); the display unit comes from `units`. */
  readonly height: Observation<Quantity> | null;
  readonly weight: Observation<Quantity> | null;
  readonly waist: Observation<Quantity> | null;
  readonly targetWeight: Observation<Quantity> | null;
  /** Null until the person chooses. `general_health` is a real choice, not a default. */
  readonly goal: VitalisGoal | null;
  readonly activity: ActivityLevel | null;
  readonly rateKgPerWeek: number;
  readonly dietary: DietaryProfile;
  readonly constraints: HealthConstraints;
  readonly updatedAt: string;
}

export const EMPTY_DIETARY: DietaryProfile = {
  pattern: null,
  allergies: [],
  intolerances: [],
  dislikedFoods: [],
  cuisines: [],
  mealsPerDay: null,
};

export const EMPTY_CONSTRAINTS: HealthConstraints = {
  conditions: [],
  medications: [],
  pregnantOrBreastfeeding: null,
  eatingDisorderHistory: null,
  unexplainedWeightChange: null,
  symptoms: [],
};

export function emptyProfile(userId: string, updatedAt: string = new Date().toISOString()): HealthProfile {
  return {
    userId,
    version: HEALTH_PROFILE_VERSION,
    units: "metric",
    ageYears: null,
    sex: "unspecified",
    height: null,
    weight: null,
    waist: null,
    targetWeight: null,
    goal: null,
    activity: null,
    rateKgPerWeek: 0.5,
    dietary: EMPTY_DIETARY,
    constraints: EMPTY_CONSTRAINTS,
    updatedAt,
  };
}

/** Height in centimetres, converted from whatever unit it was recorded in. */
export function profileHeightCm(profile: HealthProfile): number | null {
  return profile.height ? convert(profile.height.value.value, profile.height.value.unit, "cm") : null;
}

export function profileWeightKg(profile: HealthProfile): number | null {
  return profile.weight ? convert(profile.weight.value.value, profile.weight.value.unit, "kg") : null;
}

export function profileTargetWeightKg(profile: HealthProfile): number | null {
  return profile.targetWeight
    ? convert(profile.targetWeight.value.value, profile.targetWeight.value.unit, "kg")
    : null;
}

/** BMI via the legacy implementation, so the banding cannot drift. */
export function bodyMassIndex(profile: HealthProfile): number | null {
  const heightCm = profileHeightCm(profile);
  const weightKg = profileWeightKg(profile);
  if (heightCm === null || weightKg === null) return null;
  return bmiOf(heightCm, weightKg);
}

/** A measurement attached to the profile, e.g. after a weigh-in. */
export function withMeasurement(
  profile: HealthProfile,
  field: "height" | "weight" | "waist" | "targetWeight",
  value: Observation<Quantity>,
): HealthProfile {
  switch (field) {
    case "height":
      return { ...profile, height: value };
    case "weight":
      return { ...profile, weight: value };
    case "waist":
      return { ...profile, waist: value };
    case "targetWeight":
      return { ...profile, targetWeight: value };
  }
}

export function clampRate(rateKgPerWeek: number): number {
  if (!Number.isFinite(rateKgPerWeek)) return MIN_RATE_KG_PER_WEEK;
  return Math.min(MAX_RATE_KG_PER_WEEK, Math.max(MIN_RATE_KG_PER_WEEK, rateKgPerWeek));
}

/** The canonical display unit for a measurement field. */
export const CANONICAL_FIELD_UNIT = {
  height: "cm",
  weight: "kg",
  waist: "cm",
  targetWeight: "kg",
} as const satisfies Record<string, Unit>;

/** The safety classifier's input, derived from the profile. Pure. */
export function toSafetyInput(profile: HealthProfile): SafetyInput {
  return {
    ageYears: profile.ageYears,
    bmi: bodyMassIndex(profile),
    goal: profile.goal,
    pregnantOrBreastfeeding: profile.constraints.pregnantOrBreastfeeding,
    eatingDisorderHistory: profile.constraints.eatingDisorderHistory,
    medicalConditions: profile.constraints.conditions,
    currentMedications: profile.constraints.medications,
    unexplainedWeightChange: profile.constraints.unexplainedWeightChange,
    symptoms: profile.constraints.symptoms,
    requestedRateKgPerWeek: profile.rateKgPerWeek,
  };
}
