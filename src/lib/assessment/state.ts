/**
 * Assessment state — the ASSESS step of the Vitalis intelligence cycle.
 *
 * Storage follows the pattern the body profile set: one versioned key in the
 * shared preferences document (`health.assessment.v1`), so answers follow the
 * person across devices through `user_prefs`, ride along in the data export,
 * and are covered by account erasure — with no new table in this slice.
 *
 * The answers map onto the Vitalis domain model (`HealthProfile` +
 * `ConsentRecord[]`) rather than inventing a parallel shape: `toHealthProfile`
 * is the bridge, and the domain's own completeness and safety modules judge
 * the result. The one deliberate extension is sleep and recovery — the domain
 * profile has no fields for them yet, so those answers live here only and are
 * labelled as such wherever they are read back.
 *
 * Everything in this module is pure except the two thin pref wrappers at the
 * bottom (`readAssessmentState` / `saveAssessmentState`).
 */

import { getPref, setPref } from "@/lib/prefs";
import {
  DIETARY_PATTERNS,
  type ActivityLevel,
  type DietaryPattern,
  type HealthProfile,
  type Sex,
  type VitalisGoal,
} from "@/lib/vitalis/domain/profile";
import type { ConsentRecord } from "@/lib/vitalis/domain/consent";
import { URGENT_SYMPTOMS, type UrgentSymptom } from "@/lib/vitalis/domain/safety";
import type { Observation } from "@/lib/vitalis/domain/provenance";
import type { Quantity } from "@/lib/vitalis/domain/units";
import { ASSESSMENT_STEPS, type AssessmentStep, type SleepQuality } from "./questions";

export const ASSESSMENT_KEY = "health.assessment.v1";
export const ASSESSMENT_PROMPT_KEY = "health.assessmentPrompt.v1";
export const ASSESSMENT_STATE_VERSION = 1;

export type AssessmentStatus = "not_started" | "in_progress" | "complete";

export interface AssessmentAnswers {
  /* identity — domain: HealthProfile age/height/weight (+ sex, seeded from
     the body profile; the flow does not ask it) */
  ageYears: number | null;
  heightCm: number | null;
  weightKg: number | null;
  sex: Sex;
  /* goals — domain: goal / targetWeight / rateKgPerWeek */
  goal: VitalisGoal | null;
  targetWeightKg: number | null;
  rateKgPerWeek: number | null;
  /* safety — domain: HealthConstraints */
  pregnantOrBreastfeeding: boolean | null;
  eatingDisorderHistory: boolean | null;
  unexplainedWeightChange: boolean | null;
  /** High-risk condition codes from the domain list, plus free-text entries. */
  conditions: string[];
  takesMedication: boolean | null;
  medications: string[];
  symptoms: UrgentSymptom[];
  /* nutrition + preferences — domain: DietaryProfile */
  dietaryPattern: DietaryPattern | null;
  mealsPerDay: number | null;
  allergies: string[];
  intolerances: string[];
  dislikedFoods: string[];
  cuisines: string[];
  /* activity — domain: activity */
  activity: ActivityLevel | null;
  /* sleep & recovery — EXTENSION: no domain fields exist yet (see header) */
  sleepHoursTypical: number | null;
  sleepQuality: SleepQuality | null;
  morningRestedness: number | null;
}

export interface AssessmentState {
  version: typeof ASSESSMENT_STATE_VERSION;
  status: AssessmentStatus;
  /** Where the flow resumes. An AssessmentStep id. */
  step: AssessmentStep;
  answers: AssessmentAnswers;
  consents: ConsentRecord[];
  startedAt: string | null;
  /** Last completion. Kept across a retake until the retake finishes. */
  completedAt: string | null;
  updatedAt: string;
}

export const EMPTY_ANSWERS: AssessmentAnswers = {
  ageYears: null,
  heightCm: null,
  weightKg: null,
  sex: "unspecified",
  goal: null,
  targetWeightKg: null,
  rateKgPerWeek: null,
  pregnantOrBreastfeeding: null,
  eatingDisorderHistory: null,
  unexplainedWeightChange: null,
  conditions: [],
  takesMedication: null,
  medications: [],
  symptoms: [],
  dietaryPattern: null,
  mealsPerDay: null,
  allergies: [],
  intolerances: [],
  dislikedFoods: [],
  cuisines: [],
  activity: null,
  sleepHoursTypical: null,
  sleepQuality: null,
  morningRestedness: null,
};

export function emptyAssessmentState(now: string = ""): AssessmentState {
  return {
    version: ASSESSMENT_STATE_VERSION,
    status: "not_started",
    step: "intro",
    answers: { ...EMPTY_ANSWERS },
    consents: [],
    startedAt: null,
    completedAt: null,
    updatedAt: now,
  };
}

/** Stable fallback for the pref hook — one shared instance, never mutated. */
export const EMPTY_ASSESSMENT_STATE: AssessmentState = emptyAssessmentState();

/* --------------------------------- parsing --------------------------------- */

function numOrNull(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    return null;
  }
  return Math.round(value * 10) / 10;
}

function intOrNull(value: unknown, min: number, max: number): number | null {
  const n = numOrNull(value, min, max);
  return n === null ? null : Math.round(n);
}

function boolOrNull(value: unknown): boolean | null {
  return value === true || value === false ? value : null;
}

function textList(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim().slice(0, maxLength);
    if (trimmed) out.push(trimmed);
    if (out.length >= maxItems) break;
  }
  return out;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

const GOALS: readonly VitalisGoal[] = ["lose", "maintain", "gain", "recomp", "general_health"];
const ACTIVITIES: readonly ActivityLevel[] = [
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
];
const SLEEP_QUALITIES: readonly SleepQuality[] = ["poor", "fair", "good", "very_good"];

export function parseAnswers(raw: unknown): AssessmentAnswers {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...EMPTY_ANSWERS };
  const r = raw as Record<string, unknown>;
  const symptoms = textList(r["symptoms"], URGENT_SYMPTOMS.length, 40).filter(
    (s): s is UrgentSymptom => (URGENT_SYMPTOMS as readonly string[]).includes(s),
  );
  return {
    ageYears: intOrNull(r["ageYears"], 13, 110),
    heightCm: numOrNull(r["heightCm"], 100, 250),
    weightKg: numOrNull(r["weightKg"], 25, 350),
    sex: oneOf<Sex>(r["sex"], ["female", "male", "unspecified"]) ?? "unspecified",
    goal: oneOf(r["goal"], GOALS),
    targetWeightKg: numOrNull(r["targetWeightKg"], 25, 350),
    rateKgPerWeek: numOrNull(r["rateKgPerWeek"], 0.25, 1),
    pregnantOrBreastfeeding: boolOrNull(r["pregnantOrBreastfeeding"]),
    eatingDisorderHistory: boolOrNull(r["eatingDisorderHistory"]),
    unexplainedWeightChange: boolOrNull(r["unexplainedWeightChange"]),
    conditions: textList(r["conditions"], 30, 80),
    takesMedication: boolOrNull(r["takesMedication"]),
    medications: textList(r["medications"], 30, 120),
    symptoms,
    dietaryPattern: oneOf(r["dietaryPattern"], DIETARY_PATTERNS),
    mealsPerDay: intOrNull(r["mealsPerDay"], 1, 12),
    allergies: textList(r["allergies"], 30, 60),
    intolerances: textList(r["intolerances"], 30, 60),
    dislikedFoods: textList(r["dislikedFoods"], 50, 60),
    cuisines: textList(r["cuisines"], 20, 60),
    activity: oneOf(r["activity"], ACTIVITIES),
    sleepHoursTypical: numOrNull(r["sleepHoursTypical"], 3, 14),
    sleepQuality: oneOf(r["sleepQuality"], SLEEP_QUALITIES),
    morningRestedness: intOrNull(r["morningRestedness"], 1, 5),
  };
}

function parseConsents(raw: unknown): ConsentRecord[] {
  if (!Array.isArray(raw)) return [];
  const purposes = [
    "health_data_processing",
    "sensitive_health_processing",
    "ai_assistance",
    "caregiver_sharing",
  ] as const;
  const states = ["granted", "withdrawn", "not_asked"] as const;
  const out: ConsentRecord[] = [];
  for (const item of raw.slice(0, 50)) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const purpose = oneOf(r["purpose"], purposes);
    const state = oneOf(r["state"], states);
    if (!purpose || !state) continue;
    out.push({
      purpose,
      state,
      policyVersion:
        typeof r["policyVersion"] === "string" && r["policyVersion"]
          ? r["policyVersion"]
          : "unknown",
      decidedAt: typeof r["decidedAt"] === "string" ? r["decidedAt"] : null,
    });
  }
  return out;
}

export function parseAssessmentState(raw: unknown): AssessmentState | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (r["version"] !== ASSESSMENT_STATE_VERSION) return null;
  const status = oneOf<AssessmentStatus>(r["status"], ["not_started", "in_progress", "complete"]);
  if (!status) return null;
  const step = oneOf<AssessmentStep>(r["step"], ASSESSMENT_STEPS) ?? "intro";
  return {
    version: ASSESSMENT_STATE_VERSION,
    status,
    step,
    answers: parseAnswers(r["answers"]),
    consents: parseConsents(r["consents"]),
    startedAt: typeof r["startedAt"] === "string" ? r["startedAt"] : null,
    completedAt: typeof r["completedAt"] === "string" ? r["completedAt"] : null,
    updatedAt: typeof r["updatedAt"] === "string" ? r["updatedAt"] : "",
  };
}

/* ------------------------------- transitions ------------------------------- */

/** Begin (or resume) the flow. Seeds only fill fields still unanswered. */
export function beginAssessment(
  state: AssessmentState,
  now: string,
  seed?: Partial<AssessmentAnswers>,
): AssessmentState {
  const answers = { ...state.answers };
  if (seed) {
    for (const key of Object.keys(seed) as (keyof AssessmentAnswers)[]) {
      const current = answers[key];
      const incoming = seed[key];
      if ((current === null || current === "unspecified") && incoming !== undefined) {
        (answers as Record<string, unknown>)[key] = incoming;
      }
    }
  }
  return {
    ...state,
    status: "in_progress",
    step: state.status === "not_started" ? "identity" : state.step,
    answers,
    startedAt: state.startedAt ?? now,
    updatedAt: now,
  };
}

/** Save a step's answers and record where the flow should resume. */
export function saveStep(
  state: AssessmentState,
  patch: Partial<AssessmentAnswers>,
  resumeStep: AssessmentStep,
  now: string,
): AssessmentState {
  return {
    ...state,
    status: state.status === "complete" ? "complete" : "in_progress",
    step: resumeStep,
    answers: { ...state.answers, ...patch },
    updatedAt: now,
  };
}

export function recordConsents(
  state: AssessmentState,
  consents: ConsentRecord[],
  now: string,
): AssessmentState {
  return { ...state, consents: [...state.consents, ...consents], updatedAt: now };
}

export function completeAssessment(state: AssessmentState, now: string): AssessmentState {
  return {
    ...state,
    status: "complete",
    step: "summary",
    completedAt: now,
    updatedAt: now,
  };
}

/**
 * There is deliberately no "retake" transition. A retake is a begin() from
 * the completed state: beginAssessment flips the status to in_progress and
 * keeps completedAt and the answers until the new run finishes — and it is
 * invoked only from the flow's Begin button, never when a sheet opens, so
 * looking at a completed assessment can never demote it.
 */

/** Restart: clear the answers. Consent decisions stand — they were separate choices. */
export function restartAssessment(state: AssessmentState, now: string): AssessmentState {
  return {
    ...state,
    status: "in_progress",
    step: "identity",
    answers: { ...EMPTY_ANSWERS, sex: state.answers.sex },
    startedAt: now,
    completedAt: null,
    updatedAt: now,
  };
}

/* ------------------------------ domain bridge ------------------------------ */

function observation(value: number, unit: "cm" | "kg", recordedAt: string): Observation<Quantity> {
  return {
    value: { value, unit },
    provenance: {
      source: "user_reported",
      recordedAt,
      method: "vitalis-assessment",
      methodVersion: "1",
    },
  };
}

/**
 * The domain profile these answers describe. Unanswered stays null — the
 * domain's whole point is that "never asked" is not a default value.
 */
export function toHealthProfile(state: AssessmentState, userId: string): HealthProfile {
  const a = state.answers;
  const recordedAt = state.completedAt ?? state.updatedAt;
  return {
    userId,
    version: 1,
    units: "metric",
    ageYears: a.ageYears,
    sex: a.sex,
    height: a.heightCm !== null ? observation(a.heightCm, "cm", recordedAt) : null,
    weight: a.weightKg !== null ? observation(a.weightKg, "kg", recordedAt) : null,
    waist: null,
    targetWeight:
      a.targetWeightKg !== null ? observation(a.targetWeightKg, "kg", recordedAt) : null,
    goal: a.goal,
    activity: a.activity,
    rateKgPerWeek: a.rateKgPerWeek ?? 0.5,
    dietary: {
      pattern: a.dietaryPattern,
      allergies: a.allergies,
      intolerances: a.intolerances,
      dislikedFoods: a.dislikedFoods,
      cuisines: a.cuisines,
      mealsPerDay: a.mealsPerDay,
    },
    constraints: {
      conditions: a.conditions,
      medications: a.takesMedication === true ? a.medications : [],
      pregnantOrBreastfeeding: a.pregnantOrBreastfeeding,
      eatingDisorderHistory: a.eatingDisorderHistory,
      unexplainedWeightChange: a.unexplainedWeightChange,
      symptoms: a.symptoms,
    },
    updatedAt: state.updatedAt,
  };
}

/* ------------------------------- pref access ------------------------------- */

/** Synchronous read of the current state — the reader Overview/Coach use. */
export function readAssessmentState(): AssessmentState {
  return getPref(ASSESSMENT_KEY, parseAssessmentState, EMPTY_ASSESSMENT_STATE);
}

export function saveAssessmentState(state: AssessmentState): void {
  setPref(ASSESSMENT_KEY, state);
}

/* ---------------------------- Today prompt card ---------------------------- */

export interface AssessmentPromptState {
  dismissedAt: string | null;
}

export const EMPTY_PROMPT_STATE: AssessmentPromptState = { dismissedAt: null };

export function parseAssessmentPrompt(raw: unknown): AssessmentPromptState | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  return { dismissedAt: typeof r["dismissedAt"] === "string" ? r["dismissedAt"] : null };
}

/**
 * The Today card shows until the assessment is complete, and stays away after
 * a dismissal — unless the person has worked on the assessment since, in
 * which case a half-finished assessment is worth one quiet reminder.
 */
export function shouldShowAssessmentPrompt(
  state: AssessmentState,
  prompt: AssessmentPromptState,
): boolean {
  if (state.status === "complete") return false;
  if (!prompt.dismissedAt) return true;
  return state.updatedAt > prompt.dismissedAt && state.status === "in_progress";
}
