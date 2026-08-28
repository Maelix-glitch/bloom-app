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

export const PHASE_LABEL: Record<PhaseKey, string> = {
  menstrual: "Menstrual",
  follicular: "Follicular",
  ovulation: "Ovulation window",
  luteal: "Luteal",
};

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

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  assumed: "Based on a general pattern — no personal history yet",
  early: "Based on your first cycle",
  fair: "Building from a few cycles",
  strong: "Based on your own history",
};

export interface PeriodRun {
  start: string;
  end: string; // inclusive; === start when only one day logged
  days: number;
}

export interface CompletedCycle {
  index: number;
  start: string;
  lengthDays: number;
}

export interface PredictionEvent {
  id: "next-period" | "ovulation" | "fertile-window" | "pms-window" | "phase-change";
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
}

export interface CycleModel {
  today: string;
  lastPeriodStart: string | null;
  currentDay: number | null; // 1-based; null before any period logged
  currentPhase: PhaseKey | null;
  completed: CompletedCycle[];
  average: number | null;
  median: number | null;
  stdDev: number | null;
  variabilityPercent: number | null;
  rangeMin: number | null;
  rangeMax: number | null;
  periodLengthAverage: number | null;
  confidence: Confidence;
  usesDefaultAssumption: boolean; // 28-day general pattern until personal data exists
  events: PredictionEvent[];
  /** cycle day → phase for painting rings/calendars (observed days override). */
  dayPhase: (day: number) => PhaseKey;
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
  today: string;
  currentDay: number | null;
  currentPhase: PhaseKey | null;
  confidence: Confidence;
  usesDefaultAssumption: boolean;
  completedCount: number;
  recentLengths: number[];
  average: number | null;
  median: number | null;
  rangeMin: number | null;
  rangeMax: number | null;
  variabilityPercent: number | null;
  periodLengthAverage: number | null;
  events: PredictionEvent[];
  loggedDays30: number;
  recentMood: { date: string; mood: MoodValue }[];
  recentEnergy: { date: string; energy: number }[];
  recentSymptoms: { date: string; symptoms: string[] }[];
  observedEvidence: CycleModel["observedEvidence"];
  highPainDays30: number;
}

export type DayState = {
  logged: CycleEntry | null;
  phase: PhaseKey | null;
  predictedPeriod: boolean;
  predictedFertile: boolean;
  predictedOvulation: boolean;
  pms: boolean;
};
