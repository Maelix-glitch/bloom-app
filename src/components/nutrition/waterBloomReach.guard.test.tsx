// @vitest-environment jsdom
/**
 * M-165 — the water panel must stand in EVERY plan state.
 *
 * The panel used to render only inside the ready branch: the moment
 * the stored plan stopped matching today (or before any plan existed)
 * it existed nowhere in the app, and the Bloom — 2D or 3D — was
 * unreachable. These pins drive the real section through the real
 * state machine (real prefs, real engine, the house harness) and hold
 * the panel present in all three states, each time fed by the target
 * source that state honestly has:
 *
 *   ready        → the plan's own hydration target (as before)
 *   outdated     → the stored plan's hydration target
 *   can_generate → the resolved tracker target (planWaterTargetMlOf,
 *                  the same figure Trackers measures against)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
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
import { shiftDay, todayLocal } from "@/lib/localDay";
import {
  ASSESSMENT_KEY,
  EMPTY_ANSWERS,
  toHealthProfile,
  type AssessmentState,
} from "@/lib/assessment/state";
import { DEFAULT_BODY } from "@/lib/health/body";
import { planWaterTargetMlOf } from "@/lib/trackers/waterTarget";
import { generatePlan, writePlan } from "@/lib/nutrition";
import { toSafetyInput } from "@/lib/vitalis/domain/profile";
import { classifySafety } from "@/lib/vitalis/safety/classify";
import { targetsFor } from "@/lib/vitalis/calc/body";
import { NutritionPlanSection } from "./NutritionPlanSection";

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
        addListener: () => {},
        onchange: null,
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList);
  window.localStorage.clear();
  resetPrefCache();
});

const COMPLETE = {
  ageYears: 30,
  heightCm: 175,
  weightKg: 82,
  sex: "female" as const,
  goal: "lose" as const,
  activity: "light" as const,
  pregnantOrBreastfeeding: false,
  eatingDisorderHistory: false,
  unexplainedWeightChange: false,
};

function seedAssessment(): AssessmentState {
  const state: AssessmentState = {
    version: 1,
    status: "complete",
    step: "summary",
    answers: { ...EMPTY_ANSWERS, ...COMPLETE },
    consents: [],
    startedAt: "2026-11-10T03:00:00.000Z",
    completedAt: "2026-11-10T03:05:00.000Z",
    updatedAt: "2026-11-10T03:05:00.000Z",
  };
  setPref(ASSESSMENT_KEY, state);
  return state;
}

const litres = (ml: number) => (ml / 1000).toFixed(1);

describe("M-165 — the water panel stands in every plan state", () => {
  it("can_generate: the panel stands, fed by the resolved tracker target", () => {
    const state = seedAssessment();
    const { container } = render(<NutritionPlanSection />);
    expect(screen.getByRole("button", { name: "Create my plan" })).toBeTruthy();

    const scene = container.querySelector("[data-water-bloom]");
    expect(scene, "the water panel renders before any plan exists").not.toBeNull();

    const expected = planWaterTargetMlOf({
      assessmentState: state,
      bodyProfile: DEFAULT_BODY,
      today: todayLocal(),
    });
    expect(expected, "the resolver produces a figure for this fixture").not.toBeNull();
    expect(scene!.getAttribute("aria-label")).toContain(`of ${litres(expected!)} litres`);
  });

  it("outdated: the panel stands, fed by the stored plan's hydration target", () => {
    seedAssessment();
    const state: AssessmentState = {
      version: 1,
      status: "complete",
      step: "summary",
      answers: { ...EMPTY_ANSWERS, ...COMPLETE },
      consents: [],
      startedAt: null,
      completedAt: "2026-11-10T03:05:00.000Z",
      updatedAt: "2026-11-10T03:05:00.000Z",
    };
    const profile = toHealthProfile(state, "user-1");
    const safety = classifySafety(toSafetyInput(profile));
    const outcome = generatePlan({
      profile,
      safety,
      gatedOutcome: targetsFor(profile, safety, todayLocal()),
      fallbackTargets: null,
      foods: [],
      day: shiftDay(todayLocal(), -1),
      now: "2026-11-14T03:00:00.000Z",
      id: "plan-yesterday",
    });
    if (!outcome.ok) throw new Error("expected a plan");
    if (!outcome.plan.hydration) throw new Error("expected the plan to carry hydration");
    writePlan(outcome.plan);

    const { container } = render(<NutritionPlanSection />);
    expect(screen.getByText(/This plan was made for/)).toBeTruthy();

    const scene = container.querySelector("[data-water-bloom]");
    expect(scene, "the water panel renders beside yesterday's plan").not.toBeNull();
    expect(scene!.getAttribute("aria-label")).toContain(
      `of ${litres(outcome.plan.hydration.targetMl)} litres`,
    );
  });

  it("ready: the panel stands, fed by today's plan (the original contract)", async () => {
    seedAssessment();
    const { container } = render(<NutritionPlanSection />);
    fireEvent.click(screen.getByRole("button", { name: "Create my plan" }));
    await screen.findByRole("button", { name: /Suggest different meals/ }, { timeout: 4000 });
    expect(container.querySelector("[data-water-bloom]")).not.toBeNull();
  });
});
