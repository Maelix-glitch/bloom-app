/**
 * Whole-Life Insights — the honesty rules are the feature, so they are
 * what is pinned here: the minimum sample with its real count, the
 * weak-association cut-off, the associative-only language, the paired-
 * day discipline (an unlogged day is missing, never a zero), and the
 * weight trend's own bar.
 */

import { describe, expect, it } from "vitest";

import type { WeighIn } from "@/lib/health/body";
import type { HabitLog } from "@/lib/home/habits";
import { shiftDay } from "@/lib/localDay";
import type { MoodEntry } from "@/lib/mood/types";
import type { LogEntry } from "@/lib/nutrition/types";
import type { DayEntry } from "@/lib/trackers/core";

import {
  MIN_EFFECT,
  MIN_PAIRED_DAYS,
  WHOLE_LIFE_WINDOW_DAYS,
  buildDailySeries,
  buildWholeLifeInsights,
  type WholeLifeInput,
} from "./insights";

const TODAY = "2026-11-18";
/** Day keys inside the window: day(0) is today, day(55) the first day. */
const day = (back: number): string => shiftDay(TODAY, -back);

let seq = 0;
const mood = (date: string, value: number): MoodEntry => ({
  id: `m${(seq += 1)}`,
  timestamp: `${date}T09:00:00`,
  mood: value,
  energy: 5,
  stress: 5,
  emotions: [],
  tags: [],
});

const tracker = (date: string, partial: Partial<DayEntry>): DayEntry => ({
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
  ...partial,
});

const ticks = (date: string, n: number): HabitLog[] =>
  Array.from({ length: n }, (_, i) => ({
    habitId: `h${i}`,
    date,
    completedAt: `${date}T08:00:00`,
  }));

const food = (date: string, kcal: number): LogEntry => ({
  id: `f${(seq += 1)}`,
  day: date,
  meal: "lunch",
  foodId: "usda-1",
  snapshot: null,
  name: "Food",
  amount: { grams: 100 },
  nutrients: { kcal, proteinG: 10, carbsG: 20, fatG: 5 },
  provenance: { kind: "usda", sourceId: "1", label: "USDA FoodData Central" },
  source: "search",
  createdAt: "",
});

const input = (partial: Partial<WholeLifeInput>): WholeLifeInput => ({
  today: TODAY,
  moodEntries: [],
  trackerDays: [],
  habitLogs: [],
  foodEntries: [],
  weighIns: [],
  ...partial,
});

/**
 * Ten days where longer sleep clearly goes with higher mood: five
 * short nights (5.5h, mood 4–6) and five long nights (8.5h, mood 8–10).
 */
function sleepMoodRecord(daysBack: number[]): WholeLifeInput {
  const moodEntries: MoodEntry[] = [];
  const trackerDays: DayEntry[] = [];
  daysBack.forEach((back, i) => {
    const long = i % 2 === 0;
    moodEntries.push(mood(day(back), long ? 9 : 5));
    trackerDays.push(tracker(day(back), { sleepMinutes: long ? 510 : 330 }));
  });
  return input({ moodEntries, trackerDays });
}

describe("buildDailySeries", () => {
  it("averages a day's mood check-ins and converts sleep minutes to hours", () => {
    const series = buildDailySeries(
      input({
        moodEntries: [mood(day(1), 6), mood(day(1), 8)],
        trackerDays: [tracker(day(1), { sleepMinutes: 450, movementMinutes: 30 })],
      }),
    );
    const point = series.find((p) => p.date === day(1))!;
    expect(point.mood).toBe(7);
    expect(point.sleepHours).toBe(7.5);
    expect(point.movementMinutes).toBe(30);
  });

  it("treats an unlogged signal as missing, never zero — but counts habit ticks and food honestly", () => {
    const series = buildDailySeries(
      input({
        moodEntries: [mood(day(2), 7)],
        habitLogs: ticks(day(2), 2),
        foodEntries: [food(day(2), 500), food(day(2), 300)],
      }),
    );
    const point = series.find((p) => p.date === day(2))!;
    expect(point.sleepHours).toBeNull();
    expect(point.habitTicks).toBe(2);
    expect(point.foodLogged).toBe(true);
    expect(point.foodKcal).toBe(800);
  });

  it("excludes days outside the 56-day window and future days", () => {
    const series = buildDailySeries(
      input({
        moodEntries: [mood(day(55), 7), mood(day(56), 9), mood("2026-11-19", 9)],
      }),
    );
    expect(series.map((p) => p.date)).toEqual([day(55)]);
  });
});

describe("minimum sample — the count is shown, not dressed up", () => {
  it("reports a pair as pending with its real count below the minimum", () => {
    const result = buildWholeLifeInsights(sleepMoodRecord([1, 2, 3, 4, 5]));
    expect(result.insights).toEqual([]);
    const pending = result.pending.find((p) => p.kind === "sleep-mood")!;
    expect(pending.sampleDays).toBe(5);
    expect(pending.neededDays).toBe(MIN_PAIRED_DAYS);
    expect(pending.label).toBe("Sleep & mood");
  });

  it("speaks the pair once it reaches the minimum paired days", () => {
    const result = buildWholeLifeInsights(sleepMoodRecord([1, 2, 3, 4, 5, 6, 7, 8]));
    const insight = result.insights.find((i) => i.kind === "sleep-mood")!;
    expect(insight).toBeDefined();
    expect(insight.sampleDays).toBe(8);
    expect(insight.windowDays).toBe(WHOLE_LIFE_WINDOW_DAYS);
    expect(insight.headline).toBe("Mood tends to run higher after longer sleep");
    expect(insight.detail).toContain("8.5 hours");
    expect(insight.detail).toContain("5.5 hours");
    expect(Math.abs(insight.strength)).toBeGreaterThanOrEqual(MIN_EFFECT);
    expect(result.pending.find((p) => p.kind === "sleep-mood")).toBeUndefined();
  });

  it("only counts PAIRED days — sleep without mood does not inflate the sample", () => {
    const moodEntries: MoodEntry[] = [];
    const trackerDays: DayEntry[] = [];
    // 10 sleep days, but mood on only 4 of them.
    for (let back = 1; back <= 10; back += 1) {
      trackerDays.push(tracker(day(back), { sleepMinutes: back % 2 ? 510 : 330 }));
      if (back <= 4) moodEntries.push(mood(day(back), back % 2 ? 9 : 5));
    }
    const result = buildWholeLifeInsights(input({ moodEntries, trackerDays }));
    expect(result.insights.find((i) => i.kind === "sleep-mood")).toBeUndefined();
    expect(result.pending.find((p) => p.kind === "sleep-mood")!.sampleDays).toBe(4);
    // Coverage still reports each signal's own honest day count.
    expect(result.coverage.sleepDays).toBe(10);
    expect(result.coverage.moodDays).toBe(4);
  });
});

describe("strength — weak associations are not surfaced at all", () => {
  it("stays silent when sleep and mood barely move together", () => {
    const moodEntries: MoodEntry[] = [];
    const trackerDays: DayEntry[] = [];
    for (let back = 1; back <= 12; back += 1) {
      trackerDays.push(tracker(day(back), { sleepMinutes: back % 2 ? 510 : 330 }));
      moodEntries.push(mood(day(back), back % 3 === 0 ? 7 : 6)); // near-flat mood
    }
    const result = buildWholeLifeInsights(input({ moodEntries, trackerDays }));
    expect(result.insights.find((i) => i.kind === "sleep-mood")).toBeUndefined();
    // It had the sample — it is absent because it is weak, not pending.
    expect(result.pending.find((p) => p.kind === "sleep-mood")).toBeUndefined();
  });

  it("stays silent when the driver never varies", () => {
    const moodEntries: MoodEntry[] = [];
    const trackerDays: DayEntry[] = [];
    for (let back = 1; back <= 10; back += 1) {
      trackerDays.push(tracker(day(back), { sleepMinutes: 420 })); // same every night
      moodEntries.push(mood(day(back), back % 2 ? 9 : 4));
    }
    const result = buildWholeLifeInsights(input({ moodEntries, trackerDays }));
    expect(result.insights.find((i) => i.kind === "sleep-mood")).toBeUndefined();
  });

  it("reports the negative direction honestly", () => {
    const moodEntries: MoodEntry[] = [];
    const trackerDays: DayEntry[] = [];
    for (let back = 1; back <= 10; back += 1) {
      const moreScreen = back % 2 === 0;
      trackerDays.push(tracker(day(back), { screenMinutes: moreScreen ? 360 : 120 }));
      moodEntries.push(mood(day(back), moreScreen ? 4 : 8));
    }
    const result = buildWholeLifeInsights(input({ moodEntries, trackerDays }));
    const insight = result.insights.find((i) => i.kind === "screen-mood")!;
    expect(insight.headline).toBe("Mood tends to run lower on days with more screen time");
    expect(insight.strength).toBeLessThan(0);
  });

  it("ranks stronger associations first and caps the list", () => {
    // Sleep→mood is perfect; movement→energy is real but noisier.
    const moodEntries: MoodEntry[] = [];
    const trackerDays: DayEntry[] = [];
    for (let back = 1; back <= 12; back += 1) {
      const long = back % 2 === 0;
      moodEntries.push(mood(day(back), long ? 9 : 5));
      trackerDays.push(
        tracker(day(back), {
          sleepMinutes: long ? 510 : 330,
          movementMinutes: long ? 60 : 10,
          energy: long ? (back % 4 === 0 ? 3 : 5) : 2,
        }),
      );
    }
    const result = buildWholeLifeInsights(input({ moodEntries, trackerDays }));
    expect(result.insights.length).toBeGreaterThanOrEqual(2);
    const strengths = result.insights.map((i) => Math.abs(i.strength));
    expect([...strengths].sort((a, b) => b - a)).toEqual(strengths);
    expect(result.insights[0]!.kind).toBe("sleep-mood");
  });
});

describe("habit ticks & food logging pairs", () => {
  it("compares mood on high-tick vs low-tick days", () => {
    const moodEntries: MoodEntry[] = [];
    const habitLogs: HabitLog[] = [];
    for (let back = 1; back <= 10; back += 1) {
      const busy = back % 2 === 0;
      moodEntries.push(mood(day(back), busy ? 8 : 5));
      habitLogs.push(...ticks(day(back), busy ? 3 : 0));
    }
    const result = buildWholeLifeInsights(input({ moodEntries, habitLogs }));
    const insight = result.insights.find((i) => i.kind === "habits-mood")!;
    expect(insight.headline).toContain("tick more habits");
    expect(result.coverage.habitDays).toBe(5);
  });

  it("compares mood on food-logged vs unlogged days (binary driver)", () => {
    const moodEntries: MoodEntry[] = [];
    const foodEntries: LogEntry[] = [];
    for (let back = 1; back <= 12; back += 1) {
      const logged = back % 2 === 0;
      moodEntries.push(mood(day(back), logged ? 8 : 5));
      if (logged) foodEntries.push(food(day(back), 600));
    }
    const result = buildWholeLifeInsights(input({ moodEntries, foodEntries }));
    const insight = result.insights.find((i) => i.kind === "food-mood")!;
    expect(insight.headline).toBe("Mood tends to run higher on days you log your food");
    expect(insight.detail).toContain("6 days you logged food");
    expect(insight.sampleDays).toBe(12);
  });

  it("keeps the food pair pending when one side has too few days", () => {
    const moodEntries: MoodEntry[] = [];
    const foodEntries: LogEntry[] = [];
    for (let back = 1; back <= 10; back += 1) {
      moodEntries.push(mood(day(back), back <= 2 ? 9 : 5));
      if (back <= 2) foodEntries.push(food(day(back), 600)); // only 2 logged days
    }
    const result = buildWholeLifeInsights(input({ moodEntries, foodEntries }));
    expect(result.insights.find((i) => i.kind === "food-mood")).toBeUndefined();
  });
});

describe("weight trend — its own bar", () => {
  const weigh = (date: string, kg: number): WeighIn => ({ date, kg });

  it("describes a real drift with both half-window averages", () => {
    const weighIns: WeighIn[] = [
      weigh(day(40), 84),
      weigh(day(33), 83),
      weigh(day(26), 82),
      weigh(day(19), 81),
      weigh(day(12), 80),
      weigh(day(5), 79),
    ];
    const result = buildWholeLifeInsights(input({ weighIns }));
    const insight = result.insights.find((i) => i.kind === "weight-trend")!;
    expect(insight.headline).toContain("drifting down");
    expect(insight.sampleDays).toBe(6);
    expect(insight.detail).toContain("83 kg");
    expect(insight.detail).toContain("80 kg");
  });

  it("stays silent below half a kilo of shift — scale noise is not a trend", () => {
    const weighIns: WeighIn[] = [
      weigh(day(40), 82.2),
      weigh(day(33), 82.0),
      weigh(day(26), 82.1),
      weigh(day(19), 82.0),
      weigh(day(12), 81.9),
      weigh(day(5), 82.0),
    ];
    const result = buildWholeLifeInsights(input({ weighIns }));
    expect(result.insights.find((i) => i.kind === "weight-trend")).toBeUndefined();
  });

  it("stays silent when weigh-ins are too few or too close together", () => {
    const few = buildWholeLifeInsights(
      input({ weighIns: [weigh(day(9), 85), weigh(day(5), 83), weigh(day(1), 81)] }),
    );
    expect(few.insights.find((i) => i.kind === "weight-trend")).toBeUndefined();
    const clustered = buildWholeLifeInsights(
      input({
        weighIns: [weigh(day(6), 85), weigh(day(4), 84), weigh(day(2), 82), weigh(day(1), 81)],
      }),
    );
    expect(clustered.insights.find((i) => i.kind === "weight-trend")).toBeUndefined();
  });
});

describe("language — associative only, never causal", () => {
  const CAUSAL = ["cause", "because", "leads to", "lead to", "makes you", "boost", "improv", "due to"];

  it("no headline or detail uses causal wording", () => {
    const result = buildWholeLifeInsights(sleepMoodRecord([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
    expect(result.insights.length).toBeGreaterThan(0);
    for (const insight of result.insights) {
      const text = `${insight.headline} ${insight.detail}`.toLowerCase();
      for (const word of CAUSAL) expect(text).not.toContain(word);
    }
  });

  it("an empty record produces no insights and no pending counts", () => {
    const result = buildWholeLifeInsights(input({}));
    expect(result.insights).toEqual([]);
    expect(result.pending).toEqual([]);
    expect(result.coverage).toEqual({
      moodDays: 0,
      sleepDays: 0,
      habitDays: 0,
      foodDays: 0,
      weighInDays: 0,
    });
  });
});
