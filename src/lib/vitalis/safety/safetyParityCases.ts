/**
 * The shared safety-parity case corpus (M-250, Engine Phase A).
 *
 * One bank of safety cases, two judges. Each case is a `SafetyInput`
 * plus the verdict BOTH implementations must return:
 *
 *   · the client classifier, `classifySafety` in `./classify.ts` —
 *     exercised by `safetyParity.test.ts` in vitest today;
 *   · the server mirror, `health_record_safety_event()` in
 *     `supabase/migrations/20261125_engine_phase_a_safety_parity.sql` —
 *     its critical constants are pinned statically by
 *     `serverSafetyParity.guard.test.ts` today, and this corpus is
 *     shaped so a future SQL runner can execute the same cases live.
 *
 * HOW A SQL RUNNER CONSUMES A CASE: store a profile whose age_years,
 * goal and rate_kg_per_week are the case's ageYears / goal /
 * requestedRateKgPerWeek; whose health_constraints carry
 * pregnantOrBreastfeeding, eatingDisorderHistory,
 * unexplainedWeightChange, conditions, medications and symptoms under
 * the same key names the 20261105 migration reads; and whose latest
 * height/weight/target_weight observations yield the case's bmi and
 * targetBmi (both sides round BMI to 1 decimal before gating, so any
 * height/weight pair producing the stated rounded BMI is equivalent).
 * Call the function and compare the same four verdict fields:
 * classification, blocking, requiresProfessionalReview, and the fired
 * rule ids in output order (class rank descending, then rule id).
 *
 * The expected verdicts below are the CLIENT classifier's law
 * (vitalis-safety-1.1.0) written out by hand from the rules in
 * `../domain/safety.ts` and `./classify.ts` — never generated from the
 * implementation, so a change on either side that alters a verdict
 * fails here instead of drifting silently. Cases 16 and 26 are the
 * M-243 census drift made concrete: the destination gate the server
 * lacked entirely, and a requested pace of exactly 1.0 kg/week, which
 * the retired server line let through and the client's 0.75 line
 * flags.
 */

import type { SafetyClass, SafetyInput, SafetyRuleId } from "../domain/safety";

export interface SafetyParityVerdict {
  readonly classification: SafetyClass;
  readonly blocking: boolean;
  readonly requiresProfessionalReview: boolean;
  /** Fired rule ids in output order: class rank descending, then id. */
  readonly firedRules: readonly SafetyRuleId[];
}

export interface SafetyParityCase {
  readonly name: string;
  readonly input: SafetyInput;
  readonly expected: SafetyParityVerdict;
}

const CLEAR: SafetyInput = {
  ageYears: 30,
  bmi: 24.4,
  goal: "maintain",
  pregnantOrBreastfeeding: false,
  eatingDisorderHistory: false,
  medicalConditions: [],
  currentMedications: [],
  unexplainedWeightChange: false,
  symptoms: [],
  requestedRateKgPerWeek: 0.5,
  targetBmi: null,
};

const input = (overrides: Partial<SafetyInput>): SafetyInput => ({ ...CLEAR, ...overrides });

const verdict = (
  classification: SafetyClass,
  blocking: boolean,
  requiresProfessionalReview: boolean,
  firedRules: readonly SafetyRuleId[],
): SafetyParityVerdict => ({ classification, blocking, requiresProfessionalReview, firedRules });

const STANDARD: SafetyParityVerdict = verdict("standard", false, false, []);

export const SAFETY_PARITY_CASES: readonly SafetyParityCase[] = [
  { name: "clear input is standard", input: CLEAR, expected: STANDARD },

  {
    name: "an urgent symptom escalates and blocks",
    input: input({ symptoms: ["chest_pain"] }),
    expected: verdict("urgent_escalation", true, true, ["urgent_symptom"]),
  },
  {
    name: "an urgent symptom outranks a review-level rule",
    input: input({ symptoms: ["severe_shortness_of_breath"], pregnantOrBreastfeeding: true }),
    expected: verdict("urgent_escalation", true, true, ["urgent_symptom", "pregnancy"]),
  },

  {
    name: "a missing age blocks as caution, never as an assumed adult",
    input: input({ ageYears: null }),
    expected: verdict("caution", true, false, ["age_missing"]),
  },
  {
    name: "under 18 requires professional review",
    input: input({ ageYears: 17 }),
    expected: verdict("professional_review_required", true, true, ["adult_only"]),
  },
  { name: "exactly 18 is an adult", input: input({ ageYears: 18 }), expected: STANDARD },

  {
    name: "pregnancy requires professional review",
    input: input({ pregnantOrBreastfeeding: true }),
    expected: verdict("professional_review_required", true, true, ["pregnancy"]),
  },
  {
    name: "an eating-disorder history requires professional review",
    input: input({ eatingDisorderHistory: true }),
    expected: verdict("professional_review_required", true, true, ["eating_disorder_history"]),
  },
  {
    name: "both safety answers unanswered block as one caution",
    input: input({ pregnantOrBreastfeeding: null, eatingDisorderHistory: null }),
    expected: verdict("caution", true, false, ["safety_answers_missing"]),
  },
  {
    name: "one unanswered safety question still blocks",
    input: input({ eatingDisorderHistory: null }),
    expected: verdict("caution", true, false, ["safety_answers_missing"]),
  },
  {
    name: "a missing age and unanswered questions stack, ordered by rule id within the class",
    input: input({ ageYears: null, pregnantOrBreastfeeding: null, eatingDisorderHistory: null }),
    expected: verdict("caution", true, false, ["age_missing", "safety_answers_missing"]),
  },

  {
    name: "a BMI under 16 is severe underweight whatever the goal",
    input: input({ bmi: 15.9, goal: "gain" }),
    expected: verdict("professional_review_required", true, true, ["severe_underweight"]),
  },
  {
    name: "a BMI of exactly 16 is not severe underweight",
    input: input({ bmi: 16.0 }),
    expected: STANDARD,
  },
  {
    name: "an underweight BMI with a lose goal requires review",
    input: input({ bmi: 18.4, goal: "lose" }),
    expected: verdict("professional_review_required", true, true, ["underweight_loss_goal"]),
  },
  {
    name: "an underweight BMI with a maintain goal is standard",
    input: input({ bmi: 18.4 }),
    expected: STANDARD,
  },
  {
    name: "a BMI of exactly 18.5 with a lose goal is standard",
    input: input({ bmi: 18.5, goal: "lose" }),
    expected: STANDARD,
  },

  {
    /* The destination gate (M-219 F-03) the 20261105 server mirror
       lacked entirely: the case the parity migration exists for. */
    name: "a lose goal aimed at an underweight target requires review",
    input: input({ goal: "lose", targetBmi: 18.4 }),
    expected: verdict("professional_review_required", true, true, ["underweight_target"]),
  },
  {
    name: "a target BMI of exactly 18.5 is a lawful destination",
    input: input({ goal: "lose", targetBmi: 18.5 }),
    expected: STANDARD,
  },
  {
    name: "an underweight target with a maintain goal is not judged as a destination",
    input: input({ targetBmi: 17.0 }),
    expected: STANDARD,
  },
  {
    name: "no target weight means no destination judgement",
    input: input({ goal: "lose", targetBmi: null }),
    expected: STANDARD,
  },

  {
    name: "a high-risk condition requires review and blocks",
    input: input({ medicalConditions: ["type_1_diabetes"] }),
    expected: verdict("professional_review_required", true, true, ["high_risk_condition"]),
  },
  {
    name: "a caution condition advises without blocking",
    input: input({ medicalConditions: ["type_2_diabetes"] }),
    expected: verdict("caution", false, false, ["medical_condition"]),
  },
  {
    name: "an unlisted condition advises without blocking",
    input: input({ medicalConditions: ["asthma"] }),
    expected: verdict("caution", false, false, ["medical_condition"]),
  },
  {
    name: "medication advises without blocking",
    input: input({ currentMedications: ["levothyroxine"] }),
    expected: verdict("caution", false, false, ["medication"]),
  },
  {
    name: "unexplained weight change requires review",
    input: input({ unexplainedWeightChange: true }),
    expected: verdict("professional_review_required", true, true, ["unexplained_weight_change"]),
  },

  {
    /* The corrected pace line: 0.76 kg/week is over the client's
       0.75 cap. The retired server line (1.0) let this through. */
    name: "a requested pace just over 0.75 kg/week is flagged, not blocked",
    input: input({ goal: "lose", requestedRateKgPerWeek: 0.76 }),
    expected: verdict("caution", false, false, ["aggressive_rate"]),
  },
  {
    name: "a requested pace of exactly 0.75 kg/week is at the cap, not over it",
    input: input({ goal: "lose", requestedRateKgPerWeek: 0.75 }),
    expected: STANDARD,
  },
  {
    /* The drift case, stated plainly: under the 20261105 server law
       this input produced NO finding; under the client's law — the
       law this corpus pins — it is flagged. */
    name: "a requested pace of 1.0 kg/week is flagged under the current law",
    input: input({ goal: "lose", requestedRateKgPerWeek: 1.0 }),
    expected: verdict("caution", false, false, ["aggressive_rate"]),
  },

  {
    name: "combined findings order by class rank, then rule id",
    input: input({
      eatingDisorderHistory: true,
      medicalConditions: ["type_1_diabetes", "asthma"],
      currentMedications: ["metformin"],
      requestedRateKgPerWeek: 2,
    }),
    expected: verdict("professional_review_required", true, true, [
      "eating_disorder_history",
      "high_risk_condition",
      "aggressive_rate",
      "medical_condition",
      "medication",
    ]),
  },
];
