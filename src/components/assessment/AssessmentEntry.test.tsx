// @vitest-environment jsdom
/**
 * The Profile card's doors, pinned.
 *
 * History: this file once pinned the retake demotion (2026-11-14 sweep:
 * a completed assessment lost its completed status merely by opening
 * the Retake sheet and closing it untouched). The Retake door itself
 * is gone now — owner directive 2026-11-16 removed the Retake button
 * from Profile; the flow's internal retake support remains, but no
 * door on this card offers it. What this file pins today: a completed
 * assessment offers "View summary" and no Retake; opening and closing
 * the summary is navigation, not a decision, and moves no stored byte;
 * a part-finished assessment still resumes at its stored step; and the
 * flow's meal-budget question (asked in the assessment, and only
 * there) renders with the eating-pattern question and stores its
 * answer — including "No preference", which stores null.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { PREFS_KEY, setPref } from "@/lib/prefs";
import { resetPrefCache } from "@/lib/prefsStore";
import { consentDecision } from "@/lib/vitalis/domain/consent";
import {
  ASSESSMENT_KEY,
  beginAssessment,
  completeAssessment,
  emptyAssessmentState,
  readAssessmentState,
  recordConsents,
  saveStep,
  type AssessmentState,
} from "@/lib/assessment/state";
import { AssessmentProfileCard } from "./AssessmentEntry";

/*
 * vitest runs with `globals: false`, so Testing Library's automatic
 * `afterEach(cleanup)` never registers — without this, each test renders
 * into the previous test's DOM.
 */
afterEach(cleanup);

/* jsdom ships no matchMedia, and BloomSheet asks it whether this is a phone. */
beforeEach(() => {
  window.matchMedia =
    window.matchMedia ??
    ((query: string) =>
      ({
        matches: false,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
        removeListener: () => {},
        onchange: null,
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList);
  window.localStorage.clear();
  resetPrefCache();
});

const T0 = "2026-11-10T10:00:00.000Z";
const T1 = "2026-11-10T10:05:00.000Z";
const T2 = "2026-11-12T09:30:00.000Z";

function completedState(): AssessmentState {
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
  return completeAssessment(s, T2);
}

function seed(state: AssessmentState): void {
  setPref(ASSESSMENT_KEY, state);
  resetPrefCache();
}

describe("AssessmentProfileCard — the Profile doors", () => {
  it("a completed assessment offers View summary and no Retake", () => {
    seed(completedState());
    render(<AssessmentProfileCard />);
    expect(screen.getByRole("button", { name: "View summary" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Retake" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Continue assessment" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Take the assessment" })).toBeNull();
  });

  it("open + close View summary untouched leaves the completed state byte-identical", () => {
    const done = completedState();
    seed(done);
    const before = window.localStorage.getItem(PREFS_KEY);

    render(<AssessmentProfileCard />);
    fireEvent.click(screen.getByRole("button", { name: "View summary" }));

    /* The summary really opened. */
    expect(screen.getByRole("heading", { name: "Your summary" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    /* Not one byte of the stored document moved. */
    expect(window.localStorage.getItem(PREFS_KEY)).toBe(before);
    expect(readAssessmentState()).toEqual(done);
  });

  it("a part-finished assessment still resumes at its stored step", () => {
    let s = beginAssessment(emptyAssessmentState(T0), T0);
    s = saveStep(s, { ageYears: 41, heightCm: 180 }, "safety", T1);
    seed(s);

    render(<AssessmentProfileCard />);
    fireEvent.click(screen.getByRole("button", { name: "Continue assessment" }));

    /* The sheet lands where the flow left off, state unmoved by opening. */
    expect(screen.getByRole("heading", { name: "Safety" })).toBeTruthy();
    const now = readAssessmentState();
    expect(now.status).toBe("in_progress");
    expect(now.step).toBe("safety");
    expect(now.answers.ageYears).toBe(41);
  });
});

describe("AssessmentFlow — the meal budget question", () => {
  function seedAtNutrition(foodBudget: 1 | 2 | 3 | null): void {
    let s = beginAssessment(emptyAssessmentState(T0), T0);
    s = saveStep(
      s,
      { dietaryPattern: "eggetarian", mealsPerDay: 3, foodBudget },
      "nutrition",
      T1,
    );
    seed(s);
  }

  it("renders beside the eating-pattern question, shows the stored answer, and stores a new one", () => {
    seedAtNutrition(3);
    render(<AssessmentProfileCard />);
    fireEvent.click(screen.getByRole("button", { name: "Continue assessment" }));

    /* Same step as the pattern question — "How you eat". */
    expect(screen.getByRole("heading", { name: "How you eat" })).toBeTruthy();
    expect(screen.getByRole("radiogroup", { name: "Eating pattern" })).toBeTruthy();
    expect(screen.getByText("What should your meal suggestions aim for?")).toBeTruthy();
    const budgetGroup = screen.getByRole("radiogroup", { name: "Meal budget" });
    expect(budgetGroup).toBeTruthy();
    /* The stored tier is the selected one. */
    expect(screen.getByRole("radio", { name: /No limit/ }).getAttribute("aria-checked")).toBe(
      "true",
    );

    fireEvent.click(screen.getByRole("radio", { name: /Moderate/ }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(readAssessmentState().answers.foodBudget).toBe(2);
  });

  it("“No preference” stores null — the honest unanswered", () => {
    seedAtNutrition(1);
    render(<AssessmentProfileCard />);
    fireEvent.click(screen.getByRole("button", { name: "Continue assessment" }));
    fireEvent.click(screen.getByRole("radio", { name: /No preference/ }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(readAssessmentState().answers.foodBudget).toBeNull();
  });

  it("continuing past the step without answering leaves the budget unanswered", () => {
    seedAtNutrition(null);
    render(<AssessmentProfileCard />);
    fireEvent.click(screen.getByRole("button", { name: "Continue assessment" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(readAssessmentState().answers.foodBudget).toBeNull();
  });
});
