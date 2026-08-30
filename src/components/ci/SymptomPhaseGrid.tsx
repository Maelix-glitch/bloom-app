/**
 * SymptomPhaseGrid — symptoms down the side, phases across the top, colour
 * intensity for how often each pairing shows up in the user's own log.
 *
 * It's the one view that makes "my cramps are a day-one thing" obvious at a
 * glance, without a single number to read.
 */

import { GrowIn } from "./motion";
import { PHASE_LABEL, type Phase } from "@/lib/cycle/predict";
import type { SymptomPhaseRow } from "@/lib/cycle/dayLogs";

const PHASES: Exclude<Phase, "late">[] = ["menstrual", "follicular", "ovulation", "luteal"];

export function SymptomPhaseGrid({
  rows,
  compact = false,
}: {
  rows: SymptomPhaseRow[];
  compact?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-[12.5px] leading-relaxed ci-muted">
        Log symptoms on a few days and this grid fills in — each cell is how often that symptom
        landed in that phase.
      </p>
    );
  }

  return (
    <div>
      <div
        className="grid gap-[3px]"
        style={{ gridTemplateColumns: `minmax(78px, 1.1fr) repeat(4, minmax(0, 1fr))` }}
      >
        <span />
        {PHASES.map((phase) => (
          <span
            key={phase}
            className="pb-1 text-center text-[9.5px] uppercase tracking-[0.08em] ci-muted"
          >
            {compact ? PHASE_LABEL[phase].slice(0, 3) : PHASE_LABEL[phase]}
          </span>
        ))}

        {rows.map((row, rowIndex) => (
          <GridRow key={row.key} row={row} index={rowIndex} />
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2 text-[10.5px] ci-muted">
        <span>less</span>
        {[0, 0.25, 0.5, 0.75, 1].map((step) => (
          <span
            key={step}
            className="h-3 w-5 rounded-[2px]"
            style={{ background: "var(--ci-menstrual)", opacity: 0.12 + step * 0.78 }}
          />
        ))}
        <span>more</span>
      </div>
    </div>
  );
}

function GridRow({ row, index }: { row: SymptomPhaseRow; index: number }) {
  return (
    <>
      <span
        className="flex items-center pr-2 text-[11.5px] capitalize ci-soft"
        title={`${row.key} — ${row.total} ${row.total === 1 ? "day" : "days"}`}
      >
        <span className="truncate">{row.key}</span>
      </span>
      {PHASES.map((phase, col) => {
        const share = row.shares[phase] ?? 0;
        const count = row.counts[phase] ?? 0;
        return (
          <span
            key={phase}
            className="relative flex h-[26px] items-center justify-center overflow-hidden rounded-[3px]"
            style={{
              background:
                share > 0
                  ? `color-mix(in oklab, var(--ci-${phase}) ${Math.round(10 + share * 80)}%, transparent)`
                  : "var(--ci-surface-2)",
              outline:
                count > 0
                  ? "1px solid color-mix(in oklab, var(--ci-" + phase + ") 30%, transparent)"
                  : "none",
            }}
            title={`${row.key} · ${PHASE_LABEL[phase]} · ${count} ${count === 1 ? "day" : "days"}`}
          >
            <GrowIn axis="x" delay={index * 40 + col * 30} className="absolute inset-0">
              <span
                className="block h-full w-full"
                style={{
                  background: `var(--ci-${phase})`,
                  opacity: count > 0 ? 0.06 + share * 0.3 : 0,
                }}
              />
            </GrowIn>
            {count > 0 ? (
              <span className="ci-num relative text-[10.5px]" style={{ color: "var(--ci-text)" }}>
                {count}
              </span>
            ) : null}
          </span>
        );
      })}
    </>
  );
}
