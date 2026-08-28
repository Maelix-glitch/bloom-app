import dayjs from "dayjs";

import {
  aggregateDays,
  bandOf,
  calculateMoodTrend,
  detectAnomalies,
  detectPatterns,
  mean,
  round,
  TIME_BANDS,
} from "@/lib/mood/analytics";
import type { MoodEntry } from "@/lib/mood/types";

export type CoachMode = "ask" | "reflect" | "plan";

export type CoachIntent =
  | "UNDERSTAND"
  | "EXPLAIN"
  | "COMPARE"
  | "SUMMARIZE"
  | "REFLECT"
  | "IDENTIFY_PATTERN"
  | "INVESTIGATE_PROBLEM"
  | "MAKE_DECISION"
  | "PLAN"
  | "REVIEW_PROGRESS"
  | "REVIEW_WEEK"
  | "REVIEW_MONTH"
  | "REMEMBER"
  | "FORGET"
  | "ANALYZE_IMAGE"
  | "TRANSCRIBE"
  | "RECOVER_FROM_SETBACK"
  | "SIMPLIFY_ROUTINE";

export interface ApprovedMemoryContext {
  id: string;
  category: string;
  text: string;
  pinned: boolean;
  learnedAt: string;
}

export interface CoachHabitContextInput {
  id: string;
  name: string;
  frequency: string;
  days: number[];
  timesPerWeek: number | null;
  reminderTime: string | null;
  priority: string | null;
  tags: string[];
  goal: { target: number | null; unit: string | null } | null;
  startDate: string | null;
}

export interface CoachHabitLogInput {
  habitId: string;
  date: string;
}

export interface CoachHabitData {
  available: boolean;
  habits: CoachHabitContextInput[];
  logs: CoachHabitLogInput[];
}

export interface CoachHabitWindowContext {
  completed: number;
  expected: number | null;
  rate: number | null;
}

export interface CoachHabitSummary {
  id: string;
  name: string;
  frequency: string;
  days: number[];
  timesPerWeek: number | null;
  reminderTime: string | null;
  priority: string | null;
  tags: string[];
  goal: { target: number | null; unit: string | null } | null;
  recent: CoachHabitWindowContext;
  previous: CoachHabitWindowContext;
}

export interface CoachWindowContext {
  label: "last_7_days" | "previous_7_days" | "last_30_days";
  start: string;
  end: string;
  entries: number;
  days: number;
  mood: number;
  energy: number;
  stress: number;
}

export interface CoachTimeBandContext {
  label: string;
  entries: number;
  mood: number | null;
  energy: number | null;
  stress: number | null;
}

export interface CoachPatternContext {
  title: string;
  statement: string;
  evidence: "insufficient" | "low" | "moderate" | "strong";
  sampleSize: number;
  metrics: { label: string; value: string }[];
}

export interface CoachAnomalyContext {
  date: string;
  mood: number;
  baseline: number;
  deviation: number;
  kind: "high" | "low";
}

export interface CoachContext {
  mood: {
    average: number;
    energy: number;
    stress: number;
    entries: number;
    dataQuality: "none" | "sparse" | "usable" | "rich";
    recent: CoachWindowContext;
    previous: CoachWindowContext;
    month: CoachWindowContext;
    change: {
      mood: number | null;
      energy: number | null;
      stress: number | null;
      direction: "improving" | "declining" | "stable" | "insufficient";
    };
    trend: {
      mood: "improving" | "declining" | "stable" | "insufficient";
      perWeek: number;
    };
    timeOfDay: CoachTimeBandContext[];
    emotions: { label: string; count: number }[];
    patterns: CoachPatternContext[];
    anomalies: CoachAnomalyContext[];
  };
  habits: {
    available: boolean;
    activeCount: number;
    recentCompleted: number;
    previousCompleted: number;
    selected: CoachHabitSummary[];
  };
  memory: {
    available: number;
    selected: ApprovedMemoryContext[];
  };
  intent: {
    primary: CoachIntent;
    mode: CoachMode;
  };
  policy: {
    factsFromApplication: true;
    currentMessageHasPriority: true;
    actionsRequireConfirmation: true;
    uncertaintyIsRequired: true;
  };
  evidence: string[];
  contextSources: ("mood_recent" | "mood_baseline" | "habits_recent" | "approved_memory")[];
}

const DATE_FORMAT = "YYYY-MM-DD";
const DAY_COUNT = 7;

function dateFor(entry: MoodEntry) {
  return dayjs(entry.timestamp).format(DATE_FORMAT);
}

function between(entries: MoodEntry[], start: string, end: string) {
  return entries.filter((entry) => {
    const date = dateFor(entry);
    return date >= start && date <= end;
  });
}

function windowFor(
  entries: MoodEntry[],
  label: CoachWindowContext["label"],
  start: string,
  end: string,
): CoachWindowContext {
  const selected = between(entries, start, end);
  const days = aggregateDays(selected);
  return {
    label,
    start,
    end,
    entries: selected.length,
    days: days.length,
    mood: selected.length ? round(mean(selected.map((entry) => entry.mood)), 2) : 0,
    energy: selected.length ? round(mean(selected.map((entry) => entry.energy)), 2) : 0,
    stress: selected.length ? round(mean(selected.map((entry) => entry.stress)), 2) : 0,
  };
}

function directionFor(current: number, previous: number, enoughData: boolean) {
  if (!enoughData) return "insufficient" as const;
  const delta = current - previous;
  if (delta > 0.25) return "improving" as const;
  if (delta < -0.25) return "declining" as const;
  return "stable" as const;
}

function dataQuality(entryCount: number) {
  if (!entryCount) return "none" as const;
  if (entryCount < 4) return "sparse" as const;
  if (entryCount < 14) return "usable" as const;
  return "rich" as const;
}

function tokenize(value: string) {
  return new Set(value.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []);
}

function selectMemories(
  memories: ApprovedMemoryContext[],
  message: string,
): ApprovedMemoryContext[] {
  if (!memories.length) return [];
  const terms = tokenize(message);
  const scored = memories.map((memory, index) => {
    const memoryTerms = tokenize(memory.text);
    const overlap = [...terms].filter((term) => memoryTerms.has(term)).length;
    const recencyBonus = Math.max(0, 0.5 - index * 0.01);
    return {
      memory,
      overlap,
      score: overlap * 3 + (memory.pinned ? 1.5 : 0) + recencyBonus,
    };
  });
  const relevant = scored.filter(({ overlap }) => overlap > 0);
  const candidates = relevant.length ? relevant : scored.filter(({ memory }) => memory.pinned);
  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ memory }) => memory);
}

function habitRelevant(habit: CoachHabitContextInput, message: string) {
  const terms = tokenize(message);
  const nameTerms = tokenize(`${habit.name} ${habit.tags.join(" ")}`);
  return [...terms].some((term) => nameTerms.has(term));
}

function expectedHabitSessions(habit: CoachHabitContextInput, start: string, end: string) {
  const first = habit.startDate && habit.startDate > start ? habit.startDate : start;
  if (first > end) return 0;
  const dayCount = dayjs(end).diff(dayjs(first), "day") + 1;
  if (habit.frequency === "daily") return dayCount;
  if (habit.frequency === "custom" && habit.days.length) {
    let expected = 0;
    for (let offset = 0; offset < dayCount; offset += 1) {
      if (habit.days.includes(dayjs(first).add(offset, "day").day())) expected += 1;
    }
    return expected;
  }
  // Weekly targets do not identify exact weekdays, so do not invent an
  // expected-session denominator. The target is passed separately below.
  return null;
}

function habitWindow(
  habit: CoachHabitContextInput,
  logs: CoachHabitLogInput[],
  start: string,
  end: string,
): CoachHabitWindowContext {
  const completed = new Set(
    logs
      .filter((log) => log.habitId === habit.id && log.date >= start && log.date <= end)
      .map((log) => log.date),
  ).size;
  const expected = expectedHabitSessions(habit, start, end);
  return {
    completed,
    expected,
    rate: expected ? round((completed / expected) * 100, 1) : null,
  };
}

function habitSummary(
  data: CoachHabitData,
  message: string,
  recentStart: string,
  today: string,
  previousStart: string,
  previousEnd: string,
): {
  activeCount: number;
  recentCompleted: number;
  previousCompleted: number;
  selected: CoachHabitSummary[];
} {
  const active = data.habits;
  const relevant = active.filter((habit) => habitRelevant(habit, message));
  const habitTopic =
    /habit|routine|consistent|completion|schedule|workout|reading|goal|productivity|streak|miss|postpon|resched/i.test(
      message,
    );
  const selectedHabits = (relevant.length ? relevant : habitTopic ? active : []).slice(0, 8);
  const selectedIds = new Set(selectedHabits.map((habit) => habit.id));
  const recentLogs = new Set(
    data.logs
      .filter((log) => selectedIds.has(log.habitId) && log.date >= recentStart && log.date <= today)
      .map((log) => `${log.habitId}|${log.date}`),
  );
  const previousLogs = new Set(
    data.logs
      .filter(
        (log) =>
          selectedIds.has(log.habitId) && log.date >= previousStart && log.date <= previousEnd,
      )
      .map((log) => `${log.habitId}|${log.date}`),
  );
  return {
    activeCount: active.length,
    recentCompleted: recentLogs.size,
    previousCompleted: previousLogs.size,
    selected: selectedHabits.map((habit) => ({
      id: habit.id,
      name: habit.name,
      frequency: habit.frequency,
      days: habit.days,
      timesPerWeek: habit.timesPerWeek,
      reminderTime: habit.reminderTime,
      priority: habit.priority,
      tags: habit.tags,
      goal: habit.goal,
      recent: habitWindow(habit, data.logs, recentStart, today),
      previous: habitWindow(habit, data.logs, previousStart, previousEnd),
    })),
  };
}

function intentFor(message: string, mode: CoachMode): CoachIntent {
  const normalized = message.toLowerCase();
  if (/remember|don't forget|keep in mind/.test(normalized)) return "REMEMBER";
  if (/forget|stop remembering|remove that memory/.test(normalized)) return "FORGET";
  if (/compare|versus|difference|better than|should i .* or/.test(normalized)) {
    return "COMPARE";
  }
  if (/why|what changed|how come|struggling|inconsistent|keep missing/.test(normalized)) {
    return /pattern|trend|week|month|recent|lately/.test(normalized)
      ? "IDENTIFY_PATTERN"
      : "INVESTIGATE_PROBLEM";
  }
  if (/plan|schedule|next step|what should i do|help me decide/.test(normalized)) {
    return /should i|or/.test(normalized) ? "MAKE_DECISION" : "PLAN";
  }
  if (/this week|week review|weekly/.test(normalized)) return "REVIEW_WEEK";
  if (/this month|last month|monthly/.test(normalized)) return "REVIEW_MONTH";
  if (/progress|doing|improve|better|worse/.test(normalized)) return "REVIEW_PROGRESS";
  if (/simplify|too much|overloaded|overwhelm|too many/.test(normalized)) {
    return "SIMPLIFY_ROUTINE";
  }
  if (/reflect|meaning|understand myself|underneath/.test(normalized)) return "REFLECT";
  if (/recover|restart|setback|missed day/.test(normalized)) return "RECOVER_FROM_SETBACK";
  if (mode === "reflect") return "REFLECT";
  if (mode === "plan") return "PLAN";
  if (/explain|what does|meaning of/.test(normalized)) return "EXPLAIN";
  return "UNDERSTAND";
}

function timeOfDay(entries: MoodEntry[]): CoachTimeBandContext[] {
  return TIME_BANDS.map((band) => {
    const selected = entries.filter(
      (entry) => bandOf(new Date(entry.timestamp).getHours()) === band.key,
    );
    return {
      label: band.label,
      entries: selected.length,
      mood: selected.length ? round(mean(selected.map((entry) => entry.mood)), 2) : null,
      energy: selected.length ? round(mean(selected.map((entry) => entry.energy)), 2) : null,
      stress: selected.length ? round(mean(selected.map((entry) => entry.stress)), 2) : null,
    };
  });
}

function emotionSummary(entries: MoodEntry[]) {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    for (const emotion of entry.emotions) {
      counts.set(emotion, (counts.get(emotion) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, count]) => ({ label, count }));
}

export function buildCoachContext(
  entries: MoodEntry[],
  memories: ApprovedMemoryContext[],
  habitData: CoachHabitData,
  mode: CoachMode,
  message: string,
  attachmentType?: string,
): CoachContext {
  const today = dayjs().format(DATE_FORMAT);
  const recentStart = dayjs(today)
    .subtract(DAY_COUNT - 1, "day")
    .format(DATE_FORMAT);
  const previousStart = dayjs(today)
    .subtract(DAY_COUNT * 2 - 1, "day")
    .format(DATE_FORMAT);
  const previousEnd = dayjs(today).subtract(DAY_COUNT, "day").format(DATE_FORMAT);
  const monthStart = dayjs(today).subtract(29, "day").format(DATE_FORMAT);

  const recent = windowFor(entries, "last_7_days", recentStart, today);
  const previous = windowFor(entries, "previous_7_days", previousStart, previousEnd);
  const month = windowFor(entries, "last_30_days", monthStart, today);
  const habits = habitSummary(habitData, message, recentStart, today, previousStart, previousEnd);
  const moodDays = aggregateDays(between(entries, monthStart, today));
  const patterns = detectPatterns(moodDays)
    .slice(0, 5)
    .map((pattern) => ({
      title: pattern.title,
      statement: pattern.statement,
      evidence: pattern.evidence,
      sampleSize: pattern.n,
      metrics: pattern.metrics,
    }));
  const anomalies = detectAnomalies(moodDays)
    .slice(0, 5)
    .map((anomaly) => ({
      date: anomaly.date,
      mood: anomaly.mood,
      baseline: anomaly.baseline,
      deviation: anomaly.deviation,
      kind: anomaly.kind,
    }));
  const trend = calculateMoodTrend(moodDays);
  const recentEntries = between(entries, recentStart, today);
  const hasComparison = recent.entries >= 3 && previous.entries >= 3;
  const change = {
    mood: hasComparison ? round(recent.mood - previous.mood, 2) : null,
    energy: hasComparison ? round(recent.energy - previous.energy, 2) : null,
    stress: hasComparison ? round(recent.stress - previous.stress, 2) : null,
    direction: directionFor(recent.mood, previous.mood, hasComparison),
  };
  const selected = selectMemories(memories, message);
  const evidence: string[] = [];
  const sources: CoachContext["contextSources"] = [];

  if (recent.entries) {
    sources.push("mood_recent");
    evidence.push(
      `Last 7 days: ${recent.entries} Mood ${recent.entries === 1 ? "entry" : "entries"} across ${recent.days} ${recent.days === 1 ? "day" : "days"}.`,
    );
  }
  if (previous.entries) {
    sources.push("mood_baseline");
    evidence.push(
      `Previous 7 days: ${previous.entries} Mood ${previous.entries === 1 ? "entry" : "entries"} across ${previous.days} ${previous.days === 1 ? "day" : "days"}.`,
    );
  }
  if (hasComparison) {
    evidence.push(
      `Mood average changed from ${previous.mood.toFixed(1)} to ${recent.mood.toFixed(1)}; energy changed from ${previous.energy.toFixed(1)} to ${recent.energy.toFixed(1)}; stress changed from ${previous.stress.toFixed(1)} to ${recent.stress.toFixed(1)}.`,
    );
  }
  if (habitData.available && habits.selected.length) {
    sources.push("habits_recent");
    evidence.push(
      `The account has ${habits.activeCount} active ${habits.activeCount === 1 ? "habit" : "habits"}; recent completion logs show ${habits.recentCompleted} completed ${habits.recentCompleted === 1 ? "session" : "sessions"} in the last 7 days and ${habits.previousCompleted} in the previous 7 days.`,
    );
  }
  if (
    patterns.length &&
    /why|change|pattern|routine|mood|energy|stress|sleep|consistent|week/i.test(message)
  ) {
    evidence.push(...patterns.slice(0, 2).map((pattern) => `Observed: ${pattern.statement}`));
  }
  if (selected.length) sources.push("approved_memory");
  if (!evidence.length)
    evidence.push("There is not enough recorded Mood history for a reliable comparison yet.");

  return {
    mood: {
      average: month.entries ? month.mood : 0,
      energy: month.entries ? month.energy : 0,
      stress: month.entries ? month.stress : 0,
      entries: entries.length,
      dataQuality: dataQuality(entries.length),
      recent,
      previous,
      month,
      change,
      trend: {
        mood: moodDays.length >= 3 ? trend.direction : "insufficient",
        perWeek: moodDays.length >= 3 ? trend.perWeek : 0,
      },
      timeOfDay: timeOfDay(recentEntries),
      emotions: emotionSummary(recentEntries),
      patterns,
      anomalies,
    },
    habits: {
      available: habitData.available,
      activeCount: habits.activeCount,
      recentCompleted: habits.recentCompleted,
      previousCompleted: habits.previousCompleted,
      selected: habits.selected,
    },
    memory: {
      available: memories.length,
      selected,
    },
    intent: {
      primary: attachmentType?.startsWith("image/")
        ? "ANALYZE_IMAGE"
        : attachmentType?.startsWith("audio/")
          ? "TRANSCRIBE"
          : intentFor(message, mode),
      mode,
    },
    policy: {
      factsFromApplication: true,
      currentMessageHasPriority: true,
      actionsRequireConfirmation: true,
      uncertaintyIsRequired: true,
    },
    evidence,
    contextSources: [...new Set(sources)],
  };
}
