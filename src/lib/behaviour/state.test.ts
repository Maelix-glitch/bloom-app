// @vitest-environment jsdom
/**
 * Behaviour Change (System 8) — the nudge memory, pinned.
 *
 * The strict parser (a forged or corrupt value reads as the empty
 * state, never as someone else's quiet rules), the three transitions
 * (dismiss rests a kind for three days, snooze hides one nudge for
 * today, recordShown is write-once per day), and the storage
 * round-trip through the real prefs document — including the export
 * bundle carrying the key verbatim and the device erase removing it,
 * the same inheritance the target adjustment pins.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { buildExport } from "@/lib/data/exportAll";
import { eraseDevice } from "@/lib/data/erase";
import { loadDoc } from "@/lib/prefs";
import {
  DISMISS_REST_DAYS,
  EMPTY_NUDGE_STATE,
  NUDGES_KEY,
  clearNudgeState,
  dismissNudge,
  isKindResting,
  parseNudgeState,
  readNudgeState,
  recordShown,
  snoozeNudge,
  writeNudgeState,
  type NudgeState,
} from "./state";

const TODAY = "2026-11-18";

const state = (over: Partial<NudgeState> = {}): NudgeState => ({
  version: 1,
  dismissed: {},
  snoozed: {},
  lastShown: {},
  ...over,
});

describe("parseNudgeState", () => {
  it("accepts a well-formed value", () => {
    const value = state({
      dismissed: { habit: "2026-11-17" },
      snoozed: { "meal:breakfast": TODAY },
      lastShown: { "habit:h1": "2026-11-17" },
    });
    expect(parseNudgeState(value)).toEqual(value);
  });

  it("rejects wrong versions and non-objects", () => {
    expect(parseNudgeState({ ...state(), version: 2 })).toBeNull();
    expect(parseNudgeState(null)).toBeNull();
    expect(parseNudgeState("nope")).toBeNull();
    expect(parseNudgeState([])).toBeNull();
  });

  it("drops malformed day values and unknown dismissed kinds", () => {
    const parsed = parseNudgeState({
      version: 1,
      dismissed: { habit: "yesterday", bogus: TODAY, meal: TODAY },
      snoozed: { "meal:breakfast": "18/11/2026" },
      lastShown: { "habit:h1": TODAY },
    });
    expect(parsed?.dismissed).toEqual({ meal: TODAY });
    expect(parsed?.snoozed).toEqual({});
    expect(parsed?.lastShown).toEqual({ "habit:h1": TODAY });
  });
});

describe("transitions", () => {
  it("dismiss rests the kind for exactly DISMISS_REST_DAYS days", () => {
    const next = dismissNudge(state(), "habit", TODAY);
    expect(next.dismissed).toEqual({ habit: TODAY });
    expect(DISMISS_REST_DAYS).toBe(3);
    expect(isKindResting(next.dismissed.habit, TODAY)).toBe(true);
    expect(isKindResting(next.dismissed.habit, "2026-11-20")).toBe(true);
    expect(isKindResting(next.dismissed.habit, "2026-11-21")).toBe(false);
    expect(isKindResting(undefined, TODAY)).toBe(false);
  });

  it("snooze hides one nudge for today; yesterday's snooze is spent", () => {
    const next = snoozeNudge(state(), "habit:h1", TODAY);
    expect(next.snoozed).toEqual({ "habit:h1": TODAY });
    const carried = snoozeNudge(state({ snoozed: { "habit:h1": "2026-11-17" } }), "meal:breakfast", TODAY);
    expect(carried.snoozed).toEqual({ "meal:breakfast": TODAY });
  });

  it("recordShown writes once per day and returns the same object when unchanged", () => {
    const once = recordShown(state(), ["habit:h1", "meal:breakfast"], TODAY);
    expect(once.lastShown).toEqual({ "habit:h1": TODAY, "meal:breakfast": TODAY });
    expect(recordShown(once, ["habit:h1"], TODAY)).toBe(once);
    const tomorrow = recordShown(once, ["habit:h1"], "2026-11-19");
    expect(tomorrow.lastShown["habit:h1"]).toBe("2026-11-19");
  });

  it("a spent dismissal is pruned on the next write", () => {
    const next = recordShown(state({ dismissed: { habit: "2026-11-10" } }), ["mood:check-in"], TODAY);
    expect(next.dismissed).toEqual({});
  });
});

describe("storage round-trip, export and erasure", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("write → read round-trips; clear removes", () => {
    expect(readNudgeState()).toEqual(EMPTY_NUDGE_STATE);
    const value = dismissNudge(state(), "meal", TODAY);
    expect(writeNudgeState(value)).toBe(true);
    expect(readNudgeState()).toEqual(value);
    clearNudgeState();
    expect(readNudgeState()).toEqual(EMPTY_NUDGE_STATE);
  });

  it("rides in the export bundle's prefs, verbatim", () => {
    const value = snoozeNudge(state(), "habit:h1", TODAY);
    writeNudgeState(value);
    const bundle = buildExport({ exportedAt: "2026-11-18T06:00:00.000Z", prefs: loadDoc() });
    const prefs = bundle.prefs as Record<string, { value: unknown }>;
    expect(prefs[NUDGES_KEY]?.value).toEqual(value);
  });

  it("the device erase removes the document that holds it", () => {
    writeNudgeState(dismissNudge(state(), "habit", TODAY));
    eraseDevice();
    expect(loadDoc()[NUDGES_KEY]).toBeUndefined();
    expect(readNudgeState()).toEqual(EMPTY_NUDGE_STATE);
  });
});
