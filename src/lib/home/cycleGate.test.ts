/**
 * The cycle must not reach Home — or the coach, which reads the same record —
 * for someone who said the cycle isn't part of their Bloom.
 *
 * `useCycleVisible` answers the question, and `index.tsx` turns "opted out"
 * into `cycleMode: "off"` for every cycle surface. These tests pin the other
 * half of that: that "off" actually removes the cycle from both functions, so
 * a future caller can't reintroduce it by forgetting the flag.
 */

import { describe, expect, it } from "vitest";

import { analyzeCycle, addDays, type PeriodLog } from "@/lib/cycle/predict";
import { analyzeTrackers, DEFAULT_GOALS } from "@/lib/trackers/core";
import { insightsOf, readings } from "./today";

const TODAY = "2026-09-07";
const ago = (n: number) => addDays(TODAY, -n);

/** Four steady ~29-day cycles — enough for a confident day count. */
const LOGS: PeriodLog[] = [
  { id: "a", start: ago(116), end: ago(112), flow: "medium" },
  { id: "b", start: ago(87), end: ago(83), flow: "medium" },
  { id: "c", start: ago(58), end: ago(54), flow: "medium" },
  { id: "d", start: ago(29), end: ago(25), flow: "medium" },
];

const cycle = analyzeCycle(LOGS, TODAY);
const trackers = analyzeTrackers([], DEFAULT_GOALS, TODAY);
/* The two functions take different habit shapes: `readings` only needs today's
   counts, `insightsOf` needs the lists. Sharing one object fails to typecheck. */
const habitsForReadings = { completedToday: 0, dueToday: 0 };
const habitsForInsights = { habits: [], logs: [] };

describe("the cycle gate", () => {
  it("has real data to gate — the fixture is not empty", () => {
    /* Without this, every assertion below could pass on an empty analysis and
       prove nothing. */
    expect(cycle.cycleDay).not.toBeNull();
    expect(cycle.confidence).not.toBe("none");
  });

  describe("readings", () => {
    it("includes the cycle by default", () => {
      const out = readings({ trackers, habits: habitsForReadings, mood: null, cycle });
      expect(out.map((r) => r.id)).toContain("cycle");
    });

    it("removes it entirely when the mode is off", () => {
      const out = readings({
        trackers,
        habits: habitsForReadings,
        mood: null,
        cycle,
        cycleMode: "off",
      });
      /* Removed, not blanked: a "Cycle —" row is the nagging the brief rules
         out. It has to be absent from the list. */
      expect(out.map((r) => r.id)).not.toContain("cycle");
      expect(out.some((r) => r.label.toLowerCase().includes("cycle"))).toBe(false);
    });

    it("keeps it when paused — paused is a state, not an opt-out", () => {
      const out = readings({
        trackers,
        habits: habitsForReadings,
        mood: null,
        cycle,
        cycleMode: "paused",
      });
      const row = out.find((r) => r.id === "cycle");
      expect(row?.value).toBe("Paused");
    });
  });

  describe("insightsOf", () => {
    it("can produce a cycle insight", () => {
      const out = insightsOf({
        trackers,
        moodInsights: [],
        moodCorrelations: [],
        habits: habitsForInsights,
        cycle,
        today: TODAY,
      });
      expect(out.some((i) => i.signal === "cycle")).toBe(true);
    });

    it("never produces one when the mode is off", () => {
      const out = insightsOf({
        trackers,
        moodInsights: [],
        moodCorrelations: [],
        habits: habitsForInsights,
        cycle,
        cycleMode: "off",
        today: TODAY,
      });
      expect(out.some((i) => i.signal === "cycle")).toBe(false);
      expect(out.some((i) => i.title.toLowerCase().includes("cycle"))).toBe(false);
    });

    it("treats an omitted mode as tracking, so existing callers don't change", () => {
      const withDefault = insightsOf({
        trackers,
        moodInsights: [],
        moodCorrelations: [],
        habits: habitsForInsights,
        cycle,
        today: TODAY,
      });
      const withTracking = insightsOf({
        trackers,
        moodInsights: [],
        moodCorrelations: [],
        habits: habitsForInsights,
        cycle,
        cycleMode: "tracking",
        today: TODAY,
      });
      expect(withDefault.map((i) => i.id)).toEqual(withTracking.map((i) => i.id));
    });
  });
});
