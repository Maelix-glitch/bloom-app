/**
 * The week chart's windows, pinned: last 7 days ending today against the
 * 7 days before, ticks counted per day off the raw logs, zeros where the
 * record is honestly empty.
 */
import { describe, expect, it } from "vitest";

import { weekTicks } from "./weekChart";

const log = (date: string, n = 1) => Array.from({ length: n }, () => ({ date }));

describe("weekTicks", () => {
  it("splits ticks across the two windows, oldest first", () => {
    const logs = [
      ...log("2026-11-14", 3), // today
      ...log("2026-11-08", 2), // first day of this week
      ...log("2026-11-07", 4), // last day of the week before
      ...log("2026-11-01", 1), // first day of the week before
      ...log("2026-10-31", 9), // outside both windows — never counted
    ];
    const w = weekTicks(logs, "2026-11-14");
    expect(w.thisWeek).toEqual([2, 0, 0, 0, 0, 0, 3]);
    expect(w.prevWeek).toEqual([1, 0, 0, 0, 0, 0, 4]);
    expect(w.totalThis).toBe(5);
    expect(w.totalPrev).toBe(5);
    expect(w.labels).toHaveLength(7);
  });

  it("is all zeros on an empty record", () => {
    const w = weekTicks([], "2026-11-14");
    expect(w.thisWeek).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(w.prevWeek).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(w.totalThis).toBe(0);
    expect(w.totalPrev).toBe(0);
  });
});
