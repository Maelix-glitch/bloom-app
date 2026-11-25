// @vitest-environment jsdom
/**
 * Nutrition D4 — the Dishes section: the library rendered with
 * bilingual names and computed per-serving numbers, the lib's filters
 * on the chips that remain (search, category, cuisine, enriched), the detail
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
  DISH_LIBRARY,
  dishNutrients,
  findDish,
  readFoodLog,
  type Dish,
} from "@/lib/nutrition";
import { dishRegion } from "@/lib/nutrition/regions";
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
const avial = findDish("dish-avial")!;

function cardOf(dish: Dish) {
  return screen.getByRole("button", { name: `${dish.name.en}, view recipe` });
}

/* The shelf renders in pages now (component slice §M — the whole
   1,203-card library no longer mounts at once). Tests that assert a
   specific dish's card page through "Show more" the way a person
   would, instead of assuming every card is already in the DOM. */
function revealCard(dish: Dish) {
  for (let i = 0; i < 40; i += 1) {
    const found = screen.queryByRole("button", { name: `${dish.name.en}, view recipe` });
    if (found) return found;
    const more = screen.queryByRole("button", { name: /Show more/ });
    if (!more) break;
    fireEvent.click(more);
  }
  return cardOf(dish);
}

describe("DishesSection, browsing", () => {
  it("caps the dish grid's phone column so long names cannot stretch it past the screen (M-249)", () => {
    render(<DishesSection day={todayLocal()} />);
    const card = revealCard(dal);
    const list = card.closest("ul");
    expect(list).toBeTruthy();
    /* grid-cols-1 = minmax(0,1fr): the track can never exceed the
       screen, so the title's truncate engages inside the card. Without
       it the implicit column auto-sizes to the widest title (~200px of
       spill on a phone, measured live 2026-11-25). */
    expect(list!.className).toContain("grid-cols-1");
    expect(list!.className).toContain("sm:grid-cols-2");
  });

  it("renders the library with bilingual names and computed per-serving numbers", () => {
    render(<DishesSection day={todayLocal()} />);
    expect(screen.getByText(/1,203 dishes/)).toBeTruthy();
    const card = revealCard(dal);
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
    expect(screen.queryByRole("button", { name: `${dal.name.en}, view recipe` })).toBeNull();
    expect(
      screen.getByRole("button", { name: /Mint-Coriander Chutney, view recipe/ }),
    ).toBeTruthy();
  });

  /* Chip counts pin the integrated library: 1,203 dishes (Indian 376,
     Kerala 125, International 702) — method 14 (2026-11-20) added the
     plain Steamed Rice (Indian) to the 1,202 of the 2026-11-17 protein
     waves, which added 299 dishes to the borderline-trimmed 903 (Indian 300, Kerala
     97, International 506; the borderline removal took out 7
     sugar-defined / deep-fried dishes; 910 / 306 / 98 after the same
     day's duplicate audit removed 31 twice-authored dishes; 941 / 313 /
     530 before that). */
  it("offers cuisine chips with live counts counted from the shelf", () => {
    render(<DishesSection day={todayLocal()} />);
    const group = screen.getByRole("group", { name: "Cuisine" });
    expect(within(group).getByRole("button", { name: "All · 1203" })).toBeTruthy();
    expect(within(group).getByRole("button", { name: "Indian · 376" })).toBeTruthy();
    expect(within(group).getByRole("button", { name: "Kerala · 125" })).toBeTruthy();
    expect(within(group).getByRole("button", { name: "International · 702" })).toBeTruthy();
  });

  it("selecting a cuisine shows only that cuisine's dishes", () => {
    render(<DishesSection day={todayLocal()} />);
    fireEvent.click(screen.getByRole("button", { name: "Kerala · 125" }));
    expect(screen.getByText(/125 dishes/)).toBeTruthy();
    expect(screen.getByText(/Kerala dishes only/)).toBeTruthy();
    expect(revealCard(avial)).toBeTruthy();
    /* An Indian dish and an international dish both fall away. */
    expect(screen.queryByRole("button", { name: `${dal.name.en}, view recipe` })).toBeNull();
    expect(
      screen.queryByRole("button", {
        name: "Herb-Grilled Chicken with Broccoli, view recipe",
      }),
    ).toBeNull();
  });

  it("the cuisine filter composes with search, an impossible pairing is honestly empty", () => {
    render(<DishesSection day={todayLocal()} />);
    fireEvent.click(screen.getByRole("button", { name: "International · 702" }));
    fireEvent.change(screen.getByLabelText("Search dishes"), {
      target: { value: "masoor" },
    });
    /* Masoor dal is Indian — under International there is nothing to
       show, and the section says so instead of padding the list. */
    expect(screen.getByText(/0 dishes/)).toBeTruthy();
    expect(screen.getByText(/No dishes match, try clearing a filter/)).toBeTruthy();
    /* Clearing restores the whole library, cuisine included. */
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByText(/1,203 dishes/)).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "All · 1203" }).getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("the cuisine filter sits under the silent pattern governance", () => {
    seedAnswers({ dietaryPattern: "vegan" });
    render(<DishesSection day={todayLocal()} />);
    /* The chip counts are counted from the governed shelf: of the 97
       Kerala dishes, 56 suit a vegan pattern. */
    fireEvent.click(screen.getByRole("button", { name: "Kerala · 63" }));
    expect(screen.getByText(/63 dishes/)).toBeTruthy();
    expect(screen.getByText(/showing what suits you, Vegan pattern/)).toBeTruthy();
    expect(screen.getByText(/Kerala dishes only/)).toBeTruthy();
    /* Avial carries curd — the pattern keeps it off the shelf even
       inside its own cuisine. */
    expect(screen.queryByRole("button", { name: "Avial, view recipe" })).toBeNull();
    /* And still no pattern or budget controls appear alongside. */
    expect(screen.queryByRole("group", { name: "Pattern" })).toBeNull();
    expect(screen.queryByRole("group", { name: "Budget" })).toBeNull();
  });

  it("names the omnivore pattern in the Assessment's own term and says it excludes nothing", () => {
    seedAnswers({ dietaryPattern: "omnivore" });
    render(<DishesSection day={todayLocal()} />);
    /* One concept, one term: "Omnivore" (the Assessment's label), never
       the dish-suitability vocabulary "non-vegetarian" — and since the
       pattern filters nothing out (pinned in dishBrowse.test.ts), the
       line says so instead of claiming a selection happened. */
    expect(screen.getByText(/your pattern is Omnivore, it excludes nothing/)).toBeTruthy();
    expect(screen.queryByText(/non-vegetarian/i)).toBeNull();
    expect(screen.queryByText(/showing what suits you/)).toBeNull();
    expect(screen.getByText(/1,203 dishes/)).toBeTruthy();
  });

  it("searches by Hindi name", () => {
    render(<DishesSection day={todayLocal()} />);
    fireEvent.change(screen.getByLabelText("Search dishes"), {
      target: { value: "मसूर" },
    });
    expect(cardOf(dal)).toBeTruthy();
    /* A dish whose names carry no मसूर falls away. */
    expect(
      screen.queryByRole("button", { name: "Jeera Rice, view recipe" }),
    ).toBeNull();
  });

  it("an impossible filter set is honestly empty, and clearing restores the library", () => {
    render(<DishesSection day={todayLocal()} />);
    fireEvent.change(screen.getByLabelText("Search dishes"), {
      target: { value: "zzqqx-nothing" },
    });
    expect(screen.getByText(/No dishes match, try clearing a filter/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByText(/1,203 dishes/)).toBeTruthy();
  });

  it("the shelf follows the person's own pattern, silently, with no pattern or budget controls", () => {
    seedAnswers({ dietaryPattern: "vegan" });
    render(<DishesSection day={todayLocal()} />);
    expect(screen.getByText(/showing what suits you, Vegan pattern/)).toBeTruthy();
    /* The ghee tadka is not vegan — it is not on the shelf. */
    expect(screen.queryByRole("button", { name: `${dal.name.en} view recipe` })).toBeNull();
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
    expect(screen.getByText(/1,203 dishes/)).toBeTruthy();
  });

  it("a stated budget keeps dishes above the tier off the shelf", () => {
    /* Method 13 rewrite (2026-11-19, the dish-first repair): the
       budget no longer keeps anything off the shelf — it was
       silently hiding most of the library, the protein dishes
       first (the owner saw 545 of 1,202). The shelf now shows the
       full pattern pool, in-budget dishes sort first, and the
       status line names the budget as the preference it is. The
       title keeps its history; the contract is the new one. */
    seedAnswers({ foodBudget: 1 });
    render(<DishesSection day={todayLocal()} />);
    expect(screen.getByText(/your everyday ₹ budget preferred first/)).toBeTruthy();
    expect(screen.getByText(/1,203 dishes/)).toBeTruthy();
    /* The tier-1 dal leads; the tier-3 curry is ON the shelf now,
       further down the order — reachable, not hidden. */
    expect(cardOf(dal)).toBeTruthy();
    expect(revealCard(chickenCurry)).toBeTruthy();
  });

  it("with no budget stated, every tier is on the shelf", () => {
    render(<DishesSection day={todayLocal()} />);
    expect(revealCard(chickenCurry)).toBeTruthy();
    expect(screen.queryByText(/kept to an .* budget/)).toBeNull();
  });

  it("pages the shelf, one page of cards mounts, Show more extends it (§M)", () => {
    render(<DishesSection day={todayLocal()} />);
    const cards = () =>
      screen.getAllByRole("button", { name: /, view recipe$/ });
    /* The status line still counts the whole library… */
    expect(screen.getByText(/1,203 dishes/)).toBeTruthy();
    /* …but only the first page of cards is in the DOM. */
    expect(cards().length).toBe(48);
    expect(screen.getByRole("button", { name: /Show more/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Show more/ }));
    expect(cards().length).toBe(96);
  });

  it("a dish card carries its provenance chip, the detail sheet's own bundle (§M)", () => {
    render(<DishesSection day={todayLocal()} />);
    const card = revealCard(dal);
    expect(within(card).getByTestId("provenance-badge").textContent).toBe(
      "Built from USDA ingredient data",
    );
  });

  it("names the sort only when a personal judgement orders the shelf", () => {
    seedAnswers({ cuisinePreference: "south_indian" });
    render(<DishesSection day={todayLocal()} />);
    expect(screen.getByText(/best for you first/)).toBeTruthy();
    /* And the order is real: the library carries well over a page of
       south-region dishes, so a south-preference shelf's first page
       is entirely dishes of that region (the lib pins the full
       ordering property; this pins that the section applies it). */
    const cards = screen.getAllByRole("button", { name: /, view recipe$/ });
    expect(cards.length).toBe(48);
    for (const card of cards) {
      const name = card.getAttribute("aria-label")!.replace(/, view recipe$/, "");
      const dish = DISH_LIBRARY.find((d) => d.name.en === name)!;
      expect(dishRegion(dish)).toBe("south_indian");
    }
  });
});

describe("DishesSection, the detail sheet and logging", () => {
  it("shows the recipe under its provenance, and logs one serving as a dish entry", () => {
    const today = todayLocal();
    render(<DishesSection day={today} />);
    fireEvent.click(revealCard(dal));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Built from USDA ingredient data")).toBeTruthy();
    /* Ingredient lines carry friendly names, Hindi alongside — the
       dish's own Hindi title and the lentils' Hindi name both show. */
    expect(within(dialog).getByText(/Red lentils \(masoor dal\)/)).toBeTruthy();
    expect(within(dialog).getAllByText(/मसूर दाल/).length).toBeGreaterThan(1);
    /* The method is there, numbered steps from the recipe itself. */
    expect(within(dialog).getByText(/pressure-cook/i)).toBeTruthy();

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
