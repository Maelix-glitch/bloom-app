import { describe, expect, it } from "vitest";

import { dayToRow, mergeDayLists, rowToDay } from "@/lib/trackers/trackerCloud";
import { emptyDay, type DayEntry } from "@/lib/trackers/core";

const day = (over: Partial<DayEntry> = {}): DayEntry => ({
  ...emptyDay("2026-08-30"),
  sleepMinutes: 450,
  bedTime: "23:15",
  wakeTime: "07:00",
  sleepQuality: 4,
  waterMl: 1800,
  sessions: [{ subject: "Maths", minutes: 50, startAt: "09:00" }],
  movementMinutes: 25,
  energy: 4,
  screenMinutes: 200,
  notes: "long day",
  updatedAt: "2026-08-30T20:00:00.000Z",
  ...over,
});

describe("rowToDay", () => {
  it("reads the column names the table uses", () => {
    const result = rowToDay({
      date: "2026-08-30",
      sleep_minutes: 460,
      bed_time: "23:00",
      wake_time: "07:10",
      sleep_quality: 3,
      water_ml: 2100,
      sessions: [{ subject: "Reading", minutes: 40, startAt: "21:00" }],
      movement_minutes: 30,
      energy: 5,
      screen_minutes: 90,
      notes: "good one",
      updated_at: "2026-08-30T21:00:00.000Z",
    });
    expect(result).toMatchObject({
      date: "2026-08-30",
      sleepMinutes: 460,
      bedTime: "23:00",
      wakeTime: "07:10",
      sleepQuality: 3,
      waterMl: 2100,
      movementMinutes: 30,
      energy: 5,
      screenMinutes: 90,
      notes: "good one",
      updatedAt: "2026-08-30T21:00:00.000Z",
    });
    expect(result?.sessions).toEqual([{ subject: "Reading", minutes: 40, startAt: "21:00" }]);
  });

  it("drops rows and values it can't trust", () => {
    expect(rowToDay(null)).toBeNull();
    expect(rowToDay({ date: "nonsense" })).toBeNull();
    expect(rowToDay({ date: "2026-08-30", energy: 9 })?.energy).toBeNull();
    expect(rowToDay({ date: "2026-08-30", water_ml: 99999 })?.waterMl).toBeNull();
    expect(rowToDay({ date: "2026-08-30", sessions: [{ subject: "", minutes: 30 }] })?.sessions).toEqual([]);
    expect(rowToDay({ date: "2026-08-30", bed_time: "late" })?.bedTime).toBeNull();
  });
});

describe("dayToRow", () => {
  it("writes the table's columns and keeps the write time", () => {
    const row = dayToRow(day(), "profile-1");
    expect(row).toMatchObject({
      profile_id: "profile-1",
      date: "2026-08-30",
      sleep_minutes: 450,
      bed_time: "23:15",
      wake_time: "07:00",
      sleep_quality: 4,
      water_ml: 1800,
      movement_minutes: 25,
      energy: 4,
      screen_minutes: 200,
      notes: "long day",
      updated_at: "2026-08-30T20:00:00.000Z",
    });
    expect(row["sessions"]).toEqual([{ subject: "Maths", minutes: 50, startAt: "09:00" }]);
  });

  it("survives a round trip", () => {
    const original = day();
    const back = rowToDay({ ...dayToRow(original, "profile-1") });
    expect(back).toMatchObject({
      date: original.date,
      sleepMinutes: original.sleepMinutes,
      waterMl: original.waterMl,
      movementMinutes: original.movementMinutes,
      energy: original.energy,
      screenMinutes: original.screenMinutes,
      notes: original.notes,
      sessions: original.sessions,
    });
  });
});

describe("mergeDayLists", () => {
  const local = day({ date: "2026-08-29", waterMl: 1000, updatedAt: "2026-08-29T20:00:00.000Z" });
  const remoteOnly = day({ date: "2026-08-31", waterMl: 2200, updatedAt: "2026-08-31T10:00:00.000Z" });
  const sharedLocal = day({ date: "2026-08-30", waterMl: 2500, updatedAt: "2026-08-30T20:00:00.000Z" });
  const sharedRemote = day({ date: "2026-08-30", waterMl: 1200, updatedAt: "2026-08-30T10:00:00.000Z" });

  it("keeps days that exist on only one side, in date order", () => {
    const { days } = mergeDayLists([local], [remoteOnly]);
    expect(days.map((d) => d.date)).toEqual(["2026-08-29", "2026-08-31"]);
  });

  it("lets the newer copy win on a shared date", () => {
    const newerOnDevice = mergeDayLists([sharedLocal], [sharedRemote]);
    expect(newerOnDevice.days[0]?.waterMl).toBe(2500);
    expect(newerOnDevice.newerLocal).toEqual(["2026-08-30"]);

    const newerInTable = mergeDayLists(
      [{ ...sharedLocal, updatedAt: "2026-08-30T09:00:00.000Z" }],
      [sharedRemote],
    );
    expect(newerInTable.days[0]?.waterMl).toBe(1200);
    expect(newerInTable.newerLocal).toEqual([]);
  });

  it("treats a missing timestamp as older than one", () => {
    const { days } = mergeDayLists([{ ...sharedLocal, updatedAt: null }], [sharedRemote]);
    expect(days[0]?.waterMl).toBe(1200);
  });
});
