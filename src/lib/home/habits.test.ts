import { describe, expect, it } from "vitest";

import { isDueOn, streakOf, type Habit, type HabitLog } from "@/lib/home/habits";

const habit = (over: Partial<Habit> = {}): Habit => ({
  id: "h1",
  name: "Read",
  icon: "📖",
  iconUrl: null,
  color: "sky",
  frequency: "daily",
  points: 10,
  reminderTime: null,
  priority: "medium",
  tags: [],
  goal: null,
  days: [],
  timesPerWeek: null,
  startDate: null,
  note: null,
  createdAt: null,
  ...over,
});

const log = (date: string, habitId = "h1"): HabitLog => ({
  habitId,
  date,
  completedAt: `${date}T08:00:00.000Z`,
});

describe("streakOf", () => {
  it("is 0 with no logs", () => {
    expect(streakOf(habit(), [], "2026-09-06")).toBe(0);
  });

  it("counts consecutive days back from today", () => {
    const logs = [log("2026-09-06"), log("2026-09-05"), log("2026-09-04")];
    expect(streakOf(habit(), logs, "2026-09-06")).toBe(3);
  });

  it("keeps yesterday's run while today is still open", () => {
    const logs = [log("2026-09-05"), log("2026-09-04")];
    expect(streakOf(habit(), logs, "2026-09-06")).toBe(2);
  });

  it("breaks on a missed day", () => {
    const logs = [log("2026-09-06"), log("2026-09-04"), log("2026-09-03")];
    expect(streakOf(habit(), logs, "2026-09-06")).toBe(1);
  });

  it("ignores other habits' logs", () => {
    const logs = [log("2026-09-06", "other"), log("2026-09-05", "other")];
    expect(streakOf(habit(), logs, "2026-09-06")).toBe(0);
  });

  it("skips days the habit isn't scheduled", () => {
    // 2026-09-06 is a Sunday. Mon/Wed/Fri habit done Fri 4th + Wed 2nd.
    const h = habit({ frequency: "custom", days: [1, 3, 5] });
    expect(isDueOn(h, "2026-09-06")).toBe(false);
    expect(isDueOn(h, "2026-09-04")).toBe(true);
    const logs = [log("2026-09-04"), log("2026-09-02")];
    expect(streakOf(h, logs, "2026-09-06")).toBe(2);
    // Missed Monday 31st Aug ends it there, Friday 28th doesn't count.
    expect(streakOf(h, [...logs, log("2026-08-28")], "2026-09-06")).toBe(2);
  });

  it("stops at the start date", () => {
    const h = habit({ startDate: "2026-09-05" });
    const logs = [log("2026-09-06"), log("2026-09-05"), log("2026-09-04")];
    expect(streakOf(h, logs, "2026-09-06")).toBe(2);
  });
});
