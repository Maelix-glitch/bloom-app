// @vitest-environment jsdom
/**
 * The TODAY guard (brief v4, Slice 4) — Part 3.1–3.3 as executable
 * pins, in the house guard tradition (vitest/jsdom; no Playwright):
 *
 *   (a) ONE PRIMARY (M-88) — in the rendered plan section, at most
 *       one button carries the primary (gold) treatment: the NEXT
 *       unlogged meal's "Log meal". Every meal's log button is
 *       labelled "Log meal"; macros render as category dots with
 *       neutral numbers — no coloured macro text anywhere in a
 *       meal card (the sage protein number was the M-88 instance).
 *   (b) THE FLOWER (M-85) — Today's balance renders one petal per
 *       coverage group of the app's classifier (dayBalance's eight),
 *       covered state matching the tally of the stored plan; the
 *       missing groups are chips; vegetables and fruit are goal
 *       meters with the guideline as their max; and NO guideline
 *       sentence survives as a paragraph — the sentences became
 *       the viz.
 *   (c) ADJUSTED, CAPPED (Part 3.3) — "How today's plan was
 *       adjusted" renders AT MOST 3 insight rows, in the priority
 *       order gates → adaptation → snack-added, and every row's
 *       words are reasons.ts's own output for the stored plan's
 *       reasons (asserted against the module, never hard-coded).
 *       A plan with no adjustments shows the one quiet line.
 *
 * Scope: the whole Nutrition page through the real prefs-backed
 * flow, on the two established fixtures — the owner's corner
 * (composed through the page's own Create tap, with a logged
 * history that forces both adaptation reasons) and the 2026-11-18
 * rotation (stored plan, guideline shortfalls only).
 */

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
import { shiftDay, todayLocal } from "@/lib/localDay";
import {
  ASSESSMENT_KEY,
  EMPTY_ANSWERS,
  toHealthProfile,
  type AssessmentState,
} from "@/lib/assessment/state";
import {
  dayBalance,
  generatePlan,
  readPlan,
  writeFoodLog,
  writePlan,
  type LogEntry,
} from "@/lib/nutrition";
import { DISH_LIBRARY } from "@/lib/nutrition/data/dishLibrary";
import { USDA_REFERENCE_FOODS } from "@/lib/nutrition/usdaReference";
import { toSafetyInput } from "@/lib/vitalis/domain/profile";
import { classifySafety } from "@/lib/vitalis/safety/classify";
import { targetsFor } from "@/lib/vitalis/calc/body";
import { reasonCopy, type PlanReason } from "@/lib/reasons";
import { NutritionPage } from "@/components/nutrition/NutritionPage";

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

/* ------------------------------ fixtures ------------------------------ */

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

let seq = 0;
function logEntry(day: string): LogEntry {
  seq += 1;
  return {
    id: `today-e-${seq}`,
    day,
    meal: "lunch",
    foodId: "usda-168893",
    snapshot: null,
    name: "Whole wheat flour (atta)",
    amount: { grams: 400 },
    nutrients: { kcal: 1800, proteinG: 90, carbsG: 180, fatG: 60 },
    provenance: { kind: "usda", sourceId: "usda-168893", label: "USDA" },
    source: "search",
    createdAt: `${day}T12:00:00.000Z`,
  };
}

const OWNER_ANSWERS: Partial<AssessmentState["answers"]> = {
  ageYears: 19,
  heightCm: 165,
  weightKg: 95,
  sex: "unspecified" as const,
  goal: "lose" as const,
  rateKgPerWeek: 1,
  activity: "sedentary" as const,
  dietaryPattern: "omnivore" as const,
  mealsPerDay: 3,
  foodBudget: 2,
  cuisinePreference: "south_indian" as const,
  cookingAbility: "none" as const,
  prepTimeMaxMinutes: 10,
  equipment: ["stove", "pressure_cooker", "mixer_grinder", "fridge"],
  pregnantOrBreastfeeding: false,
  eatingDisorderHistory: false,
  unexplainedWeightChange: false,
};

function sectionByLabel(container: HTMLElement, label: string): HTMLElement {
  const el = container.querySelector<HTMLElement>(`section[aria-label="${label}"]`);
  expect(el, `section "${label}" renders`).not.toBeNull();
  return el!;
}

/** The adjustment kinds and their priority tier (brief 3.3 as the
 *  section renders it): the planner's gates first, then what it
 *  learned from the log, then the day's structure. */
const ADJUSTED_TIER: Record<string, number> = {
  "budget-widened": 0,
  "kitchen-relaxed": 0,
  "kitchen-cap-raised": 0,
  "kitchen-cap-quickest": 0,
  "log-protein-shortfall": 1,
  "log-energy-overshoot": 1,
  "snack-added": 2,
};

function expectedAdjustedRows(reasons: readonly PlanReason[]) {
  return reasons
    .map((reason, index) => ({ reason, index }))
    .filter((e) => e.reason.kind in ADJUSTED_TIER)
    .sort(
      (a, b) =>
        ADJUSTED_TIER[a.reason.kind]! - ADJUSTED_TIER[b.reason.kind]! || a.index - b.index,
    )
    .slice(0, 3)
    .map((e) => reasonCopy(e.reason))
    .filter((c) => c !== null);
}

/* -------------------------------- tests ------------------------------- */

describe("today guard — the owner's corner, composed through the page", () => {
  it("(a) one primary in the plan section: the next meal's Log meal; macros are dots, never coloured text", async () => {
    seedAssessment(OWNER_ANSWERS);
    const today = todayLocal();
    writeFoodLog([
      logEntry(shiftDay(today, -1)),
      logEntry(shiftDay(today, -2)),
      logEntry(shiftDay(today, -3)),
    ]);
    const { container } = render(<NutritionPage />);
    fireEvent.click(screen.getByRole("button", { name: "Create my plan" }));
    await screen.findByRole("button", { name: /Compose again/ }, { timeout: 8000 });

    const planSection = sectionByLabel(container, "Your plan for today");

    /* Every meal offers the same short label; only styling differs. */
    const logButtons = within(planSection).getAllByRole("button", { name: "Log meal" });
    expect(logButtons.length).toBe(4);
    expect(within(planSection).queryByRole("button", { name: "Log this meal" })).toBeNull();

    /* Exactly one primary in the whole section, and it belongs to
       the first meal card — the next unlogged meal. */
    const golds = planSection.querySelectorAll(".nut-btn-gold");
    expect(golds.length, "primary buttons in the plan section").toBe(1);
    /* Meal cards are the section's labelled articles ("Breakfast
       plan"); the learning insights are articles too, and are not
       meal cards. */
    const firstCard = planSection.querySelector<HTMLElement>('article[aria-label$=" plan"]');
    expect(firstCard, "a meal card renders").not.toBeNull();
    expect(golds[0]!.textContent).toBe("Log meal");
    expect(firstCard!.contains(golds[0]!)).toBe(true);

    /* Macros: dots with neutral numbers on every card. */
    const cards = planSection.querySelectorAll('article[aria-label$=" plan"]');
    expect(cards.length).toBe(4);
    for (const card of cards) {
      expect(card.querySelector(".macros .dot--protein"), "protein dot").not.toBeNull();
      expect(card.querySelector(".macros .dot--carb"), "carb dot").not.toBeNull();
      expect(card.querySelector(".macros .dot--fat"), "fat dot").not.toBeNull();
      /* The M-88 instance: a macro number coloured as a category. */
      expect(card.innerHTML).not.toContain("--sage");
    }
  }, 30000);

  it("(c) adjusted rows: at most 3, in priority order, worded by reasons.ts alone", async () => {
    seedAssessment(OWNER_ANSWERS);
    const today = todayLocal();
    writeFoodLog([
      logEntry(shiftDay(today, -1)),
      logEntry(shiftDay(today, -2)),
      logEntry(shiftDay(today, -3)),
    ]);
    const { container } = render(<NutritionPage />);
    fireEvent.click(screen.getByRole("button", { name: "Create my plan" }));
    await screen.findByRole("button", { name: /Compose again/ }, { timeout: 8000 });

    const stored = readPlan();
    if (!stored) throw new Error("expected a stored plan");
    const adjustedCount = (stored.reasons ?? []).filter((r) => r.kind in ADJUSTED_TIER).length;
    expect(
      adjustedCount,
      "the fixture must carry more adjustments than the cap, or the cap is untested",
    ).toBeGreaterThan(3);
    const expected = expectedAdjustedRows(stored.reasons ?? []);
    expect(expected.length).toBe(3);

    const section = sectionByLabel(container, "How today's plan was adjusted");
    const rows = section.querySelectorAll("article.insight");
    expect(rows.length, "insight rows in the adjusted section").toBe(3);
    rows.forEach((row, i) => {
      const copy = expected[i]!;
      expect(row.querySelector("h3")?.textContent).toBe(copy.title);
      expect(row.textContent).toContain(copy.detail);
      const chip = row.querySelector(".src-chip");
      expect(chip, "each row carries its source chip").not.toBeNull();
      expect(chip!.textContent).toBe(copy.source.label);
    });
    /* The lowest-priority adjustment is the one the cap drops. */
    const allAdjusted = (stored.reasons ?? []).filter((r) => r.kind in ADJUSTED_TIER);
    const dropped = allAdjusted[allAdjusted.length - 1]!;
    const droppedCopy = reasonCopy(dropped);
    if (droppedCopy) {
      expect(within(section).queryByText(droppedCopy.title)).toBeNull();
    }
  }, 30000);
});

describe("today guard — the rotation's stored plan", () => {
  function renderRotation() {
    const answers = {
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
    seedAssessment(answers);
    const state: AssessmentState = {
      version: 1,
      status: "complete",
      step: "summary",
      answers: { ...EMPTY_ANSWERS, ...answers },
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
      dishes: DISH_LIBRARY,
      day: "2026-11-18",
      now: "2026-11-18T03:00:00.000Z",
      id: "today-guard-rotation",
    });
    if (!outcome.ok) throw new Error("expected a plan");
    writePlan({ ...outcome.plan, day: todayLocal() });
    return render(<NutritionPage />);
  }

  it("(b) the flower: one petal per group, meters for vegetables and fruit, no guideline paragraphs", () => {
    const { container } = renderRotation();
    const stored = readPlan();
    if (!stored) throw new Error("expected a stored plan");
    const foodById = new Map(USDA_REFERENCE_FOODS.map((f) => [f.id, f]));
    const dishById = new Map(DISH_LIBRARY.map((d) => [d.id, d]));
    const groups = dayBalance(stored.meals, foodById, dishById);
    const covered = groups.filter((g) => g.covered);

    const balance = sectionByLabel(container, "Today's balance");
    const flower = balance.querySelector<HTMLElement>("[data-flower]");
    expect(flower, "the Bloom flower renders").not.toBeNull();
    expect(flower!.getAttribute("aria-label")).toBe(
      `${covered.length} of ${groups.length} food groups covered`,
    );
    const petals = flower!.querySelectorAll("[data-petal]");
    expect(petals.length).toBe(groups.length);
    petals.forEach((petal, i) => {
      expect(petal.getAttribute("data-group")).toBe(groups[i]!.key);
      expect(petal.getAttribute("data-covered")).toBe(String(groups[i]!.covered));
    });

    /* Missing groups are chips; covered groups are not chipped. */
    for (const g of groups) {
      if (g.covered) {
        expect(within(balance).queryByText(g.missing)).toBeNull();
      } else {
        expect(within(balance).getByText(g.missing)).toBeTruthy();
      }
    }

    /* The two goal meters, valued by the same tally. */
    const meters = balance.querySelectorAll('[role="progressbar"]');
    expect(meters.length).toBe(2);
    const veg = groups.find((g) => g.key === "vegetables")!;
    const fruit = groups.find((g) => g.key === "fruits")!;
    expect(meters[0]!.getAttribute("aria-label")).toBe(
      `Vegetables: ${Math.round(veg.grams)} of 400 grams`,
    );
    expect(meters[0]!.getAttribute("aria-valuenow")).toBe(String(Math.round(veg.grams)));
    expect(meters[0]!.getAttribute("aria-valuemax")).toBe("400");
    expect(meters[1]!.getAttribute("aria-label")).toBe(
      `Fruit: ${Math.round(fruit.grams)} of 100 grams`,
    );
    expect(meters[1]!.getAttribute("aria-valuemax")).toBe("100");
    expect(balance.querySelector('[data-metric="guideline-veg-grams"]')).not.toBeNull();
    expect(balance.querySelector('[data-metric="guideline-fruit-grams"]')).not.toBeNull();

    /* The guideline sentences are gone — they became the viz. */
    expect(within(balance).queryByText(/under guideline/)).toBeNull();
    expect(within(balance).queryByText(/ICMR-NIN guideline aims for/)).toBeNull();
    expect(balance.querySelectorAll("p.nut-note").length).toBe(0);
  });

  it("(c) a plan with no adjustments shows the one quiet line", () => {
    const { container } = renderRotation();
    const section = sectionByLabel(container, "How today's plan was adjusted");
    expect(section.querySelectorAll("article.insight").length).toBe(0);
    expect(
      within(section).getByText("No adjustments today — the plan follows your Assessment as set."),
    ).toBeTruthy();
  });
});
