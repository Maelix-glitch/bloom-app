/**
 * The assessment's steps and answer labels.
 *
 * The steps follow the Vitalis domain model's sections
 * (`src/lib/vitalis/domain/assessment.ts`): identity, goals, safety,
 * nutrition, preferences, activity — in the order a person can answer them.
 * One step is an extension the domain model does not carry yet: sleep and
 * recovery. Bloom's intelligence cycle names recovery as a domain, but
 * `HealthProfile` has no fields for it, so those answers live in the
 * assessment state only and never enter the domain profile. Flagged for a
 * future domain revision; nothing downstream pretends otherwise.
 * The behaviour step is the opposite case: the domain DOES carry it
 * (`HealthProfile.behavioural`, spec §10) — the kitchen questions sit on
 * the nutrition step with the rest of the food facts, and the reflective
 * questions get their own step between preferences and sleep.
 */

import type {
  ActivityLevel,
  CookingAbility,
  CravingKind,
  CuisinePreference,
  DietaryPattern,
  EatingSetting,
  EquipmentItem,
  FailureReason,
  HungerPattern,
  PrepTimeMaxMinutes,
  VitalisGoal,
} from "@/lib/vitalis/domain/profile";
import {
  BUDGET_TIER_1_MAX_PER_SERVING,
  BUDGET_TIER_2_MAX_PER_SERVING,
} from "@/lib/nutrition/dishes";
import {
  CAUTION_CONDITIONS,
  CAUTION_CONDITION_LABEL,
  HIGH_RISK_CONDITIONS,
  HIGH_RISK_CONDITION_LABEL,
  URGENT_SYMPTOMS,
  URGENT_SYMPTOM_LABEL,
  type UrgentSymptom,
} from "@/lib/vitalis/domain/safety";

export const ASSESSMENT_STEPS = [
  "intro",
  "identity",
  "goals",
  "safety",
  "nutrition",
  "preferences",
  "behaviour",
  "sleep",
  "activity",
  "summary",
] as const;

export type AssessmentStep = (typeof ASSESSMENT_STEPS)[number];

/** Steps that ask questions (intro and summary frame the flow). */
export const QUESTION_STEPS = [
  "identity",
  "goals",
  "safety",
  "nutrition",
  "preferences",
  "behaviour",
  "sleep",
  "activity",
] as const;

export type QuestionStep = (typeof QUESTION_STEPS)[number];

export const STEP_TITLE: Record<AssessmentStep, string> = {
  intro: "Your assessment",
  identity: "About you",
  goals: "Your goal",
  safety: "Safety",
  nutrition: "How you eat",
  preferences: "Food preferences",
  behaviour: "Habits and history",
  sleep: "Sleep and recovery",
  activity: "How you move",
  summary: "Your summary",
};

export const STEP_INTRO: Record<QuestionStep, string> = {
  identity: "Four basics. Bloom uses them to work out what your body needs.",
  goals: "What you want to change. You can change your mind at any time.",
  safety:
    "These answers decide what Bloom will and will not suggest. They are never used to judge you, and you can answer “prefer not to say”.",
  nutrition: "Your usual pattern, not a perfect week.",
  preferences: "Anything Bloom should keep off your plate, and what you enjoy.",
  behaviour:
    "How eating actually goes for you, cravings, hard moments, and what has or has not worked before. Bloom uses this to shape support, never to judge you.",
  sleep: "Sleep is where recovery happens. Answer for a typical week.",
  activity: "Your usual week, including work and walking, not just exercise sessions.",
};

export const GOAL_OPTIONS: readonly { value: VitalisGoal; label: string; hint: string }[] = [
  { value: "lose", label: "Lose weight", hint: "Reach a lower weight at a steady pace" },
  {
    value: "maintain",
    label: "Maintain my weight",
    hint: "Stay where you are, feel better doing it",
  },
  { value: "gain", label: "Gain weight", hint: "Add weight gradually, mostly as strength" },
  {
    value: "recomp",
    label: "Build strength and muscle",
    hint: "Same weight, different composition",
  },
  {
    value: "general_health",
    label: "General health",
    hint: "Energy, sleep and habits, without a weight goal",
  },
];

export const GOAL_LABEL: Record<VitalisGoal, string> = {
  lose: "Lose weight",
  maintain: "Maintain my weight",
  gain: "Gain weight",
  recomp: "Build strength and muscle",
  general_health: "General health",
};

/* The pace menu tops out at 0.75 kg/wk (M-219, audit F-04): 1 kg/wk
 * implied a 1,100 kcal/day deficit — beyond the CDC's 1–2 lb/wk
 * gradual range and ~1.5–2.2× the AHA/ACC/TOS 500–750 kcal/day
 * prescription. The fastest honest offer is 0.75. */
export const RATE_OPTIONS: readonly { value: number; label: string }[] = [
  { value: 0.25, label: "0.25 kg a week" },
  { value: 0.5, label: "0.5 kg a week" },
  { value: 0.75, label: "0.75 kg a week" },
];

export const ACTIVITY_OPTIONS: readonly { value: ActivityLevel; label: string; hint: string }[] = [
  { value: "sedentary", label: "Mostly sitting", hint: "Desk work, little walking" },
  {
    value: "light",
    label: "Light",
    hint: "On your feet some of the day, or active 1-2 days a week",
  },
  { value: "moderate", label: "Moderate", hint: "Active 3-4 days a week" },
  { value: "active", label: "Active", hint: "Active 5-6 days a week, or a physical job" },
  { value: "very_active", label: "Very active", hint: "Training daily, or heavy physical work" },
];

export const ACTIVITY_LABEL: Record<ActivityLevel, string> = {
  sedentary: "Mostly sitting",
  light: "Light",
  moderate: "Moderate",
  active: "Active",
  very_active: "Very active",
};

export const DIETARY_OPTIONS: readonly { value: DietaryPattern; label: string }[] = [
  { value: "omnivore", label: "Omnivore" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "eggetarian", label: "Eggetarian" },
  { value: "pescatarian", label: "Pescatarian" },
  { value: "other", label: "Another pattern" },
];

export const DIETARY_LABEL: Record<DietaryPattern, string> = {
  omnivore: "Omnivore",
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  eggetarian: "Eggetarian",
  pescatarian: "Pescatarian",
  other: "Another pattern",
};

export const MEALS_OPTIONS: readonly { value: number; label: string }[] = [
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4" },
  { value: 5, label: "5" },
  { value: 6, label: "6 or more" },
];

/**
 * The meal-budget question. Values are the dish library's budget tiers
 * (1–3); 0 is the "no preference" choice and is stored as null — the
 * honest "not answered", exactly like the tri-choice skips. The ₹
 * figures are the dish heuristic's own per-serving ceilings, imported
 * from `lib/nutrition/dishes.ts` so the question can never quote
 * different numbers than the tiers it selects.
 */
export const BUDGET_OPTIONS: readonly {
  value: 0 | 1 | 2 | 3;
  label: string;
  hint?: string;
}[] = [
  {
    value: 1,
    label: "Keep it light · ₹",
    hint: `About ₹${BUDGET_TIER_1_MAX_PER_SERVING} a serving`,
  },
  {
    value: 2,
    label: "Moderate · ₹₹",
    hint: `About ₹${BUDGET_TIER_2_MAX_PER_SERVING} a serving`,
  },
  { value: 3, label: "No limit · ₹₹₹" },
  { value: 0, label: "No preference" },
];

export const BUDGET_LABEL: Record<1 | 2 | 3, string> = {
  1: `Keep it light, about ₹${BUDGET_TIER_1_MAX_PER_SERVING} a serving`,
  2: `Moderate, about ₹${BUDGET_TIER_2_MAX_PER_SERVING} a serving`,
  3: "No limit",
};

/**
 * The cuisine-preference question: North Indian or South Indian.
 * There is deliberately no "international" answer — the preference
 * is between the two Indian regions the dish library can actually
 * tell apart (see lib/nutrition/regions.ts), and it shapes plan
 * ranking only, never what a person may eat.
 */
export const CUISINE_PREFERENCE_OPTIONS: readonly { value: CuisinePreference; label: string }[] = [
  { value: "north_indian", label: "North Indian" },
  { value: "south_indian", label: "South Indian" },
  { value: "both", label: "Both" },
  { value: "no_preference", label: "No preference" },
];

export const CUISINE_PREFERENCE_LABEL: Record<CuisinePreference, string> = {
  north_indian: "North Indian",
  south_indian: "South Indian",
  both: "Both North and South Indian",
  no_preference: "No preference",
};

/* The structured condition list: the high-risk codes (which block
 * automated targets) AND the caution codes (M-219, audit F-12 —
 * type 2 diabetes not on insulin, PCOS, thyroid disorders,
 * hypertension). Before M-219 only the five rare high-risk codes
 * were offered, so the common conditions of the launch population
 * could only be typed as free text and bought the person nothing:
 * no caution framing, and no auto-enabled Condition Mode. */
export const CONDITION_OPTIONS: readonly { value: string; label: string }[] = [
  ...HIGH_RISK_CONDITIONS.map((code) => ({
    value: code as string,
    label: HIGH_RISK_CONDITION_LABEL[code],
  })),
  ...CAUTION_CONDITIONS.map((code) => ({
    value: code as string,
    label: CAUTION_CONDITION_LABEL[code],
  })),
];

export const SYMPTOM_OPTIONS: readonly { value: UrgentSymptom; label: string }[] =
  URGENT_SYMPTOMS.map((code) => ({
    value: code,
    label: URGENT_SYMPTOM_LABEL[code].replace(/^./, (c) => c.toUpperCase()),
  }));

export type SleepQuality = "poor" | "fair" | "good" | "very_good";

export const SLEEP_HOURS_OPTIONS: readonly { value: number; label: string }[] = [
  { value: 5, label: "Under 6 hours" },
  { value: 6, label: "About 6 hours" },
  { value: 7, label: "About 7 hours" },
  { value: 8, label: "About 8 hours" },
  { value: 9, label: "9 hours or more" },
];

export const SLEEP_QUALITY_OPTIONS: readonly { value: SleepQuality; label: string }[] = [
  { value: "poor", label: "Poor" },
  { value: "fair", label: "Fair" },
  { value: "good", label: "Good" },
  { value: "very_good", label: "Very good" },
];

export const SLEEP_QUALITY_LABEL: Record<SleepQuality, string> = {
  poor: "Poor",
  fair: "Fair",
  good: "Good",
  very_good: "Very good",
};

export const RESTEDNESS_OPTIONS: readonly { value: number; label: string }[] = [
  { value: 1, label: "Rarely" },
  { value: 2, label: "Sometimes" },
  { value: 3, label: "About half the time" },
  { value: 4, label: "Most days" },
  { value: 5, label: "Almost always" },
];

export const RESTEDNESS_LABEL: Record<number, string> = {
  1: "Rarely",
  2: "Sometimes",
  3: "About half the time",
  4: "Most days",
  5: "Almost always",
};

/* ------------------- behavioural profile (spec §10) ------------------- */

/**
 * The kitchen questions live on the nutrition step, with the rest of
 * the food facts; the reflective ones on the behaviour step. Every
 * vocabulary here is the domain's own (vitalis/domain/profile.ts) —
 * the labels are presentation only.
 */

export const COOKING_OPTIONS: readonly { value: CookingAbility; label: string; hint: string }[] = [
  { value: "none", label: "I don't cook", hint: "Meals are made for me, or bought ready" },
  { value: "basic", label: "Basic cooking", hint: "Simple things, eggs, rice, a curry base" },
  { value: "confident", label: "Confident cooking", hint: "Most recipes are fine" },
];

export const COOKING_LABEL: Record<CookingAbility, string> = {
  none: "No cooking",
  basic: "Basic cooking",
  confident: "Confident cooking",
};

export const EQUIPMENT_OPTIONS: readonly { value: EquipmentItem; label: string }[] = [
  { value: "stove", label: "Stove" },
  { value: "pressure_cooker", label: "Pressure cooker" },
  { value: "oven", label: "Oven" },
  { value: "microwave", label: "Microwave" },
  { value: "mixer_grinder", label: "Mixer grinder" },
  { value: "fridge", label: "Fridge" },
  { value: "none", label: "None of these" },
];

export const EQUIPMENT_LABEL: Record<EquipmentItem, string> = {
  stove: "Stove",
  pressure_cooker: "Pressure cooker",
  oven: "Oven",
  microwave: "Microwave",
  mixer_grinder: "Mixer grinder",
  fridge: "Fridge",
  none: "None of these",
};

export const PREP_TIME_OPTIONS: readonly { value: PrepTimeMaxMinutes; label: string }[] = [
  { value: 10, label: "About 10 minutes" },
  { value: 20, label: "About 20 minutes" },
  { value: 35, label: "About 35 minutes" },
  { value: 60, label: "Up to an hour" },
];

export const PREP_TIME_LABEL: Record<PrepTimeMaxMinutes, string> = {
  10: "About 10 minutes",
  20: "About 20 minutes",
  35: "About 35 minutes",
  60: "Up to an hour",
};

export const EATING_SETTING_OPTIONS: readonly {
  value: EatingSetting;
  label: string;
  hint: string;
}[] = [
  { value: "home", label: "At home", hint: "Most meals are home-cooked" },
  { value: "hostel", label: "Hostel or shared kitchen", hint: "Limited space and equipment" },
  { value: "work_canteen", label: "Work canteen", hint: "Lunch comes from a canteen most days" },
  {
    value: "restaurant_mostly",
    label: "Restaurants and takeaway",
    hint: "Most meals are bought ready",
  },
  { value: "mixed", label: "A mix", hint: "Some home, some bought" },
];

export const EATING_SETTING_LABEL: Record<EatingSetting, string> = {
  home: "At home",
  hostel: "Hostel or shared kitchen",
  work_canteen: "Work canteen",
  restaurant_mostly: "Restaurants and takeaway",
  mixed: "A mix",
};

export const HUNGER_OPTIONS: readonly { value: HungerPattern; label: string }[] = [
  { value: "mornings", label: "Mornings" },
  { value: "afternoons", label: "Afternoons" },
  { value: "evenings", label: "Evenings" },
  { value: "nights", label: "Late at night" },
  { value: "steady", label: "Fairly steady all day" },
];

export const HUNGER_LABEL: Record<HungerPattern, string> = {
  mornings: "Mornings",
  afternoons: "Afternoons",
  evenings: "Evenings",
  nights: "Late at night",
  steady: "Fairly steady all day",
};

export const CRAVING_KIND_OPTIONS: readonly { value: CravingKind; label: string }[] = [
  { value: "sweet", label: "Sweet" },
  { value: "salty", label: "Salty" },
  { value: "fried", label: "Fried" },
  { value: "none", label: "No particular cravings" },
];

export const CRAVING_KIND_LABEL: Record<CravingKind, string> = {
  sweet: "Sweet",
  salty: "Salty",
  fried: "Fried",
  none: "No particular cravings",
};

/** How often eating follows feelings — the emotional-eating scale. */
export const EMOTIONAL_EATING_OPTIONS: readonly { value: number; label: string }[] = [
  { value: 1, label: "Rarely" },
  { value: 2, label: "Sometimes" },
  { value: 3, label: "About half the time" },
  { value: 4, label: "Often" },
  { value: 5, label: "Very often" },
];

export const EMOTIONAL_EATING_LABEL: Record<number, string> = {
  1: "Rarely",
  2: "Sometimes",
  3: "About half the time",
  4: "Often",
  5: "Very often",
};

/** The shared 1–5 scale for motivation and confidence. */
export const READINESS_OPTIONS: readonly { value: number; label: string }[] = [
  { value: 1, label: "Very low" },
  { value: 2, label: "Low" },
  { value: 3, label: "In the middle" },
  { value: 4, label: "High" },
  { value: 5, label: "Very high" },
];

export const READINESS_LABEL: Record<number, string> = {
  1: "Very low",
  2: "Low",
  3: "In the middle",
  4: "High",
  5: "Very high",
};

export const FAILURE_REASON_OPTIONS: readonly { value: FailureReason; label: string }[] = [
  { value: "cost", label: "Cost" },
  { value: "time", label: "Time" },
  { value: "hunger", label: "Hunger" },
  { value: "taste", label: "Taste" },
  { value: "complexity", label: "Too complicated" },
  { value: "social", label: "Social pressure" },
  { value: "other", label: "Something else" },
];

export const FAILURE_REASON_LABEL: Record<FailureReason, string> = {
  cost: "Cost",
  time: "Time",
  hunger: "Hunger",
  taste: "Taste",
  complexity: "Too complicated",
  social: "Social pressure",
  other: "Something else",
};
