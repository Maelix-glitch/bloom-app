import { describe, expect, it } from "vitest";

import { buildBaseline } from "./baseline";
import { compareRecentCycles } from "./compare";
import type { CycleRecord } from "./types";

function record(
  periods: { start: string; end: string | null }[],
  days: { date: string; symptoms: string[]; flow: string | null }[] = [],
): CycleRecord {
  return {
    today: "2026-04-01",
    periods: periods.map((p) => ({ ...p, bleedingDays: null })),
    days: days.map((d) => ({
      date: d.date,
      flow: d.flow,
      symptoms: d.symptoms,
      mood: null,
      energy: null,
      sleepHours: null,
      pain: null,
    })),
  };
}

describe("cycle comparison", () => {
  const input = record(
    [
      { start: "2026-01-01", end: "2026-01-05" },
      { start: "2026-01-29", end: "2026-02-03" },
      { start: "2026-03-05", end: null },
    ],
    [
      { date: "2026-01-02", symptoms: ["Cramps", "Fatigue"], flow: "medium" },
      { date: "2026-01-03", symptoms: ["Cramps"], flow: "medium" },
      { date: "2026-01-30", symptoms: ["Headache"], flow: "light" },
    ],
  );
  const comparison = compareRecentCycles(input, buildBaseline(input), 3);

  it("reports recorded lengths and leaves an open cycle without one", () => {
    expect(comparison.cycles.map((c) => c.lengthDays)).toEqual([28, 35, null]);
    expect(comparison.cycles[2]!.complete).toBe(false);
  });

  it("counts bleeding days only where an end was recorded", () => {
    expect(comparison.cycles[0]!.bleedingDays).toBe(5);
    expect(comparison.cycles[1]!.bleedingDays).toBe(6);
    expect(comparison.cycles[2]!.bleedingDays).toBeNull();
  });

  it("summarises symptoms per cycle without merging them", () => {
    expect(comparison.cycles[0]!.topSymptom).toBe("Cramps");
    expect(comparison.cycles[0]!.symptomDays).toBe(2);
    expect(comparison.cycles[1]!.topSymptom).toBe("Headache");
    expect(comparison.cycles[2]!.topSymptom).toBeNull();
  });

  it("adds no verdict about which cycle is better", () => {
    expect(comparison.note).toContain("do not show that one cycle is healthier");
    expect(comparison.note).toContain("3 most recent cycles");
  });

  it("asks for a second cycle rather than comparing one", () => {
    const single = record([{ start: "2026-01-01", end: "2026-01-04" }]);
    expect(compareRecentCycles(single, buildBaseline(single)).note).toContain("at least two");
  });
});
