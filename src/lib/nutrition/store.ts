/**
 * Nutrition — storage (W4-3 N2, design §4.3).
 *
 * Two versioned keys in the shared preferences document, exactly the
 * pattern the body profile and the Assessment set:
 *   · `health.foods.v1`   — the user's own (custom) foods
 *   · `health.foodlog.v1` — day-keyed log entries
 *
 * Because the values live in the prefs document, they inherit what the
 * document already has, with no new table and no per-key wiring anywhere:
 * sync (the doc mirrors to `user_prefs`, merged per key), export
 * (`useExportBundle` bundles `loadDoc()` wholesale) and erasure
 * (`erase_my_data()` deletes the caller's `user_prefs` row wholesale).
 * No registry lists prefs keys in this codebase — each key is a constant
 * in its owning module, as here.
 *
 * Everything above the two thin pref wrappers at the bottom is pure.
 */

import { getPref, setPref } from "@/lib/prefs";
import { parseFoodList, parseLogEntryList } from "./parse";
import type { Food, LogEntry } from "./types";

export const FOODS_KEY = "health.foods.v1";
export const FOODLOG_KEY = "health.foodlog.v1";
export const FOODS_VERSION = 1;
export const FOODLOG_VERSION = 1;

export interface FoodsValue {
  version: typeof FOODS_VERSION;
  foods: Food[];
}

export interface FoodLogValue {
  version: typeof FOODLOG_VERSION;
  entries: LogEntry[];
}

/** Strict envelope parse for the foods value. Null on a wrong envelope —
 *  `getPref` then falls back, so a corrupt value can never reach callers. */
export function parseFoodsValue(raw: unknown): Food[] | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (r["version"] !== FOODS_VERSION) return null;
  return parseFoodList(r["foods"]);
}

/** Strict envelope parse for the food-log value. Entries are validated one
 *  by one; malformed ones drop, valid ones survive. */
export function parseFoodLogValue(raw: unknown): LogEntry[] | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (r["version"] !== FOODLOG_VERSION) return null;
  return parseLogEntryList(r["entries"]);
}

export function foodsValueOf(foods: Food[]): FoodsValue {
  return { version: FOODS_VERSION, foods };
}

export function foodLogValueOf(entries: LogEntry[]): FoodLogValue {
  return { version: FOODLOG_VERSION, entries };
}

/* ------------------------------- pref access ------------------------------ */

const NO_FOODS: Food[] = [];
const NO_ENTRIES: LogEntry[] = [];

export function readFoods(): Food[] {
  return getPref(FOODS_KEY, parseFoodsValue, NO_FOODS);
}

export function writeFoods(foods: Food[]): void {
  setPref(FOODS_KEY, foodsValueOf(foods));
}

export function readFoodLog(): LogEntry[] {
  return getPref(FOODLOG_KEY, parseFoodLogValue, NO_ENTRIES);
}

export function writeFoodLog(entries: LogEntry[]): void {
  setPref(FOODLOG_KEY, foodLogValueOf(entries));
}
