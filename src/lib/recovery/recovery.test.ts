/**
 * Sleep & Recovery core — the honesty rules, pinned:
 *  · only recorded nights count; unrecorded nights are never assumed;
 *  · debt is the sum of nightly shortfalls — a long night banks nothing;
 *  · below 3 recorded nights there is no band and no trend;
 *  · the band is the weaker of duration and quality;
 *  · the need is the Assessment answer when given, else the labelled
 *    8-hour default.
 */
import { describe, expect, it } from "vitest";

import { emptyDay, type DayEntry } from "@/lib/trackers/core";
import {
  MIN_RECORDED_NIGHTS,
  buildRecoverySnapshot,
  formatSleepMinutes,
  recoveryLines,
  resolveSleepNeed,
} from "./recovery";

const TODAY = "2026-11-18"; // current window 11-12..11-18, previous 11-05..11-11

function day(date: string, sleepMinutes: number | null, sleepQuality: number | null = null): DayEntry {
  const d = emptyDay(date);
  d.sleepMinutes = sleepMinutes;
  d.sleepQuality = sleepQuality;
  return d;
}

/** n consecutive recorded nights ending at `end`, all the same length. */
function nights(end: string, count: number, minutes: number, quality: number | null = null): DayEntry[] {
  const out: DayEntry[] = [];
  const [y, m, dd] = end.split("-").map(Number) as [number, number, number];
  for (let i = 0; i < count; i += 1) {
    const date = new Date(Date.UTC(y, m - 1, dd - i)).toISOString().slice(0, 10);
    out.push(day(date, minutes, quality));
  }
  return out;
}

describe("resolveSleepNeed", () => {
  it("uses the Assessment's typical sleep when it was answered", () => {
    const need = resolveSleepNeed({ sleepHoursTypical: 7.5 });
    expect(need.minutes).toBe(450);
    expect(need.source).toBe("assessment");
    expect(need.label).toContain("Assessment");
  });

  it("falls back to the labelled 8-hour guide when there is no answer", () => {
    for (const answers of [null, { sleepHoursTypical: null }]) {
      const need = resolveSleepNeed(answers);
      expect(need.minutes).toBe(480);
      expect(need.source).toBe("default");
      expect(need.label).toContain("general 8-hour guide");
    }
  });

  it("ignores an out-of-range stored answer rather than trusting it", () => {
    expect(resolveSleepNeed({ sleepHoursTypical: 20 }).source).toBe("default");
    expect(resolveSleepNeed({ sleepHoursTypical: 1 }).source).toBe("default");
  });
});

describe("windows — only recorded nights count", () => {
  it("averages over recorded nights only and counts the gaps as not recorded", () => {
    const days = [
      day("2026-11-18", 420),
      day("2026-11-17", null), // a day row with no sleep logged
      day("2026-11-16", 480),
      // 11-12 .. 11-15 have no rows at all
    ];
    const snap = buildRecoverySnapshot(days, TODAY, null);
    expect(snap.window.nightsRecorded).toBe(2);
    expect(snap.window.nightsNotRecorded).toBe(5);
    expect(snap.window.averageMinutes).toBe(450);
    expect(snap.window.totalMinutes).toBe(900);
  });

  it("keeps nights outside the two windows out of every figure", () => {
    const days = [day("2026-10-01", 60), ...nights(TODAY, 7, 480)];
    const snap = buildRecoverySnapshot(days, TODAY, null);
    expect(snap.window.nightsRecorded).toBe(7);
    expect(snap.window.averageMinutes).toBe(480);
    expect(snap.previousWindow.nightsRecorded).toBe(0);
  });

  it("averages quality only over the nights that recorded a rating", () => {
    const days = [day("2026-11-18", 480, 5), day("2026-11-17", 480, null), day("2026-11-16", 480, 3)];
    const snap = buildRecoverySnapshot(days, TODAY, null);
    expect(snap.window.averageQuality).toBe(4);
    expect(snap.window.nightsWithQuality).toBe(2);
  });
});

describe("sleep debt", () => {
  it("sums nightly shortfalls against the need", () => {
    const days = [day("2026-11-18", 420), day("2026-11-17", 480), day("2026-11-16", 300)];
    const snap = buildRecoverySnapshot(days, TODAY, null);
    expect(snap.debt.state).toBe("value");
    expect(snap.debt.debtMinutes).toBe(60 + 0 + 180);
    expect(snap.debt.nightsShort).toBe(2);
  });

  it("never lets a long night bank credit against a short one", () => {
    const days = [day("2026-11-18", 660), day("2026-11-17", 300)];
    const snap = buildRecoverySnapshot(days, TODAY, null);
    expect(snap.debt.debtMinutes).toBe(180);
  });

  it("measures against the Assessment need when one was given", () => {
    const days = nights(TODAY, 3, 420);
    const snap = buildRecoverySnapshot(days, TODAY, { sleepHoursTypical: 7 });
    expect(snap.need.minutes).toBe(420);
    expect(snap.debt.debtMinutes).toBe(0);
  });

  it("reports no debt figure at all when nothing was recorded", () => {
    const snap = buildRecoverySnapshot([], TODAY, null);
    expect(snap.debt.state).toBe("none-recorded");
    expect(snap.window.averageMinutes).toBeNull();
  });
});

describe("recovery band", () => {
  it("is 'not enough data' below the recorded-nights floor — pinned", () => {
    const snap = buildRecoverySnapshot(nights(TODAY, MIN_RECORDED_NIGHTS - 1, 480, 5), TODAY, null);
    expect(snap.recovery.band).toBe("not-enough-data");
    expect(snap.recovery.label).toBe("Not enough data yet");
    expect(snap.recovery.inputsLine).toContain("Only 2 nights recorded");
  });

  it("reads recovered when duration and quality are both strong", () => {
    const snap = buildRecoverySnapshot(nights(TODAY, 5, 470, 5), TODAY, null);
    expect(snap.recovery.band).toBe("recovered");
  });

  it("lets the weaker signal govern: long nights that felt rough run low", () => {
    const snap = buildRecoverySnapshot(nights(TODAY, 5, 500, 2), TODAY, null);
    expect(snap.recovery.band).toBe("running-low");
  });

  it("lets the weaker signal govern the other way: short, well-rated nights are only getting there", () => {
    // 432m against a 480m need = 0.90 ratio (getting there), quality 5 (recovered)
    const snap = buildRecoverySnapshot(nights(TODAY, 5, 432, 5), TODAY, null);
    expect(snap.recovery.band).toBe("getting-there");
  });

  it("rests on duration alone when no quality was recorded, and says so", () => {
    const snap = buildRecoverySnapshot(nights(TODAY, 4, 470, null), TODAY, null);
    expect(snap.recovery.band).toBe("recovered");
    expect(snap.recovery.inputsLine).toContain("duration alone");
  });

  it("names its inputs and window in the inputs line", () => {
    const snap = buildRecoverySnapshot(nights(TODAY, 5, 470, 4), TODAY, null);
    expect(snap.recovery.inputsLine).toContain("5 recorded nights in the last 7 days");
    expect(snap.recovery.inputsLine).toContain("average sleep quality 4.0 of 5");
  });
});

describe("trend", () => {
  it("compares the two windows when both hold enough recorded nights", () => {
    const days = [...nights(TODAY, 7, 420), ...nights("2026-11-11", 7, 480)];
    const snap = buildRecoverySnapshot(days, TODAY, null);
    expect(snap.trend.state).toBe("value");
    expect(snap.trend.deltaMinutes).toBe(-60);
    expect(snap.trend.direction).toBe("shorter");
  });

  it("reads a small swing as about the same", () => {
    const days = [...nights(TODAY, 7, 470), ...nights("2026-11-11", 7, 460)];
    const snap = buildRecoverySnapshot(days, TODAY, null);
    expect(snap.trend.direction).toBe("about-the-same");
  });

  it("is insufficient when the previous week is too thin — pinned", () => {
    const days = [...nights(TODAY, 7, 420), ...nights("2026-11-11", 2, 480)];
    const snap = buildRecoverySnapshot(days, TODAY, null);
    expect(snap.trend.state).toBe("insufficient");
    expect(snap.trend.deltaMinutes).toBeNull();
  });
});

describe("page lines", () => {
  it("states the debt with its basis, and names the unrecorded nights as left out", () => {
    const days = [day("2026-11-18", 420, 4), day("2026-11-17", 420, 4), day("2026-11-16", 420, 4)];
    const lines = recoveryLines(buildRecoverySnapshot(days, TODAY, null));
    expect(lines[0]).toContain("Sleep debt of 3h");
    expect(lines[0]).toContain("general 8-hour guide");
    expect(lines.some((l) => l.includes("no sleep recorded"))).toBe(true);
  });

  it("with nothing recorded, the only line is the honest empty one", () => {
    const lines = recoveryLines(buildRecoverySnapshot([], TODAY, null));
    expect(lines).toEqual(["No nights recorded in the last 7 days, so there is no sleep debt to read."]);
  });

  it("formats durations the way the trackers page reads them", () => {
    expect(formatSleepMinutes(480)).toBe("8h");
    expect(formatSleepMinutes(440)).toBe("7h 20m");
    expect(formatSleepMinutes(45)).toBe("45m");
  });
});
