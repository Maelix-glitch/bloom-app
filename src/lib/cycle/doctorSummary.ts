import {
  addDays,
  diffDays,
  formatDate,
  type CycleAnalysis,
  type PeriodLog,
} from "./predict";
import type { DayLog } from "./dayLogs";

/**
 * The doctor summary (Wave C13) — one printable page of the last twelve
 * months, built only from the record: dates, lengths, flow, the symptoms
 * most logged, and the stretches Bloom left out of the averages (with the
 * reason it recorded at the time). No predictions are printed as facts —
 * the summary is the history, which is what an appointment needs.
 */

export interface DoctorPeriodRow {
  start: string;
  startLabel: string;
  endLabel: string | null;
  bleedDays: number | null;
  /** Days from this start to the next start; null for the latest period. */
  cycleDays: number | null;
  flow: string | null;
  excluded: boolean;
  notes: string | null;
}

export interface DoctorSummary {
  fromLabel: string;
  toLabel: string;
  rows: DoctorPeriodRow[];
  stats: { label: string; value: string }[];
  topSymptoms: { symptom: string; days: number }[];
  deviations: string[];
}

export function buildDoctorSummary(input: {
  logs: readonly PeriodLog[];
  days: readonly DayLog[];
  analysis: CycleAnalysis;
  today: string;
}): DoctorSummary {
  const { analysis, today } = input;
  const from = addDays(today, -365);
  const sorted = input.logs.slice().sort((a, b) => a.start.localeCompare(b.start));
  const inWindow = sorted.filter((l) => l.start >= from);

  const rows: DoctorPeriodRow[] = inWindow.map((log) => {
    const next = sorted[sorted.indexOf(log) + 1] ?? null;
    return {
      start: log.start,
      startLabel: formatDate(log.start),
      endLabel: log.end ? formatDate(log.end) : null,
      bleedDays: log.end ? diffDays(log.start, log.end) + 1 : null,
      cycleDays: next ? diffDays(log.start, next.start) : null,
      flow: log.flow ?? null,
      excluded: log.excluded === true,
      notes: log.notes ?? null,
    };
  });

  const { stats } = analysis;
  const statRows: { label: string; value: string }[] = [
    {
      label: "Cycles logged (12 months)",
      value: String(rows.length),
    },
    {
      label: "Typical cycle length",
      value:
        analysis.averageLength !== null
          ? `${Math.round(analysis.averageLength)} days`
          : "Not enough data",
    },
    {
      label: "Shortest, longest counted cycle",
      value:
        stats.shortest !== null && stats.longest !== null
          ? `${stats.shortest} - ${stats.longest} days`
          : "-",
    },
    {
      label: "Typical period length",
      value: stats.averageBleed !== null ? `${Math.round(stats.averageBleed)} days` : "-",
    },
  ];
  if (stats.excludedCycles > 0) {
    statRows.push({
      label: "Cycles excluded from averages (kept in history)",
      value: String(stats.excludedCycles),
    });
  }

  const symptomDays = new Map<string, number>();
  for (const d of input.days) {
    if (d.date < from) continue;
    for (const s of d.symptoms ?? []) symptomDays.set(s, (symptomDays.get(s) ?? 0) + 1);
  }
  const topSymptoms = [...symptomDays.entries()]
    .map(([symptom, days]) => ({ symptom, days }))
    .sort((a, b) => b.days - a.days || a.symptom.localeCompare(b.symptom))
    .slice(0, 6);

  const deviations = analysis.gaps
    .filter((g) => !g.plausible && g.fromStart >= from && g.reason !== null)
    .map(
      (g) =>
        `${formatDate(g.fromStart)} → ${formatDate(g.toStart)}: ${g.days} days. ${g.reason}`,
    );

  return {
    fromLabel: formatDate(from),
    toLabel: formatDate(today),
    rows,
    stats: statRows,
    topSymptoms,
    deviations,
  };
}
