// @vitest-environment jsdom
/**
 * Nutrition D4 — the plan's dish idea: each main meal card gains one
 * deterministic dish from the library that suits the person's pattern
 * and passes the plan's own allergy gates, with "Log this dish"
 * writing a recipe-provenance snapshot entry into the real food log.
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
import { todayLocal } from "@/lib/localDay";
import {
  ASSESSMENT_KEY,
  EMPTY_ANSWERS,
  type AssessmentState,
} from "@/lib/assessment/state";
import { dishNutrients, findDish, readFoodLog } from "@/lib/nutrition";
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

describe("NutritionPlanSection — the dish idea (D4)", () => {
  it("offers one dish idea on a main meal card and logs it as a dish entry", () => {
    seedAssessment(COMPLETE);
    render(<NutritionPlanSection />);
    fireEvent.click(screen.getByRole("button", { name: "Create my plan" }));

    const lunch = screen.getByLabelText("Lunch plan");
    expect(within(lunch).getByText("Dish idea")).toBeTruthy();
    const logButton = within(lunch).getByRole("button", { name: "Log this dish" });
    /* The idea names a real library dish, bilingually. */
    const ideaText = within(lunch).getByText(/per serving/).textContent ?? "";
    expect(ideaText).toMatch(/\d+ kcal/);

    fireEvent.click(logButton);

    const entries = readFoodLog().filter((e) => e.day === todayLocal());
    expect(entries).toHaveLength(1);
    const entry = entries[0]!;
    expect(entry.source).toBe("dish");
    expect(entry.meal).toBe("lunch");
    expect(entry.provenance.kind).toBe("recipe");
    if (entry.provenance.kind !== "recipe") throw new Error("expected recipe provenance");
    const dish = findDish(entry.provenance.sourceId);
    expect(dish).not.toBeNull();
    expect(entry.name).toBe(dish!.name.en);
    expect(entry.nutrients).toEqual(dishNutrients(dish!).nutrients);

    /* The row now reads Logged — the entry is in the log, so the
       surface says so (scoped to the card: suggestion chips elsewhere
       use the same word). */
    expect(within(lunch).getByText("Logged")).toBeTruthy();
    expect(within(lunch).queryByRole("button", { name: "Log this dish" })).toBeNull();
  });

  it("the snack card carries no dish idea", () => {
    seedAssessment(COMPLETE);
    render(<NutritionPlanSection />);
    fireEvent.click(screen.getByRole("button", { name: "Create my plan" }));
    const snack = screen.queryByLabelText("Snack plan");
    if (snack) {
      expect(within(snack).queryByText("Dish idea")).toBeNull();
    }
  });
});
