import { describe, expect, it } from "vitest";

import type { DayEntry, Goals } from "@/lib/trackers/core";
import { DEFAULT_GOALS } from "@/lib/trackers/core";
import type { MoodEntry } from "@/lib/mood/types";
import type { HabitLog } from "@/lib/home/habits";
import { buildWeeklyReport } from "./weekly";

const TODAY = "2026-09-20"; // Sunday — the week is Sep 14 → Sep 20

const HABITS = [{ id: "h1", name: "Read 20 pages" }];

function day(offset: number, patch: Partial<DayEntry>): DayEntry {
  const d = new Date(`${TODAY}T12:00:00`);
  d.setDate(d.getDate() + offset);
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return {
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
  };
}

function entry(date: string, hour: number, mood: number): MoodEntry {
  return {
    id: `e-${date}-${hour}`,
    timestamp: `${date}T${String(hour).padStart(2, "0")}:00:00`,
    mood,
    energy: 5,
    stress: 4,
    emotions: [],
    tags: [],
  };
}

const BASE = {
  today: TODAY,
  habits: HABITS,
  habitLogs: [] as HabitLog[],
  moodEntries: [] as MoodEntry[],
  trackerDays: [] as DayEntry[],
  goals: DEFAULT_GOALS as Goals,
  cycle: null,
};

describe("weekly report · against your usual", () => {
  it("is null for a brand-new record", () => {
    const report = buildWeeklyReport(BASE);
    expect(report.usual).toBeNull();
  });

  it("baselines on the weeks BEFORE the report window", () => {
    const days: DayEntry[] = [];
    // three consistent weeks before the window (sleep needs its window logged)
    for (let off = -27; off <= -7; off++) {
      days.push(
        day(off, {
          sleepMinutes: 420,
          bedTime: "23:30",
          wakeTime: "07:30",
          waterMl: 2000,
          movementMinutes: 30,
        }),
      );
    }
    // a wild in-week value that must NOT drag the baseline
    days.push(day(-3, { sleepMinutes: 60, bedTime: "01:00", wakeTime: "02:00", waterMl: 5000 }));
    const report = buildWeeklyReport({ ...BASE, trackerDays: days });
    expect(report.usual).not.toBeNull();
    expect(report.usual!.sleepMinutes).toBe(420);
    expect(report.usual!.waterMl).toBe(2000);
    expect(report.usual!.movementMinutes).toBe(30);
  });

  it("keeps the mood baseline separate from the week's average", () => {
    const entries: MoodEntry[] = [];
    for (let off = -27; off <= -7; off++) {
      const d = new Date(`${TODAY}T12:00:00`);
      d.setDate(d.getDate() + off);
      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      entries.push(entry(date, 21, 5));
    }
    const d = (off: number) => {
      const x = new Date(`${TODAY}T12:00:00`);
      x.setDate(x.getDate() + off);
      return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
    };
    entries.push(entry(d(-2), 9, 9), entry(d(-1), 9, 9)); // a great week
    const report = buildWeeklyReport({ ...BASE, moodEntries: entries });
    expect(report.usual!.avgMood).toBe(5);
    expect(report.mood.avgMood).toBe(9);
  });

  it("ignores in-window tracker days entirely when the record starts this week", () => {
    const days = [day(-1, { sleepMinutes: 500 }), day(-2, { sleepMinutes: 500 })];
    const report = buildWeeklyReport({ ...BASE, trackerDays: days });
    expect(report.usual).toBeNull();
  });
});
