/**
 * Engines 5 & 7 — cycle brief, insight selection and explanation.
 *
 * The brief is assembled from the engines' own outputs; every sentence names
 * the observation behind it. Nothing here produces motivational filler: when
 * the evidence is thin, the brief says so.
 */

import { longDay, rangeLabel } from "./dates";
import { plural } from "./stats";
import type {
  Baseline,
  BacktestResult,
  ChangeFinding,
  ConfidenceAssessment,
  CycleBrief,
  Explanation,
  ForecastResult,
  Insight,
  PhaseResult,
  SymptomAnalysis,
} from "./types";

export function buildInsights(input: {
  baseline: Baseline;
  forecast: ForecastResult;
  confidence: ConfidenceAssessment;
  symptoms: SymptomAnalysis;
  changes: ChangeFinding[];
}): Insight[] {
  const { baseline, forecast, confidence, symptoms, changes } = input;
  const out: Insight[] = [];

  for (const change of changes) {
    out.push({
      id: change.id,
      kind: change.kind === "unusual" ? "data" : "change",
      title: change.headline,
      body: change.detail,
      evidence: change.evidence,
      strength: change.kind === "unusual" ? "moderate" : "low",
    });
  }

  if (baseline.plausible.length >= 3 && baseline.median !== null) {
    const spread = baseline.iqr;
    if (spread !== null && spread <= 4) {
      out.push({
        id: "steady-baseline",
        kind: "baseline",
        title: `Your cycles have stayed around ${Math.round(baseline.median)} days`,
        body: `The middle half of your ${baseline.plausible.length} recorded intervals sits within ${Math.round(spread)} ${plural(Math.round(spread), "day", "days")} of the median, so the forecast window can stay narrow.`,
        evidence: [
          { label: "Median", value: `${Math.round(baseline.median)} days` },
          { label: "Interquartile range", value: `${Math.round(spread)} days` },
          { label: "Intervals", value: `${baseline.plausible.length}` },
        ],
        strength: "good",
      });
    } else if (baseline.plausible.length >= 4) {
      out.push({
        id: "wide-baseline",
        kind: "variability",
        title: "Your cycle lengths genuinely vary, and the forecast reflects that",
        body: `Across ${baseline.plausible.length} intervals your lengths ranged from ${baseline.min} to ${baseline.max} days. Bloom widens the window rather than pretending one date is exact.`,
        evidence: [
          { label: "Range", value: `${baseline.min}–${baseline.max} days` },
          { label: "Variation", value: `${(baseline.cvPercent ?? 0).toFixed(1)}%` },
          { label: "Intervals", value: `${baseline.plausible.length}` },
        ],
        strength: "moderate",
      });
    }
  }

  if (symptoms.patterns.length > 0) {
    const top = symptoms.patterns[0]!;
    out.push({
      id: `symptom-${top.symptom}`,
      kind: "symptom",
      title: `${top.symptom} is your most frequently recorded symptom`,
      body: `Logged on ${top.daysLogged} ${plural(top.daysLogged, "day", "days")} across ${top.cyclesSeen} of ${top.totalCycles} cycles with daily records${top.dominantPhase ? `, most often in your ${top.dominantPhase} days` : ""}${top.medianCycleDay !== null ? `, around cycle day ${Math.round(top.medianCycleDay)}` : ""}. This is a count of what you recorded, not a cause.`,
      evidence: [
        { label: "Occurrences", value: `${top.daysLogged}` },
        { label: "Cycles seen", value: `${top.cyclesSeen} of ${top.totalCycles}` },
        { label: "Dominant phase", value: top.dominantPhase ?? "no clear phase" },
      ],
      strength: top.cyclesSeen >= 3 ? "moderate" : "low",
    });
  }

  if (baseline.plausible.length < 2) {
    out.push({
      id: "need-second-start",
      kind: "data",
      title: baseline.starts.length === 0 ? "Nothing to estimate yet" : "One more start unlocks your baseline",
      body:
        baseline.starts.length === 0
          ? "Log the first day of a period. Bloom will not show a forecast until it has a measured interval to work from."
          : "A single start records where a cycle began, but a cycle length needs two. Until then there is no personal estimate — only your logged history.",
      evidence: [
        { label: "Starts recorded", value: `${baseline.starts.length}` },
        { label: "Intervals", value: `${baseline.plausible.length}` },
      ],
      strength: "good",
    });
  }

  const order: Record<Insight["strength"], number> = { good: 0, moderate: 1, low: 2 };
  return out.sort((a, b) => order[a.strength] - order[b.strength]).slice(0, 4);
}

export function buildBrief(input: {
  baseline: Baseline;
  forecast: ForecastResult;
  phase: PhaseResult;
  confidence: ConfidenceAssessment;
  insights: Insight[];
}): CycleBrief {
  const { baseline, forecast, phase, confidence, insights } = input;

  if (baseline.starts.length === 0) {
    return {
      headline: "Your cycle journey starts here.",
      lines: [
        "Nothing has been logged yet, so there is no cycle to describe and no forecast to make.",
        "Add the first day of a period and Bloom records the anchor. A second start creates your first real interval.",
      ],
    };
  }

  if (forecast.next === null) {
    return {
      headline: `Cycle day ${phase.day ?? 1} · ${phase.certainty === "observed" ? "recorded" : "estimated"}`,
      lines: [
        `One start is recorded (${longDay(baseline.starts[baseline.starts.length - 1]!)}), but a cycle length needs the next one.`,
        "No forecast is shown, because no interval has been measured yet.",
      ],
    };
  }

  const where =
    phase.key !== null
      ? `Cycle day ${phase.day} · ${phase.label.toLowerCase()} (estimated).`
      : phase.day !== null
        ? `Cycle day ${phase.day} · ${phase.label.toLowerCase()}.`
        : "Current position unavailable.";

  const next = `Next period estimated ${rangeLabel(forecast.next.from, forecast.next.to)} — ${confidence.label.toLowerCase()} confidence, based on ${forecast.intervalsUsed} recorded ${plural(forecast.intervalsUsed, "interval", "intervals")}.`;
  const best = insights[0];

  return {
    headline: where,
    lines: [next, ...(best ? [best.title + "."] : [])],
  };
}

export function explainForecast(input: {
  baseline: Baseline;
  forecast: ForecastResult;
  confidence: ConfidenceAssessment;
  backtest: BacktestResult;
  updatedAt: string;
}): Explanation {
  const { baseline, forecast, confidence, backtest, updatedAt } = input;
  const lines: string[] = [];

  if (!forecast.available) {
    lines.push(
      "There is no completed interval in your record, so Bloom has nothing to measure a forecast from.",
    );
    lines.push("It does not substitute a 28-day population average for your own pattern.");
  } else {
    lines.push(
      `Based on ${forecast.intervalsUsed} completed ${plural(forecast.intervalsUsed, "interval", "intervals")}: median ${baseline.median !== null ? Math.round(baseline.median) : "—"} days, range ${baseline.min}–${baseline.max}.`,
    );
    lines.push(
      `The window is ±${forecast.halfWidth} ${plural(forecast.halfWidth, "day", "days")}, widened by your own spread and, once available, by how far past estimates actually landed.`,
    );
    if (backtest.count > 0) {
      lines.push(
        `Across ${backtest.count} past ${plural(backtest.count, "prediction", "predictions")}, the average miss was ${backtest.meanAbsError?.toFixed(1)} days${backtest.withinTwo !== null ? `; ${Math.round(backtest.withinTwo * 100)}% landed within two days` : ""}.`,
      );
    }
    lines.push(`Confidence is ${confidence.label.toLowerCase()} (score ${confidence.score}/100).`);
  }

  lines.push(`Recalculated ${updatedAt}.`);

  return { headline: "Why this estimate?", lines };
}
