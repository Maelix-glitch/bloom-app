/**
 * usual.ts — "your usual" computed from the person's own record.
 *
 * The engine behind Bloom's smart fill: from the last couple of weeks of
 * logged days it derives what a typical day looks like — median sleep window,
 * median water, modal energy — so the log can offer it back with one tap.
 *
 * Rules that keep it honest:
 *  · Nothing is invented. With fewer than MIN_SAMPLES logged days a field is
 *    simply absent — the UI shows no chip for it, never a guessed number.
 *  · The day being filled is always excluded, so editing never echoes itself.
 *  · Medians, not means — one wild night doesn't become "your usual".
 *  · "Usual" is a starting point, applied only when the person taps it, and
 *    everything stays editable afterwards.
 */

import type { DayEntry } from "@/lib/trackers/core";

/** Distinct logged days a field needs before "your usual" may speak for it. */
export const MIN_SAMPLES = 4;

/** How far back the usual is computed from. */
export const USUAL_WINDOW = 14;

/** A computed usual: the value plus how many days it came from. */
export interface UsualField<T> {
  value: T;
  samples: number;
}

export interface UsualDay {
  /** Median sleep window, rounded to 15 min. */
  sleep?: UsualField<{
    bedTime: string;
    wakeTime: string;
    minutes: number;
    quality: number | null;
  }>;
  water?: UsualField<number>; // ml, rounded to 50
  movement?: UsualField<number>; // minutes, rounded to 5
  energy?: UsualField<number>; // 1–5, the most recent mode
  screen?: UsualField<number>; // minutes, rounded to 15
  /** Typical daily study total + the subject they log most (sessions stay manual). */
  study?: UsualField<{ minutes: number; subject: string | null }>;
}

const roundTo = (value: number, step: number) => Math.round(value / step) * step;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]!
    : Math.round(((sorted[mid - 1]! + sorted[mid]!) / 2) * 100) / 100;
}

/**
 * "HH:MM" → minutes since the previous noon, so 23:30 and 00:40 sort on one
 * line instead of wrapping around midnight.
 */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  const hour = h ?? 0;
  return (hour < 12 ? hour + 24 : hour) * 60 + (m ?? 0);
}

function minutesToTime(total: number): string {
  const wrapped = total % (24 * 60);
  const h = Math.floor(wrapped / 60) % 24;
  const m = wrapped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** The most common value; the most recent occurrence wins ties. */
function recentMode(values: Array<{ value: number; order: number }>): number {
  const counts = new Map<number, { count: number; latest: number }>();
  for (const { value, order } of values) {
    const entry = counts.get(value);
    if (!entry) counts.set(value, { count: 1, latest: order });
    else counts.set(value, { count: entry.count + 1, latest: Math.max(entry.latest, order) });
  }
  let best: { value: number; count: number; latest: number } | null = null;
  for (const [value, { count, latest }] of counts) {
    if (best === null || count > best.count || (count === best.count && latest > best.latest)) {
      best = { value, count, latest };
    }
  }
  return best!.value;
}

/**
 * The user's usual day, computed from the last `USUAL_WINDOW` logged days
 * (excluding `excludeDate` — the day being filled never predicts itself).
 * Fields without `MIN_SAMPLES` distinct days are left out entirely.
 */
export function usualDay(
  days: readonly DayEntry[],
  excludeDate: string,
  options?: { window?: number | undefined; minSamples?: number | undefined },
): UsualDay {
  const window = options?.window ?? USUAL_WINDOW;
  const minSamples = options?.minSamples ?? MIN_SAMPLES;

  const recent = [...days]
    .filter((d) => d.date !== excludeDate)
    .sort((a, b) => (a.date < b.date ? 1 : -1)) // newest first
    .slice(0, window);

  const out: UsualDay = {};

  const sleepDays = recent.filter(
    (d) => d.bedTime !== null && d.wakeTime !== null && d.sleepMinutes !== null,
  );
  if (sleepDays.length >= minSamples) {
    const beds = sleepDays.map((d) => timeToMinutes(d.bedTime!));
    const wakes = sleepDays.map((d) => timeToMinutes(d.wakeTime!));
    const qualities = sleepDays
      .filter((d) => d.sleepQuality !== null)
      .map((d, i) => ({ value: d.sleepQuality!, order: i }));
    out.sleep = {
      value: {
        bedTime: minutesToTime(roundTo(median(beds), 15)),
        wakeTime: minutesToTime(roundTo(median(wakes), 15)),
        minutes: roundTo(median(sleepDays.map((d) => d.sleepMinutes!)), 15),
        quality: qualities.length >= minSamples ? recentMode(qualities) : null,
      },
      samples: sleepDays.length,
    };
  }

  const water = recent.filter((d) => d.waterMl !== null).map((d) => d.waterMl!);
  if (water.length >= minSamples)
    out.water = { value: roundTo(median(water), 50), samples: water.length };

  const movement = recent.filter((d) => d.movementMinutes !== null).map((d) => d.movementMinutes!);
  if (movement.length >= minSamples)
    out.movement = { value: roundTo(median(movement), 5), samples: movement.length };

  const energyDays = recent
    .filter((d) => d.energy !== null)
    .map((d, i) => ({ value: d.energy!, order: i }));
  if (energyDays.length >= minSamples)
    out.energy = { value: recentMode(energyDays), samples: energyDays.length };

  const screen = recent.filter((d) => d.screenMinutes !== null).map((d) => d.screenMinutes!);
  if (screen.length >= minSamples)
    out.screen = { value: roundTo(median(screen), 15), samples: screen.length };

  const studyTotals = recent
    .filter((d) => d.sessions.length > 0)
    .map((d) => ({
      total: d.sessions.reduce((sum, s) => sum + s.minutes, 0),
      subjects: d.sessions.map((s) => s.subject),
    }));
  if (studyTotals.length >= minSamples) {
    const subjectCounts = new Map<string, number>();
    for (const day of studyTotals) {
      for (const subject of day.subjects) {
        subjectCounts.set(subject, (subjectCounts.get(subject) ?? 0) + 1);
      }
    }
    let topSubject: string | null = null;
    let topCount = 0;
    for (const [subject, count] of subjectCounts) {
      if (count > topCount) {
        topSubject = subject;
        topCount = count;
      }
    }
    out.study = {
      value: {
        minutes: roundTo(median(studyTotals.map((d) => d.total)), 15),
        subject: topSubject,
      },
      samples: studyTotals.length,
    };
  }

  return out;
}

/** True when at least one field has enough history to suggest. */
export function hasUsual(us: UsualDay): boolean {
  return (
    us.sleep !== undefined ||
    us.water !== undefined ||
    us.movement !== undefined ||
    us.energy !== undefined ||
    us.screen !== undefined ||
    us.study !== undefined
  );
}

/** The most-recently-logged day count behind the suggestion, for honest labels. */
export function usualSampleCount(us: UsualDay): number {
  return Math.max(
    us.sleep?.samples ?? 0,
    us.water?.samples ?? 0,
    us.movement?.samples ?? 0,
    us.energy?.samples ?? 0,
    us.screen?.samples ?? 0,
    us.study?.samples ?? 0,
  );
}
