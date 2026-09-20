import { describe, expect, it } from "vitest";

import type { CoachRecord, TrackerFacts } from "@/lib/coach/responder";
import { signalStarters, starterPrompts } from "@/lib/coach/ui-helpers";

function tracker(id: string, name: string, over: Partial<TrackerFacts> = {}): TrackerFacts {
  return {
    id: id as TrackerFacts["id"],
    name,
    today: null,
    goal: 1,
    avg7: null,
    streak: 0,
    daysLogged: 10,
    series: Array(14).fill(1),
    format: (v) => String(v),
    ...over,
  };
}

function record(trackers: TrackerFacts[]): CoachRecord {
  return {
    today: "2026-09-20",
    trackers,
    cycle: null,
    memories: [],
    habitsActive: 0,
  };
}

describe("signalStarters", () => {
  it("reads sleep running below its own recent average", () => {
    const series = [480, 480, 470, 480, 475, 460, 380, 390, 385];
    const padded = [...Array(14 - series.length).fill(480), ...series];
    const r = record([tracker("sleep", "Sleep", { avg7: 440, series: padded, daysLogged: 14 })]);
    const out = signalStarters(r);
    expect(out.some((s) => /lighter than usual/.test(s.text))).toBe(true);
  });

  it("nudges a live streak with nothing logged today", () => {
    const r = record([tracker("water", "Water", { streak: 5, today: null })]);
    const out = signalStarters(r);
    expect(out.some((s) => /water streak/.test(s.text))).toBe(true);
  });

  it("never fires without real history", () => {
    const r = record([
      tracker("sleep", "Sleep", { avg7: null, series: [null, null, null, 380, 380, 380] }),
      tracker("water", "Water", { streak: 1, today: null }),
    ]);
    expect(signalStarters(r)).toHaveLength(0);
  });

  it("caps at two starters", () => {
    const r = record([
      tracker("sleep", "Sleep", {
        avg7: 440,
        series: [480, 480, 380, 390, 385, 480, 480, 460, 470, 480, 475, 480, 480, 480],
        daysLogged: 14,
      }),
      tracker("water", "Water", { streak: 6, today: null }),
      tracker("movement", "Movement", { streak: 4, today: null }),
    ]);
    expect(signalStarters(r).length).toBeLessThanOrEqual(2);
  });

  it("signal starters surface in the prompts pool", () => {
    const r = record([tracker("water", "Water", { streak: 5, today: null, daysLogged: 14 })]);
    const starters = starterPrompts("ask", r, 5, "2026-09-20", []);
    // With one real signal and a small pool, it must be represented.
    expect(starters.some((s) => /water streak/.test(s.text))).toBe(true);
  });
});
