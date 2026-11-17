/**
 * Assessment history — the completed assessments a retake replaced.
 *
 * Every retake used to overwrite the only copy of what the person
 * had told Bloom: complete a new Assessment and the old goal, the old
 * pattern, the old safety answers were simply gone. Now, when a
 * retake of a completed Assessment *completes*, the previous
 * completed snapshot is archived here — newest first, at most ten.
 *
 * The mechanics are deliberately two-step, because a retake that is
 * begun and abandoned must archive nothing:
 *
 *   · `begin` (from a completed state) captures the completed
 *     snapshot as `pending` in this key's value — not yet history;
 *   · `complete` commits it: pending moves into `entries`.
 *
 * Opening or closing the flow writes neither step (begin is invoked
 * only from the flow's own Begin button), and completing a first
 * Assessment — no pending — writes nothing at all.
 *
 * Storage follows the pattern the Assessment itself set: one
 * versioned key in the shared preferences document
 * (`health.assessmentHistory.v1`), so the history follows the person
 * across devices through `user_prefs`, rides along in the data
 * export (`useExportBundle` bundles `loadDoc()` wholesale), and is
 * covered by account erasure (`erase_my_data()` deletes the caller's
 * `user_prefs` row wholesale; the device wipe removes the document)
 * — with no new table and no per-key wiring anywhere, exactly as
 * `health.assessment.v1`, the foods and the food log are covered.
 *
 * Everything here is pure except the two thin pref wrappers at the
 * bottom.
 */

import { getPref, setPref } from "@/lib/prefs";
import {
  parseAnswers,
  type AssessmentAnswers,
  type AssessmentState,
} from "./state";

export const ASSESSMENT_HISTORY_KEY = "health.assessmentHistory.v1";
export const ASSESSMENT_HISTORY_VERSION = 1;
/** At most this many replaced assessments are kept. */
export const ASSESSMENT_HISTORY_CAP = 10;

export interface AssessmentHistoryEntry {
  /** When the archived assessment was completed (ISO). */
  completedAt: string;
  /** The completed answers, exactly as they stood at completion. */
  answers: AssessmentAnswers;
}

export interface AssessmentHistoryValue {
  version: typeof ASSESSMENT_HISTORY_VERSION;
  /** Archived snapshots, newest first. */
  entries: AssessmentHistoryEntry[];
  /** The completed snapshot a retake in progress would replace —
   *  captured at begin, committed (or left) at completion. Not
   *  history yet, and never shown as history. */
  pending: AssessmentHistoryEntry | null;
}

export const EMPTY_HISTORY_VALUE: AssessmentHistoryValue = {
  version: ASSESSMENT_HISTORY_VERSION,
  entries: [],
  pending: null,
};

/** Stable empty fallback for readers — one shared instance. */
export const EMPTY_HISTORY_ENTRIES: AssessmentHistoryEntry[] = [];

/* --------------------------------- parsing --------------------------------- */

function parseEntry(raw: unknown): AssessmentHistoryEntry | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r["completedAt"] !== "string" || Number.isNaN(Date.parse(r["completedAt"]))) {
    return null;
  }
  if (!("answers" in r)) return null;
  return { completedAt: r["completedAt"], answers: parseAnswers(r["answers"]) };
}

export function parseAssessmentHistoryValue(raw: unknown): AssessmentHistoryValue | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (r["version"] !== ASSESSMENT_HISTORY_VERSION) return null;
  const rawEntries = Array.isArray(r["entries"]) ? r["entries"] : [];
  const entries: AssessmentHistoryEntry[] = [];
  for (const item of rawEntries) {
    const entry = parseEntry(item);
    if (entry) entries.push(entry);
    if (entries.length >= ASSESSMENT_HISTORY_CAP) break;
  }
  return {
    version: ASSESSMENT_HISTORY_VERSION,
    entries,
    pending: "pending" in r ? parseEntry(r["pending"]) : null,
  };
}

/** The entries-only parse, for readers that render history. */
export function parseAssessmentHistoryEntries(raw: unknown): AssessmentHistoryEntry[] | null {
  const value = parseAssessmentHistoryValue(raw);
  return value ? value.entries : null;
}

/* ------------------------------- transitions ------------------------------- */

/** The snapshot a completed state would leave behind, or null when
 *  the state holds no completion worth archiving. */
export function snapshotOf(state: AssessmentState): AssessmentHistoryEntry | null {
  if (state.status !== "complete" || !state.completedAt) return null;
  return { completedAt: state.completedAt, answers: state.answers };
}

/** Capture the snapshot a retake is about to replace. A retake begun
 *  while one is already in progress keeps the ORIGINAL pending
 *  snapshot — the completed assessment it would replace has not
 *  changed. */
export function withPending(
  value: AssessmentHistoryValue,
  snapshot: AssessmentHistoryEntry,
): AssessmentHistoryValue {
  if (value.pending) return value;
  return { ...value, pending: snapshot };
}

/** Prepend a snapshot to the entries: newest first, capped, and never
 *  twice — a completion archived once stays archived once. */
export function archiveSnapshot(
  entries: readonly AssessmentHistoryEntry[],
  entry: AssessmentHistoryEntry,
): AssessmentHistoryEntry[] {
  if (entries.some((e) => e.completedAt === entry.completedAt)) return [...entries];
  return [entry, ...entries].slice(0, ASSESSMENT_HISTORY_CAP);
}

/** Commit the pending snapshot at completion: it becomes the newest
 *  history entry and the pending slot clears. No pending — the value
 *  is returned untouched (a first completion archives nothing). */
export function commitPending(value: AssessmentHistoryValue): AssessmentHistoryValue {
  if (!value.pending) return value;
  return {
    ...value,
    entries: archiveSnapshot(value.entries, value.pending),
    pending: null,
  };
}

/* ------------------------------- pref access ------------------------------- */

export function readAssessmentHistoryValue(): AssessmentHistoryValue {
  return getPref(ASSESSMENT_HISTORY_KEY, parseAssessmentHistoryValue, EMPTY_HISTORY_VALUE);
}

export function writeAssessmentHistoryValue(value: AssessmentHistoryValue): void {
  setPref(ASSESSMENT_HISTORY_KEY, value);
}

export function readAssessmentHistory(): AssessmentHistoryEntry[] {
  return readAssessmentHistoryValue().entries;
}
