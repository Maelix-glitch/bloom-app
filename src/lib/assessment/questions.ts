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
 */

import type { ActivityLevel, DietaryPattern, VitalisGoal } from "@/lib/vitalis/domain/profile";
import {
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
  sleep: "Sleep and recovery",
  activity: "How you move",
  summary: "Your summary",
};

export const STEP_INTRO: Record<QuestionStep, string> = {
  identity: "Three basics. Bloom uses them to work out what your body needs.",
  goals: "What you want to change. You can change your mind at any time.",
  safety:
    "These answers decide what Bloom will and will not suggest. They are never used to judge you, and you can answer “prefer not to say”.",
  nutrition: "Your usual pattern, not a perfect week.",
  preferences: "Anything Bloom should keep off your plate, and what you enjoy.",
  sleep: "Sleep is where recovery happens. Answer for a typical week.",
  activity: "Your usual week, including work and walking — not just exercise sessions.",
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

export const RATE_OPTIONS: readonly { value: number; label: string }[] = [
  { value: 0.25, label: "0.25 kg a week" },
  { value: 0.5, label: "0.5 kg a week" },
  { value: 0.75, label: "0.75 kg a week" },
  { value: 1, label: "1 kg a week" },
];

export const ACTIVITY_OPTIONS: readonly { value: ActivityLevel; label: string; hint: string }[] = [
  { value: "sedentary", label: "Mostly sitting", hint: "Desk work, little walking" },
  {
    value: "light",
    label: "Light",
    hint: "On your feet some of the day, or active 1–2 days a week",
  },
  { value: "moderate", label: "Moderate", hint: "Active 3–4 days a week" },
  { value: "active", label: "Active", hint: "Active 5–6 days a week, or a physical job" },
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

export const CONDITION_OPTIONS: readonly { value: string; label: string }[] =
  HIGH_RISK_CONDITIONS.map((code) => ({ value: code, label: HIGH_RISK_CONDITION_LABEL[code] }));

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
