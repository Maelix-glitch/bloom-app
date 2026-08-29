/**
 * CycleTimeline — the week as one connected rhythm, not seven dots. A
 * phase-tinted rail runs through the day cells; each day rises as a small
 * bar whose state is honest: solid ring + filled core = you logged it,
 * hollow = Bloom's estimate, a sage flag marks events (ovulation estimate,
 * period day). Today gets the ivory treatment and stays unmistakable.
 * Selecting a day updates the whole page — orbit focus, tray date, context
 * line below the strip. Narrow screens scroll the week inside its own
 * container; the page never scrolls sideways.
 */

import { useMemo } from "react";
import { motion } from "motion/react";

import { SELECT, TAP } from "@/lib/cycle/motion";
import { cn } from "@/lib/utils";
import { addDays, dayStateFor, fmtShort } from "@/lib/cycle/engine";
import type { CycleEntry, CycleModel, PhaseKey } from "@/lib/cycle/types";
import { PHASE_COLOR } from "@/lib/cycle/palette";

export function CycleTimeline({
  model,
  entries,
  selected,
  onSelect,
  onLogDay,
}: {
  model: CycleModel;
  entries: CycleEntry[];
  selected: string | null;
  onSelect: (date: string | null) => void;
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

  const sel = days.find((d) => d.date === (selected ?? model.today)) ?? days[0]!;

  const railGradient = `linear-gradient(90deg, ${days
    .map((d, i) => {
      const color = d.state.phase ? PHASE_COLOR[d.state.phase as PhaseKey] : "var(--border)";
      const pct = (i / (days.length - 1)) * 100;
      return `${color} ${pct}%`;
    })
    .join(", ")})`;

  return (
    <div className="cy-week">
      <div className="relative py-1">
        <span
          className="cy-week__rail"
          style={{ background: railGradient, opacity: 0.28 }}
          aria-hidden
        />
        <ol>
          {days.map((d, i) => {
            const isToday = d.date === model.today;
            const logged = d.state.logged !== null;
            const on = (selected ?? model.today) === d.date;
            const tone = d.state.phase
              ? PHASE_COLOR[d.state.phase as PhaseKey]
              : "var(--border-strong)";
            const event = d.state.predictedOvulation
              ? "ovulation est."
              : d.state.predictedPeriod
                ? "period est."
                : d.state.logged?.flow && d.state.logged.flow !== "none"
                  ? "period day"
                  : null;
            return (
              <li key={d.date}>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  transition={TAP}
                  style={{ opacity: isToday || on ? 1 : Math.max(0.55, 1 - i * 0.075) }}
                  aria-pressed={on}
                  onClick={() => onSelect(isToday ? null : d.date)}
                  data-tip={`${logged ? "you logged this day" : "estimate — softer by design"}${event ? ` · ${event}` : ""}`}
                  className={cn(
                    "cy-day",
                    isToday && "cy-day--today",
                    on && "!border-[var(--border-strong)]",
                  )}
                  aria-label={`${fmtShort(d.date)}${isToday ? ", today" : ""}${d.state.phase ? `, ${d.state.phase} phase${logged ? ", logged" : ", estimated"}` : ""}`}
                >
                  {on ? (
                    <motion.span
                      layoutId="week-selection"
                      transition={SELECT}
                      style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: 14,
                        border: "1px solid var(--border-strong)",
                        background: "color-mix(in oklab, var(--surface) 60%, transparent)",
                        zIndex: -1,
                      }}
                      aria-hidden
                    />
                  ) : null}
                  <span className="cy-day__date">
                    {(() => {
                      const mm = d.date.slice(5, 7);
                      const dd = d.date.slice(8, 10);
                      return isToday ? "today" : `${MON[Number(mm) - 1] ?? mm} ${Number(dd)}`;
                    })()}
                  </span>
                  <span
                    className="cy-day__dot"
                    style={{ color: tone, background: logged ? tone : "transparent" }}
                    aria-hidden
                  />
                  <span className="cy-day__num">
                    {model.lastPeriodStart ? dayNum(model, d.date) : Number(d.date.slice(8, 10))}
                  </span>
                  <span className="cy-day__phase">{d.state.phase ? d.state.phase : "—"}</span>
                  {logged && (d.state.logged?.mood || d.state.logged?.energy) ? (
                    <span className="cy-day__marks" aria-hidden>
                      {d.state.logged?.mood ? d.state.logged.mood[0] : ""}
                      {d.state.logged?.energy ? `·${d.state.logged.energy}/5` : ""}
                    </span>
                  ) : null}
                  <span className="cy-day__flag" style={{ opacity: isToday || event ? 1 : 0 }}>
                    {isToday ? "here" : (event ?? "·")}
                  </span>
                </motion.button>
              </li>
            );
          })}
        </ol>
      </div>

      <div
        className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12.5px]"
        aria-live="polite"
      >
        <span className="cy-title text-[15px]">{fmtShort(sel.date)}</span>
        <span className="text-muted-foreground">
          {model.lastPeriodStart ? `cycle day ${dayNum(model, sel.date)} · ` : ""}
          {sel.state.phase ?? "unphased"}
          {sel.state.predictedFertile && !sel.state.logged
            ? " · inside the estimated fertile window"
            : ""}
        </span>
        <span className="mono rounded-full border border-[var(--cycle-hair-strong)] px-2 py-0.5 text-[9px] tracking-[0.06em] text-faint">
          {sel.state.logged ? "logged" : "estimated"}
        </span>
        {sel.state.logged?.mood ? (
          <span className="text-faint">mood: {sel.state.logged.mood.toLowerCase()}</span>
        ) : null}
        {sel.state.logged?.energy ? (
          <span className="text-faint">energy {sel.state.logged.energy}/5</span>
        ) : null}
        <button type="button" onClick={() => onLogDay(sel.date)} className="cy-link ml-auto">
          {sel.state.logged ? "edit this day" : "log this day"} →
        </button>
      </div>
    </div>
  );
}

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function dayNum(model: CycleModel, date: string): number {
  if (!model.lastPeriodStart) return 1;
  const d = new Date(`${date}T00:00:00`).getTime();
  const s = new Date(`${model.lastPeriodStart}T00:00:00`).getTime();
  return Math.max(1, Math.floor((d - s) / 86_400_000) + 1);
}
