// @vitest-environment jsdom
/**
 * Living Assessment deltas — export and erasure, pinned by name.
 *
 * The delta record (`health.assessmentDelta.v1`) is a key in the one
 * prefs document, like the Assessment itself and its history, so it
 * inherits the document's coverage: the export bundles `loadDoc()`
 * wholesale and erasure deletes the whole document (device side
 * here; account side, `erase_my_data()` deletes the caller's
 * `user_prefs` row — the same wholesale delete the history's
 * coverage rests on). This suite pins the key BY NAME the way
 * bodyDataPrivacy.test.ts pins the body keys, so a future refactor
 * that quietly stops carrying it fails loudly.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({ hasSupabaseConfig: false, supabase: {} }));

import { buildExport } from "@/lib/data/exportAll";
import { eraseDevice } from "@/lib/data/erase";
import { PREFS_KEY, loadDoc } from "@/lib/prefs";
import {
  ASSESSMENT_DELTA_KEY,
  EMPTY_DELTA_VALUE,
  parseAssessmentDeltaValue,
  readAssessmentDeltaValue,
  recordAssessmentDelta,
  writeAssessmentDeltaValue,
  appendDelta,
} from "./living";

beforeEach(() => {
  window.localStorage.clear();
});

describe("assessment deltas · export", () => {
  it("the export bundle carries the delta key with its updates intact", () => {
    recordAssessmentDelta({ weightKg: 97.5 }, "2026-11-03T08:00:00.000Z");
    recordAssessmentDelta({ activity: "active" }, "2026-11-10T08:00:00.000Z");

    const bundle = buildExport({ exportedAt: "2026-11-17T00:00:00.000Z", prefs: loadDoc() });
    const prefs = bundle.prefs as Record<string, { value: unknown }>;
    expect(prefs[ASSESSMENT_DELTA_KEY]).toBeDefined();
    const value = parseAssessmentDeltaValue(prefs[ASSESSMENT_DELTA_KEY]!.value)!;
    expect(value.updates).toHaveLength(2);
    expect(value.updates[0]!.changes).toEqual({ weightKg: 97.5 });
    expect(value.updates[1]!.changes).toEqual({ activity: "active" });

    /* And in the JSON that is actually downloaded. */
    const file = JSON.parse(JSON.stringify(bundle)) as typeof bundle;
    const filePrefs = file.prefs as Record<string, { value: unknown }>;
    expect(parseAssessmentDeltaValue(filePrefs[ASSESSMENT_DELTA_KEY]!.value)!.updates).toHaveLength(2);
  });
});

describe("assessment deltas · erase", () => {
  it("eraseDevice leaves no delta record on this device", () => {
    writeAssessmentDeltaValue(
      appendDelta(EMPTY_DELTA_VALUE, { sleepQuality: "poor" }, "2026-11-03T08:00:00.000Z"),
    );
    expect(window.localStorage.getItem(PREFS_KEY)).toContain(ASSESSMENT_DELTA_KEY);
    expect(readAssessmentDeltaValue().updates).toHaveLength(1);

    eraseDevice();

    expect(window.localStorage.getItem(PREFS_KEY)).toBeNull();
    expect(loadDoc()).toEqual({});
    expect(readAssessmentDeltaValue()).toEqual(EMPTY_DELTA_VALUE);
  });

  it("a forbidden-only update writes nothing at all", () => {
    recordAssessmentDelta({ dietaryPattern: "vegan" } as never, "2026-11-03T08:00:00.000Z");
    expect(loadDoc()[ASSESSMENT_DELTA_KEY]).toBeUndefined();
    expect(readAssessmentDeltaValue()).toEqual(EMPTY_DELTA_VALUE);
  });
});
