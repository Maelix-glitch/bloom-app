import type { Correlation } from "@/lib/mood/types";
import { EvidencePill, Insufficient, Panel, SectionHead } from "./primitives";
import { cn } from "@/lib/utils";

export function Correlations({ correlations }: { correlations: Correlation[] }) {
  const usable = correlations.filter((c) => c.evidence !== "insufficient");

  return (
    <Panel className="p-6" glow="sky">
      <SectionHead
        eyebrow="Relationships"
        title="What moves with your mood"
        sub="Pearson correlation across paired daily observations. Strength is gated by sample size — never presented as causation."
      />

      {usable.length === 0 ? (
        <Insufficient>
          Log contextual data (sleep, exercise, screen time) on at least 8 days to compute reliable
          relationships.
        </Insufficient>
      ) : (
        <div className="flex flex-col gap-3">
          {usable.map((c) => {
            const pct = Math.min(100, Math.abs(c.r) * 100);
            const positive = c.r >= 0;
            return (
              <div
                key={c.key}
                className="group rounded-[12px] border border-border bg-surface-2/40 p-4 transition-colors hover:border-border-strong"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[13px] font-medium text-foreground">{c.label}</p>
                  <div className="flex items-center gap-3">
                    <span
                      className={cn("numeric text-[16px]", positive ? "text-sage" : "text-rose")}
                    >
                      {c.r > 0 ? "+" : ""}
                      {c.r.toFixed(2)}
                    </span>
                    <EvidencePill evidence={c.evidence} n={c.n} />
                  </div>
                </div>
                <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-surface-3">
                  <span className="absolute left-1/2 top-0 h-full w-px bg-border-strong" />
                  <span
                    className="absolute top-0 h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${pct / 2}%`,
                      left: positive ? "50%" : `${50 - pct / 2}%`,
                      background: positive ? "var(--sage)" : "var(--rose)",
                    }}
                  />
                </div>
                <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">{c.statement}</p>
              </div>
            );
          })}
          <p className="mono mt-1 text-[10px] uppercase tracking-[0.08em] text-faint">
            correlation ≠ causation · negative ← 0 → positive
          </p>
        </div>
      )}
    </Panel>
  );
}
