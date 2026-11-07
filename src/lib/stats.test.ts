/**
 * Pins for the shared record definitions (lib/stats).
 *
 * Every surface that prints a streak, a days-logged count or an average
 * mood routes through these functions, so the edge cases are pinned once,
 * here: today not yet logged, an empty history, week and month boundaries,
 * and the entry-weighting of the mood average.
 */

import { describe, expect, it } from "vitest";

import { averageMood, currentStreak, dayHasSignal, daySignalCount, longestStreak } from "./stats";

const TODAY = "2026-09-07"; // a Monday

describe("currentStreak", () => {
  it("is 0 for an empty history", () => {
    expect(currentStreak([], TODAY)).toBe(0);
    expect(currentStreak(new Set(), TODAY)).toBe(0);
  });

  it("counts today when today is logged", () => {
    expect(currentStreak(["2026-09-05", "2026-09-06", "2026-09-07"], TODAY)).toBe(3);
  });

  it("survives today not being logged yet — the run may end yesterday", () => {
    expect(currentStreak(["2026-09-05", "2026-09-06"], TODAY)).toBe(2);
  });

  it("is 0 when neither today nor yesterday is logged", () => {
    expect(currentStreak(["2026-09-05"], TODAY)).toBe(0);
    expect(currentStreak(["2026-09-01", "2026-09-02", "2026-09-03"], TODAY)).toBe(0);
  });

  it("stops at the first gap", () => {
    expect(currentStreak(["2026-09-03", "2026-09-05", "2026-09-06", "2026-09-07"], TODAY)).toBe(3);
  });

  it("crosses a week boundary (Sunday → Monday) without breaking", () => {
    /* 2026-09-06 is the Sunday, 2026-09-07 the Monday after it. */
    expect(currentStreak(["2026-09-06", "2026-09-07"], TODAY)).toBe(2);
  });

  it("crosses a month boundary without breaking", () => {
    expect(currentStreak(["2026-08-30", "2026-08-31", "2026-09-01"], "2026-09-01")).toBe(3);
  });

  it("ignores future-dated days — they never start or extend a run", () => {
    expect(currentStreak(["2026-09-08", "2026-09-09"], TODAY)).toBe(0);
    expect(currentStreak(["2026-09-06", "2026-09-08"], TODAY)).toBe(1);
  });

  it("accepts any iterable, duplicates included", () => {
    expect(currentStreak(["2026-09-07", "2026-09-07", "2026-09-06"], TODAY)).toBe(2);
  });
});

describe("longestStreak", () => {
  it("is 0 for an empty history", () => {
    expect(longestStreak([])).toBe(0);
  });

  it("is 1 for a single day", () => {
    expect(longestStreak(["2026-09-07"])).toBe(1);
  });

  it("finds the longest run, not the latest one", () => {
    expect(
      longestStreak([
        "2026-08-01",
        "2026-08-02",
        "2026-08-03",
        "2026-08-04",
        "2026-09-06",
        "2026-09-07",
      ]),
    ).toBe(4);
  });

  it("does not join runs across a gap, even a one-day gap", () => {
    expect(longestStreak(["2026-09-01", "2026-09-02", "2026-09-04", "2026-09-05"])).toBe(2);
  });

  it("is order-insensitive and duplicate-tolerant", () => {
    expect(longestStreak(["2026-09-03", "2026-09-01", "2026-09-02", "2026-09-02"])).toBe(3);
  });

  it("crosses a month boundary", () => {
    expect(longestStreak(["2026-08-31", "2026-09-01"])).toBe(2);
  });
});

describe("averageMood", () => {
  it("is null for an empty history — no average exists", () => {
    expect(averageMood([])).toBeNull();
  });

  it("is the single entry's mood for one check-in", () => {
    expect(averageMood([{ mood: 7 }])).toBe(7);
  });

  it("weights by entry, not by day", () => {
    /* Three check-ins at 9 and one at 3: entry-weighted is 7.5. A per-day
       mean over two days (9 and 3) would say 6 — that is the divergence
       this definition exists to rule out. */
    expect(averageMood([{ mood: 9 }, { mood: 9 }, { mood: 9 }, { mood: 3 }])).toBe(7.5);
  });
});

describe("daySignalCount / dayHasSignal", () => {
  const empty = {
    sleepMinutes: null,
    waterMl: null,
    studyMinutes: 0,
    studySessions: 0,
    movementMinutes: null,
    energy: null,
    screenMinutes: null,
  };

  it("an untouched day carries no signal and is not logged", () => {
    expect(daySignalCount(empty)).toBe(0);
    expect(dayHasSignal(empty)).toBe(false);
  });

  it("a screen-only day counts as logged — the definition Profile already used", () => {
    const screenOnly = { ...empty, screenMinutes: 240 };
    expect(daySignalCount(screenOnly)).toBe(1);
    expect(dayHasSignal(screenOnly)).toBe(true);
  });

  it("study counts once, whether it arrives as sessions or as minutes", () => {
    expect(daySignalCount({ ...empty, studySessions: 2 })).toBe(1);
    expect(daySignalCount({ ...empty, studyMinutes: 45 })).toBe(1);
    expect(daySignalCount({ ...empty, studySessions: 2, studyMinutes: 45 })).toBe(1);
  });

  it("counts each of the six signals once", () => {
    expect(
      daySignalCount({
        sleepMinutes: 420,
        waterMl: 1500,
        studyMinutes: 30,
        studySessions: 1,
        movementMinutes: 20,
        energy: 4,
        screenMinutes: 120,
      }),
    ).toBe(6);
  });
});
