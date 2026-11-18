/**
 * Behaviour Change (System 8) — the nudge memory.
 *
 * The right-moment engine (engine.ts) is pure and forgetful by design;
 * everything it must remember between days lives here, in one versioned
 * prefs key, `health.nudges.v1`, in the shared preferences document —
 * the same pattern the plan, the food log and the target adjustment
 * use. Because the value lives in the prefs document it inherits, with
 * no per-key wiring anywhere: sync (the doc mirrors to `user_prefs`),
 * export (`loadDoc()` wholesale into the bundle) and erasure
 * (`eraseDevice()` wipes the document; `erase_my_data()` deletes the
 * caller's `user_prefs` row).
 *
 * What is stored is deliberately small — never what was shown in full,
 * only what the quiet rules need:
 *   · `dismissed` — nudge KIND → the day it was dismissed. A dismissed
 *     kind rests for DISMISS_REST_DAYS days: the person said "not this",
 *     and Bloom believes them for a while.
 *   · `snoozed` — nudge key → the day it was snoozed. A snoozed nudge
 *     stays hidden for the rest of that day only; snooze means "later",
 *     not "never", so it may return tomorrow.
 *   · `lastShown` — nudge key → the last day it was shown. The engine
 *     never shows the identical nudge on two consecutive days.
 *
 * A nudge KEY is `kind:subject` (e.g. `habit:<id>`, `meal:breakfast`),
 * so two different habits are two different nudges, while "dismiss"
 * rests the whole kind — dismissing one habit nudge rests habit nudges,
 * not just that habit's.
 */

import { clearPref, getPref, setPref } from "@/lib/prefs";
import { shiftDay } from "@/lib/localDay";

export const NUDGES_KEY = "health.nudges.v1";
export const NUDGES_VERSION = 1;

/** How long a dismissed nudge kind rests before it may be offered again. */
export const DISMISS_REST_DAYS = 3;

/** Records older than this are dropped on write — the memory stays small. */
const KEEP_DAYS = 14;

export type NudgeKind = "habit" | "meal" | "mood" | "plan" | "weigh-in";

export const NUDGE_KINDS: readonly NudgeKind[] = ["habit", "meal", "mood", "plan", "weigh-in"];

export interface NudgeState {
  version: typeof NUDGES_VERSION;
  dismissed: Partial<Record<NudgeKind, string>>;
  snoozed: Record<string, string>;
  lastShown: Record<string, string>;
}

export const EMPTY_NUDGE_STATE: NudgeState = {
  version: NUDGES_VERSION,
  dismissed: {},
  snoozed: {},
  lastShown: {},
};

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

function isDayKey(value: unknown): value is string {
  return typeof value === "string" && DAY_KEY.test(value) && !Number.isNaN(Date.parse(value));
}

function parseDayRecord(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (key.length > 0 && isDayKey(value)) out[key] = value;
  }
  return out;
}

export function parseNudgeState(raw: unknown): NudgeState | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (r["version"] !== NUDGES_VERSION) return null;
  const dismissedRaw = parseDayRecord(r["dismissed"]);
  const dismissed: Partial<Record<NudgeKind, string>> = {};
  for (const kind of NUDGE_KINDS) {
    const day = dismissedRaw[kind];
    if (day) dismissed[kind] = day;
  }
  return {
    version: NUDGES_VERSION,
    dismissed,
    snoozed: parseDayRecord(r["snoozed"]),
    lastShown: parseDayRecord(r["lastShown"]),
  };
}

export function readNudgeState(): NudgeState {
  return getPref(NUDGES_KEY, parseNudgeState, EMPTY_NUDGE_STATE);
}

/** Store a state. The value is re-parsed on the way in: what cannot
 *  survive the strict parser is never written. */
export function writeNudgeState(state: NudgeState): boolean {
  if (!parseNudgeState(state)) return false;
  setPref(NUDGES_KEY, state);
  return true;
}

export function clearNudgeState(): void {
  clearPref(NUDGES_KEY);
}

/* ------------------------------ transitions ------------------------------ */

/** Drop records the quiet rules can no longer act on, relative to `today`. */
function pruned(state: NudgeState, today: string): NudgeState {
  const floor = shiftDay(today, -KEEP_DAYS);
  const keepDay = (day: string) => day >= floor;
  const dismissed: Partial<Record<NudgeKind, string>> = {};
  for (const kind of NUDGE_KINDS) {
    const day = state.dismissed[kind];
    // A dismissal whose rest has fully elapsed is spent — drop it too.
    if (day && keepDay(day) && today < shiftDay(day, DISMISS_REST_DAYS)) dismissed[kind] = day;
  }
  const snoozed: Record<string, string> = {};
  for (const [key, day] of Object.entries(state.snoozed)) {
    if (day === today) snoozed[key] = day;
  }
  const lastShown: Record<string, string> = {};
  for (const [key, day] of Object.entries(state.lastShown)) {
    if (keepDay(day)) lastShown[key] = day;
  }
  return { version: NUDGES_VERSION, dismissed, snoozed, lastShown };
}

/** Dismiss: the whole KIND rests for DISMISS_REST_DAYS days from today. */
export function dismissNudge(state: NudgeState, kind: NudgeKind, today: string): NudgeState {
  const next = pruned(state, today);
  return { ...next, dismissed: { ...next.dismissed, [kind]: today } };
}

/** Snooze: this one nudge (by key) stays hidden for the rest of today. */
export function snoozeNudge(state: NudgeState, key: string, today: string): NudgeState {
  const next = pruned(state, today);
  return { ...next, snoozed: { ...next.snoozed, [key]: today } };
}

/**
 * Record that these nudge keys were shown today. Returns the SAME
 * object when nothing changes, so callers can skip the write (and the
 * re-render it would cause) on repeat renders.
 */
export function recordShown(state: NudgeState, keys: readonly string[], today: string): NudgeState {
  const fresh = keys.filter((key) => state.lastShown[key] !== today);
  if (fresh.length === 0) return state;
  const next = pruned(state, today);
  const lastShown = { ...next.lastShown };
  for (const key of fresh) lastShown[key] = today;
  return { ...next, lastShown };
}

/** True while a dismissal of `kind` on `dismissedDay` is still resting on `today`. */
export function isKindResting(dismissedDay: string | undefined, today: string): boolean {
  if (!dismissedDay) return false;
  return today < shiftDay(dismissedDay, DISMISS_REST_DAYS);
}
