// @vitest-environment jsdom
/**
 * The Notification Center's cycle read must come from the record the
 * current app actually writes (periodStore), never the legacy
 * cycle_entries engine — and it must honour the mode: off means absent,
 * paused means no forward-looking "late" read.
 */
import { beforeEach, describe, expect, it } from "vitest";

import { cycleCenterInsights } from "./centerInsights";
import { addDays, type PeriodLog } from "./predict";
import {
  DEFAULT_CYCLE_SETTINGS,
  saveCycleSettings,
  saveLogs,
  type CycleSettings,
} from "./periodStore";

const TODAY = "2026-09-07";
const ago = (n: number) => addDays(TODAY, -n);

function steady(lastStartAgo: number): PeriodLog[] {
  const s = ago(lastStartAgo);
  return [
    { id: "a", start: addDays(s, -87), end: addDays(s, -83), flow: "medium" },
    { id: "b", start: addDays(s, -58), end: addDays(s, -54), flow: "medium" },
    { id: "c", start: addDays(s, -29), end: addDays(s, -25), flow: "heavy" },
    { id: "d", start: s, end: addDays(s, 4), flow: "medium" },
  ];
}

function settings(patch: Partial<CycleSettings>): void {
  saveCycleSettings({ ...DEFAULT_CYCLE_SETTINGS, ...patch });
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("cycleCenterInsights — the real record, mode-honest", () => {
  it("is empty with nothing logged", () => {
    expect(cycleCenterInsights(TODAY)).toEqual([]);
  });

  it("reads the current system's record (periods the legacy store never sees)", () => {
    saveLogs(steady(40)); // last start 40 days ago on a 29-day rhythm — past due
    const rows = cycleCenterInsights(TODAY);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some((r) => r.id.startsWith("flag-"))).toBe(true);
  });

  it("disappears entirely when cycle tracking is off", () => {
    saveLogs(steady(40));
    settings({ mode: "off" });
    expect(cycleCenterInsights(TODAY)).toEqual([]);
  });

  it("never calls anything late while paused", () => {
    saveLogs(steady(40));
    settings({
      mode: "paused",
      pause: { until: null, reason: null, since: ago(10) },
    });
    const rows = cycleCenterInsights(TODAY);
    expect(rows.some((r) => r.id === "flag-late")).toBe(false);
  });

  it("never calls anything late when predictions are hidden by choice", () => {
    saveLogs(steady(40));
    settings({ predictionsOff: true });
    const rows = cycleCenterInsights(TODAY);
    expect(rows.some((r) => r.id === "flag-late")).toBe(false);
  });
});
