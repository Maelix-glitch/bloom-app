/**
 * Normalisation — raw store records in, engine input out.
 *
 * The only place that knows about the app's period/daily-log shapes. It
 * validates date keys, drops nothing the user logged except duplicates, and
 * never invents a value: a missing end stays missing so the engines can tell
 * "not recorded" from "recorded as short".
 */

import { isDateKey } from "./dates";
import type { CycleDayRecord, CyclePeriodRecord, CycleRecord } from "./types";

export interface RawPeriod {
  start: string;
  end?: string | null | undefined;
  /** Present when the caller already knows the closed duration. */
  bleedingDays?: number | null | undefined;
}

export interface RawDay {
  date: string;
  flow?: string | null | undefined;
  symptoms?: readonly string[] | null | undefined;
  mood?: string | null | undefined;
  energy?: number | null | undefined;
  pain?: number | null | undefined;
  sleep?: number | null | undefined;
}

function normalizePeriod(period: RawPeriod): CyclePeriodRecord | null {
  if (!isDateKey(period.start)) return null;
  const end = isDateKey(period.end) && period.end >= period.start ? period.end : null;
  const bleedingDays =
    typeof period.bleedingDays === "number" && period.bleedingDays >= 1
      ? Math.round(period.bleedingDays)
      : null;
  return { start: period.start, end, bleedingDays };
}

function normalizeDay(day: RawDay): CycleDayRecord | null {
  if (!isDateKey(day.date)) return null;
  const symptoms = [
    ...new Set((day.symptoms ?? []).map((s) => s.trim()).filter((s) => s.length > 0)),
  ];
  return {
    date: day.date,
    flow: day.flow ?? null,
    symptoms,
    mood: day.mood ?? null,
    energy: day.energy ?? null,
    sleepHours: day.sleep ?? null,
    pain: day.pain ?? null,
  };
}

export function toCycleRecord(input: {
  today: string;
  periods: readonly RawPeriod[];
  days: readonly RawDay[];
}): CycleRecord {
  const byStart = new Map<string, CyclePeriodRecord>();
  for (const raw of input.periods) {
    const period = normalizePeriod(raw);
    if (!period) continue;
    /* Later records for the same start win, matching the store's upsert. */
    byStart.set(period.start, period);
  }

  const byDate = new Map<string, CycleDayRecord>();
  for (const raw of input.days) {
    const day = normalizeDay(raw);
    if (!day) continue;
    byDate.set(day.date, day);
  }

  return {
    today: isDateKey(input.today) ? input.today : new Date().toISOString().slice(0, 10),
    periods: [...byStart.values()].sort((a, b) => a.start.localeCompare(b.start)),
    days: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)),
  };
}
