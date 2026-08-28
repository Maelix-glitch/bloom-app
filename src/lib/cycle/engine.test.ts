import { describe, expect, it } from "vitest";
import {
  addDays,
  buildCycleModel,
  completedCycles,
  dayStateFor,
  diffDays,
  localDateKey,
  normalizeEntry,
  periodRuns,
} from "./engine";
import type { CycleEntry } from "./types";

const entry = (date: string, over: Partial<CycleEntry> = {}): CycleEntry => ({
  ...normalizeEntry({ date, ...over }),
});

const starts = ["2026-01-05", "2026-02-02", "2026-03-02", "2026-03-31", "2026-04-29", "2026-05-27"];

function history(): CycleEntry[] {
  const out: CycleEntry[] = [];
  for (const s of starts) {
    for (let i = 0; i < 4; i++)
      out.push(entry(addDays(s, i), { flow: i < 3 ? "medium" : "light" }));
    const start = entry(s, { cycle_day: 1 });
    void start;
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

describe("date helpers", () => {
  it("addDays/diffDays are DST-safe across spring boundary", () => {
    expect(addDays("2026-03-28", 1)).toBe("2026-03-29"); // EU DST switch weekend
    expect(diffDays("2026-03-28", "2026-03-29")).toBe(1);
    expect(diffDays("2026-10-24", "2026-10-25")).toBe(1); // autumn switch
  });
  it("handles leap-year February", () => {
    expect(diffDays("2024-02-28", "2024-03-01")).toBe(2);
    expect(diffDays("2025-02-28", "2025-03-01")).toBe(1);
    expect(addDays("2024-02-29", 1)).toBe("2024-03-01");
  });
  it("handles year rollover", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(diffDays("2026-12-30", "2027-01-02")).toBe(3);
  });
});

describe("cycle detection", () => {
  it("groups flow days into runs with 1-day tolerance", () => {
    const runs = periodRuns([
      entry("2026-01-05", { flow: "medium" }),
      entry("2026-01-06", { flow: "light" }), // gap on 07
      entry("2026-01-08", { flow: "light" }), // continues same run (gap ≤ 2 days)
      entry("2026-02-10", { flow: "heavy" }),
    ]);
    expect(runs).toHaveLength(2);
    expect(runs[0]!.start).toBe("2026-01-05");
    expect(runs[0]!.end).toBe("2026-01-08");
  });
  it("treats 'none' flow as not a period day", () => {
    const runs = periodRuns([entry("2026-01-05", { flow: "none" })]);
    expect(runs).toHaveLength(0);
  });
  it("counts completed cycles between consecutive starts", () => {
    const runs = periodRuns(history());
    const done = completedCycles(runs);
    expect(done.length).toBeGreaterThanOrEqual(3);
    expect(done[0]!.lengthDays).toBe(28); // 01-05 → 02-02
    expect(done[1]!.lengthDays).toBe(28);
    expect(done[2]!.lengthDays).toBe(29);
  });
  it("excludes impossible gaps as data issues, not cycles", () => {
    const runs = [
      { start: "2026-01-01", end: "2026-01-04", days: 4 },
      { start: "2026-01-08", end: "2026-01-10", days: 3 }, // 7 days later — too short
      { start: "2026-06-01", end: "2026-06-03", days: 3 }, // 144 days — likely missing logs
    ];
    expect(completedCycles(runs)).toHaveLength(0);
  });
});

describe("model + predictions", () => {
  it("no history → assumed confidence, default pattern, no personal average shown", () => {
    const m = buildCycleModel([entry("2026-08-01", { flow: "medium" })], "2026-08-28");
    expect(m.confidence).toBe("assumed");
    expect(m.usesDefaultAssumption).toBe(true);
    expect(m.average).toBeNull(); // "28" is an assumption, not their stat
    expect(m.currentDay).toBe(28);
  });
  it("one completed cycle → early confidence, estimate equals the data", () => {
    const two = [
      ...starts
        .slice(0, 2)
        .flatMap((s) => [entry(s, { flow: "medium" }), entry(addDays(s, 1), { flow: "light" })]),
    ];
    const m = buildCycleModel(two, "2026-02-10");
    expect(m.confidence).toBe("early");
    expect(m.completed).toHaveLength(1);
    expect(m.average).toBeCloseTo(28);
    expect(m.stdDev).toBeNull(); // a single sample cannot carry a spread
  });
  it("full history → ranges derive from personal spread", () => {
    const m = buildCycleModel(history(), "2026-06-01");
    expect(m.confidence).toBe("strong");
    expect(m.average).not.toBeNull();
    if (m.stdDev !== null) expect(m.stdDev).toBeLessThan(1.5);
    const period = m.events.find((e) => e.id === "next-period")!;
    expect(period.daysAway).toBe(diffDays(m.today, period.date!));
    expect(period.plusMinusDays === null || period.plusMinusDays >= 2).toBe(true);
  });
  it("missing temperature is never filled or implied normal", () => {
    const m = buildCycleModel([entry("2026-08-01", { temperature: null })], "2026-08-05");
    expect(m.observedEvidence.bbtShiftDate).toBeNull();
  });
  it("dayState marks predicted period softly beyond today, logged solid within", () => {
    const m = buildCycleModel(history(), "2026-06-01");
    const past = dayStateFor("2026-04-29", history(), m);
    expect(past.logged?.flow).toBe("medium");
    const nextPeriod = m.events.find((e) => e.id === "next-period")!.date!;
    const future = dayStateFor(nextPeriod, history(), m);
    expect(future.predictedPeriod).toBe(true);
    expect(future.logged).toBeNull();
  });
  it("today anchor uses local day key", () => {
    expect(localDateKey(new Date(2026, 7, 28))).toBe("2026-08-28");
  });
});
