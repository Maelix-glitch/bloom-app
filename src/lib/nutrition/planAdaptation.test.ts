/**
 * planAdaptation — the signals the plan learns from the logged days.
 * Pinned both ways: a real shortfall/overshoot speaks (with the log's
 * own numbers in the note), and anything less — one day, on-target
 * days, the plan day itself — stays silent, because silence is what
 * keeps the unbiased composer byte-identical.
 */

import { describe, expect, it } from "vitest";

import { planAdaptationFor } from "./planAdaptation";
import type { LogEntry } from "./types";

let seq = 0;
function entry(day: string, kcal: number, proteinG: number, meal: LogEntry["meal"] = "lunch"): LogEntry {
  seq += 1;
  return {
    id: `e-${seq}`,
    day,
    meal,
    foodId: null,
    snapshot: null,
    name: "logged",
    amount: { grams: 100 },
    nutrients: { kcal, proteinG, carbsG: 0, fatG: 0 },
    provenance: { kind: "user_entered", sourceId: "log-fixture", label: "Your value" },
    source: "search",
    createdAt: `${day}T12:00:00.000Z`,
  };
}

/* A COMPLETE logged day (M-219): the day's totals split across a
   lunch and a dinner entry — the smallest shape the adaptation may
   learn from since the completeness gate. Totals are preserved
   exactly, so the averages these tests pin are unchanged. */
function dayEntries(day: string, kcal: number, proteinG: number): LogEntry[] {
  const kcalA = Math.round(kcal / 2);
  const proteinA = Math.round(proteinG / 2);
  return [
    entry(day, kcalA, proteinA, "lunch"),
    entry(day, kcal - kcalA, proteinG - proteinA, "dinner"),
  ];
}

const TARGETS = { kcal: 2000, proteinG: 120 };
const DAY = "2026-11-18";

describe("planAdaptationFor", () => {
  it("is null with fewer than two logged days", () => {
    expect(planAdaptationFor([], DAY, TARGETS)).toBeNull();
    expect(planAdaptationFor([entry("2026-11-17", 1500, 60)], DAY, TARGETS)).toBeNull();
  });

  it("ignores the plan day itself and anything after it", () => {
    const entries = [
      entry("2026-11-18", 900, 20), // the plan day — still being written
      entry("2026-11-19", 900, 20), // the future
      ...dayEntries("2026-11-17", 1500, 60), // one complete day before — not enough alone
    ];
    expect(planAdaptationFor(entries, DAY, TARGETS)).toBeNull();
  });

  it("is null when the logged days land near the targets", () => {
    const entries = [...dayEntries("2026-11-16", 1950, 110), ...dayEntries("2026-11-17", 2050, 115)];
    expect(planAdaptationFor(entries, DAY, TARGETS)).toBeNull();
  });

  it("reads at most the three most recent logged days", () => {
    const entries = [
      ...dayEntries("2026-11-10", 4000, 300), // old + extreme — must not count
      ...dayEntries("2026-11-15", 1500, 80),
      ...dayEntries("2026-11-16", 1700, 100),
      ...dayEntries("2026-11-17", 1600, 90),
    ];
    const adaptation = planAdaptationFor(entries, DAY, TARGETS)!;
    expect(adaptation.days).toBe(3);
    expect(adaptation.avgKcal).toBe(1600);
    expect(adaptation.avgProteinG).toBe(90);
  });

  it("sums a day's entries before averaging", () => {
    const entries = [
      entry("2026-11-16", 1000, 50, "lunch"),
      entry("2026-11-16", 500, 30, "dinner"),
      ...dayEntries("2026-11-17", 1700, 100),
    ];
    const adaptation = planAdaptationFor(entries, DAY, TARGETS)!;
    expect(adaptation.days).toBe(2);
    expect(adaptation.avgKcal).toBe(1600);
    expect(adaptation.avgProteinG).toBe(90);
  });

  /* Brief v4 (Slice 1): the adaptation returns STRUCTURED reasons,
     not prose — the words live in src/lib/reasons.ts. These pins
     changed from note strings to reason objects for that reason;
     the numbers they carry are the same ones the strings named. */
  it("flags a protein shortfall and names the log's real numbers", () => {
    const entries = [...dayEntries("2026-11-16", 1500, 80), ...dayEntries("2026-11-17", 1700, 100)];
    const adaptation = planAdaptationFor(entries, DAY, TARGETS)!;
    expect(adaptation.proteinShortfall).toBe(true);
    expect(adaptation.energyOvershoot).toBe(false);
    expect(adaptation.reasons).toEqual([
      { kind: "log-protein-shortfall", days: 2, avgProteinG: 90, targetProteinG: 120 },
    ]);
  });

  it("flags an energy overshoot and names the log's real numbers", () => {
    const entries = [...dayEntries("2026-11-16", 2300, 115), ...dayEntries("2026-11-17", 2500, 118)];
    const adaptation = planAdaptationFor(entries, DAY, TARGETS)!;
    expect(adaptation.energyOvershoot).toBe(true);
    expect(adaptation.proteinShortfall).toBe(false);
    expect(adaptation.reasons).toEqual([
      { kind: "log-energy-overshoot", days: 2, avgKcal: 2400, targetKcal: 2000 },
    ]);
  });

  it("can flag both at once, protein first", () => {
    const entries = [...dayEntries("2026-11-16", 2400, 60), ...dayEntries("2026-11-17", 2400, 60)];
    const adaptation = planAdaptationFor(entries, DAY, TARGETS)!;
    expect(adaptation.proteinShortfall).toBe(true);
    expect(adaptation.energyOvershoot).toBe(true);
    expect(adaptation.reasons).toHaveLength(2);
    expect(adaptation.reasons[0]!.kind).toBe("log-protein-shortfall");
    expect(adaptation.reasons[1]!.kind).toBe("log-energy-overshoot");
  });

  it("holds the thresholds: exactly at the line is not a signal", () => {
    /* 85% of 120 g = 102 g; 110% of 2,000 kcal = 2,200 kcal. */
    const atLine = [...dayEntries("2026-11-16", 2200, 102), ...dayEntries("2026-11-17", 2200, 102)];
    expect(planAdaptationFor(atLine, DAY, TARGETS)).toBeNull();
    const justUnder = [...dayEntries("2026-11-16", 2200, 101), ...dayEntries("2026-11-17", 2200, 101)];
    expect(planAdaptationFor(justUnder, DAY, TARGETS)!.proteinShortfall).toBe(true);
  });
});
