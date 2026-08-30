/**
 * Correlations — what moves together in this record.
 *
 * Every line carries the number of days behind it and says plainly that it is
 * an observation. Two things rising together is not one causing the other, and
 * the page never implies that it is.
 */

import { trackerDef, type Correlation } from "@/lib/trackers/core";

export function Correlations({ items }: { items: Correlation[] }) {
  if (items.length === 0) {
    return (
      <p className="text-[12.5px] leading-relaxed ci-muted">
        Correlations appear once two trackers have at least five days logged side by side. Nothing
        here is filled in before that.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((c) => {
        const a = trackerDef(c.a);
        const b = trackerDef(c.b);
        const positive = c.r >= 0;
        const magnitude = Math.min(1, Math.abs(c.r));
        return (
          <li key={`${c.a}-${c.b}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[12.5px] font-medium">
                {a.name} <span className="ci-muted">and</span> {b.name}
              </p>
              <p className="ci-num text-[11.5px] ci-muted">
                {positive ? "moves together" : "moves apart"} · r = {c.r.toFixed(2)} · {c.n} days
              </p>
            </div>
            <div
              className="mt-1.5 h-[6px] overflow-hidden rounded-full"
              style={{ background: "color-mix(in oklab, var(--ci-text) 10%, transparent)" }}
              aria-hidden
            >
              <div
                style={{
                  width: `${Math.round(magnitude * 100)}%`,
                  height: "100%",
                  borderRadius: 999,
                  background: positive ? a.accent : b.accent,
                  transition: "width 0.8s cubic-bezier(0.22,0.9,0.24,1)",
                }}
              />
            </div>
            <p className="mt-1.5 text-[12px] leading-relaxed ci-soft">{c.sentence}</p>
          </li>
        );
      })}
      <li>
        <p className="text-[11.5px] leading-relaxed ci-muted">
          These describe your own logged days. They are observations, not causes — and they are not
          advice.
        </p>
      </li>
    </ul>
  );
}

export default Correlations;
