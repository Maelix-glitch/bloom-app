// @vitest-environment jsdom
/**
 * Nutrition D4 — the Dishes section: the library rendered with
 * bilingual names and computed per-serving numbers, the lib's filters
 * on the chips that remain (search, category, enriched), the detail
 * sheet (recipe provenance, friendly ingredient names, method), and
 * logging a dish into the real food log as a recipe-provenance
 * snapshot entry. Which dishes are on the shelf is governed by the
 * person's assessment answers — pattern, and budget when stated —
 * with no controls for either here (owner directive 2026-11-16:
 * pattern and budget are asked in the assessment and nowhere else).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

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
import {
  dishNutrients,
  findDish,
  readFoodLog,
  type Dish,
} from "@/lib/nutrition";
import { DishesSection } from "./DishesSection";

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

function seedAnswers(answers: Partial<AssessmentState["answers"]>): void {
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

const dal = findDish("dish-masoor-dal-tadka")!;
const chickenCurry = findDish("dish-chicken-curry")!;

function cardOf(dish: Dish) {
  return screen.getByRole("button", { name: `${dish.name.en} — view recipe` });
}

describe("DishesSection — browsing", () => {
  it("renders the library with bilingual names and computed per-serving numbers", () => {
    render(<DishesSection day={todayLocal()} />);
    expect(screen.getByText(/492 dishes/)).toBeTruthy();
    const card = cardOf(dal);
    expect(within(card).getByText(/मसूर दाल तड़का/)).toBeTruthy();
    const perServing = dishNutrients(dal).nutrients;
    expect(
      within(card).getByText(
        new RegExp(`${Math.round(perServing.kcal)} kcal`),
      ),
    ).toBeTruthy();
    /* Budget marks are shown as the estimate they are. */
    expect(within(card).getByLabelText(/Budget tier 1 of 3, estimated/)).toBeTruthy();
  });

  it("filters by category chip", () => {
    render(<DishesSection day={todayLocal()} />);
    fireEvent.click(screen.getByRole("button", { name: "Chutneys" }));
    expect(screen.queryByRole("button", { name: `${dal.name.en} — view recipe` })).toBeNull();
    expect(
      screen.getByRole("button", { name: /Mint-Coriander Chutney — view recipe/ }),
    ).toBeTruthy();
  });

  it("searches by Hindi name", () => {
    render(<DishesSection day={todayLocal()} />);
    fireEvent.change(screen.getByLabelText("Search dishes"), {
      target: { value: "मसूर" },
    });
    expect(cardOf(dal)).toBeTruthy();
    /* A dish whose names carry no मसूर falls away. */
    expect(
      screen.queryByRole("button", { name: "Jeera Rice — view recipe" }),
    ).toBeNull();
  });

  it("an impossible filter set is honestly empty, and clearing restores the library", () => {
    render(<DishesSection day={todayLocal()} />);
    fireEvent.change(screen.getByLabelText("Search dishes"), {
      target: { value: "zzqqx-nothing" },
    });
    expect(screen.getByText(/No dishes match — try clearing a filter/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByText(/492 dishes/)).toBeTruthy();
  });

  it("the shelf follows the person's own pattern — silently, with no pattern or budget controls", () => {
    seedAnswers({ dietaryPattern: "vegan" });
    render(<DishesSection day={todayLocal()} />);
    expect(screen.getByText(/showing what suits you — vegan pattern/)).toBeTruthy();
    /* The ghee tadka is not vegan — it is not on the shelf. */
    expect(screen.queryByRole("button", { name: `${dal.name.en} — view recipe` })).toBeNull();
    /* Pattern and budget are assessment answers, not filters: this
       section renders no controls for either, for anyone. */
    expect(screen.queryByRole("group", { name: "Pattern" })).toBeNull();
    expect(screen.queryByRole("group", { name: "Budget" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Any budget" })).toBeNull();
  });

  it("offers no pattern or budget controls when nothing is stated, either", () => {
    render(<DishesSection day={todayLocal()} />);
    expect(screen.queryByRole("group", { name: "Pattern" })).toBeNull();
    expect(screen.queryByRole("group", { name: "Budget" })).toBeNull();
    expect(screen.getByText(/492 dishes/)).toBeTruthy();
  });

  it("a stated budget keeps dishes above the tier off the shelf", () => {
    seedAnswers({ foodBudget: 1 });
    render(<DishesSection day={todayLocal()} />);
    expect(screen.getByText(/kept to an everyday ₹ budget/)).toBeTruthy();
    /* The tier-1 dal stays; the tier-3 curry is off the shelf. */
    expect(cardOf(dal)).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: `${chickenCurry.name.en} — view recipe` }),
    ).toBeNull();
  });

  it("with no budget stated, every tier is on the shelf", () => {
    render(<DishesSection day={todayLocal()} />);
    expect(cardOf(chickenCurry)).toBeTruthy();
    expect(screen.queryByText(/kept to an .* budget/)).toBeNull();
  });
});

describe("DishesSection — the detail sheet and logging", () => {
  it("shows the recipe under its provenance, and logs one serving as a dish entry", () => {
    const today = todayLocal();
    render(<DishesSection day={today} />);
    fireEvent.click(cardOf(dal));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Built from USDA ingredient data")).toBeTruthy();
    /* Ingredient lines carry friendly names, Hindi alongside — the
       dish's own Hindi title and the lentils' Hindi name both show. */
    expect(within(dialog).getByText(/Red lentils \(masoor dal\)/)).toBeTruthy();
    expect(within(dialog).getAllByText(/मसूर दाल/).length).toBeGreaterThan(1);
    /* The method is there, numbered steps from the recipe itself. */
    expect(within(dialog).getByText(/pressure-cook/)).toBeTruthy();

    fireEvent.click(within(dialog).getByRole("button", { name: /^Log this dish/ }));
    expect(within(dialog).getByText("Logged")).toBeTruthy();

    const entries = readFoodLog();
    expect(entries).toHaveLength(1);
    const entry = entries[0]!;
    expect(entry.day).toBe(today);
    expect(entry.source).toBe("dish");
    expect(entry.provenance).toEqual({
      kind: "recipe",
      sourceId: dal.id,
      label: "Built from USDA ingredient data",
    });
    expect(entry.foodId).toBeNull();
    expect(entry.nutrients).toEqual(dishNutrients(dal).nutrients);
  });
});
