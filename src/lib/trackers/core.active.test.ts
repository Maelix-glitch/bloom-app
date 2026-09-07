import { describe, expect, it } from "vitest";

import { analyzeTrackers, DEFAULT_GOALS, emptyDay, type DayEntry } from "./core";
import {
  DEFAULT_FLOW_TIMES,
  flowOf,
  focusOf,
  parseFlowTimes,
  readings,
  scoreOf,
} from "@/lib/home/today";
import { analyzeCycle } from "@/lib/cycle/predict";

const TODAY = "2026-09-07";

/** Sleep and water at goal, nothing else logged. */
function day(): DayEntry {
  const d = emptyDay(TODAY);
  d.sleepMinutes = DEFAULT_GOALS.sleepMinutes;
  d.waterMl = DEFAULT_GOALS.waterMl;
  return d;
}

describe("active trackers — someone tracking three things can reach 100%", () => {
  it("counts all six by default (the old behaviour)", () => {
    const a = analyzeTrackers([day()], DEFAULT_GOALS, TODAY);
    expect(a.active).toHaveLength(6);
    expect(a.goalsCounted).toBe(6);
    expect(a.goalsMetToday).toBe(2);
    expect(a.completion).toBeCloseTo(2 / 6);
  });

  it("counts only the active ones, in canonical order", () => {
    const a = analyzeTrackers([day()], DEFAULT_GOALS, TODAY, { active: ["water", "sleep"] });
    expect(a.active).toEqual(["sleep", "water"]);
    expect(a.goalsCounted).toBe(2);
    expect(a.completion).toBe(1);
    /* stats still exist for the switched-off trackers — history is kept */
    expect(a.trackers.study).toBeDefined();
  });

  it("falls back to all six when the active list is empty", () => {
    const a = analyzeTrackers([day()], DEFAULT_GOALS, TODAY, { active: [] });
    expect(a.goalsCounted).toBe(6);
  });

  it("feeds Today's score: two of two active goals met is a full tracker share", () => {
    const a = analyzeTrackers([day()], DEFAULT_GOALS, TODAY, { active: ["sleep", "water"] });
    const s = scoreOf({ trackers: a, habits: { completedToday: 0, dueToday: 0 }, mood: null });
    expect(s.overall).toBe(100);
  });

  it("drops switched-off trackers from readings, focus and the flow", () => {
    const a = analyzeTrackers([day()], DEFAULT_GOALS, TODAY, { active: ["sleep", "water"] });
    const cycle = analyzeCycle([], TODAY);
    const r = readings({
      trackers: a,
      habits: { completedToday: 0, dueToday: 0 },
      mood: null,
      cycle,
    });
    expect(r.map((x) => x.id)).not.toContain("study");
    expect(r.map((x) => x.id)).toContain("sleep");
    const f = focusOf({ habits: [], mood: null, trackers: a, cycle });
    expect(f.map((x) => x.id)).not.toContain("tracker-study");
    expect(f.map((x) => x.id)).not.toContain("tracker-movement");
    const flow = flowOf({ habits: [], mood: null, trackers: a, now: new Date() });
    expect(flow.map((x) => x.id)).not.toContain("study-block");
    expect(flow.map((x) => x.id)).not.toContain("movement");
    expect(flow.map((x) => x.id)).toContain("mood-checkin");
  });
});

describe("flow times — the day starts when the person says it does", () => {
  it("uses the defaults when nothing is set", () => {
    const a = analyzeTrackers([], DEFAULT_GOALS, TODAY);
    const flow = flowOf({ habits: [], mood: null, trackers: a, now: new Date() });
    expect(flow.find((x) => x.id === "study-block")!.time).toBe(DEFAULT_FLOW_TIMES.study);
    expect(flow.find((x) => x.id === "evening-reflection")!.time).toBe("21:00");
  });

  it("moves every anchor to the given times", () => {
    const a = analyzeTrackers([], DEFAULT_GOALS, TODAY);
    const times = { mood: "22:00", study: "23:30", movement: "03:00", reflection: "06:00" };
    const flow = flowOf({ habits: [], mood: null, trackers: a, now: new Date(), times });
    expect(flow.find((x) => x.id === "mood-checkin")!.time).toBe("22:00");
    expect(flow.find((x) => x.id === "movement")!.time).toBe("03:00");
    /* sorted by clock time, so the night shift's list reads in order */
    expect(flow.map((x) => x.time)).toEqual([...flow.map((x) => x.time)].sort());
  });

  it("parseFlowTimes tolerates junk and pads single-digit hours", () => {
    expect(parseFlowTimes(null)).toBeNull();
    expect(parseFlowTimes({ mood: "25:00" })).toBeNull();
    expect(parseFlowTimes({ mood: "9:05", study: 3 })).toEqual({
      ...DEFAULT_FLOW_TIMES,
      mood: "09:05",
    });
  });
});
