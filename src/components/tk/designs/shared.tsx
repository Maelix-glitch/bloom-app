/**
 * Shared plumbing for the three trackers designs.
 *
 * Everything here is data handling and the two blocks every design agrees on —
 * the disclaimer and the observations list. Layout, chart shapes and type belong
 * to each design's own file and stylesheet.
 */

import type { CSSProperties, ReactNode } from "react";
import { createPortal } from "react-dom";

import { useTrackers, type SaveDayResult, type TrackerStore } from "@/hooks/useTrackers";
import { emptyDay, trackerDef, type DayEntry, type TrackerId } from "@/lib/trackers/core";

/**
 * The overlay layer — where every panel and sheet actually lives.
 *
 * Two reasons it is not rendered inside the page. A `position: fixed` element
 * stops being fixed the moment some ancestor gains a transform or a filter,
 * which drops the panel into the page flow; and anything rendered in the flow
 * shows up as bare words at the foot of the canvas if the stylesheet fails to
 * arrive. Portalling to <body> puts it outside both. The handful of rules it
 * cannot do without are set inline so they hold even with no CSS at all.
 */
export function Overlay({ children }: { children: ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="tk2-modal-root"
      data-overlay=""
      style={{ position: "fixed", inset: 0, zIndex: 2000 }}
    >
      {children}
    </div>,
    document.body,
  );
}

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
  if (id === "sleep") next.sleepMinutes = (current.sleepMinutes ?? 0) + amount;
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

/**
 * What a tracker stands at today, so a field can open on the real number
 * rather than on a blank.
 */
export function readTrackerValue(store: TrackerStore, id: TrackerId): number | null {
  const entry = store.days.find((d) => d.date === store.today);
  if (!entry) return null;
  if (id === "study") return entry.sessions.reduce((sum, s) => sum + s.minutes, 0);
  if (id === "sleep") return entry.sleepMinutes;
  if (id === "water") return entry.waterMl;
  if (id === "movement") return entry.movementMinutes;
  if (id === "energy") return entry.energy;
  return entry.screenMinutes;
}

/**
 * Write a total, not an increment.
 *
 * You type 1750 for water because that's what you've drunk today; you don't
 * have to remember what was there before and add to it. Study keeps the start
 * time of its first session if it has one, and collapses to a single block —
 * the total is the number being set.
 */
/** Put one number onto a day. Used by both write paths below. */
function applyValue(
  next: DayEntry,
  current: DayEntry,
  id: TrackerId,
  value: number,
): void {
  const max = trackerDef(id).max;
  const clamped = Math.min(Math.max(Math.round(value), 0), max);
  if (id === "sleep") next.sleepMinutes = clamped;
  if (id === "water") next.waterMl = clamped;
  if (id === "movement") next.movementMinutes = clamped;
  if (id === "screen") next.screenMinutes = clamped;
  if (id === "energy") next.energy = Math.min(Math.max(Math.round(value), 1), 5);
  if (id === "study") {
    const first = current.sessions[0];
    next.sessions =
      clamped > 0
        ? [
            {
              subject: first?.subject ?? "General",
              minutes: clamped,
              startAt: first?.startAt ?? null,
            },
          ]
        : [];
  }
}

function report(result: SaveDayResult): string | null {
  if (result.ok) return null;
  const first = Object.values(result.errors)[0];
  return typeof first === "string" ? first : "That didn't save.";
}

/**
 * Write a total, not an increment.
 *
 * You type 1750 for water because that's what you've drunk today; you don't
 * have to remember what was there before and add to it. Study keeps the start
 * time of its first session if it has one, and collapses to a single block —
 * the total is the number being set.
 */
export function setTrackerValue(
  store: TrackerStore,
  id: TrackerId,
  value: number,
): string | null {
  return setTrackerValues(store, [{ id, value }]);
}

/**
 * Write several totals in one go.
 *
 * This exists because a day is stored whole: two separate writes in the same
 * tick would each rebuild the day from the same snapshot, and the second would
 * quietly throw the first away. Every field the sheet touches lands on one
 * copy of the day before it's saved.
 */
export function setTrackerValues(
  store: TrackerStore,
  entries: { id: TrackerId; value: number }[],
): string | null {
  const today = store.today;
  const current = store.days.find((d) => d.date === today) ?? emptyDay(today);
  const next: DayEntry = { ...current, date: today };
  for (const entry of entries) applyValue(next, current, entry.id, entry.value);
  return report(store.saveDay(next));
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
  caption,
}: {
  items: string[];
  className?: string;
  /** The gold line above the list — what kind of read this is. */
  caption?: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className={`tk2-insight ${className}`.trim()}>
      {caption ? <p className="tk2-insight-caption">{caption}</p> : null}
      <ul className="tk2-insight-list">
        {items.map((line, i) => (
          <li key={line}>
            <span aria-hidden className="tk2-insight-index">
              {String(i + 1).padStart(2, "0")}
            </span>
            <p>{line}</p>
          </li>
        ))}
      </ul>
    </div>
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
    <span className={`tk2-metric ${className ?? ""}`.trim()}>
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
 * A row of tag choices — one distinct element per word.
 *
 * These wrap rather than sit in a single rigid track: "Rough Fair Okay Good
 * Deep" is five separate controls, and in a narrow column it's better they
 * flow onto a second line than compress into each other.
 */
export function TagGroup<T extends string | number>({
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
  return (
    <div className="tk2-picker">
      {label ? (
        <span className="ci-label" id={labelId}>
          {label}
        </span>
      ) : null}
      <div className="tk2-tags" role="group" aria-labelledby={labelId}>
        {options.map((option) => (
          <button
            key={String(option.value)}
            type="button"
            className="tk2-tag"
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

/**
 * A scale of numbers as circles in a capsule bar — energy out of five.
 *
 * Each digit is its own 32px circle so it reads as a dial setting rather than
 * a line of text, and the bar itself is a single capsule the circles sit in.
 */
export function NumberPicker<T extends string | number>({
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
  return (
    <div className="tk2-picker">
      {label ? (
        <span className="ci-label" id={labelId}>
          {label}
        </span>
      ) : null}
      <div className="tk2-numbers" role="group" aria-labelledby={labelId}>
        {options.map((option) => (
          <button
            key={String(option.value)}
            type="button"
            className="tk2-number"
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
