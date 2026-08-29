/**
 * CycleTimeline — the next seven days as ONE continuous visual path, a
 * direct extension of the wheel, not a grid of day cards. Each day is a
 * point on the line, colored by its phase; logged points are solid,
 * estimated stay hollow and soft. Selecting a point reveals its detail
 * inline (never a modal); from there the day opens straight into the
 * advanced log. Small screens scroll the path horizontally inside its own
 * container — the page itself never scrolls sideways.
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

export function CycleTimeline({
  model,
  entries,
  onLogDay,
}: {
  model: CycleModel;
  entries: CycleEntry[];
  onLogDay: (date: string) => void;
}) {
  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const date = addDays(model.today, i);
        return { date, state: dayStateFor(date, entries, model) };
      }),
    [model, entries],
  );

  const [selected, setSelected] = useState<string>(model.today);
  const sel = days.find((d) => d.date === selected) ?? days[0]!;

  return (
    <div>
      <div className="no-scrollbar -mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <div className="relative min-w-[560px] px-3">
          {/* the path itself — phase-tinted, brighter through today */}
          <svg
            aria-hidden
            viewBox="0 0 700 10"
            preserveAspectRatio="none"
            className="absolute left-3 right-3 top-[42px] h-[10px] w-[calc(100%-1.5rem)]"
          >
            <defs>
              <linearGradient id="cyc-path-grad" x1="0" y1="0" x2="1" y2="0">
                {days.map((d, i) => (
                  <stop
                    key={d.date}
                    offset={`${(i / (days.length - 1)) * 100}%`}
                    stopColor={
                      d.state.phase ? PHASE_COLOR[d.state.phase as PhaseKey] : "var(--border)"
                    }
                    stopOpacity={d.state.phase ? (d.date === model.today ? 0.9 : 0.42) : 0.2}
                  />
                ))}
              </linearGradient>
            </defs>
            <rect x="0" y="4" width="700" height="2.5" rx="1.25" fill="url(#cyc-path-grad)" />
          </svg>

          <ol className="relative flex justify-between">
            {days.map((d, i) => {
              const isToday = d.date === model.today;
              const logged = d.state.logged !== null;
              const on = selected === d.date;
              const [mm, dd] = [d.date.slice(5, 7), d.date.slice(8, 10)];
              const monthChanged = i === 0 || days[i - 1]!.date.slice(5, 7) !== mm;
              return (
                <li key={d.date} className="flex w-[76px] shrink-0 flex-col items-center">
                  <button
                    type="button"
                    onClick={() => setSelected(d.date)}
                    aria-pressed={on}
                    aria-label={`${fmtShort(d.date)}${isToday ? ", today" : ""}${
                      d.state.phase
                        ? `, ${d.state.phase} phase${logged ? ", logged" : ", estimated"}`
                        : ""
                    }`}
                    className="flex min-h-[84px] flex-col items-center gap-1 rounded-xl px-1 pt-1 pb-2 outline-none transition-colors duration-[var(--motion-fast)] hover:bg-surface-2/45 focus-visible:bg-surface-2/70"
                  >
                    <span
                      className={cn(
                        "mono text-[9px] uppercase tracking-[0.08em]",
                        isToday ? "text-foreground" : "text-faint",
                      )}
                    >
                      {isToday
                        ? "today"
                        : monthChanged
                          ? `${Number(mm)}/${Number(dd)}`
                          : Number(dd)}
                    </span>
                    <span
                      className={cn(
                        "grid place-items-center rounded-full border transition-all duration-[var(--motion-med)]",
                        isToday ? "size-[24px]" : "size-[16px]",
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
                            ? "color-mix(in oklab, var(--cycle-ovulation) 16%, transparent)"
                            : "transparent",
                        borderStyle: logged ? "solid" : "dashed",
                        boxShadow: isToday
                          ? `0 0 0 5px color-mix(in oklab, ${
                              d.state.phase
                                ? PHASE_COLOR[d.state.phase as PhaseKey]
                                : "var(--foreground)"
                            } 12%, transparent)`
                          : undefined,
                      }}
                      aria-hidden
                    >
                      {d.state.predictedPeriod ||
                      (d.state.logged?.flow && d.state.logged.flow !== "none") ? (
                        <span
                          className={cn(
                            "block rounded-full",
                            isToday ? "size-[7px]" : "size-[4px]",
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
                    {on ? (
                      <span className="mono mt-0.5 text-[8px] uppercase tracking-[0.1em] text-faint">
                        {i === 0 ? "today" : `+${i}d`}
                      </span>
                    ) : (
                      <span className="mt-0.5 text-[8px]" aria-hidden>
                        &nbsp;
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* selected-day context — compact, inline, never a modal */}
      <div
        data-qa="tl-detail"
        className="mt-3 flex flex-wrap items-center gap-x-3.5 gap-y-2 rounded-xl bg-surface/45 px-3.5 py-2.5 ring-1 ring-[var(--cycle-hair)]"
      >
        <p className="text-[13px]">
          <span className="cy-title text-[15px]">{fmtShort(sel.date)}</span>
          <span className="text-muted-foreground">
            {sel.state.phase
              ? ` · ${PHASE_TEXT[sel.state.phase as PhaseKey]}`
              : " · a plain day until you log it"}
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
          className="mono ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-2.5 py-1.5 text-[9px] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:border-[var(--border-strong)] hover:text-foreground"
        >
          <Plus className="size-2.5" aria-hidden />
          {sel.state.logged ? "Edit in advanced log" : "Log this day"}
        </button>
      </div>

      <p className="mono mt-2 text-[9px] uppercase tracking-[0.08em] text-faint">
        solid = logged · hollow = estimated · a path, not a promise
      </p>
    </div>
  );
}
