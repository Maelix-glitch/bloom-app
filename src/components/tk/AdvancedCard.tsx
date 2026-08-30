/**
 * AdvancedCard — the deeper read.
 *
 * What separates the days that felt bright from the days that didn't, worked
 * out from this person's own log. Differences, never causes, and every claim
 * carries the number of days behind it.
 */

import type { AdvancedInsight, TrackerDef } from "@/lib/trackers/core";
import { TRACKER_ACCENT } from "@/components/tk/icons";

export function AdvancedCard({
  insight,
  defs,
}: {
  insight: AdvancedInsight;
  defs: TrackerDef[];
}) {
  const defOf = (id: string) => defs.find((d) => d.id === id);

  return (
    <section className="tk-insight" aria-labelledby="tk-advanced">
      <div className="flex items-center gap-2">
        <span
          className="font-[family-name:var(--ci-font-mono)] text-[10.5px] uppercase tracking-[0.14em] text-[var(--ci-late)]"
          id="tk-advanced"
        >
          Advanced insight
        </span>
        <span className="tk-head__rule !bg-[linear-gradient(90deg,color-mix(in_oklab,var(--ci-late)_42%,transparent),transparent)]" />
      </div>

      <p className="mt-3 max-w-[62ch] font-[family-name:var(--ci-font-display)] text-[19px] leading-[1.3]">
        {insight.headline}
      </p>

      {insight.contrasts.length ? (
        <ul className="mt-4 grid gap-2.5">
          {insight.contrasts.slice(0, 4).map((c) => {
            const def = defOf(c.id);
            if (!def) return null;
            const top = Math.max(c.bright, c.low, 1);
            return (
              <li
                key={c.id}
                className="tk-insight__contrast"
                style={{ ["--tk-accent" as string]: TRACKER_ACCENT[c.id] }}
              >
                <span className="tk-row__value">{def.name}</span>
                <span>
                  <span className="tk-insight__track block">
                    <i style={{ width: `${Math.round((c.low / top) * 100)}%`, opacity: 0.35 }} />
                  </span>
                  <span className="tk-insight__track mt-1 block">
                    <i style={{ width: `${Math.round((c.bright / top) * 100)}%` }} />
                  </span>
                </span>
                <span className="text-right">
                  <span className="block font-[family-name:var(--ci-font-mono)] text-[11.5px]">
                    {def.format(Math.round(c.low))} → {def.format(Math.round(c.bright))}
                  </span>
                  <span className="block font-[family-name:var(--ci-font-mono)] text-[10px] opacity-60">
                    {c.delta > 0 ? "+" : ""}
                    {c.delta}%
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}

      <ul className="mt-4 grid gap-1.5">
        {insight.detail.map((line, i) => (
          <li key={i} className="text-[12.5px] leading-[1.6] opacity-80">
            {line}
          </li>
        ))}
      </ul>

      <p className="mt-3 font-[family-name:var(--ci-font-mono)] text-[10px] uppercase tracking-[0.1em] opacity-50">
        Top bar of each pair: low-energy days. Bottom: bright ones.
      </p>
    </section>
  );
}

export default AdvancedCard;
