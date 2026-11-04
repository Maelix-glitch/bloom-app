/**
 * Engine 4 — Symptom and pattern intelligence.
 *
 * Correlation only, with the sample printed next to every claim. Thresholds are
 * deliberately conservative: at least three cycles carrying daily records for
 * any pattern, a symptom in at least two cycles and at least three logged
 * occurrences, and a minimum of three observations per phase before an average
 * is compared. Missing days are counted as missing, never as "no symptom".
 */

import { diffDays } from "./dates";
import { mean, median } from "./stats";
import type { Baseline, CycleRecord, PhaseMetric, SymptomAnalysis, SymptomPattern } from "./types";
import type { PhaseKey } from "../types";

/* The app stores moods as rough|low|okay|good|great (see lib/cycle/dayLogs).
   Older records may still carry a capitalised label, so both spellings map. */
const MOOD_SCORE: Record<string, number> = {
  rough: 1,
  low: 2,
  okay: 3,
  good: 4,
  great: 5,
  Rough: 1,
  Low: 2,
  Okay: 3,
  Good: 4,
  Great: 5,
};
const PHASES: PhaseKey[] = ["menstrual", "follicular", "ovulation", "luteal"];

export const MIN_CYCLES_FOR_PATTERN = 3;
export const MIN_OCCURRENCES = 3;
export const MIN_PHASE_OBSERVATIONS = 3;

interface Window {
  start: string;
  end: string | null;
  index: number;
}

function windowsFor(record: CycleRecord, baseline: Baseline): Window[] {
  return baseline.starts.map((start, i) => {
    const next = baseline.starts[i + 1];
    const end = next ? shift(next, -1) : null;
    return { start, end, index: i };
  });
}

function shift(key: string, days: number): string {
  // Local, dependency-free version of addDays for a single subtraction.
  const d = new Date(Date.parse(`${key}T00:00:00Z`) + days * 86_400_000);
  return d.toISOString().slice(0, 10);
}

export function phaseForCycleDay(
  cycleDay: number,
  baseline: Baseline,
  expectedLength: number,
): PhaseKey {
  const menstrualDays = Math.min(8, Math.max(2, Math.round(baseline.bleedingMedian ?? 5)));
  const ovulationDay = Math.max(menstrualDays + 3, expectedLength - 14);
  if (cycleDay <= menstrualDays) return "menstrual";
  if (cycleDay < ovulationDay - 1) return "follicular";
  if (cycleDay <= ovulationDay + 1) return "ovulation";
  return "luteal";
}

function windowFor(date: string, windows: Window[]): { window: Window; cycleDay: number } | null {
  for (let i = windows.length - 1; i >= 0; i -= 1) {
    const w = windows[i]!;
    if (date < w.start) continue;
    if (w.end && date > w.end) continue;
    const cycleDay = diffDays(w.start, date) + 1;
    if (cycleDay < 1) continue;
    return { window: w, cycleDay };
  }
  return null;
}

export function analyseSymptoms(record: CycleRecord, baseline: Baseline): SymptomAnalysis {
  const expectedLength = baseline.median !== null ? Math.round(baseline.median) : null;
  const windows = windowsFor(record, baseline);

  const loggedCycles = new Set<number>();
  const symptomMap = new Map<
    string,
    { occurrences: number; days: number[]; cycles: Set<number>; phases: Map<PhaseKey, number> }
  >();
  const energy = new Map<PhaseKey, number[]>();
  const mood = new Map<PhaseKey, number[]>();

  for (const day of record.days) {
    const hit = windowFor(day.date, windows);
    if (!hit || expectedLength === null) continue;
    loggedCycles.add(hit.window.index);
    const phase = phaseForCycleDay(hit.cycleDay, baseline, expectedLength);

    for (const symptom of day.symptoms) {
      const key = symptom.trim();
      if (!key) continue;
      const entry =
        symptomMap.get(key) ??
        { occurrences: 0, days: [], cycles: new Set<number>(), phases: new Map<PhaseKey, number>() };
      entry.occurrences += 1;
      entry.days.push(hit.cycleDay);
      entry.cycles.add(hit.window.index);
      entry.phases.set(phase, (entry.phases.get(phase) ?? 0) + 1);
      symptomMap.set(key, entry);
    }

    if (day.energy !== null) {
      const bucket = energy.get(phase) ?? [];
      bucket.push(day.energy);
      energy.set(phase, bucket);
    }
    if (day.mood !== null && MOOD_SCORE[day.mood] !== undefined) {
      const bucket = mood.get(phase) ?? [];
      bucket.push(MOOD_SCORE[day.mood]!);
      mood.set(phase, bucket);
    }
  }

  const sufficient = loggedCycles.size >= MIN_CYCLES_FOR_PATTERN;
  const patterns: SymptomPattern[] = [];

  if (sufficient) {
    for (const [symptom, entry] of symptomMap) {
      if (entry.cycles.size < 2 || entry.occurrences < MIN_OCCURRENCES) continue;
      const dominant = [...entry.phases.entries()].sort((a, b) => b[1] - a[1])[0];
      patterns.push({
        symptom,
        daysLogged: entry.occurrences,
        cyclesSeen: entry.cycles.size,
        totalCycles: loggedCycles.size,
        shareOfCycles: entry.cycles.size / loggedCycles.size,
        dominantPhase:
          dominant && dominant[1] / entry.occurrences >= 0.5 ? dominant[0] : null,
        medianCycleDay: median(entry.days),
      });
    }
  }

  patterns.sort((a, b) => b.cyclesSeen - a.cyclesSeen || b.daysLogged - a.daysLogged);

  const metrics: PhaseMetric[] = (["energy", "mood"] as const).map((metric) => {
    const source = metric === "energy" ? energy : mood;
    const byPhase = PHASES.map((phase) => {
      const values = source.get(phase) ?? [];
      return {
        phase,
        average: values.length > 0 ? mean(values) : null,
        n: values.length,
      };
    });
    const filled = byPhase.filter((p) => p.n >= MIN_PHASE_OBSERVATIONS && p.average !== null);
    const high = [...filled].sort((a, b) => (b.average ?? 0) - (a.average ?? 0))[0] ?? null;
    const low = [...filled].sort((a, b) => (a.average ?? 0) - (b.average ?? 0))[0] ?? null;
    const gap =
      high && low && high.phase !== low.phase ? (high.average ?? 0) - (low.average ?? 0) : null;
    return {
      metric,
      label: metric === "energy" ? "Energy" : "Mood",
      byPhase,
      n: byPhase.reduce((acc, p) => acc + p.n, 0),
      meaningful: filled.length >= 2 && gap !== null && gap >= 0.5,
      highPhase: high && gap !== null && gap >= 0.5 ? high.phase : null,
      lowPhase: low && gap !== null && gap >= 0.5 ? low.phase : null,
      gap,
    };
  });

  const note = !sufficient
    ? `Recorded symptoms need at least ${MIN_CYCLES_FOR_PATTERN} cycles with daily logs before Bloom will describe a pattern. You have ${loggedCycles.size}.`
    : patterns.length === 0
      ? "No symptom has recurred often enough across cycles to call it a pattern yet — that is a limit of the sample, not a finding."
      : "";

  return {
    patterns: patterns.slice(0, 5),
    metrics,
    topSymptom: patterns[0]?.symptom ?? null,
    sufficient,
    note,
  };
}
