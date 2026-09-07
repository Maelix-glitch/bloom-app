/**
 * B7 · Everything the export needs, gathered from the stores each page uses.
 *
 * The bundle is built on demand (`build()`), not on every render: assembling
 * a year of logs into one object is pointless until someone actually asks for
 * the file. Counts, on the other hand, are cheap and are needed by both the
 * export sheet and the erase confirmation, so those are memoised.
 */

import { useCallback, useMemo } from "react";

import { useHabits } from "@/hooks/useHabits";
import { usePeriodLog } from "@/hooks/usePeriodLog";
import { useTrackers } from "@/hooks/useTrackers";
import { buildExport, type ExportBundle, type ExportInput } from "@/lib/data/exportAll";
import { loadDoc } from "@/lib/prefs";
import { loadCheckInMemory } from "@/lib/cycle/periodStore";
import type { MoodEntry } from "@/lib/mood/types";

export interface ExportSources {
  profile?: ExportInput["profile"];
  stories?: ExportInput["stories"];
  highlights?: ExportInput["highlights"];
  moodEntries: readonly MoodEntry[];
}

export interface ExportBundleStore {
  build: () => ExportBundle;
  counts: { label: string; value: number }[];
}

export function useExportBundle(sources: ExportSources): ExportBundleStore {
  const habits = useHabits();
  const trackers = useTrackers();
  const cycle = usePeriodLog();

  const { profile, stories, highlights, moodEntries } = sources;

  const build = useCallback(
    () =>
      buildExport({
        ...(profile ? { profile } : {}),
        ...(stories ? { stories } : {}),
        ...(highlights ? { highlights } : {}),
        habits: habits.habits,
        habitLogs: habits.logs,
        trackerDays: trackers.days,
        trackerGoals: trackers.goals,
        activeTrackers: trackers.active,
        moodEntries,
        periods: cycle.logs,
        cycleDays: cycle.days,
        cycleSettings: cycle.settings,
        checkIns: loadCheckInMemory(),
        prefs: loadDoc(),
      }),
    [
      profile,
      stories,
      highlights,
      habits.habits,
      habits.logs,
      trackers.days,
      trackers.goals,
      trackers.active,
      moodEntries,
      cycle.logs,
      cycle.days,
      cycle.settings,
    ],
  );

  const counts = useMemo(
    () => [
      { label: "Mood check-ins", value: moodEntries.length },
      { label: "Habit ticks", value: habits.logs.length },
      { label: "Habits", value: habits.habits.length },
      { label: "Tracker days", value: trackers.days.length },
      { label: "Periods", value: cycle.logs.length },
      { label: "Cycle days", value: cycle.days.length },
    ],
    [
      moodEntries.length,
      habits.logs.length,
      habits.habits.length,
      trackers.days.length,
      cycle.logs.length,
      cycle.days.length,
    ],
  );

  return { build, counts };
}
