import { describe, expect, it } from "vitest";

import { CONSENT_POLICY_VERSION, type ConsentRecord } from "./consent";
import { EMPTY_CONSTRAINTS, EMPTY_DIETARY, emptyProfile, type HealthProfile } from "./profile";
import { observation, type Provenance } from "./provenance";
import {
  VitalisValidationError,
  parseConsentRecords,
  parseHealthProfile,
  parseQuantity,
  parseSafetyInput,
  safeParseHealthProfile,
} from "./schema";
import { quantity, type Unit } from "./units";

const USER_REPORTED: Provenance = { source: "user_reported", recordedAt: "2026-01-01T08:00:00Z" };

const measurement = (value: number, unit: Unit) => observation(quantity(value, unit), USER_REPORTED);

function validProfile(): HealthProfile {
  return {
    ...emptyProfile("user-1", "2026-01-01T08:00:00Z"),
    ageYears: 30,
    sex: "female",
    height: measurement(175, "cm"),
    weight: measurement(82, "kg"),
    targetWeight: measurement(70, "kg"),
    goal: "lose",
    activity: "light",
    dietary: { ...EMPTY_DIETARY, pattern: "omnivore" },
    constraints: { ...EMPTY_CONSTRAINTS, pregnantOrBreastfeeding: false, eatingDisorderHistory: false },
  };
}

describe("health profile schema", () => {
  it("accepts a complete profile and returns the domain shape", () => {
    const profile = parseHealthProfile(validProfile());
    expect(profile.userId).toBe("user-1");
    expect(profile.weight?.value).toEqual({ value: 82, unit: "kg" });
  });

  it("keeps unanswered questions as null rather than filling defaults", () => {
    const profile = parseHealthProfile(emptyProfile("user-2", "2026-01-01T08:00:00Z"));
    expect(profile.ageYears).toBeNull();
    expect(profile.activity).toBeNull();
    expect(profile.constraints.pregnantOrBreastfeeding).toBeNull();
  });

  it("rejects a measurement whose unit has the wrong dimension", () => {
    const result = safeParseHealthProfile({ ...validProfile(), weight: measurement(82, "cm") });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toEqual([
        { path: "weight.value.unit", message: "weight must be a mass measurement, received length" },
      ]);
    }
  });

  it("rejects unknown keys instead of dropping them", () => {
    const result = safeParseHealthProfile({ ...validProfile(), calories: 1800 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues[0]?.path).toBe("");
  });

  it("rejects an invalid provenance confidence", () => {
    const result = safeParseHealthProfile({
      ...validProfile(),
      weight: {
        value: { value: 82, unit: "kg" },
        provenance: { source: "user_reported", recordedAt: "2026-01-01", confidence: 2 },
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues[0]?.path).toBe("weight.provenance.confidence");
  });

  it("throws a single error carrying every issue", () => {
    expect(() => parseHealthProfile({ ...validProfile(), ageYears: 500, rateKgPerWeek: -1 })).toThrow(
      VitalisValidationError,
    );
    try {
      parseHealthProfile({ ...validProfile(), ageYears: 500, rateKgPerWeek: -1 });
    } catch (error) {
      const issues = (error as VitalisValidationError).issues;
      expect(issues.map((issue) => issue.path)).toEqual(["ageYears", "rateKgPerWeek"]);
    }
  });

  it("validates consent records", () => {
    const records: ConsentRecord[] = [
      {
        purpose: "health_data_processing",
        state: "granted",
        policyVersion: CONSENT_POLICY_VERSION,
        decidedAt: "2026-01-01T08:00:00Z",
      },
    ];
    expect(parseConsentRecords(records)).toEqual(records);
    expect(() => parseConsentRecords([{ purpose: "marketing", state: "granted" }])).toThrow(
      VitalisValidationError,
    );
  });

  it("validates the safety input derived from a profile", () => {
    const input = parseSafetyInput({
      ageYears: 30,
      bmi: 26.8,
      goal: "lose",
      pregnantOrBreastfeeding: false,
      eatingDisorderHistory: false,
      medicalConditions: [],
      currentMedications: [],
      unexplainedWeightChange: false,
      symptoms: [],
      requestedRateKgPerWeek: 0.5,
    });
    expect(input.goal).toBe("lose");
    expect(() => parseSafetyInput({ ...input, symptoms: ["headache"] })).toThrow(VitalisValidationError);
  });

  it("validates a bare quantity", () => {
    expect(parseQuantity({ value: 82, unit: "kg" })).toEqual({ value: 82, unit: "kg" });
    expect(() => parseQuantity({ value: 82, unit: "stone" })).toThrow(VitalisValidationError);
  });
});
