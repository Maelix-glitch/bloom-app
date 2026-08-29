import { useState } from "react";
import { Lightbulb, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Insight } from "@/lib/cycle/intelligence";
import { dismissStore } from "@/lib/cycle/intelligence";
import type { Recommendation } from "@/lib/cycle/types";
import { GhostButton } from "./parts";

export function InsightCard({
  insight,
  signals = [],
  onAsk,
  className,
}: {
  insight: Insight | null;
  signals?: string[];
  onAsk?: () => void;
  className?: string;
}) {
  const [dismissed, setDismissed] = useState(false);
  const [why, setWhy] = useState(false);
  if (!insight || dismissed || dismissStore.isDismissed(insight.id)) return null;
  return (
    <div
      className={cn("cy-insight relative flex flex-wrap items-center gap-x-4 gap-y-1.5", className)}
    >
      <Lightbulb
        className="size-4 shrink-0 text-[color:var(--violet)]"
        strokeWidth={1.7}
        aria-hidden
      />
      <p className="min-w-0 flex-1 text-[13px] leading-snug text-muted-foreground">
        <span className="font-medium text-foreground">From your data — </span>
        {insight.text}
      </p>
      <div className="flex shrink-0 items-center gap-1.5">
        {signals.length > 0 ? (
          <button
            type="button"
            onClick={() => setWhy((w) => !w)}
            aria-expanded={why}
            className="mono rounded-full border border-border px-2.5 py-1 text-[9px] uppercase tracking-[0.08em] text-faint transition-colors hover:text-foreground"
          >
            why this
          </button>
        ) : null}
        {onAsk ? <GhostButton onClick={onAsk}>Ask Bloom why</GhostButton> : null}
        <button
          type="button"
          aria-label="Dismiss this insight"
          onClick={() => {
            dismissStore.dismiss(insight.id);
            setDismissed(true);
          }}
          className="grid size-7 place-items-center rounded-full text-faint transition-colors hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <p className="mono w-full pl-8 text-[9px] uppercase tracking-[0.08em] text-faint">
        {insight.why}
      </p>
    </div>
  );
}

export function RecommendationStack({
  recs,
  onDismiss,
  onAsk,
}: {
  recs: Recommendation[];
  onDismiss: (id: string) => void;
  onAsk: (rec: Recommendation) => void;
}) {
  const [why, setWhy] = useState<string | null>(null);
  const primary = recs.find((r) => r.weight === 1);
  const rest = recs.filter((r) => r !== primary);

  if (recs.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-4 text-[12.5px] text-faint">
        Nothing to suggest right now — and that's a valid state.
      </p>
    );
  }

  return (
    <div className="grid gap-x-8 gap-y-0 sm:grid-cols-2">
      {primary ? (
        <article className="cy-rec cy-rec--primary flex flex-col justify-between gap-3 sm:p-5">
          <div>
            <p className="eyebrow mb-1.5">{primary.category}</p>
            <h3 className="display text-[17px] leading-snug">{primary.title}</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{primary.body}</p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="mono text-[9.5px] uppercase tracking-[0.08em] text-faint">
              because: {primary.reason}
            </p>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => onAsk(primary)}
                className="mono rounded-full border border-border px-3 py-1 text-[10px] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:text-foreground"
              >
                Ask Bloom
              </button>
              <button
                type="button"
                onClick={() => onDismiss(primary.id)}
                aria-label="Dismiss suggestion"
                className="mono rounded-full border border-border px-2.5 py-1 text-[10px] uppercase tracking-[0.08em] text-faint transition-colors hover:text-rose"
              >
                No
              </button>
            </div>
          </div>
          {why === primary.id ? (
            <p className="rounded-lg bg-surface-2/60 px-3 py-2 text-[12px] leading-relaxed text-muted-foreground">
              {primary.reason} — computed from your current model; nothing else weighted in.
            </p>
          ) : null}
        </article>
      ) : null}
      <div className="flex flex-col">
        {rest.map((r) => (
          <article
            key={r.id}
            className="cy-rec flex flex-wrap items-start gap-x-3 gap-y-2 px-2 py-3.5 transition-colors"
          >
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-medium">{r.title}</p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-muted-foreground">{r.body}</p>
              <p className="mono mt-1 text-[9px] uppercase tracking-[0.08em] text-faint">
                because: {r.reason}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={() => setWhy(why === r.id ? null : r.id)}
                aria-label={`See why: ${r.title}`}
                className="mono rounded-full border border-border px-2.5 py-1 text-[9.5px] uppercase tracking-[0.08em] text-faint hover:text-foreground"
              >
                Why
              </button>
              <button
                type="button"
                onClick={() => onDismiss(r.id)}
                aria-label={`Dismiss ${r.title}`}
                className="mono rounded-full border border-border px-2.5 py-1 text-[9.5px] uppercase tracking-[0.08em] text-faint hover:text-rose"
              >
                No
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
