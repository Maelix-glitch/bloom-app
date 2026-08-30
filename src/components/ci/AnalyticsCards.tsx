/**
 * AnalyticsCards — the numbers behind the prediction, the flow mix, the four
 * phases laid out with real dates, and the next three cycles projected.
 *
 * Every figure here is derived from logged entries by the pure core; nothing
 * is invented and nothing is hidden when the data doesn't support it.
 */

import {
  FLOW_LABEL,
  PHASE_GUIDE,
  PHASE_LABEL,
  formatDate,
  type CycleAnalysis,
} from "@/lib/cycle/predict";

const pct = (n: number, total: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

/* --------------------------------- stats --------------------------------- */

export function StatsStrip({ analysis }: { analysis: CycleAnalysis }) {
  const { stats } = analysis;
  const items: { label: string; value: string; sub: string }[] = [
    {
      label: "Cycles logged",
      value: String(stats.cyclesLogged),
      sub: stats.excludedGaps > 0 ? `${stats.excludedGaps} gap left out` : "usable cycles",
    },
    {
      label: "Average",
      value: `${analysis.averageLength.toFixed(1)}d`,
      sub: analysis.isGeneric ? "generic placeholder" : "recency-weighted",
    },
    {
      label: "Range",
      value:
        stats.shortest !== null && stats.longest !== null
          ? `${stats.shortest}–${stats.longest}d`
          : "—",
      sub: stats.shortest !== null ? "shortest to longest" : "needs two cycles",
    },
    {
      label: "Variability",
      value: `±${analysis.variability.toFixed(1)}d`,
      sub:
        stats.predictability !== null
          ? `${pct(Math.round(stats.predictability * 100), 100)}% within ±3d`
          : "needs two cycles",
    },
    {
      label: "Bleed length",
      value: stats.averageBleed !== null ? `${stats.averageBleed}d` : "—",
      sub:
        stats.averageBleed !== null
          ? `logged on ${stats.entriesWithEnd} of ${analysis.entryCount}`
          : "add end dates",
    },
    {
      label: "Days tracked",
      value: stats.daysTracked !== null ? String(stats.daysTracked) : "—",
      sub: stats.firstEntry ? `since ${formatDate(stats.firstEntry)}` : "nothing logged yet",
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="ci-eyebrow">{item.label}</dt>
          <dd className="ci-num mt-1 text-[18px] leading-none" style={{ color: "var(--ci-text)" }}>
            {item.value}
          </dd>
          <dd className="mt-1.5 text-[11px] leading-snug ci-muted">{item.sub}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ------------------------------ flow mix --------------------------------- */

const FLOW_BAR: Record<string, string> = {
  light: "var(--ci-follicular)",
  medium: "var(--ci-luteal)",
  heavy: "var(--ci-menstrual)",
  unspecified: "var(--ci-line-strong)",
};

export function FlowBreakdown({ analysis }: { analysis: CycleAnalysis }) {
  const { flowCounts, mostCommonFlow } = analysis.stats;
  const total = analysis.entryCount;
  const rows = (["heavy", "medium", "light", "unspecified"] as const).filter(
    (k) => flowCounts[k] > 0,
  );

  if (total === 0) {
    return <p className="text-[12.5px] ci-muted">Log a period and pick a flow to start this.</p>;
  }

  return (
    <div>
      <div className="space-y-2.5">
        {rows.map((key) => {
          const count = flowCounts[key];
          const share = pct(count, total);
          const label = key === "unspecified" ? "Not specified" : FLOW_LABEL[key];
          return (
            <div key={key} className="flex items-center gap-3">
              <span className="w-[86px] shrink-0 text-[12px] ci-soft">{label}</span>
              <span
                className="h-[7px] flex-1 overflow-hidden rounded-full"
                style={{ background: "var(--ci-surface-2)" }}
              >
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${Math.max(3, share)}%`,
                    background: FLOW_BAR[key] ?? "var(--ci-line-strong)",
                  }}
                />
              </span>
              <span className="ci-num w-[52px] shrink-0 text-right text-[11.5px] ci-muted">
                {count} · {share}%
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-3.5 text-[12px] leading-relaxed ci-muted">
        {mostCommonFlow && mostCommonFlow !== "unspecified"
          ? `Most of your logged periods are ${FLOW_LABEL[mostCommonFlow].toLowerCase()} flow — ${pct(flowCounts[mostCommonFlow], total)}% of ${total}.`
          : `Flow is recorded on ${total - flowCounts.unspecified} of ${total} entries. Adding it takes one tap and makes the record more useful.`}
        {analysis.stats.entriesWithNotes > 0
          ? ` ${analysis.stats.entriesWithNotes} ${analysis.stats.entriesWithNotes === 1 ? "entry has" : "entries have"} notes.`
          : ""}
      </p>
    </div>
  );
}

/* ------------------------------ phase cards ------------------------------- */

export function PhaseCards({
  analysis,
  compact = false,
}: {
  analysis: CycleAnalysis;
  compact?: boolean;
}) {
  const windows = analysis.phaseWindows;

  return (
    <div className={compact ? "grid grid-cols-2 gap-2" : "grid gap-3 sm:grid-cols-2"}>
      {windows.map((w) => {
        const guide = PHASE_GUIDE[w.phase];
        const days = w.toDay - w.fromDay + 1;
        return (
          <div
            key={w.phase}
            data-phase={w.phase}
            className="rounded-[var(--ci-radius-md)] border p-3.5"
            style={{
              borderColor: w.current ? "var(--phase)" : "var(--ci-line)",
              background: w.current
                ? "color-mix(in oklab, var(--phase) 9%, transparent)"
                : "var(--ci-surface-2)",
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: "var(--phase)" }}
                />
                <p className="text-[13px] font-medium">{PHASE_LABEL[w.phase]}</p>
              </div>
              {w.current ? (
                <span
                  className="ci-badge ci-sheen shrink-0"
                  style={{
                    borderColor: "var(--phase)",
                    color: "var(--phase)",
                    background: "color-mix(in oklab, var(--phase) 14%, transparent)",
                  }}
                >
                  you are here
                </span>
              ) : null}
            </div>

            <p className="ci-num mt-2 text-[11.5px] ci-muted">
              day {w.fromDay}–{w.toDay} · {days}d · {formatDate(w.from)} – {formatDate(w.to)}
            </p>
            {!compact ? (
              <>
                <p className="mt-2 text-[12px] leading-relaxed ci-soft">{guide.summary}</p>
                <p className="mt-2 text-[11.5px] leading-relaxed ci-muted">
                  Often reported: {guide.signals.join(", ")}.
                </p>
              </>
            ) : (
              <p className="mt-1.5 text-[11.5px] ci-soft">{guide.window}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------- forecast -------------------------------- */

export function ForecastStrip({
  analysis,
  compact = false,
}: {
  analysis: CycleAnalysis;
  compact?: boolean;
}) {
  const cycles = analysis.forecast;
  if (cycles.length === 0) {
    return (
      <p className="text-[12.5px] ci-muted">
        The next three cycles appear here as soon as there's a period to project from.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {cycles.map((c) => (
        <div key={c.index} data-phase="menstrual">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <p className="text-[12.5px] font-medium">
              {c.index === 1 ? "Next cycle" : `Cycle +${c.index - 1}`}
            </p>
            <p className="ci-num text-[11.5px] ci-muted">
              {formatDate(c.start)} – {formatDate(c.end)} · ovulation {formatDate(c.ovulation)}
            </p>
          </div>
          <div
            className="mt-1.5 flex h-[10px] w-full gap-[2px] overflow-hidden rounded-full"
            role="img"
            aria-label={`Cycle starting ${formatDate(c.start)}: ${c.phases
              .map((p) => `${PHASE_LABEL[p.phase]} days ${p.fromDay} to ${p.toDay}`)
              .join(", ")}`}
          >
            {c.phases.map((p) => (
              <span
                key={p.phase}
                className="h-full first:rounded-l-full last:rounded-r-full"
                style={{
                  width: `${((p.toDay - p.fromDay + 1) / Math.max(1, c.phases[c.phases.length - 1]!.toDay)) * 100}%`,
                  background: `var(--ci-${p.phase})`,
                  opacity: p.phase === "menstrual" ? 0.95 : 0.5,
                }}
                title={`${PHASE_LABEL[p.phase]} · day ${p.fromDay}–${p.toDay}`}
              />
            ))}
          </div>
          {!compact && c.index === 1 ? (
            <p className="mt-1.5 text-[11.5px] ci-muted">
              Berry is the bleed, gold is the fertile window around {formatDate(c.fertileStart)} –{" "}
              {formatDate(c.fertileEnd)}.
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
