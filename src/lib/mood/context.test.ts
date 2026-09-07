import { describe, expect, it } from "vitest";

import {
  applyPrefill,
  contextFromJson,
  contextFromTrackerDay,
  contextOf,
  contextToJson,
  EMPTY_FIELDS,
  fillContext,
  prefilledKeys,
} from "@/lib/mood/context";
import type { DayEntry } from "@/lib/trackers/core";
import type { MoodEntry } from "@/lib/mood/types";

const day = (over: Partial<DayEntry> = {}): DayEntry => ({
  date: "2026-09-07",
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

const entry = (over: Partial<MoodEntry> = {}): MoodEntry => ({
  id: "m1",
  timestamp: "2026-09-07T09:00:00.000Z",
  mood: 7,
  energy: 6,
  stress: 3,
  emotions: ["calm"],
  tags: [],
  ...over,
});

describe("context ↔ jsonb column", () => {
  it("stores only the signals that are present, and reads them back", () => {
    const json = contextToJson(entry({ sleep: 7.5, exercise: 30, weather: "rain" }));
    expect(json).toEqual({ sleep: 7.5, exercise: 30, weather: "rain" });
    expect(contextFromJson(json)).toEqual({ sleep: 7.5, exercise: 30, weather: "rain" });
  });

  it("is null when there is nothing to keep", () => {
    expect(contextToJson(entry())).toBeNull();
    expect(contextToJson(entry({ note: "hi" }))).toBeNull();
  });

  it("ignores junk, out-of-range values and unknown weather", () => {
    expect(contextFromJson("nope")).toEqual({});
    expect(contextFromJson(["a"])).toEqual({});
    expect(
      contextFromJson({
        sleep: 30,
        steps: -5,
        productivity: 11,
        social: 4,
        weather: "sunny",
        extra: 1,
      }),
    ).toEqual({ social: 4 });
    expect(contextOf({ sleep: Number.NaN, workload: 5 })).toEqual({ workload: 5 });
  });
});

describe("from the day's trackers", () => {
  it("translates units: minutes → hours, 1–5 quality → /10, sessions summed", () => {
    const ctx = contextFromTrackerDay(
      day({
        sleepMinutes: 450,
        sleepQuality: 4,
        movementMinutes: 25,
        screenMinutes: 200,
        sessions: [
          { subject: "maths", minutes: 40, startAt: null },
          { subject: "bio", minutes: 35, startAt: "18:00" },
        ],
      }),
    );
    expect(ctx).toEqual({ sleep: 7.5, sleepQuality: 8, exercise: 25, study: 75, screenTime: 3.3 });
  });

  it("only offers what the day actually has", () => {
    expect(contextFromTrackerDay(null)).toEqual({});
    expect(contextFromTrackerDay(day())).toEqual({});
    expect(contextFromTrackerDay(day({ waterMl: 2000, energy: 4 }))).toEqual({});
    expect(prefilledKeys(contextFromTrackerDay(day({ sleepMinutes: 480 })))).toEqual(["sleep"]);
  });

  it("fills gaps in an entry without touching what the person typed", () => {
    const typed = entry({ sleep: 6 });
    const filled = fillContext(typed, { sleep: 8, exercise: 30 });
    expect(filled.sleep).toBe(6);
    expect(filled.exercise).toBe(30);
    expect(fillContext(typed, {})).toBe(typed); // same object when nothing to add
    expect(fillContext(typed, { sleep: 8 })).toBe(typed);
  });
});

describe("composer prefill follows the chosen day", () => {
  it("fills empty fields and swaps an untouched prefill when the date changes", () => {
    const first = applyPrefill(EMPTY_FIELDS, {}, { sleep: 7.5, exercise: 30 });
    expect(first.sleep).toBe("7.5");
    expect(first.exercise).toBe("30");
    expect(first.steps).toBe("");

    const typed = { ...first, exercise: "45" }; // the person corrected exercise
    const moved = applyPrefill(typed, { sleep: 7.5, exercise: 30 }, { sleep: 6 });
    expect(moved.sleep).toBe("6"); // untouched prefill followed the new day
    expect(moved.exercise).toBe("45"); // their own value stayed
  });

  it("clears a prefill the new day cannot back up", () => {
    const moved = applyPrefill({ ...EMPTY_FIELDS, sleep: "7.5" }, { sleep: 7.5 }, {});
    expect(moved.sleep).toBe("");
  });
});
