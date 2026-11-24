/**
 * Bloom — Sleep & Recovery Intelligence (pure core).
 *
 * Turns the sleep Bloom already records into an honest recovery picture:
 * a sleep-debt figure, a banded recovery state, and a week-on-week trend.
 * Pure and deterministic: days + today's date + the Assessment's sleep
 * answers go in, a snapshot comes out. No React, no storage, no clock.
 *
 * The honesty rules, carried from the trackers core and held just as firmly:
 *
 *  1. Only recorded nights count. A night with no sleep logged is
 *     "not recorded" — never assumed, never zero-filled, never averaged in.
 *  2. Only recorded signals are used. Bloom records sleep duration and a
 *     1–5 sleep-quality rating; it does not record HRV, resting heart rate
 *     or sleep stages, so none of those appear here, in any form.
 *  3. The need baseline is the person's own Assessment answer ("you
 *     usually sleep about X hours") when they gave one. Otherwise it is
 *     the general 8-hour guide, labelled as a default — never dressed up
 *     as their data.
 *  4. Every figure names its inputs and its window. A band computed from
 *     three nights says so.
 */

import { addDays } from "@/lib/cycle/predict";
import type { DayEntry } from "@/lib/trackers/core";

/* --------------------------------- model --------------------------------- */

/** Nights that must be recorded in a window before a band or trend is read. */
export const MIN_RECORDED_NIGHTS = 3;

/** The general guide used only when the person gave no Assessment answer. */
export const DEFAULT_NEED_MINUTES = 8 * 60;

export interface SleepNeed {
  minutes: number;
  source: "assessment" | "default";
  /** Provenance, in words, for the page. */
  label: string;
}

export interface SleepWindow {
  /** Inclusive date keys. */
  start: string;
  end: string;
  /** Nights with a recorded sleep duration. */
  nightsRecorded: number;
  /** Calendar nights in the window with nothing recorded. */
  nightsNotRecorded: number;
  /** Sum over recorded nights only. */
  totalMinutes: number;
  /** Mean over recorded nights only; null when none were recorded. */
  averageMinutes: number | null;
  /** Mean of the recorded 1–5 quality ratings; null when none were recorded. */
  averageQuality: number | null;
  /** Recorded nights that also carried a quality rating. */
  nightsWithQuality: number;
}

export interface SleepDebt {
  state: "value" | "none-recorded";
  /** Sum of nightly shortfalls across recorded nights (never negative). */
  debtMinutes: number;
  /** Recorded nights that fell short of the need. */
  nightsShort: number;
  nightsRecorded: number;
}

export type RecoveryBandId = "recovered" | "getting-there" | "running-low" | "not-enough-data";

export interface RecoveryState {
  band: RecoveryBandId;
  label: string;
  /** The inputs the band was computed from, in words. */
  inputsLine: string;
  nightsRecorded: number;
  averageMinutes: number | null;
  averageQuality: number | null;
}

export interface SleepTrend {
  state: "value" | "insufficient";
  currentAverageMinutes: number | null;
  previousAverageMinutes: number | null;
  /** Current minus previous, in minutes; null unless state is "value". */
  deltaMinutes: number | null;
  direction: "longer" | "shorter" | "about-the-same" | null;
  currentNights: number;
  previousNights: number;
}

export interface RecoverySnapshot {
  need: SleepNeed;
  window: SleepWindow;
  previousWindow: SleepWindow;
  debt: SleepDebt;
  recovery: RecoveryState;
  trend: SleepTrend;
}

/* -------------------------------- helpers -------------------------------- */

/** "7h 20m" / "8h" / "45m" — the way the trackers page reads durations. */
export function formatSleepMinutes(minutes: number): string {
  const rounded = Math.round(minutes);
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

const mean = (xs: readonly number[]): number | null =>
  xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length;

/* ---------------------------------- need --------------------------------- */

/**
 * The baseline a night is measured against. The Assessment's
 * sleepHoursTypical is the person's own statement of their usual sleep;
 * when it is absent (or not a sane number), the general 8-hour guide
 * stands in, labelled as exactly that.
 */
export function resolveSleepNeed(
  answers: { sleepHoursTypical: number | null } | null,
): SleepNeed {
  const typical = answers?.sleepHoursTypical ?? null;
  if (typeof typical === "number" && Number.isFinite(typical) && typical >= 3 && typical <= 14) {
    const minutes = Math.round(typical * 60);
    return {
      minutes,
      source: "assessment",
      label: `your Assessment answer, you usually sleep about ${formatSleepMinutes(minutes)}`,
    };
  }
  return {
    minutes: DEFAULT_NEED_MINUTES,
    source: "default",
    label: "the general 8-hour guide, you haven't given Bloom your own number in the Assessment",
  };
}

/* -------------------------------- windows -------------------------------- */

interface Night {
  date: string;
  minutes: number;
  quality: number | null;
}

function recordedNights(days: readonly DayEntry[]): Map<string, Night> {
  const byDate = new Map<string, Night>();
  for (const day of days) {
    if (day.sleepMinutes === null) continue;
    byDate.set(day.date, {
      date: day.date,
      minutes: day.sleepMinutes,
      quality: day.sleepQuality,
    });
  }
  return byDate;
}

function windowOf(nights: Map<string, Night>, end: string): SleepWindow {
  const start = addDays(end, -6);
  const inWindow: Night[] = [];
  for (let i = 0; i < 7; i += 1) {
    const night = nights.get(addDays(start, i));
    if (night) inWindow.push(night);
  }
  const qualities = inWindow
    .map((n) => n.quality)
    .filter((q): q is number => typeof q === "number" && Number.isFinite(q));
  return {
    start,
    end,
    nightsRecorded: inWindow.length,
    nightsNotRecorded: 7 - inWindow.length,
    totalMinutes: inWindow.reduce((sum, n) => sum + n.minutes, 0),
    averageMinutes: mean(inWindow.map((n) => n.minutes)),
    averageQuality: mean(qualities),
    nightsWithQuality: qualities.length,
  };
}

/* ---------------------------------- debt --------------------------------- */

/**
 * Sleep debt across the recorded nights of the current window: each
 * recorded night contributes its shortfall against the need, floored at
 * zero — a long night does not bank credit against a short one. Nights
 * that were never recorded contribute nothing and are never assumed.
 */
export function sleepDebt(nights: readonly Night[], needMinutes: number): SleepDebt {
  if (nights.length === 0) {
    return { state: "none-recorded", debtMinutes: 0, nightsShort: 0, nightsRecorded: 0 };
  }
  let debt = 0;
  let short = 0;
  for (const night of nights) {
    const gap = needMinutes - night.minutes;
    if (gap > 0) {
      debt += gap;
      short += 1;
    }
  }
  return { state: "value", debtMinutes: debt, nightsShort: short, nightsRecorded: nights.length };
}

/* ---------------------------------- band --------------------------------- */

type BandRank = 0 | 1 | 2; // running-low < getting-there < recovered

const RANK_ID: readonly RecoveryBandId[] = ["running-low", "getting-there", "recovered"];

const BAND_LABEL: Record<RecoveryBandId, string> = {
  recovered: "Recovered",
  "getting-there": "Getting there",
  "running-low": "Running low",
  "not-enough-data": "Not enough data yet",
};

function durationRank(averageMinutes: number, needMinutes: number): BandRank {
  const ratio = averageMinutes / needMinutes;
  if (ratio >= 0.95) return 2;
  if (ratio >= 0.85) return 1;
  return 0;
}

function qualityRank(averageQuality: number): BandRank {
  if (averageQuality >= 4) return 2;
  if (averageQuality >= 3) return 1;
  return 0;
}

/**
 * The recovery state. Below MIN_RECORDED_NIGHTS recorded nights in the
 * window there is no band — the record is too thin to read, and the
 * snapshot says so. Otherwise the band is the weaker of the two recorded
 * signals (duration against need, and quality where it was recorded):
 * a week of short but well-rated nights is not called recovered, and
 * neither is a long week that felt rough.
 */
export function recoveryState(window: SleepWindow, need: SleepNeed): RecoveryState {
  const base = {
    label: "",
    nightsRecorded: window.nightsRecorded,
    averageMinutes: window.averageMinutes,
    averageQuality: window.averageQuality,
  };
  if (window.nightsRecorded < MIN_RECORDED_NIGHTS || window.averageMinutes === null) {
    return {
      ...base,
      band: "not-enough-data",
      label: BAND_LABEL["not-enough-data"],
      inputsLine:
        window.nightsRecorded === 0
          ? "No nights recorded in the last 7 days, there is nothing to read yet."
          : `Only ${window.nightsRecorded} night${window.nightsRecorded === 1 ? "" : "s"} recorded in the last 7 days, a recovery read needs at least ${MIN_RECORDED_NIGHTS}.`,
    };
  }

  const ranks: BandRank[] = [durationRank(window.averageMinutes, need.minutes)];
  if (window.averageQuality !== null) ranks.push(qualityRank(window.averageQuality));
  const band = RANK_ID[Math.min(...ranks)] as RecoveryBandId;

  const parts = [
    `${window.nightsRecorded} recorded night${window.nightsRecorded === 1 ? "" : "s"} in the last 7 days`,
    `average sleep ${formatSleepMinutes(window.averageMinutes)} against ${formatSleepMinutes(need.minutes)} (${need.label})`,
  ];
  parts.push(
    window.averageQuality !== null
      ? `average sleep quality ${window.averageQuality.toFixed(1)} of 5 across ${window.nightsWithQuality} rated night${window.nightsWithQuality === 1 ? "" : "s"}`
      : "no sleep-quality ratings recorded in this window, so the read rests on duration alone",
  );
  return { ...base, band, label: BAND_LABEL[band], inputsLine: `Based on ${parts.join("; ")}.` };
}

/* ---------------------------------- trend -------------------------------- */

/**
 * This week's average against the week before. Both windows must hold at
 * least MIN_RECORDED_NIGHTS recorded nights; a swing under 15 minutes
 * reads as about the same.
 */
export function sleepTrend(current: SleepWindow, previous: SleepWindow): SleepTrend {
  const base = {
    currentAverageMinutes: current.averageMinutes,
    previousAverageMinutes: previous.averageMinutes,
    currentNights: current.nightsRecorded,
    previousNights: previous.nightsRecorded,
  };
  if (
    current.nightsRecorded < MIN_RECORDED_NIGHTS ||
    previous.nightsRecorded < MIN_RECORDED_NIGHTS ||
    current.averageMinutes === null ||
    previous.averageMinutes === null
  ) {
    return { ...base, state: "insufficient", deltaMinutes: null, direction: null };
  }
  const delta = current.averageMinutes - previous.averageMinutes;
  return {
    ...base,
    state: "value",
    deltaMinutes: delta,
    direction: Math.abs(delta) < 15 ? "about-the-same" : delta > 0 ? "longer" : "shorter",
  };
}

/* -------------------------------- snapshot ------------------------------- */

/**
 * The whole picture for the 7 calendar days ending `today`, with the 7
 * before them as the comparison window.
 */
export function buildRecoverySnapshot(
  days: readonly DayEntry[],
  today: string,
  answers: { sleepHoursTypical: number | null } | null,
): RecoverySnapshot {
  const need = resolveSleepNeed(answers);
  const nights = recordedNights(days);
  const window = windowOf(nights, today);
  const previousWindow = windowOf(nights, addDays(today, -7));

  const currentNights: Night[] = [];
  for (let i = 0; i < 7; i += 1) {
    const night = nights.get(addDays(window.start, i));
    if (night) currentNights.push(night);
  }

  return {
    need,
    window,
    previousWindow,
    debt: sleepDebt(currentNights, need.minutes),
    recovery: recoveryState(window, need),
    trend: sleepTrend(window, previousWindow),
  };
}

/* ------------------------------- page lines ------------------------------ */

/**
 * The snapshot as plain factual lines for the page — the same discipline
 * as the trackers observations: what the record shows, with its window
 * and its basis attached. No advice, no prescription.
 */
export function recoveryLines(snapshot: RecoverySnapshot): string[] {
  const { need, window, debt, recovery, trend } = snapshot;
  const lines: string[] = [];

  if (debt.state === "none-recorded") {
    lines.push("No nights recorded in the last 7 days, so there is no sleep debt to read.");
  } else if (debt.debtMinutes === 0) {
    lines.push(
      `No sleep debt across the ${debt.nightsRecorded} recorded night${debt.nightsRecorded === 1 ? "" : "s"} of the last 7 days, each one reached ${formatSleepMinutes(need.minutes)} (${need.label}).`,
    );
  } else {
    lines.push(
      `Sleep debt of ${formatSleepMinutes(debt.debtMinutes)} across the last 7 days, ${debt.nightsShort} of ${debt.nightsRecorded} recorded night${debt.nightsRecorded === 1 ? "" : "s"} fell short of ${formatSleepMinutes(need.minutes)} (${need.label}).`,
    );
  }

  if (window.nightsNotRecorded > 0 && window.nightsRecorded > 0) {
    lines.push(
      `${window.nightsNotRecorded} of the last 7 nights have no sleep recorded, they are left out of every figure here, not assumed.`,
    );
  }

  if (recovery.band !== "not-enough-data") {
    lines.push(recovery.inputsLine);
  }

  if (trend.state === "value" && trend.deltaMinutes !== null) {
    const cur = formatSleepMinutes(trend.currentAverageMinutes ?? 0);
    const prev = formatSleepMinutes(trend.previousAverageMinutes ?? 0);
    lines.push(
      trend.direction === "about-the-same"
        ? `Nights are about the same as the week before, ${cur} a night on average against ${prev}.`
        : `Nights have been getting ${trend.direction} - ${cur} a night on average against ${prev} the week before (${trend.deltaMinutes > 0 ? "+" : "−"}${formatSleepMinutes(Math.abs(trend.deltaMinutes))}).`,
    );
  } else if (window.nightsRecorded >= MIN_RECORDED_NIGHTS) {
    lines.push(
      `No week-on-week trend yet, the week before holds ${trend.previousNights} recorded night${trend.previousNights === 1 ? "" : "s"}, and a trend needs at least ${MIN_RECORDED_NIGHTS} in both weeks.`,
    );
  }

  return lines;
}
