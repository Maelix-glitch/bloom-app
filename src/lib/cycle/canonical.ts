/**
 * Canonical cycle state — the one place the app turns a record into UI data.
 *
 * `buildCanonicalCycle` normalises the store's records, runs the Cycle
 * Intelligence engine exactly once, and projects that single result into the
 * view model the existing visualisations render (`CycleAnalysis`). No view,
 * hook or component recalculates a prediction of its own: they all read the
 * same `IntelligenceResult` through this adapter, so the overview, calendar,
 * dial, wave, charts, brief and history cannot disagree.
 *
 * The projections below (phase windows, forward cycles, gap list) are just
 * date arithmetic over the canonical numbers — the median length, the
 * bleeding median and the last start — not a second estimate.
 */

import { addDays, diffDays } from "./intel/dates";
import { PLAUSIBLE_MAX, toCycleRecord, analyseCycle } from "./intel";
import { PHASE_TIPS } from "./predict";
import type {
  Confidence,
  CycleAnalysis,
  CycleGap,
  CycleStats,
  ForecastCycle,
  InsightFlag,
  PeriodLog,
  Phase,
  PhaseWindow,
  Tip,
} from "./predict";
import type { IntelligenceResult } from "./intel/types";

/** The minimum a daily log needs to contribute to the engine. */
export interface CanonicalDay {
  date: string;
  flow?: string | null;
  symptoms?: readonly string[] | null;
  mood?: string | null;
  energy?: number | null;
  pain?: number | null;
  sleep?: number | null;
}

export interface CanonicalInput {
  today: string;
  logs: readonly PeriodLog[];
  days: readonly CanonicalDay[];
  /** False when tracking is paused or off — predictions go quiet, history stays. */
  expecting: boolean;
}

export interface CanonicalCycle {
  /** The single engine result every view is rendered from. */
  intel: IntelligenceResult;
  /** Compatibility projection of `intel` for the existing visualisations. */
  analysis: CycleAnalysis;
}

const CONFIDENCE_MAP: Record<IntelligenceResult["confidence"]["level"], Confidence> = {
  none: "none",
  low: "low",
  moderate: "medium",
  good: "high",
};

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

function windowsFor(start: string, expectedLength: number, bleedDays: number): PhaseWindow[] {
  const ovulationDay = clamp(Math.max(bleedDays + 3, expectedLength - 14), 2, expectedLength);
  const ranges: { phase: Exclude<Phase, "late">; fromDay: number; toDay: number }[] = [
    { phase: "menstrual", fromDay: 1, toDay: bleedDays },
    { phase: "follicular", fromDay: bleedDays + 1, toDay: ovulationDay - 2 },
    { phase: "ovulation", fromDay: ovulationDay - 1, toDay: ovulationDay + 1 },
    { phase: "luteal", fromDay: ovulationDay + 2, toDay: expectedLength },
  ];
  return ranges
    .filter((r) => r.toDay >= r.fromDay && r.fromDay >= 1)
    .map((r) => ({
      phase: r.phase,
      fromDay: r.fromDay,
      toDay: r.toDay,
      from: addDays(start, r.fromDay - 1),
      to: addDays(start, r.toDay - 1),
      current: false,
    }));
}

function gapsFor(intel: IntelligenceResult, logs: readonly PeriodLog[]): CycleGap[] {
  const byStart = new Map(logs.map((log) => [log.start, log.id]));
  const starts = intel.baseline.starts;
  return intel.baseline.intervals.map((days, i) => {
    const fromStart = starts[i]!;
    const toStart = starts[i + 1]!;
    const plausible = days >= 15 && days <= PLAUSIBLE_MAX;
    return {
      index: i + 1,
      fromId: byStart.get(fromStart) ?? fromStart,
      toId: byStart.get(toStart) ?? toStart,
      fromStart,
      toStart,
      days,
      plausible,
      reason: plausible
        ? null
        : days > PLAUSIBLE_MAX
          ? `Longer than ${PLAUSIBLE_MAX} days — kept in your history, left out of the median.`
          : "Shorter than 15 days — kept in your history, left out of the median.",
      suggestedMissedDate: null,
    };
  });
}

function statsFor(intel: IntelligenceResult, logs: readonly PeriodLog[]): CycleStats {
  /*
   * One vote per logged period. Flow is a property of the period entry, and
   * the percentages built from these counts are divided by `entryCount` (also
   * periods), so both sides must count the same population.
   *
   * This used to count daily logs here while dividing by the period count,
   * which produced shares like "Not specified 56 · 700%": 56 logged days over
   * 8 periods. Counting days in the numerator and periods in the denominator
   * is exactly the contradiction a reader cannot resolve from the screen.
   */
  const flowCounts: CycleStats["flowCounts"] = { light: 0, medium: 0, heavy: 0, unspecified: 0 };
  let notes = 0;
  for (const log of logs) {
    const flow = log.flow ?? null;
    if (flow === "light" || flow === "medium" || flow === "heavy") flowCounts[flow] += 1;
    else flowCounts.unspecified += 1;
    if (log.notes) notes += 1;
  }
  const ranked = (["heavy", "medium", "light"] as const)
    .map((level) => ({ level, count: flowCounts[level] }))
    .sort((a, b) => b.count - a.count);
  const mostCommonFlow = ranked[0] && ranked[0].count > 0 ? ranked[0].level : null;
  const first = intel.baseline.starts[0] ?? null;

  return {
    cyclesLogged: intel.baseline.plausible.length,
    shortest: intel.baseline.min,
    longest: intel.baseline.max,
    excludedGaps: intel.baseline.unusual.length,
    averageBleed: intel.baseline.bleedingMedian,
    entriesWithEnd: intel.baseline.bleedingCount,
    predictability: intel.backtest.withinThree,
    daysTracked: first !== null ? diffDays(first, intel.record.today) : null,
    firstEntry: first,
    flowCounts,
    mostCommonFlow,
    entriesWithNotes: notes,
  };
}

function flagsFor(intel: IntelligenceResult): InsightFlag[] {
  const flags: InsightFlag[] = [];

  if (intel.forecast.available === false) {
    flags.push({
      id: "building",
      kind: "building",
      tone: "calm",
      title: intel.baseline.starts.length === 0 ? "Nothing logged yet" : "Still building a baseline",
      body:
        intel.baseline.starts.length === 0
          ? "Log the first day of a period. A forecast needs two starts before it can measure a cycle length."
          : "One start is recorded. The next one creates your first measured interval — until then there is no personal estimate.",
    });
  }

  for (const change of intel.changes) {
    flags.push({
      id: change.id,
      kind: change.kind === "unusual" ? "anomaly" : change.kind === "variability" ? "variability" : "trend",
      tone: change.kind === "unusual" ? "info" : "calm",
      title: change.headline,
      body: change.detail,
    });
  }

  if (intel.phase.overdueDays > 0) {
    flags.push({
      id: "late",
      kind: "late",
      tone: "attention",
      title: `${intel.phase.overdueDays} ${intel.phase.overdueDays === 1 ? "day" : "days"} past your usual cycle`,
      body: "This is measured against your own median, not a population average. Nothing is restarted for you — log a new start when it begins.",
    });
  }

  return flags;
}

/** Project the canonical result into the shape the visualisations read. */
export function toCycleAnalysis(
  intel: IntelligenceResult,
  input: { logs: readonly PeriodLog[]; days: readonly CanonicalDay[]; expecting: boolean },
): CycleAnalysis {
  const { baseline, forecast, phase, confidence } = intel;
  const expectedCycleLength = forecast.cycleLength?.point ?? Math.round(baseline.median ?? 28);
  const bleedDays = clamp(Math.round(baseline.bleedingMedian ?? 5), 1, 8);
  const lastStart = baseline.lastStart;
  const overdueDays = phase.overdueDays;
  const phaseKey: Phase | null =
    overdueDays > 0 ? "late" : phase.key !== null ? phase.key : null;

  const phaseWindows =
    lastStart !== null
      ? windowsFor(lastStart, expectedCycleLength, bleedDays).map((w) => ({
          ...w,
          current: intel.record.today >= w.from && intel.record.today <= w.to,
        }))
      : [];

  const ovulationDay =
    lastStart !== null ? clamp(Math.max(bleedDays + 3, expectedCycleLength - 14), 2, expectedCycleLength) : null;
  const ovulationDate = lastStart !== null && ovulationDay !== null ? addDays(lastStart, ovulationDay - 1) : null;

  const forward: ForecastCycle[] = forecast.available
    ? Array.from({ length: 3 }, (_, i) => {
        const start = addDays(forecast.next!.point, expectedCycleLength * i);
        const ovulation = ovulationDay !== null ? addDays(start, ovulationDay - 1) : start;
        return {
          index: i + 1,
          start,
          end: addDays(start, expectedCycleLength - 1),
          ovulation,
          fertileStart: addDays(ovulation, -5),
          fertileEnd: addDays(ovulation, 1),
          phases: windowsFor(start, expectedCycleLength, bleedDays),
        };
      })
    : [];

  const lengthChange = intel.changes.find((c) => c.kind === "length" && c.deltaDays !== null);
  const tips: Tip[] = phaseKey !== null && phaseKey !== "late" ? (PHASE_TIPS[phaseKey] ?? []) : [];

  return {
    expecting: input.expecting,
    today: intel.record.today,
    entryCount: input.logs.length,
    logs: [...input.logs],
    gaps: gapsFor(intel, input.logs),
    cycleLengths: [...baseline.plausible],
    averageLength: baseline.median ?? 28,
    averageLengthRaw: baseline.median ?? 28,
    isGeneric: baseline.plausible.length === 0,
    maxPlausible: PLAUSIBLE_MAX,
    longCyclesAccepted: false,
    variability: baseline.stdev ?? 0,
    confidence: CONFIDENCE_MAP[confidence.level],
    confidenceReason: confidence.reason,
    lastStart,
    cycleDay: phase.day,
    periodLength: bleedDays,
    periodLengthIsLogged: baseline.bleedingCount > 0,
    phase: phaseKey,
    phaseLabel: phase.label,
    nextStart: forecast.next?.point ?? null,
    daysUntilNext: forecast.next?.daysAway ?? null,
    nextWindow: forecast.next
      ? {
          from: forecast.next.from,
          to: forecast.next.to,
          spread: forecast.halfWidth * 2,
        }
      : null,
    isLate: overdueDays > 0,
    lateBy: overdueDays,
    overdue: overdueDays > 0,
    overdueDays,
    expectedCycleLength,
    upcomingStart:
      lastStart !== null && lastStart > intel.record.today ? lastStart : null,
    ovulationDate,
    fertileStart: ovulationDate !== null ? addDays(ovulationDate, -5) : null,
    fertileEnd: ovulationDate !== null ? addDays(ovulationDate, 1) : null,
    ovulationDay,
    trend:
      lengthChange && lengthChange.deltaDays !== null
        ? {
            direction: lengthChange.deltaDays > 0 ? "lengthening" : "shortening",
            days: Math.abs(lengthChange.deltaDays),
          }
        : null,
    irregular: baseline.cvPercent !== null && baseline.cvPercent > 20,
    flags: flagsFor(intel),
    tips,
    phaseWindows,
    forecast: forward,
    stats: statsFor(intel, input.logs),
  };
}

/**
 * Normalise → analyse → project. The only function the app calls to obtain
 * cycle state; it is pure, so the same records always yield the same result.
 */
export function buildCanonicalCycle(input: CanonicalInput): CanonicalCycle {
  const record = toCycleRecord({
    today: input.today,
    periods: input.logs.map((log) => ({ start: log.start, end: log.end ?? null })),
    days: input.days.map((day) => ({
      date: day.date,
      flow: day.flow ?? null,
      symptoms: day.symptoms ?? [],
      mood: day.mood ?? null,
      energy: day.energy ?? null,
      pain: day.pain ?? null,
      sleep: day.sleep ?? null,
    })),
  });
  const intel = analyseCycle(record);
  return {
    intel,
    analysis: toCycleAnalysis(intel, {
      logs: input.logs,
      days: input.days,
      expecting: input.expecting,
    }),
  };
}
