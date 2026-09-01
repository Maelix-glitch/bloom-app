/**
 * Shared plumbing for the three trackers designs.
 *
 * Everything here is data handling and the two blocks every design agrees on —
 * the disclaimer and the observations list. Layout, chart shapes and type belong
 * to each design's own file and stylesheet.
 */

import type { CSSProperties, ReactNode } from "react";

import { useTrackers, type TrackerStore } from "@/hooks/useTrackers";
import { emptyDay, type DayEntry, type TrackerId } from "@/lib/trackers/core";

export const DISCLAIMER =
  "Everything here is read back from days you logged yourself. It's a description of your own record — not medical advice, and it can't diagnose anything.";

/** One tap writes to today. Returns an error message, or null when it saved. */
export function applyQuickAdd(
  store: TrackerStore,
  id: TrackerId,
  amount: number,
): string | null {
  const today = store.today;
  const current = store.days.find((d) => d.date === today) ?? emptyDay(today);
  const next: DayEntry = { ...current, date: today };
  if (id === "water") next.waterMl = (current.waterMl ?? 0) + amount;
  if (id === "movement") next.movementMinutes = (current.movementMinutes ?? 0) + amount;
  if (id === "screen") next.screenMinutes = (current.screenMinutes ?? 0) + amount;
  if (id === "energy") next.energy = amount;
  if (id === "study") {
    next.sessions = [...current.sessions, { subject: "General", minutes: amount, startAt: null }];
  }
  const result = store.saveDay(next);
  if (result.ok) return null;
  const first = Object.values(result.errors)[0];
  return typeof first === "string" ? first : "That didn't save.";
}

/** Last fourteen values, nulls where nothing was logged. */
export function valuesOf(
  store: TrackerStore,
  id: TrackerId,
): { value: number | null; met: boolean; date: string }[] {
  return store.analysis.trackers[id].series.map((point) => ({
    value: point.value,
    met: point.met === true,
    date: point.date,
  }));
}

export function Observations({
  items,
  className = "",
}: {
  items: string[];
  className?: string;
}) {
  if (items.length === 0) return null;
  return (
    <ul className={className}>
      {items.map((line, i) => (
        <li key={line}>
          <span aria-hidden className="tabular-nums">
            {String(i + 1).padStart(2, "0")}
          </span>
          <p>{line}</p>
        </li>
      ))}
    </ul>
  );
}

/**
 * SyncNote — one honest line about where these days live right now.
 *
 * The page always draws from this device first, so a failed sync costs exactly
 * one thing: the day isn't on the account yet. It says that instead of spinning.
 */
export function SyncNote({ sync, onRetry }: { sync: TrackerStore["sync"]; onRetry: () => void }) {
  const retryable = sync.state === "error" || sync.state === "signed-out";
  return (
    <p className="tk2-sync" data-state={sync.state} aria-live="polite">
      <i className="tk2-sync-dot" aria-hidden />
      <span>{sync.message}</span>
      {retryable ? (
        <button type="button" onClick={onRetry} className="tk2-sync-retry">
          try again
        </button>
      ) : null}
    </p>
  );
}

export function Footer({ children }: { children?: ReactNode }) {
  return (
    <footer className="tk2-footer">
      {children}
      <p>{DISCLAIMER}</p>
    </footer>
  );
}

export type { TrackerStore };
export { useTrackers };

/**
 * A metric with its unit demoted.
 *
 * "8h 30m" becomes a platinum 8, a dimmed h, a platinum 30, a dimmed m. The
 * number is what you're reading; the unit is only there to tell you what the
 * number means, so it steps back to 35% and a smaller size.
 */
export function Metric({ value, className }: { value: string; className?: string }) {
  const parts = value.match(/\d+(?:[.,]\d+)?|\D+/g) ?? [value];
  return (
    <span className={className ? `tk2-metric ${className}` : "tk2-metric"}>
      {parts.map((part, i) =>
        /^\d/.test(part) ? (
          <b key={i}>{part}</b>
        ) : part.trim() === "" ? (
          <span key={i}> </span>
        ) : (
          <span key={i} className="tk2-unit">
            {part}
          </span>
        ),
      )}
    </span>
  );
}

/**
 * A capsule dock — one control, not a row of buttons.
 *
 * The metal chip slides beneath the active option instead of each button
 * lighting up on its own, so the whole thing reads as a single instrument.
 * `--tk2-dock-i` and `--tk2-dock-n` are what position the chip; the CSS does
 * the arithmetic so a dock can hold any number of options.
 */
export function CapsuleDock<T extends string | number>({
  label,
  labelId,
  options,
  value,
  onSelect,
  disabled,
}: {
  label?: string;
  labelId?: string;
  options: { value: T; label: string }[];
  value: T | null;
  onSelect: (value: T) => void;
  disabled?: boolean;
}) {
  const index = value === null ? -1 : options.findIndex((o) => o.value === value);
  return (
    <div className="tk2-dock-wrap">
      {label ? (
        <span className="ci-label" id={labelId}>
          {label}
        </span>
      ) : null}
      <div
        className="tk2-dock"
        role="group"
        aria-labelledby={labelId}
        style={
          {
            "--tk2-dock-i": Math.max(index, 0),
            "--tk2-dock-n": options.length,
          } as CSSProperties
        }
      >
        <span className="tk2-dock-tracer" data-visible={index >= 0 ? "true" : "false"} aria-hidden />
        {options.map((option) => (
          <button
            key={String(option.value)}
            type="button"
            className="tk2-dock-btn"
            data-active={option.value === value ? "true" : "false"}
            aria-pressed={option.value === value}
            disabled={disabled}
            onClick={() => onSelect(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
