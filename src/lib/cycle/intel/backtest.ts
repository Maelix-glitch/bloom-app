/**
 * Engine 7 — Chronological backtesting.
 *
 * For each historical period start, the model is rebuilt from only the starts
 * that were already logged *before* that date, predicts it, and the error is
 * recorded. No future information leaks into a historical prediction, so the
 * resulting error is a real out-of-sample measure for this person.
 */

import { addDays, diffDays } from "./dates";
import { intervalsFrom } from "./baseline";
import { predictPoint } from "./forecast";
import { mean, median } from "./stats";
import type { BacktestPrediction, BacktestResult } from "./types";

export function runBacktest(starts: readonly string[]): BacktestResult {
  const predictions: BacktestPrediction[] = [];

  for (let target = 2; target < starts.length; target += 1) {
    const known = starts.slice(0, target);
    const intervals = intervalsFrom(known);
    const length = predictPoint(intervals);
    if (length === null) continue;
    const anchor = known[known.length - 1]!;
    const predicted = addDays(anchor, Math.round(length));
    predictions.push({
      target: starts[target]!,
      predicted,
      /* Positive = the cycle ran longer than the model expected. */
      errorDays: diffDays(predicted, starts[target]!),
      intervalsUsed: intervals.length,
    });
  }

  if (predictions.length === 0) {
    return {
      predictions: [],
      count: 0,
      meanAbsError: null,
      medianAbsError: null,
      withinTwo: null,
      withinThree: null,
      improving: null,
    };
  }

  const abs = predictions.map((p) => Math.abs(p.errorDays));
  const half = Math.floor(abs.length / 2);
  const improving =
    abs.length >= 4
      ? (mean(abs.slice(half)) ?? 0) < (mean(abs.slice(0, half)) ?? 0) - 0.25
      : null;

  return {
    predictions,
    count: predictions.length,
    meanAbsError: mean(abs),
    medianAbsError: median(abs),
    withinTwo: abs.filter((e) => e <= 2).length / abs.length,
    withinThree: abs.filter((e) => e <= 3).length / abs.length,
    improving,
  };
}
