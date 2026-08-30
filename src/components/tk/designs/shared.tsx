/**
 * Shared plumbing for the three trackers designs.
 *
 * Everything here is data handling and the two blocks every design agrees on —
 * the disclaimer and the observations list. Layout, chart shapes and type belong
 * to each design's own file and stylesheet.
 */

import type { ReactNode } from "react";

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

export function Footer({ children }: { children?: ReactNode }) {
  return (
    <footer className="tk2-footer">
      {children}
      <p>{DISCLAIMER}</p>
    </footer>
  );
}

export { useTrackers };
