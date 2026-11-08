/**
 * B7 · "Download everything" — one file with the whole record.
 *
 * The profile could already export identity, stories and highlights; mood JSON
 * lived on /mood/intelligence, tracker CSV on /trackers and two cycle CSVs on
 * /cycle — four places, three formats, and habits could not be exported at all.
 *
 * This module builds **one** bundle from the records the app already holds in
 * memory (the same stores every page reads), so an export never needs the
 * network and never disagrees with what is on screen. It is pure: the caller
 * hands in the records, this returns the payload and the file name.
 *
 * Wave 1 completed the record: the Coach conversations and the points
 * ledger/progression used to be the two domains the file silently left
 * behind. Coach arrives as the device mirror's conversations (the same
 * store the Coach page itself treats as the source of truth on this
 * device); progression arrives from the progression store — the ledger
 * entries, the rank events, the balance and the achievement states.
 */

import type { DayEntry, Goals, TrackerId } from "@/lib/trackers/core";
import type { Habit, HabitLog } from "@/lib/home/habits";
import type { DayLog } from "@/lib/cycle/dayLogs";
import type { PeriodLog } from "@/lib/cycle/predict";
import type { CycleSettings } from "@/lib/cycle/periodStore";
import type { MoodEntry } from "@/lib/mood/types";
import type { PointEntry, RankEvent } from "@/lib/progression/types";

/** One Coach conversation, reduced to the record: who spoke, when, the words. */
export interface ExportCoachConversation {
  title: string;
  mode: string;
  createdAt: string;
  updatedAt: string;
  messages: readonly {
    /** Normalised: "user" for the person, "coach" for Bloom. */
    role: "user" | "coach";
    at: string;
    text: string;
  }[];
}

/** One achievement's state at export time — the definition's id/title + outcome. */
export interface ExportAchievement {
  id: string;
  title: string;
  unlocked: boolean;
  achievedAt: string | null;
  progress: number;
}

/** Bumped only when the shape changes in a way an importer must notice. */
export const EXPORT_FORMAT = "bloom.export.v1";

export interface ExportInput {
  exportedAt?: string;
  profile?: {
    displayName?: string | null;
    username?: string | null;
    bio?: string | null;
    accent?: string | null;
    email?: string | null;
    memberSince?: string | null;
  } | null;
  stories?: readonly {
    kind: string;
    title: string;
    body: string | null;
    createdAt: string;
    expiresAt: string | null;
    visibility: string;
  }[];
  highlights?: readonly {
    name: string;
    accent: string;
    icon: string | null;
    stories: readonly { title: string; createdAt: string }[];
  }[];
  habits?: readonly Habit[];
  habitLogs?: readonly HabitLog[];
  trackerDays?: readonly DayEntry[];
  trackerGoals?: Goals | null;
  activeTrackers?: readonly TrackerId[];
  moodEntries?: readonly MoodEntry[];
  periods?: readonly PeriodLog[];
  cycleDays?: readonly DayLog[];
  cycleSettings?: CycleSettings | null;
  checkIns?: unknown;
  prefs?: unknown;
  coachConversations?: readonly ExportCoachConversation[];
  progression?: {
    /** Current balance (the account figure when signed in). */
    points: number | null;
    /** Current rank's name, e.g. "Seedling". */
    rank: string | null;
    ledger?: readonly PointEntry[];
    rankEvents?: readonly RankEvent[];
    achievements?: readonly ExportAchievement[];
  } | null;
}

export interface ExportCounts {
  habits: number;
  habitLogs: number;
  trackerDays: number;
  moodEntries: number;
  periods: number;
  cycleDays: number;
  stories: number;
  highlights: number;
  coachMessages: number;
  pointEntries: number;
}

export interface ExportBundle {
  format: typeof EXPORT_FORMAT;
  exportedAt: string;
  counts: ExportCounts;
  profile: ExportInput["profile"];
  stories: NonNullable<ExportInput["stories"]>;
  highlights: NonNullable<ExportInput["highlights"]>;
  habits: readonly Habit[];
  habitLogs: readonly HabitLog[];
  trackers: {
    days: readonly DayEntry[];
    goals: Goals | null;
    active: readonly TrackerId[];
  };
  mood: readonly MoodEntry[];
  cycle: {
    periods: readonly PeriodLog[];
    days: readonly DayLog[];
    settings: CycleSettings | null;
    checkIns: unknown;
  };
  coach: readonly ExportCoachConversation[];
  progression: {
    points: number | null;
    rank: string | null;
    ledger: readonly PointEntry[];
    rankEvents: readonly RankEvent[];
    achievements: readonly ExportAchievement[];
  } | null;
  prefs: unknown;
}

const list = <T>(v: readonly T[] | undefined): readonly T[] => v ?? [];

/** Everything a person has logged, in one JSON-serialisable object. */
export function buildExport(input: ExportInput): ExportBundle {
  const habits = list(input.habits);
  const habitLogs = list(input.habitLogs);
  const trackerDays = list(input.trackerDays);
  const moodEntries = list(input.moodEntries);
  const periods = list(input.periods);
  const cycleDays = list(input.cycleDays);
  const stories = list(input.stories);
  const highlights = list(input.highlights);
  const coach = list(input.coachConversations);
  const progression = input.progression
    ? {
        points: input.progression.points,
        rank: input.progression.rank,
        ledger: list(input.progression.ledger),
        rankEvents: list(input.progression.rankEvents),
        achievements: list(input.progression.achievements),
      }
    : null;

  return {
    format: EXPORT_FORMAT,
    exportedAt: input.exportedAt ?? new Date().toISOString(),
    counts: {
      habits: habits.length,
      habitLogs: habitLogs.length,
      trackerDays: trackerDays.length,
      moodEntries: moodEntries.length,
      periods: periods.length,
      cycleDays: cycleDays.length,
      stories: stories.length,
      highlights: highlights.length,
      coachMessages: coach.reduce((sum, c) => sum + c.messages.length, 0),
      pointEntries: progression?.ledger.length ?? 0,
    },
    profile: input.profile ?? null,
    stories,
    highlights,
    habits,
    habitLogs,
    trackers: {
      days: trackerDays,
      goals: input.trackerGoals ?? null,
      active: list(input.activeTrackers),
    },
    mood: moodEntries,
    cycle: {
      periods,
      days: cycleDays,
      settings: input.cycleSettings ?? null,
      checkIns: input.checkIns ?? null,
    },
    coach,
    progression,
    prefs: input.prefs ?? null,
  };
}

/** `bloom-export-20260907.json` — dated so several downloads don't collide. */
export function exportFileName(exportedAt: string): string {
  const stamp = exportedAt.slice(0, 10).replace(/-/g, "");
  return `bloom-export-${stamp || "latest"}.json`;
}

/** How many records in total — used for the "12,431 records" line in the UI. */
export function totalRecords(counts: ExportCounts): number {
  return Object.values(counts).reduce((sum, n) => sum + n, 0);
}

/** One-line summary of what is in the file, for the confirmation toast. */
export function describeExport(counts: ExportCounts): string {
  const parts: string[] = [];
  const add = (n: number, one: string, many = `${one}s`) => {
    if (n > 0) parts.push(`${n} ${n === 1 ? one : many}`);
  };
  add(counts.moodEntries, "mood check-in");
  add(counts.habitLogs, "habit tick");
  add(counts.trackerDays, "tracker day");
  add(counts.periods, "period");
  add(counts.cycleDays, "cycle day");
  add(counts.stories, "moment");
  add(counts.coachMessages, "coach message");
  add(counts.pointEntries, "point entry", "point entries");
  if (parts.length === 0) return "Nothing logged yet — the file has your profile only.";
  return parts.join(" · ");
}

/** Browser-side download. Kept here so every caller writes the same file. */
export function downloadExport(bundle: ExportBundle): void {
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = exportFileName(bundle.exportedAt);
  a.click();
  URL.revokeObjectURL(url);
}
