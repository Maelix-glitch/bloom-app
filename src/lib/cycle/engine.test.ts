import { describe, expect, it } from "vitest";
import {
  addDays,
  buildContext,
  buildCycleModel,
  completedCycles,
  dayStateFor,
  diffDays,
  localDateKey,
  normalizeEntry,
  periodRuns,
} from "./engine";
import { currentCycleCopy } from "./presentation";
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
    expect(past.provenance.status).toBe("observed");
    const nextPeriod = m.events.find((e) => e.id === "next-period")!.date!;
    const future = dayStateFor(nextPeriod, history(), m);
    expect(future.predictedPeriod).toBe(true);
    expect(future.provenance.status).toBe("estimated");
    expect(future.logged).toBeNull();
  });
  it("a single logged period start does not make missing following days follicular or no-flow", () => {
    const rows = [entry("2026-08-29", { flow: "heavy" })];
    const m = buildCycleModel(rows, "2026-08-29");
    const day1 = dayStateFor("2026-08-29", rows, m);
    const forecastDay = dayStateFor("2026-08-30", rows, m);
    expect(day1.phase).toBe("menstrual");
    expect(day1.bleedingState).toBe("heavy");
    expect(day1.reproductivePhase).toBe("follicular");
    expect(day1.provenance.status).toBe("observed");
    expect(m.currentBleedingState).toBe("heavy");
    expect(m.currentReproductivePhase).toBe("follicular");
    expect(currentCycleCopy(m).headline).toBe("Period day 1");
    expect(currentCycleCopy(m).support).toBe("Heavy bleeding · Logged by you");
    expect(currentCycleCopy(m).secondary).toContain("follicular");
    expect(forecastDay.cycleDay).toBe(2);
    expect(forecastDay.predictedPeriod).toBe(true);
    expect(forecastDay.bleedingState).toBe("unlogged");
    expect(forecastDay.reproductivePhase).toBe("follicular");
    expect(forecastDay.logged).toBeNull();
    expect(forecastDay.provenance.status).toBe("estimated");
    expect(m.events[0]?.id).toBe("bleeding-window");
    const bleedingWindow = m.events.find((e) => e.id === "bleeding-window")!;
    expect(bleedingWindow.rangeStart).toBe("2026-08-29");
    expect(bleedingWindow.rangeEnd).toBe("2026-09-02");
    expect(bleedingWindow.provenance?.status).toBe("estimated");
    const estimatedEnd = dayStateFor("2026-09-02", rows, m);
    const afterEstimate = dayStateFor("2026-09-03", rows, m);
    expect(estimatedEnd.predictedPeriod).toBe(true);
    expect(estimatedEnd.provenance.status).toBe("estimated");
    expect(afterEstimate.predictedPeriod).toBe(false);
    expect(afterEstimate.bleedingState).toBe("unlogged");
    expect(m.periodLengthAverage).toBeNull();
    expect(m.currentPeriodEpisode?.start).toBe("2026-08-29");
    expect(m.currentPeriodEpisode?.status).toBe("open");
    expect(m.currentPeriodEpisode?.confirmedEnd).toBeNull();
    expect(m.currentPeriodEpisode?.observedBleedingDays).toBe(1);
    expect(m.currentPeriodEpisode?.confirmedDuration).toBeNull();
  });
  it("when the next day arrives unlogged it stays unknown, while reproductive phase remains separate", () => {
    const rows = [entry("2026-08-29", { flow: "heavy" })];
    const m = buildCycleModel(rows, "2026-08-30");
    const today = dayStateFor("2026-08-30", rows, m);
    expect(m.currentDay).toBe(2);
    expect(m.currentPhase).toBeNull();
    expect(m.currentBleedingState).toBe("unlogged");
    expect(m.currentReproductivePhase).toBe("follicular");
    expect(today.phase).toBeNull();
    expect(today.bleedingState).toBe("unlogged");
    expect(today.provenance.status).toBe("unknown");
    expect(currentCycleCopy(m).headline).toBe("Cycle day 2");
    expect(currentCycleCopy(m).support).toBe("Bleeding not logged today · Not logged");
  });

  it("a missing day inside nearby bleeding logs remains unknown, not invented bleeding", () => {
    const rows = [
      entry("2026-08-29", { flow: "heavy" }),
      entry("2026-08-30", { flow: "medium" }),
      entry("2026-09-01", { flow: "light" }),
      entry("2026-09-02", { flow: "none" }),
    ];
    const m = buildCycleModel(rows, "2026-09-01");
    const gap = dayStateFor("2026-08-31", rows, m);
    expect(gap.logged).toBeNull();
    expect(gap.bleedingState).toBe("unlogged");
    expect(gap.phase).toBeNull();
    expect(gap.provenance.status).toBe("unknown");
    expect(m.periodLengthAverage).toBeNull();
  });

  it("not logged and explicit no-flow are separate states", () => {
    const rows = [
      entry("2026-08-29", { flow: "heavy" }),
      entry("2026-08-30", { flow: "heavy" }),
      entry("2026-08-31", { flow: "light" }),
      entry("2026-09-01", { flow: "none" }),
    ];
    const m = buildCycleModel(rows, "2026-09-01");
    expect(dayStateFor("2026-08-30", rows, m).phase).toBe("menstrual");
    expect(dayStateFor("2026-08-31", rows, m).phase).toBe("menstrual");
    const noFlow = dayStateFor("2026-09-01", rows, m);
    expect(noFlow.logged?.flow).toBe("none");
    expect(noFlow.bleedingState).toBe("none");
    expect(dayStateFor("2026-09-02", rows, m).logged).toBeNull();
    expect(m.currentPeriodEpisode?.status).toBe("completed");
    expect(m.currentPeriodEpisode?.confirmedEnd).toBe("2026-08-31");
    expect(m.currentPeriodEpisode?.confirmedDuration).toBe(3);
    expect(m.periodLengthAverage).toBe(3);
  });
  it("no-flow on a previously estimated bleeding day overrides Bloom's estimate", () => {
    const before = [entry("2026-08-29", { flow: "medium" })];
    const forecast = buildCycleModel(before, "2026-08-29");
    expect(dayStateFor("2026-09-02", before, forecast).predictedPeriod).toBe(true);

    const after = [...before, entry("2026-09-02", { flow: "none" })];
    const corrected = buildCycleModel(after, "2026-09-02");
    const state = dayStateFor("2026-09-02", after, corrected);
    expect(state.logged?.flow).toBe("none");
    expect(state.bleedingState).toBe("none");
    expect(state.predictedPeriod).toBe(false);
    expect(state.bleedingProvenance.status).toBe("observed");
    expect(corrected.currentPeriodEpisode?.status).toBe("completed");
    expect(corrected.currentPeriodEpisode?.confirmedEnd).toBe("2026-08-29");
  });

  it("additional logged bleeding naturally advances period day copy", () => {
    const rows = [entry("2026-08-29", { flow: "medium" }), entry("2026-08-30", { flow: "heavy" })];
    const m = buildCycleModel(rows, "2026-08-30");
    expect(m.currentDay).toBe(2);
    expect(m.currentBleedingState).toBe("heavy");
    expect(currentCycleCopy(m).headline).toBe("Period day 2");
    expect(currentCycleCopy(m).support).toBe("Heavy bleeding · Logged by you");
  });

  it("logged period flow overrides the generic phase model on day 4 and day 7", () => {
    const rows = [0, 1, 2, 3, 4, 5, 6].map((i) =>
      entry(addDays("2026-08-29", i), { flow: i === 0 ? "medium" : "light" }),
    );
    const m = buildCycleModel(rows, "2026-09-04");
    expect(dayStateFor("2026-09-01", rows, m).phase).toBe("menstrual");
    expect(dayStateFor("2026-09-04", rows, m).phase).toBe("menstrual");
    expect(dayStateFor("2026-09-04", rows, m).provenance.source).toBe("user");
    expect(m.currentPhase).toBe("menstrual");
    expect(currentCycleCopy(m).headline).toBe("Period day 7");
    expect(currentCycleCopy(m).support).toBe("Light bleeding · Logged by you");
    expect(m.periodLengthAverage).toBeNull();
    expect(m.estimatedPeriodLength).toBe(4);
  });
  it("changing a period day to no flow removes the observed menstrual override", () => {
    const before = [0, 1, 2, 3].map((i) => entry(addDays("2026-08-29", i), { flow: "light" }));
    const after = before.map((e) =>
      e.date === "2026-09-01" ? entry(e.date, { flow: "none" }) : e,
    );
    const m1 = buildCycleModel(before, "2026-09-01");
    const m2 = buildCycleModel(after, "2026-09-01");
    expect(dayStateFor("2026-09-01", before, m1).phase).toBe("menstrual");
    expect(dayStateFor("2026-09-01", after, m2).logged?.flow).toBe("none");
    expect(dayStateFor("2026-09-01", after, m2).phase).not.toBe("menstrual");
  });
  it("AI context keeps provenance and separates missing days from explicit no-flow", () => {
    const rows = [entry("2026-08-29", { flow: "heavy" })];
    const m = buildCycleModel(rows, "2026-08-30");
    const ctx = buildContext(rows, m);
    expect(ctx.currentDay).toBe(2);
    expect(ctx.currentPhase).toBeNull();
    expect(ctx.bleedingState).toBe("unlogged");
    expect(ctx.reproductivePhase).toBe("follicular");
    expect(ctx.currentProvenance.status).toBe("unknown");
    expect(ctx.observedPeriodDays).toEqual(["2026-08-29"]);
    expect(ctx.explicitNoFlowDays).toEqual([]);
    expect(ctx.unloggedRecentDays).toContain("2026-08-30");
  });
  it("deleting a period anchor invalidates dependent forecasts", () => {
    const rows = [entry("2026-08-29", { flow: "medium" })];
    const withAnchor = buildCycleModel(rows, "2026-08-30");
    const withoutAnchor = buildCycleModel([], "2026-08-30");
    expect(withAnchor.events.some((e) => e.id === "next-period")).toBe(true);
    expect(withoutAnchor.lastPeriodStart).toBeNull();
    expect(withoutAnchor.events.some((e) => e.id === "next-period")).toBe(false);
  });
  it("short and long cycles adapt ovulation/luteal timing instead of pinning day 14", () => {
    const shortRows = ["2026-01-01", "2026-01-26", "2026-02-20"].flatMap((s) => [
      entry(s, { flow: "medium" }),
      entry(addDays(s, 1), { flow: "light" }),
    ]);
    const longRows = ["2026-01-01", "2026-02-01", "2026-03-04"].flatMap((s) => [
      entry(s, { flow: "medium" }),
      entry(addDays(s, 1), { flow: "light" }),
    ]);
    const short = buildCycleModel(shortRows, "2026-02-25");
    const long = buildCycleModel(longRows, "2026-03-09");
    expect(short.average).toBe(25);
    expect(short.ovulationDay).toBe(11);
    expect(short.reproductivePhaseFor(14)).toBe("luteal");
    expect(long.average).toBe(31);
    expect(long.ovulationDay).toBe(17);
    expect(long.reproductivePhaseFor(14)).toBe("follicular");
  });

  it("irregular cycles keep broad uncertainty instead of breaking the model", () => {
    const rows = ["2026-01-01", "2026-01-26", "2026-02-26", "2026-03-22"].flatMap((s) => [
      entry(s, { flow: "medium" }),
      entry(addDays(s, 1), { flow: "light" }),
    ]);
    const m = buildCycleModel(rows, "2026-03-25");
    const next = m.events.find((e) => e.id === "next-period")!;
    expect(m.completed).toHaveLength(3);
    expect(m.average).toBeCloseTo((25 + 31 + 24) / 3);
    expect(next.plusMinusDays).not.toBeNull();
    expect(m.variabilityPercent).not.toBeNull();
  });

  it("today anchor uses local day key", () => {
    expect(localDateKey(new Date(2026, 7, 28))).toBe("2026-08-28");
  });
});
