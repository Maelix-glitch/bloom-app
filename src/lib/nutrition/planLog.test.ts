/**
 * The plan-log record (N-UI): the duplicate protection behind "Log
 * this meal" — a mapping honoured only while its entry is still in
 * the log, in the strict-envelope style of the coach-log record.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockDoc = new Map<string, unknown>();

vi.mock("@/lib/prefs", () => ({
  getPref: (key: string, parse: (raw: unknown) => unknown, fallback: unknown) => {
    if (!mockDoc.has(key)) return fallback;
    const parsed = parse(mockDoc.get(key));
    return parsed === null ? fallback : parsed;
  },
  setPref: (key: string, value: unknown) => {
    mockDoc.set(key, value);
  },
  clearPref: (key: string) => {
    mockDoc.delete(key);
  },
}));

import { createEntryFromFood } from "./entries";
import { deleteLogEntry, logEntry } from "./log";
import {
  parsePlanLogValue,
  planLoggedEntryId,
  recordPlanLog,
} from "./planLog";
import { saveCustomFood } from "./foods";

beforeEach(() => {
  mockDoc.clear();
});

describe("parsePlanLogValue", () => {
  it("keeps well-formed pairs and drops malformed ones", () => {
    expect(
      parsePlanLogValue({
        version: 1,
        logged: { "2026-11-15:breakfast:f1": "e1", "": "e2", k: 42 },
      }),
    ).toEqual({ "2026-11-15:breakfast:f1": "e1" });
    expect(parsePlanLogValue({ version: 2, logged: {} })).toBeNull();
    expect(parsePlanLogValue(null)).toBeNull();
    expect(parsePlanLogValue("nope")).toBeNull();
  });
});

describe("the record against the real log", () => {
  it("counts only while the entry it names is still logged, in that meal", () => {
    const food = saveCustomFood({
      name: "Record Oats",
      per100g: { kcal: 380, proteinG: 13, carbsG: 60, fatG: 7 },
    });
    if (!food) throw new Error("seed food refused");
    const entry = createEntryFromFood({
      food,
      amount: { grams: 50 },
      meal: "breakfast",
      day: "2026-11-15",
      source: "plan",
      now: "2026-11-15T08:00:00.000Z",
    });
    if (!entry) throw new Error("entry refused");
    logEntry(entry);
    recordPlanLog("2026-11-15", "breakfast", food.id, entry.id);

    expect(planLoggedEntryId("2026-11-15", "breakfast", food.id)).toBe(entry.id);
    expect(planLoggedEntryId("2026-11-15", "lunch", food.id)).toBeNull();
    expect(planLoggedEntryId("2026-11-16", "breakfast", food.id)).toBeNull();

    /* Delete the entry and the suggestion can be logged again. */
    deleteLogEntry(entry.id);
    expect(planLoggedEntryId("2026-11-15", "breakfast", food.id)).toBeNull();
  });
});
