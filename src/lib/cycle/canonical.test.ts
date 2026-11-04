/**
 * Cross-view regression tests.
 *
 * The page has many views — overview, calendar, dial, phase wave, charts,
 * brief, comparison, history — and every one of them renders from the object
 * returned by `buildCanonicalCycle`. These tests pin the two things that were
 * asked for:
 *
 *  1. `analysis` is a faithful projection of `intel`: the date, the phase, the
 *     window, the confidence band and the statistics cannot disagree with the
 *     engine that produced them.
 *  2. No visualisation calls the engine or the legacy analyser itself, so a
 *     second, drifting calculation path cannot reappear.
 *
 * The scenarios mirror the engine tests: no history, one start, two starts,
 * consistent, variable, unusual, edited, deleted, irregular and a date that
 * crosses a daylight-saving boundary.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { buildCanonicalCycle, type CanonicalCycle } from "./canonical";
import { addDays, diffDays } from "./intel/dates";
import type { PeriodLog } from "./predict";

const log = (start: string, end: string | null = null): PeriodLog => ({
  id: `p-${start}`,
  start,
  end,
});

function startsFrom(first: string, lengths: number[]): string[] {
  const out = [first];
  for (const length of lengths) out.push(addDays(out[out.length - 1]!, length));
  return out;
}

/** Every view-visible number must be the engine's number. */
function expectAgreement({ intel, analysis }: CanonicalCycle): void {
  const band = { none: "none", low: "low", moderate: "medium", good: "high" } as const;

  expect(analysis.today).toBe(intel.record.today);
  expect(analysis.cycleDay).toBe(intel.phase.day);
  expect(analysis.phaseLabel).toBe(intel.phase.label);
  expect(analysis.confidence).toBe(band[intel.confidence.level]);
  expect(analysis.confidenceReason).toBe(intel.confidence.reason);
  expect(analysis.lastStart).toBe(intel.baseline.lastStart);
  expect(analysis.nextStart).toBe(intel.forecast.next?.point ?? null);
  expect(analysis.daysUntilNext).toBe(intel.forecast.next?.daysAway ?? null);
  expect(analysis.isGeneric).toBe(intel.baseline.plausible.length === 0);
  expect(analysis.cycleLengths).toEqual(intel.baseline.plausible);
  expect(analysis.stats.shortest).toBe(intel.baseline.min);
  expect(analysis.stats.longest).toBe(intel.baseline.max);
  expect(analysis.stats.excludedGaps).toBe(intel.baseline.unusual.length);
  expect(analysis.stats.averageBleed).toBe(intel.baseline.bleedingMedian);
  expect(analysis.stats.entriesWithEnd).toBe(intel.baseline.bleedingCount);
  expect(analysis.periodLengthIsLogged).toBe(intel.baseline.bleedingCount > 0);

  if (intel.forecast.next === null) {
    expect(analysis.nextWindow).toBeNull();
    expect(analysis.forecast).toEqual([]);
  } else {
    expect(analysis.nextWindow).toEqual({
      from: intel.forecast.next.from,
      to: intel.forecast.next.to,
      spread: intel.forecast.halfWidth * 2,
    });
    /* the forward look must start where the one forecast starts */
    expect(analysis.forecast[0]?.start).toBe(intel.forecast.next.point);
    expect(analysis.forecast).toHaveLength(3);
  }

  /* the phase cards, wave and dial read these windows */
  if (intel.baseline.lastStart !== null && analysis.phaseWindows.length > 0) {
    const first = analysis.phaseWindows[0]!;
    const last = analysis.phaseWindows[analysis.phaseWindows.length - 1]!;
    expect(first.from).toBe(intel.baseline.lastStart);
    expect(last.to).toBe(addDays(intel.baseline.lastStart, analysis.expectedCycleLength - 1));
    for (const window of analysis.phaseWindows) {
      expect(window.to).toBe(addDays(window.from, window.toDay - window.fromDay));
    }
  }

  /* late is the one phase the engine expresses as a day count */
  if (intel.phase.overdueDays > 0) {
    expect(analysis.phase).toBe("late");
    expect(analysis.overdue).toBe(true);
    expect(analysis.overdueDays).toBe(intel.phase.overdueDays);
  } else {
    expect(analysis.phase).toBe(intel.phase.key);
    expect(analysis.overdue).toBe(false);
  }

  expect(analysis.phase === null || analysis.phaseWindows.length === 0 || analysis.phase === "late" ||
    analysis.phaseWindows.some((w) => w.phase === analysis.phase)).toBe(true);
}

const build = (
  today: string,
  logs: PeriodLog[],
  days: CanonicalCycleInputDays = [],
  expecting = true,
) => buildCanonicalCycle({ today, logs, days, expecting });

type CanonicalCycleInputDays = Parameters<typeof buildCanonicalCycle>[0]["days"];

describe("no history", () => {
  const state = build("2026-06-01", []);

  it("agrees across every view", () => expectAgreement(state));
  it("shows the first-run brief and no forecast", () => {
    expect(state.intel.forecast.available).toBe(false);
    expect(state.analysis.entryCount).toBe(0);
    expect(state.analysis.phase).toBeNull();
    expect(state.analysis.phaseWindows).toEqual([]);
  });
});

describe("one period", () => {
  const state = build("2026-01-10", [log("2026-01-01")]);

  it("agrees across every view", () => expectAgreement(state));
  it("counts the day without inventing a phase", () => {
    expect(state.analysis.cycleDay).toBe(10);
    expect(state.analysis.phase).toBeNull();
    expect(state.analysis.nextStart).toBeNull();
    expect(state.analysis.confidence).toBe("none");
  });
});

describe("two starts", () => {
  const state = build("2026-02-05", [log("2026-01-01"), log("2026-01-29")]);

  it("agrees across every view", () => expectAgreement(state));
  it("carries the same window into the dial and the header", () => {
    expect(state.analysis.nextStart).toBe("2026-02-26");
    expect(state.analysis.nextWindow?.from).toBe("2026-02-22");
    expect(state.analysis.nextWindow?.spread).toBe(8);
  });
});

describe("consistent cycles", () => {
  const starts = startsFrom("2026-01-01", [28, 28, 28, 28, 28, 28, 28]);
  const state = build(addDays(starts[starts.length - 1]!, 9), starts.map((s) => log(s)));

  it("agrees across every view", () => expectAgreement(state));
  it("keeps the dial, cards and stats on one length", () => {
    expect(state.analysis.averageLength).toBe(28);
    expect(state.analysis.expectedCycleLength).toBe(28);
    expect(state.analysis.stats.cyclesLogged).toBe(7);
  });
});

describe("variable cycles", () => {
  const starts = startsFrom("2026-01-01", [26, 33, 24, 35, 27, 34]);
  const state = build("2026-07-01", starts.map((s) => log(s)));

  it("agrees across every view", () => expectAgreement(state));
  it("widens the window rather than forcing a date", () => {
    expect(state.intel.forecast.halfWidth).toBeGreaterThanOrEqual(4);
    expect(state.analysis.confidence).not.toBe("high");
  });
});

describe("an unusual interval", () => {
  const state = build("2026-04-02", ["2026-01-01", "2026-01-29", "2026-03-30"].map((s) => log(s)));

  it("agrees across every view", () => expectAgreement(state));
  it("keeps the gap in history but out of the stats", () => {
    expect(state.analysis.stats.excludedGaps).toBe(1);
    expect(state.analysis.gaps.find((g) => g.days === 60)?.plausible).toBe(false);
    expect(state.analysis.cycleLengths).toEqual([28]);
  });
});

describe("a historical edit", () => {
  const before = build("2026-03-10", ["2026-01-01", "2026-01-29", "2026-03-05"].map((s) => log(s)));
  const after = build("2026-03-10", ["2026-01-01", "2026-01-29", "2026-02-26"].map((s) => log(s)));

  it("agrees across every view, before and after", () => {
    expectAgreement(before);
    expectAgreement(after);
  });

  it("moves every dependent view, not just one", () => {
    expect(before.analysis.nextStart).not.toBe(after.analysis.nextStart);
    expect(before.analysis.averageLength).not.toBe(after.analysis.averageLength);
    expect(before.intel.brief.lines.join(" ")).not.toBe(after.intel.brief.lines.join(" "));
  });
});

describe("a historical deletion", () => {
  const full = ["2026-01-01", "2026-01-29", "2026-02-26", "2026-03-20"];
  const before = build("2026-04-01", full.map((s) => log(s)));
  const after = build(
    "2026-04-01",
    full.filter((s) => s !== "2026-02-26").map((s) => log(s)),
  );

  it("agrees across every view, before and after", () => {
    expectAgreement(before);
    expectAgreement(after);
  });

  it("drops the record from every view at once", () => {
    expect(after.analysis.entryCount).toBe(3);
    expect(after.analysis.gaps.some((g) => g.toStart === "2026-02-26")).toBe(false);
    expect(after.analysis.cycleLengths).toEqual([28]);
    expect(after.analysis.gaps.map((g) => g.days)).toEqual([28, 50]);
    expect(after.analysis.gaps.find((g) => g.days === 50)?.plausible).toBe(false);
    expect(before.analysis.stats.cyclesLogged).toBe(3);
  });
});

describe("irregular cycles", () => {
  const starts = startsFrom("2026-01-01", [21, 40, 21, 40]);
  const state = build(addDays(starts[starts.length - 1]!, 17), starts.map((s) => log(s)));

  it("agrees across every view", () => expectAgreement(state));
  it("shows uncertainty everywhere, not just in one card", () => {
    expect(state.analysis.confidence).not.toBe("high");
    expect(state.analysis.confidence).not.toBe("medium");
    expect(state.intel.forecast.halfWidth).toBe(10);
    expect(state.analysis.irregular).toBe(true);
  });
});

describe("a date crossing a daylight-saving boundary", () => {
  /* US DST begins 2026-03-08; a calendar-day count must not lose or gain a day. */
  const state = build("2026-03-15", [log("2026-02-01"), log("2026-03-01")]);

  it("agrees across every view", () => expectAgreement(state));
  it("counts calendar days, not elapsed hours", () => {
    expect(state.analysis.cycleDay).toBe(diffDays("2026-03-01", "2026-03-15") + 1);
    expect(state.analysis.cycleDay).toBe(15);
    expect(state.analysis.nextStart).toBe("2026-03-29");
  });
});

describe("paused tracking", () => {
  const state = build("2026-04-01", [log("2026-01-01"), log("2026-01-29")], [], false);

  it("keeps history and still agrees across views", () => {
    expectAgreement(state);
    expect(state.analysis.expecting).toBe(false);
    expect(state.analysis.entryCount).toBe(2);
  });
});

describe("architecture — one calculation path", () => {
  const ROOT = process.cwd();
  const views = [
    "src/components/ci/CycleIntelligence.tsx",
    "src/components/ci/PhaseWave.tsx",
    "src/components/ci/CycleDial.tsx",
    "src/components/ci/RhythmChart.tsx",
    "src/components/ci/AnalyticsCards.tsx",
    "src/components/ci/InsightsPanel.tsx",
    "src/components/ci/HistoryTable.tsx",
    "src/components/ci/SymptomPhaseGrid.tsx",
    "src/components/ci/SymptomBloom.tsx",
    "src/components/ci/VitalDials.tsx",
    "src/components/ci/DayLogInsights.tsx",
    "src/components/ci/CycleHeatmap.tsx",
    "src/components/ci/TipsCard.tsx",
    "src/components/ci/LogPanel.tsx",
    "src/components/ci/intel/CycleIntelPanels.tsx",
  ];

  it("no visualisation calls a cycle analyser itself", () => {
    for (const file of views) {
      const source = readFileSync(join(ROOT, file), "utf8");
      expect(source, file).not.toMatch(/analyzeCycle\s*\(/);
      expect(source, file).not.toMatch(/analyseCycle\s*\(/);
    }
  });

  it("the store is the only producer of cycle state", () => {
    const hook = readFileSync(join(ROOT, "src/hooks/usePeriodLog.ts"), "utf8");
    expect(hook).toContain("buildCanonicalCycle(");
    expect(hook).not.toMatch(/analyzeCycle\s*\(/);
  });
});

/**
 * The flow mix once printed "Not specified 56 · 700%" beside "Heavy 6 · 75%".
 * The numerator counted logged days while the denominator counted logged
 * periods. Both sides must count the same population — a period.
 */
describe("flow mix denominators", () => {
  it("counts one flow per period, so every share is a share of entryCount", () => {
    const starts = startsFrom("2026-01-01", [28, 28, 28]);
    const logs: PeriodLog[] = starts.map((start, index) => ({
      id: `p-${start}`,
      start,
      end: addDays(start, 4),
      flow: index < 2 ? "heavy" : null,
    }));
    /* Sixty daily logs with a flow — the old numerator — must not leak in. */
    const days = Array.from({ length: 60 }, (_, i) => ({
      date: addDays("2026-01-01", i),
      flow: i % 2 === 0 ? "heavy" : "light",
    }));

    const { analysis } = buildCanonicalCycle({
      today: "2026-03-05",
      logs,
      days,
      expecting: true,
    });
    const counts = analysis.stats.flowCounts;
    const sum = counts.light + counts.medium + counts.heavy + counts.unspecified;

    expect(analysis.entryCount).toBe(logs.length);
    expect(sum).toBe(analysis.entryCount);
    expect(counts.heavy).toBe(2);
    expect(counts.light).toBe(0);
    expect(counts.unspecified).toBe(logs.length - 2);
    for (const count of Object.values(counts)) {
      expect(count).toBeLessThanOrEqual(analysis.entryCount);
    }
  });
});
