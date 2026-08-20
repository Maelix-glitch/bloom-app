import { useState } from "react";

import { TIME_BANDS, type HeatCell } from "@/lib/mood/analytics";
import { Panel, SectionHead, Insufficient } from "./primitives";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const ORDER = [1, 2, 3, 4, 5, 6, 0];

function intensity(mood: number | null) {
  if (mood === null) return 0;
  return Math.max(0.06, Math.min(1, (mood - 3) / 6));
}

export function Heatmap({ cells }: { cells: HeatCell[] }) {
  const [hover, setHover] = useState<HeatCell | null>(null);
  const populated = cells.filter((c) => c.count > 0);

  const best = [...populated].sort((a, b) => (b.mood ?? 0) - (a.mood ?? 0))[0];
  const bestBand = TIME_BANDS.find((b) => b.key === best?.band);

  return (
    <Panel className="p-6" glow="sky">
      <SectionHead
        eyebrow="Rhythm"
        title="Mood by day & time"
        sub="Where in the week your emotional states actually cluster."
        right={
          bestBand && populated.length >= 4 ? (
            <p className="mono max-w-[24ch] text-right text-[11px] text-muted-foreground">
              Strongest window
              <span className="ml-2 text-sky">{bestBand.range}</span>
            </p>
          ) : null
        }
      />

      {populated.length < 4 ? (
        <Insufficient>Log across a few different days and times to reveal weekly rhythm.</Insufficient>
      ) : (
        <div className="relative">
          <div className="grid grid-cols-[64px_repeat(4,1fr)] gap-1.5">
            <div />
            {TIME_BANDS.map((b) => (
              <div key={b.key} className="pb-2 text-center">
                <p className="mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{b.label}</p>
                <p className="mono text-[9px] text-faint">{b.range}</p>
              </div>
            ))}
            {ORDER.map((wd, i) => (
              <div key={wd} className="contents">
                <div className="mono flex items-center text-[10px] uppercase tracking-[0.08em] text-faint">
                  {WEEKDAYS[i]}
                </div>
                {TIME_BANDS.map((b) => {
                  const cell = cells.find((c) => c.weekday === wd && c.band === b.key);
                  const a = intensity(cell?.mood ?? null);
                  const isHover = hover === cell;
                  return (
                    <button
                      key={b.key}
                      type="button"
                      onMouseEnter={() => setHover(cell ?? null)}
                      onFocus={() => setHover(cell ?? null)}
                      onMouseLeave={() => setHover(null)}
                      onBlur={() => setHover(null)}
                      aria-label={`${WEEKDAYS[i]} ${b.label}: ${cell?.count ? `mood ${cell.mood}` : "no entries"}`}
                      className={cn(
                        "relative h-14 rounded-[10px] border transition-all duration-300",
                        cell?.count
                          ? "border-border hover:border-border-strong"
                          : "border-dashed border-border/60",
                        isHover && "-translate-y-0.5 scale-[1.02]",
                      )}
                      style={
                        cell?.count
                          ? {
                              background: `color-mix(in oklab, var(--sky) ${a * 55}%, var(--surface-2))`,
                              boxShadow: isHover
                                ? `0 0 0 1px color-mix(in oklab, var(--sky) 60%, transparent), 0 14px 30px -18px color-mix(in oklab, var(--sky) 80%, transparent)`
                                : undefined,
                            }
                          : undefined
                      }
                    >
                      {cell?.count ? (
                        <span className="numeric absolute inset-0 flex items-center justify-center text-[13px]">
                          {cell.mood?.toFixed(1)}
                        </span>
                      ) : (
                        <span className="mono absolute inset-0 flex items-center justify-center text-[10px] text-faint">
                          —
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
            <div className="mono flex items-center gap-2 text-[10px] text-faint">
              <span>low</span>
              <span className="h-1.5 w-28 rounded-full" style={{ background: "linear-gradient(90deg, var(--surface-2), var(--sky))" }} />
              <span>high</span>
            </div>
            {hover && hover.count > 0 ? (
              <div className="mono flex flex-wrap gap-4 text-[11px]">
                <span className="text-faint">
                  {WEEKDAYS[ORDER.indexOf(hover.weekday)]} · {TIME_BANDS.find((b) => b.key === hover.band)?.label}
                </span>
                <span>
                  mood <span className="text-sky">{hover.mood?.toFixed(2)}</span>
                </span>
                <span>
                  energy <span className="text-sage">{hover.energy?.toFixed(2)}</span>
                </span>
                <span>
                  stress <span className="text-rose">{hover.stress?.toFixed(2)}</span>
                </span>
                <span className="text-faint">{hover.count} entries</span>
              </div>
            ) : (
              <p className="mono text-[11px] text-faint">Hover a cell for detail</p>
            )}
          </div>
        </div>
      )}
    </Panel>
  );
}
