/**
 * Nutrition — food-log operations and recents (W4-3 N2, design §4.1/§4.2).
 *
 * List operations are pure and every entry that enters the log — appended
 * or edited — must survive the strict parser, so the stored log can never
 * hold a shape the reader would drop. Totals come from the N1 math, never
 * re-derived here.
 *
 * Recents are derived from the user's own log only: foods they have
 * actually logged, most recent first, frequency breaking ties. No new
 * collection, no inference about anyone else.
 */

import { dayLogOf } from "./math";
import { parseLogEntry } from "./parse";
import { readFoodLog, writeFoodLog } from "./store";
import type { Amount, DayLog, Food, LogEntry, Meal, Nutrients } from "./types";

function byDayThenTime(a: LogEntry, b: LogEntry): number {
  return a.day === b.day
    ? a.createdAt < b.createdAt
      ? -1
      : 1
    : a.day < b.day
      ? -1
      : 1;
}

/** Append an entry. A malformed entry changes nothing. Replaces an entry
 *  with the same id (ids stable). */
export function appendToLog(entries: readonly LogEntry[], entry: LogEntry): LogEntry[] {
  const valid = parseLogEntry(entry);
  if (!valid) return [...entries];
  return [...entries.filter((e) => e.id !== valid.id), valid].sort(byDayThenTime);
}

export interface LogEntryPatch {
  meal?: Meal;
  name?: string;
  amount?: Amount;
  /** Stored nutrients, patched directly. When a portion changes, the
   *  caller recomputes via `entryNutrientsFor` (N1 math) and passes the
   *  result here — the log layer never rescales on its own. */
  nutrients?: Nutrients;
}

/** Edit an entry in place. Provenance, source, food link and day are not
 *  patchable — an entry's origin is a fact. The patched result must
 *  survive the strict parser; an unknown id changes nothing. */
export function updateLogEntry(
  entries: readonly LogEntry[],
  id: string,
  patch: LogEntryPatch,
): LogEntry[] {
  const current = entries.find((e) => e.id === id);
  if (!current) return [...entries];
  const next = parseLogEntry({ ...current, ...patch, id: current.id, day: current.day });
  if (!next) return [...entries];
  return entries.map((e) => (e.id === id ? next : e));
}

export function removeLogEntry(entries: readonly LogEntry[], id: string): LogEntry[] {
  return entries.filter((e) => e.id !== id);
}

export function entriesForDay(entries: readonly LogEntry[], day: string): LogEntry[] {
  return entries.filter((e) => e.day === day);
}

/* --------------------------------- recents -------------------------------- */

export interface RecentFood {
  foodId: string;
  /** How many times the user has logged this food. */
  count: number;
  /** The most recent local day it was logged. */
  lastLoggedDay: string;
}

/**
 * Recents from the user's own log: food-backed entries only (estimates are
 * one-offs, not foods), ordered by most recent day, then by frequency.
 */
export function recentsFromLog(entries: readonly LogEntry[], limit = 10): RecentFood[] {
  const byFood = new Map<string, RecentFood>();
  for (const entry of entries) {
    if (!entry.foodId) continue;
    const current = byFood.get(entry.foodId);
    if (!current) {
      byFood.set(entry.foodId, {
        foodId: entry.foodId,
        count: 1,
        lastLoggedDay: entry.day,
      });
    } else {
      current.count += 1;
      if (entry.day > current.lastLoggedDay) current.lastLoggedDay = entry.day;
    }
  }
  return [...byFood.values()]
    .sort((a, b) =>
      a.lastLoggedDay === b.lastLoggedDay
        ? b.count - a.count
        : a.lastLoggedDay < b.lastLoggedDay
          ? 1
          : -1,
    )
    .slice(0, limit);
}

/** Recents resolved to the foods themselves, in recents order. Foods the
 *  user has since deleted simply fall away. */
export function recentFoods(
  entries: readonly LogEntry[],
  foods: readonly Food[],
  limit = 10,
): Food[] {
  const byId = new Map(foods.map((f) => [f.id, f]));
  const out: Food[] = [];
  for (const recent of recentsFromLog(entries, limit)) {
    const food = byId.get(recent.foodId);
    if (food) out.push(food);
  }
  return out;
}

/* ------------------------------- pref access ------------------------------ */

export function logEntry(entry: LogEntry): void {
  writeFoodLog(appendToLog(readFoodLog(), entry));
}

export function editLogEntry(id: string, patch: LogEntryPatch): void {
  writeFoodLog(updateLogEntry(readFoodLog(), id, patch));
}

export function deleteLogEntry(id: string): void {
  writeFoodLog(removeLogEntry(readFoodLog(), id));
}

export function readDayLog(day: string): DayLog {
  return dayLogOf(readFoodLog(), day);
}
