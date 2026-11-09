import { describe, expect, it } from "vitest";

import {
  ASSESSMENT_SECTIONS,
  canGeneratePlan,
  completenessOf,
  hasBodyBaseline,
  missingSections,
} from "./assessment";
import { CONSENT_POLICY_VERSION, type ConsentRecord } from "./consent";
import { EMPTY_CONSTRAINTS, EMPTY_DIETARY, emptyProfile, type HealthProfile } from "./profile";
import { observation } from "./provenance";
import { quantity } from "./units";
import { classifySafety } from "../safety/classify";
import { toSafetyInput } from "./profile";
import type { SafetyAssessment } from "./safety";

const PROVENANCE = { source: "user_reported", recordedAt: "2026-01-01T08:00:00Z" } as const;

const consents: ConsentRecord[] = [
  {
    purpose: "health_data_processing",
    state: "granted",
    policyVersion: CONSENT_POLICY_VERSION,
    decidedAt: "2026-01-01T08:00:00Z",
  },
  {
    purpose: "sensitive_health_processing",
    state: "granted",
    policyVersion: CONSENT_POLICY_VERSION,
    decidedAt: "2026-01-01T08:00:00Z",
  },
];

function completeProfile(): HealthProfile {
  return {
    ...emptyProfile("user-1", "2026-01-01T08:00:00Z"),
    ageYears: 30,
    height: observation(quantity(175, "cm"), PROVENANCE),
    weight: observation(quantity(82, "kg"), PROVENANCE),
    goal: "maintain",
    activity: "moderate",
    dietary: { ...EMPTY_DIETARY, pattern: "vegetarian" },
    constraints: { ...EMPTY_CONSTRAINTS, pregnantOrBreastfeeding: false, eatingDisorderHistory: false },
  };
}

const clearSafety = (profile: HealthProfile): SafetyAssessment => classifySafety(toSafetyInput(profile));

describe("assessment completeness", () => {
  it("reports every required section as missing on a fresh profile", () => {
    const completeness = completenessOf(emptyProfile("user-1", "2026-01-01T08:00:00Z"), []);
    expect(completeness.sections.identity).toBe("missing");
    expect(completeness.sections.safety).toBe("missing");
    expect(completeness.sections.nutrition).toBe("missing");
    expect(completeness.sections.activity).toBe("missing");
    expect(missingSections(completeness)).toEqual(["identity", "goals", "safety", "nutrition", "activity"]);
    expect(Object.keys(completeness.sections)).toEqual([...ASSESSMENT_SECTIONS]);
  });

  it("treats partial identity honestly instead of rounding up", () => {
    const partial = {
      ...emptyProfile("user-1", "2026-01-01T08:00:00Z"),
      height: observation(quantity(175, "cm"), PROVENANCE),
    };
    expect(completenessOf(partial, []).sections.identity).toBe("partial");
  });

  it("needs both consent and answers for the safety section to be complete", () => {
    const profile = completeProfile();
    expect(completenessOf(profile, []).sections.safety).toBe("partial");
    expect(completenessOf(profile, consents.slice(0, 1)).sections.safety).toBe("partial");
    expect(completenessOf(profile, consents).sections.safety).toBe("complete");
  });

  it("does not accept a stale consent version", () => {
    const stale = consents.map((record) => ({ ...record, policyVersion: "vitalis-consent-0.9.0" }));
    expect(completenessOf(completeProfile(), stale).sections.safety).toBe("partial");
  });

  it("requires a target weight before a lose goal counts as answered", () => {
    const profile = completeProfile();
    const withGoal = { ...profile, goal: "lose" as const };
    expect(completenessOf(withGoal, consents).sections.goals).toBe("partial");
    const withTarget = {
      ...withGoal,
      targetWeight: observation(quantity(72, "kg"), PROVENANCE),
    };
    expect(completenessOf(withTarget, consents).sections.goals).toBe("complete");
  });

  it("allows a plan only when sections are complete and safety does not block", () => {
    const profile = completeProfile();
    const ready = canGeneratePlan(profile, consents, clearSafety(profile));
    expect(ready.ok).toBe(true);
    expect(ready.missing).toEqual([]);
    expect(ready.classification).toBe("standard");

    const blocked = canGeneratePlan(profile, consents, {
      ...clearSafety(profile),
      classification: "professional_review_required",
      blocking: true,
      findings: [
        {
          ruleId: "pregnancy",
          classification: "professional_review_required",
          summary: "test",
          blocking: true,
        },
      ],
    });
    expect(blocked.ok).toBe(false);
    expect(blocked.blockingFindings).toEqual(["pregnancy"]);
  });

  it("treats food preferences as optional", () => {
    const profile = completeProfile();
    expect(completenessOf(profile, consents).sections.preferences).toBe("missing");
    expect(canGeneratePlan(profile, consents, clearSafety(profile)).ok).toBe(true);
  });

  it("knows whether a BMI can be computed at all", () => {
    expect(hasBodyBaseline(completeProfile())).toBe(true);
    expect(hasBodyBaseline(emptyProfile("user-1", "2026-01-01T08:00:00Z"))).toBe(false);
  });
});
