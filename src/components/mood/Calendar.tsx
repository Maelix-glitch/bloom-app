import { useMemo, useState } from "react";
import dayjs from "dayjs";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { bucketOf, moodLabel } from "@/lib/mood/analytics";
import type { DayAggregate } from "@/lib/mood/types";
import { EMOTION_MAP } from "@/lib/mood/types";
import { Insufficient, Panel, SectionHead, accentVar, type Accent } from "./primitives";
import { cn } from "@/lib/utils";

const WD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function Calendar({ days }: { days: DayAggregate[] }) {
  const [cursor, setCursor] = useState(() => dayjs().startOf("month"));
  const [selected, setSelected] = useState<string | null>(null);

  const map = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);

  const cells = useMemo(() => {
    const start = cursor.startOf("month");
    const offset = (start.day() + 6) % 7;
    const total = cursor.daysInMonth();
    const out: (string | null)[] = Array.from({ length: offset }, () => null);
    for (let i = 0; i < total; i++) out.push(start.add(i, "day").format("YYYY-MM-DD"));
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [cursor]);

  const monthDays = cells.filter((c): c is string => c !== null).map((c) => map.get(c)).filter(Boolean) as DayAggregate[];
  const monthAvg = monthDays.length
    ? monthDays.reduce((a, d) => a + d.mood, 0) / monthDays.length
    : null;

  const active = selected ? map.get(selected) : undefined;

  return (
    <Panel className="p-6" glow="amber">
      <SectionHead
        eyebrow="Calendar"
        title="Month in colour"
        sub="Every logged day tinted by its average mood. Select a day to inspect it."
        right={
          <div className="flex items-center gap-2">
            <span className="mono mr-2 text-[11px] text-faint">
              {monthAvg === null ? "no data" : `avg ${monthAvg.toFixed(2)}`}
            </span>
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => setCursor((c) => c.subtract(1, "month"))}
              className="rounded-full border border-border p-1.5 text-faint transition-colors hover:border-border-strong hover:text-foreground"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <span className="mono w-[92px] text-center text-[11px] text-foreground">
              {cursor.format("MMM YYYY")}
            </span>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setCursor((c) => c.add(1, "month"))}
              className="rounded-full border border-border p-1.5 text-faint transition-colors hover:border-border-strong hover:text-foreground"
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        }
      />

      <div className="mono mb-2 grid grid-cols-7 gap-1.5 text-center text-[9px] uppercase tracking-[0.08em] text-faint">
        {WD.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((date, i) => {
          if (!date) return <span key={`e${i}`} className="aspect-square" />;
          const day = map.get(date);
          const isToday = date === dayjs().format("YYYY-MM-DD");
          const accent = (day ? bucketOf(day.mood).accent : "violet") as Accent;
          const strength = day ? Math.max(0.12, Math.min(1, (day.mood - 2.5) / 7)) : 0;
          return (
            <button
              key={date}
              type="button"
              onClick={() => setSelected(day ? (selected === date ? null : date) : null)}
              disabled={!day}
              className={cn(
                "group relative aspect-square rounded-[10px] border transition-all duration-300",
                day ? "border-transparent hover:scale-[1.06]" : "border-dashed border-border/60",
                selected === date && "ring-1 ring-violet",
                isToday && "border-border-strong",
              )}
              style={
                day
                  ? {
                      background: `color-mix(in oklab, ${accentVar[accent]} ${Math.round(strength * 62)}%, var(--surface-2))`,
                    }
                  : undefined
              }
              title={day ? `${date} · mood ${day.mood.toFixed(1)}` : date}
            >
              <span className="mono absolute left-1.5 top-1 text-[9px] text-foreground/70">
                {dayjs(date).date()}
              </span>
              {day ? (
                <span className="numeric absolute inset-x-0 bottom-1 text-center text-[12px] text-foreground">
                  {day.mood.toFixed(1)}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {monthDays.length === 0 ? (
        <div className="mt-5">
          <Insufficient>No entries recorded in {cursor.format("MMMM YYYY")}.</Insufficient>
        </div>
      ) : null}

      {active ? (
        <div className="mt-6 rounded-[12px] border border-border bg-surface-2/60 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <p className="eyebrow mb-1">{dayjs(active.date).format("dddd, MMMM D")}</p>
              <p className="display text-[18px]">
                {moodLabel(active.mood)} · <span className="numeric">{active.mood.toFixed(2)}</span>
              </p>
            </div>
            <div className="mono flex gap-4 text-[11px]">
              <span className="text-sage">energy {active.energy.toFixed(1)}</span>
              <span className="text-rose">stress {active.stress.toFixed(1)}</span>
              {typeof active.sleep === "number" ? (
                <span className="text-sky">sleep {active.sleep.toFixed(1)}h</span>
              ) : null}
            </div>
          </div>
          {active.emotions.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {active.emotions.map((k) => (
                <span
                  key={k}
                  className="mono rounded-full border border-border px-2.5 py-1 text-[10px] uppercase tracking-[0.08em] text-muted-foreground"
                >
                  {EMOTION_MAP[k]?.label ?? k}
                </span>
              ))}
            </div>
          ) : null}
          <div className="mt-4 flex flex-col gap-2">
            {active.entries.map((e) => (
              <div key={e.id} className="flex gap-3 text-[12px]">
                <span className="mono w-14 shrink-0 text-faint">{dayjs(e.timestamp).format("HH:mm")}</span>
                <span className="numeric w-8 shrink-0 text-violet">{e.mood.toFixed(1)}</span>
                <span className="text-muted-foreground">{e.note ?? e.tags.join(" · ") ?? ""}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </Panel>
  );
}
