/**
 * UpcomingIntelligence — the hierarchy beside the wheel. Deliberately NOT
 * four identical stat boxes: one lead event gets the strongest treatment,
 * everything else is quieter rows on hairlines. Every value is computed by
 * the engine from real logs; anything estimated says so and can open the
 * method note. With no data it stays honest: one row that explains what a
 * first log unlocks.
 */

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import type { CycleModel } from "@/lib/cycle/types";
import { CONFIDENCE_LABEL } from "@/lib/cycle/types";
import { fmtShort } from "@/lib/cycle/engine";

export function UpcomingIntelligence({
  model,
  onOpenMethod,
  onViewAll,
  onLogStart,
  className,
}: {
  model: CycleModel;
  onOpenMethod: () => void;
  onViewAll: () => void;
  onLogStart: () => void;
  className?: string;
}) {
  const [leadOpen, setLeadOpen] = useState(false);

  const next = model.events.find((e) => e.id === "next-period");
  const ovu = model.events.find((e) => e.id === "ovulation");
  const fertile = model.events.find((e) => e.id === "fertile-window");

  const evidence =
    model.observedEvidence.lhPositiveDates.length +
      model.observedEvidence.eggWhiteDates.length +
      (model.observedEvidence.bbtShiftDate ? 1 : 0) >
    0;

  if (!model.lastPeriodStart) {
    return (
      <aside className={cn("cy-up", className)} aria-label="Upcoming intelligence">
        <Header onViewAll={null} />
        <div className="cy-up__lead mt-1">
          <p className="cy-title text-[21px] leading-snug">Nothing to estimate yet — by design.</p>
          <p className="mt-1.5 max-w-[52ch] text-[13px] leading-relaxed text-muted-foreground">
            The moment you log the day a period starts, this panel fills with your next-window
            estimates, fertile days and data sufficiency. Until then Bloom shows nothing rather than
            guess something.
          </p>
          <button type="button" onClick={onLogStart} className="cy-btn cy-btn--primary mt-3">
            Log a period day
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className={cn("cy-up", className)} aria-label="Upcoming intelligence">
      <Header onViewAll={onViewAll} />

      {/* lead event — the strongest treatment on the page after the wheel */}
      <button
        type="button"
        className="cy-up__lead mt-1"
        aria-expanded={leadOpen}
        onClick={() => setLeadOpen((o) => !o)}
      >
        <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="text-[10.5px] uppercase tracking-[0.1em] text-faint">
            Next period · {model.usesDefaultAssumption ? "general pattern" : "from your cycles"}
          </span>
          <ChevronDown
            className={cn(
              "size-3.5 text-faint transition-transform duration-[var(--motion-med)]",
              leadOpen && "rotate-180",
            )}
            aria-hidden
          />
        </span>
        <span className="cy-title mt-1 block text-[27px] leading-tight">
          {next?.date
            ? `~${fmtShort(next.date)}`
            : next?.rangeStart && next.rangeEnd
              ? `${fmtShort(next.rangeStart)} – ${fmtShort(next.rangeEnd)}`
              : "log a start to anchor it"}
          {next?.plusMinusDays ? (
            <span className="mono ml-2 text-[12px] text-faint">±{next.plusMinusDays}d</span>
          ) : null}
        </span>
        <span className="mt-1 block text-[12.5px] text-muted-foreground">
          {next
            ? next.daysAway === 0
              ? "due today — a first flow log keeps the model true"
              : next.daysAway > 0
                ? `in about ${next.daysAway} day${next.daysAway === 1 ? "" : "s"}`
                : `${-next.daysAway} day${next.daysAway === -1 ? "" : "s"} past the estimate`
            : "window shown as a range because that is what the data supports"}
        </span>
        {leadOpen ? (
          <span className="mt-2.5 block border-t border-[var(--cycle-hair)] pt-2.5 text-[12.5px] leading-relaxed text-muted-foreground">
            {next?.detail ??
              "Derived from your period-start dates and average cycle length — the range widens with your own variability and narrows as cycles accumulate."}{" "}
            <span className="mono text-[10px] uppercase tracking-[0.08em] text-faint underline-offset-2">
              How this is calculated →
            </span>
          </span>
        ) : null}
      </button>

      {/* quieter secondary rows on hairlines */}
      <div className="mt-1.5">
        {ovu ? (
          <Row
            tone="var(--cycle-ovulation)"
            label="Estimated ovulation"
            value={`${fmtShort(ovu.date ?? ovu.rangeStart ?? model.today)}${ovu.plusMinusDays ? ` ±${ovu.plusMinusDays}d` : ""}`}
            note={
              ovu.daysAway === 0
                ? "today"
                : ovu.daysAway > 0
                  ? `in ${ovu.daysAway}d`
                  : `${-ovu.daysAway}d ago`
            }
            onOpen={onOpenMethod}
          />
        ) : null}
        {fertile?.rangeStart && fertile.rangeEnd ? (
          <Row
            tone="var(--cycle-follicular)"
            label="Fertile window"
            value={`${fmtShort(fertile.rangeStart)} – ${fmtShort(fertile.rangeEnd)}`}
            note="awareness only"
            onOpen={onOpenMethod}
          />
        ) : null}
        <Row
          tone="var(--cycle-luteal)"
          label={model.average !== null ? "Your cycle length" : "Working length"}
          value={
            model.average !== null
              ? `${model.average.toFixed(1)} days avg`
              : `${Math.round(model.ovulationDay ?? 14) + model.lutealLength} days · general`
          }
          note={
            model.completed.length > 1
              ? `${model.rangeMin}–${model.rangeMax} d seen`
              : "until cycles accumulate"
          }
        />
      </div>

      {/* data sufficiency — how to read everything above */}
      <p className="mono mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-[var(--cycle-hair)] pt-2.5 text-[9px] uppercase tracking-[0.08em] text-faint">
        <span
          className={cn(
            "inline-block size-1.5 rounded-full",
            model.confidence === "strong"
              ? "bg-sage"
              : model.confidence === "fair"
                ? "bg-sky"
                : model.confidence === "early"
                  ? "bg-amber"
                  : "bg-[var(--surface-3)]",
          )}
          aria-hidden
        />
        {CONFIDENCE_LABEL[model.confidence]}
        {evidence ? " · grounded by your own observations" : ""}
      </p>
    </aside>
  );
}

function Header({ onViewAll }: { onViewAll: (() => void) | null }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <p className="cy-eyebrow">Up next</p>
      {onViewAll ? (
        <button
          type="button"
          onClick={onViewAll}
          className="mono text-[9px] uppercase tracking-[0.08em] text-faint underline-offset-2 transition-colors hover:text-foreground hover:underline"
        >
          View all insights ↓
        </button>
      ) : null}
    </div>
  );
}

function Row({
  tone,
  label,
  value,
  note,
  onOpen,
}: {
  tone: string;
  label: string;
  value: string;
  note: string;
  onOpen?: () => void;
}) {
  const body = (
    <>
      <span
        className="mt-[3px] inline-block size-[7px] shrink-0 rounded-full"
        style={{ background: tone }}
        aria-hidden
      />
      <span className="min-w-0 flex-1 text-[12.5px] text-muted-foreground">{label}</span>
      <span className="mono shrink-0 text-[11.5px] text-foreground">{value}</span>
      <span className="mono w-[92px] shrink-0 truncate text-right text-[9px] uppercase tracking-[0.06em] text-faint">
        {note}
      </span>
    </>
  );
  if (onOpen) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="cy-up__row"
        aria-label={`${label} — open how estimates work`}
      >
        {body}
      </button>
    );
  }
  return <div className="cy-up__row">{body}</div>;
}
