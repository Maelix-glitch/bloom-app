// @vitest-environment jsdom
/**
 * Nutrition P5 — dish-first plan cards: a main meal IS its dishes.
 * Each dish renders as a row; tapping it unfolds the dish's
 * ingredients (the raw things, per serving) underneath it, and "Log
 * this dish" writes a recipe-provenance snapshot entry through the
 * dish logging path. A meal the dish pool could not fill — a stored
 * food-composed plan — keeps the D4 dish idea row instead.
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
  toHealthProfile,
  type AssessmentState,
} from "@/lib/assessment/state";
import { toSafetyInput } from "@/lib/vitalis/domain/profile";
import { classifySafety } from "@/lib/vitalis/safety/classify";
import { targetsFor } from "@/lib/vitalis/calc/body";
import {
  dishNutrients,
  findDish,
  findUsdaReference,
  foodDisplayName,
  generatePlan,
  readFoodLog,
  readPlan,
  USDA_REFERENCE_FOODS,
  writePlan,
} from "@/lib/nutrition";
import { NutritionPlanSection } from "./NutritionPlanSection";
import { formatGrams } from "./input";

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

/** P8: composing runs behind the loading sequence (~1.4 s) — tests
 *  that need the plan await its arrival (the ready state's Compose
 *  again button is the reveal signal). */
async function createPlanAndAwait(): Promise<void> {
  fireEvent.click(screen.getByRole("button", { name: "Create my plan" }));
  await screen.findByRole("button", { name: /Compose again/ }, { timeout: 4000 });
}

describe("NutritionPlanSection — dish-first meals (P5)", () => {
  it("a main meal is its dishes: tapping the anchor unfolds its ingredients, and Log this dish writes the dish entry", async () => {
    seedAssessment(COMPLETE);
    render(<NutritionPlanSection />);
    await createPlanAndAwait();

    const plan = readPlan();
    if (!plan) throw new Error("expected a stored plan");
    const lunchPlan = plan.meals.find((m) => m.meal === "lunch");
    if (!lunchPlan || lunchPlan.dishes.length === 0) {
      throw new Error("expected lunch to be dish-composed");
    }
    const anchor = lunchPlan.dishes.find((d) => d.role === "anchor") ?? lunchPlan.dishes[0]!;
    const dish = findDish(anchor.dishId);
    if (!dish) throw new Error("anchor is not a library dish");

    const lunch = screen.getByLabelText("Lunch plan");
    /* A dish-composed meal carries no separate "Dish idea" — it IS
       the dishes. */
    expect(within(lunch).queryByText("Dish idea")).toBeNull();

    /* The anchor dish is a row naming the dish and its computed
       numbers; its ingredients are not shown until it is tapped. */
    const row = within(lunch).getByRole("button", {
      name: `${anchor.name} — show ingredients`,
    });
    expect(within(lunch).queryByText("Ingredients · per serving")).toBeNull();

    fireEvent.click(row);

    /* The raw things appear underneath: the first ingredient by its
       display name, with its grams at the plan's servings — the
       figures the dish detail sheet lists, scaled as the plan
       serves them (P8: a plan dish's servings need not be 1).
       The queries are scoped to the ingredients list itself: the
       P8 composer may serve a dish whose own name carries the
       ingredient's name (a cod dish, say), which made the unscoped
       name query match the dish row as well. */
    expect(within(lunch).getByText("Ingredients · per serving")).toBeTruthy();
    const ingredientsList = within(lunch)
      .getByText("Ingredients · per serving")
      .parentElement!.querySelector("ul");
    if (!ingredientsList) throw new Error("ingredients list did not render");
    const firstLine = dish.lines[0]!;
    const firstFood = findUsdaReference(firstLine.foodId);
    if (!firstFood) throw new Error("ingredient not in the reference set");
    expect(
      within(ingredientsList as HTMLElement).getByText(foodDisplayName(firstFood).en, {
        exact: false,
      }),
    ).toBeTruthy();
    expect(
      within(lunch).getByText(
        `${formatGrams((firstLine.grams / dish.servings) * anchor.servings)} g`,
      ),
    ).toBeTruthy();

    fireEvent.click(within(lunch).getByRole("button", { name: "Log this dish" }));

    const entries = readFoodLog().filter((e) => e.day === todayLocal());
    expect(entries).toHaveLength(1);
    const entry = entries[0]!;
    expect(entry.source).toBe("dish");
    expect(entry.meal).toBe("lunch");
    expect(entry.provenance.kind).toBe("recipe");
    if (entry.provenance.kind !== "recipe") throw new Error("expected recipe provenance");
    expect(entry.provenance.sourceId).toBe(dish.id);
    expect(entry.name).toBe(dish.name.en);
    expect(entry.nutrients).toEqual(dishNutrients(dish).nutrients);

    /* The unfolded dish now reads Logged. (Slice 4: the meal badge
       reads "Logged" too once the meal is fully logged, so the word
       can appear twice within the card — the dish's chip and the
       meal's badge.) */
    expect(within(lunch).getAllByText("Logged").length).toBeGreaterThan(0);
    expect(within(lunch).queryByRole("button", { name: "Log this dish" })).toBeNull();
  });

  it("a stored food-composed plan keeps the D4 dish idea on its main meals", () => {
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
    /* A plan composed without the dish library — the fallback path —
       re-stamped to today so the section shows it as today's plan. */
    const outcome = generatePlan({
      profile,
      safety,
      gatedOutcome: targetsFor(profile, safety, "2026-11-16"),
      fallbackTargets: null,
      foods: USDA_REFERENCE_FOODS,
      day: "2026-11-16",
      now: "2026-11-16T03:00:00.000Z",
      id: "plan-food-fixture",
    });
    if (!outcome.ok) throw new Error("expected a plan");
    expect(outcome.plan.meals.every((m) => m.dishes.length === 0)).toBe(true);
    writePlan({ ...outcome.plan, day: todayLocal() });

    render(<NutritionPlanSection />);
    const lunch = screen.getByLabelText("Lunch plan");
    expect(within(lunch).queryByRole("button", { name: /— show ingredients$/ })).toBeNull();
    expect(within(lunch).getByText("Dish idea")).toBeTruthy();

    fireEvent.click(within(lunch).getByRole("button", { name: "Log this dish" }));
    const entries = readFoodLog().filter((e) => e.day === todayLocal());
    expect(entries).toHaveLength(1);
    expect(entries[0]!.source).toBe("dish");
    expect(entries[0]!.meal).toBe("lunch");
    expect(entries[0]!.provenance.kind).toBe("recipe");
  });

  it("the snack card carries no dishes and no dish idea", async () => {
    /* Method 13 rewrite (2026-11-19, the dish-first repair): the
       snack slot composes a real dish now — a shake, a protein
       snack, a breakfast dish — so the snack card DOES carry a
       dish row. What it still never carries is the "Dish idea"
       adjunct: that belongs to food-composed main meals the dish
       pool could not fill, and the snack is not one. The title
       keeps its history; the assertions pin the new shape. */
    seedAssessment(COMPLETE);
    render(<NutritionPlanSection />);
    await createPlanAndAwait();
    const snack = screen.queryByLabelText("Snack plan");
    if (snack) {
      expect(within(snack).queryByText("Dish idea")).toBeNull();
      expect(
        within(snack).queryByRole("button", { name: /— show ingredients$/ }),
      ).toBeTruthy();
    }
  });
});
