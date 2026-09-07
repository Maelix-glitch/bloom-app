import { describe, expect, it } from "vitest";

import {
  applyDraft,
  habitToDraft,
  isDueOn,
  isPausedOn,
  streakOf,
  weekStartOf,
  weeklyProgress,
  type Habit,
  type HabitLog,
} from "@/lib/home/habits";

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
  archived: false,
  pausedFrom: null,
  pausedUntil: null,
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

/* 2026-09-07 is a Monday; the week runs Mon 7 – Sun 13. */
describe("weekly habits — 'N× a week' means N, not seven", () => {
  const gym = habit({ id: "gym", frequency: "weekly", timesPerWeek: 3 });

  it("knows which Monday a day belongs to", () => {
    expect(weekStartOf("2026-09-07")).toBe("2026-09-07"); // Monday
    expect(weekStartOf("2026-09-10")).toBe("2026-09-07"); // Thursday
    expect(weekStartOf("2026-09-13")).toBe("2026-09-07"); // Sunday belongs to the week before
    expect(weekStartOf("2026-09-14")).toBe("2026-09-14");
  });

  it("is due until the week has its N completions", () => {
    expect(isDueOn(gym, "2026-09-10", [])).toBe(true);
    const two = [log("2026-09-07", "gym"), log("2026-09-08", "gym")];
    expect(isDueOn(gym, "2026-09-10", two)).toBe(true);
    const three = [...two, log("2026-09-09", "gym")];
    // target met on Wednesday — Thursday to Sunday are free
    expect(isDueOn(gym, "2026-09-10", three)).toBe(false);
    expect(isDueOn(gym, "2026-09-13", three)).toBe(false);
    // …but the days it WAS done stay due, so they show as done rather than vanish
    expect(isDueOn(gym, "2026-09-09", three)).toBe(true);
    // and next Monday it starts again
    expect(isDueOn(gym, "2026-09-14", three)).toBe(true);
  });

  it("reports the week's progress as of a given day", () => {
    const logs = [log("2026-09-07", "gym"), log("2026-09-09", "gym"), log("2026-09-12", "gym")];
    expect(weeklyProgress(gym, logs, "2026-09-08")).toEqual({
      done: 1,
      target: 3,
      doneToday: false,
    });
    expect(weeklyProgress(gym, logs, "2026-09-09")).toEqual({
      done: 2,
      target: 3,
      doneToday: true,
    });
    expect(weeklyProgress(gym, logs, "2026-09-13").done).toBe(3);
    // last week's ticks don't leak in
    expect(weeklyProgress(gym, [log("2026-09-06", "gym")], "2026-09-07").done).toBe(0);
  });

  it("counts a streak in weeks that hit the target", () => {
    const week = (monday: string, n: number) =>
      Array.from({ length: n }, (_, i) => {
        const d = new Date(`${monday}T12:00:00`);
        d.setDate(d.getDate() + i);
        return log(d.toISOString().slice(0, 10), "gym");
      });
    // two full weeks before, and this week only started
    const logs = [...week("2026-08-24", 3), ...week("2026-08-31", 3), log("2026-09-07", "gym")];
    expect(streakOf(gym, logs, "2026-09-08")).toBe(2); // open week is a free pass
    // once this week hits three it counts too
    expect(streakOf(gym, [...logs, ...week("2026-09-08", 2)], "2026-09-09")).toBe(3);
    // a week that only managed two breaks it
    const broken = [...week("2026-08-24", 3), ...week("2026-08-31", 2), ...week("2026-09-07", 3)];
    expect(streakOf(gym, broken, "2026-09-10")).toBe(1);
  });

  it("treats a missing or silly target as once a week", () => {
    const loose = habit({ id: "w", frequency: "weekly", timesPerWeek: null });
    expect(isDueOn(loose, "2026-09-08", [log("2026-09-07", "w")])).toBe(false);
    expect(isDueOn(loose, "2026-09-08", [])).toBe(true);
  });
});

describe("pause and archive", () => {
  it("a paused habit is neither due nor counted against you", () => {
    const h = habit({ pausedFrom: "2026-09-05", pausedUntil: "2026-09-08" });
    expect(isPausedOn(h, "2026-09-04")).toBe(false);
    expect(isPausedOn(h, "2026-09-05")).toBe(true);
    expect(isPausedOn(h, "2026-09-08")).toBe(true);
    expect(isPausedOn(h, "2026-09-09")).toBe(false);
    expect(isDueOn(h, "2026-09-06")).toBe(false);
    // the run before the pause survives it
    const logs = [log("2026-09-04"), log("2026-09-03"), log("2026-09-09")];
    expect(streakOf(h, logs, "2026-09-09")).toBe(3);
    expect(streakOf(h, logs.slice(0, 2), "2026-09-09")).toBe(2); // today still open
  });

  it("a pause with only an end date starts on that date", () => {
    const h = habit({ pausedUntil: "2026-09-08" });
    expect(isPausedOn(h, "2026-09-07")).toBe(false);
    expect(isPausedOn(h, "2026-09-08")).toBe(true);
  });

  it("an archived habit is never due", () => {
    expect(isDueOn(habit({ archived: true }), "2026-09-07")).toBe(false);
    expect(
      isDueOn(habit({ archived: true, frequency: "weekly", timesPerWeek: 3 }), "2026-09-07"),
    ).toBe(false);
  });
});

describe("editing keeps identity and history", () => {
  it("round-trips a habit through the dialog's draft shape", () => {
    const h = habit({
      id: "keep-me",
      name: "Read",
      note: "20 pages",
      frequency: "custom",
      days: [1, 3, 5],
      goal: { target: 20, unit: "pages" },
      reminderTime: "21:30",
      tags: ["evening"],
      startDate: "2026-08-01",
      createdAt: "2026-08-01T10:00:00.000Z",
      pausedFrom: "2026-09-05",
      pausedUntil: "2026-09-08",
    });
    const draft = habitToDraft(h);
    expect(draft).toMatchObject({
      name: "Read",
      note: "20 pages",
      icon: { type: "emoji", value: "📖" },
      frequency: "custom",
      days: [1, 3, 5],
      goal: { enabled: true, target: 20, unit: "pages" },
      reminder: { enabled: true, time: "21:30" },
      tags: ["evening"],
      startDate: "2026-08-01",
    });
    const edited = applyDraft(h, { ...draft, name: "Read (novel)", days: [2, 4] });
    expect(edited.id).toBe("keep-me");
    expect(edited.createdAt).toBe("2026-08-01T10:00:00.000Z");
    expect(edited.name).toBe("Read (novel)");
    expect(edited.days).toEqual([2, 4]);
    expect(edited.pausedUntil).toBe("2026-09-08");
    expect(edited.startDate).toBe("2026-08-01");
  });

  it("switching frequency clears what no longer applies", () => {
    const h = habit({ id: "x", frequency: "custom", days: [1, 2] });
    const weekly = applyDraft(h, { ...habitToDraft(h), frequency: "weekly", timesPerWeek: 2 });
    expect(weekly.days).toEqual([]);
    expect(weekly.timesPerWeek).toBe(2);
    const daily = applyDraft(weekly, { ...habitToDraft(weekly), frequency: "daily" });
    expect(daily.timesPerWeek).toBeNull();
  });
});
