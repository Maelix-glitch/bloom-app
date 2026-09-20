import { describe, expect, it } from "vitest";

import type { DayEntry } from "@/lib/trackers/core";
import type { Habit, HabitLog } from "@/lib/home/habits";
import { noticedOf, openStreak, strongestTrackerTrend, weekendGap } from "./noticed";

const TODAY = "2026-09-20"; // a Sunday

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

function habit(patch: Partial<Habit> = {}): Habit {
  return {
    id: "h1",
    name: "Read 20 pages",
    icon: "book",
    iconUrl: null,
    color: "#a78bfa",
    frequency: "daily",
    points: 10,
    reminderTime: null,
    priority: "normal",
    tags: [],
    goal: null,
    days: [],
    timesPerWeek: null,
    startDate: "2026-08-01",
    note: null,
    createdAt: null,
    archived: false,
    pausedFrom: null,
    pausedUntil: null,
    ...patch,
  };
}

function run(h: Habit, from: number, to: number, today: string): HabitLog[] {
  const logs: HabitLog[] = [];
  for (let off = from; off <= to; off++) {
    const d = new Date(`${today}T12:00:00`);
    d.setDate(d.getDate() + off);
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    logs.push({ habitId: h.id, date, completedAt: `${date}T20:00:00` });
  }
  return logs;
}

describe("noticed · the run that is alive", () => {
  it("flags the longest open streak, first", () => {
    const read = habit({ id: "h1", name: "Read 20 pages" });
    const move = habit({ id: "h2", name: "Move 20 min" });
    const logs = [...run(read, -7, -1, TODAY), ...run(move, -3, -1, TODAY)];
    const items = noticedOf({ days: [], habits: [read, move], logs, today: TODAY });
    expect(items[0]!.id).toBe("noticed-streak");
    expect(items[0]!.title).toContain("Day 7");
    expect(items[0]!.title).toContain("Read 20 pages");
  });

  it("stays quiet when the streak was completed today", () => {
    const read = habit();
    const logs = run(read, -7, 0, TODAY);
    expect(openStreak([read], logs, TODAY)).toBeNull();
  });

  it("ignores runs shorter than three days", () => {
    const read = habit();
    const logs = run(read, -2, -1, TODAY);
    expect(openStreak([read], logs, TODAY)).toBeNull();
  });
});

describe("noticed · week-over-week drift", () => {
  it("sees sleep climbing and cites the evidence", () => {
    const days: DayEntry[] = [];
    for (let i = 1; i <= 6; i++) days.push(day(-i, { sleepMinutes: 470 }));
    for (let i = 7; i <= 13; i++) days.push(day(-i, { sleepMinutes: 400 }));
    const trend = strongestTrackerTrend(days, TODAY);
    expect(trend).not.toBeNull();
    expect(trend!.id).toBe("sleep");
    expect(trend!.up).toBe(true);
    const items = noticedOf({ days, habits: [], logs: [], today: TODAY });
    const t = items.find((x) => x.id === "noticed-trend");
    expect(t).toBeTruthy();
    expect(t!.title).toContain("trending up");
    expect(t!.sub).toContain("logged days");
  });

  it("hides when the sample is thin", () => {
    const days = [day(-1, { sleepMinutes: 600 }), day(-2, { sleepMinutes: 600 })];
    expect(strongestTrackerTrend(days, TODAY)).toBeNull();
  });

  it("never invents a trend under the floor", () => {
    const days: DayEntry[] = [];
    for (let i = 1; i <= 6; i++) days.push(day(-i, { sleepMinutes: 421 }));
    for (let i = 7; i <= 13; i++) days.push(day(-i, { sleepMinutes: 420 }));
    expect(strongestTrackerTrend(days, TODAY)).toBeNull();
  });
});

describe("noticed · the shape of the week", () => {
  it("names lighter weekends after three consistent weeks", () => {
    const days: DayEntry[] = [];
    for (let i = 0; i < 21; i++) {
      const d = new Date(`${TODAY}T12:00:00`);
      d.setDate(d.getDate() - i);
      const dow = d.getDay();
      const weekend = dow === 0 || dow === 6;
      days.push(day(-i, { waterMl: weekend ? 1200 : 2300 }));
    }
    const gap = weekendGap(days, TODAY);
    expect(gap).not.toBeNull();
    expect(gap!.id).toBe("water");
    expect(gap!.weekendsLower).toBe(true);
    const items = noticedOf({ days, habits: [], logs: [], today: TODAY });
    const w = items.find((x) => x.id === "noticed-weekshape");
    expect(w).toBeTruthy();
    expect(w!.title).toContain("Weekends");
    expect(w!.sub).toContain("weekend days");
  });

  it("needs both buckets well populated", () => {
    const days = [day(-1, { waterMl: 100 }), day(-2, { waterMl: 2400 })];
    expect(weekendGap(days, TODAY)).toBeNull();
  });
});

describe("noticed · guard rails", () => {
  it("caps the panel and never touches the cycle", () => {
    const read = habit();
    const days: DayEntry[] = [];
    for (let i = 1; i <= 6; i++) days.push(day(-i, { sleepMinutes: 470 }));
    for (let i = 7; i <= 13; i++) days.push(day(-i, { sleepMinutes: 400 }));
    const logs = run(read, -7, -1, TODAY);
    const items = noticedOf({ days, habits: [read], logs, today: TODAY, limit: 2 });
    expect(items.length).toBe(2);
    for (const item of items) {
      expect(/period|cycle|luteal|ovulat/i.test(item.title)).toBe(false);
    }
  });

  it("says nothing when there is nothing worth saying", () => {
    expect(noticedOf({ days: [], habits: [], logs: [], today: TODAY })).toEqual([]);
  });
});
