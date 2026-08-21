import { Insufficient, Panel, SectionHead, accentVar, type Accent } from "./primitives";
import { cn } from "@/lib/utils";

export interface DistributionBucket {
  key: string;
  label: string;
  accent: string;
  count: number;
  share: number;
  delta: number;
  dates: string[];
}

export function Distribution({
  buckets,
  volatility,
}: {
  buckets: DistributionBucket[];
  volatility: { avgDelta: number; largest: number; smallest: number; sd: number; stability: number | null };
}) {
  const total = buckets.reduce((a, b) => a + b.count, 0);

  return (
    <Panel className="p-6" glow="violet">
      <SectionHead
        eyebrow="Shape"
        title="Distribution & stability"
        sub="How your days are spread across mood bands, and how violently they swing."
      />

      {total === 0 ? (
        <Insufficient>Log a few days to see the shape of your mood distribution.</Insufficient>
      ) : (
        <>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-2">
            {buckets.map((b) =>
              b.count ? (
                <span
                  key={b.key}
                  className="h-full transition-all duration-700"
                  style={{ width: `${b.share}%`, background: accentVar[b.accent as Accent] }}
                  title={`${b.label}: ${b.count} days`}
                />
              ) : null,
            )}
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {buckets.map((b) => (
              <div key={b.key} className="rounded-[12px] border border-border bg-surface-2/40 p-3">
                <p className="flex items-center gap-2 text-[12px] text-foreground">
                  <span className="size-1.5 rounded-full" style={{ background: accentVar[b.accent as Accent] }} />
                  {b.label}
                </p>
                <p className="numeric mt-1.5 text-[20px] text-foreground">{b.count}</p>
                <p className="mono text-[10px] text-faint">
                  {b.share.toFixed(0)}% ·{" "}
                  <span className={cn(b.delta === 0 ? "text-faint" : b.delta > 0 ? "text-sage" : "text-rose")}>
                    {b.delta > 0 ? "+" : ""}
                    {b.delta} vs prev
                  </span>
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[12px] border border-border bg-surface-2/40 p-5">
              <p className="eyebrow mb-3">Stability index</p>
              <div className="flex items-end gap-3">
                <p className="numeric text-[34px] leading-none text-sage">
                  {volatility.stability === null ? "—" : volatility.stability}
                </p>
                <span className="mono pb-1 text-[11px] text-faint">/ 100</span>
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-3">
                <span
                  className="block h-full rounded-full transition-all duration-700"
                  style={{ width: `${volatility.stability ?? 0}%`, background: "var(--sage)" }}
                />
              </div>
              <p className="mt-3 text-[12px] text-muted-foreground">
                Derived from average day-to-day mood change. Higher means a steadier emotional baseline.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Avg daily change", value: volatility.avgDelta.toFixed(2) },
                { label: "Largest swing", value: volatility.largest.toFixed(1) },
                { label: "Smallest change", value: volatility.smallest.toFixed(2) },
                { label: "Std deviation", value: volatility.sd.toFixed(2) },
              ].map((m) => (
                <div key={m.label} className="rounded-[12px] border border-border bg-surface-2/40 p-4">
                  <p className="eyebrow mb-2">{m.label}</p>
                  <p className="numeric text-[20px] text-foreground">{m.value}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </Panel>
  );
}
