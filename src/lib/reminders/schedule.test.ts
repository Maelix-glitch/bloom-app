import { describe, expect, it } from "vitest";

import {
  DEFAULT_REMINDERS,
  dueReminders,
  parseReminderSettings,
  pendingReminders,
  saveDelivered,
  loadDelivered,
  type ReminderInput,
  type ReminderSettings,
} from "@/lib/reminders/schedule";
import type { Habit } from "@/lib/home/habits";

const habit = (over: Partial<Habit> = {}): Habit => ({
  id: "h1",
  name: "Water",
  icon: "droplet",
  iconUrl: null,
  color: "sky",
  frequency: "daily",
  points: 5,
  reminderTime: "09:00",
  priority: "normal",
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

const on: ReminderSettings = { ...DEFAULT_REMINDERS, enabled: true };

const input = (over: Partial<ReminderInput> = {}): ReminderInput => ({
  today: "2026-09-07",
  now: "09:05",
  settings: on,
  habits: [{ habit: habit(), done: false }],
  cycle: { mode: "tracking", nextStart: null, daysLate: null, fertileStart: null },
  loggedSomethingToday: false,
  ...over,
});

describe("reminders · settings", () => {
  it("defaults to off — nothing fires until someone says yes", () => {
    expect(DEFAULT_REMINDERS.enabled).toBe(false);
    expect(dueReminders(input({ settings: DEFAULT_REMINDERS }))).toEqual([]);
  });

  it("repairs anything odd on disk", () => {
    expect(parseReminderSettings({ enabled: true, eveningTime: "25:00" })).toMatchObject({
      enabled: true,
      eveningTime: DEFAULT_REMINDERS.eveningTime,
    });
    expect(parseReminderSettings("nope")).toBeNull();
  });
});

describe("reminders · habits", () => {
  it("reminds about a habit at its time", () => {
    const [r] = dueReminders(input());
    expect(r).toMatchObject({ kind: "habit", title: "Water", key: "habit:h1:2026-09-07" });
  });

  it("says nothing about a habit already ticked", () => {
    expect(dueReminders(input({ habits: [{ habit: habit(), done: true }] }))).toEqual([]);
  });

  it("does not fire before its time, or long after", () => {
    expect(dueReminders(input({ now: "08:59" }))).toEqual([]);
    expect(dueReminders(input({ now: "23:00" })).filter((r) => r.kind === "habit")).toEqual([]);
  });
});

describe("reminders · cycle", () => {
  const cycleOnly = { habits: [], settings: { ...on, evening: false } };

  it("warns two days before a predicted start", () => {
    const out = dueReminders(
      input({
        ...cycleOnly,
        cycle: { mode: "tracking", nextStart: "2026-09-09", daysLate: null, fertileStart: null },
      }),
    );
    expect(out[0]).toMatchObject({ kind: "period" });
    expect(out[0]!.title).toMatch(/two days/);
  });

  it("prefers the late message over the upcoming one", () => {
    const out = dueReminders(
      input({
        ...cycleOnly,
        cycle: { mode: "tracking", nextStart: "2026-09-09", daysLate: 3, fertileStart: null },
      }),
    );
    expect(out).toHaveLength(1);
    expect(out[0]!.title).toMatch(/3 days later/);
  });

  it("stays silent when the cycle is paused or off", () => {
    for (const mode of ["paused", "off"] as const) {
      expect(
        dueReminders(
          input({
            ...cycleOnly,
            cycle: { mode, nextStart: "2026-09-09", daysLate: 4, fertileStart: "2026-09-07" },
          }),
        ),
      ).toEqual([]);
    }
  });

  it("mentions the fertile window on the day it opens", () => {
    const out = dueReminders(
      input({
        ...cycleOnly,
        cycle: { mode: "tracking", nextStart: null, daysLate: null, fertileStart: "2026-09-07" },
      }),
    );
    expect(out[0]!.kind).toBe("fertile");
  });
});

describe("reminders · the evening nudge", () => {
  it("fires only when the day is still empty", () => {
    const base = input({ habits: [], now: "20:35" });
    expect(dueReminders(base)[0]).toMatchObject({ kind: "evening" });
    expect(dueReminders({ ...base, loggedSomethingToday: true })).toEqual([]);
  });
});

describe("reminders · delivery memory", () => {
  it("never shows the same reason twice in a day", () => {
    const i = input();
    const first = pendingReminders(i, []);
    expect(first).toHaveLength(1);
    expect(pendingReminders(i, [first[0]!.key])).toEqual([]);
  });

  it("forgets yesterday's keys when it writes", () => {
    const store = new Map<string, string>();
    const storage = {
      get length() {
        return store.size;
      },
      key: (i: number) => [...store.keys()][i] ?? null,
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    } as Storage;

    saveDelivered(["habit:h1:2026-09-06", "habit:h1:2026-09-07"], "2026-09-07", storage);
    expect(loadDelivered(storage)).toEqual(["habit:h1:2026-09-07"]);
  });
});
