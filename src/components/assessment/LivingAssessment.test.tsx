// @vitest-environment jsdom
/**
 * Living Assessment on the Profile card: the "Since your assessment"
 * lines read from real weigh-ins, the staleness prompt fires on a
 * >3 kg drift, and the delta form records a small update as a dated
 * delta — the stored assessment itself byte-identical afterwards,
 * and no pattern or budget control anywhere in the form (those are
 * asked only inside the Assessment flow).
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { loadDoc, setPref } from "@/lib/prefs";
import { resetPrefCache } from "@/lib/prefsStore";
import { WEIGHINS_KEY } from "@/lib/health/body";
import { FOODLOG_KEY, foodLogValueOf } from "@/lib/nutrition/store";
import type { LogEntry } from "@/lib/nutrition/types";
import {
  ASSESSMENT_KEY,
  beginAssessment,
  completeAssessment,
  emptyAssessmentState,
  readAssessmentState,
  saveStep,
  type AssessmentState,
} from "@/lib/assessment/state";
import {
  ASSESSMENT_DELTA_KEY,
  parseAssessmentDeltaValue,
} from "@/lib/assessment/living";
import { AssessmentProfileCard } from "./AssessmentEntry";

afterEach(cleanup);

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

const T0 = "2026-10-01T07:00:00.000Z";
const COMPLETED = "2026-10-02T09:30:00.000Z";

function completedState(): AssessmentState {
  const begun = beginAssessment(emptyAssessmentState(T0), T0);
  const answered = saveStep(
    begun,
    {
      goal: "lose",
      dietaryPattern: "eggetarian",
      foodBudget: 2,
      weightKg: 100,
      activity: "moderate",
      sleepHoursTypical: 7,
      sleepQuality: "good",
      morningRestedness: 4,
    },
    "summary",
    T0,
  );
  return completeAssessment(answered, COMPLETED);
}

/** A minimal entry that survives the food log's strict parser. */
function logEntry(id: string, day: string): LogEntry {
  return {
    id,
    day,
    meal: "breakfast",
    source: "custom",
    name: "Oats",
    amount: { grams: 60 },
    nutrients: { kcal: 228, proteinG: 8, carbsG: 36, fatG: 4 },
    provenance: { kind: "user_entered", sourceId: "food-x", label: "Your value" },
    foodId: "food-x",
    snapshot: null,
    createdAt: `${day}T08:00:00.000Z`,
  } as unknown as LogEntry;
}

function seed(): void {
  setPref(ASSESSMENT_KEY, completedState());
  setPref(WEIGHINS_KEY, [{ date: "2026-11-12", kg: 96 }]);
  setPref(FOODLOG_KEY, foodLogValueOf([logEntry("e1", "2026-11-10"), logEntry("e2", "2026-11-12")]));
  resetPrefCache();
}

describe("LivingAssessmentSection — the Profile card", () => {
  it("shows grounded since-lines and the worth-updating prompt on a 4 kg drift", () => {
    seed();
    render(<AssessmentProfileCard />);
    expect(screen.getByText("Since your assessment")).toBeTruthy();
    expect(screen.getByText(/Weigh-in on .*96 kg — 4 kg below the 100 kg/)).toBeTruthy();
    expect(screen.getByText(/Food logged on 2 days since your assessment/)).toBeTruthy();
    expect(screen.getByText("Worth updating")).toBeTruthy();
  });

  it("the delta form has no pattern or budget control — Assessment-only fields", () => {
    seed();
    render(<AssessmentProfileCard />);
    fireEvent.click(screen.getByRole("button", { name: "Update weight, activity or sleep" }));
    expect(screen.queryByRole("radiogroup", { name: /pattern/i })).toBeNull();
    expect(screen.queryByRole("radiogroup", { name: /budget/i })).toBeNull();
    expect(screen.getByLabelText("Weight in kilograms")).toBeTruthy();
    expect(screen.getByRole("radiogroup", { name: "Activity level" })).toBeTruthy();
    expect(screen.getByRole("radiogroup", { name: "Sleep quality" })).toBeTruthy();
  });

  it("saving records a dated delta and leaves the stored assessment untouched", () => {
    seed();
    const before = readAssessmentState();
    render(<AssessmentProfileCard />);
    fireEvent.click(screen.getByRole("button", { name: "Update weight, activity or sleep" }));
    fireEvent.change(screen.getByLabelText("Weight in kilograms"), { target: { value: "95.5" } });
    fireEvent.click(screen.getByRole("button", { name: "Save update" }));

    const doc = loadDoc();
    const delta = parseAssessmentDeltaValue(doc[ASSESSMENT_DELTA_KEY]?.value)!;
    expect(delta.updates).toHaveLength(1);
    expect(delta.updates[0]!.changes).toEqual({ weightKg: 95.5 });
    expect(readAssessmentState()).toEqual(before);
    expect(readAssessmentState().answers.weightKg).toBe(100);
    /* The recorded update now reads back as a since-line. */
    expect(screen.getByText(/Updated on .*weight 95\.5 kg/)).toBeTruthy();
  });
});
