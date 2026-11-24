import { describe, expect, it, vi } from "vitest";

import { adjustmentCopy, reasonCopy, reasonDetail, type PlanReason } from "./reasons";

/**
 * Brief v4 Part 6, unit side: every kind's detail is a complete
 * sentence of at most 140 chars ending with a full stop — the
 * contract that replaces sliced prose (M-81). Fixtures use the
 * owner's real magnitudes where a kind has them.
 */
const FIXTURES: PlanReason[] = [
  { kind: "log-protein-shortfall", days: 3, avgProteinG: 23, targetProteinG: 171 },
  { kind: "log-energy-overshoot", days: 3, avgKcal: 2400, targetKcal: 1350 },
  {
    kind: "favoured-dishes",
    dishes: [{ name: "Kozhi Pepper Fry", count: 4 }],
    windowDays: 28,
  },
  { kind: "deprioritised-dishes", names: ["Pepes-Style Steamed Tofu & Tempeh"], planDay: "2026-11-18", windowDays: 28 },
  {
    kind: "deprioritised-dishes",
    names: ["Aloo Gobi", "Dal Tadka", "Baingan Bharta"],
    planDay: "2026-11-18",
    windowDays: 28,
  },
  { kind: "micro-gap", label: "Vitamin D", days: 7, avg: 3.2, unit: "mg", reference: 15 },
  { kind: "micro-gap", label: "Fibre", days: 7, avg: 18.25, unit: "g", reference: 40 },
  { kind: "budget-widened", ceilingRupees: 45 },
  { kind: "budget-widened", ceilingRupees: null },
  {
    kind: "kitchen-relaxed",
    answers: { noCook: true, capMinutes: 10, equipmentListed: true },
    stages: [{ stage: "prep-time-set-aside" }, { stage: "cooking-included" }],
  },
  {
    kind: "kitchen-relaxed",
    answers: { noCook: false, capMinutes: 10, equipmentListed: true },
    stages: [{ stage: "prep-cap-raised", minutes: 35 }],
  },
  {
    kind: "kitchen-relaxed",
    answers: { noCook: false, capMinutes: null, equipmentListed: true },
    stages: [{ stage: "equipment-set-aside" }],
  },
  { kind: "kitchen-cap-raised", capMinutes: 10, stageMinutes: 35 },
  { kind: "kitchen-cap-quickest", capMinutes: 10 },
  { kind: "snack-added", mealsPerDay: 3 },
  { kind: "snack-added", mealsPerDay: 1 },
  { kind: "veg-shortfall", actualG: 120, guidelineG: 400 },
  { kind: "fruit-shortfall", actualG: 40, guidelineG: 100 },
  { kind: "milk-curd-shortfall", actualG: 150, guidelineG: 300 },
  { kind: "protein-sources-few", count: 2 },
  { kind: "protein-sources-few", count: 1 },
  { kind: "food-groups-few", count: 5, poolCount: 6 },
  { kind: "food-groups-few", count: 5, poolCount: null },
  { kind: "protein-under", actualG: 150, targetG: 171, blocker: "caps" },
  { kind: "protein-under", actualG: 150, targetG: 171, blocker: "energy-topup-in-day" },
  { kind: "protein-under", actualG: 150, targetG: 171, blocker: "energy-no-topup" },
  { kind: "protein-over", actualG: 190, targetG: 171 },
  { kind: "kcal-off-guide", actualKcal: 1616, targetKcal: 1350, direction: "over" },
  { kind: "kcal-off-guide", actualKcal: 900, targetKcal: 1350, direction: "under" },
  { kind: "meal-empty" },
  { kind: "meal-missing-layers", layers: ["a protein dish", "vegetables"] },
];

describe("reasons, the copy contract (brief v4 Part 6)", () => {
  it("every kind renders a title, a source, and a detail ≤ 140 chars ending with a full stop", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    for (const reason of FIXTURES) {
      const copy = reasonCopy(reason);
      expect(copy, reason.kind).not.toBeNull();
      expect(copy!.title.length, reason.kind).toBeGreaterThan(0);
      expect(copy!.detail.length, `${reason.kind}: ${copy!.detail}`).toBeLessThanOrEqual(140);
      expect(copy!.detail.endsWith("."), `${reason.kind}: ${copy!.detail}`).toBe(true);
    }
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("every kind in the union has a fixture (a new kind without copy fails here)", () => {
    const covered = new Set(FIXTURES.map((r) => r.kind));
    expect(covered.size).toBe(20);
  });

  it("an unknown kind renders nothing", () => {
    const forged = { kind: "not-a-real-kind" } as unknown as PlanReason;
    expect(reasonCopy(forged)).toBeNull();
    expect(reasonDetail(forged)).toBeNull();
  });

  it("the kitchen detail names the headline relaxation and offers the review action", () => {
    const copy = reasonCopy(FIXTURES[9]!);
    expect(copy!.detail).toBe(
      "Your kitchen answers leave almost no real dishes, so cooking is allowed.",
    );
    expect(copy!.action).toEqual({
      label: "Review kitchen answers",
      href: "/profile#pf-assessment",
    });
  });

  it("the snack detail matches the brief's shape", () => {
    expect(reasonDetail({ kind: "snack-added", mealsPerDay: 3 })).toBe(
      "You listed 3 meals a day; a snack spreads today across 4 sittings.",
    );
  });
});

/**
 * Brief v7 N1: `adjustmentCopy` — the words for the plan's
 * adjustments array (planView.ts). Same contract as reasonCopy
 * (detail ≤ 140 chars, one sentence), plus the v7 rules: an
 * under-a-week protein read carries its "Early read" badge as
 * data, and the deficit words ("to go", "left", "failed") never
 * appear.
 */
describe("reasons, adjustmentCopy (brief v7)", () => {
  const BANNED = /\bto go\b|\bleft\b|\bfailed\b/i;

  it("protein-lean under 7 days carries the Early read badge as data", () => {
    const copy = adjustmentCopy({
      kind: "protein-lean",
      days: 2,
      avgG: 23,
      targetG: 171,
    });
    expect(copy).not.toBeNull();
    expect(copy!.title).toBe("Leaning protein-rich");
    expect(copy!.badge).toBe("Early read · 2 days");
    expect(copy!.detail).toBe(
      "Your last 2 logged days averaged 23 g, against a guide of 171 g. Your guide is unchanged.",
    );
  });

  it("protein-lean at 7+ days has no badge", () => {
    const copy = adjustmentCopy({ kind: "protein-lean", days: 7, avgG: 90, targetG: 171 });
    expect(copy).not.toBeNull();
    expect(copy!.badge).toBeUndefined();
  });

  it("kitchen-relaxed and meal-added render their kinds", () => {
    const kitchen = adjustmentCopy({ kind: "kitchen-relaxed" });
    expect(kitchen!.title).toBe("Some dishes need cooking");
    expect(kitchen!.badge).toBeUndefined();
    expect(kitchen!.detail).toBe(
      "Your answers leave very few no-cook dishes, so we included some that cook.",
    );
    const meal = adjustmentCopy({ kind: "meal-added", slot: "snack", assessmentMeals: 3 });
    expect(meal!.title).toBe("Added a snack");
    expect(meal!.detail).toBe(
      "Your Assessment lists 3 meals a day. A snack spreads the food across one more sitting.",
    );
  });

  it("the gate and energy kinds render their rows (brief v7 N4)", () => {
    /* N4: the adjusted section renders from `adjustmentCopy` alone,
       so the four kinds `adjustmentsOf` also returns — worded by
       `reasonCopy` until now — carry their row copy here, with the
       same facts. */
    const budget = adjustmentCopy({ kind: "budget-widened", ceilingRupees: 45 });
    expect(budget!.title).toBe("Budget treated as a preference");
    expect(budget!.detail).toBe(
      "Your budget (about ₹45 a serving) leaves too few main dishes, so the plan includes dishes above it.",
    );
    const budgetOpen = adjustmentCopy({ kind: "budget-widened", ceilingRupees: null });
    expect(budgetOpen!.detail).toBe(
      "Your meal budget leaves too few main dishes, so the plan includes dishes above it.",
    );
    const raised = adjustmentCopy({
      kind: "kitchen-cap-raised",
      capMinutes: 10,
      stageMinutes: 25,
    });
    expect(raised!.title).toBe("Prep time stretched");
    expect(raised!.detail).toBe(
      "Your answers aim for about 10 minutes a main; today's dishes take up to about 25 minutes, the closest fit.",
    );
    const quickest = adjustmentCopy({ kind: "kitchen-cap-quickest", capMinutes: 10 });
    expect(quickest!.detail).toBe(
      "Your answers aim for about 10 minutes, and every main dish takes longer, today uses the quickest there are.",
    );
    const energy = adjustmentCopy({
      kind: "log-energy-overshoot",
      days: 3,
      avgKcal: 2400,
      targetKcal: 1350,
    });
    expect(energy!.title).toBe("Lighter energy picks");
    expect(energy!.detail).toBe(
      "Your last 3 logged days averaged 2,400 kcal against a 1,350 kcal target, so energy top-ups stay out.",
    );
    /* Missing data drops the row, exactly like the brief kinds. */
    expect(adjustmentCopy({ kind: "budget-widened" })).toBeNull();
    expect(adjustmentCopy({ kind: "kitchen-cap-raised", capMinutes: 10 })).toBeNull();
    expect(adjustmentCopy({ kind: "kitchen-cap-quickest" })).toBeNull();
    expect(adjustmentCopy({ kind: "log-energy-overshoot", days: 3 })).toBeNull();
  });

  it("every detail is ≤ 140 chars and no banned word appears in any output", () => {
    const outputs = [
      adjustmentCopy({ kind: "protein-lean", days: 2, avgG: 23, targetG: 171 }),
      adjustmentCopy({ kind: "protein-lean", days: 9, avgG: 140, targetG: 171 }),
      adjustmentCopy({ kind: "kitchen-relaxed" }),
      adjustmentCopy({ kind: "meal-added", slot: "snack", assessmentMeals: 1 }),
      adjustmentCopy({ kind: "budget-widened", ceilingRupees: 45 }),
      adjustmentCopy({ kind: "budget-widened", ceilingRupees: null }),
      adjustmentCopy({ kind: "kitchen-cap-raised", capMinutes: 10, stageMinutes: 25 }),
      adjustmentCopy({ kind: "kitchen-cap-quickest", capMinutes: 10 }),
      adjustmentCopy({ kind: "log-energy-overshoot", days: 3, avgKcal: 2400, targetKcal: 1350 }),
    ];
    for (const copy of outputs) {
      expect(copy).not.toBeNull();
      expect(copy!.detail.length).toBeLessThanOrEqual(140);
      expect(copy!.detail.endsWith(".")).toBe(true);
      expect(`${copy!.title} ${copy!.detail}`).not.toMatch(BANNED);
    }
  });

  it("unknown kinds are dropped, never rendered raw", () => {
    expect(adjustmentCopy({ kind: "not-a-real-kind" })).toBeNull();
    expect(adjustmentCopy({ kind: "protein-lean" })).toBeNull();
    expect(adjustmentCopy(null)).toBeNull();
    expect(adjustmentCopy(undefined)).toBeNull();
  });
});
