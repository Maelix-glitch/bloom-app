/**
 * The client half of the shared safety-parity corpus (M-250).
 *
 * Every case in `safetyParityCases.ts` is run through the real client
 * classifier and must produce the hand-written expected verdict —
 * classification, blocking, professional-review flag, and the fired
 * rule ids in output order. The corpus is the contract the server
 * mirror is held to: the migration's constants are pinned against it
 * statically (serverSafetyParity.guard.test.ts), and the same cases
 * are shaped to run against the SQL live when a runner exists.
 */

import { describe, expect, it } from "vitest";

import { classifySafety, firedRules } from "./classify";
import { SAFETY_PARITY_CASES } from "./safetyParityCases";
import { SAFETY_RULES_VERSION } from "../domain/safety";

describe("safety parity corpus — the client classifier", () => {
  it("covers every registered rule id at least once", () => {
    const covered = new Set(SAFETY_PARITY_CASES.flatMap((c) => c.expected.firedRules));
    expect([...covered].sort()).toEqual([
      "adult_only",
      "age_missing",
      "aggressive_rate",
      "eating_disorder_history",
      "high_risk_condition",
      "medical_condition",
      "medication",
      "pregnancy",
      "safety_answers_missing",
      "severe_underweight",
      "underweight_loss_goal",
      "underweight_target",
      "unexplained_weight_change",
      "urgent_symptom",
    ]);
  });

  for (const parityCase of SAFETY_PARITY_CASES) {
    it(parityCase.name, () => {
      const assessment = classifySafety(parityCase.input);
      expect(assessment.classification).toBe(parityCase.expected.classification);
      expect(assessment.blocking).toBe(parityCase.expected.blocking);
      expect(assessment.requiresProfessionalReview).toBe(
        parityCase.expected.requiresProfessionalReview,
      );
      expect(firedRules(assessment)).toEqual([...parityCase.expected.firedRules]);
      expect(assessment.rulesVersion).toBe(SAFETY_RULES_VERSION);
    });
  }
});
