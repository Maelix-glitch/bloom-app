// @vitest-environment jsdom
/**
 * Assessment history: a completed retake archives the assessment it
 * replaced — exactly one snapshot, newest first, capped at ten — and
 * nothing else archives anything. The retake simulation drives the
 * same pure transitions and pref writes the useAssessment hook makes,
 * in the hook's order, against the real preferences document.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { buildExport } from "@/lib/data/exportAll";
import { eraseDevice } from "@/lib/data/erase";
import { PREFS_KEY, loadDoc, setPref } from "@/lib/prefs";
import {
  ASSESSMENT_KEY,
  beginAssessment,
  completeAssessment,
  emptyAssessmentState,
  saveStep,
  type AssessmentState,
} from "./state";
import {
  ASSESSMENT_HISTORY_CAP,
  ASSESSMENT_HISTORY_KEY,
  archiveSnapshot,
  commitPending,
  parseAssessmentHistoryValue,
  readAssessmentHistory,
  readAssessmentHistoryValue,
  snapshotOf,
  withPending,
  writeAssessmentHistoryValue,
  type AssessmentHistoryEntry,
} from "./history";

const T0 = "2026-10-01T07:00:00.000Z";
const T1 = "2026-10-02T09:30:00.000Z";
const T2 = "2026-11-02T09:30:00.000Z";

function completedState(goal: "lose" | "gain", completedAt: string): AssessmentState {
  const begun = beginAssessment(emptyAssessmentState(T0), T0);
  const answered = saveStep(begun, { goal, dietaryPattern: "vegan" }, "summary", T0);
  return { ...completeAssessment(answered, completedAt), completedAt };
}

/** The hook's begin sequence, verbatim in effect. */
function hookBegin(state: AssessmentState): void {
  const snapshot = snapshotOf(state);
  if (snapshot) writeAssessmentHistoryValue(withPending(readAssessmentHistoryValue(), snapshot));
  setPref(ASSESSMENT_KEY, beginAssessment(state, T2));
}

/** The hook's complete sequence, verbatim in effect. */
function hookComplete(state: AssessmentState): void {
  setPref(ASSESSMENT_KEY, completeAssessment(state, T2));
  const history = readAssessmentHistoryValue();
  if (history.pending) writeAssessmentHistoryValue(commitPending(history));
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("the pure transitions", () => {
  it("snapshotOf takes only a completed state", () => {
    expect(snapshotOf(emptyAssessmentState(T0))).toBeNull();
    expect(snapshotOf({ ...emptyAssessmentState(T0), status: "in_progress" })).toBeNull();
    const done = completedState("lose", T1);
    expect(snapshotOf(done)).toEqual({ completedAt: T1, answers: done.answers });
  });

  it("withPending keeps the first pending snapshot", () => {
    const first = snapshotOf(completedState("lose", T1))!;
    const second = snapshotOf(completedState("gain", T2))!;
    const value = withPending(withPending(readAssessmentHistoryValue(), first), second);
    expect(value.pending).toEqual(first);
    expect(value.entries).toEqual([]);
  });

  it("commitPending with nothing pending changes nothing", () => {
    const value = readAssessmentHistoryValue();
    expect(commitPending(value)).toBe(value);
  });

  it("archiveSnapshot dedupes by completion and caps the list", () => {
    let entries: AssessmentHistoryEntry[] = [];
    const mk = (day: number) => ({
      completedAt: `2026-01-${String(day).padStart(2, "0")}T00:00:00.000Z`,
      answers: completedState("lose", T1).answers,
    });
    for (let day = 1; day <= ASSESSMENT_HISTORY_CAP + 2; day++) {
      entries = archiveSnapshot(entries, mk(day));
    }
    expect(entries).toHaveLength(ASSESSMENT_HISTORY_CAP);
    expect(entries[0]!.completedAt).toContain("2026-01-12");
    const again = archiveSnapshot(entries, entries[0]!);
    expect(again).toHaveLength(ASSESSMENT_HISTORY_CAP);
    expect(again[0]).toBe(entries[0]);
  });

  it("parse drops malformed entries and refuses a wrong envelope", () => {
    expect(parseAssessmentHistoryValue(null)).toBeNull();
    expect(parseAssessmentHistoryValue({ version: 99, entries: [] })).toBeNull();
    const value = parseAssessmentHistoryValue({
      version: 1,
      entries: [
        { completedAt: T1, answers: { goal: "gain" } },
        { completedAt: "not-a-date", answers: {} },
        { answers: {} },
        "junk",
      ],
      pending: null,
    });
    expect(value!.entries).toHaveLength(1);
    expect(value!.entries[0]!.answers.goal).toBe("gain");
  });
});

describe("a retake, end to end", () => {
  it("archives exactly one snapshot — the assessment the retake replaced", () => {
    const first = completedState("lose", T1);
    setPref(ASSESSMENT_KEY, first);

    hookBegin(first);
    /* Mid-retake: nothing is history yet. */
    expect(readAssessmentHistory()).toEqual([]);

    const retaken = saveStep(beginAssessment(first, T2), { goal: "gain" }, "summary", T2);
    hookComplete(retaken);

    const entries = readAssessmentHistory();
    expect(entries).toHaveLength(1);
    expect(entries[0]!.completedAt).toBe(T1);
    expect(entries[0]!.answers.goal).toBe("lose");
    expect(entries[0]!.answers.dietaryPattern).toBe("vegan");
    expect(readAssessmentHistoryValue().pending).toBeNull();
  });

  it("a second completion without a new retake archives nothing more", () => {
    const first = completedState("lose", T1);
    hookBegin(first);
    hookComplete(beginAssessment(first, T2));
    hookComplete(beginAssessment(first, T2));
    expect(readAssessmentHistory()).toHaveLength(1);
  });

  it("beginning a retake and abandoning it archives nothing", () => {
    const first = completedState("lose", T1);
    hookBegin(first);
    expect(readAssessmentHistory()).toEqual([]);
    expect(readAssessmentHistoryValue().entries).toEqual([]);
  });

  it("a first completion writes no history at all", () => {
    const fresh = beginAssessment(emptyAssessmentState(T0), T0);
    hookComplete(fresh);
    expect(loadDoc()[ASSESSMENT_HISTORY_KEY]).toBeUndefined();
  });
});

describe("export and erasure coverage — inherited from the prefs document", () => {
  it("the history key rides in the export bundle's prefs, verbatim", () => {
    const first = completedState("lose", T1);
    hookBegin(first);
    hookComplete(beginAssessment(first, T2));
    const bundle = buildExport({ exportedAt: T2, prefs: loadDoc() });
    const prefs = bundle.prefs as Record<string, { value: unknown }>;
    expect(prefs[ASSESSMENT_HISTORY_KEY]).toBeDefined();
    const value = parseAssessmentHistoryValue(prefs[ASSESSMENT_HISTORY_KEY]!.value)!;
    expect(value.entries).toHaveLength(1);
    expect(value.entries[0]!.answers.goal).toBe("lose");
  });

  it("the device erase removes the document that holds the history", () => {
    const first = completedState("lose", T1);
    hookBegin(first);
    hookComplete(beginAssessment(first, T2));
    expect(window.localStorage.getItem(PREFS_KEY)).toContain(ASSESSMENT_HISTORY_KEY);
    eraseDevice();
    expect(window.localStorage.getItem(PREFS_KEY)).toBeNull();
    expect(readAssessmentHistory()).toEqual([]);
  });
});
