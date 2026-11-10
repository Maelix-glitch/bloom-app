import { describe, expect, it } from "vitest";

import { consentDecision } from "@/lib/vitalis/domain/consent";
import {
  beginAssessment,
  completeAssessment,
  emptyAssessmentState,
  recordConsents,
  saveStep,
  type AssessmentState,
} from "./state";
import { summaryOf } from "./summary";

const T0 = "2026-11-10T10:00:00.000Z";
const T1 = "2026-11-10T10:05:00.000Z";
const T2 = "2026-11-10T10:10:00.000Z";

function completedFull(): AssessmentState {
  let s = beginAssessment(emptyAssessmentState(T0), T0);
  s = recordConsents(
    s,
    [
      consentDecision("health_data_processing", true, T0),
      consentDecision("sensitive_health_processing", true, T0),
    ],
    T0,
  );
  s = saveStep(
    s,
    {
      ageYears: 34,
      heightCm: 172,
      weightKg: 74,
      goal: "lose",
      targetWeightKg: 68,
      rateKgPerWeek: 0.5,
      pregnantOrBreastfeeding: false,
      eatingDisorderHistory: false,
      unexplainedWeightChange: false,
      takesMedication: false,
      dietaryPattern: "vegetarian",
      mealsPerDay: 3,
      allergies: ["peanuts"],
      activity: "moderate",
      sleepHoursTypical: 7,
      sleepQuality: "good",
      morningRestedness: 4,
    },
    "summary",
    T1,
  );
  return completeAssessment(s, T2);
}

describe("summaryOf", () => {
  it("is null until the assessment has been completed once", () => {
    expect(summaryOf(emptyAssessmentState(T0))).toBeNull();
    expect(summaryOf(beginAssessment(emptyAssessmentState(T0), T0))).toBeNull();
  });

  it("reads the answers back accurately, per section", () => {
    const summary = summaryOf(completedFull());
    expect(summary).not.toBeNull();
    const bySection = Object.fromEntries(summary!.sections.map((s) => [s.section, s]));
    expect(bySection["identity"]?.lines).toContain("Age 34.");
    expect(bySection["identity"]?.lines).toContain("Height 172 cm.");
    expect(bySection["goals"]?.lines).toContain("Target weight 68 kg.");
    expect(bySection["nutrition"]?.lines).toContain("You eat vegetarian.");
    expect(bySection["preferences"]?.lines).toContain("Allergies: peanuts.");
    expect(bySection["sleep"]?.lines).toContain("You usually sleep about 7 hours.");
    expect(bySection["sleep"]?.state).toBe("complete");
    expect(bySection["activity"]?.state).toBe("complete");
  });

  it("labels BMI as calculated from what was entered", () => {
    const summary = summaryOf(completedFull());
    expect(summary?.bmi).toBeCloseTo(25.0, 0);
    const identity = summary?.sections.find((s) => s.section === "identity");
    expect(identity?.lines.some((l) => l.includes("calculated from the height and weight"))).toBe(
      true,
    );
  });

  it("a full, unblocked assessment is plan-ready", () => {
    const summary = summaryOf(completedFull());
    expect(summary?.safety.classification).toBe("standard");
    expect(summary?.plan.ready).toBe(true);
    expect(summary?.plan.missing).toEqual([]);
  });

  it("missing answers are reported as missing, in the domain's words", () => {
    let s = beginAssessment(emptyAssessmentState(T0), T0);
    s = saveStep(s, { dietaryPattern: "vegan" }, "summary", T1);
    s = completeAssessment(s, T2);
    const summary = summaryOf(s);
    expect(summary?.plan.ready).toBe(false);
    expect(summary?.plan.missing).toContain("Height, weight and age");
    expect(summary?.plan.missing).toContain("Safety questions");
    /* an unanswered safety question blocks via the classifier, in its copy */
    expect(summary?.safety.findings.some((f) => f.includes("can't confirm"))).toBe(true);
  });

  it("a blocking safety answer surfaces the classifier's copy, unedited", () => {
    let s = beginAssessment(emptyAssessmentState(T0), T0);
    s = saveStep(
      s,
      {
        ageYears: 29,
        heightCm: 165,
        weightKg: 60,
        goal: "maintain",
        pregnantOrBreastfeeding: true,
        eatingDisorderHistory: false,
      },
      "summary",
      T1,
    );
    s = completeAssessment(s, T2);
    const summary = summaryOf(s);
    expect(summary?.safety.classification).toBe("professional_review_required");
    expect(summary?.plan.ready).toBe(false);
    expect(summary?.plan.note).toBe(summary?.safety.headline);
    expect(summary?.safety.findings.some((f) => f.includes("pregnancy"))).toBe(true);
  });

  it("urgent symptoms escalate in the summary", () => {
    let s = beginAssessment(emptyAssessmentState(T0), T0);
    s = saveStep(s, { symptoms: ["chest_pain"] }, "summary", T1);
    s = completeAssessment(s, T2);
    const summary = summaryOf(s);
    expect(summary?.safety.classification).toBe("urgent_escalation");
    expect(summary?.safety.findings[0]).toContain("emergency or urgent care");
  });

  it("never invents lines for unanswered sections", () => {
    let s = beginAssessment(emptyAssessmentState(T0), T0);
    s = completeAssessment(s, T2);
    const summary = summaryOf(s);
    const activity = summary?.sections.find((sec) => sec.section === "activity");
    expect(activity?.state).toBe("missing");
    expect(activity?.lines).toEqual([]);
    expect(summary?.bmi).toBeNull();
  });
});
