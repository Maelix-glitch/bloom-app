// @vitest-environment jsdom
/**
 * The N3 guard (brief v7, Slice N3) — meals as rows on the day path,
 * as executable pins, in Bloom's guard tradition (vitest/jsdom + CSS
 * source pins; this repo has no Playwright):
 *
 *   (a) ONE PANEL, ROWS IN PLANVIEW ORDER (M-146, M-159) — the meal
 *       cards collapse into a single `.meals-panel`; every meal is a
 *       `.meal-row` with `id="meal-{slot}"`, in sortMeals order
 *       (snack before dinner); no `.nut-card` nests inside the panel.
 *   (b) THE DAY PATH IS MOUNTED (M-144) — `.day-path` renders in the
 *       plan section, the `.nut-timeline` list is gone, and no "—"
 *       placeholder stands in the path or in any row's head (the
 *       timeline's time cells were M-144's harm; the rows' times
 *       come from the same rail data, so the pin scopes there).
 *   (c) NUMBERS ONCE (M-146) — each row's meta line carries its
 *       meal's kcal exactly once and protein exactly once (the
 *       composed totals from mealTotals, via the view); the macro
 *       table's four column headers are identical in every row; the
 *       old card header numeral and foot macro list are gone.
 *   (d) CLOCK PRIMARY (M-149) — at a fixed 19:00 the ONE gold
 *       "Log meal" sits on dinner; at 08:00 it sits on breakfast;
 *       every unlogged meal keeps a (ghost) Log meal button.
 *   (e) COOKING BADGE (M-139, display only) — a cooked dish under a
 *       "no cooking, ~10 min" plan wears an amber, dashed-underlined
 *       conflict badge; a no-cook dish under the same answers wears
 *       a plain "No cooking" badge. The composer is untouched.
 *   (f) NAMES (M-148) — displayDishName returns the curated local
 *       name for india/kerala dishes and null for international
 *       (mechanical transliteration) and untagged dishes; the page
 *       shows Chicken Rezala's Hindi name and never the
 *       transliteration of an international dish's name; no raw
 *       dish id appears in the section's text.
 *   (g) PHOTOS (M-150) — row thumbs and DayPath thumbs resolve
 *       through the reviewed manifest only (dishPhotoFor): a
 *       photographed anchor shows its manifest src, a photo-less
 *       one shows nothing; a row thumb that fails to load falls
 *       back to the petal tile.
 *   (h) DISH IDEA, DEMOTED — on a food-composed plan the idea is a
 *       quiet text link inside the row's expansion, not a labelled
 *       block under the card; collapsed rows show no idea at all.
 *   (i) HIDE CALORIES (contract) — buildPlanView's prefs flip
 *       showKcal, and the row renderer consumes view.showKcal for
 *       its kcal cells (source pin; no setting ships yet — see
 *       planView.ts's own header).
 *   (j) ADD-ONS SAY THEY ARE INCLUDED (M-147, closed at N6) — a
 *       top-up row carries the quiet "Included in total" badge; an
 *       ordinary suggestion row carries none; and the meal's one
 *       stated total (mealTotals) still sums the top-up in.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

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
import { todayLocal } from "@/lib/localDay";
import { fmtInt } from "@/lib/format";
import {
  ASSESSMENT_KEY,
  EMPTY_ANSWERS,
  toHealthProfile,
  type AssessmentState,
} from "@/lib/assessment/state";
import {
  dishNutrients,
  dishPhotoFor,
  dishPreparationNeeds,
  dishProvenance,
  DISH_LIBRARY,
  findDish,
  generatePlan,
  mealTotals,
  readPlan,
  sortMeals,
  USDA_REFERENCE_FOODS,
  writePlan,
  type DailyPlan,
  type Dish,
  type PlanDish,
} from "@/lib/nutrition";
import { displayDishName } from "@/lib/nutrition/displayName";
import { buildPlanView } from "@/lib/nutrition/planView";
import { toSafetyInput } from "@/lib/vitalis/domain/profile";
import { classifySafety } from "@/lib/vitalis/safety/classify";
import { targetsFor } from "@/lib/vitalis/calc/body";
import { NutritionPlanSection } from "./NutritionPlanSection";
import { MEAL_LABEL } from "./input";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

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
        removeListener: () => {},
        onchange: null,
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList);
  window.localStorage.clear();
  resetPrefCache();
});

/* --------------------------- fixtures ------------------------------ */

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

/** A real composed plan (the 2026-11-18 rotation, dish-first),
 *  re-stamped to today — the house fixture pattern — with an
 *  optional surgical mutation applied before it is stored. */
function makePlan(mutate?: (plan: DailyPlan) => DailyPlan, withDishes = true): DailyPlan {
  seedAssessment(COMPLETE);
  const state: AssessmentState = {
    version: 1,
    status: "complete",
    step: "summary",
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
    gatedOutcome: targetsFor(profile, safety, "2026-11-18"),
    fallbackTargets: null,
    foods: USDA_REFERENCE_FOODS,
    ...(withDishes ? { dishes: DISH_LIBRARY } : {}),
    day: "2026-11-18",
    now: "2026-11-18T03:00:00.000Z",
    id: "plan-meals-guard",
  });
  if (!outcome.ok) throw new Error("expected a plan");
  const stamped = { ...outcome.plan, day: todayLocal() };
  const finalPlan = mutate ? mutate(stamped) : stamped;
  writePlan(finalPlan);
  const stored = readPlan();
  if (!stored) throw new Error("expected a stored plan");
  return stored;
}

function planDishFor(dish: Dish): PlanDish {
  return {
    dishId: dish.id,
    name: dish.name.en,
    hindi: dish.name.hindi,
    role: "anchor",
    servings: 1,
    nutrients: dishNutrients(dish).nutrients,
    provenance: dishProvenance(dish),
  };
}

function planSection(container: HTMLElement): HTMLElement {
  /* Brief v7 N5: the meal rows live in the day section — the header
     card ("Your plan for today") carries the plan's head alone. */
  const section = container.querySelector<HTMLElement>('section[aria-label="Your day"]');
  if (!section) throw new Error("day section did not render");
  return section;
}

function mealRow(container: HTMLElement, slot: string): HTMLElement {
  const row = planSection(container).querySelector<HTMLElement>(`#meal-${slot}`);
  if (!row) throw new Error(`meal row #meal-${slot} did not render`);
  return row;
}

/** Drive a row to a known expansion state — the clock's primary
 *  row starts open, so a bare click is not a state. */
function setRowOpen(row: HTMLElement, open: boolean): void {
  const toggle = row.querySelector<HTMLButtonElement>(".meal-row__toggle");
  if (!toggle) throw new Error("meal row has no toggle");
  if ((toggle.getAttribute("aria-expanded") === "true") !== open) {
    fireEvent.click(toggle);
  }
}

/* --------------------- stylesheet pin helpers ---------------------- */

const SRC = join(process.cwd(), "src");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");
const stripComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, " ");

function blocks(text: string): { selector: string; body: string }[] {
  const clean = stripComments(text);
  const out: { selector: string; body: string }[] = [];
  let prev = 0;
  for (const m of clean.matchAll(/\{([^{}]*)\}/g)) {
    out.push({ selector: clean.slice(prev, m.index).trim(), body: m[1]! });
    prev = m.index + m[0].length;
  }
  return out;
}

function rulesFor(sel: string): { selector: string; body: string }[] {
  return blocks(read("styles/nutrition.css")).filter((b) => {
    const lastLine = b.selector.split("\n").pop() ?? "";
    return lastLine
      .split(",")
      .map((s) => s.trim())
      .includes(sel);
  });
}

const ruleBody = (sel: string) =>
  rulesFor(sel)
    .map((b) => b.body)
    .join("\n");

/* ---------------- (a) one panel, planView order -------------------- */

describe("N3 — one panel, meals as rows in planView order", () => {
  it("rows render in sortMeals order inside one panel, with no card-in-card", () => {
    const plan = makePlan();
    const { container } = render(<NutritionPlanSection />);
    const section = planSection(container);

    const panels = section.querySelectorAll(".meals-panel");
    expect(panels).toHaveLength(1);
    const panel = panels[0]!;
    expect(panel.querySelectorAll(".nut-card")).toHaveLength(0);
    expect(section.querySelectorAll(".nut-card.meal")).toHaveLength(0);

    const rows = [...panel.querySelectorAll(".meal-row")];
    const expected = sortMeals(plan.meals).map((m) => m.meal);
    expect(rows.map((r) => r.getAttribute("data-meal"))).toEqual(expected);
    /* The canonical order puts the snack before dinner (M-159). */
    expect(expected.indexOf("snack")).toBeLessThan(expected.indexOf("dinner"));
    for (const row of rows) {
      expect(row.id).toBe(`meal-${row.getAttribute("data-meal")}`);
      expect(row.getAttribute("aria-label")).toBe(
        `${MEAL_LABEL[row.getAttribute("data-meal") as keyof typeof MEAL_LABEL]} plan`,
      );
    }
    /* Rows are separated by hairlines inside the one panel. */
    expect(ruleBody(".meal-row")).toContain("border-top");
  });
});

/* --------------------- (b) the day path mounted -------------------- */

describe("N3 — the day path replaces the timeline", () => {
  it("DayPath is mounted with the view's rail; the timeline list and its dashes are gone", () => {
    makePlan();
    const { container } = render(<NutritionPlanSection />);
    const section = planSection(container);

    const path = section.querySelector(".day-path");
    expect(path, "the day path renders in the plan section").not.toBeNull();
    expect(section.querySelector(".nut-timeline")).toBeNull();
    expect(path!.textContent).not.toContain("—");
    /* Meal stops link to the rows that now exist. */
    for (const slot of ["breakfast", "lunch", "snack", "dinner"]) {
      const stop = path!.querySelector(`.day-path__stop[data-key="${slot}"] a`);
      expect(stop?.getAttribute("href")).toBe(`#meal-${slot}`);
    }
    /* No row head states a time as a dash either. */
    for (const head of section.querySelectorAll(".meal-row__head")) {
      expect(head.textContent).not.toContain("—");
    }
    /* The old timeline CSS is retired with the list. */
    expect(stripComments(read("styles/nutrition.css"))).not.toContain(".nut-timeline");
  });
});

/* ------------------------- (c) numbers once ------------------------ */

describe("N3 — each meal's numbers are said once", () => {
  it("the meta line carries kcal once and protein once, from mealTotals; macro headers align", () => {
    const plan = makePlan();
    const { container } = render(<NutritionPlanSection />);
    const section = planSection(container);

    for (const meal of sortMeals(plan.meals)) {
      const row = mealRow(container, meal.meal);
      const meta = row.querySelector("[data-meta]");
      expect(meta, `${meal.meal} meta line`).not.toBeNull();
      const totals = mealTotals(meal);
      expect(meta!.textContent).toContain(`${fmtInt(Math.round(totals.kcal))} kcal`);
      expect((meta!.textContent!.match(/kcal/g) ?? []).length).toBe(1);
      expect((meta!.textContent!.match(/protein/g) ?? []).length).toBe(1);
      /* The old card header numeral and foot macro list are gone. */
      expect(row.querySelector("p.shrink-0")).toBeNull();
      expect(row.querySelector(".macros")).toBeNull();
      expect(row.querySelector(".meal__foot")).toBeNull();
      /* The macro table: the same four column headers in every row. */
      const headers = [...row.querySelectorAll(".meal-macros th")].map((th) =>
        th.textContent!.trim(),
      );
      expect(headers).toEqual(["Protein", "Carbs", "Fat", "Fibre"]);
      const cells = [...row.querySelectorAll(".meal-macros td")].map((td) =>
        td.textContent!.trim(),
      );
      expect(cells[0]).toBe(`${fmtInt(Math.round(totals.proteinG))} g`);
    }
    expect(section.querySelectorAll(".meal-macros")).toHaveLength(plan.meals.length);
    /* Fixed columns: the table cannot reflow its columns per row. */
    expect(ruleBody(".meal-macros")).toContain("table-layout: fixed");
  });
});

/* ------------------------- (d) clock primary ----------------------- */

describe("N3 — the gold Log meal follows the clock", () => {
  function goldRowAt(hour: number): { gold: HTMLElement[]; section: HTMLElement } {
    const today = todayLocal();
    makePlan();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`${today}T${String(hour).padStart(2, "0")}:00:00`));
    const { container } = render(<NutritionPlanSection />);
    const section = planSection(container);
    const gold = [...section.querySelectorAll<HTMLElement>(".nut-btn-gold")].filter(
      (b) => b.textContent === "Log meal",
    );
    return { gold, section };
  }

  it("at 19:00 the one gold Log meal sits on dinner, never on breakfast by default", () => {
    const { gold, section } = goldRowAt(19);
    expect(gold).toHaveLength(1);
    expect(gold[0]!.closest(".meal-row")!.id).toBe("meal-dinner");
    /* Every unlogged meal still offers its (ghost) Log meal. */
    expect(
      [...section.querySelectorAll("button")].filter((b) => b.textContent === "Log meal"),
    ).toHaveLength(4);
  });

  it("at 08:00 the one gold Log meal sits on breakfast", () => {
    const { gold } = goldRowAt(8);
    expect(gold).toHaveLength(1);
    expect(gold[0]!.closest(".meal-row")!.id).toBe("meal-breakfast");
  });
});

/* ------------------------- (e) cooking badge ----------------------- */

describe("N3 — the cooking badge (M-139, display only)", () => {
  const rezala = () => {
    const dish = findDish("dish-chicken-rezala");
    if (!dish) throw new Error("Chicken Rezala not in the library");
    return dish;
  };
  const noCookDish = () => {
    const dish = DISH_LIBRARY.find((d) => dishPreparationNeeds(d).noCook);
    if (!dish) throw new Error("no no-cook dish in the library");
    return dish;
  };

  function badgeFixture(): DailyPlan {
    return makePlan((plan) => ({
      ...plan,
      inputs: { ...plan.inputs, cookingAbility: "none", prepTimeMaxMinutes: 10 },
      meals: plan.meals.map((m) =>
        m.meal === "lunch"
          ? { ...m, dishes: [planDishFor(rezala())] }
          : m.meal === "snack"
            ? { ...m, dishes: [planDishFor(noCookDish())] }
            : m,
      ),
    }));
  }

  it("a cooked dish under no-cooking answers wears the amber dashed conflict badge", () => {
    badgeFixture();
    const { container } = render(<NutritionPlanSection />);
    const lunch = mealRow(container, "lunch");
    const badge = lunch.querySelector(".meal-row__meta [data-cooking-badge]");
    expect(badge, "the row's meta carries the anchor's badge").not.toBeNull();
    expect(badge!.textContent).toContain("Cooked");
    expect(badge!.getAttribute("data-conflict")).toBe("true");
    /* The same badge rides the dish inside the expansion. */
    setRowOpen(lunch, true);
    const dishBadge = lunch.querySelector(
      ".meal-row__body [data-cooking-badge]",
    );
    expect(dishBadge).not.toBeNull();
    expect(dishBadge!.getAttribute("data-conflict")).toBe("true");
  });

  it("a no-cook dish under the same answers wears a plain badge, no conflict", () => {
    badgeFixture();
    const { container } = render(<NutritionPlanSection />);
    const snack = mealRow(container, "snack");
    const badge = snack.querySelector(".meal-row__meta [data-cooking-badge]");
    expect(badge).not.toBeNull();
    expect(badge!.textContent).toContain("No cooking");
    expect(badge!.hasAttribute("data-conflict")).toBe(false);
  });

  it("a stored plan whose snapshot lacks the kitchen answers is judged by the current Assessment answers", () => {
    /* The live shape (PR #210 sweep): the plan on the account was
       composed before its inputs snapshot carried the kitchen fields,
       so plan.inputs reads null for both — while the person's
       Assessment answers say "no cooking, ~10 min" outright. The
       badge must fall back to those answers (display only). */
    makePlan((plan) => ({
      ...plan,
      inputs: { ...plan.inputs, cookingAbility: null, prepTimeMaxMinutes: null },
      meals: plan.meals.map((m) =>
        m.meal === "lunch" ? { ...m, dishes: [planDishFor(rezala())] } : m,
      ),
    }));
    const state: AssessmentState = {
      version: 1,
      status: "complete",
      step: "summary",
      answers: { ...EMPTY_ANSWERS, ...COMPLETE, cookingAbility: "none", prepTimeMaxMinutes: 10 },
      consents: [],
      startedAt: null,
      completedAt: "2026-11-10T03:05:00.000Z",
      updatedAt: "2026-11-10T03:05:00.000Z",
    };
    setPref(ASSESSMENT_KEY, state);
    resetPrefCache();

    const { container } = render(<NutritionPlanSection />);
    const lunch = mealRow(container, "lunch");
    const badge = lunch.querySelector(".meal-row__meta [data-cooking-badge]");
    expect(badge, "the row's meta carries the anchor's badge").not.toBeNull();
    expect(badge!.textContent).toContain("Cooked");
    expect(badge!.getAttribute("data-conflict")).toBe("true");
  });

  it("CSS: the conflict badge is amber with a dashed underline", () => {
    const body = ruleBody('.cook-badge[data-conflict="true"]');
    expect(body).toContain("var(--amber)");
    expect(body).toContain("dashed");
  });
});

/* ---------------------------- (f) names ---------------------------- */

describe("N3 — names: curated local names only (M-148)", () => {
  it("displayDishName: india/kerala keep the local name; international and untagged lose it", () => {
    const india = DISH_LIBRARY.find((d) => d.cuisine === "india");
    const kerala = DISH_LIBRARY.find((d) => d.cuisine === "kerala");
    const intl = DISH_LIBRARY.find((d) => d.cuisine === "international");
    if (!india || !kerala || !intl) throw new Error("library census changed");
    expect(displayDishName(india)).toEqual({ en: india.name.en, hindi: india.name.hindi });
    expect(displayDishName(kerala).hindi).toBe(kerala.name.hindi);
    expect(displayDishName(intl)).toEqual({ en: intl.name.en, hindi: null });
    const { cuisine: _dropped, ...untagged } = intl;
    expect(displayDishName(untagged).hindi).toBeNull();
  });

  it("the page shows a curated Hindi name and never an international transliteration or a raw id", () => {
    const intl = DISH_LIBRARY.find(
      (d) => d.cuisine === "international" && d.category === "main",
    );
    if (!intl) throw new Error("no international main in the library");
    makePlan((plan) => ({
      ...plan,
      meals: plan.meals.map((m) =>
        m.meal === "lunch"
          ? { ...m, dishes: [planDishFor(findDish("dish-chicken-rezala")!)] }
          : m.meal === "dinner"
            ? { ...m, dishes: [planDishFor(intl)] }
            : m,
      ),
    }));
    const { container } = render(<NutritionPlanSection />);
    const section = planSection(container);
    /* Chicken Rezala (india) keeps its real Hindi name on the page. */
    expect(section.textContent).toContain("चिकन रेज़ाला");
    /* The international dish shows under its English name only. */
    const dinner = mealRow(container, "dinner");
    expect(dinner.textContent).toContain(intl.name.en);
    expect(section.textContent).not.toContain(intl.name.hindi);
    /* No raw dish id leaks into rendered text anywhere on the page. */
    expect(section.textContent).not.toMatch(/dish-[a-z0-9]+(?:-[a-z0-9]+)+/);
  });
});

/* ---------------------------- (g) photos --------------------------- */

describe("N3 — photos from the reviewed set only (M-150)", () => {
  it("row and path thumbs match the manifest for every meal's anchor", () => {
    const plan = makePlan();
    const { container } = render(<NutritionPlanSection />);
    const section = planSection(container);

    for (const meal of plan.meals) {
      const anchor = meal.dishes.find((d) => d.role === "anchor") ?? meal.dishes[0];
      const expected = anchor ? dishPhotoFor(anchor.dishId) : null;
      const row = mealRow(container, meal.meal);
      const rowImg = row.querySelector<HTMLImageElement>(".meal-row__thumb");
      const stop = section.querySelector(
        `.day-path__stop[data-key="${meal.meal}"] .day-path__thumb`,
      ) as HTMLImageElement | null;
      if (expected) {
        expect(rowImg, `${meal.meal} row thumb`).not.toBeNull();
        expect(rowImg!.getAttribute("src")).toBe(expected.src);
        expect(stop, `${meal.meal} path thumb`).not.toBeNull();
        expect(stop!.getAttribute("src")).toBe(expected.src);
      } else {
        expect(rowImg, `${meal.meal} has no reviewed photo → no row thumb`).toBeNull();
        expect(stop, `${meal.meal} has no reviewed photo → no path thumb`).toBeNull();
      }
    }
  });

  it("a row thumb that fails to load falls back to the petal tile", () => {
    const plan = makePlan();
    const { container } = render(<NutritionPlanSection />);
    const photographed = plan.meals.find((m) => {
      const anchor = m.dishes.find((d) => d.role === "anchor") ?? m.dishes[0];
      return anchor ? dishPhotoFor(anchor.dishId) !== null : false;
    });
    if (!photographed) throw new Error("fixture plan has no photographed anchor");
    const row = mealRow(container, photographed.meal);
    const img = row.querySelector<HTMLImageElement>(".meal-row__thumb");
    expect(img).not.toBeNull();
    fireEvent.error(img!);
    expect(row.querySelector(".meal-row__thumb")).toBeNull();
    expect(row.querySelector(".meal-row__petal")).not.toBeNull();
  });
});

/* ------------------------- (h) dish idea --------------------------- */

describe("N3 — the dish idea is a quiet link inside the expansion", () => {
  it("food-composed plan: no idea while collapsed; a text link, not a block, once expanded", () => {
    makePlan(undefined, false);
    const { container } = render(<NutritionPlanSection />);
    const lunch = mealRow(container, "lunch");

    setRowOpen(lunch, false);
    expect(within(lunch).queryByText(/Dish idea/)).toBeNull();
    setRowOpen(lunch, true);

    const idea = within(lunch).getByRole("button", { name: /Dish idea/ });
    expect(idea.classList.contains("meal-idea-link")).toBe(true);
    /* The old labelled block is gone: no group label carries it. */
    const labels = [...lunch.querySelectorAll(".nut-group-label")].map((el) => el.textContent);
    expect(labels).not.toContain("Dish idea");
    /* And it lives directly in the row — no card between it and
       the panel (the section's own card is the outer frame). */
    expect(idea.closest("article")).toBe(lunch);
  });
});

/* --------------------- (i) hideCalories contract ------------------- */

describe("N3 — hideCalories flows through the view to the rows", () => {
  it("buildPlanView honours prefs.hideCalories, and the row renderer consumes view.showKcal", () => {
    const plan = makePlan();
    const view = buildPlanView({
      plan,
      log: { loggedMealIds: new Set(), entries: [] },
      prefs: { hideCalories: true },
      byFoodId: new Map(),
    });
    expect(view.showKcal).toBe(false);
    const src = read("components/nutrition/NutritionPlanSection.tsx");
    expect(src).toContain("view.showKcal");
    expect(src).toContain("•••");
  });
});

/* ----------------- (j) add-ons say they are included --------------- */

describe("N6 — add-on rows carry the included marker (M-147)", () => {
  it("a top-up row wears 'Included in total'; a plain row does not; the total sums it in", () => {
    const topupFood = USDA_REFERENCE_FOODS[0]!;
    const plainFood = USDA_REFERENCE_FOODS[1]!;
    const plan = makePlan((p) => ({
      ...p,
      meals: p.meals.map((m) =>
        m.meal === "breakfast"
          ? {
              ...m,
              suggestions: [
                ...m.suggestions,
                {
                  foodId: plainFood.id,
                  name: plainFood.name,
                  grams: 50,
                  nutrients: { kcal: 20, proteinG: 1, carbsG: 4, fatG: 0 },
                  provenance: plainFood.provenance,
                },
                {
                  foodId: topupFood.id,
                  name: topupFood.name,
                  grams: 100,
                  nutrients: { kcal: 37, proteinG: 6, carbsG: 3, fatG: 0 },
                  provenance: topupFood.provenance,
                  layer: "topup" as const,
                },
              ],
            }
          : m,
      ),
    }));
    const breakfast = plan.meals.find((m) => m.meal === "breakfast")!;
    const { container } = render(<NutritionPlanSection />);
    const row = mealRow(container, "breakfast");
    setRowOpen(row, true);

    /* M-166 re-contract (equal strictness, new shape): the top-up no
       longer sits in a group of its own — it flows in the same list
       as the meal's other foods, so the visible rows can sum to the
       header. What is pinned now: NO separate top-up group exists,
       the top-up shares its <ul> with the plain suggestion rows, and
       it still wears the marker. */
    const labels = [...row.querySelectorAll(".nut-group-label")].map((el) => el.textContent);
    expect(labels).not.toContain("To complete the meal");
    const entries = [...row.querySelectorAll<HTMLElement>(".nut-entry")];
    const topupEntries = entries.filter((li) => li.querySelector("[data-included]"));
    expect(topupEntries).toHaveLength(1);
    const marker = topupEntries[0]!.querySelector("[data-included]");
    expect(marker, "the top-up row carries the included marker").not.toBeNull();
    expect(marker!.textContent).toBe("Included in total");
    expect(marker!.classList.contains("nut-badge")).toBe(true);

    /* Ordinary suggestion rows in the same expansion have none — and
       they share the top-up's own list, which is the M-166 point. */
    const otherEntries = entries.filter((li) => !li.querySelector("[data-included]"));
    expect(otherEntries.length).toBeGreaterThan(0);
    for (const li of otherEntries) {
      expect(li.querySelector("[data-included]")).toBeNull();
    }
    expect(topupEntries[0]!.closest("ul")).toBe(otherEntries[0]!.closest("ul"));

    /* Exactly one marker on this meal, and the row's one stated
       total is mealTotals — which sums the top-up's 37 kcal in
       (the lib pin for the sum itself is planView.test, M-147). */
    expect(row.querySelectorAll("[data-included]")).toHaveLength(1);
    const meta = row.querySelector("[data-meta]");
    expect(meta!.textContent).toContain(
      `${fmtInt(Math.round(mealTotals(breakfast).kcal))} kcal`,
    );
  });
});
