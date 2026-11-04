/**
 * The single orchestration point for Cycle Intelligence.
 *
 * Every engine is a pure function of the normalised record, and this file is
 * the only place that wires them together. One record in, one result out — no
 * React, no storage, no clock, so the same input always produces the same
 * output and any edit or deletion in the record changes every dependent
 * engine on the next call.
 *
 * Order matters: the baseline feeds the forecast, the forecast feeds the phase,
 * the backtest feeds both the forecast window and the confidence score.
 */

import { buildBaseline } from "./baseline";
import { runBacktest } from "./backtest";
import { assessConfidence } from "./confidence";
import { forecastCycle } from "./forecast";
import { phaseEstimate } from "./phase";
import { analyseSymptoms } from "./symptoms";
import { detectChanges } from "./variability";
import { buildBrief, buildInsights, explainForecast } from "./brief";
import { MODEL_VERSION, type CycleRecord, type IntelligenceResult } from "./types";

export function analyseCycle(record: CycleRecord): IntelligenceResult {
  const baseline = buildBaseline(record);
  const backtest = runBacktest(baseline.starts);
  const forecast = forecastCycle(baseline, record.today, backtest);
  const phase = phaseEstimate({ record, baseline, forecast });
  const confidence = assessConfidence({ baseline, backtest });
  const symptoms = analyseSymptoms(record, baseline);
  const changes = detectChanges(record, baseline);
  const insights = buildInsights({ baseline, forecast, confidence, symptoms, changes });
  const brief = buildBrief({ baseline, forecast, phase, confidence, insights });
  const generatedAt = `${record.today}T00:00:00.000Z`;
  const explanation = explainForecast({
    baseline,
    forecast,
    confidence,
    backtest,
    updatedAt: generatedAt,
  });

  return {
    version: MODEL_VERSION,
    generatedAt,
    record,
    baseline,
    forecast,
    phase,
    confidence,
    backtest,
    symptoms,
    changes,
    insights,
    brief,
    explanation,
  };
}
