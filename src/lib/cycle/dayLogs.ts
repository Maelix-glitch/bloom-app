/**
 * Bloom — advanced daily log (pure core).
 *
 * Period entries answer "when did I bleed?". Daily logs answer "what was it
 * like?" — symptoms, mood, energy, pain, sleep and, if someone tracks them,
 * temperature, cervical mucus and LH tests. Everything here is pure: no React,
 * no storage, no clock. Feed it the day logs plus the cycle analysis and it
 * hands back aggregated, phase-aware numbers.
 *
 * None of this is diagnostic. It is a record of what a person noticed,
 * grouped so patterns are easier to see.
 */

import {
  diffDays,
  isValidDateKey,
  type CycleAnalysis,
  type FlowLevel,
  type Phase,
} from "./predict";

/* --------------------------------- model --------------------------------- */

export type MoodValue = "rough" | "low" | "okay" | "good" | "great";
export type MucusValue = "dry" | "sticky" | "creamy" | "watery" | "egg-white";
export type LhValue = "negative" | "positive";
export type DayFlow = FlowLevel | "none";

export const MOOD_VALUES: MoodValue[] = ["rough", "low", "okay", "good", "great"];
export const MOOD_SCORE: Record<MoodValue, number> = {
  rough: 1,
  low: 2,
  okay: 3,
  good: 4,
  great: 5,
};
export const MOOD_LABEL: Record<MoodValue, string> = {
  rough: "Rough",
  low: "Low",
  okay: "Okay",
  good: "Good",
  great: "Great",
};

export const SYMPTOMS = [
  "cramps",
  "headache",
  "bloating",
  "tiredness",
  "back pain",
  "breast tenderness",
  "nausea",
  "acne",
  "cravings",
  "mood swings",
  "poor sleep",
  "low libido",
  "dizziness",
  "digestive upset",
] as const;
export type Symptom = (typeof SYMPTOMS)[number] | string;

export const MUCUS_LABEL: Record<MucusValue, string> = {
  dry: "Dry",
  sticky: "Sticky",
  creamy: "Creamy",
  watery: "Watery",
  "egg-white": "Egg white",
};

export const FLOW_SCORE: Record<DayFlow, number> = {
  none: 0,
  light: 1,
  medium: 2,
  heavy: 3,
};

/** What the user logs about one calendar day. Everything is optional. */
export interface DayLog {
  /** YYYY-MM-DD — the identity of the entry. */
  date: string;
  flow?: DayFlow | null;
  symptoms?: string[] | null;
  mood?: MoodValue | null;
  energy?: number | null; // 1–5
  pain?: number | null; // 0–5
  sleep?: number | null; // hours
  temperature?: number | null; // °C
  mucus?: MucusValue | null;
  lh?: LhValue | null;
  notes?: string | null;
  updatedAt?: string | null;
}

/* ------------------------------ phase lookup ------------------------------ */

export interface DayPlacement {
  /** 1-based day within the cycle this date falls in. */
  cycleDay: number;
  phase: Phase;
  /** True when the date sits in a cycle before the last logged start, so the
   *  placement is reconstructed from the average rather than observed. */
  reconstructed: boolean;
}

/**
 * Where a date sits in the cycle, using the analysis as the map. Dates before
 * the last logged start are wrapped backwards by the average length — clearly
 * flagged as reconstructed, because only the last start was actually observed.
 */
export function placeDate(analysis: CycleAnalysis, date: string): DayPlacement | null {
  if (!analysis.lastStart || !isValidDateKey(date)) return null;
  const length = Math.max(1, Math.round(analysis.averageLength));
  let offset = diffDays(analysis.lastStart, date);
  let reconstructed = false;
  if (offset < 0) {
    // walk back whole cycles until the date lands inside one
    const cyclesBack = Math.floor(-offset / length) + 1;
    offset += cyclesBack * length;
    reconstructed = true;
  } else if (offset >= length) {
    reconstructed = true;
  }
  const cycleDay = (offset % length) + 1;
  const phase = phaseForDay(analysis, cycleDay);
  return { cycleDay, phase, reconstructed };
}

function phaseForDay(analysis: CycleAnalysis, cycleDay: number): Phase {
  const ovDay = analysis.ovulationDay ?? Math.max(1, Math.round(analysis.averageLength) - 14);
  if (cycleDay <= analysis.periodLength) return "menstrual";
  if (cycleDay >= ovDay - 1 && cycleDay <= ovDay + 1) return "ovulation";
  if (cycleDay < ovDay) return "follicular";
  return "luteal";
}

/* ------------------------------- validation ------------------------------- */

export type DayFieldErrors = Partial<
  Record<"date" | "energy" | "pain" | "sleep" | "temperature" | "notes", string>
>;

export function validateDayLog(draft: DayLog, today: string): DayFieldErrors {
  const errors: DayFieldErrors = {};
  if (!isValidDateKey(draft.date)) {
    errors.date = "Pick a real date — the log hangs off it.";
  } else if (diffDays(today, draft.date) > 0) {
    errors.date = "That date hasn't happened yet. Log today or an earlier day.";
  }

  const num = (
    value: number | null | undefined,
    min: number,
    max: number,
    label: string,
    unit: string,
  ): string | undefined => {
    if (value === null || value === undefined || Number.isNaN(value)) return undefined;
    if (value < min || value > max) return `${label} should be between ${min} and ${max}${unit}.`;
    return undefined;
  };

  const energy = num(draft.energy, 1, 5, "Energy", "");
  if (energy) errors.energy = energy;
  const pain = num(draft.pain, 0, 5, "Pain", "");
  if (pain) errors.pain = pain;
  const sleep = num(draft.sleep, 0, 24, "Sleep", " hours");
  if (sleep) errors.sleep = sleep;
  const temp = num(draft.temperature, 34, 42, "Temperature", "°C");
  if (temp) errors.temperature = temp;

  if ((draft.notes ?? "").length > 400) {
    errors.notes = "Notes are capped at 400 characters.";
  }
  if ((draft.symptoms ?? []).length > 12) {
    errors.notes = "Pick up to 12 symptoms per day.";
  }
  return errors;
}

/** True when the day carries no observation at all. */
export function isEmptyDay(draft: DayLog): boolean {
  const blank = (v: number | null | undefined) => v === null || v === undefined || Number.isNaN(v);
  return (
    !draft.flow &&
    (draft.symptoms ?? []).length === 0 &&
    !draft.mood &&
    blank(draft.energy) &&
    blank(draft.pain) &&
    blank(draft.sleep) &&
    blank(draft.temperature) &&
    !draft.mucus &&
    !draft.lh &&
    !(draft.notes ?? "").trim()
  );
}

/* ------------------------------- aggregation ------------------------------ */

export interface SymptomTally {
  key: string;
  count: number;
  /** Share of logged days that mention it, 0–1. */
  share: number;
  /** Phase it shows up in most often, when there are enough days. */
  topPhase: Phase | null;
}

export interface PhaseAverage {
  phase: Phase;
  days: number;
  /** Mean value across logged days in this phase, null when there are none. */
  average: number | null;
  /** Lowest and highest single value seen. */
  min: number | null;
  max: number | null;
}

export interface FlowCurvePoint {
  /** 1-based day of the period. */
  day: number;
  average: number;
  days: number;
}

/** One symptom row, split across the four phases — for the heat grid. */
export interface SymptomPhaseRow {
  key: string;
  total: number;
  /** Raw day counts per phase. */
  counts: Record<Phase, number>;
  /** Counts relative to this symptom's own total, 0–1. */
  shares: Record<Phase, number>;
}

export interface DayLogAnalysis {
  total: number;
  firstDate: string | null;
  lastDate: string | null;
  /** Distinct days logged in the last 30 days — a gentle consistency signal. */
  lastThirty: number;
  symptoms: SymptomTally[];
  moodByPhase: PhaseAverage[];
  energyByPhase: PhaseAverage[];
  painByPhase: PhaseAverage[];
  sleepByPhase: PhaseAverage[];
  flowCurve: FlowCurvePoint[];
  /** Temperature readings in date order, for anyone tracking BBT. */
  temperatures: { date: string; value: number; phase: Phase }[];
  mucus: { date: string; value: MucusValue; phase: Phase }[];
  lhPositives: { date: string; cycleDay: number | null }[];
  /** Symptom × phase counts, for the heat grid. */
  symptomPhase: SymptomPhaseRow[];
  /** Consecutive days with a log, counting back from today (or yesterday). */
  streak: number;
  /** Longest run of consecutive logged days in the whole record. */
  bestStreak: number;
  /** A one-sentence read on the person's own pattern, never diagnostic. */
  headline: string | null;
  /** Plain-language patterns worth surfacing, never diagnostic. */
  notes: string[];
}

const PHASE_ORDER: Phase[] = ["menstrual", "follicular", "ovulation", "luteal"];

function groupByPhase<T>(rows: { phase: Phase; value: number }[]): PhaseAverage[] {
  return PHASE_ORDER.map((phase) => {
    const values = rows.filter((r) => r.phase === phase).map((r) => r.value);
    return {
      phase,
      days: values.length,
      average: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null,
      min: values.length > 0 ? Math.min(...values) : null,
      max: values.length > 0 ? Math.max(...values) : null,
    };
  });
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Aggregate daily logs against the cycle map. Pure: same inputs, same output.
 * Days that can't be placed in a cycle (no period logged yet) are counted in
 * the totals but skipped in the phase breakdowns.
 */
export function analyzeDayLogs(days: readonly DayLog[], analysis: CycleAnalysis): DayLogAnalysis {
  const sorted = [...days]
    .filter((d) => d && isValidDateKey(d.date))
    .sort((a, b) => a.date.localeCompare(b.date));

  const placed = sorted
    .map((d) => ({ day: d, place: placeDate(analysis, d.date) }))
    .filter((row): row is { day: DayLog; place: DayPlacement } => row.place !== null);

  const moodRows: { phase: Phase; value: number }[] = [];
  const energyRows: { phase: Phase; value: number }[] = [];
  const painRows: { phase: Phase; value: number }[] = [];
  const sleepRows: { phase: Phase; value: number }[] = [];
  const temperatures: DayLogAnalysis["temperatures"] = [];
  const mucus: DayLogAnalysis["mucus"] = [];
  const lhPositives: DayLogAnalysis["lhPositives"] = [];

  const symptomCounter = new Map<string, { count: number; phases: Map<Phase, number> }>();
  /** day-of-period → intensity samples, taken from logged bleeding days */
  const flowSamples = new Map<number, number[]>();

  for (const { day, place } of placed) {
    if (day.mood) moodRows.push({ phase: place.phase, value: MOOD_SCORE[day.mood] });
    if (typeof day.energy === "number") energyRows.push({ phase: place.phase, value: day.energy });
    if (typeof day.pain === "number") painRows.push({ phase: place.phase, value: day.pain });
    if (typeof day.sleep === "number") sleepRows.push({ phase: place.phase, value: day.sleep });
    if (typeof day.temperature === "number") {
      temperatures.push({ date: day.date, value: day.temperature, phase: place.phase });
    }
    if (day.mucus) mucus.push({ date: day.date, value: day.mucus, phase: place.phase });
    if (day.lh === "positive") {
      lhPositives.push({ date: day.date, cycleDay: place.cycleDay });
    }

    for (const symptom of day.symptoms ?? []) {
      const key = symptom.trim().toLowerCase();
      if (!key) continue;
      const entry = symptomCounter.get(key) ?? { count: 0, phases: new Map<Phase, number>() };
      entry.count += 1;
      entry.phases.set(place.phase, (entry.phases.get(place.phase) ?? 0) + 1);
      symptomCounter.set(key, entry);
    }

    if (day.flow && day.flow !== "none" && place.cycleDay <= analysis.periodLength) {
      const list = flowSamples.get(place.cycleDay) ?? [];
      list.push(FLOW_SCORE[day.flow]);
      flowSamples.set(place.cycleDay, list);
    }
  }

  const symptoms: SymptomTally[] = [...symptomCounter.entries()]
    .map(([key, value]) => {
      let topPhase: Phase | null = null;
      let best = 0;
      for (const [phase, n] of value.phases) {
        if (n > best) {
          best = n;
          topPhase = phase;
        }
      }
      return {
        key,
        count: value.count,
        share: sorted.length > 0 ? value.count / sorted.length : 0,
        topPhase: best >= 2 ? topPhase : null,
      };
    })
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));

  const flowCurve: FlowCurvePoint[] = [...flowSamples.entries()]
    .map(([day, values]) => ({
      day,
      average: round1(values.reduce((a, b) => a + b, 0) / values.length),
      days: values.length,
    }))
    .sort((a, b) => a.day - b.day);

  const symptomPhase: SymptomPhaseRow[] = [...symptomCounter.entries()]
    .map(([key, value]) => {
      const counts = { menstrual: 0, follicular: 0, ovulation: 0, luteal: 0 } as Record<
        Phase,
        number
      >;
      for (const [phase, n] of value.phases) counts[phase] = n;
      const shares = { menstrual: 0, follicular: 0, ovulation: 0, luteal: 0 } as Record<
        Phase,
        number
      >;
      for (const phase of PHASE_ORDER)
        shares[phase] = value.count > 0 ? counts[phase]! / value.count : 0;
      return { key, total: value.count, counts, shares };
    })
    .sort((a, b) => b.total - a.total || a.key.localeCompare(b.key))
    .slice(0, 8);

  const { current, best } = streaks(
    sorted.map((d) => d.date),
    analysis.today,
  );

  const lastThirty = analysis.today
    ? sorted.filter((d) => {
        const back = diffDays(d.date, analysis.today);
        return back >= 0 && back < 30;
      }).length
    : 0;

  return {
    total: sorted.length,
    firstDate: sorted[0]?.date ?? null,
    lastDate: sorted[sorted.length - 1]?.date ?? null,
    lastThirty,
    symptoms,
    moodByPhase: groupByPhase(moodRows),
    energyByPhase: groupByPhase(energyRows),
    painByPhase: groupByPhase(painRows),
    sleepByPhase: groupByPhase(sleepRows),
    flowCurve,
    temperatures,
    mucus,
    lhPositives,
    symptomPhase,
    streak: current,
    bestStreak: best,
    headline:
      sorted.length === 0
        ? null
        : buildHeadline(analysis, sorted.length, symptoms, groupByPhase(painRows), current),
    notes: buildNotes(symptoms, groupByPhase(painRows), groupByPhase(moodRows), sorted.length),
  };
}

/* -------------------------- plain-language notes -------------------------- */

/**
 * Consecutive-day runs. The current streak counts back from today, or from
 * yesterday so a day that hasn't been logged *yet* doesn't break it.
 */
export function streaks(
  dates: readonly string[],
  today: string,
): { current: number; best: number } {
  const set = new Set(dates);
  const has = (d: string) => set.has(d);
  let best = 0;
  for (const date of dates) {
    if (has(addDaysKey(date, -1))) continue; // only start counting at a run's beginning
    let run = 0;
    let cursor = date;
    while (has(cursor)) {
      run += 1;
      cursor = addDaysKey(cursor, 1);
    }
    best = Math.max(best, run);
  }
  let current = 0;
  const anchor = has(today) ? today : has(addDaysKey(today, -1)) ? addDaysKey(today, -1) : null;
  if (anchor) {
    let cursor = anchor;
    while (has(cursor)) {
      current += 1;
      cursor = addDaysKey(cursor, -1);
    }
  }
  return { current, best };
}

function addDaysKey(key: string, days: number): string {
  const dt = new Date(`${key}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + days);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(
    dt.getUTCDate(),
  ).padStart(2, "0")}`;
}

function buildHeadline(
  analysis: CycleAnalysis,
  dayCount: number,
  symptoms: SymptomTally[],
  pain: PhaseAverage[],
  streak: number,
): string | null {
  if (dayCount === 0) return null;
  const bits: string[] = [];

  if (analysis.confidence === "high") {
    bits.push(
      `Your cycles are steady — ${analysis.cycleLengths.length} of them inside ±3 days of ${analysis.averageLength.toFixed(1)}.`,
    );
  } else if (analysis.irregular) {
    bits.push(
      `Your cycles move around more than most people's expectations: ±${analysis.variability.toFixed(1)} days across ${analysis.cycleLengths.length}.`,
    );
  } else {
    bits.push(
      `Across ${analysis.cycleLengths.length} logged ${analysis.cycleLengths.length === 1 ? "cycle" : "cycles"}, your average sits at ${analysis.averageLength.toFixed(1)} days.`,
    );
  }

  const top = symptoms[0];
  if (top && top.count >= 3) {
    bits.push(
      top.topPhase
        ? `${cap(top.key)} shows up most, usually in the ${top.topPhase} phase.`
        : `${cap(top.key)} shows up most in your log.`,
    );
  }

  const painiest = pain
    .filter((p) => p.days >= 2)
    .sort((a, b) => (b.average ?? 0) - (a.average ?? 0))[0];
  if (painiest && (painiest.average ?? 0) >= 1) {
    bits.push(`Pain runs highest in the ${painiest.phase} phase.`);
  }
  if (streak >= 3) {
    bits.push(`You've logged ${streak} days in a row.`);
  }
  return bits.slice(0, 3).join(" ");
}

function buildNotes(
  symptoms: SymptomTally[],
  pain: PhaseAverage[],
  mood: PhaseAverage[],
  total: number,
): string[] {
  const notes: string[] = [];
  if (total === 0) return notes;

  const top = symptoms[0];
  if (top && top.count >= 3) {
    notes.push(
      top.topPhase
        ? `${cap(top.key)} is your most logged symptom — ${top.count} days, mostly in the ${top.topPhase} phase.`
        : `${cap(top.key)} is your most logged symptom so far, across ${top.count} days.`,
    );
  }

  const painiest = pain
    .filter((p) => p.days >= 2)
    .sort((a, b) => (b.average ?? 0) - (a.average ?? 0))[0];
  const calmest = pain
    .filter((p) => p.days >= 2)
    .sort((a, b) => (a.average ?? 0) - (b.average ?? 0))[0];
  if (painiest && calmest && painiest.phase !== calmest.phase && (painiest.average ?? 0) > 0) {
    notes.push(
      `Pain scores are highest in the ${painiest.phase} phase (${round1(painiest.average ?? 0)} of 5) and lowest in the ${calmest.phase} phase (${round1(calmest.average ?? 0)}).`,
    );
  }

  const lowMood = mood
    .filter((m) => m.days >= 2)
    .sort((a, b) => (a.average ?? 0) - (b.average ?? 0))[0];
  const highMood = mood
    .filter((m) => m.days >= 2)
    .sort((a, b) => (b.average ?? 0) - (a.average ?? 0))[0];
  if (lowMood && highMood && lowMood.phase !== highMood.phase) {
    notes.push(
      `Mood tends to sit lower in the ${lowMood.phase} phase and higher in the ${highMood.phase} phase in your own log.`,
    );
  }

  return notes.slice(0, 3);
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/* --------------------------------- helpers -------------------------------- */

export function emptyDayLog(date: string): DayLog {
  return {
    date,
    flow: null,
    symptoms: [],
    mood: null,
    energy: null,
    pain: null,
    sleep: null,
    temperature: null,
    mucus: null,
    lh: null,
    notes: null,
  };
}
