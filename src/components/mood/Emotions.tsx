import { Panel, SectionHead, Insufficient, accentText, accentVar, type Accent } from "./primitives";
import type { EmotionKey } from "@/lib/mood/types";
import { cn } from "@/lib/utils";

export interface EmotionStat {
  key: EmotionKey;
  label: string;
  accent: string;
  valence: string;
  count: number;
  share: number;
  avgMood: number;
  trend: number | null;
}

export function Emotions({
  stats,
  filter,
  onFilter,
}: {
  stats: EmotionStat[];
  filter: EmotionKey | null;
  onFilter: (k: EmotionKey | null) => void;
}) {
  const max = stats[0]?.count ?? 1;

  return (
    <Panel className="p-6" glow="rose">
      <SectionHead
        eyebrow="Composition"
        title="Emotional spectrum"
        sub="Frequency, share, and the average mood recorded alongside each state."
        right={
          filter ? (
            <button
              type="button"
              onClick={() => onFilter(null)}
              className="mono rounded-full border border-violet/50 bg-[var(--dim-violet)] px-3 py-1.5 text-[10px] uppercase tracking-[0.08em] text-violet transition-colors hover:border-violet"
            >
              clear filter · {filter}
            </button>
          ) : null
        }
      />

      {stats.length < 2 ? (
        <Insufficient>Tag a few entries with emotions to build your spectrum.</Insufficient>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {stats.slice(0, 10).map((e) => {
            const accent = e.accent as Accent;
            const on = filter === e.key;
            return (
              <button
                key={e.key}
                type="button"
                onClick={() => onFilter(on ? null : e.key)}
                aria-pressed={on}
                className={cn(
                  "group grid grid-cols-[1fr_auto] items-center gap-4 py-3 text-left transition-colors sm:grid-cols-[150px_1fr_auto]",
                  on && "bg-surface-2/50",
                )}
              >
                <span className="flex items-center gap-2.5">
                  <span
                    className="size-1.5 rounded-full transition-transform group-hover:scale-150"
                    style={{ background: accentVar[accent] }}
                  />
                  <span className={cn("text-[13px] font-medium", on ? accentText[accent] : "text-foreground")}>
                    {e.label}
                  </span>
                </span>

                <span className="col-span-2 sm:col-span-1">
                  <span className="relative block h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <span
                      className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                      style={{
                        width: `${(e.count / max) * 100}%`,
                        background: `linear-gradient(90deg, color-mix(in oklab, ${accentVar[accent]} 40%, transparent), ${accentVar[accent]})`,
                      }}
                    />
                  </span>
                </span>

                <span className="mono flex items-center gap-4 justify-self-end text-[11px]">
                  <span className="text-faint">{e.share.toFixed(0)}%</span>
                  <span className="w-9 text-right">{e.count}×</span>
                  <span className={cn("w-9 text-right", accentText[accent])}>{e.avgMood.toFixed(1)}</span>
                  <span className={cn("w-12 text-right", e.trend === null ? "text-faint" : e.trend >= 0 ? "text-sage" : "text-rose")}>
                    {e.trend === null ? "—" : `${e.trend > 0 ? "+" : ""}${e.trend.toFixed(1)}`}
                  </span>
                </span>
              </button>
            );
          })}
          <div className="mono flex justify-end gap-4 pt-3 text-[9px] uppercase tracking-[0.08em] text-faint">
            <span>share</span>
            <span>count</span>
            <span>avg mood</span>
            <span>trend</span>
          </div>
        </div>
      )}
    </Panel>
  );
}
