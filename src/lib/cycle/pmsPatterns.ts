import { addDays, type PeriodLog } from "./predict";
import type { DayLog } from "./dayLogs";

/**
 * The premenstrual window, read across cycles (Wave C12).
 *
 * For every period start after the first, the window is the `windowDays`
 * days immediately before it — days that belong to a cycle Bloom can see
 * end. A symptom "repeats" when it was logged on at least one day of the
 * window in at least two different cycles. Everything here is a count of
 * what the log holds, in pattern language: no causation, no diagnosis,
 * and nothing at all until two cycles can be compared.
 */

export interface PremenstrualPattern {
  symptom: string;
  /** Cycles whose run-up window contains the symptom at least once. */
  cyclesSeen: number;
  cyclesTotal: number;
}

export interface PremenstrualView {
  /** Windows compared (period starts after the first). */
  cyclesTotal: number;
  symptoms: PremenstrualPattern[];
  /** Cycles whose run-up window holds a rough/low mood day. */
  lowMoodCycles: number;
}

export function premenstrualPatterns(
  logs: readonly PeriodLog[],
  days: readonly DayLog[],
  windowDays = 5,
): PremenstrualView {
  const starts = logs
    .map((l) => l.start)
    .slice()
    .sort((a, b) => a.localeCompare(b));
  const windows = starts.slice(1).map((start) => ({
    from: addDays(start, -windowDays),
    to: addDays(start, -1),
  }));
  const cyclesTotal = windows.length;
  if (cyclesTotal === 0) return { cyclesTotal: 0, symptoms: [], lowMoodCycles: 0 };

  const seen = new Map<string, number>();
  let lowMoodCycles = 0;
  for (const w of windows) {
    const inWindow = days.filter((d) => d.date >= w.from && d.date <= w.to);
    const symptomsHere = new Set<string>();
    for (const d of inWindow) {
      for (const s of d.symptoms ?? []) symptomsHere.add(s);
    }
    for (const s of symptomsHere) seen.set(s, (seen.get(s) ?? 0) + 1);
    if (inWindow.some((d) => d.mood === "low" || d.mood === "rough")) lowMoodCycles += 1;
  }

  const symptoms = [...seen.entries()]
    .filter(([, cyclesSeen]) => cyclesSeen >= 2)
    .map(([symptom, cyclesSeen]) => ({ symptom, cyclesSeen, cyclesTotal }))
    .sort((a, b) => b.cyclesSeen - a.cyclesSeen || a.symptom.localeCompare(b.symptom))
    .slice(0, 5);

  return { cyclesTotal, symptoms, lowMoodCycles };
}

/** One plain sentence for a pattern row — counts only, no interpretation. */
export function premenstrualLine(p: PremenstrualPattern): string {
  return `In the run-up to ${p.cyclesSeen} of your ${p.cyclesTotal} periods`;
}
