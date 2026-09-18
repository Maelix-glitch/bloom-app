/**
 * Bloom Story Canvas — real data for data layers.
 *
 * Every figure here comes from something the user actually logged: the daily
 * tracker store, the mood record, the habit logs, the cycle store. When a
 * metric has no reading it is `null`, and the canvas hides the layer instead
 * of printing a number nobody wrote down.
 */

import type { BloomStoryData, StoryDataMetric } from "@/lib/stories/types";
import { EMPTY_BLOOM_DATA } from "@/lib/stories/types";
import { loadDays as loadTrackerDays, loadGoals } from "@/lib/trackers/store";
import { loadLogs as loadPeriodLogs } from "@/lib/cycle/periodStore";
import { diffDays } from "@/lib/cycle/engine";
import { todayLocal } from "@/lib/localDay";
import { EMOTION_MAP } from "@/lib/mood/types";
import type { MoodEntry } from "@/lib/mood/types";

export interface HabitsSnapshot {
  done: number;
  due: number;
  names: string[];
}

export interface StoryDataInput {
  moodEntries?: MoodEntry[] | undefined;
  habits?: HabitsSnapshot | null | undefined;
  /** Bloom Points total, when the account exposes one. */
  points?: number | null | undefined;
  /** Longest current habit streak, when known. */
  streak?: { days: number; label: string } | null | undefined;
}

const hasWindow = () => typeof window !== "undefined";

/** Read everything the canvas can honestly show, right now. */
export function readBloomStoryData(input: StoryDataInput = {}): BloomStoryData {
  const today = todayLocal();
  const out: BloomStoryData = {
    ...EMPTY_BLOOM_DATA,
    today: { date: today, label: longDate(today) },
  };

  /* ------------------------------ trackers ------------------------------ */
  if (hasWindow()) {
    try {
      const days = loadTrackerDays();
      const goals = loadGoals();
      const day = days.find((d) => d.date === today) ?? null;

      if (day?.sleepMinutes != null) {
        out.sleep = {
          minutes: day.sleepMinutes,
          goal: goals.sleepMinutes,
          quality: day.sleepQuality,
          bed: day.bedTime,
          wake: day.wakeTime,
        };
      }
      if (day?.waterMl != null) out.water = { ml: day.waterMl, goal: goals.waterMl };
      if (day?.movementMinutes != null)
        out.movement = { minutes: day.movementMinutes, goal: goals.movementMinutes };
      if (day?.energy != null) out.energy = { level: day.energy, goal: goals.energy };
      if (day && day.sessions.length > 0) {
        out.study = {
          minutes: day.sessions.reduce((sum, s) => sum + s.minutes, 0),
          goal: goals.studyMinutes,
          sessions: day.sessions.length,
        };
      }
    } catch {
      /* a bad row must never block the editor */
    }
  }

  /* -------------------------------- mood -------------------------------- */
  const entries = input.moodEntries ?? [];
  const todaysEntry = [...entries]
    .filter((e) => Number.isFinite(new Date(e.timestamp).getTime()))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .find((e) => todayLocal(new Date(e.timestamp)) === today);
  if (todaysEntry) {
    const emotion = todaysEntry.emotions[0] ?? "neutral";
    out.mood = {
      value: Math.round(todaysEntry.mood),
      label: `${Math.round(todaysEntry.mood)}/10`,
      emotion: EMOTION_MAP[emotion]?.label ?? "Neutral",
      note: todaysEntry.note?.trim() || null,
      at: todaysEntry.timestamp,
    };
  }

  /* -------------------------------- habits ------------------------------ */
  if (input.habits && input.habits.due > 0) {
    out.habits = {
      done: input.habits.done,
      due: input.habits.due,
      names: input.habits.names.slice(0, 6),
    };
  }
  if (input.streak) out.streak = input.streak;
  if (typeof input.points === "number" && Number.isFinite(input.points)) {
    out.points = { total: Math.round(input.points), label: `${Math.round(input.points)} pts` };
  }

  /* -------------------------------- cycle ------------------------------- */
  if (hasWindow()) {
    try {
      const logs = loadPeriodLogs()
        .map((l) => l.start)
        .filter((s) => typeof s === "string" && s.length === 10)
        .sort();
      const lastStart = logs.length > 0 ? (logs[logs.length - 1] as string) : null;
      if (lastStart) {
        const day = Math.max(1, diffDays(lastStart, today) + 1);
        const length = 28;
        const luteal = 14;
        const ovulationDay = length - luteal;
        const phase =
          day >= ovulationDay - 1 && day <= ovulationDay + 1
            ? "Ovulation window"
            : day < ovulationDay
              ? "Follicular"
              : "Luteal";
        out.cycle = { day, phase, length, estimated: true };
      }
    } catch {
      /* ignore */
    }
  }

  return out;
}

/* -------------------------------- formatting ----------------------------- */

export interface MetricReading {
  /** Big figure. */
  value: string;
  /** Small supporting line. */
  sub: string;
  /** 0–1 progress against the goal, when there is one. */
  progress: number | null;
}

const hours = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ""}` : `${m}m`;
};

const litres = (ml: number) => (ml >= 1000 ? `${(ml / 1000).toFixed(1)}L` : `${Math.round(ml)}ml`);

/** Turn a real reading into what the widget prints. `null` = nothing logged. */
export function metricReading(
  data: BloomStoryData | null,
  metric: StoryDataMetric,
): MetricReading | null {
  if (!data) return null;
  switch (metric) {
    case "mood":
      return data.mood
        ? { value: data.mood.label, sub: data.mood.emotion, progress: data.mood.value / 10 }
        : null;
    case "sleep":
      return data.sleep
        ? {
            value: hours(data.sleep.minutes),
            sub: `goal ${hours(data.sleep.goal)}`,
            progress: ratio(data.sleep.minutes, data.sleep.goal),
          }
        : null;
    case "water":
      return data.water
        ? {
            value: litres(data.water.ml),
            sub: `goal ${litres(data.water.goal)}`,
            progress: ratio(data.water.ml, data.water.goal),
          }
        : null;
    case "movement":
      return data.movement
        ? {
            value: `${data.movement.minutes} min`,
            sub: `goal ${data.movement.goal} min`,
            progress: ratio(data.movement.minutes, data.movement.goal),
          }
        : null;
    case "study":
      return data.study
        ? {
            value: hours(data.study.minutes),
            sub: `${data.study.sessions} ${data.study.sessions === 1 ? "session" : "sessions"}`,
            progress: ratio(data.study.minutes, data.study.goal),
          }
        : null;
    case "energy":
      return data.energy
        ? { value: `${data.energy.level}/5`, sub: "energy", progress: data.energy.level / 5 }
        : null;
    case "habits":
      return data.habits
        ? {
            value: `${data.habits.done}/${data.habits.due}`,
            sub: data.habits.due === data.habits.done ? "all done" : "done today",
            progress: ratio(data.habits.done, data.habits.due),
          }
        : null;
    case "streak":
      return data.streak
        ? {
            value: `${data.streak.days}`,
            sub: data.streak.label,
            progress: null,
          }
        : null;
    case "points":
      return data.points
        ? { value: `${data.points.total}`, sub: "bloom points", progress: null }
        : null;
    case "cycle":
      return data.cycle
        ? {
            value: `Day ${data.cycle.day}`,
            sub: data.cycle.phase,
            progress: ratio(data.cycle.day, data.cycle.length),
          }
        : null;
    case "today":
      return data.today ? { value: data.today.label, sub: "", progress: null } : null;
  }
}

/** Every metric a data layer may surface, in the order the picker shows them. */
export const METRICS: StoryDataMetric[] = [
  "mood",
  "sleep",
  "water",
  "movement",
  "study",
  "energy",
  "habits",
  "streak",
  "points",
  "cycle",
  "today",
];

export const METRIC_LABELS: Record<StoryDataMetric, string> = {
  mood: "Mood",
  sleep: "Sleep",
  water: "Water",
  movement: "Movement",
  study: "Focus",
  energy: "Energy",
  habits: "Habits",
  streak: "Streak",
  points: "Bloom Points",
  cycle: "Cycle",
  today: "Today's date",
};

export const METRIC_HINTS: Record<StoryDataMetric, string> = {
  mood: "Today's check-in",
  sleep: "Last night's hours",
  water: "Glasses logged today",
  movement: "Minutes logged today",
  study: "Sessions logged today",
  energy: "Energy logged today",
  habits: "Habits ticked today",
  streak: "Your longest run",
  points: "Points you've earned",
  cycle: "Cycle day and phase",
  today: "The date on the story",
};

function ratio(value: number, goal: number): number | null {
  if (!Number.isFinite(goal) || goal <= 0) return null;
  return Math.max(0, Math.min(1, value / goal));
}

function longDate(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return dateKey;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}
