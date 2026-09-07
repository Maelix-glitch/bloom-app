/**
 * useProfileRecord — joins the four records the app already keeps (tracker
 * days, mood check-ins, habit ticks, cycle days/periods) into the profile's
 * twelve-week grid, totals and "tracking now" chips.
 *
 * It only reads. Every store below is the same one its own page uses, so
 * the profile can never disagree with /trackers, /mood, / or /cycle.
 */

import { useMemo } from "react";

import { useHabits } from "@/hooks/useHabits";
import { usePeriodLog } from "@/hooks/usePeriodLog";
import { useTrackers } from "@/hooks/useTrackers";
import type { MoodEntry } from "@/lib/mood/types";
import {
  recordGrid,
  recordTotals,
  trackedThings,
  type RecordDay,
  type RecordTotals,
  type TrackedThing,
} from "@/lib/profile/record";
import { TRACKERS, type TrackerId } from "@/lib/trackers/core";

export interface ProfileRecord {
  /** 12 × 7 days, oldest first, Monday-first columns. */
  grid: RecordDay[];
  today: string;
  totals: RecordTotals;
  things: TrackedThing[];
  /** Per-day counts for the cover line — same order as `grid`. */
  pulse: number[];
  /** Short tags for the cover. */
  tags: string[];
  /** True once every underlying store has read its local copy. */
  hydrated: boolean;
}

export function useProfileRecord(moodEntries: readonly MoodEntry[]): ProfileRecord {
  const trackers = useTrackers();
  const habits = useHabits();
  const cycle = usePeriodLog();

  const input = useMemo(
    () => ({
      trackerDays: trackers.days,
      moodEntries,
      habitLogs: habits.logs,
      cycleDays: cycle.days,
      periods: cycle.logs,
    }),
    [trackers.days, moodEntries, habits.logs, cycle.days, cycle.logs],
  );

  const grid = useMemo(() => recordGrid(input), [input]);
  const totals = useMemo(() => recordTotals(input), [input]);

  const things = useMemo(() => {
    const labels = Object.fromEntries(TRACKERS.map((t) => [t.id, t.name])) as Record<
      TrackerId,
      string
    >;
    const trackerDetail = (id: TrackerId) => {
      const stat = trackers.analysis.trackers[id];
      const logged = stat.series.filter((p) => p.value != null).length;
      if (logged === 0) return "no entries yet";
      if (stat.streak > 1) return `${stat.streak}-day streak`;
      return `${logged} ${logged === 1 ? "day" : "days"} logged`;
    };
    const activeHabits = habits.habits.filter((h) => !h.archived).length;
    const cycleDetail = (() => {
      const n = cycle.logs.length;
      if (n === 0) return "no periods yet";
      if (!cycle.analysis.isGeneric) return `${cycle.analysis.averageLength}-day cycle`;
      return `${n} ${n === 1 ? "period" : "periods"} logged`;
    })();
    return trackedThings({
      active: trackers.active,
      trackerLabels: labels,
      trackerDetail,
      moodEntries: moodEntries.length,
      habits: activeHabits,
      cycleMode: cycle.mode,
      cycleDetail,
    });
  }, [
    trackers.active,
    trackers.analysis.trackers,
    habits.habits,
    moodEntries.length,
    cycle.logs.length,
    cycle.analysis,
    cycle.mode,
  ]);

  const pulse = useMemo(() => grid.days.map((d) => d.count), [grid.days]);
  const tags = useMemo(() => things.filter((t) => t.on).map((t) => t.label), [things]);

  return {
    grid: grid.days,
    today: grid.end,
    totals,
    things,
    pulse,
    tags,
    hydrated: trackers.hydrated && !habits.loading && cycle.hydrated,
  };
}
