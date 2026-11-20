// @vitest-environment jsdom
/**
 * The P14 guard (M-161) — THE SNACK-SITS ROW: the snack-placement
 * preference lives as ONE quiet two-choice row inside the existing
 * "How this plan is built" disclosure, nowhere else. Executable pins:
 *
 *   (a) THE ROW EXISTS, INSIDE THE DISCLOSURE — a radiogroup named
 *       "Snack sits" with exactly two radios, "In the longest gap"
 *       and "In the morning", rendered inside the disclosure's
 *       content in the day section; the disclosure's protected
 *       paragraphs stand unchanged around it; there is exactly ONE
 *       such radiogroup on the page (no second control elsewhere).
 *   (b) IT REFLECTS THE STORED PREFERENCE — with no preference
 *       stored, "In the longest gap" (the default the plan has
 *       always used) is the checked radio; with "morning" stored,
 *       "In the morning" is.
 *   (c) IT WRITES THROUGH THE SETTER — choosing "In the morning"
 *       stores the preference under its own key, and the stored
 *       plan goes stale BY NAME in the header: "where your snack
 *       sits changed". Nothing regenerates silently — the plan on
 *       the page is still the stored one.
 *
 * Fixtures: the house pattern (planShell.guard) — a real composed
 * plan re-stamped to today over a seeded complete Assessment.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, within } from "@testing-library/react";

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

import { getPref, setPref } from "@/lib/prefs";
import { resetPrefCache } from "@/lib/prefsStore";
import { todayLocal } from "@/lib/localDay";
import {
  ASSESSMENT_KEY,
  EMPTY_ANSWERS,
  toHealthProfile,
  type AssessmentState,
} from "@/lib/assessment/state";
import {
  generatePlan,
  parseSnackPlacement,
  readPlan,
  SNACK_PLACEMENT_KEY,
  USDA_REFERENCE_FOODS,
  writePlan,
} from "@/lib/nutrition";
import { DISH_LIBRARY } from "@/lib/nutrition/data/dishLibrary";
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

const ANSWERS = {
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

function seedAndStore(): void {
  const state: AssessmentState = {
    version: 1,
    status: "complete",
    step: "summary",
    answers: { ...EMPTY_ANSWERS, ...ANSWERS },
    consents: [],
    startedAt: null,
    completedAt: "2026-11-10T03:05:00.000Z",
    updatedAt: "2026-11-10T03:05:00.000Z",
  };
  setPref(ASSESSMENT_KEY, state);
  const profile = toHealthProfile(state, "user-1");
  const safety = classifySafety(toSafetyInput(profile));
  const outcome = generatePlan({
    profile,
    safety,
    gatedOutcome: targetsFor(profile, safety, "2026-11-18"),
    fallbackTargets: null,
    foods: USDA_REFERENCE_FOODS,
    dishes: DISH_LIBRARY,
    day: "2026-11-18",
    now: "2026-11-18T03:00:00.000Z",
    id: "plan-snack-guard",
  });
  if (!outcome.ok) throw new Error("expected a plan");
  writePlan({ ...outcome.plan, day: todayLocal() });
}

/** Open the "How this plan is built" disclosure in the day section
 *  and return the section element. */
function openDisclosure(container: HTMLElement): HTMLElement {
  const day = container.querySelector<HTMLElement>('section[aria-label="Your day"]');
  expect(day, "the day section renders").not.toBeNull();
  fireEvent.click(within(day!).getByRole("button", { name: /How this plan is built/ }));
  return day!;
}

describe("snack-sits guard — method 14 (M-161)", () => {
  it("(a) one quiet row inside the disclosure, protected words unchanged", () => {
    seedAndStore();
    const { container } = render(<NutritionPlanSection />);
    const day = openDisclosure(container);

    const group = within(day).getByRole("radiogroup", { name: "Snack sits" });
    const radios = within(group).getAllByRole("radio");
    expect(radios).toHaveLength(2);
    expect(within(group).getByRole("radio", { name: "In the longest gap" })).toBeTruthy();
    expect(within(group).getByRole("radio", { name: "In the morning" })).toBeTruthy();

    /* Exactly one such control on the whole page. */
    expect(container.querySelectorAll('[role="radiogroup"]')).toHaveLength(2); // goal + snack
    expect(
      [...container.querySelectorAll('[role="radiogroup"]')].filter(
        (g) => g.getAttribute("aria-label") === "Snack sits",
      ),
    ).toHaveLength(1);

    /* The disclosure's protected paragraphs stand, words unchanged. */
    expect(within(day).getByText(/Mifflin–St Jeor/)).toBeTruthy();
    expect(within(day).getByText(/Plans are built from real dishes/)).toBeTruthy();
    expect(within(day).getByText("Snack sits")).toBeTruthy();
  });

  it("(b) the default is the longest gap; a stored morning shows as morning", () => {
    seedAndStore();
    const first = render(<NutritionPlanSection />);
    openDisclosure(first.container);
    const gap = first.container.querySelector<HTMLInputElement>(
      'input[name="plan-snack-placement"][aria-label="In the longest gap"]',
    )!;
    const morning = first.container.querySelector<HTMLInputElement>(
      'input[name="plan-snack-placement"][aria-label="In the morning"]',
    )!;
    expect(gap.checked).toBe(true);
    expect(morning.checked).toBe(false);
    cleanup();

    seedAndStore();
    setPref(SNACK_PLACEMENT_KEY, "morning");
    const second = render(<NutritionPlanSection />);
    openDisclosure(second.container);
    const gap2 = second.container.querySelector<HTMLInputElement>(
      'input[name="plan-snack-placement"][aria-label="In the longest gap"]',
    )!;
    const morning2 = second.container.querySelector<HTMLInputElement>(
      'input[name="plan-snack-placement"][aria-label="In the morning"]',
    )!;
    expect(gap2.checked).toBe(false);
    expect(morning2.checked).toBe(true);
  });

  it("(c) choosing morning writes the preference and names the plan stale — nothing regenerates", () => {
    seedAndStore();
    const storedBefore = readPlan();
    const { container } = render(<NutritionPlanSection />);
    const day = openDisclosure(container);
    expect(container.textContent).not.toContain("where your snack sits changed");

    fireEvent.click(within(day).getByRole("radio", { name: "In the morning" }));

    expect(getPref(SNACK_PLACEMENT_KEY, parseSnackPlacement, null)).toBe("morning");
    /* The header names the change; the stored plan itself is
       untouched — regeneration waits for the person's own tap. */
    expect(container.textContent).toContain("where your snack sits changed");
    expect(readPlan()).toEqual(storedBefore);
  });
});
