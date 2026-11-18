// @vitest-environment jsdom
/**
 * Export and erasure coverage for `health.household.v1` — inherited
 * from the shared preferences document, pinned by name the way the
 * assessment-history suite pins its key: the household rides in the
 * export bundle's prefs verbatim, and the device erase removes the
 * document that holds it.
 */
import { beforeEach, describe, expect, it } from "vitest";

import { buildExport } from "@/lib/data/exportAll";
import { eraseDevice } from "@/lib/data/erase";
import { PREFS_KEY, loadDoc } from "@/lib/prefs";
import {
  HOUSEHOLD_KEY,
  parseHouseholdValue,
  readHouseholdValue,
  writeHouseholdValue,
  type HouseholdValue,
} from "./household";

const VALUE: HouseholdValue = {
  version: 1,
  members: [
    { id: "m-1", name: "Amma", pattern: "vegetarian", allergies: ["Peanut"], dislikes: [] },
  ],
};

describe("health.household.v1 — export and erasure coverage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("the household key rides in the export bundle's prefs, verbatim", () => {
    writeHouseholdValue(VALUE);
    const bundle = buildExport({ exportedAt: "2026-11-18T00:00:00.000Z", prefs: loadDoc() });
    const prefs = bundle.prefs as Record<string, { value: unknown }>;
    expect(prefs[HOUSEHOLD_KEY]).toBeDefined();
    const value = parseHouseholdValue(prefs[HOUSEHOLD_KEY]!.value)!;
    expect(value.members).toHaveLength(1);
    expect(value.members[0]?.name).toBe("Amma");
  });

  it("the device erase removes the document that holds the household", () => {
    writeHouseholdValue(VALUE);
    expect(window.localStorage.getItem(PREFS_KEY)).toContain(HOUSEHOLD_KEY);
    eraseDevice();
    expect(window.localStorage.getItem(PREFS_KEY)).toBeNull();
    expect(readHouseholdValue().members).toEqual([]);
  });
});
