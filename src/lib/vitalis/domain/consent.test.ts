import { describe, expect, it } from "vitest";

import {
  CONSENT_POLICY_VERSION,
  canUseFeature,
  consentDecision,
  consentState,
  hasConsent,
  missingConsents,
  type ConsentRecord,
} from "./consent";

const granted = (purpose: ConsentRecord["purpose"], policyVersion = CONSENT_POLICY_VERSION): ConsentRecord => ({
  purpose,
  state: "granted",
  policyVersion,
  decidedAt: "2026-01-01T10:00:00Z",
});

describe("consent", () => {
  it("reports not_asked when nothing was decided", () => {
    expect(consentState([], "health_data_processing")).toBe("not_asked");
    expect(hasConsent([], "health_data_processing")).toBe(false);
  });

  it("reports granted and withdrawn", () => {
    expect(consentState([granted("health_data_processing")], "health_data_processing")).toBe("granted");
    const withdrawn = consentDecision("health_data_processing", false, "2026-02-01T10:00:00Z");
    expect(consentState([granted("health_data_processing"), withdrawn], "health_data_processing")).toBe(
      "withdrawn",
    );
  });

  it("does not carry a grant across a policy version change", () => {
    const stale = granted("health_data_processing", "vitalis-consent-0.9.0");
    expect(consentState([stale], "health_data_processing")).toBe("not_asked");
    expect(consentState([stale], "health_data_processing", "vitalis-consent-0.9.0")).toBe("granted");
  });

  it("requires both health purposes before generating a plan", () => {
    expect(canUseFeature([granted("health_data_processing")], "plan_generation")).toBe(false);
    expect(
      missingConsents([granted("health_data_processing")], "plan_generation"),
    ).toEqual(["sensitive_health_processing"]);
    expect(
      canUseFeature(
        [granted("health_data_processing"), granted("sensitive_health_processing")],
        "plan_generation",
      ),
    ).toBe(true);
  });

  it("keeps AI narration separate from health processing", () => {
    const records = [granted("health_data_processing"), granted("sensitive_health_processing")];
    expect(canUseFeature(records, "ai_narration")).toBe(false);
    expect(missingConsents(records, "ai_narration")).toEqual(["ai_assistance"]);
  });

  it("records the decision with its timestamp and policy version", () => {
    expect(consentDecision("ai_assistance", true, "2026-01-01T10:00:00Z")).toEqual({
      purpose: "ai_assistance",
      state: "granted",
      policyVersion: CONSENT_POLICY_VERSION,
      decidedAt: "2026-01-01T10:00:00Z",
    });
  });
});
