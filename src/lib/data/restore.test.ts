import { describe, expect, it } from "vitest";

import { buildExport } from "./exportAll";
import { applyRestore, parseBundle } from "./restore";

/** A Storage that is Storage-shaped without needing a DOM. */
function memStorage(seed: Record<string, unknown> = {}): Storage {
  const map = new Map<string, string>(Object.entries(seed).map(([k, v]) => [k, JSON.stringify(v)]));
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k: string) => map.get(k) ?? null,
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (k: string) => void map.delete(k),
    setItem: (k: string, v: string) => void map.set(k, v),
  };
}

const habit = (id: string, name: string) => ({
  id,
  name,
  icon: "droplet",
  iconUrl: null,
  color: "#7FA88F",
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
});

const bundle = () =>
  buildExport({
    habits: [habit("h1", "Water")],
    habitLogs: [{ habitId: "h1", date: "2026-09-18", completedAt: "2026-09-18T12:00:00Z" }],
    trackerDays: [
      {
        date: "2026-09-18",
        sleepMinutes: 480,
        bedTime: null,
        wakeTime: null,
        sleepQuality: 3,
        waterMl: 2000,
        sessions: [],
        movementMinutes: 30,
        energy: 3,
        screenMinutes: 120,
        notes: null,
        updatedAt: "2026-09-18T20:00:00Z",
      },
    ],
    trackerGoals: null,
    activeTrackers: [],
    moodEntries: [
      {
        id: "m1",
        timestamp: "2026-09-18T12:00:00Z",
        mood: 7,
        energy: 6,
        stress: 3,
        emotions: ["calm"],
        tags: [],
      },
    ],
    periods: [{ id: "p1", start: "2026-09-01" }],
    cycleDays: [{ date: "2026-09-02", flow: "medium" }],
    cycleSettings: null,
    checkIns: null,
    prefs: {
      "onboarding.v1": {
        value: { done: true, kind: "no-cycle" },
        updatedAt: "2026-01-01T00:00:00Z",
      },
    },
  });

describe("parseBundle", () => {
  it("rejects non-JSON and foreign shapes", () => {
    expect(parseBundle("nope{").ok).toBe(false);
    expect(parseBundle(JSON.stringify({ hello: 1 })).ok).toBe(false);
    expect(parseBundle(JSON.stringify({ format: "alien.v9" })).ok).toBe(false);
  });

  it("accepts a real export", () => {
    const parsed = parseBundle(JSON.stringify(bundle()));
    expect(parsed.ok).toBe(true);
  });
});

describe("applyRestore", () => {
  it("writes the whole record onto an empty device", () => {
    const storage = memStorage();
    const parsed = parseBundle(JSON.stringify(bundle()));
    if (!parsed.ok) throw new Error("parse failed");
    const report = applyRestore(storage, parsed.bundle, "merge");

    expect(JSON.parse(storage.getItem("bloom.habits")!)).toHaveLength(1);
    expect(JSON.parse(storage.getItem("bloom.habit_logs")!)).toHaveLength(1);
    expect(JSON.parse(storage.getItem("bloom.trackers.days.v1")!)).toHaveLength(1);
    expect(JSON.parse(storage.getItem("bloom.mood.pending.v1")!).entries).toHaveLength(1);
    expect(JSON.parse(storage.getItem("bloom.cycle.periods.v1")!)).toHaveLength(1);
    expect(JSON.parse(storage.getItem("bloom.prefs.v1")!)["onboarding.v1"]).toBeTruthy();
    expect(report.sections.some((s) => s.label === "Habits" && s.restored === 1)).toBe(true);
  });

  it("merge keeps this device's rows and adds new ones", () => {
    const storage = memStorage({
      "bloom.habits": [habit("keep", "Journal")],
      "bloom.habit_logs": [{ habitId: "keep", date: "2026-09-18", completedAt: "x" }],
    });
    const parsed = parseBundle(JSON.stringify(bundle()));
    if (!parsed.ok) throw new Error("parse failed");
    applyRestore(storage, parsed.bundle, "merge");

    const habits = JSON.parse(storage.getItem("bloom.habits")!);
    expect(habits).toHaveLength(2);
    expect(habits.map((h: { name: string }) => h.name).sort()).toEqual(["Journal", "Water"]);
    const logs = JSON.parse(storage.getItem("bloom.habit_logs")!);
    expect(logs).toHaveLength(2); // same date, different habit → both live
  });

  it("replace makes the device the backup", () => {
    const storage = memStorage({ "bloom.habits": [habit("keep", "Journal")] });
    const parsed = parseBundle(JSON.stringify(bundle()));
    if (!parsed.ok) throw new Error("parse failed");
    applyRestore(storage, parsed.bundle, "replace");

    const habits = JSON.parse(storage.getItem("bloom.habits")!);
    expect(habits).toHaveLength(1);
    expect(habits[0].id).toBe("h1");
  });

  it("tracker days reconcile on updatedAt like sync does", () => {
    const newer = {
      date: "2026-09-18",
      sleepMinutes: 600,
      bedTime: null,
      wakeTime: null,
      sleepQuality: 5,
      waterMl: 2500,
      sessions: [],
      movementMinutes: 60,
      energy: 5,
      screenMinutes: 60,
      notes: null,
      updatedAt: "2026-09-19T09:00:00Z",
    };
    const storage = memStorage({ "bloom.trackers.days.v1": [newer] });
    const parsed = parseBundle(JSON.stringify(bundle()));
    if (!parsed.ok) throw new Error("parse failed");
    applyRestore(storage, parsed.bundle, "merge");

    const days = JSON.parse(storage.getItem("bloom.trackers.days.v1")!);
    expect(days).toHaveLength(1);
    expect(days[0].sleepMinutes).toBe(600); // device copy was newer → kept
  });
});
