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
  BUDGET_LABEL,
  COOKING_LABEL,
  CRAVING_KIND_LABEL,
  CUISINE_PREFERENCE_LABEL,
  DIETARY_LABEL,
  EATING_SETTING_LABEL,
  EMOTIONAL_EATING_LABEL,
  EQUIPMENT_LABEL,
  FAILURE_REASON_LABEL,
  FOOD_SIDE_LABEL,
  GOAL_LABEL,
  HUNGER_LABEL,
  PREP_TIME_LABEL,
  READINESS_LABEL,
  RESTEDNESS_LABEL,
  SLEEP_QUALITY_LABEL,
} from "./questions";
import { countryNameOf } from "@/lib/nutrition/countries";
import { readAssessmentState, toHealthProfile, type AssessmentState } from "./state";

/** One scalar answer as a value-first stat (anti-document Slice 5):
 *  the figure the summary view leads with, its label, and the exact
 *  line it presents — the line list itself is unchanged (the stats
 *  are a second reading of the same answers, never a second source),
 *  and the view shows the stat INSTEAD of that line. List-shaped and
 *  sentence-shaped answers (allergies, equipment, the safety
 *  statements) have no stat; they stay lines. */
export interface AssessmentStat {
  label: string;
  value: string;
  line: string;
}

export interface AssessmentSectionSummary {
  /** A domain section id, "sleep" for the extension step, or
   *  "behaviour" for the behavioural-profile step (spec §10). */
  section: AssessmentSection | "sleep" | "behaviour";
  title: string;
  state: SectionState;
  lines: string[];
  stats: AssessmentStat[];
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

/** The behaviour step's own completeness, like sleep's: the domain's
 *  completeness has no behavioural section (behavioural answers never
 *  gate a plan), so the count is over the step's own seven signals. */
function behaviourState(state: AssessmentState): SectionState {
  const a = state.answers;
  const answered = [
    a.hungerPattern !== null,
    a.cravings.length > 0,
    a.cravingKinds.length > 0,
    a.emotionalEating !== null,
    a.pastAttempts.length > 0,
    a.motivation !== null,
    a.confidence !== null,
  ].filter(Boolean).length;
  if (answered === 0) return "missing";
  return answered === 7 ? "complete" : "partial";
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

  /* A scalar answer earns both readings in one place: the prose line
     (the record every consumer already reads) and the stat that
     presents it value-first. One push, one string — the two can
     never drift apart. */
  const stat = (
    stats: AssessmentStat[],
    lines: string[],
    label: string,
    value: string,
    line: string,
  ) => {
    lines.push(line);
    stats.push({ label, value, line });
  };

  const identityLines: string[] = [];
  const identityStats: AssessmentStat[] = [];
  if (a.ageYears !== null)
    stat(identityStats, identityLines, "Age", `${a.ageYears}`, `Age ${a.ageYears}.`);
  if (a.heightCm !== null)
    stat(identityStats, identityLines, "Height", `${a.heightCm} cm`, `Height ${a.heightCm} cm.`);
  if (a.weightKg !== null)
    stat(identityStats, identityLines, "Weight", `${a.weightKg} kg`, `Weight ${a.weightKg} kg.`);
  if (a.waistCm !== null)
    stat(identityStats, identityLines, "Waist", `${a.waistCm} cm`, `Waist ${a.waistCm} cm.`);
  if (bmi !== null) {
    stat(
      identityStats,
      identityLines,
      "BMI, calculated from your height and weight",
      bmi.toFixed(1),
      `BMI ${bmi.toFixed(1)}, calculated from the height and weight you gave.`,
    );
  }

  const goalLines: string[] = [];
  const goalStats: AssessmentStat[] = [];
  if (a.goal !== null)
    stat(goalStats, goalLines, "Goal", GOAL_LABEL[a.goal], `Your goal: ${GOAL_LABEL[a.goal].toLowerCase()}.`);
  if (a.targetWeightKg !== null)
    stat(goalStats, goalLines, "Target weight", `${a.targetWeightKg} kg`, `Target weight ${a.targetWeightKg} kg.`);
  if ((a.goal === "lose" || a.goal === "gain") && a.rateKgPerWeek !== null) {
    stat(goalStats, goalLines, "Pace", `${a.rateKgPerWeek} kg a week`, `Pace: ${a.rateKgPerWeek} kg a week.`);
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
  const nutritionStats: AssessmentStat[] = [];
  if (a.dietaryPattern !== null) {
    stat(
      nutritionStats,
      nutritionLines,
      "Eating pattern",
      DIETARY_LABEL[a.dietaryPattern],
      `You eat ${DIETARY_LABEL[a.dietaryPattern].toLowerCase()}.`,
    );
  }
  if (a.mealsPerDay !== null) {
    stat(
      nutritionStats,
      nutritionLines,
      "Meals a day",
      `${a.mealsPerDay}`,
      a.mealsPerDay === 1 ? "Usually 1 meal a day." : `Usually ${a.mealsPerDay} meals a day.`,
    );
  }
  if (a.foodBudget !== null) {
    stat(
      nutritionStats,
      nutritionLines,
      "Meal budget",
      BUDGET_LABEL[a.foodBudget],
      `Meal budget: ${BUDGET_LABEL[a.foodBudget].toLowerCase()}.`,
    );
  }
  if (a.cuisinePreference !== null) {
    stat(
      nutritionStats,
      nutritionLines,
      "Cuisine preference",
      CUISINE_PREFERENCE_LABEL[a.cuisinePreference],
      `Cuisine preference: ${CUISINE_PREFERENCE_LABEL[a.cuisinePreference].toLowerCase()}.`,
    );
  }
  /* M-251: the country (and side, when one was chosen) the person's
     dishes are drawn from. Unanswered country = no line at all —
     never a guessed homeland. */
  const countryName = countryNameOf(a.country);
  if (countryName !== null) {
    const sideLabel = a.foodSide !== null ? FOOD_SIDE_LABEL[a.foodSide] : null;
    stat(
      nutritionStats,
      nutritionLines,
      "Food country",
      sideLabel !== null ? `${sideLabel} · ${countryName}` : countryName,
      sideLabel !== null
        ? `Food country: ${countryName}, ${sideLabel.toLowerCase()} dishes.`
        : `Food country: ${countryName}.`,
    );
  }
  /* The kitchen facts (§10) sit with the rest of the food facts. */
  if (a.eatingSetting !== null) {
    stat(
      nutritionStats,
      nutritionLines,
      "Meals",
      EATING_SETTING_LABEL[a.eatingSetting],
      `Meals: ${EATING_SETTING_LABEL[a.eatingSetting].toLowerCase()}.`,
    );
  }
  if (a.cookingAbility !== null) {
    stat(
      nutritionStats,
      nutritionLines,
      "Cooking",
      COOKING_LABEL[a.cookingAbility],
      `Cooking: ${COOKING_LABEL[a.cookingAbility].toLowerCase()}.`,
    );
  }
  if (a.equipment.length > 0) {
    nutritionLines.push(
      `Equipment: ${a.equipment.map((item) => EQUIPMENT_LABEL[item].toLowerCase()).join(", ")}.`,
    );
  }
  if (a.prepTimeMaxMinutes !== null) {
    stat(
      nutritionStats,
      nutritionLines,
      "Time to cook a main meal",
      PREP_TIME_LABEL[a.prepTimeMaxMinutes],
      `Time to cook a main meal: ${PREP_TIME_LABEL[a.prepTimeMaxMinutes].toLowerCase()}.`,
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

  const behaviourLines: string[] = [];
  if (a.hungerPattern !== null) {
    behaviourLines.push(
      a.hungerPattern === "steady"
        ? "Your hunger stays fairly steady through the day."
        : a.hungerPattern === "nights"
          ? "Your hunger is strongest late at night."
          : `Your hunger is strongest in the ${HUNGER_LABEL[a.hungerPattern].toLowerCase()}.`,
    );
  }
  const cravingsLine = listLine("Foods you crave", a.cravings);
  if (cravingsLine) behaviourLines.push(cravingsLine);
  if (a.cravingKinds.length > 0) {
    behaviourLines.push(
      `Cravings: ${a.cravingKinds.map((kind) => CRAVING_KIND_LABEL[kind].toLowerCase()).join(", ")}.`,
    );
  }
  if (a.emotionalEating !== null) {
    behaviourLines.push(
      `Eating follows your feelings: ${(EMOTIONAL_EATING_LABEL[a.emotionalEating] ?? "").toLowerCase()}.`,
    );
  }
  for (const attempt of a.pastAttempts) {
    behaviourLines.push(
      attempt.failureReasons.length > 0
        ? `You've tried ${attempt.approach} before, it came unstuck over ${attempt.failureReasons.map((r) => FAILURE_REASON_LABEL[r].toLowerCase()).join(", ")}.`
        : `You've tried ${attempt.approach} before.`,
    );
  }
  if (a.motivation !== null) {
    behaviourLines.push(
      `Motivation right now: ${(READINESS_LABEL[a.motivation] ?? "").toLowerCase()}.`,
    );
  }
  if (a.confidence !== null) {
    behaviourLines.push(
      `Confidence you can keep this up: ${(READINESS_LABEL[a.confidence] ?? "").toLowerCase()}.`,
    );
  }

  const sleepLines: string[] = [];
  const sleepStats: AssessmentStat[] = [];
  if (a.sleepHoursTypical !== null) {
    stat(
      sleepStats,
      sleepLines,
      "Typical sleep",
      a.sleepHoursTypical <= 5
        ? "Under 6 hours"
        : a.sleepHoursTypical >= 9
          ? "9 hours or more"
          : `About ${a.sleepHoursTypical} hours`,
      a.sleepHoursTypical <= 5
        ? "You usually sleep under 6 hours."
        : a.sleepHoursTypical >= 9
          ? "You usually sleep 9 hours or more."
          : `You usually sleep about ${a.sleepHoursTypical} hours.`,
    );
  }
  if (a.sleepQuality !== null) {
    stat(
      sleepStats,
      sleepLines,
      "Sleep quality",
      SLEEP_QUALITY_LABEL[a.sleepQuality],
      `Sleep quality: ${SLEEP_QUALITY_LABEL[a.sleepQuality].toLowerCase()}.`,
    );
  }
  if (a.morningRestedness !== null) {
    stat(
      sleepStats,
      sleepLines,
      "Feeling on waking",
      RESTEDNESS_LABEL[a.morningRestedness] ?? "",
      `You wake feeling rested: ${(RESTEDNESS_LABEL[a.morningRestedness] ?? "").toLowerCase()}.`,
    );
  }

  const activityLines: string[] = [];
  const activityStats: AssessmentStat[] = [];
  if (a.activity !== null) {
    stat(
      activityStats,
      activityLines,
      "Activity level",
      ACTIVITY_LABEL[a.activity],
      `Activity level: ${ACTIVITY_LABEL[a.activity].toLowerCase()}.`,
    );
  }

  const NO_STATS: AssessmentStat[] = [];
  const section = (
    id: AssessmentSectionSummary["section"],
    title: string,
    sectionState: SectionState,
    lines: string[],
    stats: AssessmentStat[] = NO_STATS,
  ): AssessmentSectionSummary => ({ section: id, title, state: sectionState, lines, stats });

  const sections: AssessmentSectionSummary[] = [
    section(
      "identity",
      ASSESSMENT_SECTION_COPY.identity,
      completeness.sections.identity,
      identityLines,
      identityStats,
    ),
    section("goals", ASSESSMENT_SECTION_COPY.goals, completeness.sections.goals, goalLines, goalStats),
    section("safety", ASSESSMENT_SECTION_COPY.safety, completeness.sections.safety, safetyLines),
    section(
      "nutrition",
      ASSESSMENT_SECTION_COPY.nutrition,
      completeness.sections.nutrition,
      nutritionLines,
      nutritionStats,
    ),
    section(
      "preferences",
      ASSESSMENT_SECTION_COPY.preferences,
      completeness.sections.preferences,
      preferenceLines,
    ),
    section("behaviour", "Habits and history", behaviourState(state), behaviourLines),
    section("sleep", "Sleep and recovery", sleepState(state), sleepLines, sleepStats),
    section(
      "activity",
      ASSESSMENT_SECTION_COPY.activity,
      completeness.sections.activity,
      activityLines,
      activityStats,
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
