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

  it("parses a stated food budget; a legacy state without one reads as no preference", () => {
    const withBudget = parseAssessmentState({
      version: 1,
      status: "complete",
      step: "summary",
      answers: { foodBudget: 2 },
      consents: [],
      startedAt: T0,
      completedAt: T2,
      updatedAt: T2,
    });
    expect(withBudget?.answers.foodBudget).toBe(2);

    /* States written before the budget question existed carry no
       foodBudget key at all. The version is unchanged, so they must
       parse cleanly — as no preference — with nothing else lost. */
    const legacy = parseAssessmentState({
      version: 1,
      status: "complete",
      step: "summary",
      answers: { dietaryPattern: "vegan", mealsPerDay: 3 },
      consents: [],
      startedAt: T0,
      completedAt: T2,
      updatedAt: T2,
    });
    expect(legacy?.answers.foodBudget).toBeNull();
    expect(legacy?.answers.dietaryPattern).toBe("vegan");
    expect(legacy?.answers.mealsPerDay).toBe(3);
  });

  it("drops a malformed food budget instead of repairing it", () => {
    for (const bad of [0, 4, 2.5, "2", true]) {
      const parsed = parseAssessmentState({
        version: 1,
        status: "in_progress",
        step: "nutrition",
        answers: { foodBudget: bad },
        consents: [],
        startedAt: T0,
        completedAt: null,
        updatedAt: T0,
      });
      expect(parsed?.answers.foodBudget).toBeNull();
    }
  });

  it("parses a stated cuisine preference; a legacy state without one reads as unanswered", () => {
    for (const value of ["north_indian", "south_indian", "both", "no_preference"] as const) {
      const parsed = parseAssessmentState({
        version: 1,
        status: "complete",
        step: "summary",
        answers: { cuisinePreference: value },
        consents: [],
        startedAt: T0,
        completedAt: T2,
        updatedAt: T2,
      });
      expect(parsed?.answers.cuisinePreference).toBe(value);
    }
    /* States written before the cuisine question existed carry no
       key at all — they parse as unanswered, nothing else lost. */
    const legacy = parseAssessmentState({
      version: 1,
      status: "complete",
      step: "summary",
      answers: { dietaryPattern: "eggetarian" },
      consents: [],
      startedAt: T0,
      completedAt: T2,
      updatedAt: T2,
    });
    expect(legacy?.answers.cuisinePreference).toBeNull();
    expect(legacy?.answers.dietaryPattern).toBe("eggetarian");
  });

  it("drops a malformed cuisine preference instead of repairing it", () => {
    for (const bad of ["international", "north", "INDIAN", 2, true]) {
      const parsed = parseAssessmentState({
        version: 1,
        status: "in_progress",
        step: "nutrition",
        answers: { cuisinePreference: bad },
        consents: [],
        startedAt: T0,
        completedAt: null,
        updatedAt: T0,
      });
      expect(parsed?.answers.cuisinePreference).toBeNull();
    }
  });

  it("parses the behavioural answers (§10) exactly as stated", () => {
    const parsed = parseAssessmentState({
      version: 1,
      status: "complete",
      step: "summary",
      answers: {
        waistCm: 88,
        cookingAbility: "basic",
        equipment: ["stove", "fridge"],
        prepTimeMaxMinutes: 20,
        eatingSetting: "hostel",
        hungerPattern: "evenings",
        cravings: ["chocolate", "chips"],
        cravingKinds: ["sweet", "salty"],
        emotionalEating: 4,
        pastAttempts: [
          { approach: "A low-carb diet", failureReasons: ["hunger", "social"] },
          { approach: "Intermittent fasting", failureReasons: [] },
        ],
        motivation: 3,
        confidence: 2,
      },
      consents: [],
      startedAt: T0,
      completedAt: T2,
      updatedAt: T2,
    });
    expect(parsed?.answers.waistCm).toBe(88);
    expect(parsed?.answers.cookingAbility).toBe("basic");
    expect(parsed?.answers.equipment).toEqual(["stove", "fridge"]);
    expect(parsed?.answers.prepTimeMaxMinutes).toBe(20);
    expect(parsed?.answers.eatingSetting).toBe("hostel");
    expect(parsed?.answers.hungerPattern).toBe("evenings");
    expect(parsed?.answers.cravings).toEqual(["chocolate", "chips"]);
    expect(parsed?.answers.cravingKinds).toEqual(["sweet", "salty"]);
    expect(parsed?.answers.emotionalEating).toBe(4);
    expect(parsed?.answers.pastAttempts).toEqual([
      { approach: "A low-carb diet", failureReasons: ["hunger", "social"] },
      { approach: "Intermittent fasting", failureReasons: [] },
    ]);
    expect(parsed?.answers.motivation).toBe(3);
    expect(parsed?.answers.confidence).toBe(2);
  });

  it("a legacy state without behavioural answers reads them all as unanswered", () => {
    const legacy = parseAssessmentState({
      version: 1,
      status: "complete",
      step: "summary",
      answers: { dietaryPattern: "eggetarian" },
      consents: [],
      startedAt: T0,
      completedAt: T2,
      updatedAt: T2,
    });
    expect(legacy?.answers.waistCm).toBeNull();
    expect(legacy?.answers.cookingAbility).toBeNull();
    expect(legacy?.answers.equipment).toEqual([]);
    expect(legacy?.answers.prepTimeMaxMinutes).toBeNull();
    expect(legacy?.answers.eatingSetting).toBeNull();
    expect(legacy?.answers.hungerPattern).toBeNull();
    expect(legacy?.answers.cravings).toEqual([]);
    expect(legacy?.answers.cravingKinds).toEqual([]);
    expect(legacy?.answers.emotionalEating).toBeNull();
    expect(legacy?.answers.pastAttempts).toEqual([]);
    expect(legacy?.answers.motivation).toBeNull();
    expect(legacy?.answers.confidence).toBeNull();
  });

  it("drops behavioural values that do not exist instead of repairing them", () => {
    const parsed = parseAssessmentState({
      version: 1,
      status: "in_progress",
      step: "behaviour",
      answers: {
        waistCm: 500,
        cookingAbility: "expert",
        equipment: ["stove", "air_fryer", "stove"],
        prepTimeMaxMinutes: 25,
        eatingSetting: "office",
        hungerPattern: "all_day",
        cravings: ["ok"],
        cravingKinds: ["sweet", "crunchy"],
        emotionalEating: 6,
        pastAttempts: [
          { approach: "  ", failureReasons: ["cost"] },
          { approach: "Keto", failureReasons: ["cost", "magic"] },
          { approach: "Juice cleanse", failureReasons: [] },
          { approach: "Fourth attempt — past the cap", failureReasons: [] },
          { approach: "Fifth — never reached", failureReasons: [] },
        ],
        motivation: 0,
        confidence: "high",
      },
      consents: [],
      startedAt: T0,
      completedAt: null,
      updatedAt: T0,
    });
    expect(parsed?.answers.waistCm).toBeNull();
    expect(parsed?.answers.cookingAbility).toBeNull();
    /* Unknown equipment drops; the valid item survives, de-duplicated. */
    expect(parsed?.answers.equipment).toEqual(["stove"]);
    /* 25 minutes is not one of the offered bands. */
    expect(parsed?.answers.prepTimeMaxMinutes).toBeNull();
    expect(parsed?.answers.eatingSetting).toBeNull();
    expect(parsed?.answers.hungerPattern).toBeNull();
    expect(parsed?.answers.cravingKinds).toEqual(["sweet"]);
    expect(parsed?.answers.emotionalEating).toBeNull();
    /* The blank-approach attempt is not an attempt; unknown reasons
       drop; the list caps at three. */
    expect(parsed?.answers.pastAttempts).toEqual([
      { approach: "Keto", failureReasons: ["cost"] },
      { approach: "Juice cleanse", failureReasons: [] },
      { approach: "Fourth attempt — past the cap", failureReasons: [] },
    ]);
    expect(parsed?.answers.motivation).toBeNull();
    expect(parsed?.answers.confidence).toBeNull();
  });

  it("a stated 'none' stands alone in equipment and craving kinds", () => {
    const parsed = parseAssessmentState({
      version: 1,
      status: "in_progress",
      step: "nutrition",
      answers: { equipment: ["none", "stove"], cravingKinds: ["none", "sweet"] },
      consents: [],
      startedAt: T0,
      completedAt: null,
      updatedAt: T0,
    });
    expect(parsed?.answers.equipment).toEqual(["none"]);
    expect(parsed?.answers.cravingKinds).toEqual(["none"]);
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

  it("maps the cuisine preference onto the profile's dietary profile", () => {
    const s = saveStep(answeredState(), { cuisinePreference: "south_indian" }, "summary", T1);
    expect(toHealthProfile(s, "user-1").dietary.cuisinePreference).toBe("south_indian");
    const unanswered = toHealthProfile(emptyAssessmentState(T0), "user-1");
    expect(unanswered.dietary.cuisinePreference).toBeNull();
  });

  it("maps the waist answer onto the profile's waist — the field that sat null", () => {
    const s = saveStep(answeredState(), { waistCm: 91 }, "summary", T1);
    const profile = toHealthProfile(s, "user-1");
    expect(profile.waist?.value).toEqual({ value: 91, unit: "cm" });
    expect(profile.waist?.provenance.source).toBe("user_reported");
    /* Unanswered stays null — the waist is never estimated. */
    expect(toHealthProfile(answeredState(), "user-1").waist).toBeNull();
  });

  it("maps the behavioural answers onto the profile's behavioural section", () => {
    const s = saveStep(
      answeredState(),
      {
        cookingAbility: "confident",
        equipment: ["stove", "pressure_cooker"],
        prepTimeMaxMinutes: 35,
        eatingSetting: "home",
        hungerPattern: "mornings",
        cravings: ["chai"],
        cravingKinds: ["sweet"],
        emotionalEating: 2,
        pastAttempts: [{ approach: "Keto", failureReasons: ["taste"] }],
        motivation: 4,
        confidence: 5,
      },
      "summary",
      T1,
    );
    expect(toHealthProfile(s, "user-1").behavioural).toEqual({
      cookingAbility: "confident",
      equipment: ["stove", "pressure_cooker"],
      prepTimeMaxMinutes: 35,
      eatingSetting: "home",
      hungerPattern: "mornings",
      cravings: ["chai"],
      cravingKinds: ["sweet"],
      emotionalEating: 2,
      pastAttempts: [{ approach: "Keto", failureReasons: ["taste"] }],
      motivation: 4,
      confidence: 5,
    });
    /* Unanswered folds to the empty section — nulls and empty lists. */
    expect(toHealthProfile(emptyAssessmentState(T0), "user-1").behavioural).toEqual({
      cookingAbility: null,
      equipment: [],
      prepTimeMaxMinutes: null,
      eatingSetting: null,
      hungerPattern: null,
      cravings: [],
      cravingKinds: [],
      emotionalEating: null,
      pastAttempts: [],
      motivation: null,
      confidence: null,
    });
  });

  it("maps the food budget onto the profile's dietary budget tier", () => {
    const s = saveStep(answeredState(), { foodBudget: 1 }, "summary", T1);
    expect(toHealthProfile(s, "user-1").dietary.budgetTier).toBe(1);
    /* Unanswered stays unanswered — no tier is invented. */
    expect(toHealthProfile(answeredState(), "user-1").dietary.budgetTier).toBeNull();
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
