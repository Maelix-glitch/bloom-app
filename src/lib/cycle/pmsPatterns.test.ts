import { describe, expect, it } from "vitest";

import { addDays, type PeriodLog } from "./predict";
import type { DayLog } from "./dayLogs";
import { premenstrualPatterns } from "./pmsPatterns";

/**
 * The premenstrual window (Wave C12): a symptom counts only when it shows
 * in the five days before a period, in at least two different cycles.
 */

const log = (start: string): PeriodLog => ({ id: `p-${start}`, start, end: addDays(start, 4) });
const starts = ["2026-01-01", "2026-01-29", "2026-02-26", "2026-03-26"];
const logs = starts.map(log);

describe("premenstrualPatterns", () => {
  it("finds a symptom that repeats in the run-up across cycles", () => {
    const days: DayLog[] = [
      { date: "2026-01-26", symptoms: ["cramps"] }, // 3 days before 29 Jan
      { date: "2026-02-23", symptoms: ["cramps", "acne"] }, // 3 days before 26 Feb
      { date: "2026-03-24", symptoms: ["cramps"] }, // 2 days before 26 Mar
      { date: "2026-02-10", symptoms: ["acne"] }, // mid-cycle — not in any window
    ];
    const view = premenstrualPatterns(logs, days);
    expect(view.cyclesTotal).toBe(3);
    expect(view.symptoms).toEqual([{ symptom: "cramps", cyclesSeen: 3, cyclesTotal: 3 }]);
  });

  it("needs two cycles before anything can repeat", () => {
    const days: DayLog[] = [{ date: "2026-01-26", symptoms: ["cramps"] }];
    const view = premenstrualPatterns(logs.slice(0, 2), days);
    expect(view.cyclesTotal).toBe(1);
    expect(view.symptoms).toEqual([]);
  });

  it("ignores symptoms logged during the period itself", () => {
    const days: DayLog[] = [
      { date: "2026-01-29", symptoms: ["cramps"] }, // day 1 — bleeding, not run-up
      { date: "2026-02-26", symptoms: ["cramps"] },
    ];
    expect(premenstrualPatterns(logs, days).symptoms).toEqual([]);
  });

  it("counts low or rough mood in the window, per cycle", () => {
    const days: DayLog[] = [
      { date: "2026-01-27", mood: "low" },
      { date: "2026-02-24", mood: "rough" },
      { date: "2026-03-20", mood: "good" }, // outside the window
    ];
    expect(premenstrualPatterns(logs, days).lowMoodCycles).toBe(2);
  });
});
