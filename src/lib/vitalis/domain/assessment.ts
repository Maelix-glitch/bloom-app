/**
 * Assessment completeness for Bloom Vitalis.
 *
 * The app has to know the difference between "this person answered no" and
 * "this person was never asked". `HealthProfile` keeps those apart with nulls,
 * and this module turns a profile plus its consents into per-section states.
 *
 * Plan generation requires the required sections to be complete *and* the
 * safety assessment not to block. Completeness is never inferred from a
 * default value.
 */

import type { ConsentRecord } from "./consent";
import { hasConsent } from "./consent";
import type { HealthProfile } from "./profile";
import { bodyMassIndex, profileHeightCm, profileWeightKg } from "./profile";
import type { SafetyAssessment, SafetyClass } from "./safety";

export const ASSESSMENT_SECTIONS = [
  "identity",
  "goals",
  "safety",
  "nutrition",
  "activity",
  "preferences",
] as const;

export type AssessmentSection = (typeof ASSESSMENT_SECTIONS)[number];

export type SectionState = "complete" | "partial" | "missing";

export const ASSESSMENT_SECTION_COPY: Record<AssessmentSection, string> = {
  identity: "Height, weight and age",
  goals: "What you want to change",
  safety: "Safety questions",
  nutrition: "How you eat",
  activity: "How active you are",
  preferences: "Food preferences",
};

/** Sections that must be complete before any calorie plan is generated. */
export const REQUIRED_FOR_PLAN: readonly AssessmentSection[] = [
  "identity",
  "goals",
  "safety",
  "nutrition",
  "activity",
];

export interface AssessmentCompleteness {
  readonly sections: Record<AssessmentSection, SectionState>;
}

export interface PlanReadiness {
  readonly ok: boolean;
  readonly classification: SafetyClass;
  readonly missing: readonly AssessmentSection[];
  readonly blockingFindings: readonly string[];
}

function stateFrom(answered: number, total: number): SectionState {
  if (answered <= 0) return "missing";
  return answered >= total ? "complete" : "partial";
}

export function completenessOf(
  profile: HealthProfile,
  consents: readonly ConsentRecord[],
  policyVersion?: string,
): AssessmentCompleteness {
  const hasHeight = profileHeightCm(profile) !== null;
  const hasWeight = profileWeightKg(profile) !== null;
  const hasAge = profile.ageYears !== null;
  const identity = stateFrom([hasHeight, hasWeight, hasAge].filter(Boolean).length, 3);

  const needsTarget = profile.goal === "lose" || profile.goal === "gain";
  let goals: SectionState;
  if (profile.goal === null) goals = "missing";
  else if (needsTarget && profile.targetWeight === null) goals = "partial";
  else goals = "complete";

  const safetyConsent =
    hasConsent(consents, "health_data_processing", policyVersion) &&
    hasConsent(consents, "sensitive_health_processing", policyVersion);
  const safetyAnswers = [
    profile.constraints.pregnantOrBreastfeeding !== null,
    profile.constraints.eatingDisorderHistory !== null,
  ].filter(Boolean).length;

  let safety: SectionState;
  if (!safetyConsent && safetyAnswers === 0) safety = "missing";
  else if (safetyConsent && safetyAnswers === 2) safety = "complete";
  else safety = "partial";

  const nutrition = profile.dietary.pattern !== null ? "complete" : "missing";
  const activity = profile.activity !== null ? "complete" : "missing";

  const preferenceSignals = [
    profile.dietary.allergies.length > 0,
    profile.dietary.intolerances.length > 0,
    profile.dietary.dislikedFoods.length > 0,
    profile.dietary.cuisines.length > 0,
    profile.dietary.mealsPerDay !== null,
  ].filter(Boolean).length;
  const preferences = stateFrom(preferenceSignals, 1);

  return {
    sections: { identity, goals, safety, nutrition, activity, preferences },
  };
}

export function missingSections(completeness: AssessmentCompleteness): AssessmentSection[] {
  return REQUIRED_FOR_PLAN.filter((section) => completeness.sections[section] !== "complete");
}

export function canGeneratePlan(
  profile: HealthProfile,
  consents: readonly ConsentRecord[],
  safety: SafetyAssessment,
): PlanReadiness {
  const completeness = completenessOf(profile, consents);
  const missing = missingSections(completeness);
  const blockingFindings = safety.findings.filter((finding) => finding.blocking).map((finding) => finding.ruleId);
  return {
    ok: missing.length === 0 && !safety.blocking,
    classification: safety.classification,
    missing,
    blockingFindings,
  };
}

/** True when the profile has enough to compute a BMI at all. */
export function hasBodyBaseline(profile: HealthProfile): boolean {
  return bodyMassIndex(profile) !== null;
}
