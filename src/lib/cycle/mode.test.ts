/**
 * B1 — "I'm not expecting periods" / "I don't track a cycle".
 * Paused: history and the daily log stay, nothing is predicted, nothing is
 * ever late. Off: the cycle leaves Today, the nav and the coach too.
 */
import { describe, expect, it } from "vitest";

import { addDays, analyzeCycle, type PeriodLog } from "./predict";
import { reconcile } from "./reconcile";
import {
  DEFAULT_CYCLE_SETTINGS,
  effectiveMode,
  normalizeSettings,
  type CycleSettings,
} from "./periodStore";
import { analyzeTrackers, DEFAULT_GOALS } from "@/lib/trackers/core";
import { connections, focusOf, readings } from "@/lib/home/today";

const TODAY = "2026-09-07";
const ago = (n: number) => addDays(TODAY, -n);

/** Four steady 29-day cycles; the latest started 61 days ago — "due 32 days ago". */
function overdue(): PeriodLog[] {
  const s = ago(61);
  return [
    { id: "a", start: addDays(s, -87), end: addDays(s, -83), flow: "medium" },
    { id: "b", start: addDays(s, -58), end: addDays(s, -54), flow: "medium" },
    { id: "c", start: addDays(s, -29), end: addDays(s, -25), flow: "heavy" },
    { id: "d", start: s, end: addDays(s, 4), flow: "medium" },
  ];
}

describe("engine · expecting: false", () => {
  it("keeps history and averages but predicts nothing and is never late", () => {
    const on = analyzeCycle(overdue(), TODAY);
    expect(on.isLate).toBe(true);
    expect(on.nextStart).not.toBeNull();

    const off = analyzeCycle(overdue(), TODAY, { expecting: false });
    expect(off.expecting).toBe(false);
    expect(off.entryCount).toBe(4);
    expect(off.averageLength).toBe(on.averageLength);
    expect(off.cycleLengths).toEqual(on.cycleLengths);
    expect(off.stats.cyclesLogged).toBe(on.stats.cyclesLogged);
    /* nothing forward-looking */
    expect(off.cycleDay).toBeNull();
    expect(off.phase).toBeNull();
    expect(off.nextStart).toBeNull();
    expect(off.nextWindow).toBeNull();
    expect(off.isLate).toBe(false);
    expect(off.lateBy).toBe(0);
    expect(off.ovulationDate).toBeNull();
    expect(off.fertileStart).toBeNull();
    expect(off.forecast).toEqual([]);
    expect(off.phaseWindows).toEqual([]);
    expect(off.flags.map((f) => f.kind)).not.toContain("late");
    expect(off.flags.map((f) => f.kind)).not.toContain("generic");
  });

  it("asks nothing about lateness or long gaps while paused", () => {
    const logs = overdue();
    const asking = reconcile({ logs, days: [], today: TODAY });
    expect(asking.map((c) => c.kind)).toContain("late");
    const late = asking.find((c) => c.kind === "late")!;
    /* the late card itself now offers the way out */
    const notExpecting = late.actions.find((a) => a.id === "not-expecting")!;
    expect(notExpecting.resolution).toEqual({ type: "pause-tracking" });

    const quiet = reconcile({
      logs,
      days: [],
      today: TODAY,
      analysis: analyzeCycle(logs, TODAY, { expecting: false }),
    });
    expect(quiet.map((c) => c.kind)).not.toContain("late");
    expect(quiet.map((c) => c.kind)).not.toContain("missed-log");
  });
});

describe("settings · mode + pause", () => {
  it("normalises junk to tracking and keeps a well-formed pause", () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_CYCLE_SETTINGS);
    expect(normalizeSettings({ mode: "sideways" }).mode).toBe("tracking");
    expect(normalizeSettings({ mode: "off", pause: { until: "2026-10-01" } })).toEqual({
      personalMaxPlausible: null,
      mode: "off",
      pause: null,
    });
    const s = normalizeSettings({
      personalMaxPlausible: 52,
      mode: "paused",
      pause: { until: "2026-12-01", reason: "  pregnant ", since: "2026-09-01" },
      modeChangedAt: "2026-09-01T10:00:00.000Z",
    });
    expect(s.pause).toEqual({ until: "2026-12-01", reason: "pregnant", since: "2026-09-01" });
    expect(s.modeChangedAt).toBe("2026-09-01T10:00:00.000Z");
    /* a pause without details is still a pause */
    expect(normalizeSettings({ mode: "paused" }).pause).not.toBeNull();
  });

  it("a dated pause that has passed reads as tracking again", () => {
    const paused: CycleSettings = {
      personalMaxPlausible: null,
      mode: "paused",
      pause: { until: "2026-09-06", reason: null, since: "2026-08-01" },
    };
    expect(effectiveMode(paused, "2026-09-06")).toBe("paused"); // inclusive
    expect(effectiveMode(paused, "2026-09-07")).toBe("tracking");
    expect(effectiveMode({ ...paused, pause: { ...paused.pause!, until: null } }, TODAY)).toBe(
      "paused",
    );
    expect(effectiveMode({ ...paused, mode: "off" }, TODAY)).toBe("off");
  });
});

describe("Today · the cycle steps back when asked to", () => {
  const trackers = analyzeTrackers([], DEFAULT_GOALS, TODAY);
  const habits = { completedToday: 0, dueToday: 0 };
  const cycle = analyzeCycle([], TODAY, { expecting: false });

  it("off removes the ring, the focus nudge and the map node", () => {
    const r = readings({ trackers, habits, mood: null, cycle, cycleMode: "off" });
    expect(r.map((x) => x.id)).not.toContain("cycle");
    const f = focusOf({ habits: [], mood: null, trackers, cycle, cycleMode: "off" });
    expect(f.map((x) => x.id)).not.toContain("cycle");
    const m = connections({
      trackers,
      habits: { habits: [], logs: [], completedToday: 0, dueToday: 0 },
      moodEntries: [],
      moodDays: [],
      moodCorrelations: [],
      cycle,
      cycleMode: "off",
      today: TODAY,
    });
    expect(m.nodes.map((n) => n.id)).not.toContain("cycle");
  });

  it("paused keeps a quiet ring and never nags to set an anchor", () => {
    const r = readings({ trackers, habits, mood: null, cycle, cycleMode: "paused" });
    expect(r.find((x) => x.id === "cycle")!.value).toBe("Paused");
    const f = focusOf({ habits: [], mood: null, trackers, cycle, cycleMode: "paused" });
    expect(f.map((x) => x.id)).not.toContain("cycle");
    /* default behaviour unchanged: with room on the list, the anchor nudge is still there */
    const few = analyzeTrackers([], DEFAULT_GOALS, TODAY, { active: ["sleep"] });
    const f2 = focusOf({ habits: [], mood: null, trackers: few, cycle });
    expect(f2.map((x) => x.id)).toContain("cycle");
    const f3 = focusOf({ habits: [], mood: null, trackers: few, cycle, cycleMode: "paused" });
    expect(f3.map((x) => x.id)).not.toContain("cycle");
  });
});
