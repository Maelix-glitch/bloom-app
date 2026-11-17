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
function entry(day: string, kcal: number, proteinG: number): LogEntry {
  seq += 1;
  return {
    id: `e-${seq}`,
    day,
    meal: "lunch",
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
      entry("2026-11-17", 1500, 60),
    ];
    expect(planAdaptationFor(entries, DAY, TARGETS)).toBeNull();
  });

  it("is null when the logged days land near the targets", () => {
    const entries = [entry("2026-11-16", 1950, 110), entry("2026-11-17", 2050, 115)];
    expect(planAdaptationFor(entries, DAY, TARGETS)).toBeNull();
  });

  it("reads at most the three most recent logged days", () => {
    const entries = [
      entry("2026-11-10", 4000, 300), // old + extreme — must not count
      entry("2026-11-15", 1500, 80),
      entry("2026-11-16", 1700, 100),
      entry("2026-11-17", 1600, 90),
    ];
    const adaptation = planAdaptationFor(entries, DAY, TARGETS)!;
    expect(adaptation.days).toBe(3);
    expect(adaptation.avgKcal).toBe(1600);
    expect(adaptation.avgProteinG).toBe(90);
  });

  it("sums a day's entries before averaging", () => {
    const entries = [
      entry("2026-11-16", 1000, 50),
      entry("2026-11-16", 500, 30),
      entry("2026-11-17", 1700, 100),
    ];
    const adaptation = planAdaptationFor(entries, DAY, TARGETS)!;
    expect(adaptation.days).toBe(2);
    expect(adaptation.avgKcal).toBe(1600);
    expect(adaptation.avgProteinG).toBe(90);
  });

  it("flags a protein shortfall and names the log's real numbers", () => {
    const entries = [entry("2026-11-16", 1500, 80), entry("2026-11-17", 1700, 100)];
    const adaptation = planAdaptationFor(entries, DAY, TARGETS)!;
    expect(adaptation.proteinShortfall).toBe(true);
    expect(adaptation.energyOvershoot).toBe(false);
    expect(adaptation.notes).toEqual([
      "From your log: your last 2 logged days averaged 90 g protein against your 120 g target, so this plan leans on higher-protein dishes and top-ups. Your target itself is unchanged.",
    ]);
  });

  it("flags an energy overshoot and names the log's real numbers", () => {
    const entries = [entry("2026-11-16", 2300, 115), entry("2026-11-17", 2500, 118)];
    const adaptation = planAdaptationFor(entries, DAY, TARGETS)!;
    expect(adaptation.energyOvershoot).toBe(true);
    expect(adaptation.proteinShortfall).toBe(false);
    expect(adaptation.notes).toEqual([
      "From your log: your last 2 logged days averaged 2,400 kcal against your 2,000 kcal target, so this plan leaves the energy top-ups out and lets the dishes carry the day. Your target itself is unchanged.",
    ]);
  });

  it("can flag both at once, protein first", () => {
    const entries = [entry("2026-11-16", 2400, 60), entry("2026-11-17", 2400, 60)];
    const adaptation = planAdaptationFor(entries, DAY, TARGETS)!;
    expect(adaptation.proteinShortfall).toBe(true);
    expect(adaptation.energyOvershoot).toBe(true);
    expect(adaptation.notes).toHaveLength(2);
    expect(adaptation.notes[0]).toContain("protein");
    expect(adaptation.notes[1]).toContain("kcal");
  });

  it("holds the thresholds: exactly at the line is not a signal", () => {
    /* 85% of 120 g = 102 g; 110% of 2,000 kcal = 2,200 kcal. */
    const atLine = [entry("2026-11-16", 2200, 102), entry("2026-11-17", 2200, 102)];
    expect(planAdaptationFor(atLine, DAY, TARGETS)).toBeNull();
    const justUnder = [entry("2026-11-16", 2200, 101), entry("2026-11-17", 2200, 101)];
    expect(planAdaptationFor(justUnder, DAY, TARGETS)!.proteinShortfall).toBe(true);
  });
});
