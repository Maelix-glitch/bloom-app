/**
 * Nutrition — the plan-log record (N-UI): duplicate protection for
 * logging a plan meal, mirroring the Coach handoff's discipline
 * (`coachLog.ts`).
 *
 * "Log this meal" writes one entry per suggestion in the meal. Without
 * a record, a second tap — or logging one suggestion by hand and then
 * tapping the meal button — would double-log the same food. So a third
 * prefs key, `health.planlog.v1`, maps `day:meal:foodId` → log entry
 * id for every entry the plan surfaces created. It inherits the prefs
 * document's sync/export/erasure by construction, like the foods,
 * food-log and coach-log keys.
 *
 * The mapping is honoured only while the entry it names is still in
 * the log: delete the entry in the Nutrition tab and that suggestion
 * can be logged again; keep it, and the surface reads "Already logged"
 * while the lib-level log call itself refuses a second copy.
 */

import { getPref, setPref } from "@/lib/prefs";
import { readFoodLog } from "./store";
import type { LogEntry, Meal } from "./types";

export const PLAN_LOG_KEY = "health.planlog.v1";
export const PLAN_LOG_VERSION = 1;

export interface PlanLogValue {
  version: typeof PLAN_LOG_VERSION;
  /** `day:meal:foodId` → the log entry it was logged as. */
  logged: Record<string, string>;
}

export function planLogValueOf(logged: Record<string, string>): PlanLogValue {
  return { version: PLAN_LOG_VERSION, logged };
}

/** The record key for one plan suggestion on one day. */
export function planLogKey(day: string, meal: Meal, foodId: string): string {
  return `${day}:${meal}:${foodId}`;
}

/** Strict envelope parse. Malformed pairs drop; a wrong envelope is
 *  null, so `getPref` falls back and a corrupt value reaches no one. */
export function parsePlanLogValue(raw: unknown): Record<string, string> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (r["version"] !== PLAN_LOG_VERSION) return null;
  const logged = r["logged"];
  if (!logged || typeof logged !== "object" || Array.isArray(logged)) return null;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(logged)) {
    if (key.length > 0 && typeof value === "string" && value.length > 0) out[key] = value;
  }
  return out;
}

const NO_LOGGED: Record<string, string> = {};

export function readPlanLogRecord(): Record<string, string> {
  return getPref(PLAN_LOG_KEY, parsePlanLogValue, NO_LOGGED);
}

export function recordPlanLog(day: string, meal: Meal, foodId: string, entryId: string): void {
  setPref(
    PLAN_LOG_KEY,
    planLogValueOf({ ...readPlanLogRecord(), [planLogKey(day, meal, foodId)]: entryId }),
  );
}

/** The entry a plan suggestion was logged as, from a record + a log:
 *  the mapping counts only while the entry it names is still in the
 *  log (and still sits in the meal it was logged into). */
export function planLoggedEntryIdFrom(
  record: Readonly<Record<string, string>>,
  entries: readonly LogEntry[],
  day: string,
  meal: Meal,
  foodId: string,
): string | null {
  const entryId = record[planLogKey(day, meal, foodId)];
  if (!entryId) return null;
  const entry = entries.find((e) => e.id === entryId);
  return entry && entry.day === day && entry.meal === meal ? entryId : null;
}

export function planLoggedEntryId(day: string, meal: Meal, foodId: string): string | null {
  return planLoggedEntryIdFrom(readPlanLogRecord(), readFoodLog(), day, meal, foodId);
}
