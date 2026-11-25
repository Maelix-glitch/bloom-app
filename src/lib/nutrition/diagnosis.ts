/**
 * The plan's working diagnosis (M-244, research R-2511-01).
 *
 * A dietitian's assessment does not jump from answers to a plan:
 * the Nutrition Care Process names the problem first — Problem,
 * Etiology, Signs (PES) — and the plan answers it. Bloom's plans
 * did the jump silently. This module derives the statement's DATA
 * from the record the plan was actually built on:
 *
 *   · Problem — the person's goal, as the plan's goal profile.
 *     Never a condition: Bloom does not diagnose or treat
 *     conditions, and the goal is the problem the person chose.
 *   · Etiology — what in the record the plan must work with: the
 *     conditions the person stated in their Assessment (the ones
 *     whose guardrails the composer already honours, M-219).
 *   · Signs — the measurable things this plan is watching: the
 *     per-meal protein aim it composes toward (R-2511-04) and the
 *     complete logged days in the learning window that shape it.
 *
 * Data only, like everything in this layer: the words live in
 * `diagnosisCopy` in src/lib/reasons.ts, each line ≤ 140 chars,
 * and no figure here repeats the header's stat strip (the guide
 * kcal/protein live there, once — brief v7 rule 2).
 */

import { CAUTION_CONDITION_LABEL, HIGH_RISK_CONDITION_LABEL } from "@/lib/vitalis/domain/safety";
import { completeLoggedDayTotals } from "./loggedDays";
import { perMealProteinAimG, type DailyPlan, type PlanGoalProfile } from "./plan";
import type { LogEntry } from "./types";

export interface PlanDiagnosis {
  goalProfile: PlanGoalProfile;
  /** The person's stated conditions, by their Assessment labels,
   *  in the order the Assessment lists them. Empty when none. */
  conditionLabels: readonly string[];
  /** The per-meal protein aim this plan composes toward, grams
   *  (R-2511-04 — the same derivation the pick cost reads). */
  perMealProteinAimG: number;
  /** Complete logged days (M-244's two-main-meals rule) inside the
   *  learning window before the plan's day — the days the plan's
   *  learning pass could read. */
  completeDaysInWindow: number;
  /** The learning window the count is taken over, days. */
  windowDays: number;
}

/** The learning window, mirrored from planAdaptation.ts
 *  (LEARNING_WINDOW_DAYS) — the days the plan learns from are the
 *  days the diagnosis may cite. */
export const DIAGNOSIS_WINDOW_DAYS = 28;

function conditionLabel(code: string): string | null {
  const caution = (CAUTION_CONDITION_LABEL as Record<string, string>)[code];
  if (caution) return caution;
  const highRisk = (HIGH_RISK_CONDITION_LABEL as Record<string, string>)[code];
  return highRisk ?? null;
}

export function diagnosisFor(input: {
  plan: DailyPlan;
  conditions: readonly string[];
  entries: readonly LogEntry[];
}): PlanDiagnosis {
  const { plan } = input;
  const labels: string[] = [];
  for (const code of input.conditions) {
    const label = conditionLabel(code);
    if (label && !labels.includes(label)) labels.push(label);
  }
  const windowStart = shiftDay(plan.day, -DIAGNOSIS_WINDOW_DAYS);
  const inWindow = input.entries.filter((e) => e.day >= windowStart && e.day < plan.day);
  return {
    goalProfile: plan.goalProfile,
    conditionLabels: labels,
    perMealProteinAimG: perMealProteinAimG(plan.targets, plan.goalProfile),
    completeDaysInWindow: completeLoggedDayTotals(inWindow).size,
    windowDays: DIAGNOSIS_WINDOW_DAYS,
  };
}

/** ISO day arithmetic on the plan's own day strings (UTC, so a
 *  local timezone can never shift the window by a day). */
function shiftDay(day: string, delta: number): string {
  const d = new Date(`${day}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}
