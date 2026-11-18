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

/**
 * The cuisine preference the Assessment asks (and only the Assessment
 * asks): whether the person's cooking leans North Indian or South
 * Indian. `both` and `no_preference` are real answers, distinct from
 * each other and from unanswered (null) — all three leave plan
 * composition unshaped; only the two regional answers rank dishes.
 */
export const CUISINE_PREFERENCES = [
  "north_indian",
  "south_indian",
  "both",
  "no_preference",
] as const;

export type CuisinePreference = (typeof CUISINE_PREFERENCES)[number];

export interface DietaryProfile {
  /** Null means not answered yet. */
  readonly pattern: DietaryPattern | null;
  readonly allergies: readonly string[];
  readonly intolerances: readonly string[];
  readonly dislikedFoods: readonly string[];
  readonly cuisines: readonly string[];
  readonly mealsPerDay: number | null;
  /** Meal-suggestion budget tier (1–3, the dish heuristic's bands in
   *  `lib/nutrition/dishes.ts`); null means no preference stated. */
  readonly budgetTier: 1 | 2 | 3 | null;
  /** The North/South Indian cuisine preference; null means the
   *  Assessment question was never answered. */
  readonly cuisinePreference: CuisinePreference | null;
}

/* --------------------- behavioural profile (§10) --------------------- */

/**
 * The behavioural profile — vision system 1D, spec §10. How food
 * actually happens in this person's life: their kitchen, their time,
 * their hunger, and what has and has not worked before. Every field
 * is nullable or an empty list — unanswered is a state, never a
 * default — and every field names a consumer in the spec; a field
 * whose consumer is removed is removed from here in the same change.
 * Asked ONLY in the Assessment (the pattern/budget/cuisine rule);
 * the factual kitchen fields may also move by Living Assessment
 * delta, the reflective ones never do (see assessment/living.ts).
 */

export const COOKING_ABILITIES = ["none", "basic", "confident"] as const;

export type CookingAbility = (typeof COOKING_ABILITIES)[number];

/** Kitchen equipment a person may have. `none` is an explicit answer
 *  ("none of these"), distinct from an unanswered empty list. */
export const EQUIPMENT_ITEMS = [
  "stove",
  "pressure_cooker",
  "oven",
  "microwave",
  "mixer_grinder",
  "fridge",
  "none",
] as const;

export type EquipmentItem = (typeof EQUIPMENT_ITEMS)[number];

/** The prep-time bands the Assessment offers, in minutes per main meal. */
export const PREP_TIME_BANDS = [10, 20, 35, 60] as const;

export type PrepTimeMaxMinutes = (typeof PREP_TIME_BANDS)[number];

export const EATING_SETTINGS = [
  "home",
  "hostel",
  "work_canteen",
  "restaurant_mostly",
  "mixed",
] as const;

export type EatingSetting = (typeof EATING_SETTINGS)[number];

export const HUNGER_PATTERNS = ["mornings", "afternoons", "evenings", "nights", "steady"] as const;

export type HungerPattern = (typeof HUNGER_PATTERNS)[number];

/** The craving kinds the Assessment offers as tags beside the
 *  free-text list. `none` is an explicit "no particular cravings". */
export const CRAVING_KINDS = ["sweet", "salty", "fried", "none"] as const;

export type CravingKind = (typeof CRAVING_KINDS)[number];

export const FAILURE_REASONS = [
  "cost",
  "time",
  "hunger",
  "taste",
  "complexity",
  "social",
  "other",
] as const;

export type FailureReason = (typeof FAILURE_REASONS)[number];

export interface PastAttempt {
  /** What they tried, in their own words. */
  readonly approach: string;
  /** Why it came unstuck — the Diagnose priors of spec §11.3. */
  readonly failureReasons: readonly FailureReason[];
}

export interface BehaviouralProfile {
  /** Null means not answered yet. */
  readonly cookingAbility: CookingAbility | null;
  /** Empty means not answered; `["none"]` is the stated "none of these". */
  readonly equipment: readonly EquipmentItem[];
  readonly prepTimeMaxMinutes: PrepTimeMaxMinutes | null;
  readonly eatingSetting: EatingSetting | null;
  readonly hungerPattern: HungerPattern | null;
  /** Foods they crave, in their own words (≤ 5). */
  readonly cravings: readonly string[];
  readonly cravingKinds: readonly CravingKind[];
  /** 1 (rarely) to 5 (very often); null means not answered. */
  readonly emotionalEating: number | null;
  readonly pastAttempts: readonly PastAttempt[];
  /** 1 (very low) to 5 (very high); null means not answered. */
  readonly motivation: number | null;
  readonly confidence: number | null;
}

export const EMPTY_BEHAVIOURAL: BehaviouralProfile = {
  cookingAbility: null,
  equipment: [],
  prepTimeMaxMinutes: null,
  eatingSetting: null,
  hungerPattern: null,
  cravings: [],
  cravingKinds: [],
  emotionalEating: null,
  pastAttempts: [],
  motivation: null,
  confidence: null,
};

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
  readonly behavioural: BehaviouralProfile;
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
  budgetTier: null,
  cuisinePreference: null,
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
    behavioural: EMPTY_BEHAVIOURAL,
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

/** Waist in centimetres, converted from whatever unit it was recorded in. */
export function profileWaistCm(profile: HealthProfile): number | null {
  return profile.waist ? convert(profile.waist.value.value, profile.waist.value.unit, "cm") : null;
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
