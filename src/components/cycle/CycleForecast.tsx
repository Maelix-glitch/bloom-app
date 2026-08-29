/**
 * CycleForecast — "what happens next" as one visual progression instead of
 * four boxes. NOW anchors you in today's phase, NEXT carries the dominant
 * estimate (next period, honestly ranged), AFTER holds ovulation, the
 * fertile window, phase changes and what history supports — rows on
 * hairlines, never duplicate cards. Everything here is computed from the
 * engine: if the data can't support a statement, the statement isn't made.
 * With no anchor yet, the rail shows what will appear once you log — and a
 * calm way to do exactly that.
 */

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import type { CycleModel } from "@/lib/cycle/types";
import { fmtShort } from "@/lib/cycle/engine";
import { PHASE_COLOR } from "@/lib/cycle/palette";
import type { PhaseKey } from "@/lib/cycle/types";

const TIER = (n: number) =>
  n === 0
    ? { label: "Waiting for your first anchor", tone: "var(--faint)" }
    : n === 1
      ? { label: "Learning · 1 completed cycle", tone: "var(--amber)" }
      : n <= 3
        ? { label: `Building your baseline · ${n} completed cycles`, tone: "var(--sky)" }
        : { label: `Personal pattern emerging · ${n} completed cycles`, tone: "var(--sage)" };

export function CycleForecast({
  model,
  onOpenMethod,
  onLogStart,
  className,
}: {
  model: CycleModel;
  onOpenMethod: () => void;
  onLogStart: () => void;
  className?: string;
}) {
  const [leadOpen, setLeadOpen] = useState(false);

  const next = model.events.find((e) => e.id === "next-period");
  const ovu = model.events.find((e) => e.id === "ovulation");
  const fertile = model.events.find((e) => e.id === "fertile-window");
  const pms = model.events.find((e) => e.id === "pms-window");
  const phaseChange = model.events.find((e) => e.id === "phase-change");
  const tier = TIER(model.completed.length);

  if (!model.lastPeriodStart) {
    return (
      <div className={cn("cy-ghost", className)}>
        <p className="cy-eyebrow">What comes next</p>
        <p className="cy-title mt-2 text-[22px] leading-snug">
          Your forecast begins with one honest line.
        </p>
        <p className="mt-2 max-w-[56ch] text-[13px] leading-relaxed text-muted-foreground">
          Log the day your period starts and this rail fills in — next period as a range, not a
          promise, then the fertile window, ovulation estimate and phase changes, each marked with
          how well your data supports it. Until then Bloom stays quiet rather than guess.
        </p>
        <div className="cy-ghost-bars mt-5 max-w-[420px]" aria-hidden>
          {[42, 58, 36, 64, 48, 60].map((h, i) => (
            <i key={i} style={{ height: h }} />
          ))}
        </div>
        <p className="mono mt-2 text-[8.5px] uppercase tracking-[0.1em] text-faint">
          preview of the shape your data will take · no values until you log
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          <button type="button" onClick={onLogStart} className="cy-btn cy-btn--primary">
            Log period
          </button>
          <button type="button" onClick={onOpenMethod} className="cy-link">
            How predictions work →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("cy-fc", className)}>
      {/* NOW */}
      <div className="cy-fc__col">
        <p className="cy-eyebrow mb-3 flex items-center gap-2">
          <span
            className="inline-flex size-[7px] rounded-full bg-[var(--cycle-accent)]"
            aria-hidden
          />
          now
        </p>
        <p className="cy-title text-[22px] leading-tight">
          {model.currentDay ? `Day ${model.currentDay}` : "Unanchored"}
        </p>
        <p
          className="cy-title mt-1 text-[16px]"
          style={{
            color: model.currentPhase
              ? PHASE_COLOR[model.currentPhase as PhaseKey]
              : "var(--faint)",
          }}
        >
          {model.currentPhase === "ovulation"
            ? "Estimated fertile peak"
            : model.currentPhase
              ? `${cap(model.currentPhase)} phase`
              : "Awaiting first log"}
        </p>
        <p className="mt-2 max-w-[34ch] text-[12.5px] leading-relaxed text-muted-foreground">
          {model.lastPeriodStart && model.currentDay
            ? `Counted from your period start on ${fmtShort(model.lastPeriodStart)}${
                model.confidence === "assumed" ? ", using the general 28-day pattern for now" : ""
              }.`
            : "Log a period day and the count begins."}
        </p>
        <p
          className="mono mt-4 flex items-center gap-1.5 text-[8.5px] uppercase tracking-[0.1em]"
          style={{ color: tier.tone }}
        >
          <span className="inline-block size-1.5 rounded-full bg-current" aria-hidden />
          {tier.label}
        </p>
      </div>

      {/* NEXT — the dominant estimate */}
      <div className="cy-fc__col">
        <p className="cy-eyebrow mb-3">next</p>
        <button
          type="button"
          className="cy-fc__lead"
          aria-expanded={leadOpen}
          onClick={() => setLeadOpen((o) => !o)}
        >
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-[10.5px] uppercase tracking-[0.1em] text-faint">Next period</span>
            <span className="mono rounded-full border border-border px-2 py-0.5 text-[8.5px] uppercase tracking-[0.06em] text-muted-foreground">
              {model.usesDefaultAssumption
                ? "general pattern"
                : `from ${Math.min(6, model.completed.length)} of your cycles`}
            </span>
            <ChevronDown
              className={cn(
                "size-3.5 text-faint transition-transform duration-[var(--cy-med)]",
                leadOpen && "rotate-180",
              )}
              aria-hidden
            />
          </p>
          <p className="cy-fc__big mt-1.5 block">
            {next?.date
              ? `~${fmtShort(next.date)}`
              : next?.rangeStart && next.rangeEnd
                ? `${fmtShort(next.rangeStart)} – ${fmtShort(next.rangeEnd)}`
                : "log an anchor"}
            {next?.plusMinusDays ? (
              <span className="mono ml-2 text-[12px] tracking-normal text-faint">
                ±{next.plusMinusDays} days
              </span>
            ) : null}
          </p>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            {next
              ? next.daysAway === 0
                ? "due today — if flow starts, one tap on the surface above keeps everything true"
                : next.daysAway > 0
                  ? `in about ${next.daysAway} day${next.daysAway === 1 ? "" : "s"}`
                  : `${-next.daysAway} day${next.daysAway === -1 ? "" : "s"} past the estimate`
              : "a range because ranges are what the data supports"}
          </p>
          {leadOpen ? (
            <span className="cy-focus-in mt-3 block border-t border-[var(--cycle-hair)] pt-3 text-[12.5px] leading-relaxed text-muted-foreground">
              {next?.detail ??
                "Derived from your logged period starts and your own average length — the band widens when your cycles vary and tightens as they accumulate."}
              <span className="mono mt-2 block text-[9px] uppercase tracking-[0.09em] text-faint underline-offset-2">
                how this is calculated →
              </span>
            </span>
          ) : null}
        </button>
        {phaseChange ? (
          <div className="cy-fc__row">
            <span className="min-w-0 flex-1 text-[12.5px] text-muted-foreground">
              Upcoming phase change
            </span>
            <span className="mono text-[11.5px] text-foreground">
              {phaseChange.date
                ? fmtShort(phaseChange.date)
                : phaseChange.rangeStart
                  ? `~${fmtShort(phaseChange.rangeStart)}`
                  : "—"}
            </span>
          </div>
        ) : null}
      </div>

      {/* AFTER — quieter, still grounded */}
      <div className="cy-fc__col">
        <p className="cy-eyebrow mb-3">after</p>
        {ovu ? (
          <button
            type="button"
            className="cy-fc__row"
            onClick={onOpenMethod}
            aria-label="Estimated ovulation — open how estimates work"
          >
            <span
              className="mt-[3px] inline-block size-[7px] shrink-0 self-center rounded-full bg-[var(--cycle-ovulation)]"
              aria-hidden
            />
            <span className="min-w-0 flex-1 text-[12.5px] text-muted-foreground">
              Ovulation · estimated
            </span>
            <span className="mono text-[11.5px] text-foreground">
              {fmtShort(ovu.date ?? ovu.rangeStart ?? model.today)}
              {ovu.plusMinusDays ? ` ±${ovu.plusMinusDays}d` : ""}
            </span>
            <span className="mono w-[84px] shrink-0 text-right text-[8.5px] uppercase tracking-[0.07em] text-faint">
              {ovu.daysAway === 0
                ? "today"
                : ovu.daysAway > 0
                  ? `in ${ovu.daysAway}d`
                  : `${-ovu.daysAway}d ago`}
            </span>
          </button>
        ) : null}
        {fertile?.rangeStart && fertile.rangeEnd ? (
          <button
            type="button"
            className="cy-fc__row"
            onClick={onOpenMethod}
            aria-label="Fertile window — open how estimates work"
          >
            <span
              className="mt-[3px] inline-block size-[7px] shrink-0 self-center rounded-full bg-[var(--cycle-follicular)]"
              aria-hidden
            />
            <span className="min-w-0 flex-1 text-[12.5px] text-muted-foreground">
              Fertile window · estimated
            </span>
            <span className="mono text-[11.5px] text-foreground">
              {fmtShort(fertile.rangeStart)} – {fmtShort(fertile.rangeEnd)}
            </span>
            <span className="mono w-[84px] shrink-0 text-right text-[8.5px] uppercase tracking-[0.07em] text-faint">
              awareness only
            </span>
          </button>
        ) : null}
        {pms?.rangeStart && pms.rangeEnd && model.confidence !== "assumed" ? (
          <button
            type="button"
            className="cy-fc__row"
            onClick={onOpenMethod}
            aria-label="PMS window — open how estimates work"
          >
            <span
              className="mt-[3px] inline-block size-[7px] shrink-0 self-center rounded-full bg-[var(--cycle-luteal)]"
              aria-hidden
            />
            <span className="min-w-0 flex-1 text-[12.5px] text-muted-foreground">
              PMS window · your pattern suggests
            </span>
            <span className="mono text-[11.5px] text-foreground">
              {fmtShort(pms.rangeStart)} – {fmtShort(pms.rangeEnd)}
            </span>
            <span className="mono w-[84px] shrink-0 text-right text-[8.5px] uppercase tracking-[0.07em] text-faint">
              may not come
            </span>
          </button>
        ) : null}
        {model.average !== null ? (
          <div className="cy-fc__row">
            <span
              className="mt-[3px] inline-block size-[7px] shrink-0 self-center rounded-full bg-[var(--cycle-luteal)]"
              aria-hidden
            />
            <span className="min-w-0 flex-1 text-[12.5px] text-muted-foreground">
              Your cycle length
            </span>
            <span className="mono text-[11.5px] text-foreground">
              {model.average.toFixed(1)} days avg
            </span>
            <span className="mono w-[84px] shrink-0 text-right text-[8.5px] uppercase tracking-[0.07em] text-faint">
              {model.rangeMin}–{model.rangeMax} seen
            </span>
          </div>
        ) : null}
        <p className="mt-1 text-[11.5px] leading-relaxed text-faint">
          {model.confidence === "assumed"
            ? "These use the general pattern — log a couple of full cycles and they become yours."
            : "Based on your logged history — estimates for planning, not verdicts."}
        </p>
      </div>
    </div>
  );
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
