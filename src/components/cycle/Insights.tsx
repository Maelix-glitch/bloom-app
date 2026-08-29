import { useState } from "react";
import { Sparkle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Insight } from "@/lib/cycle/intelligence";
import { dismissStore } from "@/lib/cycle/intelligence";
import type { Recommendation } from "@/lib/cycle/types";
import { GhostButton } from "./parts";

export function InsightCard({
  insight,
  signals = [],
  onAsk,
  stillLearning,
  className,
}: {
  insight: Insight | null;
  signals?: string[];
  onAsk?: () => void;
  /** what to show instead of an empty box when there isn't enough data yet */
  stillLearning?: React.ReactNode;
  className?: string;
}) {
  const [dismissed, setDismissed] = useState(false);
  const [why, setWhy] = useState(false);
  const gone = dismissed || (insight !== null && dismissStore.isDismissed(insight.id));
  if (!insight || gone) {
    if (!stillLearning) return null;
    return <div className={cn("cy-ghost max-w-[860px] px-5 py-5", className)}>{stillLearning}</div>;
  }
  return (
    <div
      className={cn("cy-notice", className)}
      style={{
        backgroundImage:
          "linear-gradient(100deg, color-mix(in oklab, var(--violet) 6%, transparent), transparent 55%)",
      }}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="cy-eyebrow flex items-center gap-2">
          <Sparkle className="size-3 text-[color:var(--violet)]" strokeWidth={1.8} aria-hidden />
          Bloom noticed
        </p>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {onAsk ? (
            <button type="button" onClick={onAsk} className="cy-link">
              Ask Bloom why
            </button>
          ) : null}
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
      </div>
      <p className="mt-1.5 max-w-[66ch] text-[13.5px] leading-relaxed text-foreground/90">
        {insight.text}
      </p>
      {signals.length > 0 ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {signals.map((s) => (
            <span
              key={s}
              className="mono rounded-full border border-[var(--cycle-hair-strong)] px-2.5 py-1 text-[8.5px] uppercase tracking-[0.07em] text-faint"
            >
              {s}
            </span>
          ))}
        </div>
      ) : null}
      <div className="mt-2.5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setWhy((w) => !w)}
          aria-expanded={why}
          className="cy-link"
        >
          {why ? "less" : "Explore why →"}
        </button>
      </div>
      {why ? (
        <p className="cy-focus-in mt-1.5 border-t border-[var(--cycle-hair)] pt-2 text-[12px] leading-relaxed text-muted-foreground">
          {insight.why} — stated as correlation from your own logs; the page never claims more than
          the data carries.
        </p>
      ) : null}
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
