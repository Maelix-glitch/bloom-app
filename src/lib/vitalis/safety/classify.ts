/**
 * Deterministic safety classification for Bloom Vitalis.
 *
 * Requirements this file holds itself to:
 *   • No I/O, no model call, no clock reads, no randomness. Pure function.
 *   • Every output names the rule that produced it, and the rules version.
 *   • Unknown is not "safe": an unanswered safety question blocks plans.
 *   • The worst fired rule wins; findings are ordered deterministically.
 *
 * This is a workflow gate, not a diagnosis. Nothing here estimates the
 * probability of a condition, and no copy names a disease the user has not
 * already reported.
 */

import {
  HIGH_RISK_CONDITIONS,
  HIGH_RISK_CONDITION_LABEL,
  MAX_RATE_KG_PER_WEEK,
  SAFETY_CLASS_RANK,
  SAFETY_RULES_VERSION,
  SEVERE_UNDERWEIGHT_BMI,
  UNDERWEIGHT_BMI,
  URGENT_SYMPTOMS,
  URGENT_SYMPTOM_LABEL,
  type SafetyAssessment,
  type SafetyClass,
  type SafetyFinding,
  type SafetyInput,
  type SafetyRuleId,
  type UrgentSymptom,
} from "../domain/safety";

function isUrgentSymptom(value: string): value is UrgentSymptom {
  return (URGENT_SYMPTOMS as readonly string[]).includes(value);
}

function isHighRiskCondition(value: string): boolean {
  return (HIGH_RISK_CONDITIONS as readonly string[]).includes(value);
}

function conditionLabel(code: string): string {
  if (isHighRiskCondition(code)) {
    return HIGH_RISK_CONDITION_LABEL[code as keyof typeof HIGH_RISK_CONDITION_LABEL];
  }
  return code.replace(/_/g, " ");
}

export function classifySafety(input: SafetyInput): SafetyAssessment {
  const findings: SafetyFinding[] = [];
  const add = (
    ruleId: SafetyRuleId,
    classification: SafetyClass,
    summary: string,
    blocking: boolean,
  ): void => {
    findings.push({ ruleId, classification, summary, blocking });
  };

  /* 1. Urgent symptoms outrank everything. Bloom stops and says so plainly. */
  const urgent = input.symptoms.filter(isUrgentSymptom);
  if (urgent.length > 0) {
    add(
      "urgent_symptom",
      "urgent_escalation",
      `You reported ${urgent.map((symptom) => URGENT_SYMPTOM_LABEL[symptom]).join(", ")}. Please contact emergency or urgent care now. Bloom is stopping its suggestions.`,
      true,
    );
  }

  /* 2. Age gates. Missing age is treated as unknown, not as an adult. */
  if (input.ageYears === null) {
    add(
      "age_missing",
      "caution",
      "Bloom needs your age before it can suggest an energy target, because needs change with age.",
      true,
    );
  } else if (input.ageYears < 18) {
    add(
      "adult_only",
      "professional_review_required",
      "Bloom's targets are written for adults. Under 18, growth needs a different approach than a calorie plan.",
      true,
    );
  }

  /* 3. Pregnancy and disordered-eating history: no self-directed targets. */
  if (input.pregnantOrBreastfeeding === true) {
    add(
      "pregnancy",
      "professional_review_required",
      "Energy needs during pregnancy and breastfeeding are specific to you. Bloom won't set them; a clinician can.",
      true,
    );
  }

  if (input.eatingDisorderHistory === true) {
    add(
      "eating_disorder_history",
      "professional_review_required",
      "With a history of disordered eating, calorie targets and weight tracking can do more harm than good. Bloom won't set them.",
      true,
    );
  }

  /* 4. Unanswered safety questions. `null` is not a "no". */
  if (input.pregnantOrBreastfeeding === null || input.eatingDisorderHistory === null) {
    const unanswered = [
      input.pregnantOrBreastfeeding === null ? "pregnancy/breastfeeding" : null,
      input.eatingDisorderHistory === null ? "eating-disorder history" : null,
    ].filter((label): label is string => label !== null);
    add(
      "safety_answers_missing",
      "caution",
      `Bloom can't confirm a plan is appropriate until you answer: ${unanswered.join(" and ")}.`,
      true,
    );
  }

  /* 5. BMI gates, using the bands the legacy body module already defines. */
  if (input.bmi !== null && input.bmi < SEVERE_UNDERWEIGHT_BMI) {
    add(
      "severe_underweight",
      "professional_review_required",
      `A BMI of ${input.bmi.toFixed(1)} is well below the healthy range. That needs a clinician's input, not a calorie target.`,
      true,
    );
  } else if (input.bmi !== null && input.bmi < UNDERWEIGHT_BMI && input.goal === "lose") {
    add(
      "underweight_loss_goal",
      "professional_review_required",
      `A BMI of ${input.bmi.toFixed(1)} is already below the healthy range, so Bloom won't plan weight loss.`,
      true,
    );
  }

  /* 6. Conditions and medication: high-risk codes block, others advise. */
  const highRisk = input.medicalConditions.filter(isHighRiskCondition);
  if (highRisk.length > 0) {
    add(
      "high_risk_condition",
      "professional_review_required",
      `With ${highRisk.map(conditionLabel).join(", ")}, calorie and fluid targets need to be set with your treating clinician.`,
      true,
    );
  }

  const otherConditions = input.medicalConditions.filter((condition) => !isHighRiskCondition(condition));
  if (otherConditions.length > 0) {
    add(
      "medical_condition",
      "caution",
      `Bloom will keep suggestions conservative because you reported ${otherConditions.map(conditionLabel).join(", ")}.`,
      false,
    );
  }

  if (input.currentMedications.length > 0) {
    add(
      "medication",
      "caution",
      "Some medications change appetite, weight or hydration. Bloom's estimates can be less accurate while you take them.",
      false,
    );
  }

  /* 7. Unexplained weight change warrants a medical look before a deficit. */
  if (input.unexplainedWeightChange === true) {
    add(
      "unexplained_weight_change",
      "professional_review_required",
      "Weight changing without an obvious reason is worth checking with a clinician before changing your intake on purpose.",
      true,
    );
  }

  /* 8. An aggressive requested rate is allowed but always clamped downstream. */
  if (input.requestedRateKgPerWeek !== null && input.requestedRateKgPerWeek > MAX_RATE_KG_PER_WEEK) {
    add(
      "aggressive_rate",
      "caution",
      `Bloom caps weight change at ${MAX_RATE_KG_PER_WEEK} kg per week, so your requested pace will be slowed to that.`,
      false,
    );
  }

  const classification = findings.reduce<SafetyClass>(
    (worst, finding) =>
      SAFETY_CLASS_RANK[finding.classification] > SAFETY_CLASS_RANK[worst]
        ? finding.classification
        : worst,
    "standard",
  );

  const ordered = [...findings].sort(
    (a, b) =>
      SAFETY_CLASS_RANK[b.classification] - SAFETY_CLASS_RANK[a.classification] ||
      a.ruleId.localeCompare(b.ruleId),
  );

  return {
    classification,
    findings: ordered,
    blocking:
      ordered.some((finding) => finding.blocking) ||
      SAFETY_CLASS_RANK[classification] >= SAFETY_CLASS_RANK.professional_review_required,
    requiresProfessionalReview:
      SAFETY_CLASS_RANK[classification] >= SAFETY_CLASS_RANK.professional_review_required,
    rulesVersion: SAFETY_RULES_VERSION,
  };
}

/** Rule ids that fired, in output order. Useful for tests and audit rows. */
export function firedRules(assessment: SafetyAssessment): SafetyRuleId[] {
  return assessment.findings.map((finding) => finding.ruleId);
}
