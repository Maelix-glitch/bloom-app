/**
 * Plan adaptation — the plan learns from the days actually logged.
 *
 * Until now the composer composed from targets alone: the same person,
 * eating the same way, got the same shape of plan whether their logged
 * days showed them landing far under their protein target or far over
 * their energy target. This module reads the recent food log and
 * turns it into a small, explainable bias the composer applies while
 * choosing — never while aiming:
 *
 *   · **Targets never change.** The adaptation reads the targets to
 *     judge the log against them; it cannot move them, and nothing in
 *     it is written back into the plan's targets, inputs snapshot or
 *     fingerprint. It biases *selection within the composer's own
 *     rules* — which dish anchors a meal, which top-up is picked,
 *     whether the energy top-up round runs at all.
 *   · **Fewer than two logged days, no adaptation.** One day is an
 *     anecdote; the function returns null and the composer behaves
 *     exactly as it did before this module existed.
 *   · **Only completed days count.** Days strictly before the plan's
 *     own day — today's log is still being written, and judging a
 *     plan by a half-eaten day would punish a person for logging
 *     breakfast. At most the three most recent logged days are read.
 *   · **Every adaptation explains itself**, in a note carrying the
 *     real averaged numbers, which the plan surfaces with its other
 *     composition notes.
 *
 * Day totals are the sums of the entries' stored nutrients — the same
 * numbers the Nutrition tab shows for those days, computed at log
 * time from each food's values. Nothing is re-estimated here.
 *
 * Pure: entries in, an adaptation (or null) out.
 */

import type { NutritionTargets } from "./targets";
import type { LogEntry } from "./types";

/** How many recent logged days the adaptation reads at most. */
export const ADAPTATION_MAX_DAYS = 3;
/** Fewer logged days than this and there is nothing to learn from. */
export const ADAPTATION_MIN_DAYS = 2;
/** Average protein under this share of the target, across the logged
 *  days, is a pattern — not a bad day — and the plan leans protein-first. */
export const PROTEIN_SHORTFALL_RATIO = 0.85;
/** Average energy over this share of the target, across the logged
 *  days, and the plan stops spending top-ups on energy. */
export const ENERGY_OVERSHOOT_RATIO = 1.1;

export interface PlanAdaptation {
  /** How many logged days the signals were computed over (2–3). */
  days: number;
  /** The logged days' mean energy, as logged (unrounded). */
  avgKcal: number;
  /** The logged days' mean protein, as logged (unrounded). */
  avgProteinG: number;
  /** Lean on higher-protein anchors and top-ups. */
  proteinShortfall: boolean;
  /** Leave the energy top-ups out; the dishes carry the day. */
  energyOvershoot: boolean;
  /** The human-readable explanations, with the real numbers. These
   *  join the plan's composition notes verbatim. */
  notes: string[];
}

interface DayTotals {
  day: string;
  kcal: number;
  proteinG: number;
}

/** The recent logged days before `day`, newest first, capped. A day
 *  counts as logged when it holds at least one entry. */
function recentLoggedDays(entries: readonly LogEntry[], day: string): DayTotals[] {
  const byDay = new Map<string, DayTotals>();
  for (const entry of entries) {
    if (entry.day >= day) continue;
    const totals = byDay.get(entry.day) ?? { day: entry.day, kcal: 0, proteinG: 0 };
    totals.kcal += entry.nutrients.kcal;
    totals.proteinG += entry.nutrients.proteinG;
    byDay.set(entry.day, totals);
  }
  return [...byDay.values()]
    .sort((a, b) => (a.day < b.day ? 1 : -1))
    .slice(0, ADAPTATION_MAX_DAYS);
}

const whole = (n: number) => Math.round(n).toLocaleString("en-US");

/**
 * The adaptation for a plan, or null when there is nothing honest to
 * adapt from: too few logged days, or logged days that land close
 * enough to the targets that the unbiased composer is the right answer.
 */
export function planAdaptationFor(
  entries: readonly LogEntry[],
  day: string,
  targets: NutritionTargets,
): PlanAdaptation | null {
  const days = recentLoggedDays(entries, day);
  if (days.length < ADAPTATION_MIN_DAYS) return null;
  if (!(targets.kcal > 0) || !(targets.proteinG > 0)) return null;

  const avgKcal = days.reduce((sum, d) => sum + d.kcal, 0) / days.length;
  const avgProteinG = days.reduce((sum, d) => sum + d.proteinG, 0) / days.length;
  const proteinShortfall = avgProteinG < PROTEIN_SHORTFALL_RATIO * targets.proteinG;
  const energyOvershoot = avgKcal > ENERGY_OVERSHOOT_RATIO * targets.kcal;
  if (!proteinShortfall && !energyOvershoot) return null;

  const notes: string[] = [];
  if (proteinShortfall) {
    notes.push(
      `From your log: your last ${days.length} logged days averaged ${whole(avgProteinG)} g protein against your ${whole(targets.proteinG)} g target, so this plan leans on higher-protein dishes and top-ups. Your target itself is unchanged.`,
    );
  }
  if (energyOvershoot) {
    notes.push(
      `From your log: your last ${days.length} logged days averaged ${whole(avgKcal)} kcal against your ${whole(targets.kcal)} kcal target, so this plan leaves the energy top-ups out and lets the dishes carry the day. Your target itself is unchanged.`,
    );
  }
  return { days: days.length, avgKcal, avgProteinG, proteinShortfall, energyOvershoot, notes };
}
