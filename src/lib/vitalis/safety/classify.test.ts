import { describe, expect, it } from "vitest";

import { firedRules, classifySafety } from "./classify";
import { SAFETY_RULES_VERSION, type SafetyInput } from "../domain/safety";

const clear: SafetyInput = {
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
};

const withInput = (overrides: Partial<SafetyInput>): SafetyInput => ({ ...clear, ...overrides });

describe("safety classification", () => {
  it("returns standard when nothing fires", () => {
    const assessment = classifySafety(clear);
    expect(assessment.classification).toBe("standard");
    expect(assessment.findings).toEqual([]);
    expect(assessment.blocking).toBe(false);
    expect(assessment.rulesVersion).toBe(SAFETY_RULES_VERSION);
  });

  it("is pure and deterministic", () => {
    const input = withInput({ ageYears: 16, symptoms: ["chest_pain"] });
    expect(classifySafety(input)).toEqual(classifySafety(input));
  });

  it("treats urgent symptoms as the top state and names them plainly", () => {
    const assessment = classifySafety(withInput({ symptoms: ["chest_pain", "fainting"] }));
    expect(assessment.classification).toBe("urgent_escalation");
    expect(assessment.blocking).toBe(true);
    expect(assessment.findings[0]?.ruleId).toBe("urgent_symptom");
    expect(assessment.findings[0]?.summary).toContain("chest pain");
    expect(assessment.findings[0]?.summary).toContain("fainting");
  });

  it("does not let a lower rule outrank an urgent one", () => {
    const assessment = classifySafety(
      withInput({ symptoms: ["severe_shortness_of_breath"], pregnantOrBreastfeeding: true }),
    );
    expect(assessment.classification).toBe("urgent_escalation");
    expect(firedRules(assessment)).toContain("pregnancy");
  });

  it("blocks on a missing age rather than assuming an adult", () => {
    const assessment = classifySafety(withInput({ ageYears: null }));
    expect(assessment.classification).toBe("caution");
    expect(assessment.blocking).toBe(true);
    expect(firedRules(assessment)).toEqual(["age_missing"]);
  });

  it("requires professional review under 18", () => {
    const assessment = classifySafety(withInput({ ageYears: 16 }));
    expect(assessment.classification).toBe("professional_review_required");
    expect(assessment.requiresProfessionalReview).toBe(true);
    expect(assessment.blocking).toBe(true);
  });

  it("requires professional review for pregnancy and disordered-eating history", () => {
    expect(firedRules(classifySafety(withInput({ pregnantOrBreastfeeding: true })))).toContain("pregnancy");
    expect(firedRules(classifySafety(withInput({ eatingDisorderHistory: true })))).toContain(
      "eating_disorder_history",
    );
  });

  it("blocks when a safety question was never answered", () => {
    const assessment = classifySafety(withInput({ eatingDisorderHistory: null }));
    expect(assessment.blocking).toBe(true);
    expect(firedRules(assessment)).toEqual(["safety_answers_missing"]);
    expect(assessment.findings[0]?.summary).toContain("eating-disorder history");
  });

  it("refuses a loss goal below the healthy BMI range", () => {
    const loss = classifySafety(withInput({ bmi: 17.4, goal: "lose" }));
    expect(loss.classification).toBe("professional_review_required");
    expect(firedRules(loss)).toEqual(["underweight_loss_goal"]);

    const maintain = classifySafety(withInput({ bmi: 17.4, goal: "maintain" }));
    expect(maintain.classification).toBe("standard");
  });

  it("flags severe underweight regardless of goal", () => {
    expect(classifySafety(withInput({ bmi: 15.2, goal: "gain" })).classification).toBe(
      "professional_review_required",
    );
  });

  it("blocks on high-risk conditions and only advises on others", () => {
    const highRisk = classifySafety(withInput({ medicalConditions: ["type_1_diabetes"] }));
    expect(highRisk.classification).toBe("professional_review_required");
    expect(highRisk.blocking).toBe(true);

    const ordinary = classifySafety(withInput({ medicalConditions: ["asthma"] }));
    expect(ordinary.classification).toBe("caution");
    expect(ordinary.blocking).toBe(false);
    expect(ordinary.findings[0]?.summary).toContain("asthma");
  });

  it("advises on medication and on an aggressive pace without blocking", () => {
    const meds = classifySafety(withInput({ currentMedications: ["levothyroxine"] }));
    expect(meds.classification).toBe("caution");
    expect(meds.blocking).toBe(false);

    const fast = classifySafety(withInput({ requestedRateKgPerWeek: 1.5, goal: "lose" }));
    expect(fast.classification).toBe("caution");
    expect(fast.blocking).toBe(false);
    expect(firedRules(fast)).toEqual(["aggressive_rate"]);
  });

  it("requires review for unexplained weight change", () => {
    expect(classifySafety(withInput({ unexplainedWeightChange: true })).classification).toBe(
      "professional_review_required",
    );
  });

  it("orders findings by severity, then rule id", () => {
    const assessment = classifySafety(
      withInput({
        eatingDisorderHistory: true,
        medicalConditions: ["type_1_diabetes", "asthma"],
        currentMedications: ["metformin"],
        requestedRateKgPerWeek: 2,
      }),
    );
    const ranks = assessment.findings.map((finding) => finding.classification);
    expect(ranks.slice(0, 2)).toEqual(["professional_review_required", "professional_review_required"]);
    expect(ranks.at(-1)).toBe("caution");
    expect(firedRules(assessment)).toEqual([
      "eating_disorder_history",
      "high_risk_condition",
      "aggressive_rate",
      "medical_condition",
      "medication",
    ]);
  });

  it("never reports a probability or a diagnosis", () => {
    const assessment = classifySafety(withInput({ bmi: 15.2, symptoms: ["chest_pain"] }));
    for (const finding of assessment.findings) {
      expect(finding.summary).not.toMatch(/\d+\s?%/);
      expect(finding.summary.toLowerCase()).not.toContain("probability");
    }
  });
});
