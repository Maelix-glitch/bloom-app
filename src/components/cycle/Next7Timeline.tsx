/**
 * Next 7 days — a continuous path with a node per day. Fertility/phase
 * states are read from the same engine the rest of the page uses; today is
 * anchored, logged days are solid, estimated days are soft. Selecting a node
 * opens an inline detail — never a modal — and can jump straight into the
 * advanced log for that date.
 */

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { addDays, dayStateFor, fmtShort } from "@/lib/cycle/engine";
import type { CycleEntry, CycleModel, PhaseKey } from "@/lib/cycle/types";
import { PHASE_COLOR } from "@/lib/cycle/palette";

const PHASE_TEXT: Record<PhaseKey, string> = {
  menstrual: "period window",
  follicular: "follicular",
  ovulation: "fertile peak (est.)",
  luteal: "luteal",
};

function idxOf(days: { date: string }[], date: string): number {
  return days.findIndex((d) => d.date === date);
}

export function Next7Timeline({
  model,
  entries,
  onLogDay,
}: {
  model: CycleModel;
  entries: CycleEntry[];
  onLogDay: (date: string) => void;
}) {
  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(model.today, i);
      return { date, state: dayStateFor(date, entries, model) };
    });
  }, [model, entries]);

  const [selected, setSelected] = useState<string>(model.today);
  const sel = days.find((d) => d.date === selected) ?? days[0]!;

  return (
    <div className="rounded-2xl border border-border/70 bg-surface/35 px-4 py-4 sm:px-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="eyebrow">Seven days ahead</p>
        <p className="mono hidden text-[8.5px] uppercase tracking-[0.08em] text-faint sm:block">
          solid = logged · soft = estimated
        </p>
      </div>

      <div className="no-scrollbar overflow-x-auto pb-1">
        <div className="relative mx-auto min-w-[560px] px-2">
          {/* continuous path with a phase-coloured gradient underneath */}
          <svg
            aria-hidden
            viewBox="0 0 700 8"
            preserveAspectRatio="none"
            className="absolute left-2 right-2 top-[31px] h-[8px] w-[calc(100%-1rem)]"
          >
            <defs>
              <linearGradient id="cyc-path" x1="0" y1="0" x2="1" y2="0">
                {days.map((d, i) => (
                  <stop
                    key={d.date}
                    offset={`${(i / (days.length - 1)) * 100}%`}
                    stopColor={
                      d.state.phase ? PHASE_COLOR[d.state.phase as PhaseKey] : "var(--border)"
                    }
                    stopOpacity={d.state.phase ? (d.date === model.today ? 0.95 : 0.5) : 0.25}
                  />
                ))}
              </linearGradient>
            </defs>
            <rect x="0" y="2.5" width="700" height="3" rx="1.5" fill="url(#cyc-path)" />
            <rect x="0" y="3.4" width="700" height="1.2" rx="0.6" fill="none" />
          </svg>

          <ol className="relative flex justify-between">
            {days.map((d) => {
              const isToday = d.date === model.today;
              const logged = d.state.logged !== null;
              const on = selected === d.date;
              return (
                <li key={d.date} className="flex w-20 shrink-0 flex-col items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelected(d.date)}
                    aria-pressed={on}
                    aria-label={`${fmtShort(d.date)}${isToday ? ", today" : ""}${d.state.phase ? `, ${d.state.phase} phase${logged ? ", logged" : ", estimated"}` : ""}`}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl px-2 py-1.5 outline-none transition-[background-color,transform] duration-[var(--motion-fast)] hover:bg-surface-2/60 focus-visible:bg-surface-2/80",
                      on && "bg-surface-2/80",
                    )}
                  >
                    <span
                      className={cn(
                        "mono text-[9px] uppercase tracking-[0.08em]",
                        isToday ? "text-foreground" : "text-faint",
                      )}
                    >
                      {(() => {
                        const [y, m, day] = d.date.split("-");
                        const prev = days[idxOf(days, d.date) - 1];
                        const monthChanged = !prev || prev.date.slice(5, 7) !== m;
                        return isToday
                          ? "today"
                          : monthChanged
                            ? `${Number(m)}/${Number(day)}`
                            : Number(day);
                      })()}
                    </span>
                    <span
                      className={cn(
                        "grid place-items-center rounded-full border transition-all duration-[var(--motion-med)]",
                        isToday ? "size-[22px]" : "size-[14px]",
                        on && "scale-110",
                      )}
                      style={{
                        borderColor: d.state.phase
                          ? `color-mix(in oklab, ${PHASE_COLOR[d.state.phase as PhaseKey]} ${logged ? "85%" : "45%"}, transparent)`
                          : "var(--border-strong)",
                        background: logged
                          ? d.state.phase
                            ? PHASE_COLOR[d.state.phase as PhaseKey]
                            : "var(--surface-3)"
                          : d.state.predictedFertile || d.state.predictedOvulation
                            ? `color-mix(in oklab, var(--cycle-ovulation) 18%, transparent)`
                            : "transparent",
                        borderStyle: logged ? "solid" : "dashed",
                        boxShadow: isToday
                          ? `0 0 0 4px color-mix(in oklab, ${
                              d.state.phase
                                ? PHASE_COLOR[d.state.phase as PhaseKey]
                                : "var(--foreground)"
                            } 14%, transparent)`
                          : undefined,
                      }}
                      aria-hidden
                    >
                      {d.state.predictedPeriod ||
                      (d.state.logged?.flow && d.state.logged.flow !== "none") ? (
                        <span
                          className={cn(
                            "block rounded-full",
                            isToday ? "size-[6px]" : "size-[4px]",
                          )}
                          style={{ background: "var(--background)" }}
                          aria-hidden
                        />
                      ) : null}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] leading-tight",
                        isToday ? "font-medium text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {d.state.phase ? PHASE_TEXT[d.state.phase as PhaseKey].split(" ")[0] : "—"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* inline detail — selection never opens a modal */}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-border/60 bg-surface/50 px-3.5 py-2.5">
        <p className="text-[13px]">
          <span className="font-medium">{fmtShort(sel.date)}</span>
          <span className="text-muted-foreground">
            {sel.state.phase ? ` · ${PHASE_TEXT[sel.state.phase as PhaseKey]}` : ""}
            {sel.state.predictedFertile && !sel.state.logged
              ? " · inside the estimated fertile window"
              : ""}
          </span>
        </p>
        <span className="mono rounded-full border border-border px-2 py-0.5 text-[8.5px] uppercase tracking-[0.08em] text-faint">
          {sel.state.logged ? "logged by you" : "estimate — softer by design"}
        </span>
        {sel.state.logged?.symptoms.length ? (
          <span className="text-[11.5px] text-muted-foreground">
            noted: {sel.state.logged.symptoms.join(", ")}
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => onLogDay(sel.date)}
          className="mono ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[9px] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
        >
          <Plus className="size-2.5" aria-hidden />
          {sel.state.logged ? "Edit in advanced log" : "Log this day"}
        </button>
      </div>
    </div>
  );
}
