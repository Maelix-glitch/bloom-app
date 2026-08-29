/**
 * CycleRhythm — history as a personal score. Each completed cycle is one
 * line; its length is drawn as a bar in real proportion, with the personal
 * average standing as a hairline the bars cross against — variation becomes
 * visible, not stated. Tap a line and the day-letters tell its story
 * (start, end, length, distance from your average, what was logged). The
 * metrics band (average / typical period / spread / recent rhythm) appears
 * only when the data earns each number. With no completed cycles, a ghost
 * score previews the shape and says so plainly. Everything else — mood,
 * energy, symptoms, temperature, LH — lives in "Further in your record".
 */

import { useMemo, useState } from "react";

import type { CycleEntry, CycleModel } from "@/lib/cycle/types";
import { addDays, fmtShort } from "@/lib/cycle/engine";

export function CycleRhythm({ model, entries }: { model: CycleModel; entries: CycleEntry[] }) {
  const [sel, setSel] = useState<number | null>(null);
  const rows = useMemo(() => model.completed.slice(-8), [model.completed]);
  const maxLen = Math.max(30, ...rows.map((r) => r.lengthDays));
  const recent = rows.slice(-3);

  const consistency =
    recent.length >= 3
      ? (() => {
          const spread =
            Math.max(...recent.map((r) => r.lengthDays)) -
            Math.min(...recent.map((r) => r.lengthDays));
          return spread <= 2
            ? "steady lately"
            : spread <= 4
              ? "gently varying"
              : "wandering — that's ordinary";
        })()
      : null;

  if (rows.length === 0) {
    return (
      <div className="cy-ghost">
        <p className="cy-title text-[17px]">
          No completed cycles yet — and that's an honest start.
        </p>
        <p className="mt-1.5 max-w-[58ch] text-[13px] leading-relaxed text-muted-foreground">
          A cycle completes when your next period starts. Until then, this is what your record will
          look like — the shapes are real geometry, the numbers only arrive with your logs.
        </p>
        <div className="cy-ghost-lines mt-4" aria-hidden>
          <i style={{ width: "72%" }} />
          <i style={{ width: "86%" }} />
          <i style={{ width: "64%" }} />
          <i style={{ width: "92%" }} />
        </div>
        <p className="mono mt-3 text-[9px] uppercase tracking-[0.1em] text-faint">
          shape preview · nothing invented
        </p>
      </div>
    );
  }

  const selRow = sel !== null ? rows[sel] : null;
  const selEntryCount = selRow
    ? entries.filter((e) => e.date >= selRow.start && e.date < addLen(selRow, 1)).length
    : 0;

  return (
    <div>
      <div className="cy-score" role="list">
        {rows.map((c, i) => {
          const w = (c.lengthDays / maxLen) * 100;
          const avg =
            model.average !== null && model.confidence !== "assumed" ? model.average : null;
          const delta = avg !== null ? c.lengthDays - avg : null;
          return (
            <button
              key={c.start}
              type="button"
              role="listitem"
              aria-pressed={sel === i}
              onClick={() => setSel(sel === i ? null : i)}
              className="cy-score__row"
              data-tip={`${c.lengthDays} days · ${fmtShort(c.start)} → ${fmtShort(addLen(c, 0))}${delta !== null ? ` · ${Math.abs(delta).toFixed(1)}d ${delta >= 0 ? "over" : "under"} your average` : ""}`}
            >
              <span className="cy-score__name">
                Cycle {String(i + (model.completed.length - rows.length) + 1).padStart(2, "0")}
              </span>
              <span className="cy-score__bar">
                <i style={{ width: `${w}%`, opacity: sel === i ? 1 : 0.78 }} />
                {avg !== null ? <u style={{ left: `${(avg / maxLen) * 100}%` }} /> : null}
              </span>
              <span className="cy-score__len">
                {c.lengthDays}
                <span className="ml-0.5 text-[10px] text-faint">d</span>
              </span>
            </button>
          );
        })}
      </div>

      {selRow ? (
        <div className="cy-focus-in mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-1.5 rounded-xl border border-[var(--cycle-hair)] bg-[var(--cy-fill)] px-4 py-3">
          <p className="cy-title text-[15.5px]">
            Cycle {String(model.completed.length - rows.length + sel! + 1).padStart(2, "0")} ·{" "}
            {selRow.lengthDays} days
          </p>
          <p className="text-[12.5px] text-muted-foreground">
            {fmtShort(selRow.start)} → {fmtShort(addLen(selRow, 0))}
          </p>
          <p className="text-[12px] text-faint">
            {model.average !== null
              ? `${(selRow.lengthDays - model.average).toFixed(1)} days from your ${model.average.toFixed(1)}-day average`
              : "average still forming"}
            {" · "}
            {selEntryCount} day{selEntryCount === 1 ? "" : "s"} you logged inside it
          </p>
        </div>
      ) : (
        <p className="mono mt-2.5 text-[9px] uppercase tracking-[0.09em] text-faint">
          tap a line for its story · the thin upright mark is your average
        </p>
      )}

      <div className="cy-metrics">
        {model.average !== null && model.confidence !== "assumed" ? (
          <Metric
            value={model.average.toFixed(1)}
            unit="days"
            label="average cycle"
            sub={`${model.completed.length} completed`}
          />
        ) : null}
        {model.periodLengthAverage !== null ? (
          <Metric
            value={model.periodLengthAverage.toFixed(1)}
            unit="days"
            label="typical period"
            sub="from your logged flow days"
          />
        ) : null}
        {model.stdDev !== null && model.confidence !== "assumed" ? (
          <Metric
            value={`±${model.stdDev.toFixed(1)}`}
            unit="days"
            label="variation"
            sub={
              model.rangeMin !== null
                ? `seen ${model.rangeMin}–${model.rangeMax}`
                : "across your cycles"
            }
          />
        ) : null}
        {consistency ? (
          <Metric
            value={consistency}
            label="recent rhythm"
            sub="last three completed cycles"
            small
          />
        ) : null}
        {model.average === null && model.confidence === "assumed" ? (
          <p className="max-w-[46ch] text-[12.5px] leading-relaxed text-faint">
            One cycle is a beginning, not a baseline — Bloom keeps estimates labeled general until a
            second cycle closes.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Metric({
  value,
  unit,
  label,
  sub,
  small,
}: {
  value: string;
  unit?: string;
  label: string;
  sub?: string;
  small?: boolean;
}) {
  return (
    <div className="cy-metric">
      <b className={small ? "text-[22px]!" : undefined}>
        {value}
        {unit ? <span className="mono ml-1 text-[11px] text-faint">{unit}</span> : null}
      </b>
      <span>{label}</span>
      {sub ? <span className="mt-0.5 block text-[11px] opacity-70">{sub}</span> : null}
    </div>
  );
}

function addLen(c: { start: string; lengthDays: number }, extra: number): string {
  return addDays(c.start, c.lengthDays - 1 + extra);
}
