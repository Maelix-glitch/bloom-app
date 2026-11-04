/**
 * Engine 2 — Adaptive forecasting.
 *
 * The point estimate blends the median (stable) with a recency-weighted mean
 * (responsive), then widens into a date window from the person's own
 * dispersion and, once available, their measured backtest error. With one
 * interval the result is explicitly "preliminary"; with none there is no
 * forecast at all rather than a population 28-day guess.
 */

import { addDays, diffDays } from "./dates";
import { PLAUSIBLE_MIN } from "./baseline";
import { clamp, iqr, mad, median, recencyWeighted } from "./stats";
import type { Baseline, BacktestResult, ForecastResult } from "./types";

/** Exported so the backtester predicts exactly the way production does. */
export function predictPoint(intervals: readonly number[]): number | null {
  if (intervals.length === 0) return null;
  const med = median(intervals);
  if (med === null) return null;
  if (intervals.length < 2) return med;
  const recent = recencyWeighted(intervals);
  return recent === null ? med : med * 0.65 + recent * 0.35;
}

const EMPTY: ForecastResult = {
  available: false,
  status: "none",
  next: null,
  upcoming: [],
  cycleLength: null,
  halfWidth: 0,
  bleedingWindow: null,
  intervalsUsed: 0,
  method: "No completed cycle interval yet — nothing to estimate from.",
};

export function forecastCycle(
  baseline: Baseline,
  today: string,
  backtest?: BacktestResult | null,
): ForecastResult {
  const intervals = baseline.plausible;
  if (!baseline.lastStart || intervals.length === 0) return { ...EMPTY };

  const point = predictPoint(intervals);
  if (point === null) return { ...EMPTY };

  const medianLength = Math.round(point);
  /* Dispersion: the larger of the robust spread measures. */
  const dispersion = Math.max(
    mad(intervals) ?? 0,
    (iqr(intervals) ?? 0) / 2,
    0,
  );
  /* With one interval there is no dispersion to measure, so the window is a
     declared preliminary margin, not a measured one. */
  const preliminary = intervals.length < 2;
  const measuredError = backtest?.meanAbsError ?? 0;
  const halfWidth = clamp(
    Math.ceil(Math.max(preliminary ? 4 : 2, dispersion, measuredError)),
    2,
    10,
  );

  /* The "typical length" reported to the user is the median — the stable
     measure — so the phase boundaries and the forecast agree on one number.
     The next date itself uses the blended point estimate above. */
  const typicalLength =
    baseline.median !== null ? Math.round(baseline.median) : medianLength;

  const nextPoint = addDays(baseline.lastStart, medianLength);
  const next = {
    point: nextPoint,
    from: addDays(nextPoint, -halfWidth),
    to: addDays(nextPoint, halfWidth),
    daysAway: diffDays(today, nextPoint),
  };

  const upcoming = [0, 1, 2].map((i) => {
    const start = addDays(nextPoint, i * medianLength);
    return {
      start,
      from: addDays(start, -halfWidth),
      to: addDays(start, halfWidth),
    };
  });

  const bleedLength = Math.max(1, Math.round(baseline.bleedingMedian ?? 5));

  return {
    available: true,
    status: preliminary ? "preliminary" : "personal",
    next,
    upcoming,
    cycleLength: {
      point: typicalLength,
      from: Math.max(PLAUSIBLE_MIN, medianLength - halfWidth),
      to: medianLength + halfWidth,
    },
    halfWidth,
    bleedingWindow: {
      from: next.from,
      to: addDays(next.from, bleedLength - 1),
    },
    intervalsUsed: intervals.length,
    method: preliminary
      ? "One observed interval, widened by a preliminary margin."
      : `Median blended with recency weighting across ${intervals.length} intervals; window widened by your observed spread${measuredError > 0 ? ` and a ${measuredError.toFixed(1)}-day backtest error` : ""}.`,
  };
}
