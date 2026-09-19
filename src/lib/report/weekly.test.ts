import { describe, expect, it } from "vitest";

import { shiftDay } from "@/lib/localDay";
import type { MoodEntry } from "@/lib/mood/types";
import type { DayEntry } from "@/lib/trackers/core";

import { buildWeeklyReport, type WeeklyReportInput } from "./weekly";

const TODAY = "2026-09-19";

const mood = (date: string, over: Partial<MoodEntry> = {}): MoodEntry => ({
  id: `m-${date}-${Math.random()}`,
  timestamp: `${date}T12:00:00.000Z`,
  mood: 6,
  energy: 5,
  stress: 4,
  emotions: ["calm"],
  tags: [],
  ...over,
});

const day = (date: string, over: Partial<DayEntry> = {}): DayEntry => ({
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
  ...over,
});

const base: WeeklyReportInput = {
  today: TODAY,
  habits: [{ id: "h1", name: "Water" }],
  habitLogs: [],
  moodEntries: [],
  trackerDays: [],
  goals: {
    sleepMinutes: 480,
    waterMl: 2200,
    studyMinutes: 120,
    movementMinutes: 30,
    energy: 3,
    screenMinutes: 180,
  },
  cycle: null,
};

describe("weekly report", () => {
  it("is honestly empty on a blank record", () => {
    const r = buildWeeklyReport(base);
    expect(r.empty).toBe(true);
    expect(r.insight).toBeNull();
    expect(r.mood.count).toBe(0);
  });

  it("counts the window and not the week before", () => {
    const r = buildWeeklyReport({
      ...base,
      moodEntries: [mood(TODAY), mood(shiftDay(TODAY, -6)), mood(shiftDay(TODAY, -7))],
      habitLogs: [
        { habitId: "h1", date: TODAY },
        { habitId: "h1", date: shiftDay(TODAY, -8) },
      ],
    });
    expect(r.mood.count).toBe(2); // -7 is last week
    expect(r.mood.prevCount).toBe(1);
    expect(r.habits.ticks).toBe(1);
    expect(r.habits.prevTicks).toBe(1);
    expect(r.empty).toBe(false);
  });

  it("names the dominant emotion and the top habit", () => {
    const r = buildWeeklyReport({
      ...base,
      moodEntries: [
        mood(TODAY, { emotions: ["happy", "calm"] }),
        mood(shiftDay(TODAY, -1), { emotions: ["calm"] }),
      ],
      habitLogs: [
        { habitId: "h1", date: TODAY },
        { habitId: "h1", date: shiftDay(TODAY, -1) },
      ],
    });
    expect(r.mood.dominant).toBe("Calm");
    expect(r.habits.topHabit).toEqual({ name: "Water", ticks: 2 });
    expect(r.habits.bestStreak).toEqual({ name: "Water", days: 2 });
  });

  it("averages trackers against goals", () => {
    const r = buildWeeklyReport({
      ...base,
      trackerDays: [
        day(TODAY, { sleepMinutes: 500, waterMl: 2000 }),
        day(shiftDay(TODAY, -1), { sleepMinutes: 300 }),
      ],
    });
    expect(r.trackers.sleepAvg).toBe(400);
    expect(r.trackers.waterAvg).toBe(2000);
    expect(r.trackers.sleepGoalShare).toBe(0.5);
  });

  it("speaks the sleep/mood pattern only when the gap is real", () => {
    const rested = [
      mood(TODAY, { sleep: 8, mood: 8 }),
      mood(shiftDay(TODAY, -1), { sleep: 8, mood: 7 }),
    ];
    const short = [
      mood(shiftDay(TODAY, -2), { sleep: 5, mood: 5 }),
      mood(shiftDay(TODAY, -3), { sleep: 5, mood: 5 }),
    ];
    const loud = buildWeeklyReport({ ...base, moodEntries: [...rested, ...short] });
    expect(loud.insight).toMatch(/sleep/i);
    expect(loud.insight).toMatch(/8\.0|7\.5/); // quotes the real rested average

    /* same shape, tiny gap → silence */
    const quiet = buildWeeklyReport({
      ...base,
      moodEntries: [
        mood(TODAY, { sleep: 8, mood: 6 }),
        mood(shiftDay(TODAY, -1), { sleep: 8, mood: 6 }),
        mood(shiftDay(TODAY, -2), { sleep: 5, mood: 6 }),
        mood(shiftDay(TODAY, -3), { sleep: 5, mood: 5 }),
      ],
    });
    expect(quiet.insight).toBeNull();
  });

  it("falls back to week-over-week movement when it is large", () => {
    const thisWeek = [mood(TODAY, { mood: 8 }), mood(shiftDay(TODAY, -1), { mood: 8 })];
    const lastWeek = [
      mood(shiftDay(TODAY, -8), { mood: 5 }),
      mood(shiftDay(TODAY, -9), { mood: 5 }),
    ];
    const r = buildWeeklyReport({ ...base, moodEntries: [...thisWeek, ...lastWeek] });
    expect(r.insight).toMatch(/last week/i);
  });
});
