/**
 * Next-event intelligence — a prioritized timeline, not four identical
 * cards. One primary (nearest real event), smaller secondaries; estimates
 * always say "estimated", ranges shown when variability earns them.
 */

import { CalendarDays, CircleDot, Flower2, MoonStar, SunMedium, TestTube } from "lucide-react";

import type { CycleModel, PredictionEvent } from "@/lib/cycle/types";
import { daysAwayLabel, fmtShort } from "@/lib/cycle/engine";
import { cn } from "@/lib/utils";

const ICONS: Record<PredictionEvent["id"], typeof CalendarDays> = {
  "next-period": CalendarDays,
  ovulation: CircleDot,
  "fertile-window": Flower2,
  "pms-window": MoonStar,
  "phase-change": TestTube,
};

function rangeText(e: PredictionEvent): string {
  if (e.date && e.plusMinusDays) return `~${fmtShort(e.date)} ±${e.plusMinusDays}d`;
  if (e.date) return fmtShort(e.date);
  if (e.rangeStart && e.rangeEnd) return `${fmtShort(e.rangeStart)} – ${fmtShort(e.rangeEnd)}`;
  return "—";
}

function EventRow({ event, primary }: { event: PredictionEvent; primary: boolean }) {
  const Icon = ICONS[event.id] ?? SunMedium;
  const observed = !event.predicted;
  return (
    <li
      className={cn(
        "flex items-center gap-3.5 rounded-xl border px-4 transition-colors duration-[var(--motion-med)]",
        primary
          ? "border-[color:var(--border-strong)] bg-surface py-4"
          : "border-transparent bg-surface/45 py-2.5 hover:bg-surface/70",
        observed && "border-dashed",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid shrink-0 place-items-center rounded-full",
          primary ? "size-10" : "size-8",
        )}
        style={{
          background: observed
            ? "color-mix(in oklab, var(--sage) 14%, transparent)"
            : "color-mix(in oklab, var(--foreground) 6%, transparent)",
          color: observed ? "var(--sage)" : "var(--muted-foreground)",
          border: `1px solid ${observed ? "color-mix(in oklab, var(--sage) 35%, transparent)" : "var(--border)"}`,
        }}
      >
        <Icon className={primary ? "size-[17px]" : "size-[14px]"} strokeWidth={1.7} />
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className={cn("block truncate font-medium", primary ? "text-[15px]" : "text-[13px]")}>
          {event.label}
          {observed ? (
            <span className="mono ml-2 rounded-full border border-sage/40 px-1.5 py-0.5 text-[8px] uppercase tracking-[0.08em] text-sage">
              observed
            </span>
          ) : null}
        </span>
        {!primary ? (
          <span className="block truncate text-[11px] text-faint">{event.detail}</span>
        ) : null}
      </span>
      <span className="shrink-0 text-right leading-tight">
        <span className={cn("block", primary ? "display text-[16px]" : "text-[12px] font-medium")}>
          {rangeText(event)}
        </span>
        <span className="mono block text-[9.5px] uppercase tracking-[0.08em] text-faint">
          {event.daysAway === 0
            ? "today"
            : event.daysAway > 0
              ? `in ${event.daysAway}d`
              : `${-event.daysAway}d ago`}
        </span>
      </span>
    </li>
  );
}

export function NextEvents({ model, className }: { model: CycleModel; className?: string }) {
  const events = model.events.filter((e) => e.daysAway >= -1).slice(0, 4);
  if (events.length === 0) {
    return (
      <p
        className={cn(
          "rounded-xl border border-dashed border-border px-4 py-4 text-[12.5px] leading-relaxed text-muted-foreground",
          className,
        )}
      >
        Nothing estimated yet — log a period day and the next dates appear here, gently.
      </p>
    );
  }
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <ol className="flex flex-col gap-2">
        {events.map((e, i) => (
          <EventRow key={e.id} event={e} primary={i === 0} />
        ))}
      </ol>
      {model.usesDefaultAssumption ? (
        <p className="mono px-1 text-[9.5px] uppercase tracking-[0.08em] text-faint">
          calendar estimates · general pattern until you log two cycles
        </p>
      ) : (
        <p className="mono px-1 text-[9.5px] uppercase tracking-[0.08em] text-faint">
          {events[0]?.predicted
            ? "estimates for planning — not medical predictions"
            : "from your own logs"}
        </p>
      )}
    </div>
  );
}
