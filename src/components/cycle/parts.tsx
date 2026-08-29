/**
 * Shared Cycle primitives — one ring of styling so sections feel composed,
 * not assembled.
 */

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { PHASE_COLOR } from "@/lib/cycle/palette";
import type { PhaseKey } from "@/lib/cycle/types";

export function CycleSection({
  title,
  sub,
  right,
  id,
  gap = "default",
  className,
  children,
}: {
  title?: string;
  sub?: string;
  right?: ReactNode;
  id?: string;
  gap?: "default" | "wide";
  className?: string;
  children?: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-label={title}
      className={cn("cy-section", gap === "wide" && "mt-16", className)}
    >
      {title || right ? (
        <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div className="min-w-0">
            <h2 className="cy-section-title text-pretty leading-tight">{title}</h2>
            {sub ? (
              <p className="mt-1.5 max-w-[62ch] text-[12.5px] leading-relaxed text-muted-foreground">
                {sub}
              </p>
            ) : null}
          </div>
          {right ? <div className="flex shrink-0 items-center gap-2">{right}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function PhaseDot({ phase, size = 8 }: { phase: PhaseKey; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 rounded-full"
      style={{ width: size, height: size, background: PHASE_COLOR[phase] }}
    />
  );
}

export function GhostButton({
  children,
  onClick,
  label,
  className,
}: {
  children: ReactNode;
  onClick: () => void;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "mono inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[10px] uppercase tracking-[0.07em] text-muted-foreground transition-[color,border-color] duration-[var(--motion-fast)] hover:border-border-strong hover:text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Observed vs predicted legend — used by ring + calendar. */
export function ObserveLegend({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "mono flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] uppercase tracking-[0.08em] text-faint",
        className,
      )}
    >
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-[var(--cycle-menstrual)]" aria-hidden /> logged
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span
          className="size-2 rounded-full border border-dashed border-[var(--cycle-predicted)]"
          aria-hidden
        />{" "}
        estimated
      </span>
    </p>
  );
}
