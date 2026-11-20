// @vitest-environment jsdom
/**
 * HealthTools "Clear body data": pinned here —
 *   · the FIRST tap does not clear anything — it only arms the button
 *     ("Tap again to confirm") and states the true scope of the clear;
 *   · the SECOND tap is the one that clears: the body profile returns
 *     to defaults and every weigh-in is deleted;
 *   · walking away disarms — after four seconds the button is back to
 *     "Clear body data" and a tap re-arms instead of clearing.
 * Same two-tap pattern as sign-out-everywhere (SessionsSection).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

import { getPref, setPref } from "@/lib/prefs";
import { resetPrefCache } from "@/lib/prefsStore";
import {
  BODY_KEY,
  DEFAULT_BODY,
  WEIGHINS_KEY,
  parseBodyProfile,
  parseWeighIns,
  type BodyProfile,
  type WeighIn,
} from "@/lib/health/body";
import {
  ASSESSMENT_KEY,
  EMPTY_ANSWERS,
  type AssessmentState,
} from "@/lib/assessment/state";
import { HealthTools } from "./HealthTools";

const profile: BodyProfile = {
  ...DEFAULT_BODY,
  heightCm: 175,
  weightKg: 80,
  targetWeightKg: 75,
  age: 30,
  sex: "male",
  updatedAt: "2026-11-18T09:00:00.000Z",
};

const weighIns: WeighIn[] = [
  { date: "2026-11-10", kg: 81.2 },
  { date: "2026-11-17", kg: 80 },
];

function seed() {
  setPref(BODY_KEY, profile);
  setPref(WEIGHINS_KEY, weighIns);
  resetPrefCache();
}

beforeEach(() => {
  window.localStorage.clear();
  resetPrefCache();
  seed();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("HealthTools — Clear body data confirmation", () => {
  it("first tap arms only: nothing is cleared and the scope is stated", () => {
    render(<HealthTools />);
    const button = screen.getByRole("button", { name: /Clear body data/ });
    fireEvent.click(button);

    /* The stored record is untouched… */
    expect(getPref(BODY_KEY, parseBodyProfile, DEFAULT_BODY).heightCm).toBe(175);
    expect(getPref(WEIGHINS_KEY, parseWeighIns, [])).toHaveLength(2);
    /* …the weigh-ins are still on screen… */
    expect(screen.getByText("81.2 kg")).toBeTruthy();
    /* …the button is armed in the house wording… */
    expect(screen.getByRole("button", { name: /Tap again to confirm/ })).toBeTruthy();
    /* …and the scope line names what a second tap will do. */
    expect(screen.getByText(/deletes every weigh-in you have logged/)).toBeTruthy();
  });

  it("second tap clears: profile back to defaults, weigh-ins deleted", () => {
    render(<HealthTools />);
    fireEvent.click(screen.getByRole("button", { name: /Clear body data/ }));
    fireEvent.click(screen.getByRole("button", { name: /Tap again to confirm/ }));

    expect(getPref(BODY_KEY, parseBodyProfile, DEFAULT_BODY)).toEqual(DEFAULT_BODY);
    expect(getPref(WEIGHINS_KEY, parseWeighIns, [])).toEqual([]);
    /* With the profile reset, the ready view (and its weigh-in log) is gone. */
    expect(screen.queryByText("81.2 kg")).toBeNull();
    expect(screen.queryByRole("button", { name: /Clear body data/ })).toBeNull();
  });

  it("walking away disarms: after four seconds a tap re-arms, not clears", () => {
    vi.useFakeTimers();
    render(<HealthTools />);
    fireEvent.click(screen.getByRole("button", { name: /Clear body data/ }));
    expect(screen.getByRole("button", { name: /Tap again to confirm/ })).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.getByRole("button", { name: /Clear body data/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Clear body data/ }));
    expect(getPref(WEIGHINS_KEY, parseWeighIns, [])).toHaveLength(2);
    expect(screen.getByRole("button", { name: /Tap again to confirm/ })).toBeTruthy();
  });
});

/* Rider A (PR #210 sweep): the form's Goal dropdown must open on the
 * person's SAVED goal — the resolved profile the plan uses (Assessment
 * goal wins; the body goal only fills an Assessment that never stated
 * one) — not on whatever the body pref alone happens to hold. Live it
 * opened on "Gain weight" for a person whose saved goal is Lose. */
function seedAssessmentGoal(goal: "lose" | "gain"): void {
  const state: AssessmentState = {
    version: 1,
    status: "complete",
    step: "summary",
    answers: { ...EMPTY_ANSWERS, goal },
    consents: [],
    startedAt: null,
    completedAt: "2026-11-15T03:05:00.000Z",
    updatedAt: "2026-11-15T03:05:00.000Z",
  };
  setPref(ASSESSMENT_KEY, state);
  resetPrefCache();
}

function goalSelect(container: HTMLElement): HTMLSelectElement {
  const label = [...container.querySelectorAll("label.bt-field")].find(
    (l) => l.querySelector(".bt-field__label")?.textContent === "Goal",
  );
  if (!label) throw new Error("Goal field did not render");
  const select = label.querySelector("select");
  if (!select) throw new Error("Goal select did not render");
  return select as HTMLSelectElement;
}

describe("HealthTools — the Goal dropdown opens on the saved goal", () => {
  it("Assessment-only account: the saved Assessment goal, not the body default", () => {
    setPref(BODY_KEY, DEFAULT_BODY);
    resetPrefCache();
    seedAssessmentGoal("lose");
    const { container } = render(<HealthTools />);
    expect(goalSelect(container).value).toBe("lose");
  });

  it("the Assessment goal wins over a different stored body goal", () => {
    setPref(BODY_KEY, { ...profile, goal: "gain" });
    resetPrefCache();
    seedAssessmentGoal("lose");
    const { container } = render(<HealthTools />);
    fireEvent.click(screen.getByRole("button", { name: /Edit numbers/ }));
    expect(goalSelect(container).value).toBe("lose");
  });

  it("no Assessment goal: the body goal still fills the form", () => {
    setPref(BODY_KEY, { ...profile, goal: "gain" });
    resetPrefCache();
    const { container } = render(<HealthTools />);
    fireEvent.click(screen.getByRole("button", { name: /Edit numbers/ }));
    expect(goalSelect(container).value).toBe("gain");
  });
});
