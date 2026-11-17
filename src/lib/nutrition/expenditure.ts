/**
 * Expenditure estimation — what the person's body actually burns,
 * derived from their own record instead of a formula's population
 * average (the MacroFactor idea, held to Bloom's honesty rules).
 *
 * The energy-balance identity: over a window, average intake minus
 * the energy stored or released by the weight change IS maintenance.
 * Weight change is converted at 7,700 kcal per kilogram — a stated
 * approximation for body-mass change, named here and on the surface,
 * never hidden inside the number.
 *
 * Sufficiency is gated hard, because an estimate built on three
 * logged days is a guess wearing a lab coat:
 *   · at least 10 logged days inside the weigh-in window;
 *   · at least 2 weigh-ins spanning at least 10 days (the window is
 *     capped at 35 days — older intake says little about today's
 *     body);
 * Failing either, the result is an honest `insufficient` carrying
 * the counts, so the surface can say exactly what is missing.
 *
 * Only logged days count toward the intake average: a day with no
 * entries is unknown, not zero, and the estimate's inputs (the
 * logged-day count among them) travel with it onto the surface.
 *
 * The output is a PROPOSAL input, never an applied change — see
 * targetAdjustment.ts for the one path by which a confirmed
 * estimate may move a target.
 *
 * Pure and deterministic: same entries, same weigh-ins, same day →
 * same estimate, to the kilocalorie.
 */

import { shiftDay } from "@/lib/localDay";
import type { WeighIn } from "@/lib/health/body";
import type { LogEntry } from "./types";

/** The stated energy conversion for body-mass change. */
export const ENERGY_KCAL_PER_KG = 7700;
/** Logged days inside the window before an estimate may speak. */
export const EXPENDITURE_MIN_LOGGED_DAYS = 10;
/** The weigh-ins must span at least this many days. */
export const EXPENDITURE_MIN_SPAN_DAYS = 10;
/** …and at most this many: older windows describe an older body. */
export const EXPENDITURE_MAX_SPAN_DAYS = 35;

export interface ExpenditureEstimate {
  /** Estimated daily maintenance energy, kcal. */
  maintenanceKcal: number;
  /** Mean logged intake over the window's logged days, kcal. */
  avgIntakeKcal: number;
  /** Logged days the intake average rests on. */
  loggedDays: number;
  /** Days between the two weigh-ins. */
  spanDays: number;
  /** Last minus first weigh-in, kg (one decimal, as recorded). */
  weightChangeKg: number;
  fromDate: string;
  toDate: string;
}

export type ExpenditureResult =
  | { kind: "ready"; estimate: ExpenditureEstimate }
  | {
      kind: "insufficient";
      /** Logged days inside the judged window (or the last
       *  EXPENDITURE_MAX_SPAN_DAYS days when no window exists). */
      loggedDays: number;
      /** Weigh-ins on record up to the day. */
      weightPoints: number;
      /** Span of the weigh-ins judged, 0 when fewer than two. */
      spanDays: number;
    };

function daySpan(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);
}

export function estimateExpenditure(
  entries: readonly LogEntry[],
  weighIns: readonly WeighIn[],
  day: string,
): ExpenditureResult {
  const totalsByDay = new Map<string, number>();
  for (const entry of entries) {
    totalsByDay.set(entry.day, (totalsByDay.get(entry.day) ?? 0) + entry.nutrients.kcal);
  }
  const loggedIn = (from: string, to: string) => {
    let days = 0;
    let total = 0;
    for (const [d, kcal] of totalsByDay) {
      if (d >= from && d < to) {
        days += 1;
        total += kcal;
      }
    }
    return { days, total };
  };

  const points = weighIns
    .filter((w) => w.date <= day)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  if (points.length < 2) {
    const { days } = loggedIn(shiftDay(day, -EXPENDITURE_MAX_SPAN_DAYS), day);
    return { kind: "insufficient", loggedDays: days, weightPoints: points.length, spanDays: 0 };
  }

  const last = points[points.length - 1]!;
  /* The earliest weigh-in inside the allowed span window: the
     longest honest window, capped at EXPENDITURE_MAX_SPAN_DAYS. */
  const first = points.find(
    (w) =>
      w.date >= shiftDay(last.date, -EXPENDITURE_MAX_SPAN_DAYS) &&
      w.date <= shiftDay(last.date, -EXPENDITURE_MIN_SPAN_DAYS),
  );
  if (!first) {
    const spanDays = daySpan(points[0]!.date, last.date);
    const { days } = loggedIn(points[0]!.date, last.date);
    return { kind: "insufficient", loggedDays: days, weightPoints: points.length, spanDays };
  }

  const spanDays = daySpan(first.date, last.date);
  /* Intake on the days the weight change was earned: from the first
     weigh-in's day up to (not including) the last weigh-in's day. */
  const { days: loggedDays, total } = loggedIn(first.date, last.date);
  if (loggedDays < EXPENDITURE_MIN_LOGGED_DAYS) {
    return { kind: "insufficient", loggedDays, weightPoints: points.length, spanDays };
  }

  const avgIntake = total / loggedDays;
  const weightChangeKg = Math.round((last.kg - first.kg) * 10) / 10;
  const maintenance = avgIntake - (weightChangeKg * ENERGY_KCAL_PER_KG) / spanDays;
  return {
    kind: "ready",
    estimate: {
      maintenanceKcal: Math.round(maintenance),
      avgIntakeKcal: Math.round(avgIntake),
      loggedDays,
      spanDays,
      weightChangeKg,
      fromDate: first.date,
      toDate: last.date,
    },
  };
}
