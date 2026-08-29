/**
 * At a Glance — the compact intelligence rail beside the wheel.
 * Deliberately NOT four identical stat cards: a lead item + tight secondary
 * rows, each carrying its own marker. Interactive rows are only interactive
 * where a deeper surface actually exists.
 */

import { CalendarDays, CircleDot, Flower2, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";
import type { CycleModel } from "@/lib/cycle/types";
import { fmtShort } from "@/lib/cycle/engine";

export function AtAGlance({
  model,
  onViewInsight,
  onViewAll,
  onOpenMethod,
  className,
}: {
  model: CycleModel;
  onViewInsight?: () => void;
  onViewAll: () => void;
  onOpenMethod: () => void;
  className?: string;
}) {
  const next = model.events.find((e) => e.id === "next-period");
  const ovu = model.events.find((e) => e.id === "ovulation");
  const fertile = model.events.find((e) => e.id === "fertile-window");

  return (
    <aside
      aria-label="At a glance"
      className={cn(
        "min-w-0 rounded-2xl border border-border/70 bg-surface/35 px-3.5 py-3",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <p className="eyebrow">At a glance</p>
        <p className="mono hidden text-[8.5px] uppercase tracking-[0.08em] text-faint sm:block">
          soft = estimated · tap for how
        </p>
        <button
          type="button"
          onClick={onViewAll}
          className="mono text-[9px] uppercase tracking-[0.08em] text-faint underline-offset-2 transition-colors hover:text-foreground hover:underline"
        >
          View all insights
        </button>
      </div>

      <button
        type="button"
        onClick={onViewInsight}
        className={cn(
          "group mt-2 flex w-full items-center gap-3 rounded-xl border border-border/70 bg-surface/60 px-3 py-2.5 text-left transition-[border-color,background-color]",
          "hover:border-border-strong hover:bg-surface-2/60 sm:w-auto sm:flex-none",
        )}
      >
        <span
          className="grid size-8 shrink-0 place-items-center rounded-full bg-[color-mix(in_oklab,var(--cycle-menstrual)_14%,transparent)] text-[color:var(--cycle-menstrual)]"
          aria-hidden
        >
          <CalendarDays className="size-4" strokeWidth={1.7} />
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block text-[10.5px] uppercase tracking-[0.08em] text-faint">
            Next period · estimated
          </span>
          <span className="display block truncate text-[17px]">
            {next?.date
              ? fmtShort(next.date)
              : next?.rangeEnd
                ? `~${fmtShort(next.rangeEnd)}`
                : "log a start date"}
            {next?.plusMinusDays ? (
              <span className="mono ml-1.5 text-[11px] text-faint">±{next.plusMinusDays}d</span>
            ) : null}
          </span>
        </span>
        {next && next.daysAway >= 0 && next.daysAway <= 5 ? (
          <span className="mono shrink-0 rounded-full border border-[color:var(--border-strong)] px-2 py-0.5 text-[9px] uppercase tracking-[0.06em] text-muted-foreground">
            in {next.daysAway}d
          </span>
        ) : null}
      </button>

      <div className="mt-1.5 flex flex-1 flex-col gap-0 md:flex-row md:gap-0">
        {ovu ? (
          <GlanceRow
            icon={<CircleDot className="size-[13px]" strokeWidth={1.8} aria-hidden />}
            tone="var(--cycle-ovulation)"
            label="Ovulation (estimate)"
            value={`${fmtShort(ovu.date ?? ovu.rangeStart ?? model.today)}${ovu.plusMinusDays ? ` ±${ovu.plusMinusDays}d` : ""}`}
            sub={
              ovu.daysAway < 0
                ? `${-ovu.daysAway}d ago`
                : ovu.daysAway === 0
                  ? "today"
                  : `in ${ovu.daysAway}d`
            }
            onClick={onOpenMethod}
          />
        ) : null}
        {fertile?.rangeStart && fertile.rangeEnd ? (
          <GlanceRow
            icon={<Flower2 className="size-[13px]" strokeWidth={1.8} aria-hidden />}
            tone="var(--cycle-follicular)"
            label="Fertile window (estimate)"
            value={`${fmtShort(fertile.rangeStart)} – ${fmtShort(fertile.rangeEnd)}`}
            sub="awareness only"
            onClick={onOpenMethod}
          />
        ) : null}
        <GlanceRow
          icon={<TrendingUp className="size-[13px]" strokeWidth={1.8} aria-hidden />}
          tone="var(--foreground)"
          label={model.average !== null ? "Your average" : "Working assumption"}
          value={
            model.average !== null
              ? `${model.average.toFixed(1)} d`
              : `${(model.ovulationDay ?? 14) + model.lutealLength} d · general`
          }
          sub={
            model.confidence === "assumed"
              ? "until cycles accumulate"
              : `${Math.min(6, model.completed.length)}/${model.completed.length} used`
          }
        />
      </div>

      <p className="mono mt-2 flex items-center gap-1.5 text-[8.5px] uppercase tracking-[0.08em] text-faint">
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
        {model.confidence === "assumed"
          ? "no personal average yet"
          : `confidence · ${model.confidence}`}
      </p>
    </aside>
  );
}

function GlanceRow({
  icon,
  tone,
  label,
  value,
  sub,
  onClick,
}: {
  icon: React.ReactNode;
  tone: string;
  label: string;
  value: string;
  sub: string;
  onClick?: () => void;
}) {
  const body = (
    <>
      <span
        className="grid size-5 shrink-0 place-items-center rounded-full"
        style={{ color: tone, background: `color-mix(in oklab, ${tone} 12%, transparent)` }}
        aria-hidden
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate text-[11.5px] whitespace-nowrap text-muted-foreground">
        {label}
      </span>
      <span className="mono shrink-0 text-[11px] text-foreground">{value}</span>
      <span className="mono w-16 shrink-0 truncate text-right text-[8.5px] uppercase tracking-[0.06em] text-faint">
        {sub}
      </span>
    </>
  );
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-surface-2/60"
      >
        {body}
      </button>
    );
  }
  return <div className="flex items-center gap-2.5 px-1.5 py-1.5">{body}</div>;
}
