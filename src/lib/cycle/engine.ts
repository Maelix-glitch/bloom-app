/**
 * Bloom — Cycle engine. Pure, deterministic, timezone-safe.
 * All day arithmetic runs on local YYYY-MM-DD keys via UTC epochs so DST
 * can never shift a logged day. Observed values are never overwritten by
 * estimates — the two live in separate fields, per the data-quality rules.
 */

import type {
  CompletedCycle,
  Confidence,
  CycleContext,
  CycleEntry,
  CycleModel,
  DayState,
  MoodValue,
  PeriodRun,
  PhaseKey,
  PredictionEvent,
} from "./types";

/* ------------------------------ date helpers ------------------------------ */

export const pad2 = (n: number) => String(n).padStart(2, "0");

export function localDateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

const dayMs = 86_400_000;

export function keyToEpoch(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function addDays(key: string, days: number): string {
  const d = new Date(keyToEpoch(key) + days * dayMs);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

export function diffDays(from: string, to: string): number {
  return Math.round((keyToEpoch(to) - keyToEpoch(from)) / dayMs);
}

const MEAN_LUTEAL = 14; // the standard calendar assumption — always labeled as such
const DEFAULT_CYCLE = 28; // general pattern, used only until personal history exists

/* ----------------------------- entry assembly ----------------------------- */

/** Merge sparse partial writes into one normalized per-day record. */
export function normalizeEntry(partial: Partial<CycleEntry> & { date: string }): CycleEntry {
  return {
    date: partial.date,
    cycle_day: partial.cycle_day ?? 1,
    phase: partial.phase ?? null,
    flow: partial.flow ?? null,
    temperature: partial.temperature ?? null,
    cervical_mucus: partial.cervical_mucus ?? null,
    lh_test: partial.lh_test ?? null,
    pain_level: partial.pain_level ?? null,
    sexual_activity: partial.sexual_activity ?? null,
    contraceptive: partial.contraceptive ?? null,
    energy: partial.energy ?? null,
    sleep_hours: partial.sleep_hours ?? null,
    mood: partial.mood ?? null,
    symptoms: Array.isArray(partial.symptoms)
      ? partial.symptoms.filter((s) => typeof s === "string")
      : [],
    notes: partial.notes ?? null,
    next_period_in_days: partial.next_period_in_days ?? null,
    logged_at: partial.logged_at ?? null,
    created_at: partial.created_at ?? null,
    updated_at: partial.updated_at ?? null,
  };
}

const hasFlow = (e: CycleEntry) => Boolean(e.flow && e.flow !== "none");
const isSpottingOrHeavier = (e: CycleEntry) => hasFlow(e);

/**
 * Group logged flow days into period runs. A single unlogged day between
 * flow days does NOT end a run (missing log ≠ no flow), but two or more
 * missing days do.
 */
export function periodRuns(entries: CycleEntry[]): PeriodRun[] {
  const flowDays = entries
    .filter(isSpottingOrHeavier)
    .map((e) => e.date)
    .sort();
  const runs: PeriodRun[] = [];
  let start: string | null = null;
  let prev: string | null = null;
  for (const day of flowDays) {
    if (start === null || prev === null) {
      start = day;
      prev = day;
      continue;
    }
    const gap = diffDays(prev, day);
    if (gap <= 2) prev = day;
    else {
      runs.push({ start, end: prev, days: diffDays(start, prev) + 1 });
      start = day;
      prev = day;
    }
  }
  if (start && prev) runs.push({ start, end: prev, days: diffDays(start, prev) + 1 });
  return runs;
}

export function completedCycles(runs: PeriodRun[]): CompletedCycle[] {
  const out: CompletedCycle[] = [];
  for (let i = 1; i < runs.length; i++) {
    const len = diffDays(runs[i - 1]!.start, runs[i]!.start);
    if (len >= 12 && len <= 90)
      out.push({ index: out.length, start: runs[i - 1]!.start, lengthDays: len });
    // <12d or >90d gaps are almost certainly missing logs, not cycles —
    // they are excluded from statistics and the methodology panel says so.
  }
  return out;
}

/* ------------------------------- statistics ------------------------------- */

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const medianOf = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : ((s[mid - 1] ?? 0) + (s[mid] ?? 0)) / 2;
};
const stdOf = (xs: number[], mu: number | null) => {
  if (xs.length < 2 || mu === null) return null;
  const v = xs.reduce((a, x) => a + (x - mu) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(v);
};

export function confidenceFor(completedCount: number): Confidence {
  if (completedCount >= 5) return "strong";
  if (completedCount >= 2) return "fair";
  if (completedCount === 1) return "early";
  return "assumed";
}

/* -------------------------------- the model ------------------------------- */

export function buildCycleModel(
  entries: CycleEntry[],
  today = localDateKey(),
  opts: { defaultCycle?: number | null } = {},
): CycleModel {
  const assumed = Math.min(45, Math.max(20, Math.round(opts.defaultCycle ?? DEFAULT_CYCLE)));
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const runs = periodRuns(sorted);
  const completed = completedCycles(runs);
  const recent = completed.slice(-6).map((c) => c.lengthDays);

  const usesDefault = completed.length === 0;
  const avg = usesDefault ? assumed : mean(recent);
  const med = recent.length >= 3 ? medianOf(recent) : null;
  const std = usesDefault ? null : stdOf(recent, avg);
  const variabilityPercent = std !== null && avg ? Math.round((std / avg) * 100) : null;
  const rangeMin = recent.length ? Math.min(...recent) : null;
  const rangeMax = recent.length ? Math.max(...recent) : null;
  const periodLengthAverage = mean(runs.map((r) => r.days));

  const lastStart = runs.length ? (runs[runs.length - 1]?.start ?? null) : null;
  const currentDay = lastStart ? Math.max(1, diffDays(lastStart, today) + 1) : null;

  const avgSafe = avg ?? DEFAULT_CYCLE;
  const lutealLength = MEAN_LUTEAL;
  const ovulationDay = usesDefault
    ? assumed - MEAN_LUTEAL
    : Math.max(8, Math.round(avgSafe - MEAN_LUTEAL));

  /* observed evidence in the CURRENT cycle window — shown alongside, never overwriting */
  const cycleStart = lastStart ?? today;
  const inCurrent = sorted.filter(
    (e) =>
      diffDays(cycleStart, e.date) >= 0 &&
      (currentDay === null || diffDays(cycleStart, e.date) < currentDay + 1),
  );
  const lhPositiveDates = inCurrent.filter((e) => e.lh_test === "positive").map((e) => e.date);
  const eggWhiteDates = inCurrent
    .filter((e) => e.cervical_mucus === "egg-white")
    .map((e) => e.date);
  let bbtShiftDate: string | null = null;
  {
    const temps = inCurrent.filter((e) => e.temperature !== null);
    if (temps.length >= 4) {
      const split = Math.max(2, Math.floor(temps.length / 2));
      const lowMean = mean(temps.slice(0, split).map((t) => t.temperature!));
      if (lowMean !== null) {
        for (let i = split; i < temps.length - 1; i++) {
          const a = temps[i]!.temperature!;
          const b = temps[i + 1]!.temperature!;
          if (a >= lowMean + 0.2 && b >= lowMean + 0.2) {
            bbtShiftDate = temps[i]!.date;
            break;
          }
        }
      }
    }
  }

  const dayPhase = (day: number): PhaseKey => {
    const flowLen = Math.max(3, Math.round(periodLengthAverage ?? 4));
    if (day <= flowLen) return "menstrual";
    if (day >= ovulationDay - 1 && day <= ovulationDay + 1) return "ovulation";
    if (day < ovulationDay) return "follicular";
    return "luteal";
  };

  const currentPhase: PhaseKey | null = currentDay
    ? lastStart &&
      inCurrent.some(
        (e) =>
          hasFlow(e) &&
          diffDays(lastStart, e.date) + 1 >= currentDay &&
          currentDay - (diffDays(lastStart, e.date) + 1) <
            Math.max(1, Math.round(periodLengthAverage ?? 4)),
      )
      ? "menstrual"
      : dayPhase(currentDay)
    : null;

  /* events */
  const events: PredictionEvent[] = [];
  const halfWidth = std !== null ? Math.min(5, Math.max(2, Math.ceil(std * 1.25))) : null;

  if (lastStart) {
    const nextStart = addDays(lastStart, Math.round(avgSafe));
    const daysAway = diffDays(today, nextStart);
    const expectedDay = currentDay !== null ? Math.round(avgSafe) : null;
    events.push({
      id: "next-period",
      label: "Next period",
      date: nextStart,
      rangeStart: halfWidth !== null ? addDays(nextStart, -halfWidth) : null,
      rangeEnd: halfWidth !== null ? addDays(nextStart, halfWidth) : null,
      plusMinusDays: halfWidth,
      daysAway,
      detail: usesDefault
        ? `Estimated from a general ${assumed}-day pattern — log two cycles and it becomes yours`
        : `Estimated around day ${expectedDay ?? "—"} of this cycle, from your last ${recent.length} cycles`,
      predicted: true,
    });

    const ovu = addDays(lastStart, ovulationDay);
    const ovuAway = diffDays(today, ovu);
    const hasOvuEvidence = lhPositiveDates.length > 0 || bbtShiftDate !== null;
    events.push({
      id: "ovulation",
      label: "Ovulation (estimate)",
      date: ovu,
      rangeStart: halfWidth !== null ? addDays(ovu, -halfWidth) : null,
      rangeEnd: halfWidth !== null ? addDays(ovu, halfWidth) : null,
      plusMinusDays: halfWidth,
      daysAway: ovuAway,
      detail: hasOvuEvidence
        ? "You have logged fertility-sign language this cycle — the estimate stays calendar-based unless a test confirms"
        : usesDefault
          ? "Calendar estimate only (typical 14-day luteal phase) — no personal data behind it yet"
          : "Calendar estimate — an LH test or temperature shift sharpens it",
      predicted: true,
    });

    const fertileStart = addDays(ovu, -5);
    const fertileEnd = addDays(ovu, 1);
    events.push({
      id: "fertile-window",
      label: "Fertile window (estimate)",
      date: null,
      rangeStart: fertileStart,
      rangeEnd: fertileEnd,
      plusMinusDays: halfWidth,
      daysAway: diffDays(today, fertileStart),
      detail:
        "Planning awareness only — an estimate, not contraception and not a fertility guarantee",
      predicted: true,
    });

    if (!usesDefault) {
      const pmsStart = addDays(lastStart, Math.min(ovulationDay + 7, avgSafe - 6));
      const pmsEnd = addDays(nextStart, -1);
      if (diffDays(pmsStart, pmsEnd) >= 1)
        events.push({
          id: "pms-window",
          label: "PMS window (estimate)",
          date: null,
          rangeStart: pmsStart,
          rangeEnd: pmsEnd,
          plusMinusDays: null,
          daysAway: diffDays(today, pmsStart),
          detail: "Late-luteal stretch — some people notice mood or energy shifts here; many don't",
          predicted: true,
        });
    }
  }

  if (lhPositiveDates.length) {
    const latest = lhPositiveDates[lhPositiveDates.length - 1]!;
    events.push({
      id: "phase-change",
      label: "Positive LH test",
      date: latest,
      rangeStart: null,
      rangeEnd: null,
      plusMinusDays: null,
      daysAway: diffDays(today, latest),
      detail: "Observed — you logged this; the surge usually precedes ovulation by ~24–36 h",
      predicted: false,
    });
  }

  events.sort((a, b) => Math.abs(a.daysAway) - Math.abs(b.daysAway));

  return {
    today,
    lastPeriodStart: lastStart,
    currentDay,
    currentPhase,
    completed,
    average: usesDefault ? null : avg,
    median: med,
    stdDev: std,
    variabilityPercent,
    rangeMin,
    rangeMax,
    periodLengthAverage,
    confidence: confidenceFor(completed.length),
    usesDefaultAssumption: usesDefault,
    events,
    dayPhase,
    ovulationDay,
    lutealLength,
    observedEvidence: { lhPositiveDates, bbtShiftDate, eggWhiteDates },
  };
}

/* --------------------------- calendar day states --------------------------- */

export function dayStateFor(date: string, entries: CycleEntry[], model: CycleModel): DayState {
  const logged = entries.find((e) => e.date === date) ?? null;
  const predictedPeriod = model.events.find((e) => e.id === "next-period");
  const fertile = model.events.find((e) => e.id === "fertile-window");
  const ovu = model.events.find((e) => e.id === "ovulation");
  const pms = model.events.find((e) => e.id === "pms-window");
  const lastStart = model.lastPeriodStart;

  let phase: PhaseKey | null = null;
  if (logged?.flow && logged.flow !== "none") {
    phase = "menstrual";
  } else if (lastStart && diffDays(lastStart, date) >= 0 && model.currentDay !== null) {
    if (diffDays(lastStart, date) + 1 <= model.currentDay) {
      // inside the observed part of the cycle: trust an explicit phase, else the model
      phase = logged?.phase ?? model.dayPhase(diffDays(lastStart, date) + 1);
    } else {
      // future days of the current cycle: soft estimates only
      const cyc = Math.round(model.average ?? DEFAULT_CYCLE);
      const dayInCycle = ((diffDays(lastStart, date) + 1 - 1) % cyc) + 1;
      phase = model.dayPhase(dayInCycle);
    }
  }

  const within = (d: string, a: string | null, b: string | null) =>
    a !== null && b !== null && d >= a && d <= b;
  const nextPeriod = predictedPeriod ?? null;
  const predictedPeriodDay =
    nextPeriod !== null &&
    date > model.today &&
    (nextPeriod.date === date || within(date, nextPeriod.rangeStart, nextPeriod.rangeEnd));

  return {
    logged,
    phase,
    predictedPeriod: Boolean(predictedPeriodDay),
    predictedFertile: within(date, fertile?.rangeStart ?? null, fertile?.rangeEnd ?? null),
    predictedOvulation: ovu?.date === date,
    pms: within(date, pms?.rangeStart ?? null, pms?.rangeEnd ?? null),
  };
}

/* ----------------------------- AI context build ----------------------------- */

export function buildContext(entries: CycleEntry[], model: CycleModel): CycleContext {
  const cutoff = addDays(model.today, -30);
  const last30 = entries.filter((e) => e.date >= cutoff);
  return {
    generatedAt: new Date().toISOString(),
    today: model.today,
    currentDay: model.currentDay,
    currentPhase: model.currentPhase,
    confidence: model.confidence,
    usesDefaultAssumption: model.usesDefaultAssumption,
    completedCount: model.completed.length,
    recentLengths: model.completed.slice(-6).map((c) => c.lengthDays),
    average: model.average,
    median: model.median,
    rangeMin: model.rangeMin,
    rangeMax: model.rangeMax,
    variabilityPercent: model.variabilityPercent,
    periodLengthAverage: model.periodLengthAverage,
    events: model.events,
    loggedDays30: last30.length,
    recentMood: last30
      .filter((e): e is CycleEntry & { mood: MoodValue } => e.mood !== null)
      .slice(-14)
      .map((e) => ({ date: e.date, mood: e.mood })),
    recentEnergy: last30
      .filter((e) => e.energy !== null)
      .slice(-14)
      .map((e) => ({ date: e.date, energy: e.energy! })),
    recentSymptoms: last30
      .filter((e) => e.symptoms.length > 0)
      .slice(-10)
      .map((e) => ({ date: e.date, symptoms: e.symptoms })),
    observedEvidence: model.observedEvidence,
    highPainDays30: last30.filter((e) => (e.pain_level ?? 0) >= 4).length,
  };
}

/* ------------------------------ display helpers ------------------------------ */

export function fmtDate(key: string): string {
  return new Date(keyToEpoch(key) + dayMs / 2).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function fmtShort(key: string): string {
  return new Date(keyToEpoch(key) + dayMs / 2).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function daysAwayLabel(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  if (days > 0) return days > 45 ? `in ${Math.round(days / 7)} weeks` : `in ${days} days`;
  const a = -days;
  return a > 45 ? `${Math.round(a / 7)} weeks ago` : `${a} days ago`;
}
