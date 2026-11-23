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
 * The Grocery Journey (M-201) adds its own pins below: the progress
 * component's maths and word bands at the surface, tab filtering
 * with live counts, per-aisle completion counts and glyphs, search,
 * shopping mode's regrouping, the completion state arriving at
 * 100% and leaving on an untick, and the bought ticks persisting
 * with the plan (restore under the list's own signature, nothing
 * under a changed one, the write landing in the real prefs doc).
 *
 * The prefs store and the nutrition hook are mocked at their seams.
 * The store mock is REACTIVE (M-201): keys the test seeds directly
 * are handed back as parsed values, exactly as before; any other
 * key is read from the real prefs document through the caller's own
 * parser, and a prefs change re-renders subscribers — the bought
 * ticks flow through the real document, so a tick in the section is
 * a write the test can assert, and a reload is a re-render away.
 * The lib's own maths is pinned in groceryList.test.ts, the tick
 * store in bought.test.ts, the journey words in journey.test.ts.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const store = vi.hoisted(() => ({ values: {} as Record<string, unknown> }));

vi.mock("@/lib/prefsStore", async () => {
  const React = await import("react");
  const { loadDoc, PREFS_CHANGED } = await import("@/lib/prefs");
  return {
    usePrefValue: (key: string, parse: (raw: unknown) => unknown, fallback: unknown) => {
      const [, bump] = React.useReducer((n: number) => n + 1, 0);
      React.useEffect(() => {
        window.addEventListener(PREFS_CHANGED, bump);
        return () => window.removeEventListener(PREFS_CHANGED, bump);
      }, []);
      if (key in store.values) return store.values[key];
      const entry = loadDoc()[key];
      if (!entry) return fallback;
      const parsed = parse(entry.value);
      return parsed === null || parsed === undefined ? fallback : parsed;
    },
  };
});

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
import {
  GROCERY_BOUGHT_KEY,
  buildGroceryList,
  groceryBoughtValueOf,
  groceryListSignature,
  writeGroceryBought,
  type GroceryListResult,
} from "@/lib/grocery";
import { DISH_LIBRARY, PLAN_KEY, foodDisplayName } from "@/lib/nutrition";
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

function dalPlan(): DailyPlan {
  return planWith([planDish(dal.id, dal.name.en)]);
}

/* The list the section derives for the dal fixture, computed with
   the lib itself (the extra f-rice in the section's food set is no
   dish's ingredient, so it cannot enter the list) — the honest way
   to name the item ids and the signature the ticks belong to. */
function dalList(): Extract<GroceryListResult, { status: "ok" }> {
  const result = buildGroceryList({
    plans: [dalPlan()],
    dishes: DISH_LIBRARY,
    foods: USDA_REFERENCE_FOODS,
    pantry: [],
  });
  if (result.status !== "ok") throw new Error("the dal fixture must derive a list");
  return result;
}

function dalSignature(): string {
  const list = dalList();
  return groceryListSignature(
    list.days,
    list.groups.flatMap((group) => group.items.map((item) => item.foodId)),
  );
}

function dalItemId(name: string): string {
  const item = dalList()
    .groups.flatMap((group) => group.items)
    .find((entry) => entry.name === name);
  if (!item) throw new Error(`the dal fixture has no ${name}`);
  return item.foodId;
}

function boxFor(name: string): HTMLElement {
  return screen.getByRole("checkbox", { name: `Mark ${name} as bought` });
}

function progressCount(container: HTMLElement): string | undefined {
  return container.querySelector(".shop-progress-count")?.textContent ?? undefined;
}

beforeEach(() => {
  localStorage.clear();
  store.values = {};
  /* jsdom has no scrollIntoView; the completion state calls it. */
  Element.prototype.scrollIntoView = vi.fn();
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
    /* Component slice (§J): rows carry the app's display name, never
       the raw USDA description — that text is the provenance record,
       not a name a person shops by. (This pin used to read the raw
       food.name; it now reads the display name and forbids the raw
       one.) */
    expect(screen.getByText(foodDisplayName(dalFirstFood).en)).toBeTruthy();
    expect(screen.queryByText(dalFirstFood.name)).toBeNull();
    /* The plan day renders in the house date format — never the raw
       ISO key (M-30). */
    expect(screen.getByText(/from your plan for 18 Nov 2026/i)).toBeTruthy();
    expect(screen.queryByText(/2026-11-18/)).toBeNull();
  });

  it("a row can be ticked off while shopping", () => {
    store.values[PLAN_KEY] = planWith([planDish(dal.id, dal.name.en)]);
    render(<GrocerySection />);
    const box = screen.getByRole("checkbox", {
      name: `Mark ${foodDisplayName(dalFirstFood).en} as bought`,
    });
    expect(box.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(box);
    expect(box.getAttribute("aria-checked")).toBe("true");
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

describe("GrocerySection — the Grocery Journey (M-201)", () => {
  beforeEach(() => {
    store.values[PLAN_KEY] = dalPlan();
  });

  it("the progress component at rest: ring, count, milestone, message, bar words", () => {
    const { container } = render(<GrocerySection />);
    const ring = screen.getByRole("progressbar", { name: "Shopping progress" });
    expect(ring.getAttribute("aria-valuemin")).toBe("0");
    expect(ring.getAttribute("aria-valuemax")).toBe("12");
    expect(ring.getAttribute("aria-valuenow")).toBe("0");
    expect(progressCount(container)).toBe("0 / 12 Items");
    expect(screen.getByText("Your basket is waiting")).toBeTruthy();
    expect(screen.getByText("Your basket is looking a little lonely.")).toBeTruthy();
    expect(screen.getByText("0% completed")).toBeTruthy();
    expect(screen.getByText("12 still to buy")).toBeTruthy();
  });

  it("the first tick moves the progress and earns the first-tick line", () => {
    const { container } = render(<GrocerySection />);
    fireEvent.click(boxFor("Garlic"));
    expect(progressCount(container)).toBe("1 / 12 Items");
    expect(screen.getByText("Nice. One down!")).toBeTruthy();
    expect(screen.getByText("8% completed")).toBeTruthy();
    expect(screen.getByText("11 still to buy")).toBeTruthy();
    expect(
      screen.getByRole("progressbar", { name: "Shopping progress" }).getAttribute("aria-valuenow"),
    ).toBe("1");
  });

  it("a tick writes the real prefs document, stamped with the list's signature", () => {
    render(<GrocerySection />);
    fireEvent.click(boxFor("Garlic"));
    const entry = loadDoc()[GROCERY_BOUGHT_KEY] as { value: unknown };
    expect(entry.value).toEqual({
      version: 1,
      signature: dalSignature(),
      bought: [dalItemId("Garlic")],
    });
  });

  it("tabs filter for real and carry live counts", () => {
    render(<GrocerySection />);
    const all = screen.getByRole("button", { name: /all items/i });
    const toBuy = screen.getByRole("button", { name: /to buy/i });
    const basket = screen.getByRole("button", { name: /in basket/i });
    expect(all.textContent).toContain("12");
    expect(toBuy.textContent).toContain("12");
    expect(basket.textContent).toContain("0");
    expect(all.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(boxFor("Garlic"));
    expect(toBuy.textContent).toContain("11");
    expect(basket.textContent).toContain("1");

    fireEvent.click(basket);
    expect(basket.getAttribute("aria-pressed")).toBe("true");
    expect(boxFor("Garlic")).toBeTruthy();
    expect(screen.queryByRole("checkbox", { name: "Mark Onion as bought" })).toBeNull();

    fireEvent.click(toBuy);
    expect(screen.queryByRole("checkbox", { name: "Mark Garlic as bought" })).toBeNull();
    expect(boxFor("Onion")).toBeTruthy();
  });

  it("each aisle carries its glyph and its own completion count", () => {
    const { container } = render(<GrocerySection />);
    const icons = [...container.querySelectorAll(".shop-group-icon")];
    /* The dal list's aisles, in the lib's order: produce, pantry,
       spices. M-225: drawn Lucide glyphs — raw emoji icons are retired. */
    expect(icons).toHaveLength(3);
    for (const el of icons) {
      expect(el.tagName.toLowerCase()).toBe("svg");
      expect(el.textContent).toBe("");
    }
    const counts = () =>
      [...container.querySelectorAll(".shop-group-count")].map((el) => el.textContent);
    expect(counts()).toEqual(["0 / 6 completed", "0 / 3 completed", "0 / 3 completed"]);
    fireEvent.click(boxFor("Garlic"));
    expect(counts()).toEqual(["1 / 6 completed", "0 / 3 completed", "0 / 3 completed"]);
  });

  it("search filters by name across the aisles, and says so when nothing matches", () => {
    const { container } = render(<GrocerySection />);
    const input = screen.getByLabelText("Search ingredients");
    fireEvent.change(input, { target: { value: "garlic" } });
    expect(boxFor("Garlic")).toBeTruthy();
    expect(screen.queryByText("Table salt")).toBeNull();
    expect(container.querySelectorAll(".shop-group")).toHaveLength(1);

    fireEvent.change(input, { target: { value: "zzz" } });
    expect(screen.getByText(/Nothing matches “zzz”/)).toBeTruthy();
    expect(screen.getByText("Try a different ingredient name.")).toBeTruthy();

    fireEvent.change(input, { target: { value: "" } });
    expect(boxFor("Table salt")).toBeTruthy();
  });

  it("shopping mode: pinned count, aisles of what's left, the basket gathered at the end", () => {
    const { container } = render(<GrocerySection />);
    fireEvent.click(screen.getByRole("button", { name: /start shopping/i }));
    expect(container.querySelector("section")?.className).toContain("is-shopping");
    expect(container.querySelector(".shop-sticky-count")?.textContent).toBe("0 / 12 in basket");
    expect(screen.getByText("Still to get · 12")).toBeTruthy();
    expect(screen.queryByText(/In your basket ·/)).toBeNull();

    fireEvent.click(boxFor("Garlic"));
    expect(screen.getByText("Still to get · 11")).toBeTruthy();
    expect(screen.getByText("In your basket · 1")).toBeTruthy();
    expect(container.querySelector(".shop-basket-list")?.textContent).toContain("Garlic");
    /* Garlic shows once — in the basket, not also in its aisle. */
    expect(screen.getAllByRole("checkbox", { name: "Mark Garlic as bought" })).toHaveLength(1);
    expect(container.querySelector(".shop-sticky-count")?.textContent).toBe("1 / 12 in basket");

    fireEvent.click(screen.getByRole("button", { name: /exit shopping/i }));
    expect(screen.getByRole("button", { name: /start shopping/i })).toBeTruthy();
    expect(container.querySelector("section")?.className).not.toContain("is-shopping");
  });

  it("at 100% the completion state arrives — and an untick leaves it", () => {
    const { container } = render(<GrocerySection />);
    for (let i = 0; i < 12; i += 1) {
      const next = screen
        .getAllByRole("checkbox")
        .find((box) => box.getAttribute("aria-checked") === "false");
      if (!next) break;
      fireEvent.click(next);
    }
    expect(screen.getByText("Your shopping is complete")).toBeTruthy();
    expect(screen.getByText("12 items collected.")).toBeTruthy();
    expect(screen.getByText("Everything you need for your meal plan is ready.")).toBeTruthy();
    expect(screen.getByRole("button", { name: /back to meal plan/i })).toBeTruthy();
    expect(screen.queryByRole("progressbar", { name: "Shopping progress" })).toBeNull();

    const ticked = screen
      .getAllByRole("checkbox")
      .find((box) => box.getAttribute("aria-checked") === "true")!;
    fireEvent.click(ticked);
    expect(screen.queryByText("Your shopping is complete")).toBeNull();
    expect(progressCount(container)).toBe("11 / 12 Items");
    expect(screen.getByText("Almost done")).toBeTruthy();
    expect(screen.getByText("Just a few more things.")).toBeTruthy();
  });

  it("ticks restore on a fresh render under the list's own signature", () => {
    writeGroceryBought(groceryBoughtValueOf(dalSignature(), [dalItemId("Garlic")]));
    const { container } = render(<GrocerySection />);
    expect(boxFor("Garlic").getAttribute("aria-checked")).toBe("true");
    expect(boxFor("Onion").getAttribute("aria-checked")).toBe("false");
    expect(progressCount(container)).toBe("1 / 12 Items");
  });

  it("ticks stored under another list's signature restore nothing", () => {
    const other = groceryListSignature(
      ["2026-11-19"],
      dalList().groups.flatMap((group) => group.items.map((item) => item.foodId)),
    );
    writeGroceryBought(groceryBoughtValueOf(other, [dalItemId("Garlic")]));
    const { container } = render(<GrocerySection />);
    expect(boxFor("Garlic").getAttribute("aria-checked")).toBe("false");
    expect(progressCount(container)).toBe("0 / 12 Items");
  });
});
