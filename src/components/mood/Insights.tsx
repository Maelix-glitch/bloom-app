import { BrainCircuit } from "lucide-react";

import type { Insight } from "@/lib/mood/types";
import { Insufficient, Panel, SectionHead } from "./primitives";

const kindAccent: Record<Insight["kind"], string> = {
  trend: "text-violet",
  consistency: "text-sky",
  emotion: "text-amber",
  correlation: "text-sage",
  timing: "text-rose",
  stability: "text-sky",
};

export function Insights({
  insights,
  tier,
}: {
  insights: Insight[];
  tier: { current: { label: string }; next?: { min: number; label: string } | undefined; tiers: readonly { min: number; label: string }[] };
}) {
  return (
    <Panel className="p-6" glow="violet">
      <SectionHead
        eyebrow="Synthesis"
        title="Insights center"
        sub="Plain-language statements generated strictly from your recorded data."
        right={
          <span className="mono flex items-center gap-2 rounded-full border border-violet/40 bg-[var(--dim-violet)] px-3 py-1.5 text-[10px] uppercase tracking-[0.08em] text-violet">
            <BrainCircuit className="size-3" /> {tier.current.label}
          </span>
        }
      />

      {insights.length === 0 ? (
        <Insufficient>Insights unlock after a few logged days.</Insufficient>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {insights.map((i) => (
            <div
              key={i.id}
              className="rounded-[12px] border border-border bg-surface-2/40 p-4 transition-colors hover:border-border-strong"
            >
              <p className={`eyebrow mb-2 ${kindAccent[i.kind]}`}>{i.kind}</p>
              <p className="text-[13px] leading-relaxed text-muted-foreground">{i.text}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6">
        <p className="eyebrow mb-3">Analysis depth</p>
        <div className="flex flex-wrap gap-1.5">
          {tier.tiers.map((t) => (
            <span
              key={t.label}
              className={`mono rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.08em] ${
                t.label === tier.current.label
                  ? "border-violet/60 bg-[var(--dim-violet)] text-violet"
                  : "border-border text-faint"
              }`}
            >
              {t.label}
            </span>
          ))}
        </div>
      </div>
    </Panel>
  );
}
