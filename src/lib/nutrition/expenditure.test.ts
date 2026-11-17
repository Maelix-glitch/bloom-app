/**
 * Expenditure estimation — the energy-balance identity, gated hard:
 * not enough logged days or weigh-ins and the answer is an honest
 * "insufficient" carrying the counts, never a dressed-up guess.
 * Same inputs → same estimate, to the kilocalorie.
 */

import { describe, expect, it } from "vitest";

import type { WeighIn } from "@/lib/health/body";
import { estimateExpenditure } from "./expenditure";
import type { LogEntry } from "./types";

let seq = 0;
function dayEntry(day: string, kcal: number): LogEntry {
  seq += 1;
  return {
    id: `e-${seq}`,
    day,
    meal: "lunch",
    foodId: null,
    snapshot: null,
    name: "logged",
    amount: { grams: 100 },
    nutrients: { kcal, proteinG: 0, carbsG: 0, fatG: 0 },
    provenance: { kind: "user_entered", sourceId: "fixture", label: "Your value" },
    source: "search",
    createdAt: `${day}T12:00:00.000Z`,
  };
}

/** `count` consecutive logged days from `from`, each totalling kcal. */
function loggedDays(from: string, count: number, kcal: number): LogEntry[] {
  const out: LogEntry[] = [];
  const start = Date.parse(`${from}T12:00:00Z`);
  for (let i = 0; i < count; i += 1) {
    out.push(dayEntry(new Date(start + i * 86_400_000).toISOString().slice(0, 10), kcal));
  }
  return out;
}

const weigh = (date: string, kg: number): WeighIn => ({ date, kg });

describe("estimateExpenditure — sufficiency gates", () => {
  it("fewer than two weigh-ins: insufficient, with the counts", () => {
    const result = estimateExpenditure(
      loggedDays("2026-10-01", 15, 2500),
      [weigh("2026-10-01", 100)],
      "2026-10-22",
    );
    expect(result).toEqual({ kind: "insufficient", loggedDays: 15, weightPoints: 1, spanDays: 0 });
  });

  it("weigh-ins spanning under 10 days: insufficient", () => {
    const result = estimateExpenditure(
      loggedDays("2026-10-01", 5, 2500),
      [weigh("2026-10-01", 100), weigh("2026-10-06", 99.8)],
      "2026-10-22",
    );
    expect(result.kind).toBe("insufficient");
    if (result.kind === "insufficient") expect(result.spanDays).toBe(5);
  });

  it("nine logged days inside the window: insufficient", () => {
    const result = estimateExpenditure(
      loggedDays("2026-10-01", 9, 2500),
      [weigh("2026-10-01", 100), weigh("2026-10-22", 99)],
      "2026-10-22",
    );
    expect(result).toEqual({ kind: "insufficient", loggedDays: 9, weightPoints: 2, spanDays: 21 });
  });
});

describe("estimateExpenditure — the identity", () => {
  it("weight loss raises the maintenance estimate above intake", () => {
    /* 12 logged days at 2,500 kcal, −1 kg over 21 days:
       2500 + 7700/21 = 2866.67 → 2867. */
    const result = estimateExpenditure(
      loggedDays("2026-10-01", 12, 2500),
      [weigh("2026-10-01", 100), weigh("2026-10-22", 99)],
      "2026-10-22",
    );
    expect(result).toEqual({
      kind: "ready",
      estimate: {
        maintenanceKcal: 2867,
        avgIntakeKcal: 2500,
        loggedDays: 12,
        spanDays: 21,
        weightChangeKg: -1,
        fromDate: "2026-10-01",
        toDate: "2026-10-22",
      },
    });
  });

  it("weight gain lowers it below intake", () => {
    /* 12 logged days at 3,000 kcal, +1 kg over 21 days:
       3000 − 7700/21 = 2633.33 → 2633. */
    const result = estimateExpenditure(
      loggedDays("2026-10-01", 12, 3000),
      [weigh("2026-10-01", 99), weigh("2026-10-22", 100)],
      "2026-10-22",
    );
    expect(result.kind).toBe("ready");
    if (result.kind === "ready") expect(result.estimate.maintenanceKcal).toBe(2633);
  });

  it("the window is capped at 35 days: the earliest in-window weigh-in opens it", () => {
    /* Weigh-ins at day 0 (outside the cap), day 30 and day 50: the
       window opens at day 30. 10 logged days at 2,600 kcal in
       [day 30, day 50), −0.4 kg over 20 days → 2600 + 154 = 2754. */
    const result = estimateExpenditure(
      loggedDays("2026-10-01", 10, 2600),
      [weigh("2026-09-01", 100), weigh("2026-10-01", 100), weigh("2026-10-21", 99.6)],
      "2026-10-21",
    );
    expect(result).toEqual({
      kind: "ready",
      estimate: {
        maintenanceKcal: 2754,
        avgIntakeKcal: 2600,
        loggedDays: 10,
        spanDays: 20,
        weightChangeKg: -0.4,
        fromDate: "2026-10-01",
        toDate: "2026-10-21",
      },
    });
  });

  it("is deterministic: same inputs, same estimate", () => {
    const entries = loggedDays("2026-10-01", 12, 2500);
    const points = [weigh("2026-10-01", 100), weigh("2026-10-22", 99)];
    expect(estimateExpenditure(entries, points, "2026-10-22")).toEqual(
      estimateExpenditure(entries, points, "2026-10-22"),
    );
  });

  it("weigh-ins after the day are not read", () => {
    const result = estimateExpenditure(
      loggedDays("2026-10-01", 12, 2500),
      [weigh("2026-10-01", 100), weigh("2026-10-22", 99), weigh("2026-12-01", 80)],
      "2026-10-22",
    );
    expect(result.kind).toBe("ready");
    if (result.kind === "ready") expect(result.estimate.toDate).toBe("2026-10-22");
  });
});
