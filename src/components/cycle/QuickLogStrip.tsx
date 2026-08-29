/**
 * QuickLogStrip — the compact "log today" action living right beside the
 * intelligence it feeds. One tap saves (flow, mood, energy) without ever
 * opening a dialog; the full form stays one click away in the advanced log.
 * Tapping the active value clears it. It never invents or overwrites other
 * fields — the route merges with today's existing entry before saving, and
 * the wheel, estimates and insights re-render from the same state instantly.
 */

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import type { CycleEntry, CycleModel, FlowValue, MoodValue } from "@/lib/cycle/types";

const FLOWS: { v: FlowValue; label: string }[] = [
  { v: "none", label: "None" },
  { v: "spotting", label: "Spotting" },
  { v: "light", label: "Light" },
  { v: "medium", label: "Medium" },
  { v: "heavy", label: "Heavy" },
];
const MOODS: MoodValue[] = ["Low", "Flat", "Okay", "Good", "Energized"];

export function QuickLogStrip({
  model,
  entry,
  disabled,
  onSave,
  onOpenAdvanced,
  className,
}: {
  model: CycleModel | null;
  entry: CycleEntry | null;
  disabled?: boolean;
  onSave: (patch: {
    flow?: FlowValue | null;
    mood?: MoodValue | null;
    energy?: number | null;
  }) => void;
  onOpenAdvanced: () => void;
  className?: string;
}) {
  const [flash, setFlash] = useState<string | null>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!entry) return;
    const stamp = `${entry.flow ?? ""}|${entry.mood ?? ""}|${entry.energy ?? ""}|${entry.logged_at ?? ""}`;
    setFlash(stamp);
    const t = setTimeout(() => setFlash(null), 1400);
    return () => clearTimeout(t);
  }, [entry]);

  const toggle = <T,>(cur: T | null, v: T): T | null => (cur === v ? null : v);

  return (
    <div className={cn("cy-strip", className)}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="cy-eyebrow shrink-0">
          Today
          {model?.currentDay ? (
            <span className="text-muted-foreground"> · day {model.currentDay}</span>
          ) : null}
        </p>

        <div
          className="flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label="Log today's flow"
        >
          <span className="mono text-[9px] uppercase tracking-[0.08em] text-faint">flow</span>
          {FLOWS.map((f) => (
            <button
              key={f.v}
              type="button"
              disabled={disabled}
              aria-pressed={entry?.flow === f.v}
              onClick={() => onSave({ flow: toggle(entry?.flow ?? null, f.v) })}
              className="cy-chip"
            >
              {f.label}
            </button>
          ))}
        </div>

        <span className="hidden h-5 w-px bg-[var(--cycle-hair)] sm:block" aria-hidden />

        <div
          className="flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label="Log today's mood"
        >
          <span className="mono text-[9px] uppercase tracking-[0.08em] text-faint">mood</span>
          {MOODS.map((m) => (
            <button
              key={m}
              type="button"
              disabled={disabled}
              aria-pressed={entry?.mood === m}
              onClick={() => onSave({ mood: toggle(entry?.mood ?? null, m) })}
              className="cy-chip"
            >
              {m}
            </button>
          ))}
        </div>

        <span className="hidden h-5 w-px bg-[var(--cycle-hair)] sm:block" aria-hidden />

        <div
          className="flex items-center gap-1.5"
          role="group"
          aria-label="Log today's energy, 1 to 5"
        >
          <span className="mono text-[9px] uppercase tracking-[0.08em] text-faint">energy</span>
          <span className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                disabled={disabled}
                aria-pressed={(entry?.energy ?? 0) >= n}
                aria-label={`Energy ${n} of 5`}
                onClick={() => onSave({ energy: entry?.energy === n ? null : n })}
                className={cn(
                  "size-[13px] rounded-full border transition-colors",
                  (entry?.energy ?? 0) >= n
                    ? "border-[color:var(--cycle-accent)] bg-[color:var(--cycle-accent)]"
                    : "border-[var(--border-strong)] hover:border-[color:var(--cycle-accent)]",
                )}
              />
            ))}
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenAdvanced}
          className="mono ml-auto shrink-0 rounded-full border border-border px-3 py-1.5 text-[9.5px] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:border-[var(--border-strong)] hover:text-foreground"
        >
          More fields — sleep, temp, tests…
        </button>
      </div>

      <p
        aria-live="polite"
        className="mono mt-1.5 min-h-[14px] text-[9px] uppercase tracking-[0.08em] text-faint"
      >
        {flash
          ? "saved — the wheel and estimates updated"
          : "one tap saves · tap again to clear · nothing else is touched"}
      </p>
    </div>
  );
}
