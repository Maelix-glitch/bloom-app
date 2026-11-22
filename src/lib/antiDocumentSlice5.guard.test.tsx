// @vitest-environment jsdom
/**
 * The anti-document guard, Slice 5 (anti-document brief v3) — the
 * Shopping list + Pantry (GrocerySection), Lab reports
 * (LabReportsSection) and the Assessment summary view, held to the
 * same four checks as Slices 1–4:
 *
 *   (a) no visible <p> over 200 characters outside <details>/<dialog>;
 *   (b) every card carries a visual anchor (meter, progressbar, svg,
 *       image, tile figure, vstat, badge/chip, empty row);
 *   (c) no card carries more than one visible paragraph of its own;
 *   (d) no form anatomy: no `.kv-row` carrying a switch or a `.kv-v`
 *       value cell inside a display section.
 *
 * The audit helper is duplicated from antiDocument.guard.test.ts
 * (the house pattern — guard files do not import across test files),
 * with CARD_SELECTOR extended by this slice's real card atoms:
 * `.pf-card` (the Profile card family), `.empty-row` (the empty-state
 * row atom) and `.assess-box` (the summary view's box atom, added by
 * this slice — the `.programme` precedent from Slice 4).
 *
 * The Profile "Your starting point" card has its own guard file
 * (antiDocumentProfile.guard.test.ts): it renders through the real
 * prefs store, which conflicts with the store mock this file's
 * Grocery/Labs fixtures use (the Slice 1 plan-guard precedent).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

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

import { GrocerySection } from "@/components/nutrition/GrocerySection";
import { LabReportsSection } from "@/components/profile/LabReportsSection";
import { AssessmentSummaryView } from "@/components/assessment/AssessmentSummaryView";
import { PANTRY_KEY, type PantryItem } from "@/lib/grocery/pantry";
import { LABS_KEY, type LabsValue } from "@/lib/labs/labs";
import { PLAN_KEY, foodDisplayName } from "@/lib/nutrition";
import { findDish } from "@/lib/nutrition/data/dishLibrary";
import { USDA_REFERENCE_FOODS } from "@/lib/nutrition/usdaReference";
import type { DailyPlan, PlanDish, PlanMeal } from "@/lib/nutrition/plan";
import { consentDecision } from "@/lib/vitalis/domain/consent";
import {
  beginAssessment,
  completeAssessment,
  emptyAssessmentState,
  recordConsents,
  saveStep,
  type AssessmentState,
} from "@/lib/assessment/state";
import { summaryOf } from "@/lib/assessment/summary";

afterEach(cleanup);

beforeEach(() => {
  /* jsdom ships no matchMedia, and BloomSheet asks it whether this
     is a phone (the LabReportsSection form sheet). */
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
  store.values = {};
});

/* ------------------------------ the audit ------------------------------ */

const ANCHOR_SELECTOR =
  ".meter, [role='progressbar'], svg, img, canvas, .tile__figure, .vstat, .nut-badge, .src-chip, .empty-row, .stat, .assess-state";
const CARD_SELECTOR = ".nut-card, .pf-card, .tile, .insight, .programme, .empty-row, .assess-box";

interface SectionAudit {
  longP: string[];
  anchorless: string[];
  manyP: string[];
  wideGap: number;
}

function visibleParagraphs(scope: HTMLElement): HTMLElement[] {
  return [...scope.querySelectorAll<HTMLElement>("p")].filter(
    (p) => !p.closest("details, dialog, [hidden]") && !p.closest('[data-allow="long-text"]'),
  );
}

function cardName(card: HTMLElement): string {
  return (
    card.querySelector("h2, h3")?.textContent?.trim() ??
    card.getAttribute("aria-label") ??
    "(untitled)"
  );
}

function ownerCard(p: HTMLElement, root: HTMLElement): HTMLElement {
  let el: HTMLElement | null = p.parentElement;
  while (el && el !== root) {
    if (el.matches(CARD_SELECTOR)) return el;
    el = el.parentElement;
  }
  return root;
}

function auditSection(root: HTMLElement): SectionAudit {
  const longP = visibleParagraphs(root)
    .filter((p) => (p.textContent ?? "").trim().length > 200)
    .map((p) => (p.textContent ?? "").trim().slice(0, 60));

  const cards = new Set<HTMLElement>([root]);
  root.querySelectorAll<HTMLElement>(CARD_SELECTOR).forEach((c) => cards.add(c));

  const allP = visibleParagraphs(root);
  const anchorless: string[] = [];
  const manyP: string[] = [];
  for (const card of cards) {
    if (!card.querySelector(ANCHOR_SELECTOR)) anchorless.push(cardName(card));
    const own = allP.filter((p) => ownerCard(p, root) === card);
    if (own.length > 1) manyP.push(cardName(card));
  }

  const wideGap = [...root.querySelectorAll<HTMLElement>(".kv-row, .setting")].filter(
    (row) => row.querySelector('[role="switch"], .kv-v') !== null,
  ).length;

  return { longP, anchorless, manyP, wideGap };
}

function expectNotADocument(root: HTMLElement) {
  const audit = auditSection(root);
  expect(audit.longP, "paragraphs over 200 chars").toEqual([]);
  expect(audit.anchorless, "cards with no visual anchor").toEqual([]);
  expect(audit.manyP, "cards with more than one paragraph").toEqual([]);
  expect(audit.wideGap, "label/value form rows").toBe(0);
}

/* --------------------------- grocery fixtures --------------------------- */

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

function seedPantryCoveringDal(): void {
  const item: PantryItem = {
    id: "pantry-1",
    name: dalFirstFood.name,
    foodId: dalFirstFood.id,
    quantityGrams: 5000,
    addedAt: "2026-11-18T05:00:00.000Z",
  };
  store.values[PANTRY_KEY] = [item];
}

/* --------------------------- summary fixture ---------------------------- */

function completedState(): AssessmentState {
  const T0 = "2026-11-10T10:00:00.000Z";
  const T1 = "2026-11-10T10:05:00.000Z";
  const T2 = "2026-11-12T09:30:00.000Z";
  let s = beginAssessment(emptyAssessmentState(T0), T0);
  s = recordConsents(
    s,
    [
      consentDecision("health_data_processing", true, T0),
      consentDecision("sensitive_health_processing", true, T0),
    ],
    T0,
  );
  s = saveStep(
    s,
    {
      ageYears: 34,
      heightCm: 172,
      weightKg: 74,
      waistCm: 88,
      goal: "lose",
      targetWeightKg: 68,
      rateKgPerWeek: 0.5,
      pregnantOrBreastfeeding: false,
      eatingDisorderHistory: false,
      unexplainedWeightChange: false,
      dietaryPattern: "vegetarian",
      mealsPerDay: 3,
      foodBudget: 2,
      activity: "moderate",
      sleepHoursTypical: 7,
      sleepQuality: "good",
      morningRestedness: 4,
    },
    "summary",
    T1,
  );
  return completeAssessment(s, T2);
}

/* -------------------------------- tests --------------------------------- */

describe("anti-document guard — Shopping list + Pantry (strict, Slice 5)", () => {
  it("no plan: an empty row, not a paragraph stack", () => {
    const { container } = render(<GrocerySection />);
    expectNotADocument(container.querySelector("section")!);
  });

  it("a plan with pantry coverage: covered block, bought progress, copy/share, honest footnote", () => {
    store.values[PLAN_KEY] = planWith([planDish(dal.id, dal.name.en)]);
    seedPantryCoveringDal();
    const { container } = render(<GrocerySection />);
    const section = container.querySelector("section")!;
    expectNotADocument(section);

    /* M-65: the pantry's coverage is a block above the aisles, with
       the on-hand quantity from the pantry record. */
    expect(section.textContent).toContain("Covered by your pantry (1)");
    expect(section.textContent).toContain(foodDisplayName(dalFirstFood).en);

    /* M-63: bought progress + the two list actions in the header.
       M-201 re-pins the progress half: the header's plain count is
       now the progress component's count line and percentage — the
       actions below are unchanged. */
    expect(section.textContent).toMatch(/0 \/ \d+ Items/);
    expect(section.textContent).toContain("0% completed");
    expect(screen.getByRole("button", { name: /copy list/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /share/i })).toBeTruthy();

    /* M-64: exactly the two short footnote lines; the old sentence
       is gone. */
    expect(section.textContent).toContain("Your pattern and budget come from your Assessment.");
    expect(section.textContent).toContain("Change them there and this list follows.");
    expect(section.textContent).not.toContain("nowhere else");
  });
});

describe("anti-document guard — Lab reports (strict, Slice 5)", () => {
  it("empty: one empty row under the disclaimer note", () => {
    const { container } = render(<LabReportsSection />);
    expectNotADocument(container.querySelector(".pf-card")! as HTMLElement);
  });

  it("results: the value is the figure; a range meter only where a range was entered", () => {
    const labs: LabsValue = {
      version: 1,
      results: [
        {
          id: "lab-1",
          testName: "HbA1c",
          value: 6.8,
          unit: "%",
          reportDate: "2026-08-01",
          refLow: 4,
          refHigh: 5.6,
          recordedAt: "2026-08-01T10:00:00.000Z",
        },
        {
          id: "lab-2",
          testName: "HbA1c",
          value: 7.2,
          unit: "%",
          reportDate: "2026-11-01",
          refLow: 4,
          refHigh: 5.6,
          recordedAt: "2026-11-01T10:00:00.000Z",
        },
        {
          id: "lab-3",
          testName: "Fasting glucose",
          value: 100,
          unit: "mg/dL",
          reportDate: "2026-11-01",
          recordedAt: "2026-11-01T10:05:00.000Z",
        },
      ],
    };
    store.values[LABS_KEY] = labs;
    const { container } = render(<LabReportsSection />);
    const card = container.querySelector(".pf-card")! as HTMLElement;
    expectNotADocument(card);

    /* Exactly one range meter: the HbA1c group, whose own entered
       range exists. The unrated glucose group gets none. */
    expect(card.querySelectorAll("[role='progressbar']")).toHaveLength(1);
    expect(card.textContent?.toLowerCase()).not.toContain("normal");
    expect(card.textContent?.toLowerCase()).not.toContain("abnormal");
  });
});

describe("anti-document guard — Assessment summary view (strict, Slice 5)", () => {
  it("answers are value-first stats; the intro is a note", () => {
    const summary = summaryOf(completedState());
    expect(summary).not.toBeNull();
    const { container } = render(<AssessmentSummaryView summary={summary!} />);
    const root = container.firstElementChild as HTMLElement;
    expectNotADocument(root);

    /* The intro line is a note now, not a bare paragraph. */
    expect(root.querySelector(".note")?.textContent).toContain("This is what Bloom holds");

    /* The scalar answers render as vstats — value first, label under. */
    const figures = [...root.querySelectorAll(".vstat b")].map((b) => b.textContent);
    expect(figures).toContain("74 kg");
    expect(figures).toContain("Lose weight");
    expect(figures).toContain("Vegetarian");
  });
});
