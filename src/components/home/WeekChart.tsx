/**
 * The week in bars — the prototype's WeekChart language over Bloom's real
 * ticks: this week in gold, the week before muted beside it, dashed
 * gridlines, and the totals carrying the same delta pill the Overview
 * band uses (habit ticks: up is the good direction).
 */

import { useState } from "react";

import type { WeekTicks } from "@/lib/home/weekChart";
import { CountUp } from "./CountUp";
import { DeltaPill } from "./DeltaPill";
import { cn } from "@/lib/utils";

export function WeekChart({ data }: { data: WeekTicks }) {
  const [hover, setHover] = useState<number | null>(null);
  const { thisWeek, prevWeek, labels, totalThis, totalPrev } = data;
  const max = Math.max(5, ...thisWeek, ...prevWeek);
  const active = hover ?? thisWeek.length - 1;
  const direction =
    totalThis === totalPrev ? "flat" : totalThis > totalPrev ? "up" : "down";

  return (
    <section
      className="home-panel home-rise p-5 sm:p-7"
      style={{ animationDelay: "110ms" }}
      aria-labelledby="home-week-title"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="home-eyebrow">Overview · last 7 days</p>
          <h2 id="home-week-title" className="home-band-title mt-1">
            Your week in ticks
          </h2>
        </div>
        <div className="hidden items-center gap-4 pt-1 text-[length:var(--text-meta)] text-muted-foreground sm:flex">
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-gold" aria-hidden /> This week
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-white/20" aria-hidden /> Before
          </span>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-baseline gap-3">
        <span className="font-display text-4xl leading-none tabular-nums">
          <CountUp value={totalThis} id="week-ticks-total" />
        </span>
        <span className="text-[length:var(--text-support)] text-muted-foreground">
          habits ticked
        </span>
        <DeltaPill id="habit-ticks" label="Habit ticks" direction={direction} />
      </div>

      <div className="relative mt-6 h-40">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="absolute inset-x-0 border-t border-dashed border-white/[0.06]"
            style={{ top: `${(i / 3) * 100}%` }}
            aria-hidden
          />
        ))}
        <div className="relative flex h-full items-end justify-between gap-2 sm:gap-3">
          {thisWeek.map((v, i) => (
            <div
              key={i}
              className="relative flex h-full flex-1 flex-col items-center justify-end"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <div
                className={cn(
                  "pointer-events-none absolute z-10 whitespace-nowrap rounded-lg border border-white/10 bg-surface-2 px-2.5 py-1.5 text-[length:var(--text-micro)] shadow-xl transition-opacity duration-200",
                  hover === i ? "opacity-100" : "opacity-0",
                )}
                style={{
                  bottom: `calc(${(Math.max(v, prevWeek[i]!) / max) * 100}% + 8px)`,
                }}
                aria-hidden
              >
                <span className="text-gold">{v}</span>{" "}
                <span className="text-muted-foreground">vs {prevWeek[i]} before</span>
              </div>
              <div className="flex h-full w-full items-end justify-center gap-1">
                <div
                  className="w-1/2 max-w-[18px] rounded-t-md bg-white/[0.12] transition-all duration-[var(--motion-page)]"
                  style={{ height: `${(prevWeek[i]! / max) * 100}%`, minHeight: 3 }}
                  aria-hidden
                />
                <div
                  className={cn(
                    "w-1/2 max-w-[18px] rounded-t-md transition-all duration-[var(--motion-signature)]",
                    active === i
                      ? "opacity-100 shadow-[0_0_24px_rgba(220,192,143,0.45)]"
                      : "opacity-60",
                  )}
                  style={{
                    height: `${(v / max) * 100}%`,
                    minHeight: 3,
                    background:
                      "linear-gradient(to top, var(--gold), var(--gold-soft))",
                  }}
                  aria-hidden
                />
              </div>
              <span className="sr-only">
                {labels[i]}: {v} ticks, {prevWeek[i]} the week before
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex justify-between gap-2 sm:gap-3" aria-hidden>
        {labels.map((l, i) => (
          <div
            key={i}
            className={cn(
              "flex-1 text-center text-[length:var(--text-micro)] transition-colors",
              active === i ? "text-gold" : "text-muted-foreground",
            )}
          >
            {i === labels.length - 1 ? "Today" : l}
          </div>
        ))}
      </div>
    </section>
  );
}
