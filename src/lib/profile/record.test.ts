import { describe, expect, it } from "vitest";

import type { DayEntry } from "@/lib/trackers/core";
import type { MoodEntry } from "@/lib/mood/types";
import { RECORD_WEEKS, recordGrid, recordTotals, trackedThings } from "./record";

const day = (date: string, patch: Partial<DayEntry> = {}): DayEntry => ({
  date,
  sleepMinutes: null,
  bedTime: null,
  wakeTime: null,
  sleepQuality: null,
  waterMl: null,
  sessions: [],
  movementMinutes: null,
  energy: null,
  screenMinutes: null,
  notes: null,
  ...patch,
});

const mood = (timestamp: string): MoodEntry =>
  ({ id: timestamp, timestamp, mood: 6, emotions: ["calm"], note: null }) as unknown as MoodEntry;

const empty = {
  trackerDays: [],
  moodEntries: [],
  habitLogs: [],
  cycleDays: [],
  periods: [],
};

describe("recordGrid", () => {
  it("is always twelve full Monday-first weeks ending on the current week", () => {
    // 2026-09-07 is a Monday
    const { days, start, end } = recordGrid({ ...empty, today: "2026-09-09" });
    expect(days).toHaveLength(RECORD_WEEKS * 7);
    expect(start).toBe("2026-06-22"); // Monday, 11 weeks before
    expect(end).toBe("2026-09-13"); // Sunday of the current week
    expect(new Date(`${start}T12:00:00`).getDay()).toBe(1);
    expect(days[days.length - 1]!.date).toBe(end);
  });

  it("counts each logged thing and remembers where it came from", () => {
    const { days } = recordGrid({
      ...empty,
      today: "2026-09-09",
      trackerDays: [day("2026-09-08", { sleepMinutes: 400, waterMl: 1500 })],
      moodEntries: [mood("2026-09-08T09:00:00.000Z")],
      habitLogs: [{ habitId: "h", date: "2026-09-08", completedAt: "x" }],
      periods: [{ id: "p", start: "2026-09-06", end: "2026-09-08" }],
    });
    const d = days.find((x) => x.date === "2026-09-08")!;
    expect(d.count).toBe(5); // 2 tracker fields + mood + habit + period day
    expect(d.sources.sort()).toEqual(["cycle", "habits", "mood", "trackers"]);
    expect(days.find((x) => x.date === "2026-09-06")!.sources).toEqual(["cycle"]);
    expect(days.find((x) => x.date === "2026-09-09")!.count).toBe(0);
  });

  it("ignores empty tracker days and dates outside the window", () => {
    const { days } = recordGrid({
      ...empty,
      today: "2026-09-09",
      trackerDays: [day("2026-09-08"), day("2020-01-01", { energy: 3 })],
    });
    expect(days.every((d) => d.count === 0)).toBe(true);
  });
});

describe("recordTotals", () => {
  it("computes days, streaks and windows from every source", () => {
    const t = recordTotals({
      ...empty,
      today: "2026-09-09",
      trackerDays: [
        day("2026-09-09", { sleepMinutes: 1 }),
        day("2026-09-08", { sleepMinutes: 1 }),
        day("2026-09-07", { sleepMinutes: 1 }),
        day("2026-09-01", { sleepMinutes: 1 }),
      ],
      habitLogs: [
        { habitId: "h", date: "2026-08-30", completedAt: "x" },
        { habitId: "h", date: "2026-08-31", completedAt: "x" },
        { habitId: "h", date: "2026-09-01", completedAt: "x" },
        { habitId: "h", date: "2026-09-02", completedAt: "x" },
      ],
    });
    expect(t.daysLogged).toBe(7);
    expect(t.streak).toBe(3);
    expect(t.bestStreak).toBe(4); // Aug 30 → Sep 2
    expect(t.last7).toBe(3);
    expect(t.last30).toBe(7);
    expect(t.entries).toBe(8);
    expect(t.firstDay).toBe("2026-08-30");
  });

  it("lets an unlogged today keep yesterday's streak alive", () => {
    const t = recordTotals({
      ...empty,
      today: "2026-09-09",
      habitLogs: [
        { habitId: "h", date: "2026-09-07", completedAt: "x" },
        { habitId: "h", date: "2026-09-08", completedAt: "x" },
      ],
    });
    expect(t.streak).toBe(2);
  });

  it("never counts future-dated entries", () => {
    const t = recordTotals({
      ...empty,
      today: "2026-09-09",
      periods: [{ id: "p", start: "2026-09-08", end: "2026-09-12" }],
    });
    expect(t.daysLogged).toBe(2);
  });
});

describe("trackedThings", () => {
  const base = {
    active: ["sleep", "water"] as const,
    trackerLabels: {
      sleep: "Sleep",
      water: "Water",
      study: "Study",
      movement: "Movement",
      energy: "Energy",
      screen: "Screen",
    },
    trackerDetail: () => "3 days logged",
    moodEntries: 4,
    habits: 2,
    cycleDetail: "29-day cycle",
  };

  it("lists active trackers, mood, habits and cycle", () => {
    const things = trackedThings({ ...base, cycleMode: "tracking" });
    expect(things.map((t) => t.id)).toEqual([
      "tracker-sleep",
      "tracker-water",
      "mood",
      "habits",
      "cycle",
    ]);
    expect(things.every((t) => t.on)).toBe(true);
  });

  it("drops the cycle chip when cycle tracking is off, dims it when paused", () => {
    expect(trackedThings({ ...base, cycleMode: "off" }).some((t) => t.id === "cycle")).toBe(false);
    const paused = trackedThings({ ...base, cycleMode: "paused" }).find((t) => t.id === "cycle")!;
    expect(paused.on).toBe(false);
    expect(paused.detail).toBe("paused");
  });

  it("marks mood and habits as not started when there is nothing yet", () => {
    const things = trackedThings({ ...base, moodEntries: 0, habits: 0, cycleMode: "off" });
    expect(things.find((t) => t.id === "mood")!.on).toBe(false);
    expect(things.find((t) => t.id === "habits")!.detail).toBe("none yet");
  });
});
