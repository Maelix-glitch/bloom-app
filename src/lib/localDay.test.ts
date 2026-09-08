import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { localDay, localTime, shiftDay, todayLocal } from "./localDay";
import { aggregateDays, currentStreak, dayKey } from "./mood/analytics";
import { computeStats } from "./profile/journey";
import type { MoodEntry } from "./mood/types";

const entry = (id: string, timestamp: string): MoodEntry => ({
  id,
  timestamp,
  mood: 6,
  energy: 5,
  stress: 4,
  emotions: ["calm"],
  tags: [],
});

/* Pin the process to India for these cases: UTC+05:30 is exactly the zone
   where the old `.slice(0, 10)` keying put a 1 a.m. check-in on yesterday. */
describe("local-day keying (Asia/Kolkata)", () => {
  const original = process.env["TZ"];
  beforeAll(() => {
    process.env["TZ"] = "Asia/Kolkata";
  });
  afterAll(() => {
    if (original === undefined) delete process.env["TZ"];
    else process.env["TZ"] = original;
  });

  it("keys a 1 a.m. check-in on the day it was made, not the UTC day", () => {
    // 01:10 IST on Sep 7 is 19:40 UTC on Sep 6
    const iso = "2026-09-06T19:40:00.000Z";
    expect(iso.slice(0, 10)).toBe("2026-09-06"); // the bug
    expect(localDay(iso)).toBe("2026-09-07");
    expect(dayKey(iso)).toBe("2026-09-07");
    expect(localTime(iso)).toBe("01:10");
  });

  it("leaves bare dates and legacy noon stamps alone", () => {
    expect(localDay("2026-09-07")).toBe("2026-09-07");
    expect(localDay("2026-09-07T12:00:00.000Z")).toBe("2026-09-07");
    expect(localDay("not a date")).toBe("not a date".slice(0, 10));
  });

  it("aggregates by the person's day", () => {
    const days = aggregateDays([
      entry("a", "2026-09-06T19:40:00.000Z"), // Sep 7, 01:10 IST
      entry("b", "2026-09-07T04:00:00.000Z"), // Sep 7, 09:30 IST
      entry("c", "2026-09-05T18:30:00.000Z"), // Sep 6, 00:00 IST
    ]);
    expect(days.map((d) => [d.date, d.entries.length])).toEqual([
      ["2026-09-06", 1],
      ["2026-09-07", 2],
    ]);
  });

  it("does not break a streak at midnight UTC", () => {
    const days = aggregateDays([
      entry("a", "2026-09-04T19:40:00.000Z"), // Sep 5 IST
      entry("b", "2026-09-05T19:40:00.000Z"), // Sep 6 IST
      entry("c", "2026-09-06T19:40:00.000Z"), // Sep 7 IST
    ]);
    expect(currentStreak(days, "2026-09-07")).toBe(3);
    // yesterday counts as an unbroken start — today isn't over yet
    expect(currentStreak(days, "2026-09-08")).toBe(3);
    expect(currentStreak(days, "2026-09-09")).toBe(0);
  });

  it("journey stats count local days", () => {
    const stats = computeStats({
      entries: [entry("a", "2026-09-06T19:40:00.000Z"), entry("b", "2026-09-07T04:00:00.000Z")],
      rewards: [],
      stories: [],
      highlights: [],
      memberSince: null,
    });
    expect(stats.daysTracked).toBe(1);
  });
});

describe("day arithmetic", () => {
  it("shifts calendar days safely across month ends and DST", () => {
    expect(shiftDay("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftDay("2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftDay("2026-03-29", -1)).toBe("2026-03-28");
  });

  it("todayLocal matches the local getters", () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate(),
    ).padStart(2, "0")}`;
    expect(todayLocal(now)).toBe(expected);
  });
});
