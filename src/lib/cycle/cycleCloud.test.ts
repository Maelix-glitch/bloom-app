import { describe, expect, it } from "vitest";

import { dayToRow, mergeDayLists, rowToDay } from "@/lib/cycle/cycleCloud";
import type { DayLog } from "@/lib/cycle/dayLogs";

const day = (over: Partial<DayLog> = {}): DayLog => ({
  date: "2026-08-30",
  flow: null,
  symptoms: [],
  mood: null,
  energy: null,
  pain: null,
  sleep: null,
  temperature: null,
  mucus: null,
  lh: null,
  notes: null,
  updatedAt: null,
  ...over,
});

describe("rowToDay", () => {
  it("reads the column names the legacy page wrote", () => {
    const result = rowToDay({
      date: "2026-08-30",
      flow: "medium",
      symptoms: ["cramps"],
      mood: "good",
      energy: 4,
      pain_level: 2,
      sleep_hours: 7.5,
      temperature: 36.6,
      cervical_mucus: "creamy",
      lh_test: "positive",
      notes: "long day",
      updated_at: "2026-08-30T18:00:00.000Z",
    });
    expect(result).toMatchObject({
      date: "2026-08-30",
      flow: "medium",
      symptoms: ["cramps"],
      energy: 4,
      pain: 2,
      sleep: 7.5,
      temperature: 36.6,
      mucus: "creamy",
      lh: "positive",
      notes: "long day",
      updatedAt: "2026-08-30T18:00:00.000Z",
    });
  });

  it("falls back to logged_at when the row has no updated_at", () => {
    const result = rowToDay({ date: "2026-08-30", logged_at: "2026-08-30T09:00:00.000Z" });
    expect(result?.updatedAt).toBe("2026-08-30T09:00:00.000Z");
  });

  it("drops rows and values it can't trust", () => {
    expect(rowToDay(null)).toBeNull();
    expect(rowToDay({ date: "not-a-date" })).toBeNull();
    expect(rowToDay({ date: "2026-08-30", energy: 99 })?.energy).toBeNull();
    expect(rowToDay({ date: "2026-08-30", mood: "whatever" })?.mood).toBeNull();
    expect(rowToDay({ date: "2026-08-30", temperature: 12 })?.temperature).toBeNull();
  });
});

describe("dayToRow", () => {
  it("writes the same columns the legacy page used", () => {
    const row = dayToRow(
      day({ flow: "light", pain: 3, sleep: 6.5, energy: 3, mood: "okay", notes: "tired" }),
      "profile-1",
      { cycleDay: 12, phase: "follicular" },
    );
    expect(row).toMatchObject({
      profile_id: "profile-1",
      date: "2026-08-30",
      cycle_day: 12,
      phase: "follicular",
      flow: "light",
      pain_level: 3,
      sleep_hours: 6.5,
      energy: 3,
      mood: "okay",
      notes: "tired",
    });
    expect(typeof row["logged_at"]).toBe("string");
    expect(typeof row["updated_at"]).toBe("string");
  });

  it("survives a round trip through the table", () => {
    const original = day({
      flow: "heavy",
      symptoms: ["cramps", "headache"],
      mood: "rough",
      energy: 2,
      pain: 4,
      sleep: 5.5,
      temperature: 36.9,
      mucus: "dry",
      lh: "negative",
      notes: null,
    });
    const back = rowToDay({ ...dayToRow(original, "profile-1"), updated_at: "2026-08-30T10:00:00.000Z" });
    expect(back).toMatchObject({
      date: original.date,
      flow: "heavy",
      symptoms: ["cramps", "headache"],
      mood: "rough",
      energy: 2,
      pain: 4,
      sleep: 5.5,
      temperature: 36.9,
      mucus: "dry",
      lh: "negative",
    });
  });
});

describe("mergeDayLists", () => {
  const local = day({ date: "2026-08-29", notes: "on this device", updatedAt: "2026-08-29T20:00:00.000Z" });
  const sharedLocal = day({ date: "2026-08-30", notes: "edited here", updatedAt: "2026-08-30T20:00:00.000Z" });
  const sharedRemote = day({ date: "2026-08-30", notes: "from the table", updatedAt: "2026-08-30T10:00:00.000Z" });
  const remoteOnly = day({ date: "2026-08-31", notes: "only in the table", updatedAt: "2026-08-31T10:00:00.000Z" });

  it("keeps days that exist on only one side, in date order", () => {
    const { days } = mergeDayLists([local], [remoteOnly]);
    expect(days.map((d) => d.date)).toEqual(["2026-08-29", "2026-08-31"]);
    expect(days[0]?.notes).toBe("on this device");
    expect(days[1]?.notes).toBe("only in the table");
  });

  it("lets the newer copy win on a shared date", () => {
    const newerOnDevice = mergeDayLists([sharedLocal], [sharedRemote]);
    expect(newerOnDevice.days[0]?.notes).toBe("edited here");
    expect(newerOnDevice.newerLocal).toEqual(["2026-08-30"]);

    const newerInTable = mergeDayLists(
      [{ ...sharedLocal, updatedAt: "2026-08-30T09:00:00.000Z" }],
      [sharedRemote],
    );
    expect(newerInTable.days[0]?.notes).toBe("from the table");
    expect(newerInTable.newerLocal).toEqual([]);
  });

  it("treats a missing timestamp as older than one", () => {
    const { days, newerLocal } = mergeDayLists([{ ...sharedLocal, updatedAt: null }], [sharedRemote]);
    expect(days[0]?.notes).toBe("from the table");
    expect(newerLocal).toEqual([]);
  });
});
