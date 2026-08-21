import dayjs from "dayjs";

import type { Anomaly, DetectedPattern } from "@/lib/mood/types";
import { EvidencePill, Insufficient, Panel, SectionHead, accentText, accentVar, type Accent } from "./primitives";
import { cn } from "@/lib/utils";

export function Patterns({ patterns }: { patterns: DetectedPattern[] }) {
  return (
    <Panel className="p-6" glow="sage">
      <SectionHead
        eyebrow="Detection"
        title="Recurring patterns"
        sub="Behavioural splits found in your own history, each with the sample it was derived from."
      />
      {patterns.length === 0 ? (
        <Insufficient>Patterns appear once you have logged enough days on both sides of a behaviour.</Insufficient>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {patterns.map((p) => {
            const accent = p.accent as Accent;
            return (
              <article
                key={p.id}
                className="relative overflow-hidden rounded-[12px] border border-border bg-surface-2/40 p-4 transition-colors hover:border-border-strong"
              >
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-px"
                  style={{ background: accentVar[accent], opacity: 0.6 }}
                />
                <div className="flex items-start justify-between gap-3">
                  <p className={cn("text-[13px] font-medium", accentText[accent])}>{p.title}</p>
                  {p.delta ? <span className="numeric text-[15px] text-foreground">{p.delta}</span> : null}
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">{p.statement}</p>
                <div className="mono mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px]">
                  {p.metrics.map((m) => (
                    <span key={m.label} className="text-faint">
                      {m.label} <span className="text-foreground">{m.value}</span>
                    </span>
                  ))}
                </div>
                <div className="mt-3">
                  <EvidencePill evidence={p.evidence} n={p.n} />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

export function Anomalies({ anomalies }: { anomalies: Anomaly[] }) {
  return (
    <Panel className="p-6" glow="rose">
      <SectionHead
        eyebrow="Outliers"
        title="Days that broke the pattern"
        sub="Statistical deviations beyond 1.6σ from your baseline, with the context recorded that day."
      />
      {anomalies.length === 0 ? (
        <Insufficient>No significant deviations detected — or not enough history to judge yet.</Insufficient>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {anomalies.map((a) => (
            <div key={a.date} className="flex flex-wrap items-center gap-4 py-3.5">
              <span
                className={cn(
                  "mono rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.08em]",
                  a.kind === "high" ? "border-sage/40 text-sage" : "border-rose/40 text-rose",
                )}
              >
                {a.kind === "high" ? "peak" : "dip"}
              </span>
              <span className="text-[13px] text-foreground">{dayjs(a.date).format("ddd, MMM D YYYY")}</span>
              <span className="numeric text-[15px] text-foreground">{a.mood.toFixed(1)}</span>
              <span className={cn("mono text-[11px]", a.deviation > 0 ? "text-sage" : "text-rose")}>
                {a.deviation > 0 ? "+" : ""}
                {a.deviation.toFixed(2)} vs {a.baseline.toFixed(2)} baseline
              </span>
              <span className="mono ml-auto flex flex-wrap gap-x-4 text-[11px] text-faint">
                {a.context.map((c) => (
                  <span key={c.label}>
                    {c.label} <span className="text-muted-foreground">{c.value}</span>
                  </span>
                ))}
              </span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
