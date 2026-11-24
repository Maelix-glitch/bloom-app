// @vitest-environment jsdom
/**
 * The completion transition, pinned at Today's door.
 *
 * The owner's complaint (2026-11-15): finish the assessment and its card
 * simply leaves blank space. The host that now owns the slot must —
 *   · show the prompt card unchanged while the assessment is unfinished;
 *   · keep the flow's sheet alive across the completion flip, so the
 *     summary the flow lands on is actually readable (the prompt's old
 *     conditional render unmounted the sheet the moment the last step
 *     completed);
 *   · on the sheet's close, break the prompt card into orbs and fly the
 *     completed starting-point card into the freed slot, then settle;
 *   · show the settled card directly — no orbs, no flight — when the
 *     assessment was already complete at mount;
 *   · skip the show entirely under reduced motion;
 *   · show no target numbers on the settled card when the safety gate
 *     blocks them, exactly as the Nutrition tab refuses them.
 *
 * These tests drive the real Today card + flow against the real prefs
 * document, the same way AssessmentEntry.test.tsx drives Profile's.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

/* The house pattern (NutritionPage.test.tsx): the router's Link is a
   plain anchor outside a RouterProvider, and the session is fixed. */
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    ...rest
  }: {
    to: string;
    children: React.ReactNode;
  }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/hooks/useSession", () => ({
  useSession: () => ({ userId: "user-1", ready: true }),
}));

import { setPref } from "@/lib/prefs";
import { resetPrefCache } from "@/lib/prefsStore";
import { consentDecision } from "@/lib/vitalis/domain/consent";
import {
  ASSESSMENT_KEY,
  beginAssessment,
  completeAssessment,
  emptyAssessmentState,
  recordConsents,
  saveStep,
  type AssessmentAnswers,
  type AssessmentState,
} from "@/lib/assessment/state";
import { AssessmentPromptCard } from "./AssessmentEntry";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

/* The reduced-motion answer this test file's matchMedia stub gives;
   BloomSheet's phone query always answers false. */
let reducedMotion = false;

beforeEach(() => {
  reducedMotion = false;
  window.matchMedia = ((query: string) =>
    ({
      matches: query.includes("prefers-reduced-motion") ? reducedMotion : false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
  window.localStorage.clear();
  resetPrefCache();
});

const T0 = "2026-11-10T10:00:00.000Z";
const T1 = "2026-11-10T10:05:00.000Z";
const T2 = "2026-11-12T09:30:00.000Z";

const FULL_ANSWERS = {
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
} as const;

function begun(): AssessmentState {
  let s = beginAssessment(emptyAssessmentState(T0), T0);
  s = recordConsents(
    s,
    [
      consentDecision("health_data_processing", true, T0),
      consentDecision("sensitive_health_processing", true, T0),
    ],
    T0,
  );
  return s;
}

function completedState(patch: Partial<AssessmentAnswers> = {}): AssessmentState {
  const s = saveStep(begun(), { ...FULL_ANSWERS, ...patch }, "summary", T1);
  return completeAssessment(s, T2);
}

/** Part-finished, parked on the last question step — one Finish tap away. */
function activityState(): AssessmentState {
  return saveStep(begun(), { ...FULL_ANSWERS }, "activity", T1);
}

function seed(state: AssessmentState): void {
  setPref(ASSESSMENT_KEY, state);
  resetPrefCache();
}

const settledSection = (container: HTMLElement) =>
  container.querySelector('section[aria-labelledby="home-starting-point-title"]');

describe("AssessmentPromptCard, the unfinished states are untouched", () => {
  it("not started: the invitation card, exactly as before", () => {
    const { container } = render(<AssessmentPromptCard />);
    expect(screen.getByRole("heading", { name: "A short assessment, when you are ready" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Begin" })).toBeTruthy();
    expect(settledSection(container)).toBeNull();
    expect(container.querySelectorAll(".assess-orb")).toHaveLength(0);
  });

  it("part-finished: the resume card with its progress, exactly as before", () => {
    seed(activityState());
    const { container } = render(<AssessmentPromptCard />);
    expect(screen.getByRole("heading", { name: "Your assessment is part-finished" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Continue" })).toBeTruthy();
    expect(screen.getByRole("progressbar", { name: "Assessment sections completed" })).toBeTruthy();
    expect(settledSection(container)).toBeNull();
  });
});

describe("AssessmentPromptCard, already complete at mount", () => {
  it("shows the settled starting-point card directly: goal, targets, plan status, no show", () => {
    seed(completedState());
    const { container } = render(<AssessmentPromptCard />);

    const section = settledSection(container);
    expect(section).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Your starting point" })).toBeTruthy();
    expect(section!.textContent).toContain("Your goal: lose weight.");
    /* The engine's own numbers, in the card's estimates framing.
       Grouped since v6 §1.4 (M-119): fmtKcalApprox renders "~1,900 kcal",
       so the pin admits the separator it previously forbade by omission. */
    expect(section!.textContent).toMatch(/~[\d,]+ kcal/);
    expect(section!.textContent).toMatch(/\d+ g protein/);
    expect(section!.textContent).toContain("a guide, not a prescription");
    /* No plan stored yet — the plan hook's own verdict. */
    expect(section!.textContent).toContain(
      "No plan yet. Bloom can compose one from these numbers in Nutrition.",
    );
    /* No celebration on a fresh load. */
    expect(container.querySelectorAll(".assess-orb")).toHaveLength(0);
    expect(container.querySelector(".assess-ghost")).toBeNull();
    expect(container.querySelector(".assess-fly")).toBeNull();
  });

  it("safety-blocked: the settled card carries no target numbers and no plan push", () => {
    seed(completedState({ eatingDisorderHistory: true }));
    const { container } = render(<AssessmentPromptCard />);

    const section = settledSection(container);
    expect(section).not.toBeNull();
    expect(section!.textContent).toContain(
      "Your safety answers mean Bloom doesn't set calorie targets for you.",
    );
    expect(section!.textContent).not.toMatch(/kcal/);
    expect(section!.textContent).not.toContain("No plan yet");
    expect(section!.textContent).not.toContain("plan is composed");
  });
});

describe("AssessmentPromptCard, the completion moment", () => {
  it("finishing from Today's flow: the summary survives, then orbs break and the card flies in and settles", () => {
    vi.useFakeTimers();
    seed(activityState());
    const { container } = render(<AssessmentPromptCard />);

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Finish" }));

    /* The sheet is still open on its summary — completing the last step
       did not unmount it — and behind it the celebration is only waiting. */
    expect(screen.getByRole("button", { name: "Done" })).toBeTruthy();
    expect(container.querySelectorAll(".assess-orb")).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Done" }));

    /* The break: the ghost of the prompt card, the orb constellation,
       and the starting-point card mid-flight, all in the freed slot. */
    expect(container.querySelector(".assess-ghost")).not.toBeNull();
    expect(container.querySelectorAll(".assess-orb")).toHaveLength(12);
    const flying = settledSection(container);
    expect(flying).not.toBeNull();
    expect(flying!.className).toContain("assess-fly");

    act(() => {
      vi.advanceTimersByTime(900);
    });

    /* Settled: the show is over and the card simply stands there. */
    expect(container.querySelectorAll(".assess-orb")).toHaveLength(0);
    expect(container.querySelector(".assess-ghost")).toBeNull();
    const settled = settledSection(container);
    expect(settled).not.toBeNull();
    expect(settled!.className).not.toContain("assess-fly");
    expect(settled!.textContent).toContain("Your goal: lose weight.");
  });

  it("reduced motion: finishing swaps straight to the settled card, no orbs, no flight", () => {
    reducedMotion = true;
    seed(activityState());
    const { container } = render(<AssessmentPromptCard />);

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Finish" }));
    fireEvent.click(screen.getByRole("button", { name: "Done" }));

    const settled = settledSection(container);
    expect(settled).not.toBeNull();
    expect(settled!.textContent).toContain("Your goal: lose weight.");
    expect(container.querySelectorAll(".assess-orb")).toHaveLength(0);
    expect(container.querySelector(".assess-ghost")).toBeNull();
    expect(container.querySelector(".assess-fly")).toBeNull();
  });
});
