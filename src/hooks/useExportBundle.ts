/**
 * B7 · Everything the export needs, gathered from the stores each page uses.
 *
 * The bundle is built on demand (`build()`), not on every render: assembling
 * a year of logs into one object is pointless until someone actually asks for
 * the file. Counts, on the other hand, are cheap and are needed by both the
 * export sheet and the erase confirmation, so those are memoised.
 */

import { useCallback, useMemo } from "react";

import { readCoachExport } from "@/hooks/useCoachSystem";
import { useHabits } from "@/hooks/useHabits";
import { usePeriodLog } from "@/hooks/usePeriodLog";
import { useProgression } from "@/hooks/useProgression";
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
  /** Whose Coach mirror to read — the signed-in id, or null when signed out. */
  userId?: string | null;
}

export interface ExportBundleStore {
  build: () => ExportBundle;
  counts: { label: string; value: number }[];
}

export function useExportBundle(sources: ExportSources): ExportBundleStore {
  const habits = useHabits();
  const trackers = useTrackers();
  const cycle = usePeriodLog();
  const progression = useProgression();

  const { profile, stories, highlights, moodEntries, userId } = sources;

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
        /* The Coach mirror is read at build time, like checkIns and prefs:
           it is this device's store, and build() is the moment of asking. */
        coachConversations: readCoachExport(userId ?? null),
        progression: {
          points: progression.points,
          rank: progression.rank.rank.name,
          ledger: progression.ledger,
          rankEvents: progression.rankEvents,
          achievements: progression.achievements.map((a) => ({
            id: a.def.id,
            title: a.def.title,
            unlocked: a.unlocked,
            achievedAt: a.achievedAt,
            progress: a.progress,
          })),
        },
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
      userId,
      progression.points,
      progression.rank,
      progression.ledger,
      progression.rankEvents,
      progression.achievements,
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
      {
        label: "Coach messages",
        value: readCoachExport(userId ?? null).reduce((sum, c) => sum + c.messages.length, 0),
      },
      { label: "Point entries", value: progression.ledger.length },
    ],
    [
      moodEntries.length,
      habits.logs.length,
      habits.habits.length,
      trackers.days.length,
      cycle.logs.length,
      cycle.days.length,
      userId,
      progression.ledger.length,
    ],
  );

  return { build, counts };
}
