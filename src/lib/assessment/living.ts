/**
 * Living Assessment — the Assessment, kept alive between retakes.
 *
 * The Assessment (`health.assessment.v1`) is a snapshot: what the
 * person said on the day they completed it. Life does not hold
 * still for it — they weigh in, they log food, their sleep shifts —
 * and until now the only way to move the snapshot was a full
 * retake, which most people never do. This module is the layer
 * between the two:
 *
 *   · CHANGE DETECTION (`sinceLines`) — compares the stored
 *     assessment against newer REAL records (weigh-ins from
 *     `health.weighins.v1`, logged days from `health.foodlog.v1`)
 *     and states, in plain lines, what has actually changed since.
 *     Every line is built from a recorded value and its date;
 *     nothing is estimated, projected or invented.
 *
 *   · STALENESS (`assessmentStaleness`) — two honest rules for
 *     "this snapshot may no longer describe you": the recorded
 *     weight has drifted far from the assessed weight, or the
 *     assessment is old AND newer records exist to check it
 *     against. Age alone never fires — an old assessment with no
 *     newer data is just an old assessment.
 *
 *   · DELTA UPDATES (`health.assessmentDelta.v1`) — small factual
 *     corrections the person makes themselves (weight, activity,
 *     sleep), stored as dated records that layer OVER the base
 *     assessment. The base is never mutated and the history
 *     (`health.assessmentHistory.v1`) is never touched: the
 *     effective view is `base + deltas`, computed at read time.
 *
 * THE HARD RULE, enforced in the parser: dietary pattern and food
 * budget are asked ONLY inside the Assessment flow (owner
 * directive, PR #134). A delta can never carry them — the parser
 * below copies only the permitted fields out of a stored value,
 * so even a forged or sync-merged delta document cannot smuggle
 * a pattern or a budget in. Changing either still means a retake.
 * The behavioural profile (spec §10.5) splits the same way: the
 * factual kitchen fields — cooking ability, equipment, prep time,
 * eating setting — CAN move by delta, because kitchens and
 * circumstances change; the reflective fields — hunger pattern,
 * cravings, emotional eating, past attempts, motivation,
 * confidence — are Assessment-only and are dropped here too.
 *
 * Storage follows the pattern the Assessment and its history set:
 * one versioned key in the shared preferences document, so the
 * deltas follow the person across devices through `user_prefs`,
 * ride along in the data export, and are covered by account
 * erasure — with no new table. Everything here is pure except the
 * thin pref wrappers at the bottom.
 */

import { getPref, setPref } from "@/lib/prefs";
import type { WeighIn } from "@/lib/health/body";
import type { LogEntry } from "@/lib/nutrition/types";
import type {
  ActivityLevel,
  CookingAbility,
  EatingSetting,
  EquipmentItem,
  PrepTimeMaxMinutes,
} from "@/lib/vitalis/domain/profile";
import {
  ACTIVITY_LABEL,
  COOKING_LABEL,
  EATING_SETTING_LABEL,
  EQUIPMENT_LABEL,
  PREP_TIME_LABEL,
  RESTEDNESS_LABEL,
  SLEEP_QUALITY_LABEL,
  type SleepQuality,
} from "./questions";
import { parseAnswers, type AssessmentAnswers, type AssessmentState } from "./state";

/* ------------------------------ delta storage ------------------------------ */

export const ASSESSMENT_DELTA_KEY = "health.assessmentDelta.v1";
export const ASSESSMENT_DELTA_VERSION = 1;
/** At most this many dated updates are kept; the oldest fall away. */
export const ASSESSMENT_DELTA_CAP = 50;

/**
 * The ONLY fields a delta update may change. Deliberately absent:
 * `dietaryPattern`, `foodBudget` and `cuisinePreference`
 * (Assessment-only, see header), every safety answer — a change
 * there deserves the full flow, not a one-line edit — and the
 * reflective behavioural fields (`hungerPattern`, `cravings`,
 * `cravingKinds`, `emotionalEating`, `pastAttempts`, `motivation`,
 * `confidence`): spec §10.5 keeps those Assessment-only. The
 * factual kitchen fields ARE here: a person who moves out of a
 * hostel into a flat has a different kitchen, and that is a fact,
 * not a reflection.
 */
export interface AssessmentDeltaChanges {
  weightKg?: number;
  activity?: ActivityLevel;
  sleepHoursTypical?: number;
  sleepQuality?: SleepQuality;
  morningRestedness?: number;
  cookingAbility?: CookingAbility;
  /** A stated list; `["none"]` is the explicit "none of these". An
   *  empty list is not a change — it parses as "not stated". */
  equipment?: EquipmentItem[];
  prepTimeMaxMinutes?: PrepTimeMaxMinutes;
  eatingSetting?: EatingSetting;
}

export type AssessmentDeltaField = keyof AssessmentDeltaChanges;

export const DELTA_FIELDS: readonly AssessmentDeltaField[] = [
  "weightKg",
  "activity",
  "sleepHoursTypical",
  "sleepQuality",
  "morningRestedness",
  "cookingAbility",
  "equipment",
  "prepTimeMaxMinutes",
  "eatingSetting",
];

export interface AssessmentDeltaUpdate {
  /** When the update was recorded (ISO instant). */
  recordedAt: string;
  changes: AssessmentDeltaChanges;
}

export interface AssessmentDeltaValue {
  version: typeof ASSESSMENT_DELTA_VERSION;
  /** Dated updates, oldest first — the fold order for the merge. */
  updates: AssessmentDeltaUpdate[];
}

export const EMPTY_DELTA_VALUE: AssessmentDeltaValue = {
  version: ASSESSMENT_DELTA_VERSION,
  updates: [],
};

/* --------------------------------- parsing --------------------------------- */

/**
 * The permitted changes in a raw object, validated with the
 * Assessment's own ranges (via `parseAnswers`). A field counts only
 * when it was actually present AND parses to a real value. Pattern,
 * budget and anything else present in the raw object are dropped
 * here — this is the hard rule's enforcement point.
 */
export function parseDeltaChanges(raw: unknown): AssessmentDeltaChanges | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const parsed = parseAnswers(r);
  const changes: AssessmentDeltaChanges = {};
  if ("weightKg" in r && parsed.weightKg !== null) changes.weightKg = parsed.weightKg;
  if ("activity" in r && parsed.activity !== null) changes.activity = parsed.activity;
  if ("sleepHoursTypical" in r && parsed.sleepHoursTypical !== null) {
    changes.sleepHoursTypical = parsed.sleepHoursTypical;
  }
  if ("sleepQuality" in r && parsed.sleepQuality !== null) {
    changes.sleepQuality = parsed.sleepQuality;
  }
  if ("morningRestedness" in r && parsed.morningRestedness !== null) {
    changes.morningRestedness = parsed.morningRestedness;
  }
  if ("cookingAbility" in r && parsed.cookingAbility !== null) {
    changes.cookingAbility = parsed.cookingAbility;
  }
  if ("equipment" in r && parsed.equipment.length > 0) {
    changes.equipment = parsed.equipment;
  }
  if ("prepTimeMaxMinutes" in r && parsed.prepTimeMaxMinutes !== null) {
    changes.prepTimeMaxMinutes = parsed.prepTimeMaxMinutes;
  }
  if ("eatingSetting" in r && parsed.eatingSetting !== null) {
    changes.eatingSetting = parsed.eatingSetting;
  }
  return Object.keys(changes).length > 0 ? changes : null;
}

function parseDeltaUpdate(raw: unknown): AssessmentDeltaUpdate | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r["recordedAt"] !== "string" || Number.isNaN(Date.parse(r["recordedAt"]))) {
    return null;
  }
  const changes = parseDeltaChanges(r["changes"]);
  if (!changes) return null;
  return { recordedAt: r["recordedAt"], changes };
}

export function parseAssessmentDeltaValue(raw: unknown): AssessmentDeltaValue | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (r["version"] !== ASSESSMENT_DELTA_VERSION) return null;
  const rawUpdates = Array.isArray(r["updates"]) ? r["updates"] : [];
  const updates: AssessmentDeltaUpdate[] = [];
  for (const item of rawUpdates) {
    const update = parseDeltaUpdate(item);
    if (update) updates.push(update);
  }
  updates.sort((a, b) => (a.recordedAt < b.recordedAt ? -1 : a.recordedAt > b.recordedAt ? 1 : 0));
  return { version: ASSESSMENT_DELTA_VERSION, updates: updates.slice(-ASSESSMENT_DELTA_CAP) };
}

/* ------------------------------- transitions ------------------------------- */

/**
 * Append one dated update. Changes that carry no permitted field
 * change nothing (the value is returned untouched, same reference).
 * The base assessment is never involved here — deltas live in
 * their own key and their own document value.
 */
export function appendDelta(
  value: AssessmentDeltaValue,
  changes: AssessmentDeltaChanges,
  recordedAt: string,
): AssessmentDeltaValue {
  const clean = parseDeltaChanges(changes);
  if (!clean) return value;
  const updates = [...value.updates, { recordedAt, changes: clean }].sort((a, b) =>
    a.recordedAt < b.recordedAt ? -1 : a.recordedAt > b.recordedAt ? 1 : 0,
  );
  return { version: ASSESSMENT_DELTA_VERSION, updates: updates.slice(-ASSESSMENT_DELTA_CAP) };
}

/**
 * The merge: base answers with every delta applied in recorded
 * order — the latest update wins per field. The base object is
 * never mutated; with no updates the base is returned as-is.
 */
export function effectiveAnswers(
  base: AssessmentAnswers,
  value: AssessmentDeltaValue,
): AssessmentAnswers {
  if (value.updates.length === 0) return base;
  const merged = { ...base };
  for (const update of value.updates) {
    Object.assign(merged, update.changes);
  }
  return merged;
}

/** The effective assessment: the stored state, its answers merged. */
export function effectiveState(
  state: AssessmentState,
  value: AssessmentDeltaValue,
): AssessmentState {
  if (value.updates.length === 0) return state;
  return { ...state, answers: effectiveAnswers(state.answers, value) };
}

/* ---------------------------- change detection ----------------------------- */

export interface SinceLine {
  id: string;
  /** The day the line's fact belongs to (`YYYY-MM-DD`). */
  date: string;
  text: string;
}

const fmtKg = (n: number): string => `${Math.round(n * 10) / 10}`;

const fmtDay = (day: string): string =>
  new Date(`${day}T12:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

/** The local day the assessment was completed, or null when it never was. */
function assessmentDay(state: AssessmentState): string | null {
  return state.status === "complete" && state.completedAt ? state.completedAt.slice(0, 10) : null;
}

function latestWeighInAfter(weighIns: readonly WeighIn[], day: string): WeighIn | null {
  let latest: WeighIn | null = null;
  for (const w of weighIns) {
    if (w.date > day && (latest === null || w.date > latest.date)) latest = w;
  }
  return latest;
}

function describeChanges(changes: AssessmentDeltaChanges): string[] {
  const parts: string[] = [];
  if (changes.weightKg !== undefined) parts.push(`weight ${fmtKg(changes.weightKg)} kg`);
  if (changes.activity !== undefined) parts.push(`activity, ${ACTIVITY_LABEL[changes.activity]}`);
  if (changes.sleepHoursTypical !== undefined) {
    parts.push(`sleep, about ${fmtKg(changes.sleepHoursTypical)} hours`);
  }
  if (changes.sleepQuality !== undefined) {
    parts.push(`sleep quality, ${SLEEP_QUALITY_LABEL[changes.sleepQuality].toLowerCase()}`);
  }
  if (changes.morningRestedness !== undefined) {
    parts.push(
      `waking rested, ${RESTEDNESS_LABEL[changes.morningRestedness]?.toLowerCase() ?? changes.morningRestedness}`,
    );
  }
  if (changes.cookingAbility !== undefined) {
    parts.push(`cooking, ${COOKING_LABEL[changes.cookingAbility].toLowerCase()}`);
  }
  if (changes.equipment !== undefined) {
    parts.push(
      `equipment, ${changes.equipment.map((item) => EQUIPMENT_LABEL[item].toLowerCase()).join(", ")}`,
    );
  }
  if (changes.prepTimeMaxMinutes !== undefined) {
    parts.push(`prep time, ${PREP_TIME_LABEL[changes.prepTimeMaxMinutes].toLowerCase()}`);
  }
  if (changes.eatingSetting !== undefined) {
    parts.push(`eating, ${EATING_SETTING_LABEL[changes.eatingSetting].toLowerCase()}`);
  }
  return parts;
}

/**
 * "Since your assessment" — what newer records say, and nothing
 * else. A line appears only when a real record backs it: a weigh-in
 * recorded after completion, food logged on days after completion,
 * or a delta update the person recorded. An incomplete assessment
 * has no "since" — it has a "continue".
 */
export function sinceLines(
  state: AssessmentState,
  weighIns: readonly WeighIn[],
  foodLog: readonly LogEntry[],
  deltaValue: AssessmentDeltaValue,
): SinceLine[] {
  const day = assessmentDay(state);
  if (!day) return [];
  const lines: SinceLine[] = [];

  const baseWeight = state.answers.weightKg;
  const latest = latestWeighInAfter(weighIns, day);
  if (latest && baseWeight !== null) {
    const diff = Math.round((latest.kg - baseWeight) * 10) / 10;
    const relation =
      diff === 0
        ? `the same as the ${fmtKg(baseWeight)} kg in your assessment`
        : `${fmtKg(Math.abs(diff))} kg ${diff < 0 ? "below" : "above"} the ${fmtKg(baseWeight)} kg in your assessment`;
    lines.push({
      id: `weighin-${latest.date}`,
      date: latest.date,
      text: `Weigh-in on ${fmtDay(latest.date)}: ${fmtKg(latest.kg)} kg, ${relation}.`,
    });
  }

  const loggedDays = new Set<string>();
  let latestLogged = "";
  for (const entry of foodLog) {
    if (entry.day > day) {
      loggedDays.add(entry.day);
      if (entry.day > latestLogged) latestLogged = entry.day;
    }
  }
  if (loggedDays.size > 0) {
    lines.push({
      id: `foodlog-${latestLogged}`,
      date: latestLogged,
      text: `Food logged on ${loggedDays.size} ${loggedDays.size === 1 ? "day" : "days"} since your assessment, most recently ${fmtDay(latestLogged)}.`,
    });
  }

  for (const update of deltaValue.updates) {
    const updateDay = update.recordedAt.slice(0, 10);
    if (updateDay < day) continue;
    const parts = describeChanges(update.changes);
    if (parts.length === 0) continue;
    lines.push({
      id: `delta-${update.recordedAt}`,
      date: updateDay,
      text: `Updated on ${fmtDay(updateDay)}: ${parts.join("; ")}.`,
    });
  }

  return lines.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : 1));
}

/* -------------------------------- staleness -------------------------------- */

/** Recorded weight this far (kg) from the assessed weight = worth updating. */
export const STALE_WEIGHT_DRIFT_KG = 3;
/** An assessment older than this, WITH newer records, = worth updating. */
export const STALE_AGE_DAYS = 90;

export interface AssessmentStaleness {
  stale: boolean;
  reasons: string[];
}

/**
 * Is the snapshot still describing this person? Two rules, both
 * grounded in records — never in the calendar alone:
 *
 *   1. the latest weigh-in recorded after completion differs from
 *      the assessed weight by MORE than `STALE_WEIGHT_DRIFT_KG`;
 *   2. the assessment was completed more than `STALE_AGE_DAYS` ago
 *      AND at least one weigh-in has been recorded since.
 */
export function assessmentStaleness(
  state: AssessmentState,
  weighIns: readonly WeighIn[],
  now: string,
): AssessmentStaleness {
  const day = assessmentDay(state);
  if (!day || !state.completedAt) return { stale: false, reasons: [] };
  const reasons: string[] = [];
  const latest = latestWeighInAfter(weighIns, day);

  const baseWeight = state.answers.weightKg;
  if (latest && baseWeight !== null) {
    const drift = Math.round(Math.abs(latest.kg - baseWeight) * 10) / 10;
    if (drift > STALE_WEIGHT_DRIFT_KG) {
      reasons.push(
        `Your weigh-in on ${fmtDay(latest.date)} was ${fmtKg(latest.kg)} kg, ${fmtKg(drift)} kg from the ${fmtKg(baseWeight)} kg in your assessment.`,
      );
    }
  }

  const ageDays = (Date.parse(now) - Date.parse(state.completedAt)) / 86_400_000;
  if (ageDays > STALE_AGE_DAYS && latest) {
    reasons.push(
      "Your assessment is over three months old, and you have recorded newer weigh-ins since.",
    );
  }

  return { stale: reasons.length > 0, reasons };
}

/* ------------------------------- pref access ------------------------------- */

export function readAssessmentDeltaValue(): AssessmentDeltaValue {
  return getPref(ASSESSMENT_DELTA_KEY, parseAssessmentDeltaValue, EMPTY_DELTA_VALUE);
}

export function writeAssessmentDeltaValue(value: AssessmentDeltaValue): void {
  setPref(ASSESSMENT_DELTA_KEY, value);
}

/** Record one update now: read, append, write — only when it lands. */
export function recordAssessmentDelta(changes: AssessmentDeltaChanges, now: string): void {
  const current = readAssessmentDeltaValue();
  const next = appendDelta(current, changes, now);
  if (next !== current) writeAssessmentDeltaValue(next);
}
