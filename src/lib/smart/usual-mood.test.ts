import { describe, expect, it } from "vitest";

import type { MoodEntry } from "@/lib/mood/types";
import { usualFaceOf, usualMood } from "./usual";

const TODAY = "2026-09-20";

function entry(daysAgo: number, hour: number, patch: Partial<MoodEntry>): MoodEntry {
  const d = new Date(`${TODAY}T12:00:00`);
  d.setDate(d.getDate() - daysAgo);
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00:00`;
  return {
    id: `e${daysAgo}-${hour}`,
    timestamp: iso,
    mood: 6,
    energy: 6,
    stress: 4,
    emotions: [],
    tags: [],
    ...patch,
  };
}

describe("usualMood", () => {
  it("returns null below five distinct days", () => {
    const entries = [entry(1, 9, {}), entry(2, 9, {}), entry(3, 9, {}), entry(4, 9, {})];
    expect(usualMood(entries, TODAY)).toBeNull();
  });

  it("uses the day's last entry and excludes the day being filled", () => {
    const entries: MoodEntry[] = [entry(0, 21, { mood: 9, energy: 9, stress: 9 })];
    for (let i = 1; i <= 7; i++) {
      entries.push(entry(i, 9, { mood: 5, energy: 5, stress: 5 }));
      entries.push(entry(i, 21, { mood: 7, energy: 7, stress: 3 }));
    }
    expect(usualMood(entries, TODAY)).toEqual({ mood: 7, energy: 7, stress: 3, samples: 7 });
  });

  it("caps at the fourteen most recent logged days", () => {
    const entries: MoodEntry[] = [];
    for (let i = 1; i <= 20; i++) entries.push(entry(i, 9, { mood: 7, energy: 7, stress: 3 }));
    const usual = usualMood(entries, TODAY);
    expect(usual).toEqual({ mood: 7, energy: 7, stress: 3, samples: 14 });
    // and the oldest six fall outside the window
    entries.push(entry(40, 9, { mood: 1, energy: 1, stress: 10 }));
    expect(usualMood(entries, TODAY)).toEqual({ mood: 7, energy: 7, stress: 3, samples: 14 });
  });

  it("says nothing for a brand-new record", () => {
    expect(usualMood([], TODAY)).toBeNull();
  });
});

describe("usualFaceOf", () => {
  it("maps a usual onto the nearest face", () => {
    expect(usualFaceOf({ mood: 6, energy: 5, stress: 4, samples: 9 })).toBe("neutral");
    expect(usualFaceOf({ mood: 8, energy: 7, stress: 3, samples: 9 })).toBe("happy");
    expect(usualFaceOf({ mood: 4.5, energy: 6, stress: 8, samples: 6 })).toBe("anxious");
  });

  it("refuses when no preset is close, or when nothing is offered", () => {
    expect(usualFaceOf({ mood: 10, energy: 1, stress: 1, samples: 9 })).toBeNull();
    expect(usualFaceOf(null)).toBeNull();
    expect(usualFaceOf(undefined)).toBeNull();
  });
});
