/**
 * The assessment summary — what the person reads back, and what later slices
 * (Overview, Plan, Coach) will read.
 *
 * Rules this module holds itself to:
 *   • Every line describes an answer the person actually gave. Nothing is
 *     inferred, estimated or filled in.
 *   • The only computed number is BMI, and it is labelled as calculated from
 *     the height and weight they entered (via the domain profile, so the
 *     banding can never drift from the rest of Bloom).
 *   • Safety wording comes from the domain's deterministic classifier and its
 *     own copy — this module never softens, sharpens or rephrases it.
 *   • Completeness comes from the domain's `completenessOf`, so "what is
 *     missing" means the same thing here as it will for plan generation.
 */

import {
  ASSESSMENT_SECTION_COPY,
  completenessOf,
  missingSections,
  type AssessmentSection,
  type SectionState,
} from "@/lib/vitalis/domain/assessment";
import { bodyMassIndex, toSafetyInput } from "@/lib/vitalis/domain/profile";
import {
  HIGH_RISK_CONDITION_LABEL,
  SAFETY_CLASS_COPY,
  SAFETY_DISCLAIMER,
  URGENT_SYMPTOM_LABEL,
  type SafetyClass,
} from "@/lib/vitalis/domain/safety";
import { classifySafety } from "@/lib/vitalis/safety/classify";
import {
  ACTIVITY_LABEL,
  DIETARY_LABEL,
  GOAL_LABEL,
  RESTEDNESS_LABEL,
  SLEEP_QUALITY_LABEL,
} from "./questions";
import { readAssessmentState, toHealthProfile, type AssessmentState } from "./state";

export interface AssessmentSectionSummary {
  /** A domain section id, or "sleep" for the extension step. */
  section: AssessmentSection | "sleep";
  title: string;
  state: SectionState;
  lines: string[];
}

export interface AssessmentSummary {
  completedAt: string;
  sections: AssessmentSectionSummary[];
  /** BMI calculated from the entered height and weight; null when either is missing. */
  bmi: number | null;
  safety: {
    classification: SafetyClass;
    /** The domain's own plain-language line for this safety state. */
    headline: string;
    findings: string[];
    disclaimer: string;
  };
  plan: {
    /** True when the domain would allow plan generation on these answers. */
    ready: boolean;
    /** Section titles still incomplete, in the domain's words. */
    missing: string[];
    note: string;
  };
}

const listLine = (label: string, items: readonly string[]): string | null =>
  items.length > 0 ? `${label}: ${items.join(", ")}.` : null;

function conditionLabel(code: string): string {
  return (HIGH_RISK_CONDITION_LABEL as Record<string, string>)[code] ?? code.replace(/_/g, " ");
}

function sleepState(state: AssessmentState): SectionState {
  const a = state.answers;
  const answered = [a.sleepHoursTypical, a.sleepQuality, a.morningRestedness].filter(
    (v) => v !== null,
  ).length;
  if (answered === 0) return "missing";
  return answered === 3 ? "complete" : "partial";
}

/**
 * The summary for a state, or null when the assessment has never been
 * completed. A retake in progress keeps the last completed summary readable
 * until the retake finishes.
 */
export function summaryOf(
  state: AssessmentState,
  userId: string = "self",
): AssessmentSummary | null {
  if (!state.completedAt) return null;
  const a = state.answers;
  const profile = toHealthProfile(state, userId);
  const completeness = completenessOf(profile, state.consents);
  const safety = classifySafety(toSafetyInput(profile));
  const bmi = bodyMassIndex(profile);
  const missing = missingSections(completeness);

  const identityLines: string[] = [];
  if (a.ageYears !== null) identityLines.push(`Age ${a.ageYears}.`);
  if (a.heightCm !== null) identityLines.push(`Height ${a.heightCm} cm.`);
  if (a.weightKg !== null) identityLines.push(`Weight ${a.weightKg} kg.`);
  if (bmi !== null) {
    identityLines.push(`BMI ${bmi.toFixed(1)}, calculated from the height and weight you gave.`);
  }

  const goalLines: string[] = [];
  if (a.goal !== null) goalLines.push(`Your goal: ${GOAL_LABEL[a.goal].toLowerCase()}.`);
  if (a.targetWeightKg !== null) goalLines.push(`Target weight ${a.targetWeightKg} kg.`);
  if ((a.goal === "lose" || a.goal === "gain") && a.rateKgPerWeek !== null) {
    goalLines.push(`Pace: ${a.rateKgPerWeek} kg a week.`);
  }

  const safetyLines: string[] = [];
  if (a.pregnantOrBreastfeeding !== null) {
    safetyLines.push(
      a.pregnantOrBreastfeeding
        ? "You are pregnant or breastfeeding."
        : "You are not pregnant or breastfeeding.",
    );
  }
  if (a.eatingDisorderHistory !== null) {
    safetyLines.push(
      a.eatingDisorderHistory
        ? "You have a history of disordered eating."
        : "You have no history of disordered eating.",
    );
  }
  if (a.unexplainedWeightChange !== null) {
    safetyLines.push(
      a.unexplainedWeightChange
        ? "Your weight has changed recently without an obvious reason."
        : "No unexplained weight change.",
    );
  }
  const conditionsLine = listLine("Conditions you reported", a.conditions.map(conditionLabel));
  if (conditionsLine) safetyLines.push(conditionsLine);
  if (a.takesMedication === true) {
    safetyLines.push(
      a.medications.length > 0
        ? `Medication: ${a.medications.join(", ")}.`
        : "You take regular medication.",
    );
  } else if (a.takesMedication === false) {
    safetyLines.push("No regular medication.");
  }
  if (a.symptoms.length > 0) {
    safetyLines.push(
      `Symptoms you reported: ${a.symptoms.map((s) => URGENT_SYMPTOM_LABEL[s]).join(", ")}.`,
    );
  }

  const nutritionLines: string[] = [];
  if (a.dietaryPattern !== null) {
    nutritionLines.push(`You eat ${DIETARY_LABEL[a.dietaryPattern].toLowerCase()}.`);
  }
  if (a.mealsPerDay !== null) {
    nutritionLines.push(
      a.mealsPerDay === 1 ? "Usually 1 meal a day." : `Usually ${a.mealsPerDay} meals a day.`,
    );
  }

  const preferenceLines: string[] = [];
  const allergiesLine = listLine("Allergies", a.allergies);
  if (allergiesLine) preferenceLines.push(allergiesLine);
  const intolerancesLine = listLine("Intolerances", a.intolerances);
  if (intolerancesLine) preferenceLines.push(intolerancesLine);
  const dislikedLine = listLine("Foods you avoid by choice", a.dislikedFoods);
  if (dislikedLine) preferenceLines.push(dislikedLine);
  const cuisinesLine = listLine("Cuisines you enjoy", a.cuisines);
  if (cuisinesLine) preferenceLines.push(cuisinesLine);
  if (preferenceLines.length === 0) {
    preferenceLines.push("No allergies, intolerances or preferences recorded.");
  }

  const sleepLines: string[] = [];
  if (a.sleepHoursTypical !== null) {
    sleepLines.push(
      a.sleepHoursTypical <= 5
        ? "You usually sleep under 6 hours."
        : a.sleepHoursTypical >= 9
          ? "You usually sleep 9 hours or more."
          : `You usually sleep about ${a.sleepHoursTypical} hours.`,
    );
  }
  if (a.sleepQuality !== null) {
    sleepLines.push(`Sleep quality: ${SLEEP_QUALITY_LABEL[a.sleepQuality].toLowerCase()}.`);
  }
  if (a.morningRestedness !== null) {
    sleepLines.push(
      `You wake feeling rested: ${(RESTEDNESS_LABEL[a.morningRestedness] ?? "").toLowerCase()}.`,
    );
  }

  const activityLines: string[] = [];
  if (a.activity !== null) {
    activityLines.push(`Activity level: ${ACTIVITY_LABEL[a.activity].toLowerCase()}.`);
  }

  const section = (
    id: AssessmentSectionSummary["section"],
    title: string,
    sectionState: SectionState,
    lines: string[],
  ): AssessmentSectionSummary => ({ section: id, title, state: sectionState, lines });

  const sections: AssessmentSectionSummary[] = [
    section(
      "identity",
      ASSESSMENT_SECTION_COPY.identity,
      completeness.sections.identity,
      identityLines,
    ),
    section("goals", ASSESSMENT_SECTION_COPY.goals, completeness.sections.goals, goalLines),
    section("safety", ASSESSMENT_SECTION_COPY.safety, completeness.sections.safety, safetyLines),
    section(
      "nutrition",
      ASSESSMENT_SECTION_COPY.nutrition,
      completeness.sections.nutrition,
      nutritionLines,
    ),
    section(
      "preferences",
      ASSESSMENT_SECTION_COPY.preferences,
      completeness.sections.preferences,
      preferenceLines,
    ),
    section("sleep", "Sleep and recovery", sleepState(state), sleepLines),
    section(
      "activity",
      ASSESSMENT_SECTION_COPY.activity,
      completeness.sections.activity,
      activityLines,
    ),
  ];

  const ready = missing.length === 0 && !safety.blocking;
  const planNote = safety.blocking
    ? SAFETY_CLASS_COPY[safety.classification]
    : missing.length > 0
      ? `A plan needs a little more first: ${missing.map((s) => ASSESSMENT_SECTION_COPY[s].toLowerCase()).join(", ")}. You can add these by retaking the assessment.`
      : "Your answers cover what a plan needs. When planning is available in Bloom, it will start from this summary.";

  return {
    completedAt: state.completedAt,
    sections,
    bmi,
    safety: {
      classification: safety.classification,
      headline: SAFETY_CLASS_COPY[safety.classification],
      findings: safety.findings.map((f) => f.summary),
      disclaimer: SAFETY_DISCLAIMER,
    },
    plan: {
      ready,
      missing: missing.map((s) => ASSESSMENT_SECTION_COPY[s]),
      note: planNote,
    },
  };
}

/**
 * The typed reader for later slices: Overview, Plan and Coach call this
 * instead of touching the pref or the state shape. Null until the person has
 * completed the assessment at least once.
 */
export function readAssessmentSummary(userId: string = "self"): AssessmentSummary | null {
  return summaryOf(readAssessmentState(), userId);
}
