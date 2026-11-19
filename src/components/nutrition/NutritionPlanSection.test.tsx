// @vitest-environment jsdom
/**
 * Nutrition P1 — the plan section, driven against the real prefs document
 * and the real engine: the insufficiency refusal naming what's missing,
 * the safety refusal in the classifier's own words, explicit generation,
 * and logging a suggestion into the food log as a `plan`-sourced entry
 * with the food's provenance intact.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";

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
import { ASSESSMENT_KEY, EMPTY_ANSWERS, type AssessmentState } from "@/lib/assessment/state";
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

/** P8: composing runs behind the loading sequence (~1.4 s) — the tap
 *  shows the building steps first, then the plan. Tests that need the
 *  plan await its arrival the way a person sees it: the ready state's
 *  Compose again button is the reveal signal. */
async function createPlanAndAwait(): Promise<void> {
  fireEvent.click(screen.getByRole("button", { name: "Create my plan" }));
  await screen.findByRole("button", { name: /Compose again/ }, { timeout: 4000 });
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
    expect(screen.getByText(/won't build a plan/)).toBeTruthy();
    expect(screen.getByText(/history of disordered eating/)).toBeTruthy();
    expect(screen.getByText(/qualified professional/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Create my plan/ })).toBeNull();
  });

  it("creates a plan on the explicit tap and logs a suggestion as a plan entry", async () => {
    seedAssessment(COMPLETE);
    render(<NutritionPlanSection />);

    await createPlanAndAwait();

    /* The plan renders: the goal (title + the active goal chip), the
       day's targets, meal sections. The targets query names the header
       sentence itself ("…across the day — your guide is…"): the bare
       phrase "across the day" also ends the day notes under "Today's
       balance" whenever a rotation misses an ICMR floor — for this profile
       the 2026-11-16 rotation falls short on milk and curd, so the
       unscoped query matched two correct elements and threw. The notes
       are pinned per-day in planComposition.test.ts, and their rendering
       is pinned in the "Today's balance" test below. */
    expect(screen.getAllByText("Lose weight").length).toBeGreaterThan(0);
    expect(screen.getByText(/across the day — your guide is/)).toBeTruthy();
    /* P12: the day timeline names each meal too, so "Breakfast" appears
       in the schedule summary as well as the meal card. */
    expect(screen.getAllByText("Breakfast").length).toBeGreaterThan(0);

    /* P5: main meals are built from dishes — each carries dish rows
       whose tap target unfolds the dish's ingredients. (P2's layer
       labels survive only on a meal the dish pool could not fill.)
       Method 13 (2026-11-19): this profile's day is now FULLY
       dish-composed — snack included — so no plain-food suggestion
       rows render at all; the provenance badge lives in the dish
       expansion, and logging goes through the dish. The test's
       shape follows the plan's. */
    const dishRows = screen.getAllByRole("button", { name: /— show ingredients$/ });
    expect(dishRows.length).toBeGreaterThan(0);
    fireEvent.click(dishRows[0]!);
    expect(screen.getAllByTestId("provenance-badge").length).toBeGreaterThan(0);
    const stored = readPlan();
    if (!stored) throw new Error("expected a stored plan");
    expect(stored.meals.some((m) => m.dishes.length > 0)).toBe(true);

    /* Logging the plan's dish writes a real entry through the lib. */
    fireEvent.click(screen.getByRole("button", { name: "Log this dish" }));

    const entries = readFoodLog();
    expect(entries).toHaveLength(1);
    expect(entries[0]!.source).toBe("dish");
    expect(entries[0]!.day).toBe(todayLocal());
    expect(entries[0]!.provenance.kind).toBe("recipe");
    /* Slice 4: the meal badge also reads "Logged" once the meal is
       fully logged (brief 3.1) — a single-dish meal reaches that
       with this one tap, so the logged state can read twice. */
    expect(screen.getAllByText("Logged").length).toBeGreaterThan(0);
  });

  it("shows the building steps while a plan composes, then reveals the plan (P8)", () => {
    vi.useFakeTimers();
    try {
      seedAssessment(COMPLETE);
      render(<NutritionPlanSection />);
      fireEvent.click(screen.getByRole("button", { name: "Create my plan" }));

      /* The loading state is up: the three honest steps, in order —
         and no plan yet, because generation has not run. */
      const steps = screen.getByRole("status", { name: "Building your plan" });
      expect(within(steps).getByText("Reading your record")).toBeTruthy();
      expect(within(steps).getByText("Choosing your dishes")).toBeTruthy();
      expect(within(steps).getByText("Balancing your day")).toBeTruthy();
      expect(screen.queryByText("Breakfast")).toBeNull();
      expect(readPlan()).toBeNull();

      /* The steps advance in order, one settling as the next starts. */
      act(() => {
        vi.advanceTimersByTime(500);
      });
      const items = within(steps).getAllByRole("listitem");
      expect(items[0]!.getAttribute("data-state")).toBe("done");
      expect(items[1]!.getAttribute("data-state")).toBe("active");
      expect(items[2]!.getAttribute("data-state")).toBe("pending");
      expect(readPlan()).toBeNull();

      /* At the end of the sequence the loading state is gone and the
         plan is revealed — stored, and rendered. */
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.queryByRole("status", { name: "Building your plan" })).toBeNull();
      /* P12: the day timeline names each meal too, so "Breakfast" appears
       in the schedule summary as well as the meal card. */
    expect(screen.getAllByText("Breakfast").length).toBeGreaterThan(0);
      expect(readPlan()).not.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("meal card headers show the composed sum of the listed dishes and foods, not the target split (P3, P5)", async () => {
    seedAssessment(COMPLETE);
    render(<NutritionPlanSection />);
    await createPlanAndAwait();

    const plan = readPlan();
    if (!plan) throw new Error("expected a stored plan");
    for (const meal of plan.meals) {
      const card = screen.getByLabelText(`${MEAL_LABEL[meal.meal]} plan`);
      const headerNumber = card.querySelector("p.shrink-0 span")?.textContent;
      const composed =
        meal.suggestions.reduce((sum, s) => sum + s.nutrients.kcal, 0) +
        meal.dishes.reduce((sum, d) => sum + d.nutrients.kcal, 0);
      /* The header is the sum of what is actually listed on the card.
         Pre-P3 it showed meal.kcal — the meal's share of the day
         target — while the listed items summed to something else. */
      expect(headerNumber).toBe(String(Math.round(composed)));
    }
  });

  it("renders the plan's day notes under Today's balance, apart from the targets line", () => {
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
       the 2026-11-18 rotation, whose fruit shortfall note is the one
       that collides with the targets line (both end a clause in
       "across the day"). Only the day label is re-stamped to today so
       the section shows it as today's plan; the inputs snapshot
       carries no day, so nothing reads stale. (The fixture day moved
       from 2026-11-16 at module 06: that rotation no longer misses
       the milk floor — the basis pass changed the servable pool, so
       its day notes are the group-span and energy ones now. The fruit
       note on the 18th carries the same colliding phrase.) */
    const outcome = generatePlan({
      profile,
      safety,
      gatedOutcome: targetsFor(profile, safety, "2026-11-18"),
      fallbackTargets: null,
      foods: USDA_REFERENCE_FOODS,
      day: "2026-11-18",
      now: "2026-11-18T03:00:00.000Z",
      id: "plan-mix-fixture",
    });
    if (!outcome.ok) throw new Error("expected a plan");
    expect(outcome.plan.notes.some((n) => n.includes("of fruit"))).toBe(true);
    writePlan({ ...outcome.plan, day: todayLocal() });

    render(<NutritionPlanSection />);
    /* Pin updated for brief v4 Slice 3: the "Today's mix" label block
       is retired — the guideline notes render in their own top-level
       section under a real H2, "Today's balance" (brief Part 1).
       Pin updated again for Slice 4 (brief 3.2): the fruit guideline
       note is the fruit GOAL METER now — the sentence the collision
       below was about no longer renders as text at all, which ends
       the collision at its source; the targets line still matches on
       its own sentence alone, which is the separation this test has
       always pinned. */
    const balance = screen
      .getByRole("heading", { name: "Today's balance" })
      .closest("section")!;
    const fruitMeter = within(balance)
      .getAllByRole("progressbar")
      .find((m) => m.getAttribute("aria-label")?.startsWith("Fruit:"));
    expect(fruitMeter, "the fruit goal meter").toBeTruthy();
    expect(fruitMeter!.getAttribute("aria-valuemax")).toBe("100");
    expect(within(balance).getAllByText(/g to go · ICMR-NIN guideline/).length).toBeGreaterThan(0);
    expect(
      screen.queryByText(
        /fruit — the ICMR-NIN guideline aims for at least 100 g across the day/,
      ),
    ).toBeNull();
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
  it("shows the real photograph on exactly the photographed suggestions", async () => {
    seedAssessment(COMPLETE);
    /* Method 13 (2026-11-19): a plan composed WITH the dish
       library is dish-first now — its suggestion rows are only
       top-ups, and this profile's day carries no photographed one,
       so the photograph path would pass vacuously. The fixture
       therefore stores a plan composed WITHOUT the library (the
       layered fallback path, still a real plan shape) so the
       suggestion rows under test are the day's substance, exactly
       as this test was written against. */
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
    const profile = toHealthProfile(state, "user-1");
    const safety = classifySafety(toSafetyInput(profile));
    const outcome = generatePlan({
      profile,
      safety,
      gatedOutcome: targetsFor(profile, safety, todayLocal()),
      fallbackTargets: null,
      foods: USDA_REFERENCE_FOODS,
      day: todayLocal(),
      now: "2026-11-16T03:00:00.000Z",
      id: "plan-photo-fixture",
    });
    if (!outcome.ok) throw new Error("expected a plan");
    writePlan(outcome.plan);
    const { container } = render(<NutritionPlanSection />);

    const plan = readPlan();
    if (!plan) throw new Error("expected a stored plan");
    const suggestions = plan.meals.flatMap((m) => m.suggestions);
    const photographed = suggestions.filter((s) => foodPhotoFor(s.foodId) !== null);
    /* The day plan is built from the reference set, so it must exercise
       the photograph path — a vacuous pass here would prove nothing. */
    expect(photographed.length).toBeGreaterThan(0);

    /* Suggestion rows only (li.nut-entry): the dish-idea rows share
       the nut-food-thumb class through DishPhoto, and P3's distinct
       per-meal dish ideas can carry photographs of their own — they
       are not plan suggestions and must not enter this count. */
    const imgs = [...container.querySelectorAll("li.nut-entry img.nut-food-thumb")];
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
  it("goal chips write the goal the engine reads — the plan goes stale, never silently rebuilt", async () => {
    seedAssessment(COMPLETE);
    render(<NutritionPlanSection />);
    await createPlanAndAwait();
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

  /* Slice 4 (brief 3.1, M-88): the meal button is "Log meal"
     everywhere — the old "Log this meal" label is retired — and a
     logged meal reads as the "Logged" badge, not "Already logged".
     The bulk-log behaviour this test pins is unchanged. */
  it("'Log meal' bulk-logs the meal's dishes and foods once, then reads as logged", async () => {
    seedAssessment(COMPLETE);
    render(<NutritionPlanSection />);
    await createPlanAndAwait();

    const plan = readPlan();
    if (!plan) throw new Error("plan was not created");
    const firstMeal = plan.meals[0]!;
    /* P5: the meal's entries are its dishes (through the dish path)
       plus its food suggestions (through the plan path). */
    const expected = firstMeal.suggestions.length + firstMeal.dishes.length;
    expect(expected).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Log meal" })).toHaveLength(4);

    fireEvent.click(screen.getAllByRole("button", { name: "Log meal" })[0]!);

    const entries = readFoodLog().filter((e) => e.day === todayLocal());
    expect(entries).toHaveLength(expected);
    expect(entries.filter((e) => e.source === "dish")).toHaveLength(firstMeal.dishes.length);
    expect(entries.filter((e) => e.source === "plan")).toHaveLength(firstMeal.suggestions.length);
    expect(entries.every((e) => e.meal === firstMeal.meal)).toBe(true);
    expect(screen.getByText("Logged")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Log meal" })).toHaveLength(3);
  });
});
