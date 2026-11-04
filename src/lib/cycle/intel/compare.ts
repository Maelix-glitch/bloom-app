/**
 * Cycle comparison — put two or more recorded cycles side by side.
 *
 * Differences only. The panel must not imply one cycle is "better" than
 * another, so this returns numbers and labels with no verdict, plus a note
 * naming the sample.
 */

import { addDays, diffDays } from "./dates";
import type { Baseline, CycleRecord } from "./types";

export interface ComparedCycle {
  start: string;
  end: string | null;
  lengthDays: number | null;
  bleedingDays: number | null;
  topFlow: string | null;
  symptomDays: number;
  topSymptom: string | null;
  complete: boolean;
}

export interface CycleComparison {
  cycles: ComparedCycle[];
  compared: number;
  note: string;
}

const FLOW_ORDER = ["spotting", "light", "medium", "heavy"];

export function compareRecentCycles(
  record: CycleRecord,
  baseline: Baseline,
  limit = 3,
): CycleComparison {
  const starts = baseline.starts.slice(-Math.max(2, limit));

  const cycles: ComparedCycle[] = starts.map((start, i) => {
    const next = starts[i + 1] ?? baseline.starts[baseline.starts.indexOf(start) + 1] ?? null;
    const end = next ? addDays(next, -1) : null;
    const period = record.periods.find((p) => p.start === start) ?? null;
    const days = record.days.filter((d) => d.date >= start && (!end || d.date <= end));

    const flowCounts = new Map<string, number>();
    const symptomCounts = new Map<string, number>();
    let symptomDays = 0;
    for (const day of days) {
      if (day.flow && FLOW_ORDER.includes(day.flow)) {
        flowCounts.set(day.flow, (flowCounts.get(day.flow) ?? 0) + 1);
      }
      if (day.symptoms.length > 0) symptomDays += 1;
      for (const symptom of day.symptoms) {
        symptomCounts.set(symptom, (symptomCounts.get(symptom) ?? 0) + 1);
      }
    }

    const topFlow =
      [...flowCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const topSymptom =
      [...symptomCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    return {
      start,
      end,
      lengthDays: next ? diffDays(start, next) : null,
      bleedingDays: period?.bleedingDays ?? (period?.end ? diffDays(period.start, period.end) + 1 : null),
      topFlow,
      symptomDays,
      topSymptom,
      complete: Boolean(period?.end) && Boolean(next),
    };
  });

  const complete = cycles.filter((c) => c.complete).length;
  const note =
    cycles.length < 2
      ? "Comparison needs at least two recorded cycles."
      : complete === 0
        ? "Lengths are known for completed cycles, but no bleeding end has been recorded — that column stays empty rather than guessed."
        : `${cycles.length} most recent cycles, ${complete} with a recorded bleed end. Differences here are descriptive; they do not show that one cycle is healthier than another.`;

  return { cycles, compared: cycles.length, note };
}
