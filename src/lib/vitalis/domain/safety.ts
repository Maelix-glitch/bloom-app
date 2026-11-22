/**
 * Safety states for Bloom Vitalis.
 *
 * A safety state is a deterministic classification, not a diagnosis. It says
 * what Bloom is willing to do next:
 *
 *   standard                     — ordinary wellness guidance is allowed.
 *   caution                      — guidance is allowed with a plain-language caveat.
 *   professional_review_required — Bloom will not generate a deficit or surplus
 *                                  plan until a clinician has been involved.
 *   urgent_escalation            — Bloom stops and points at urgent care.
 *
 * The classifier is pure and rule-ordered (see `safety/classify.ts`). No model,
 * no network call, no randomness: the same inputs always produce the same
 * state, and every finding names the rule that produced it.
 */

export const SAFETY_RULES_VERSION = "vitalis-safety-1.1.0";

export const SAFETY_CLASSES = [
  "standard",
  "caution",
  "professional_review_required",
  "urgent_escalation",
] as const;

export type SafetyClass = (typeof SAFETY_CLASSES)[number];

/** Higher rank always wins when several rules fire. */
export const SAFETY_CLASS_RANK: Record<SafetyClass, number> = {
  standard: 0,
  caution: 1,
  professional_review_required: 2,
  urgent_escalation: 3,
};

export const SAFETY_CLASS_COPY: Record<SafetyClass, string> = {
  standard: "Nothing in what you've told us changes what Bloom will suggest.",
  caution: "Bloom will keep suggestions conservative because of what you've told us.",
  professional_review_required:
    "Bloom won't set calorie targets until this has been discussed with a qualified professional.",
  urgent_escalation: "Please seek medical care now. Bloom is stopping its suggestions.",
};

export const SAFETY_RULE_IDS = [
  "urgent_symptom",
  "adult_only",
  "age_missing",
  "safety_answers_missing",
  "pregnancy",
  "eating_disorder_history",
  "severe_underweight",
  "underweight_loss_goal",
  "underweight_target",
  "high_risk_condition",
  "unexplained_weight_change",
  "medical_condition",
  "medication",
  "aggressive_rate",
] as const;

export type SafetyRuleId = (typeof SAFETY_RULE_IDS)[number];

export interface SafetyFinding {
  readonly ruleId: SafetyRuleId;
  readonly classification: SafetyClass;
  /** Plain-language, no diagnosis, no probability. */
  readonly summary: string;
  /** True when this finding alone stops plan generation. */
  readonly blocking: boolean;
}

export interface SafetyAssessment {
  readonly classification: SafetyClass;
  readonly findings: readonly SafetyFinding[];
  /** True when any finding is blocking or the class is review-or-worse. */
  readonly blocking: boolean;
  readonly requiresProfessionalReview: boolean;
  readonly rulesVersion: string;
}

/**
 * Symptoms that are treated as urgent regardless of anything else. These are
 * triage prompts, not a differential: Bloom says "get care now" and stops.
 */
export const URGENT_SYMPTOMS = [
  "chest_pain",
  "fainting",
  "severe_shortness_of_breath",
  "uncontrolled_bleeding",
] as const;

export type UrgentSymptom = (typeof URGENT_SYMPTOMS)[number];

export const URGENT_SYMPTOM_LABEL: Record<UrgentSymptom, string> = {
  chest_pain: "chest pain",
  fainting: "fainting or loss of consciousness",
  severe_shortness_of_breath: "severe shortness of breath",
  uncontrolled_bleeding: "bleeding you cannot stop",
};

/**
 * Conditions where self-directed calorie deficits are not appropriate to
 * automate. Stored as stable codes, not free text.
 */
export const HIGH_RISK_CONDITIONS = [
  "type_1_diabetes",
  "type_2_diabetes_on_insulin",
  "chronic_kidney_disease",
  "cardiovascular_disease",
  "eating_disorder_diagnosed",
] as const;

export type HighRiskCondition = (typeof HIGH_RISK_CONDITIONS)[number];

export const HIGH_RISK_CONDITION_LABEL: Record<HighRiskCondition, string> = {
  type_1_diabetes: "type 1 diabetes",
  type_2_diabetes_on_insulin: "type 2 diabetes managed with insulin",
  chronic_kidney_disease: "chronic kidney disease",
  cardiovascular_disease: "heart or blood-vessel disease",
  eating_disorder_diagnosed: "a diagnosed eating disorder",
};

/**
 * Conditions that do not block automated targets but always carry the
 * caution state — and, since M-219, auto-enable the related Condition
 * Mode in plan composition (see lib/modes). These are the common
 * metabolic conditions of the product's launch population (type 2
 * diabetes not managed with insulin, PCOS, thyroid disorders,
 * hypertension): before M-219 they existed only as free text, so an
 * honest answer bought the person nothing structured at all.
 */
export const CAUTION_CONDITIONS = [
  "type_2_diabetes",
  "pcos",
  "thyroid_disorder",
  "hypertension",
] as const;

export type CautionCondition = (typeof CAUTION_CONDITIONS)[number];

export const CAUTION_CONDITION_LABEL: Record<CautionCondition, string> = {
  type_2_diabetes: "type 2 diabetes (not on insulin)",
  pcos: "PCOS",
  thyroid_disorder: "a thyroid disorder",
  hypertension: "high blood pressure (hypertension)",
};

/**
 * The fastest rate Bloom will plan for, in kg per week. 0.75 kg/wk
 * implies a ~825 kcal/day deficit — the top of the AHA/ACC/TOS
 * 500–750 kcal/day prescription neighbourhood and inside the CDC's
 * 1–2 lb/wk gradual-loss range. The previous 1.0 kg/wk cap implied a
 * 1,100 kcal/day deficit, outside both (M-219, audit F-04).
 */
export const MAX_RATE_KG_PER_WEEK = 0.75;
export const MIN_RATE_KG_PER_WEEK = 0.25;

/** Below this BMI, no weight-loss goal is offered at all. */
export const SEVERE_UNDERWEIGHT_BMI = 16;
export const UNDERWEIGHT_BMI = 18.5;

export type SafetyGoal = "lose" | "maintain" | "gain" | "recomp" | "general_health";

export interface SafetyInput {
  readonly ageYears: number | null;
  readonly bmi: number | null;
  readonly goal: SafetyGoal | null;
  /** Null means the question was never answered — not "no". */
  readonly pregnantOrBreastfeeding: boolean | null;
  readonly eatingDisorderHistory: boolean | null;
  readonly medicalConditions: readonly string[];
  readonly currentMedications: readonly string[];
  readonly unexplainedWeightChange: boolean | null;
  readonly symptoms: readonly string[];
  readonly requestedRateKgPerWeek: number | null;
  /** BMI at the person's stated target weight, when both are known.
   *  Null when there is no target weight to judge (M-219, audit F-03:
   *  the gates used to watch only where a person starts, never where
   *  the plan is taking them). */
  readonly targetBmi: number | null;
}

export const SAFETY_DISCLAIMER =
  "Bloom Vitalis is a wellness tool, not a medical device. Safety states describe what Bloom will show you, not a medical assessment.";

/**
 * M-219 (audit F-02): blocks used to be split into "absence" rules
 * (unanswered questions) and "substantive" rules, and an absence-only
 * block fell through to legacy body-profile targets in the day view
 * and plan generation. That routed the two most safety-critical
 * questions in the product around the gate by silence. The split is
 * retired: EVERY blocking finding is final in every consumer — no
 * targets and no plan exist until the classification is non-blocking.
 */
