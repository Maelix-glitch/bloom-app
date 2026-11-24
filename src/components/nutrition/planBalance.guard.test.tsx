// @vitest-environment jsdom
/**
 * The N4 guard (brief v7, Slice N4) — "Today's balance" and "How
 * today's plan was adjusted" as executable pins:
 *
 *   (a) BALANCE IS VIZ ONLY (M-138 display half, M-140) — the balance
 *       section contains ZERO <p> elements; every note string the
 *       fixture plan carries (guideline shortfalls, protein/energy
 *       judgements, learning notes) is absent from it, while the
 *       facts live in the flower, the meters and the chips.
 *   (b) ONE COUNTING SYSTEM (M-151) — the header count, the flower's
 *       filled petals (and its aria-label) and the Open-groups chips
 *       all read planView's ONE groups array and agree numerically
 *       on a fixture with a known eaten/planned/open mix.
 *   (c) TWO-LAYER METERS — each meter's progressbar value is the
 *       day's reach against the guideline target; the eaten and
 *       planned figures ride the same meter, each once.
 *   (d) ADJUSTMENTS ARE THE ARRAY, ONCE (M-138, M-154) — the rows
 *       equal `adjustmentsOf` worded by `adjustmentCopy` (count,
 *       titles, details, the Early-read badge as data); an empty
 *       array renders exactly ONE `.empty-row`, never a paragraph
 *       or a card.
 *   (e) SAID ONCE + CLEAN WORDS — the covered count has exactly one
 *       element; no banned word ("left", "to go", "burn", "earn",
 *       "cheat", "failed", "junk", "clean") appears in either
 *       section; the balance section states no kcal at all (the
 *       hideCalories surface: nothing calorie-denominated to mask).
 *   (f) WATER, ONE SOURCE — the stat strip's Water cell and the
 *       WaterBloom panel's figure carry the identical fmtLitres
 *       target, both read from the plan's hydration figure.
 *
 * Fixtures: a real composed plan (the 2026-11-18 rotation) re-stamped
 * to today, its reasons replaced by a known set so the mix is exact;
 * expectations are computed through the lib modules (buildPlanView,
 * adjustmentsOf, adjustmentCopy), never hard-coded.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

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
import {
  ASSESSMENT_KEY,
  EMPTY_ANSWERS,
  toHealthProfile,
  type AssessmentState,
} from "@/lib/assessment/state";
import { fmtGrams, fmtLitres } from "@/lib/format";
import { adjustmentCopy, reasonCopy, reasonDetails, type PlanReason } from "@/lib/reasons";
import {
  generatePlan,
  readFoodLog,
  readPlan,
  USDA_REFERENCE_FOODS,
  writeFoodLog,
  writePlan,
  type LogEntry,
} from "@/lib/nutrition";
import { DISH_LIBRARY } from "@/lib/nutrition/data/dishLibrary";
import { adjustmentsOf, buildPlanView } from "@/lib/nutrition/planView";
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

/* The fixture's reasons: three adjustments (one per tier) plus five
   balance notes whose strings must NOT survive in the balance
   section. */
const FIXTURE_REASONS: PlanReason[] = [
  { kind: "veg-shortfall", actualG: 120, guidelineG: 400 },
  { kind: "protein-under", actualG: 90, targetG: 171, blocker: "caps" },
  { kind: "kcal-off-guide", actualKcal: 1100, targetKcal: 1350, direction: "under" },
  {
    kind: "micro-gap",
    label: "Iron",
    days: 5,
    avg: 6,
    unit: "mg",
    reference: 19,
  },
  { kind: "favoured-dishes", dishes: [{ name: "Fixture Dish", count: 3 }], windowDays: 14 },
  {
    kind: "kitchen-relaxed",
    answers: { noCook: true, capMinutes: 10, equipmentListed: false },
    stages: [{ stage: "cooking-included" }],
  },
  { kind: "log-protein-shortfall", days: 2, avgProteinG: 23, targetProteinG: 171 },
  { kind: "snack-added", mealsPerDay: 3 },
];

const BALANCE_REASONS = FIXTURE_REASONS.slice(0, 5);

function seedAndStore(reasons: PlanReason[]): void {
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
    id: "plan-balance-guard",
  });
  if (!outcome.ok) throw new Error("expected a plan");
  writePlan({
    ...outcome.plan,
    day: todayLocal(),
    reasons,
    notes: reasonDetails(reasons),
  });
}

/** Log one fruit entry today, so the day's mix has an EATEN group
 *  beside the plan's planned ones and the day's open ones. */
function logFruitToday(): void {
  const fruit = USDA_REFERENCE_FOODS.find((f) => f.classification?.group === "fruits");
  if (!fruit) throw new Error("expected a fruit in the reference set");
  const entry: LogEntry = {
    id: "balance-guard-fruit",
    day: todayLocal(),
    meal: "lunch",
    foodId: fruit.id,
    snapshot: null,
    name: fruit.name,
    amount: { grams: 150 },
    nutrients: { kcal: 90, proteinG: 1, carbsG: 23, fatG: 0 },
    provenance: { kind: "usda", sourceId: fruit.id, label: "USDA" },
    source: "search",
    createdAt: `${todayLocal()}T12:00:00.000Z`,
  };
  writeFoodLog([entry]);
}

function sectionByLabel(container: HTMLElement, label: string): HTMLElement {
  const el = container.querySelector<HTMLElement>(`section[aria-label="${label}"]`);
  expect(el, `section "${label}" renders`).not.toBeNull();
  return el!;
}

function expectedView() {
  const stored = readPlan();
  if (!stored) throw new Error("expected a stored plan");
  return buildPlanView({
    plan: stored,
    log: { loggedMealIds: new Set(), entries: readFoodLog() },
    byFoodId: new Map(USDA_REFERENCE_FOODS.map((f) => [f.id, f] as const)),
    byDishId: new Map(DISH_LIBRARY.map((d) => [d.id, d] as const)),
  });
}

const BANNED = /\bleft\b|\bto go\b|\bburn\b|\bearn\b|\bcheat\b|\bfailed\b|\bjunk\b|\bclean\b/i;

describe("plan balance guard, brief v7 N4", () => {
  it("(a)+(b)+(c) balance is the viz: one array feeds count, flower and chips; zero prose", () => {
    seedAndStore(FIXTURE_REASONS);
    logFruitToday();
    const view = expectedView();
    /* The fixture must actually exercise all three states, or the
       agreement assertions below prove nothing. */
    expect(view.balance.groups.some((g) => g.state === "eaten")).toBe(true);
    expect(view.balance.groups.some((g) => g.state === "open")).toBe(true);

    const { container } = render(<NutritionPlanSection />);
    const balance = sectionByLabel(container, "Today's balance");

    /* (a) Zero prose: no <p> at all in the section, and none of the
       fixture's note strings (title or detail) survives in it. */
    expect(balance.querySelectorAll("p").length).toBe(0);
    for (const reason of BALANCE_REASONS) {
      const copy = reasonCopy(reason);
      if (!copy) continue;
      expect(balance.textContent).not.toContain(copy.detail);
      expect(balance.textContent).not.toContain(copy.title);
    }
    expect(balance.textContent).not.toMatch(/yet today/);

    /* (b) One counting system: header count == filled petals ==
       total − open chips, all from the view's array. */
    const count = balance.querySelector('[data-metric="balance-covered-count"]');
    expect(count, "the covered count element").not.toBeNull();
    expect(count!.textContent).toContain(String(view.balance.inPlan));
    expect(count!.textContent).toContain(`of ${view.balance.total} food groups covered`);
    const flower = balance.querySelector<HTMLElement>("[data-flower]");
    expect(flower).not.toBeNull();
    expect(flower!.getAttribute("aria-label")).toBe(
      `${view.balance.inPlan} of ${view.balance.total} food groups covered`,
    );
    const petals = [...flower!.querySelectorAll("[data-petal]")];
    expect(petals.length).toBe(view.balance.total);
    expect(petals.filter((p) => p.getAttribute("data-covered") === "true").length).toBe(
      view.balance.inPlan,
    );
    const openGroups = view.balance.groups.filter((g) => g.state === "open");
    const chips = [...balance.querySelectorAll("[data-open-group]")];
    expect(chips.map((c) => c.textContent)).toEqual(openGroups.map((g) => g.label));
    expect(balance.textContent).toContain("Open groups");

    /* (c) Two-layer meters: value = reach vs target; eaten and
       planned figures ride the same meter. */
    const meters = balance.querySelectorAll('[role="progressbar"]');
    expect(meters.length).toBe(view.balance.meters.length);
    view.balance.meters.forEach((m, i) => {
      const el = meters[i]!;
      expect(el.getAttribute("aria-label")).toBe(`${m.label}: ${m.reach} of ${m.target} grams`);
      expect(el.getAttribute("aria-valuenow")).toBe(String(m.reach));
      expect(el.getAttribute("aria-valuemax")).toBe(String(m.target));
      const wrap = el.closest(".bal-meter") ?? el.parentElement!;
      expect(wrap.textContent).toContain(`${fmtGrams(m.eaten)} g logged`);
      expect(wrap.textContent).toContain(`${fmtGrams(m.planned)} g in the plan`);
    });
    expect(balance.querySelector('[data-metric="guideline-veg-grams"]')).not.toBeNull();
    expect(balance.querySelector('[data-metric="guideline-fruit-grams"]')).not.toBeNull();

    /* One legend + one source chip. */
    expect(balance.textContent).toContain("Logged");
    expect(balance.textContent).toContain("With the plan");
    expect(within(balance).getByText("ICMR-NIN guideline")).toBeTruthy();

    /* (e) Clean words, and no kcal anywhere in the section. */
    expect(balance.textContent).not.toMatch(BANNED);
    expect(balance.textContent).not.toMatch(/kcal/i);
  });

  it("(d) adjustments render the array once, worded by adjustmentCopy, badge as data", () => {
    seedAndStore(FIXTURE_REASONS);
    const stored = readPlan();
    if (!stored) throw new Error("expected a stored plan");
    const expected = adjustmentsOf(stored)
      .map((a) => adjustmentCopy(a))
      .filter((c) => c !== null);
    expect(expected.length).toBe(3);

    const { container } = render(<NutritionPlanSection />);
    const section = sectionByLabel(container, "How today's plan was adjusted");
    const rows = section.querySelectorAll("article.insight");
    expect(rows.length).toBe(expected.length);
    rows.forEach((row, i) => {
      const copy = expected[i]!;
      expect(row.querySelector("h3")?.textContent).toBe(copy.title);
      expect(row.textContent).toContain(copy.detail);
      if (copy.badge) {
        const badge = [...row.querySelectorAll("[data-estimate]")].find(
          (el) => el.textContent === copy.badge,
        );
        expect(badge, `row ${i} carries its badge as a dashed chip`).not.toBeNull();
      }
    });
    /* The protein-lean row (2 logged days) carries the Early read. */
    expect(section.textContent).toContain("Early read · 2 days");
    /* Said once: no adjustment title leaks into the balance section. */
    const balance = sectionByLabel(container, "Today's balance");
    for (const copy of expected) {
      expect(balance.textContent).not.toContain(copy.title);
    }
    expect(section.textContent).not.toMatch(BANNED);
    expect(section.querySelectorAll(".empty-row").length).toBe(0);
  });

  it("(d) an empty adjustments array renders exactly one empty row", () => {
    seedAndStore([]);
    const { container } = render(<NutritionPlanSection />);
    const section = sectionByLabel(container, "How today's plan was adjusted");
    expect(section.querySelectorAll("article.insight").length).toBe(0);
    const empty = section.querySelectorAll(".empty-row");
    expect(empty.length).toBe(1);
    expect(empty[0]!.textContent).toContain(
      "No adjustments today, the plan follows your Assessment as set.",
    );
    expect(
      screen.queryByText("No adjustments today, the plan follows your Assessment as set."),
    ).toBeTruthy();
  });

  it("(e)+(f) said once: one covered count; the water target agrees across components", () => {
    seedAndStore(FIXTURE_REASONS);
    const stored = readPlan();
    if (!stored) throw new Error("expected a stored plan");
    if (!stored.hydration) throw new Error("expected a hydration schedule");
    const target = fmtLitres(stored.hydration.targetMl);

    const { container } = render(<NutritionPlanSection />);
    expect(container.querySelectorAll('[data-metric="balance-covered-count"]').length).toBe(1);

    const stripWater = container.querySelector('[data-cell="water"]');
    expect(stripWater, "the stat strip's water cell").not.toBeNull();
    expect(stripWater!.textContent).toContain(target);
    const figure = container.querySelector(".water-bloom-figure");
    expect(figure, "the WaterBloom figure").not.toBeNull();
    expect(figure!.textContent).toContain(`of ${target}`);
  });
});
