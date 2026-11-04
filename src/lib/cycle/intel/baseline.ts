/**
 * Engine 1 — Personal baseline.
 *
 * Turns logged periods into the person's own cycle statistics. Robust
 * measures (median, IQR, MAD) lead; mean/std-dev are reported for contrast but
 * never drive the forecast alone. Unusual intervals stay in `intervals` and are
 * listed separately in `unusual` — they are history, not noise to delete.
 */

import { diffDays } from "./dates";
import { cvPercent, iqr, mad, mean, median, recencyWeighted, stdev } from "./stats";
import type { Baseline, CyclePeriodRecord, CycleRecord, DataSufficiency } from "./types";

/**
 * Start-to-start interval accepted for the typical-length statistics. A gap
 * past the upper bound is far more often a missed log than a 60-day cycle, so
 * it is retained in `intervals` and reported in `unusual` — never deleted, and
 * never allowed to drag the median.
 */
export const PLAUSIBLE_MIN = 15;
export const PLAUSIBLE_MAX = 45;
export const UNUSUAL_MAX = PLAUSIBLE_MAX;
/** Population reference only — shown to explain, never used as a baseline. */
export const REFERENCE_CYCLE = 28;

export function periodStarts(record: CycleRecord): string[] {
  return [...new Set(record.periods.map((p) => p.start))].sort((a, b) => a.localeCompare(b));
}

export function intervalsFrom(starts: readonly string[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < starts.length; i += 1) {
    const prev = starts[i - 1]!;
    const next = starts[i]!;
    out.push(diffDays(prev, next));
  }
  return out;
}

export function bleedingDaysFor(period: CyclePeriodRecord): number | null {
  if (period.bleedingDays !== null) return period.bleedingDays;
  if (!period.end) return null;
  return diffDays(period.start, period.end) + 1;
}

function sufficiencyFor(starts: number, intervals: number): DataSufficiency {
  if (starts === 0) return "none";
  if (starts === 1) return "one_start";
  if (intervals <= 1) return "one_interval";
  if (intervals <= 3) return "few_cycles";
  return "established";
}

function coverageFor(record: CycleRecord): number {
  const from = new Date(Date.parse(`${record.today}T00:00:00Z`) - 89 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const logged = record.days.filter((d) => d.date >= from && d.date <= record.today).length;
  return Math.min(1, logged / 90);
}

export function buildBaseline(record: CycleRecord): Baseline {
  const starts = periodStarts(record);
  const intervals = intervalsFrom(starts);
  const plausible = intervals.filter((d) => d >= PLAUSIBLE_MIN && d <= PLAUSIBLE_MAX);
  const unusual = intervals.filter((d) => d > UNUSUAL_MAX || d < PLAUSIBLE_MIN);

  const bleeds = record.periods
    .map(bleedingDaysFor)
    .filter((d): d is number => d !== null && d >= 1 && d <= 15);

  const lastStart = starts.length > 0 ? starts[starts.length - 1]! : null;

  return {
    starts,
    intervals,
    plausible,
    unusual,
    count: intervals.length,
    median: median(plausible),
    mean: mean(plausible),
    min: plausible.length > 0 ? Math.min(...plausible) : null,
    max: plausible.length > 0 ? Math.max(...plausible) : null,
    iqr: iqr(plausible),
    mad: mad(plausible),
    stdev: stdev(plausible),
    cvPercent: cvPercent(plausible),
    recencyWeighted: recencyWeighted(plausible),
    bleedingMedian: median(bleeds),
    bleedingCount: bleeds.length,
    completeness: record.periods.length > 0 ? bleeds.length / record.periods.length : 0,
    coverage: coverageFor(record),
    lastStart,
    daysSinceLastStart: lastStart ? diffDays(lastStart, record.today) : null,
    sufficiency: sufficiencyFor(starts.length, intervals.length),
  };
}
