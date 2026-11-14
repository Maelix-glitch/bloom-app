import { describe, expect, it } from "vitest";

import { consentDecision } from "@/lib/vitalis/domain/consent";
import { completenessOf } from "@/lib/vitalis/domain/assessment";
import {
  EMPTY_ANSWERS,
  beginAssessment,
  completeAssessment,
  emptyAssessmentState,
  parseAssessmentState,
  recordConsents,
  restartAssessment,
  saveStep,
  shouldShowAssessmentPrompt,
  toHealthProfile,
  type AssessmentState,
} from "./state";

const T0 = "2026-11-10T10:00:00.000Z";
const T1 = "2026-11-10T10:05:00.000Z";
const T2 = "2026-11-10T10:10:00.000Z";

function answeredState(): AssessmentState {
  let s = beginAssessment(emptyAssessmentState(T0), T0);
  s = saveStep(
    s,
    {
      ageYears: 34,
      heightCm: 172,
      weightKg: 74,
      goal: "lose",
      targetWeightKg: 68,
      rateKgPerWeek: 0.5,
    },
    "safety",
    T1,
  );
  s = saveStep(
    s,
    {
      pregnantOrBreastfeeding: false,
      eatingDisorderHistory: false,
      unexplainedWeightChange: false,
      dietaryPattern: "vegetarian",
      mealsPerDay: 3,
      activity: "moderate",
      sleepHoursTypical: 7,
      sleepQuality: "good",
      morningRestedness: 4,
    },
    "summary",
    T1,
  );
  return s;
}

describe("parseAssessmentState", () => {
  it("round-trips a state it wrote", () => {
    const s = completeAssessment(answeredState(), T2);
    expect(parseAssessmentState(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });

  it("returns null for junk and for a future version", () => {
    expect(parseAssessmentState(null)).toBeNull();
    expect(parseAssessmentState("nope")).toBeNull();
    expect(parseAssessmentState({ version: 99 })).toBeNull();
    expect(parseAssessmentState({ version: 1, status: "sideways" })).toBeNull();
  });

  it("drops out-of-range and unknown values instead of trusting storage", () => {
    const parsed = parseAssessmentState({
      version: 1,
      status: "in_progress",
      step: "safety",
      answers: {
        ageYears: 400,
        heightCm: 172,
        goal: "fly",
        symptoms: ["chest_pain", "laser_eyes"],
        dietaryPattern: "carnivore",
      },
      consents: [],
      startedAt: T0,
      completedAt: null,
      updatedAt: T0,
    });
    expect(parsed?.answers.ageYears).toBeNull();
    expect(parsed?.answers.heightCm).toBe(172);
    expect(parsed?.answers.goal).toBeNull();
    expect(parsed?.answers.symptoms).toEqual(["chest_pain"]);
    expect(parsed?.answers.dietaryPattern).toBeNull();
  });
});

describe("transitions", () => {
  it("begin seeds blanks only, and starts at identity", () => {
    const s = beginAssessment(emptyAssessmentState(), T0, {
      heightCm: 180,
      weightKg: 80,
    });
    expect(s.status).toBe("in_progress");
    expect(s.step).toBe("identity");
    expect(s.startedAt).toBe(T0);
    expect(s.answers.heightCm).toBe(180);

    const again = beginAssessment({ ...s, answers: { ...s.answers, heightCm: 171 } }, T1, {
      heightCm: 180,
    });
    expect(again.answers.heightCm).toBe(171);
  });

  it("saveStep merges answers and records the resume step", () => {
    const s = saveStep(emptyAssessmentState(T0), { ageYears: 41 }, "goals", T1);
    expect(s.status).toBe("in_progress");
    expect(s.step).toBe("goals");
    expect(s.answers.ageYears).toBe(41);
    expect(s.updatedAt).toBe(T1);
  });

  it("complete stamps completedAt; beginning again keeps it until the new run finishes", () => {
    const done = completeAssessment(answeredState(), T2);
    expect(done.status).toBe("complete");
    expect(done.completedAt).toBe(T2);

    /* A retake is a begin() from the completed state — the only transition
       that may demote it, and it runs from the flow's Begin button, never
       when a sheet opens. completedAt and the answers survive until the
       new run completes. */
    const again = saveStep(
      beginAssessment(done, "2026-11-12T09:00:00.000Z"),
      done.answers,
      "identity",
      "2026-11-12T09:00:00.000Z",
    );
    expect(again.status).toBe("in_progress");
    expect(again.completedAt).toBe(T2);
    expect(again.answers).toEqual(done.answers);
  });

  it("restart clears answers but keeps consent decisions", () => {
    let s = recordConsents(
      answeredState(),
      [consentDecision("health_data_processing", true, T1)],
      T1,
    );
    s = restartAssessment(completeAssessment(s, T2), "2026-11-12T09:00:00.000Z");
    expect(s.answers).toEqual(EMPTY_ANSWERS);
    expect(s.consents).toHaveLength(1);
    expect(s.completedAt).toBeNull();
  });
});

describe("toHealthProfile", () => {
  it("maps answers onto the domain profile with provenance, nulls intact", () => {
    const done = completeAssessment(answeredState(), T2);
    const profile = toHealthProfile(done, "user-1");
    expect(profile.ageYears).toBe(34);
    expect(profile.height?.value).toEqual({ value: 172, unit: "cm" });
    expect(profile.height?.provenance.source).toBe("user_reported");
    expect(profile.height?.provenance.method).toBe("vitalis-assessment");
    expect(profile.goal).toBe("lose");
    expect(profile.targetWeight?.value).toEqual({ value: 68, unit: "kg" });
    expect(profile.dietary.pattern).toBe("vegetarian");
    expect(profile.constraints.pregnantOrBreastfeeding).toBe(false);
    /* sleep answers are an extension — they must not leak into the profile */
    expect(JSON.stringify(profile)).not.toContain("sleepHoursTypical");
  });

  it("keeps unanswered as null, never a default", () => {
    const profile = toHealthProfile(emptyAssessmentState(T0), "user-1");
    expect(profile.ageYears).toBeNull();
    expect(profile.height).toBeNull();
    expect(profile.goal).toBeNull();
    expect(profile.rateKgPerWeek).toBe(0.5);
  });

  it("domain completeness sees the mapped profile the way the flow intends", () => {
    let s = recordConsents(
      answeredState(),
      [
        consentDecision("health_data_processing", true, T1),
        consentDecision("sensitive_health_processing", true, T1),
      ],
      T1,
    );
    s = completeAssessment(s, T2);
    const completeness = completenessOf(toHealthProfile(s, "user-1"), s.consents);
    expect(completeness.sections.identity).toBe("complete");
    expect(completeness.sections.goals).toBe("complete");
    expect(completeness.sections.safety).toBe("complete");
    expect(completeness.sections.nutrition).toBe("complete");
    expect(completeness.sections.activity).toBe("complete");
  });
});

describe("shouldShowAssessmentPrompt", () => {
  it("shows before start, hides when complete or freshly dismissed", () => {
    const fresh = emptyAssessmentState(T0);
    expect(shouldShowAssessmentPrompt(fresh, { dismissedAt: null })).toBe(true);
    expect(shouldShowAssessmentPrompt(fresh, { dismissedAt: T1 })).toBe(false);
    expect(
      shouldShowAssessmentPrompt(completeAssessment(answeredState(), T2), { dismissedAt: null }),
    ).toBe(false);
  });

  it("returns once for an in-progress assessment worked on after dismissal", () => {
    const inProgress = saveStep(emptyAssessmentState(T0), { ageYears: 30 }, "goals", T2);
    expect(shouldShowAssessmentPrompt(inProgress, { dismissedAt: T1 })).toBe(true);
  });
});
