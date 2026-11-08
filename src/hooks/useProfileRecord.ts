/**
 * useProfileRecord — joins the four records the app already keeps (tracker
 * days, mood check-ins, habit ticks, cycle days/periods) into the profile's
 * twelve-week grid, totals and "tracking now" chips.
 *
 * It only reads. Every store below is the same one its own page uses, so
 * the profile can never disagree with /trackers, /mood, / or /cycle.
 */

import { useMemo } from "react";

import { useCycleVisible } from "@/hooks/useCycleVisible";
import { useEverReady } from "@/hooks/useEverReady";
import { useHabits, type HabitsAuth } from "@/hooks/useHabits";
import { usePeriodLog } from "@/hooks/usePeriodLog";
import { useTrackers, type TrackerSyncState } from "@/hooks/useTrackers";
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
  /**
   * True once every record behind the totals has SETTLED — the account
   * reads have answered, not just the device copies — and latched: once
   * true it never goes back, so a background refetch can't re-hide
   * settled figures. The stat surfaces render placeholders until this is
   * true and their final values exactly once after (the discipline the
   * Rewards achievements gallery already follows).
   */
  settled: boolean;
}

/**
 * Have the records behind the profile's numbers finished arriving?
 *
 * The same rule as `progressionRecordsSettled` on the Rewards path,
 * widened to the two extra sources the profile joins (cycle days, and the
 * mood block, whose check-ins count as logged days). Local hydration
 * alone is NOT settled: the stores hydrate from the device instantly and
 * then merge the account's answer, so totals computed in between are
 * intermediate values over a partial record — the profile used to render
 * those as final, and the numbers visibly stepped up as each store
 * landed ("4 of 84 days" on the way to 11).
 */
export function profileRecordsSettled(state: {
  auth: HabitsAuth;
  habitsLoading: boolean;
  moodSettled: boolean;
  trackersHydrated: boolean;
  trackerSyncState: TrackerSyncState;
  cycleHydrated: boolean;
}): boolean {
  if (!state.trackersHydrated || !state.cycleHydrated || !state.moodSettled) return false;
  // Still learning whether there is a session at all: nothing has settled.
  if (state.auth === "checking") return false;
  // Signed out, or a device-only build: the device record IS the record.
  if (state.auth !== "signed-in") return true;
  if (state.habitsLoading) return false;
  // The tracker pull starts at "off" and passes through "loading"; every
  // later state means the pull has answered. On "error" the device days
  // stand in — the same fallback the progression path takes.
  return state.trackerSyncState !== "off" && state.trackerSyncState !== "loading";
}

export function useProfileRecord(
  moodEntries: readonly MoodEntry[],
  opts?: { moodSettled?: boolean },
): ProfileRecord {
  const trackers = useTrackers();
  const habits = useHabits();
  const cycle = usePeriodLog();
  /* The same lever Today uses: the onboarding opt-out reads as mode "off"
     for the cycle chip, so opting out removes it here too — checking the
     period mode alone left the chip (and its cycle detail) on the profile
     of someone who had opted out with the mode still on. The grid and
     totals below still count historical cycle days: off hides surfaces,
     it never rewrites the record. */
  const { optedOut } = useCycleVisible();
  const effectiveCycleMode = optedOut ? "off" : cycle.mode;

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
      cycleMode: effectiveCycleMode,
      cycleDetail,
    });
  }, [
    trackers.active,
    trackers.analysis.trackers,
    habits.habits,
    moodEntries.length,
    cycle.logs.length,
    cycle.analysis,
    effectiveCycleMode,
  ]);

  const pulse = useMemo(() => grid.days.map((d) => d.count), [grid.days]);
  const tags = useMemo(() => things.filter((t) => t.on).map((t) => t.label), [things]);

  const settled = useEverReady(
    profileRecordsSettled({
      auth: habits.auth,
      habitsLoading: habits.loading,
      moodSettled: opts?.moodSettled ?? true,
      trackersHydrated: trackers.hydrated,
      trackerSyncState: trackers.sync.state,
      cycleHydrated: cycle.hydrated,
    }),
  );

  return {
    grid: grid.days,
    today: grid.end,
    totals,
    things,
    pulse,
    tags,
    hydrated: trackers.hydrated && !habits.loading && cycle.hydrated,
    settled,
  };
}
