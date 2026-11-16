// @vitest-environment jsdom
/**
 * Nutrition P1 — the plan section, driven against the real prefs document
 * and the real engine: the insufficiency refusal naming what's missing,
 * the safety refusal in the classifier's own words, explicit generation,
 * and logging a suggestion into the food log as a `plan`-sourced entry
 * with the food's provenance intact.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

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
  displayNameForFoodId,
  foodPhotoFor,
  generatePlan,
  readFoodLog,
  readPlan,
  USDA_REFERENCE_FOODS,
  writePlan,
  type Food,
} from "@/lib/nutrition";
import { toHealthProfile } from "@/lib/assessment/state";
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

    /* The plan renders: the goal (title + the active goal chip), the
       day's targets, meal sections. The targets query names the header
       sentence itself ("…across the day — your guide is…"): the bare
       phrase "across the day" also ends the day notes under "Today's
       mix" whenever a rotation misses an ICMR floor — for this profile
       the 2026-11-16 rotation falls short on milk and curd, so the
       unscoped query matched two correct elements and threw. The notes
       are pinned per-day in planComposition.test.ts, and their rendering
       is pinned in the "Today's mix" test below. */
    expect(screen.getAllByText("Lose weight").length).toBeGreaterThan(0);
    expect(screen.getByText(/across the day — your guide is/)).toBeTruthy();
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

  it("renders the plan's day notes under Today's mix, apart from the targets line", () => {
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
    /* The fixture's composition is fixed by an explicit day string —
       the 2026-11-16 rotation, whose milk-and-curd shortfall note is
       the one that used to collide with the targets line. Only the day
       label is re-stamped to today so the section shows it as today's
       plan; the inputs snapshot carries no day, so nothing reads stale. */
    const outcome = generatePlan({
      profile,
      safety,
      gatedOutcome: targetsFor(profile, safety, "2026-11-16"),
      fallbackTargets: null,
      foods: USDA_REFERENCE_FOODS,
      day: "2026-11-16",
      now: "2026-11-16T03:00:00.000Z",
      id: "plan-mix-fixture",
    });
    if (!outcome.ok) throw new Error("expected a plan");
    expect(outcome.plan.notes.some((n) => n.includes("milk and curd"))).toBe(true);
    writePlan({ ...outcome.plan, day: todayLocal() });

    render(<NutritionPlanSection />);
    const mix = screen.getByText("Today's mix").parentElement!;
    expect(
      within(mix).getByText(
        /milk and curd — the ICMR-NIN guideline aims for at least 300 ml across the day/,
      ),
    ).toBeTruthy();
    /* The targets line still matches on its own sentence alone. */
    expect(screen.getByText(/across the day — your guide is/)).toBeTruthy();
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

describe("NutritionPlanSection — food photographs (P3-R)", () => {
  it("shows the real photograph on exactly the photographed suggestions", () => {
    seedAssessment(COMPLETE);
    const { container } = render(<NutritionPlanSection />);
    fireEvent.click(screen.getByRole("button", { name: "Create my plan" }));

    const plan = readPlan();
    if (!plan) throw new Error("expected a stored plan");
    const suggestions = plan.meals.flatMap((m) => m.suggestions);
    const photographed = suggestions.filter((s) => foodPhotoFor(s.foodId) !== null);
    /* The day plan is built from the reference set, so it must exercise
       the photograph path — a vacuous pass here would prove nothing. */
    expect(photographed.length).toBeGreaterThan(0);

    /* Suggestion thumbnails only: the meal cards also carry a dish-idea
       row whose DishPhoto shares the .nut-food-thumb class — those are
       dish photographs, not suggestion photographs, and live outside the
       suggestion <ul>s this assertion is about. (With the reference set
       at 142 foods the day's dish ideas include photographed dishes, so
       an unscoped count no longer equals the photographed suggestions.) */
    const imgs = [...container.querySelectorAll("ul img.nut-food-thumb")];
    expect(imgs.length).toBe(photographed.length);
    const alts = imgs.map((img) => img.getAttribute("alt"));
    for (const suggestion of photographed) {
      /* D4: the photograph's alt is the food's friendly display name —
         the name the row renders — not the raw USDA description. */
      expect(alts).toContain(displayNameForFoodId(suggestion.foodId, suggestion.name).en);
    }
  });
});

describe("NutritionPlanSection — N-UI plan panel", () => {
  it("goal chips write the goal the engine reads — the plan goes stale, never silently rebuilt", () => {
    seedAssessment(COMPLETE);
    render(<NutritionPlanSection />);
    fireEvent.click(screen.getByRole("button", { name: "Create my plan" }));
    expect(screen.queryByText(/Since this plan was made/)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Maintain my weight" }));

    /* The stored plan is untouched; the staleness banner names the change. */
    expect(readPlan()?.goal).toBe("lose");
    expect(screen.getByText(/Since this plan was made/)).toBeTruthy();
    expect(screen.getByText(/your goal/)).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Maintain my weight" }).getAttribute("data-selected"),
    ).toBe("true");
  });

  it("'Log this meal' bulk-logs the meal's suggestions once, then reads as logged", () => {
    seedAssessment(COMPLETE);
    render(<NutritionPlanSection />);
    fireEvent.click(screen.getByRole("button", { name: "Create my plan" }));

    const plan = readPlan();
    if (!plan) throw new Error("plan was not created");
    const firstMeal = plan.meals[0]!;
    const expected = firstMeal.suggestions.length;
    expect(expected).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Log this meal" })).toHaveLength(4);

    fireEvent.click(screen.getAllByRole("button", { name: "Log this meal" })[0]!);

    const entries = readFoodLog().filter((e) => e.day === todayLocal());
    expect(entries).toHaveLength(expected);
    expect(entries.every((e) => e.source === "plan")).toBe(true);
    expect(entries.every((e) => e.meal === firstMeal.meal)).toBe(true);
    expect(screen.getByText("Already logged")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Log this meal" })).toHaveLength(3);
  });
});
