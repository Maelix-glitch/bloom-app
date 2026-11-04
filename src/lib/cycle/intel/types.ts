/**
 * Cycle Intelligence — explicit engine contracts.
 *
 * Every engine takes plain data and returns plain data. Nothing here imports
 * React, storage or the network, so the whole pipeline is reproducible and
 * testable, and a future model can replace one engine without touching the UI.
 */

import type { PhaseKey } from "../types";

/** Bump when a calculation changes meaning — stored with every result. */
export const MODEL_VERSION = "intel-2.0.0";

export type ConfidenceLevel = "none" | "low" | "moderate" | "good";
export type DataSufficiency =
  | "none"
  | "one_start"
  | "one_interval"
  | "few_cycles"
  | "established";

/** One observed day. Absent fields mean "not recorded", never "no symptom". */
export interface CycleDayRecord {
  date: string;
  flow: string | null;
  symptoms: string[];
  mood: string | null;
  energy: number | null;
  sleepHours: number | null;
  pain: number | null;
}

/** One bleeding period. `end` is only present when the user recorded it. */
export interface CyclePeriodRecord {
  start: string;
  end: string | null;
  bleedingDays: number | null;
}

/** The normalised input every engine reads. */
export interface CycleRecord {
  today: string;
  periods: CyclePeriodRecord[];
  days: CycleDayRecord[];
}

export interface Baseline {
  starts: string[];
  /** Every observed start-to-start interval, including unusual ones. */
  intervals: number[];
  /** Intervals inside the plausible range used for the statistics. */
  plausible: number[];
  /** Intervals retained in history but set aside as unusual. */
  unusual: number[];
  count: number;
  median: number | null;
  mean: number | null;
  min: number | null;
  max: number | null;
  iqr: number | null;
  mad: number | null;
  stdev: number | null;
  cvPercent: number | null;
  recencyWeighted: number | null;
  bleedingMedian: number | null;
  bleedingCount: number;
  /** Share of periods with a recorded end, 0–1. */
  completeness: number;
  /** Share of the last 90 days carrying a daily record, 0–1. */
  coverage: number;
  lastStart: string | null;
  daysSinceLastStart: number | null;
  sufficiency: DataSufficiency;
}

export interface ForecastWindow {
  point: string;
  from: string;
  to: string;
  daysAway: number;
}

export interface ForecastResult {
  available: boolean;
  /** "none" < "preliminary" (one interval) < "personal" (two or more). */
  status: "none" | "preliminary" | "personal";
  next: ForecastWindow | null;
  upcoming: { start: string; from: string; to: string }[];
  cycleLength: { point: number; from: number; to: number } | null;
  /** Half-width of the date window, in days. */
  halfWidth: number;
  bleedingWindow: { from: string; to: string } | null;
  intervalsUsed: number;
  method: string;
}

export interface PhaseResult {
  key: PhaseKey | null;
  label: string;
  day: number | null;
  expectedLength: number | null;
  certainty: "observed" | "estimated" | "unknown";
  window: { from: string; to: string } | null;
  note: string;
  overdueDays: number;
}

export interface ConfidenceFactor {
  id: string;
  label: string;
  detail: string;
  effect: number;
}

export interface ConfidenceAssessment {
  level: ConfidenceLevel;
  score: number;
  label: string;
  reason: string;
  factors: ConfidenceFactor[];
}

export interface BacktestPrediction {
  target: string;
  predicted: string;
  errorDays: number;
  intervalsUsed: number;
}

export interface BacktestResult {
  predictions: BacktestPrediction[];
  count: number;
  meanAbsError: number | null;
  medianAbsError: number | null;
  withinTwo: number | null;
  withinThree: number | null;
  improving: boolean | null;
}

export type InsightKind = "baseline" | "change" | "symptom" | "variability" | "data";

export interface InsightEvidence {
  label: string;
  value: string;
}

export interface Insight {
  id: string;
  kind: InsightKind;
  title: string;
  body: string;
  evidence: InsightEvidence[];
  strength: "low" | "moderate" | "good";
}

export interface ChangeFinding {
  id: string;
  kind: "length" | "variability" | "bleeding" | "unusual";
  headline: string;
  detail: string;
  evidence: InsightEvidence[];
  deltaDays: number | null;
}

export interface SymptomPattern {
  symptom: string;
  daysLogged: number;
  cyclesSeen: number;
  totalCycles: number;
  shareOfCycles: number;
  dominantPhase: PhaseKey | null;
  medianCycleDay: number | null;
}

export interface PhaseMetricTally {
  phase: PhaseKey;
  average: number | null;
  n: number;
}

export interface PhaseMetric {
  metric: "energy" | "mood";
  label: string;
  byPhase: PhaseMetricTally[];
  n: number;
  meaningful: boolean;
  highPhase: PhaseKey | null;
  lowPhase: PhaseKey | null;
  gap: number | null;
}

export interface SymptomAnalysis {
  patterns: SymptomPattern[];
  metrics: PhaseMetric[];
  topSymptom: string | null;
  sufficient: boolean;
  note: string;
}

export interface Explanation {
  headline: string;
  lines: string[];
}

export interface CycleBrief {
  headline: string;
  lines: string[];
}

export interface IntelligenceResult {
  version: string;
  generatedAt: string;
  record: CycleRecord;
  baseline: Baseline;
  forecast: ForecastResult;
  phase: PhaseResult;
  confidence: ConfidenceAssessment;
  backtest: BacktestResult;
  symptoms: SymptomAnalysis;
  changes: ChangeFinding[];
  insights: Insight[];
  brief: CycleBrief;
  explanation: Explanation;
}
