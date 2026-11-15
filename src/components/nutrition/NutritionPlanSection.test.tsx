// @vitest-environment jsdom
/**
 * Nutrition P1 — the plan section, driven against the real prefs document
 * and the real engine: the insufficiency refusal naming what's missing,
 * the safety refusal in the classifier's own words, explicit generation,
 * and logging a suggestion into the food log as a `plan`-sourced entry
 * with the food's provenance intact.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

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
import { shiftDay, todayLocal } from "@/lib/localDay";
import {
  ASSESSMENT_KEY,
  EMPTY_ANSWERS,
  type AssessmentState,
} from "@/lib/assessment/state";
import {
  generatePlan,
  readFoodLog,
  writePlan,
  type Food,
} from "@/lib/nutrition";
import { toHealthProfile } from "@/lib/assessment/state";
import { toSafetyInput } from "@/lib/vitalis/domain/profile";
import { classifySafety } from "@/lib/vitalis/safety/classify";
import { targetsFor } from "@/lib/vitalis/calc/body";
import { NutritionPlanSection } from "./NutritionPlanSection";
import { MEAL_LABEL } from "./input";

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

function seedAssessment(answers: Partial<AssessmentState["answers"]>): void {
  const state: AssessmentState = {
    version: 1,
    status: "complete",
    step: "summary",
    answers: { ...EMPTY_ANSWERS, ...answers },
    consents: [],
    startedAt: "2026-11-10T03:00:00.000Z",
    completedAt: "2026-11-10T03:05:00.000Z",
    updatedAt: "2026-11-10T03:05:00.000Z",
  };
  setPref(ASSESSMENT_KEY, state);
}

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

describe("NutritionPlanSection", () => {
  it("refuses plainly when nothing is known, naming what is missing", () => {
    render(<NutritionPlanSection />);
    expect(screen.getByText(/Not enough to build a plan/)).toBeTruthy();
    /* The goal is not missing here: the body profile's stored goal (its
       default, maintain — the same default Trackers computes from) fills
       it, exactly as the Assessment's own seeding does. The engine's
       null-goal refusal is pinned in the lib tests. */
    expect(screen.getByText("your age")).toBeTruthy();
    expect(screen.getByText("your height")).toBeTruthy();
    expect(screen.getByText("your weight")).toBeTruthy();
    expect(screen.getByText("your activity level")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Create my plan/ })).toBeNull();
  });

  it("refuses on a substantive safety answer, in the classifier's words", () => {
    seedAssessment({ ...COMPLETE, eatingDisorderHistory: true });
    render(<NutritionPlanSection />);
    expect(screen.getByText(/won't build a diet plan/)).toBeTruthy();
    expect(screen.getByText(/history of disordered eating/)).toBeTruthy();
    expect(screen.getByText(/qualified professional/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Create my plan/ })).toBeNull();
  });

  it("creates a plan on the explicit tap and logs a suggestion as a plan entry", () => {
    seedAssessment(COMPLETE);
    render(<NutritionPlanSection />);

    fireEvent.click(screen.getByRole("button", { name: "Create my plan" }));

    /* The plan renders: the goal, the day's targets, meal sections. */
    expect(screen.getByText("Lose weight")).toBeTruthy();
    expect(screen.getByText(/across the day/)).toBeTruthy();
    expect(screen.getByText("Breakfast")).toBeTruthy();
    expect(screen.getAllByTestId("provenance-badge").length).toBeGreaterThan(0);

    /* P2: main meals render their composition layers, labelled. */
    expect(screen.getAllByText("Base").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Protein").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Vegetables").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Finishing").length).toBeGreaterThan(0);

    /* Logging a suggestion writes a real entry through the lib. */
    const logButtons = screen.getAllByRole("button", { name: /^Log .+ to / });
    expect(logButtons.length).toBeGreaterThan(0);
    fireEvent.click(logButtons[0]!);

    const entries = readFoodLog();
    expect(entries).toHaveLength(1);
    expect(entries[0]!.source).toBe("plan");
    expect(entries[0]!.day).toBe(todayLocal());
    expect(entries[0]!.provenance.kind).toBe("usda");
    expect(screen.getByText("Logged")).toBeTruthy();
  });

  it("shows a past plan as history, not as today's plan", () => {
    seedAssessment(COMPLETE);
    const state = {
      version: 1 as const,
      status: "complete" as const,
      step: "summary" as const,
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
    writePlan(outcome.plan);

    render(<NutritionPlanSection />);
    expect(screen.getByText(/This plan was made for/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Create today's plan" })).toBeTruthy();
    expect(screen.queryByText("Breakfast")).toBeNull();
  });

  it("names staleness when the goal changed after the plan was made", () => {
    seedAssessment(COMPLETE);
    const state = {
      version: 1 as const,
      status: "complete" as const,
      step: "summary" as const,
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
      foods: [] as Food[],
      day: todayLocal(),
      now: "2026-11-15T01:00:00.000Z",
      id: "plan-today",
    });
    if (!outcome.ok) throw new Error("expected a plan");
    writePlan(outcome.plan);

    /* The person then changes their goal in the Assessment. */
    seedAssessment({ ...COMPLETE, goal: "maintain" });
    resetPrefCache();

    render(<NutritionPlanSection />);
    expect(screen.getByText(/Since this plan was made/)).toBeTruthy();
    expect(screen.getByText(/your goal/)).toBeTruthy();
  });
});

describe("NutritionPlanSection meal banners (P3)", () => {
  /* The seeded profile answers no meals-per-day, so the plan carries
     all four slots — one banner each. */
  const SLOTS = [
    ["breakfast", "Illustration — a balanced breakfast"],
    ["lunch", "Illustration — a balanced lunch"],
    ["dinner", "Illustration — a balanced dinner"],
    ["snack", "Illustration — a balanced snack"],
  ] as const;

  function renderPlan() {
    seedAssessment(COMPLETE);
    const utils = render(<NutritionPlanSection />);
    fireEvent.click(screen.getByRole("button", { name: "Create my plan" }));
    return utils;
  }

  it("heads every meal card with its own slot's illustration", () => {
    const { container } = renderPlan();
    const srcs = new Set<string>();
    for (const [meal, alt] of SLOTS) {
      const img = screen.getByAltText(alt) as HTMLImageElement;
      expect(img.getAttribute("src")).toContain(`meal-${meal}`);
      expect(img.getAttribute("loading")).toBe("lazy");
      srcs.add(img.getAttribute("src")!);
      /* The banner heads its own meal's section, above the meal title. */
      const section = container.querySelector(
        `section[aria-label="${MEAL_LABEL[meal]}"]`,
      )!;
      expect(section.querySelector(".nut-meal-banner")).not.toBeNull();
      expect(section.contains(img)).toBe(true);
    }
    expect(srcs.size).toBe(SLOTS.length);
    expect(container.querySelectorAll(".nut-meal-banner")).toHaveLength(SLOTS.length);
  });

  it("keeps the reserved banner frame when an image fails to load", () => {
    const { container } = renderPlan();
    const img = screen.getByAltText("Illustration — a balanced breakfast");
    const frame = img.closest(".nut-meal-banner")!;
    fireEvent.error(img);
    /* The img drops out; the frame — the layout reservation — stays,
       so the card renders identically and nothing shifts. */
    expect(screen.queryByAltText("Illustration — a balanced breakfast")).toBeNull();
    expect(frame.isConnected).toBe(true);
    expect(container.querySelectorAll(".nut-meal-banner")).toHaveLength(SLOTS.length);
  });

  it("never captions the illustration as the suggested foods", () => {
    const { container } = renderPlan();
    expect(container.querySelectorAll("figcaption")).toHaveLength(0);
    const imgs = container.querySelectorAll(".nut-meal-banner-img");
    expect(imgs).toHaveLength(SLOTS.length);
    for (const img of imgs) {
      expect(img.getAttribute("alt")).toMatch(/^Illustration — /);
    }
  });
});
