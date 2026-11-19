import { describe, expect, it, vi } from "vitest";

import { reasonCopy, reasonDetail, type PlanReason } from "./reasons";

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

describe("reasons — the copy contract (brief v4 Part 6)", () => {
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
