/**
 * Women's Health — the cycle-context builder (SYSTEM 16, foundation).
 *
 * One question, answered honestly: "what does her own logged cycle say about
 * today?" The answer is built ONLY from the existing prediction module
 * (`analyzeCycle` in src/lib/cycle/predict.ts) and the existing cycle
 * settings mode. This module adds no storage, no new maths and no claims of
 * its own:
 *
 *   · the phase, cycle day, confidence and next window are the prediction
 *     module's own values, passed through verbatim — the confidence is
 *     never remapped, rounded up or renamed into something stronger;
 *   · when the record cannot support a personal context — tracking paused
 *     or off, nothing logged, or only the population fallback behind the
 *     estimate (the engine's confidence "none") — the context is
 *     `unavailable` with the reason, never a dressed-up guess;
 *   · the fertile window the engine computes is deliberately NOT carried
 *     into this context. Bloom is not a contraceptive tool, and a
 *     cycle-context card must never read as one.
 *
 * Pure: same input → same output, no storage, no clock of its own.
 */

import {
  analyzeCycle,
  describeNextPeriod,
  type Confidence,
  type CycleAnalysis,
  type PeriodLog,
  type Phase,
} from "@/lib/cycle/predict";
import type { CycleMode } from "@/lib/cycle/periodStore";
import { phaseNote } from "./notes";

export type CycleContextUnavailableReason =
  | "tracking-off"
  | "tracking-paused"
  | "no-entries"
  | "not-personalised"
  | "no-phase";

export interface CycleContextAvailable {
  state: "available";
  /** The engine's phase, verbatim (includes "late"). */
  phase: Phase;
  phaseLabel: string;
  /** 1-based day of the current cycle, from the engine. */
  cycleDay: number;
  /** The engine's confidence, passed through — never upgraded. */
  confidence: Exclude<Confidence, "none">;
  /** The engine's own plain-language reason for that confidence. */
  confidenceReason: string;
  /** Next predicted period start (engine estimate), or null. */
  nextStart: string | null;
  /**
   * The honest next-period window. Mirrors predict.ts guidance: the range
   * whenever confidence isn't high, the single date only at high confidence.
   */
  nextWindow: { from: string; to: string; spread: number } | null;
  /** One sentence about the next period, from the engine's own describer. */
  nextSummary: string | null;
  /** General educational note for the phase (see notes.ts). */
  note: string;
  /** Where every number above came from — always her own logged cycle. */
  basis: string;
}

export interface CycleContextUnavailable {
  state: "unavailable";
  reason: CycleContextUnavailableReason;
  /** Plain-language explanation, safe to show verbatim. */
  message: string;
}

export type CyclePhaseContext = CycleContextAvailable | CycleContextUnavailable;

const unavailable = (
  reason: CycleContextUnavailableReason,
  message: string,
): CycleContextUnavailable => ({ state: "unavailable", reason, message });

/**
 * Build today's cycle context from the period logs + settings mode.
 *
 * `mode` is the EFFECTIVE mode for today (see `effectiveMode` in
 * periodStore.ts): "paused" and "off" mean no forward-looking context at
 * all, however rich the history is.
 */
export function buildCycleContext(input: {
  logs: readonly PeriodLog[];
  today: string;
  mode: CycleMode;
  personalMaxPlausible?: number | null;
}): CyclePhaseContext {
  if (input.mode === "off") {
    return unavailable(
      "tracking-off",
      "Cycle tracking is off, so Bloom keeps no cycle context. Your logged history is still yours — turn tracking back on and the context returns from the same record.",
    );
  }
  if (input.mode === "paused") {
    return unavailable(
      "tracking-paused",
      "Cycle predictions are paused right now, so there is no cycle context for today. Your history stays logged; the context returns when tracking resumes.",
    );
  }

  const analysis: CycleAnalysis = analyzeCycle(input.logs, input.today, {
    expecting: true,
    ...(input.personalMaxPlausible != null
      ? { personalMaxPlausible: input.personalMaxPlausible }
      : {}),
  });

  if (analysis.entryCount === 0) {
    return unavailable(
      "no-entries",
      "Nothing is logged yet, so there is no cycle context to show. Log the first day of a period and Bloom starts building context from your own record — never from a generic pattern.",
    );
  }

  /* Confidence "none" means the dates behind the estimate are the population
     fallback, not her pattern (see predict.ts). Presenting a phase from that
     would fabricate a personal context out of a generic average. */
  if (analysis.confidence === "none" || analysis.isGeneric) {
    return unavailable(
      "not-personalised",
      "Your record is still too thin for a personal cycle context — so far the estimates rest on a general pattern, not your cycles. Log one more period start and the context becomes yours.",
    );
  }

  if (!analysis.phase || analysis.cycleDay === null) {
    return unavailable(
      "no-phase",
      "Bloom can't place today inside a cycle from the current record, so no context is shown rather than a guess.",
    );
  }

  const note = phaseNote(analysis.phase);
  if (!note) {
    return unavailable(
      "no-phase",
      "Bloom can't place today inside a cycle from the current record, so no context is shown rather than a guess.",
    );
  }

  const confidence = analysis.confidence as Exclude<Confidence, "none">;
  const nextWindow =
    confidence === "high"
      ? analysis.nextStart
        ? { from: analysis.nextStart, to: analysis.nextStart, spread: 0 }
        : null
      : analysis.nextWindow;

  return {
    state: "available",
    phase: analysis.phase,
    phaseLabel: analysis.phaseLabel,
    cycleDay: analysis.cycleDay,
    confidence,
    confidenceReason: analysis.confidenceReason,
    nextStart: analysis.nextStart,
    nextWindow,
    nextSummary: describeNextPeriod(analysis),
    note,
    basis: `Estimates from your own logged cycle — ${analysis.stats.cyclesLogged} completed ${analysis.stats.cyclesLogged === 1 ? "cycle" : "cycles"} in your record.`,
  };
}
