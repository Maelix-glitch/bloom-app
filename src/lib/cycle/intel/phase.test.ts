/**
 * The cycle day can never outrun the cycle it belongs to.
 *
 * `phaseEstimate` is where the current day is computed, and every surface
 * (Today's ring and phase card, Profile, the weekly report, the Cycle
 * page itself) prints the number it returns. Before this pin, an overdue
 * cycle reported its raw elapsed count — "Day 61" of a ~28-day cycle —
 * and a single start logged months ago did the same against no length at
 * all. The overrun belongs in `overdueDays`; the day itself stops at the
 * expected length, or at the baseline's plausible bound while no length
 * has been measured.
 */

import { describe, expect, it } from "vitest";

import { analyseCycle, PLAUSIBLE_MAX, toCycleRecord } from "./index";
import { buildCanonicalCycle } from "../canonical";

const record = (today: string, starts: string[]) =>
  toCycleRecord({ today, periods: starts.map((start) => ({ start, end: null })), days: [] });

/** Three steady 28-day cycles; the last start is 2026-02-26. */
const STEADY = ["2026-01-01", "2026-01-29", "2026-02-26"];

describe("phaseEstimate — the bounded cycle day", () => {
  it("leaves a day inside the expected length untouched", () => {
    const { phase } = analyseCycle(record("2026-03-07", STEADY));
    expect(phase.day).toBe(10);
    expect(phase.overdueDays).toBe(0);
    expect(phase.key).toBe("follicular");
  });

  it("stops at the expected length when the cycle runs past it", () => {
    /* 2026-04-27 is 61 days after the last start of a 28-day cycle. */
    const { phase } = analyseCycle(record("2026-04-27", STEADY));
    expect(phase.expectedLength).toBe(28);
    expect(phase.day).toBe(28);
    expect(phase.label).toBe("Past your usual length");
  });

  it("carries the overrun in overdueDays, exactly", () => {
    const { phase } = analyseCycle(record("2026-04-27", STEADY));
    expect(phase.overdueDays).toBe(61 - 28);
  });

  it("caps the day at the plausible bound while no length is measured", () => {
    /* One start, 212 days ago: there is no cycle length to exceed, but
       "day 212" is not a place in a cycle either. */
    const { phase } = analyseCycle(record("2026-08-01", ["2026-01-01"]));
    expect(phase.expectedLength).toBeNull();
    expect(phase.day).toBe(PLAUSIBLE_MAX);
  });

  it("leaves a recent single start's day untouched", () => {
    const { phase } = analyseCycle(record("2026-01-10", ["2026-01-01"]));
    expect(phase.day).toBe(10);
  });

  it("projects the bounded day into the canonical analysis every surface reads", () => {
    const state = buildCanonicalCycle({
      today: "2026-04-27",
      logs: STEADY.map((start) => ({ id: `p-${start}`, start, end: null })),
      days: [],
      expecting: true,
    });
    expect(state.analysis.cycleDay).toBe(state.analysis.expectedCycleLength);
    expect(state.analysis.cycleDay).toBe(28);
    expect(state.analysis.overdue).toBe(true);
    expect(state.analysis.overdueDays).toBe(33);
    /* the engine and its projection still agree — the canonical invariant */
    expect(state.analysis.cycleDay).toBe(state.intel.phase.day);
  });
});
