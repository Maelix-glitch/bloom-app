// @vitest-environment jsdom
/**
 * The retake demotion, pinned at the door.
 *
 * Live defect (2026-11-14 sweep): a completed assessment lost its completed
 * status merely by opening the Retake sheet and closing it untouched — the
 * doors called a persisting retake() at click time, before the sheet even
 * opened. Opening a sheet is navigation, not a decision: the stored state
 * may only move when the person presses Begin inside the flow. These tests
 * drive the real Profile card + flow against the real prefs document.
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
        addListener: () => {},
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

describe("AssessmentProfileCard — retake never demotes on open", () => {
  it("open + close Retake untouched leaves the completed state byte-identical", () => {
    const done = completedState();
    seed(done);
    const before = window.localStorage.getItem(PREFS_KEY);

    render(<AssessmentProfileCard />);
    fireEvent.click(screen.getByRole("button", { name: "Retake" }));

    /* The sheet really opened — at the intro step, Begin on offer. */
    expect(screen.getByRole("button", { name: "Begin" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    /* Not one byte of the stored document moved… */
    expect(window.localStorage.getItem(PREFS_KEY)).toBe(before);
    expect(readAssessmentState()).toEqual(done);
    /* …and the card still reads the assessment as completed. (hidden: true —
       Radix's exit animation never finishes in jsdom, so the closed dialog
       lingers and keeps the page behind it aria-hidden.) */
    expect(screen.getByRole("button", { name: "Retake", hidden: true })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Continue assessment", hidden: true })).toBeNull();
  });

  it("pressing Begin in the retake sitting is what starts the retake", () => {
    const done = completedState();
    seed(done);

    render(<AssessmentProfileCard />);
    fireEvent.click(screen.getByRole("button", { name: "Retake" }));
    fireEvent.click(screen.getByRole("button", { name: "Begin" }));

    const now = readAssessmentState();
    expect(now.status).toBe("in_progress");
    expect(now.step).toBe("identity");
    /* The previous completion stands until the retake finishes. */
    expect(now.completedAt).toBe(T2);
    expect(now.answers).toEqual(done.answers);
    expect(screen.getByRole("heading", { name: "About you" })).toBeTruthy();
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
