// @vitest-environment jsdom
/**
 * Lab reports privacy coverage: the `health.labs.v1` key rides the
 * shared preferences document, so it must be pinned BY NAME in the
 * export bundle and removed by the device erase — the same pinning
 * the assessment history carries.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { buildExport } from "@/lib/data/exportAll";
import { eraseDevice } from "@/lib/data/erase";
import { PREFS_KEY, loadDoc } from "@/lib/prefs";
import {
  LABS_KEY,
  addLabResult,
  parseLabsValue,
  readLabResults,
  type LabResult,
} from "./labs";

const SAMPLE: LabResult = {
  id: "lab-1",
  testName: "HbA1c",
  value: 5.6,
  unit: "%",
  reportDate: "2026-11-01",
  refLow: 4,
  refHigh: 6,
  recordedAt: "2026-11-02T09:00:00.000Z",
};

beforeEach(() => {
  window.localStorage.clear();
});

describe("health.labs.v1 — export and erasure coverage", () => {
  it("the labs key rides in the export bundle's prefs, verbatim", () => {
    expect(addLabResult(SAMPLE)).toBe(true);
    const bundle = buildExport({ exportedAt: "2026-11-02T10:00:00.000Z", prefs: loadDoc() });
    const prefs = bundle.prefs as Record<string, { value: unknown }>;
    expect(prefs[LABS_KEY]).toBeDefined();
    const value = parseLabsValue(prefs[LABS_KEY]!.value)!;
    expect(value.results).toHaveLength(1);
    expect(value.results[0]!.testName).toBe("HbA1c");
    expect(value.results[0]!.refHigh).toBe(6);
  });

  it("the device erase removes the document that holds the results", () => {
    expect(addLabResult(SAMPLE)).toBe(true);
    expect(window.localStorage.getItem(PREFS_KEY)).toContain(LABS_KEY);
    eraseDevice();
    expect(window.localStorage.getItem(PREFS_KEY)).toBeNull();
    expect(readLabResults()).toEqual([]);
  });

  it("an invalid result is never written", () => {
    expect(addLabResult({ ...SAMPLE, value: Number.NaN })).toBe(false);
    expect(loadDoc()[LABS_KEY]).toBeUndefined();
  });

  it("a duplicate id is refused — the record is append-once per result", () => {
    expect(addLabResult(SAMPLE)).toBe(true);
    expect(addLabResult(SAMPLE)).toBe(false);
    expect(readLabResults()).toHaveLength(1);
  });
});
