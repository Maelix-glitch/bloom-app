/**
 * Bloom — Cycle domain types. Raw observations stay separate from derived
 * values everywhere: `CycleEntry` is what the user logged, `CycleModel` is
 * what we calculated from it.
 */

export type FlowValue = "none" | "spotting" | "light" | "medium" | "heavy";
export type MucusValue = "dry" | "sticky" | "creamy" | "watery" | "egg-white";
export type LhValue = "negative" | "positive";
export type ActivityValue = "none" | "protected" | "unprotected";
export type ContraceptiveValue = "none" | "pill" | "condom" | "iud" | "other";
export type MoodValue = "Low" | "Flat" | "Okay" | "Good" | "Energized";

export type PhaseKey = "menstrual" | "follicular" | "ovulation" | "luteal";
export type ReproductivePhaseKey = "follicular" | "ovulation" | "luteal";
export type BleedingState = "unlogged" | FlowValue;

export const PHASE_LABEL: Record<PhaseKey, string> = {
  menstrual: "Menstrual",
  follicular: "Follicular",
  ovulation: "Ovulation window",
  luteal: "Luteal",
};

export type EvidenceSource =
  "user" | "correction" | "imported" | "confirmed" | "derived" | "predicted" | "baseline";
export type EvidenceConfidence = "high" | "medium" | "low";
export type EvidenceStatus = "observed" | "estimated" | "corrected" | "unknown" | "conflict";

export interface Provenance {
  source: EvidenceSource;
  confidence: EvidenceConfidence;
  status: EvidenceStatus;
  reason: string;
}

/** A single logged day — exactly the shape persisted in `cycle_entries`. */
export interface CycleEntry {
  date: string; // local calendar day, YYYY-MM-DD
  cycle_day: number;
  phase: PhaseKey | null;
  flow: FlowValue | null;
  temperature: number | null; // °C, only when actually measured
  cervical_mucus: MucusValue | null;
  lh_test: LhValue | null;
  pain_level: number | null; // 0–5
  sexual_activity: ActivityValue | null;
  contraceptive: ContraceptiveValue | null;
  energy: number | null; // 1–5
  sleep_hours: number | null;
  mood: MoodValue | null;
  symptoms: string[];
  notes: string | null;
  next_period_in_days: number | null;
  logged_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export type Confidence = "assumed" | "early" | "fair" | "strong";
export type DataSufficiency =
  | "no_data"
  | "first_observation"
  | "partial_cycle"
  | "one_completed_cycle"
  | "multiple_cycles"
  | "strong_personal_history";

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  assumed: "Based on a general pattern — no personal history yet",
  early: "Based on your first cycle",
  fair: "Building from a few cycles",
  strong: "Based on your own history",
};

export interface PeriodRun {
  start: string;
  /** Latest logged bleeding date in this cluster; not a confirmed period end unless an episode says so. */
  end: string;
  /** Calendar span from first to latest logged bleeding date; not a confirmed duration for open/unresolved episodes. */
  days: number;
  observedDates?: string[];
  inferredGapDates?: string[];
  provenance?: Provenance;
}

export interface PeriodEpisode {
  start: string;
  status: "open" | "completed" | "unresolved";
  /** Last logged bleeding day only when the end is supported by explicit no-flow or a following start. */
  confirmedEnd: string | null;
  observedBleedingDates: string[];
  unknownGapDates: string[];
  explicitNoFlowDate: string | null;
  nextPeriodStart: string | null;
  observedBleedingDays: number;
  confirmedDuration: number | null;
  provenance: Provenance;
}

export interface CompletedCycle {
  index: number;
  start: string;
  lengthDays: number;
  provenance?: Provenance;
}

export interface PredictionEvent {
  id:
    | "bleeding-window"
    | "next-period"
    | "ovulation"
    | "fertile-window"
    | "pms-window"
    | "phase-change";
  label: string;
  /** Single date, or null when the event is a range. */
  date: string | null;
  rangeStart: string | null;
  rangeEnd: string | null;
  /** ± half-width in days when we express uncertainty as a margin. */
  plusMinusDays: number | null;
  daysAway: number;
  detail: string;
  /** true = derived estimate; false/absent = observed evidence. */
  predicted: boolean;
  provenance?: Provenance;
  generatedFromVersion?: string;
}

export interface CycleChange {
  id: string;
  date: string;
  at: string;
  kind: "add" | "edit" | "delete" | "preference";
  before: Partial<CycleEntry> | null;
  after: Partial<CycleEntry> | null;
  message: string;
  previousEstimate?: {
    phase: PhaseKey | null;
    bleedingState?: BleedingState;
    bleedingProvenance?: Provenance;
    reproductivePhase?: ReproductivePhaseKey | null;
    reproductiveProvenance?: Provenance;
    provenance: Provenance;
  } | null;
  forecastChanged?: boolean;
}

export interface CycleIssue {
  id: string;
  severity: "info" | "warning";
  message: string;
  date?: string;
}

export interface CycleModel {
  today: string;
  lastPeriodStart: string | null;
  currentDay: number | null; // 1-based; null before any period logged
  currentPhase: PhaseKey | null;
  currentProvenance: Provenance;
  currentBleedingState: BleedingState;
  currentBleedingProvenance: Provenance;
  currentReproductivePhase: ReproductivePhaseKey | null;
  currentReproductiveProvenance: Provenance;
  completed: CompletedCycle[];
  periodRuns: PeriodRun[];
  periodEpisodes: PeriodEpisode[];
  currentRun: PeriodRun | null;
  currentPeriodEpisode: PeriodEpisode | null;
  average: number | null;
  median: number | null;
  stdDev: number | null;
  variabilityPercent: number | null;
  rangeMin: number | null;
  rangeMax: number | null;
  periodLengthAverage: number | null;
  estimatedPeriodLength: number;
  confidence: Confidence;
  dataSufficiency: DataSufficiency;
  usesDefaultAssumption: boolean; // general pattern until personal data exists
  baselineCycleLength: number;
  calculationVersion: string;
  issues: CycleIssue[];
  events: PredictionEvent[];
  /** Legacy primary display phase. Use `dayStateFor` for UI truth. */
  dayPhase: (day: number) => PhaseKey;
  /** Reproductive phase is independent from bleeding; follicular begins at cycle day 1. */
  reproductivePhaseFor: (day: number) => ReproductivePhaseKey;
  ovulationDay: number | null;
  lutealLength: number;
  observedEvidence: {
    lhPositiveDates: string[];
    bbtShiftDate: string | null;
    eggWhiteDates: string[];
  };
}

export interface Recommendation {
  id: string;
  category: "prepare" | "reflect" | "log" | "care" | "plan";
  title: string;
  body: string;
  reason: string;
  weight: 1 | 2; // 1 = primary
}

/** Compact, summarized context — what the assistant may read. Never raw history. */
export interface CycleContext {
  generatedAt: string;
  calculationVersion: string;
  today: string;
  currentDay: number | null;
  currentPhase: PhaseKey | null;
  currentProvenance: Provenance;
  confidence: Confidence;
  dataSufficiency: DataSufficiency;
  usesDefaultAssumption: boolean;
  baselineCycleLength: number;
  completedCount: number;
  recentLengths: number[];
  average: number | null;
  median: number | null;
  rangeMin: number | null;
  rangeMax: number | null;
  variabilityPercent: number | null;
  periodLengthAverage: number | null;
  estimatedPeriodLength: number;
  currentPeriodEpisode: PeriodEpisode | null;
  recentCorrections: CycleChange[];
  issues: CycleIssue[];
  events: PredictionEvent[];
  loggedDays30: number;
  observedPeriodDays: string[];
  explicitNoFlowDays: string[];
  unloggedRecentDays: string[];
  estimatedPeriodDays: string[];
  bleedingState: BleedingState;
  reproductivePhase: ReproductivePhaseKey | null;
  reproductiveProvenance: Provenance;
  recentFlow: { date: string; flow: FlowValue | null; provenance: Provenance }[];
  recentMood: { date: string; mood: MoodValue }[];
  recentEnergy: { date: string; energy: number }[];
  recentSymptoms: { date: string; symptoms: string[] }[];
  observedEvidence: CycleModel["observedEvidence"];
  highPainDays30: number;
}

export type DayState = {
  logged: CycleEntry | null;
  /** Primary user-facing state: observed bleeding wins; unknown stays null. */
  phase: PhaseKey | null;
  /** Bleeding state is separate from reproductive phase. Missing row = unlogged, not no-flow. */
  bleedingState: BleedingState;
  bleedingProvenance: Provenance;
  reproductivePhase: ReproductivePhaseKey | null;
  reproductiveProvenance: Provenance;
  cycleDay: number | null;
  predictedPeriod: boolean;
  predictedFertile: boolean;
  predictedOvulation: boolean;
  pms: boolean;
  provenance: Provenance;
  conflict: CycleIssue | null;
};
