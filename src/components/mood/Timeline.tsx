import { useMemo, useState } from "react";
import dayjs from "dayjs";
import { Clock3 } from "lucide-react";

import { bucketOf, moodLabel } from "@/lib/mood/analytics";
import { EMOTION_MAP, type DayAggregate } from "@/lib/mood/types";
import { Insufficient, Panel, SectionHead, accentVar, type Accent } from "./primitives";
import { cn } from "@/lib/utils";

export function Timeline({ days }: { days: DayAggregate[] }) {
  const [selected, setSelected] = useState<string | null>(null);

  const active = useMemo(() => {
    if (!days.length) return undefined;
    return days.find((d) => d.date === selected) ?? days[days.length - 1];
  }, [days, selected]);

  const rangeAvg = useMemo(
    () => (days.length ? days.reduce((a, d) => a + d.mood, 0) / days.length : 0),
    [days],
  );

  return (
    <Panel className="p-6" glow="sky">
      <SectionHead
        eyebrow="Chronology"
        title="Daily timeline"
        sub="Every check-in, in order. Pick a day to replay it."
        right={
          days.length ? (
            <select
              value={active?.date ?? ""}
              onChange={(e) => setSelected(e.target.value)}
              className="mono rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-[11px] text-foreground"
              aria-label="Select day"
            >
              {[...days].reverse().map((d) => (
                <option key={d.date} value={d.date}>
                  {dayjs(d.date).format("ddd, MMM D")} · {d.mood.toFixed(1)}
                </option>
              ))}
            </select>
          ) : null
        }
      />

      {!active ? (
        <Insufficient>No days logged inside this range yet.</Insufficient>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3 rounded-[12px] border border-border bg-surface-2/50 px-5 py-4">
            <div>
              <p className="eyebrow mb-1">{dayjs(active.date).format("dddd, MMMM D YYYY")}</p>
              <p className="display text-[17px]">
                {moodLabel(active.mood)} · <span className="numeric">{active.mood.toFixed(2)}</span>
              </p>
            </div>
            <p
              className={cn(
                "mono text-[11px]",
                active.mood - rangeAvg >= 0 ? "text-sage" : "text-rose",
              )}
            >
              {active.mood - rangeAvg >= 0 ? "+" : ""}
              {(active.mood - rangeAvg).toFixed(2)} vs range average
            </p>
          </div>

          <ol className="relative ml-2 flex flex-col gap-5 border-l border-border pl-6">
            {active.entries.map((e) => {
              const accent = bucketOf(e.mood).accent as Accent;
              return (
                <li key={e.id} className="relative">
                  <span
                    aria-hidden
                    className="absolute -left-[31px] top-1 size-2.5 rounded-full ring-4 ring-background"
                    style={{ background: accentVar[accent] }}
                  />
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="mono flex items-center gap-1.5 text-[11px] text-faint">
                      <Clock3 className="size-3" />
                      {dayjs(e.timestamp).format("HH:mm")}
                    </span>
                    <span className="numeric text-[15px]" style={{ color: accentVar[accent] }}>
                      {e.mood.toFixed(1)}
                    </span>
                    <span className="mono text-[11px] text-sage">energy {e.energy.toFixed(1)}</span>
                    <span className="mono text-[11px] text-rose">stress {e.stress.toFixed(1)}</span>
                  </div>
                  {e.emotions.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {e.emotions.map((k) => (
                        <span
                          key={k}
                          className="mono rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-muted-foreground"
                        >
                          {EMOTION_MAP[k]?.label ?? k}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {e.note ? (
                    <p className="mt-2 max-w-[62ch] text-[13px] leading-relaxed text-muted-foreground">
                      {e.note}
                    </p>
                  ) : null}
                  {e.tags.length ? (
                    <p className="mono mt-1.5 text-[10px] text-faint">#{e.tags.join("  #")}</p>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </>
      )}
    </Panel>
  );
}
