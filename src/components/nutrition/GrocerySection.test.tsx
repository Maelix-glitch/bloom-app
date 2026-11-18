// @vitest-environment jsdom
/**
 * The Grocery section — pinned at the surface: the honest no-plan
 * state (with the pantry editor still available), a real plan dish
 * rendered as its aggregated ingredients, the pantry deduction shown
 * in plain words, an unresolvable dish NAMED rather than dropped,
 * pantry add/remove writing through the real prefs document, and —
 * the owner's Assessment-only rule — no dietary-pattern or budget
 * controls anywhere in the section.
 *
 * The prefs store and the nutrition hook are mocked at their seams
 * (the shapes they hand the section are the parsed values); the
 * pantry writes land in the real prefs document and are asserted
 * there. The lib's own maths is pinned in groceryList.test.ts.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const store = vi.hoisted(() => ({ values: {} as Record<string, unknown> }));

vi.mock("@/lib/prefsStore", () => ({
  usePrefValue: (key: string, _parse: unknown, fallback: unknown) =>
    key in store.values ? store.values[key] : fallback,
}));

vi.mock("@/hooks/useNutrition", () => ({
  useNutrition: () => ({
    foods: [
      {
        id: "f-rice",
        name: "Rice",
        per100g: { kcal: 100, proteinG: 5, carbsG: 10, fatG: 2 },
        servings: [],
        provenance: { kind: "user_entered", sourceId: "f-rice", label: "Yours" },
      },
    ],
  }),
}));

import { GrocerySection } from "./GrocerySection";
import { PANTRY_KEY, type PantryItem } from "@/lib/grocery/pantry";
import { PLAN_KEY } from "@/lib/nutrition";
import { findDish } from "@/lib/nutrition/data/dishLibrary";
import { USDA_REFERENCE_FOODS } from "@/lib/nutrition/usdaReference";
import { loadDoc } from "@/lib/prefs";
import type { DailyPlan, PlanDish, PlanMeal } from "@/lib/nutrition/plan";

const dal = findDish("dish-masoor-dal-tadka")!;
const dalFirstFood = USDA_REFERENCE_FOODS.find((f) => f.id === dal.lines[0]!.foodId)!;

function planDish(dishId: string, name: string): PlanDish {
  return {
    dishId,
    name,
    hindi: "",
    role: "anchor",
    servings: 1,
    nutrients: { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
    provenance: { kind: "recipe", sourceId: dishId, label: "recipe" },
  };
}

function planWith(dishes: PlanDish[]): DailyPlan {
  const mealPlan: PlanMeal = {
    meal: "lunch",
    kcal: 0,
    proteinG: 0,
    dishes,
    suggestions: [],
    note: null,
  };
  return { day: "2026-11-18", meals: [mealPlan] } as unknown as DailyPlan;
}

beforeEach(() => {
  localStorage.clear();
  store.values = {};
});

afterEach(() => cleanup());

describe("GrocerySection", () => {
  it("no plan: says why there is no list, and the pantry editor still works", () => {
    render(<GrocerySection />);
    expect(screen.getByText(/no plan yet/i)).toBeTruthy();
    expect(screen.getByLabelText("Pantry item name")).toBeTruthy();
    expect(screen.getByText("Your pantry")).toBeTruthy();
  });

  it("a plan dish renders as its aggregated ingredients", () => {
    store.values[PLAN_KEY] = planWith([planDish(dal.id, dal.name.en)]);
    render(<GrocerySection />);
    expect(screen.getByText(dalFirstFood.name)).toBeTruthy();
    expect(screen.getByText(/from your plan for 2026-11-18/i)).toBeTruthy();
  });

  it("the pantry deduction is shown in plain words", () => {
    store.values[PLAN_KEY] = planWith([planDish(dal.id, dal.name.en)]);
    const item: PantryItem = {
      id: "pantry-1",
      name: dalFirstFood.name,
      foodId: dalFirstFood.id,
      quantityGrams: 5,
      addedAt: "2026-11-18T05:00:00.000Z",
    };
    store.values[PANTRY_KEY] = [item];
    render(<GrocerySection />);
    expect(screen.getByText(/already in your pantry/i)).toBeTruthy();
  });

  it("an unresolvable dish is named, not dropped", () => {
    store.values[PLAN_KEY] = planWith([planDish("dish-gone", "Ghost curry")]);
    render(<GrocerySection />);
    expect(screen.getByText(/couldn't be listed/i)).toBeTruthy();
    expect(screen.getByText(/Ghost curry/)).toBeTruthy();
  });

  it("adding a pantry item writes the real prefs document, food resolved by name", () => {
    render(<GrocerySection />);
    fireEvent.change(screen.getByLabelText("Pantry item name"), { target: { value: "Rice" } });
    fireEvent.change(screen.getByLabelText("Amount in grams (optional)"), {
      target: { value: "200" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add/i }));
    const doc = loadDoc();
    const value = (doc[PANTRY_KEY] as { value: { items: PantryItem[] } }).value;
    expect(value.items).toHaveLength(1);
    expect(value.items[0]).toMatchObject({ name: "Rice", foodId: "f-rice", quantityGrams: 200 });
  });

  it("carries no dietary-pattern or budget controls (the Assessment-only rule)", () => {
    store.values[PLAN_KEY] = planWith([planDish(dal.id, dal.name.en)]);
    const { container } = render(<GrocerySection />);
    expect(container.querySelectorAll("select")).toHaveLength(0);
    expect(screen.queryByLabelText(/budget/i)).toBeNull();
    expect(screen.queryByLabelText(/pattern/i)).toBeNull();
  });
});
