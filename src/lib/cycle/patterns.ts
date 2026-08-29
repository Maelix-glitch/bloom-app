/**
 * Pattern + correlation discovery — deterministic, sample-gated.
 * Every finding states its observations ("seen in 4 of your 6 cycles") and
 * keeps interpretation separate and cautious. No causation, no diagnosis.
 */

import type { CycleEntry, CycleModel, PhaseKey } from "./types";

export interface SymptomTiming {
  symptom: string;
  seenInCycles: number;
  totalCycles: number;
  medianCycleDay: number;
}

export interface PhaseTally {
  label: string;
  byPhase: { phase: PhaseKey; avg: number | null; n: number }[];
  n: number;
}

/** Cycle windows from logged starts; each entry is bucketed by its day-in-cycle. */
function cycleWindows(model: CycleModel): { start: string; length: number | null }[] {
  const out: { start: string; length: number | null }[] = model.completed.map((c) => ({
    start: c.start,
    length: c.lengthDays,
  }));
  if (model.lastPeriodStart) {
    out.push({ start: model.lastPeriodStart, length: null });
  }
  return out;
}

export function symptomTimings(entries: CycleEntry[], model: CycleModel): SymptomTiming[] {
  const windows = cycleWindows(model);
  if (windows.length < 3) return [];
  const map = new Map<string, { cycles: Set<number>; days: number[] }>();
  for (const e of entries) {
    for (const symptom of e.symptoms) {
      const idx = windowIndex(e.date, windows);
      if (idx === null) continue;
      const cur = map.get(symptom) ?? { cycles: new Set<number>(), days: [] };
      cur.cycles.add(idx);
      cur.days.push(e.cycle_day);
      map.set(symptom, cur);
    }
  }
  const out: SymptomTiming[] = [];
  for (const [symptom, v] of map) {
    if (v.cycles.size < 2) continue; // "recurring" needs at least two cycles
    const days = [...v.days].sort((a, b) => a - b);
    out.push({
      symptom,
      seenInCycles: v.cycles.size,
      totalCycles: windows.length,
      medianCycleDay: days[Math.floor(days.length / 2)] ?? 1,
    });
  }
  return out.sort((a, b) => b.seenInCycles - a.seenInCycles).slice(0, 4);
}

function windowIndex(
  date: string,
  windows: { start: string; length: number | null }[],
): number | null {
  let best: number | null = null;
  for (let i = 0; i < windows.length; i++) {
    const w = windows[i]!;
    const day = dayFrom(date, w.start) ?? -1;
    if (day < 1) continue;
    if (w.length !== null && day > w.length) continue;
    best = i; // keep the latest window containing this date
  }
  return best;
}

function dayFrom(date: string, start: string): number | null {
  const a = Date.parse(`${start}T00:00:00Z`);
  const b = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 86_400_000) + 1;
}

const MOOD_SCORE: Record<string, number> = { Low: 1, Flat: 2, Okay: 3, Good: 4, Energized: 5 };
const PHASES: PhaseKey[] = ["menstrual", "follicular", "ovulation", "luteal"];

export function phaseTally(
  entries: CycleEntry[],
  model: CycleModel,
  metric: "energy" | "mood",
): PhaseTally {
  const acc = new Map<PhaseKey, { sum: number; n: number }>();
  for (const e of entries) {
    const raw =
      metric === "energy" ? e.energy : e.mood !== null ? (MOOD_SCORE[e.mood] ?? null) : null;
    if (raw === null) continue;
    const phase = e.phase ?? model.dayPhase(e.cycle_day);
    const cur = acc.get(phase) ?? { sum: 0, n: 0 };
    cur.sum += raw;
    cur.n += 1;
    acc.set(phase, cur);
  }
  const byPhase = PHASES.map((p) => {
    const v = acc.get(p);
    return { phase: p, avg: v && v.n > 0 ? v.sum / v.n : null, n: v?.n ?? 0 };
  });
  const total = byPhase.reduce((a, b) => a + b.n, 0);
  return { label: metric, byPhase, n: total };
}

/** Meaningful only with ≥2 observations in at least two phases and a real gap. */
export function isTallyMeaningful(t: PhaseTally): boolean {
  const filled = t.byPhase.filter((p) => p.n >= 2);
  if (filled.length < 2) return false;
  const avgs = filled.map((f) => f.avg ?? 0);
  return Math.max(...avgs) - Math.min(...avgs) >= 0.5;
}

export function sleepVsLength(
  entries: CycleEntry[],
  model: CycleModel,
): { pairs: number; shortAvg: number | null; longAvg: number | null } {
  // per completed cycle: average logged sleep vs that cycle's length
  const recs: { sleep: number; length: number }[] = [];
  for (const c of model.completed) {
    const end = dayOffset(c.start, c.lengthDays);
    const sleeps = entries
      .filter((e) => e.sleep_hours !== null && e.date >= c.start && e.date < end)
      .map((e) => e.sleep_hours!);
    if (sleeps.length >= 3)
      recs.push({ sleep: sleeps.reduce((a, b) => a + b, 0) / sleeps.length, length: c.lengthDays });
  }
  if (recs.length < 4) return { pairs: recs.length, shortAvg: null, longAvg: null };
  const med =
    [...recs.map((r) => r.length)].sort((a, b) => a - b)[Math.floor(recs.length / 2)] ?? 28;
  const short = recs.filter((r) => r.length < med);
  const long = recs.filter((r) => r.length >= med);
  if (short.length < 2 || long.length < 2)
    return { pairs: recs.length, shortAvg: null, longAvg: null };
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  return {
    pairs: recs.length,
    shortAvg: avg(short.map((r) => r.sleep)),
    longAvg: avg(long.map((r) => r.sleep)),
  };
}

function dayOffset(start: string, days: number): string {
  const d = new Date(`${start}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Recurring period-length observation — needs ≥3 completed cycles. */
export function periodLengthPattern(
  model: CycleModel,
): { min: number; max: number; n: number } | null {
  void model;
  return null; // replaced by the runs-based card in Analytics — kept out to avoid duplication
}
