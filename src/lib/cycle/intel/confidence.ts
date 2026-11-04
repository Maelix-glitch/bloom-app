/**
 * Engine 6 — Confidence and calibration.
 *
 * Confidence is computed from countable evidence: how many intervals exist,
 * how dispersed they are, how the model has actually performed for this
 * person, and how complete the record is. The UI renders this score; it never
 * invents its own badge.
 *
 * IMPORTANT — what the score is NOT: it is an internal heuristic index on a
 * 0–100 scale, not a calibrated probability and not a confidence interval. A
 * score of 85 does not mean "85% likely". It only says the evidence behind the
 * estimate is comparatively strong for this person's record: many measured
 * intervals, low dispersion, a backtest that has landed close before, and a
 * well-filled log. The default copy therefore prints "index", and the band
 * labels (not the number) are what the UI leads with.
 */

import { clamp } from "./stats";
import type { Baseline, BacktestResult, ConfidenceAssessment, ConfidenceLevel } from "./types";

const LABEL: Record<ConfidenceLevel, string> = {
  none: "Not enough history",
  low: "Low",
  moderate: "Moderate",
  good: "Good",
};

function baseFor(intervals: number): number {
  if (intervals <= 0) return 0;
  if (intervals === 1) return 22;
  if (intervals === 2) return 38;
  if (intervals === 3) return 48;
  if (intervals === 4) return 55;
  if (intervals === 5) return 62;
  if (intervals <= 9) return 70;
  return 76;
}

function variabilityEffect(cv: number | null): { effect: number; detail: string } {
  if (cv === null) return { effect: 0, detail: "not measurable yet" };
  if (cv <= 8) return { effect: 10, detail: `cycle lengths vary by about ${cv.toFixed(1)}%` };
  if (cv <= 14) return { effect: 0, detail: `cycle lengths vary by about ${cv.toFixed(1)}%` };
  if (cv <= 22) return { effect: -10, detail: `cycle lengths vary by about ${cv.toFixed(1)}%` };
  return { effect: -20, detail: `cycle lengths vary widely (${cv.toFixed(1)}%)` };
}

function backtestEffect(
  backtest: BacktestResult | null | undefined,
): { effect: number; detail: string } {
  const mae = backtest?.meanAbsError ?? null;
  if (mae === null || (backtest?.count ?? 0) < 2) {
    return { effect: 0, detail: "not enough past predictions to score the model" };
  }
  if (mae <= 2) return { effect: 12, detail: `past estimates missed by ${mae.toFixed(1)} days on average` };
  if (mae <= 4) return { effect: 4, detail: `past estimates missed by ${mae.toFixed(1)} days on average` };
  if (mae <= 6) return { effect: -6, detail: `past estimates missed by ${mae.toFixed(1)} days on average` };
  return { effect: -12, detail: `past estimates missed by ${mae.toFixed(1)} days on average` };
}

export function assessConfidence(input: {
  baseline: Baseline;
  backtest?: BacktestResult | null;
}): ConfidenceAssessment {
  const { baseline } = input;
  const base = baseFor(baseline.plausible.length);
  const variability = variabilityEffect(baseline.cvPercent);
  const backtest = backtestEffect(input.backtest);
  const completeness = clamp(Math.round(baseline.completeness * 6), 0, 6);
  const coverage = clamp(Math.round(baseline.coverage * 4), 0, 4);

  const score = clamp(base + variability.effect + backtest.effect + completeness + coverage, 0, 100);
  const level: ConfidenceLevel =
    score < 20 ? "none" : score < 45 ? "low" : score < 70 ? "moderate" : "good";

  const factors = [
    {
      id: "history",
      label: "Recorded history",
      detail: `${baseline.plausible.length} completed ${baseline.plausible.length === 1 ? "cycle" : "cycles"}`,
      effect: base,
    },
    {
      id: "variability",
      label: "Variability",
      detail: variability.detail,
      effect: variability.effect,
    },
    {
      id: "backtest",
      label: "Past accuracy",
      detail: backtest.detail,
      effect: backtest.effect,
    },
    {
      id: "completeness",
      label: "Record completeness",
      detail: `${Math.round(baseline.completeness * 100)}% of periods have a recorded end`,
      effect: completeness,
    },
    {
      id: "coverage",
      label: "Daily logging",
      detail: `${Math.round(baseline.coverage * 100)}% of the last 90 days logged`,
      effect: coverage,
    },
  ];

  const reason =
    level === "none"
      ? "There is not enough personal history for a reliable estimate yet. Log a period start, then the next one — the second start is what creates your first measured interval."
      : level === "low"
        ? `A rough estimate only: ${variability.detail}. Treat the window as the answer, not the date.`
        : level === "moderate"
          ? `A reasonable estimate from your own history: ${variability.detail}${input.backtest?.meanAbsError != null ? `, and past estimates missed by ${input.backtest.meanAbsError.toFixed(1)} days` : ""}.`
          : `Your record is steady enough that the window is narrow: ${variability.detail}${input.backtest?.meanAbsError != null ? `, with past estimates missing by ${input.backtest.meanAbsError.toFixed(1)} days` : ""}.`;

  return { level, score, label: LABEL[level], reason, factors };
}
