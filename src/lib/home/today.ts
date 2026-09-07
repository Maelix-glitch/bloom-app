/**
 * Today page model — turns the real records (trackers, habits, mood, cycle)
 * into what the panels draw. Pure functions, no React, no storage.
 *
 * Rules, carried over from the rest of Bloom:
 *  - nothing is invented: an empty record produces an empty ring and honest
 *    copy, never a placeholder number;
 *  - strengths and insights are computed from this person's own logs;
 *  - anything shown as a percentage says what it is a percentage of.
 */

import type { TrackerAnalysis, TrackerId } from "@/lib/trackers/core";
import { TRACKERS } from "@/lib/trackers/core";
import { describeNextPeriodShort, type CycleAnalysis } from "@/lib/cycle/predict";
import type { CycleMode } from "@/lib/cycle/periodStore";
import type {
  Correlation as MoodCorrelation,
  DayAggregate,
  Insight,
  MoodEntry,
} from "@/lib/mood/types";
import type { HabitLog, Habit } from "@/lib/home/habits";
import type { HabitToday } from "@/hooks/useHabits";
import { localDay, localTime } from "@/lib/localDay";

export type SignalId = "mood" | "habits" | "cycle" | "energy" | "study" | "sleep";

export interface SignalReading {
  id: SignalId;
  label: string;
  /** Short value shown under the mini ring, e.g. "2 / 5", "7h 20m", "Day 12". */
  value: string;
  /** 0–1 ring fill. */
  pct: number;
  /** True when nothing is logged for it today. */
  empty: boolean;
  /** Where a tap should go. */
  to: string;
}

export interface TodayScore {
  /** 0–100, weighted like the legacy Today page: habits 40 · trackers 35 · mood 25. */
  overall: number;
  habitPct: number;
  trackerPct: number;
  moodPct: number;
  /** How many of the three inputs have anything behind them. */
  inputs: number;
  caption: string;
  note: string;
}

export interface Connection {
  id: SignalId;
  /** 0–1: how much evidence Bloom has for this signal today + this month. */
  strength: number;
  /** Plain-language note derived from real data, or a nudge when empty. */
  note: string;
  /** Number of logged days the strength rests on. */
  days: number;
}

export interface CrossLink {
  from: SignalId;
  to: SignalId;
  /** |r| 0–1 */
  weight: number;
  sentence: string;
}

export interface FlowItem {
  id: string;
  time: string; // "HH:MM"
  title: string;
  sub: string;
  done: boolean;
  kind: "habit" | "tracker" | "mood" | "journal";
  color: string;
  habitId?: string | undefined;
}

export interface FocusItem {
  id: string;
  title: string;
  sub: string;
  kind: "habit" | "mood" | "tracker" | "cycle";
  done: boolean;
  to?: string | undefined;
  habitId?: string | undefined;
}

export interface InsightItem {
  id: string;
  signal: SignalId;
  title: string;
  sub: string;
}

export interface ActivityItem {
  id: string;
  signal: SignalId;
  title: string;
  sub: string;
  at: string; // ISO
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const SIGNAL_LABEL: Record<SignalId, string> = {
  mood: "Mood",
  habits: "Habits",
  cycle: "Cycle",
  energy: "Energy",
  study: "Study",
  sleep: "Sleep",
};

export const SIGNAL_ROUTE: Record<SignalId, string> = {
  mood: "/mood",
  habits: "/",
  cycle: "/cycle",
  energy: "/trackers",
  study: "/trackers",
  sleep: "/trackers",
};

import { greeting } from "@/lib/voice/copy";
import type { Daypart } from "@/lib/voice/messages";

const fmt = (id: TrackerId, v: number) => TRACKERS.find((t) => t.id === id)!.format(v);

/* ------------------------------- greeting -------------------------------- */


/**
 * A time-of-day hello, from a pool rather than a constant.
 *
 * Seeded on the hour, so it is stable across re-renders and server/client
 * (no hydration mismatch), but a person who opens Bloom morning and evening
 * doesn't read the same two words every day.
 */
export function greetingFor(hour: number): string {
  const part: Daypart =
    hour < 5 ? "night" : hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  return greeting(part, `${part}-${hour}`);
}

export function longDate(d = new Date()): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
  }).format(d);
}

/* ------------------------------- readings -------------------------------- */

export function moodToday(entries: readonly MoodEntry[], today: string): MoodEntry | null {
  let latest: MoodEntry | null = null;
  for (const e of entries) {
    if (localDay(e.timestamp) !== today) continue;
    if (!latest || e.timestamp > latest.timestamp) latest = e;
  }
  return latest;
}

export function readings(input: {
  trackers: TrackerAnalysis;
  habits: { completedToday: number; dueToday: number };
  mood: MoodEntry | null;
  cycle: CycleAnalysis;
  /** `off` removes the Cycle ring entirely; `paused` shows it without a day count. */
  cycleMode?: CycleMode | undefined;
}): SignalReading[] {
  const { trackers, habits, mood, cycle } = input;
  const cycleMode = input.cycleMode ?? "tracking";
  const sleep = trackers.trackers.sleep;
  const study = trackers.trackers.study;
  const energy = trackers.trackers.energy;

  const cycleDay = cycle.cycleDay;
  const cycleLen = cycle.averageLength > 0 ? cycle.averageLength : 28;
  const tracks = (id: TrackerId) => trackers.active.includes(id);

  const all: (SignalReading | null)[] = [
    {
      id: "habits",
      label: "Habits",
      value: habits.dueToday === 0 ? "—" : `${habits.completedToday} / ${habits.dueToday}`,
      pct: habits.dueToday === 0 ? 0 : clamp01(habits.completedToday / habits.dueToday),
      empty: habits.dueToday === 0,
      to: "/",
    },
    {
      id: "mood",
      label: "Mood",
      value: mood ? `${Math.round(mood.mood)} / 10` : "—",
      pct: mood ? clamp01(mood.mood / 10) : 0,
      empty: !mood,
      to: "/mood",
    },
    tracks("sleep")
      ? {
          id: "sleep",
          label: "Sleep",
          value: sleep.today === null ? "—" : fmt("sleep", sleep.today),
          pct: sleep.progress,
          empty: sleep.today === null,
          to: "/trackers",
        }
      : null,
    tracks("study")
      ? {
          id: "study",
          label: "Study",
          value:
            study.today === null
              ? "—"
              : `${fmt("study", study.today)} / ${fmt("study", study.goal)}`,
          pct: study.progress,
          empty: study.today === null,
          to: "/trackers",
        }
      : null,
    cycleMode === "off"
      ? null
      : {
          id: "cycle",
          label: "Cycle",
          value: cycleMode === "paused" ? "Paused" : cycleDay === null ? "—" : `Day ${cycleDay}`,
          pct: cycleDay === null ? 0 : clamp01(cycleDay / cycleLen),
          empty: cycleDay === null,
          to: "/cycle",
        },
    /* energy also comes from the mood check-in, so it stays even when the tracker is off */
    {
      id: "energy",
      label: "Energy",
      value:
        tracks("energy") && energy.today !== null
          ? `${energy.today} / 5`
          : mood
            ? `${Math.round(mood.energy)} / 10`
            : "—",
      pct:
        tracks("energy") && energy.today !== null
          ? clamp01(energy.today / 5)
          : mood
            ? clamp01(mood.energy / 10)
            : 0,
      empty: (!tracks("energy") || energy.today === null) && !mood,
      to: tracks("energy") ? "/trackers" : "/mood",
    },
  ];
  return all.filter((r): r is SignalReading => r !== null);
}

/* --------------------------------- score --------------------------------- */

export function scoreOf(input: {
  trackers: TrackerAnalysis;
  habits: { completedToday: number; dueToday: number };
  mood: MoodEntry | null;
}): TodayScore {
  const { trackers, habits, mood } = input;
  const habitPct = habits.dueToday === 0 ? null : habits.completedToday / habits.dueToday;
  const trackerPct =
    trackers.goalsMetToday === 0 && !hasAnyTrackerToday(trackers) ? null : trackers.completion;
  const moodPct = mood ? mood.mood / 10 : null;

  const parts: [number | null, number][] = [
    [habitPct, 0.4],
    [trackerPct, 0.35],
    [moodPct, 0.25],
  ];
  const present = parts.filter((p): p is [number, number] => p[0] !== null);
  const weight = present.reduce((s, [, w]) => s + w, 0);
  const overall =
    weight === 0 ? 0 : Math.round((present.reduce((s, [v, w]) => s + v * w, 0) / weight) * 100);

  let note: string;
  if (present.length === 0)
    note = "Nothing logged yet today — one tick or one check-in starts the ring.";
  else if (habitPct === null && habits.dueToday === 0)
    note = "Add a habit and today's ring will have something to fill.";
  else if (moodPct === null) note = "Log today's mood to complete the picture.";
  else if (overall >= 80)
    note = "A strong day — habits, trackers and mood are all pulling together.";
  else if (overall >= 60) note = "Steady rhythm. One more small win pushes this higher.";
  else note = "Room to build momentum — a quick win lifts the ring fast.";

  const caption =
    present.length === 3
      ? "of today's goals"
      : present.length === 0
        ? "nothing logged yet"
        : `of ${present.length === 1 ? "what you've logged" : "what's logged so far"}`;

  return {
    overall,
    habitPct: Math.round((habitPct ?? 0) * 100),
    trackerPct: Math.round((trackerPct ?? 0) * 100),
    moodPct: Math.round((moodPct ?? 0) * 100),
    inputs: present.length,
    caption,
    note,
  };
}

function hasAnyTrackerToday(a: TrackerAnalysis): boolean {
  return (Object.keys(a.trackers) as TrackerId[]).some((id) => a.trackers[id].today !== null);
}

/* ----------------------------- connection map ---------------------------- */

const TRACKER_TO_SIGNAL: Partial<Record<TrackerId, SignalId>> = {
  sleep: "sleep",
  study: "study",
  energy: "energy",
};

const MOOD_KEY_TO_SIGNAL: Record<string, SignalId> = {
  sleep: "sleep",
  study: "study",
  energy: "energy",
};

export function connections(input: {
  trackers: TrackerAnalysis;
  habits: {
    habits: readonly Habit[];
    logs: readonly HabitLog[];
    completedToday: number;
    dueToday: number;
  };
  moodEntries: readonly MoodEntry[];
  moodDays: readonly DayAggregate[];
  moodCorrelations: readonly MoodCorrelation[];
  cycle: CycleAnalysis;
  cycleMode?: CycleMode | undefined;
  today: string;
}): { nodes: Connection[]; links: CrossLink[] } {
  const { trackers, habits, moodEntries, moodDays, moodCorrelations, cycle, today } = input;
  const cycleMode = input.cycleMode ?? "tracking";
  const monthAgo = shiftDate(today, -29);

  /* strength = evidence: how many of the last 30 days carry this signal,
     nudged up when today is logged. Strictly from the record. */
  const evidence = (daysLogged: number, loggedToday: boolean) =>
    clamp01(daysLogged / 30) * 0.85 + (loggedToday ? 0.15 : 0);

  const habitDays = new Set(habits.logs.filter((l) => l.date >= monthAgo).map((l) => l.date)).size;
  const moodMonth = moodDays.filter((d) => d.date >= monthAgo);
  const moodLoggedToday = moodEntries.some((e) => localDay(e.timestamp) === today);
  const cycleDays = cycle.logs.length;

  const sleep = trackers.trackers.sleep;
  const study = trackers.trackers.study;
  const energy = trackers.trackers.energy;

  const bestMoodCorr = (key: string) =>
    moodCorrelations.find((c) => c.key === key && c.evidence !== "insufficient") ?? null;

  const nodeList: (Connection | null)[] = [
    {
      id: "mood",
      strength: evidence(moodMonth.length, moodLoggedToday),
      days: moodMonth.length,
      note:
        moodMonth.length === 0
          ? "Log a mood check-in and this node comes alive."
          : (bestMoodCorr("sleep")?.statement ??
            `${moodMonth.length} mood ${moodMonth.length === 1 ? "day" : "days"} this month.`),
    },
    {
      id: "habits",
      strength: evidence(habitDays, habits.completedToday > 0),
      days: habitDays,
      note:
        habits.habits.length === 0
          ? "Add your first habit to start a routine."
          : habits.dueToday === 0
            ? "Nothing due today."
            : `${habits.completedToday} of ${habits.dueToday} done today · ${habitDays} active ${habitDays === 1 ? "day" : "days"} this month.`,
    },
    cycleMode === "off"
      ? null
      : {
          id: "cycle" as const,
          strength: evidence(Math.min(30, cycleDays * 5), cycle.cycleDay !== null),
          days: cycleDays,
          note:
            cycleMode === "paused"
              ? "Cycle predictions are paused — history kept, nothing due, nothing late."
              : cycle.upcomingStart
                ? `Your latest period entry is dated in the future — fix it on the Cycle page.`
                : cycle.cycleDay === null
                  ? "Log a period start and Bloom places you in your cycle."
                  : `Day ${cycle.cycleDay} · ${cycle.phaseLabel.toLowerCase()} phase${
                      describeNextPeriodShort(cycle) ? ` · ${describeNextPeriodShort(cycle)}` : ""
                    }.`,
        },
    {
      id: "energy",
      strength: evidence(energy.daysLogged, energy.today !== null),
      days: energy.daysLogged,
      note:
        energy.daysLogged === 0
          ? "Rate your energy 1–5 on Trackers."
          : trackers.advanced.headline || `${energy.daysLogged} energy readings.`,
    },
    {
      id: "study",
      strength: evidence(study.daysLogged, study.today !== null),
      days: study.daysLogged,
      note:
        study.daysLogged === 0
          ? "Log a study session to see focus patterns."
          : study.avg7 !== null
            ? `Averaging ${fmt("study", Math.round(study.avg7))} a day this week.`
            : `${study.daysLogged} study days logged.`,
    },
    {
      id: "sleep",
      strength: evidence(sleep.daysLogged, sleep.today !== null),
      days: sleep.daysLogged,
      note:
        sleep.daysLogged === 0
          ? "Log last night on Trackers."
          : sleep.avg7 !== null
            ? `Averaging ${fmt("sleep", Math.round(sleep.avg7))} this week${
                sleep.streak > 0 ? ` · ${sleep.streak}-night streak` : ""
              }.`
            : `${sleep.daysLogged} nights logged.`,
    },
  ];
  const nodes = nodeList.filter((n): n is Connection => n !== null);

  /* cross links: real correlations only */
  const links: CrossLink[] = [];
  for (const c of trackers.correlations) {
    const a = TRACKER_TO_SIGNAL[c.a];
    const b = TRACKER_TO_SIGNAL[c.b];
    if (!a || !b || a === b) continue;
    links.push({ from: a, to: b, weight: clamp01(Math.abs(c.r)), sentence: c.sentence });
  }
  for (const c of moodCorrelations) {
    if (c.evidence === "insufficient") continue;
    const other = MOOD_KEY_TO_SIGNAL[c.key];
    if (!other) continue;
    links.push({ from: "mood", to: other, weight: clamp01(Math.abs(c.r)), sentence: c.statement });
  }
  links.sort((x, y) => y.weight - x.weight);

  return { nodes, links: dedupeLinks(links).slice(0, 5) };
}

function dedupeLinks(links: CrossLink[]): CrossLink[] {
  const seen = new Set<string>();
  const out: CrossLink[] = [];
  for (const l of links) {
    const key = [l.from, l.to].sort().join(":");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(l);
  }
  return out;
}

/* ---------------------------------- flow --------------------------------- */

/** The anchor times on Today's flow. Editable — a night shift starts its day at 21:00. */
export interface FlowTimes {
  mood: string;
  study: string;
  movement: string;
  reflection: string;
}

export const DEFAULT_FLOW_TIMES: FlowTimes = {
  mood: "12:00",
  study: "14:00",
  movement: "18:00",
  reflection: "21:00",
};

const isClock = (v: unknown): v is string =>
  typeof v === "string" && /^([01]?\d|2[0-3]):[0-5]\d$/.test(v);

/** Anything on disk → a complete FlowTimes (bad or missing fields fall back). */
export function parseFlowTimes(raw: unknown): FlowTimes | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const out: FlowTimes = { ...DEFAULT_FLOW_TIMES };
  let any = false;
  for (const key of Object.keys(DEFAULT_FLOW_TIMES) as (keyof FlowTimes)[]) {
    if (isClock(row[key])) {
      out[key] = row[key].padStart(5, "0");
      any = true;
    }
  }
  return any ? out : null;
}

export function flowOf(input: {
  habits: readonly HabitToday[];
  mood: MoodEntry | null;
  trackers: TrackerAnalysis;
  now: Date;
  /** Anchor times; defaults when omitted. */
  times?: FlowTimes | undefined;
}): FlowItem[] {
  const { habits, mood, trackers, now } = input;
  const times = input.times ?? DEFAULT_FLOW_TIMES;
  const tracks = (id: TrackerId) => trackers.active.includes(id);
  const items: FlowItem[] = habits.map((h) => ({
    id: `habit-${h.id}`,
    time: h.reminderTime ?? "08:00",
    title: h.name,
    sub: h.goal?.target
      ? `${h.goal.target} ${h.goal.unit ?? ""}`.trim()
      : h.done
        ? "Done"
        : "Habit",
    done: h.done,
    kind: "habit",
    color: `var(--${habitColorVar(h.color)})`,
    habitId: h.id,
  }));

  items.push({
    id: "mood-checkin",
    time: mood ? localTime(mood.timestamp) : times.mood,
    title: "Mood check-in",
    sub: mood ? `Logged ${Math.round(mood.mood)}/10` : "How are you, really?",
    done: Boolean(mood),
    kind: "mood",
    color: "var(--home-mood)",
  });

  const study = trackers.trackers.study;
  if (tracks("study")) {
    items.push({
      id: "study-block",
      time: times.study,
      title: "Study block",
      sub:
        study.today !== null
          ? `${fmt("study", study.today)} of ${fmt("study", study.goal)}`
          : `Goal ${fmt("study", study.goal)}`,
      done: study.met === true,
      kind: "tracker",
      color: "var(--home-study)",
    });
  }

  const movement = trackers.trackers.movement;
  if (tracks("movement")) {
    items.push({
      id: "movement",
      time: times.movement,
      title: "Movement",
      sub:
        movement.today !== null
          ? `${fmt("movement", movement.today)} logged`
          : "Get outside or stretch",
      done: movement.met === true,
      kind: "tracker",
      color: "var(--home-energy)",
    });
  }

  items.push({
    id: "evening-reflection",
    time: times.reflection,
    title: "Evening reflection",
    sub: mood?.note ? "Reflection written" : "A line about the day",
    done: Boolean(mood?.note && mood.note.trim().length > 0),
    kind: "journal",
    color: "var(--home-sleep)",
  });

  void now;
  return items.sort((a, b) => toMinutes(a.time) - toMinutes(b.time));
}

export function flowState(item: FlowItem, now: Date): "done" | "now" | "later" | "missed" {
  if (item.done) return "done";
  const minutes = now.getHours() * 60 + now.getMinutes();
  const t = toMinutes(item.time);
  if (Math.abs(minutes - t) <= 30) return "now";
  return t < minutes ? "missed" : "later";
}

/* --------------------------------- focus --------------------------------- */

/** Three things that would move today the most, in order, all from the record. */
export function focusOf(input: {
  habits: readonly HabitToday[];
  mood: MoodEntry | null;
  trackers: TrackerAnalysis;
  cycle: CycleAnalysis;
  cycleMode?: CycleMode | undefined;
}): FocusItem[] {
  const { habits, mood, trackers, cycle } = input;
  const cycleMode = input.cycleMode ?? "tracking";
  const out: FocusItem[] = [];

  const openHabits = [...habits]
    .filter((h) => !h.done)
    .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));
  for (const h of openHabits.slice(0, 2)) {
    out.push({
      id: `habit-${h.id}`,
      title: h.name,
      sub: h.reminderTime ? `Around ${h.reminderTime}` : "Today",
      kind: "habit",
      done: false,
      habitId: h.id,
    });
  }

  if (!mood) {
    out.push({
      id: "mood",
      title: "Mood check-in",
      sub: "30 seconds, on the Mood page",
      kind: "mood",
      done: false,
      to: "/mood",
    });
  }

  const gaps = trackers.active
    .map((id) => trackers.trackers[id])
    .filter((t) => t.today === null || t.met === false)
    .sort((a, b) => a.progress - b.progress);
  for (const t of gaps) {
    if (out.length >= 3) break;
    const def = TRACKERS.find((d) => d.id === t.id)!;
    out.push({
      id: `tracker-${t.id}`,
      title:
        t.today === null
          ? `Log ${def.name.toLowerCase()}`
          : `${def.name}: ${def.format(t.today)} of ${def.format(t.goal)}`,
      sub:
        t.today === null
          ? def.blurb
          : def.direction === "more"
            ? "Not there yet"
            : "Over the ceiling",
      kind: "tracker",
      done: false,
      to: "/trackers",
    });
  }

  /* never nag someone who has said they aren't expecting periods */
  if (out.length < 3 && cycle.cycleDay === null && cycleMode === "tracking") {
    out.push({
      id: "cycle",
      title: "Set your cycle anchor",
      sub: "Log a period start on Cycle",
      kind: "cycle",
      done: false,
      to: "/cycle",
    });
  }

  if (out.length === 0) {
    const doneHabits = habits.filter((h) => h.done);
    for (const h of doneHabits.slice(0, 3)) {
      out.push({
        id: `habit-${h.id}`,
        title: h.name,
        sub: "Done",
        kind: "habit",
        done: true,
        habitId: h.id,
      });
    }
  }
  return out.slice(0, 3);
}

/* -------------------------------- insights ------------------------------- */

export function insightsOf(input: {
  trackers: TrackerAnalysis;
  moodInsights: readonly Insight[];
  moodCorrelations: readonly MoodCorrelation[];
  habits: { habits: readonly Habit[]; logs: readonly HabitLog[] };
  cycle: CycleAnalysis;
  today: string;
}): InsightItem[] {
  const { trackers, moodInsights, moodCorrelations, habits, cycle, today } = input;
  const out: InsightItem[] = [];

  for (const c of moodCorrelations) {
    if (c.evidence === "insufficient" || c.evidence === "low") continue;
    const signal = MOOD_KEY_TO_SIGNAL[c.key] ?? "mood";
    out.push({
      id: `mood-corr-${c.key}`,
      signal,
      title: c.statement,
      sub: `Across ${c.n} days · ${c.evidence} evidence`,
    });
    if (out.length >= 2) break;
  }

  for (const o of trackers.observations) {
    if (out.length >= 3) break;
    out.push({
      id: `tracker-obs-${out.length}`,
      signal: signalForSentence(o),
      title: o,
      sub: "From your tracker record",
    });
  }

  if (out.length < 3 && trackers.advanced.bright + trackers.advanced.low >= 4) {
    out.push({
      id: "tracker-advanced",
      signal: "energy",
      title: trackers.advanced.headline,
      sub:
        trackers.advanced.detail[0] ??
        `${trackers.advanced.bright + trackers.advanced.low} days with an energy reading`,
    });
  }

  /* habits: evening/morning consistency, computed from completion timestamps */
  if (out.length < 3 && habits.logs.length >= 5) {
    const recent = habits.logs.filter((l) => l.date >= shiftDate(today, -29));
    const evening = recent.filter((l) => new Date(l.completedAt).getHours() >= 18).length;
    if (recent.length >= 5) {
      const share = Math.round((evening / recent.length) * 100);
      out.push({
        id: "habits-timing",
        signal: "habits",
        title:
          share >= 50
            ? "You're more consistent in the evenings."
            : "You get most of your habits done before 6 PM.",
        sub: `${share}% of your completed habits this month happened after 6 PM.`,
      });
    }
  }

  for (const i of moodInsights) {
    if (out.length >= 3) break;
    out.push({
      id: `mood-insight-${i.id}`,
      signal: "mood",
      title: i.text,
      sub: "From your mood record",
    });
  }

  if (out.length < 3 && cycle.cycleDay !== null && cycle.confidence !== "none") {
    out.push({
      id: "cycle",
      signal: "cycle",
      title: `Day ${cycle.cycleDay} of your cycle · ${cycle.phaseLabel}.`,
      sub: cycle.confidenceReason,
    });
  }

  return out.slice(0, 3);
}

function signalForSentence(s: string): SignalId {
  const t = s.toLowerCase();
  if (t.includes("sleep") || t.includes("night")) return "sleep";
  if (t.includes("study")) return "study";
  if (t.includes("energy")) return "energy";
  return "energy";
}

/* -------------------------------- activity ------------------------------- */

export function activityOf(input: {
  habits: { habits: readonly Habit[]; logs: readonly HabitLog[] };
  moodEntries: readonly MoodEntry[];
  trackers: TrackerAnalysis;
  cycle: CycleAnalysis;
}): ActivityItem[] {
  const { habits, moodEntries, trackers, cycle } = input;
  const out: ActivityItem[] = [];
  const byId = new Map(habits.habits.map((h) => [h.id, h]));

  for (const l of habits.logs) {
    const h = byId.get(l.habitId);
    if (!h) continue;
    out.push({
      id: `log-${l.habitId}-${l.date}`,
      signal: "habits",
      title: `Completed ${h.name}`,
      sub: "",
      at: l.completedAt,
    });
  }
  for (const h of habits.habits) {
    if (h.createdAt)
      out.push({
        id: `habit-${h.id}`,
        signal: "habits",
        title: `Added a new habit · ${h.name}`,
        sub: "",
        at: h.createdAt,
      });
  }
  for (const e of moodEntries.slice(-20)) {
    out.push({
      id: `mood-${e.id}`,
      signal: "mood",
      title: `Logged mood · ${Math.round(e.mood)}/10`,
      sub: "",
      at: e.timestamp,
    });
  }
  for (const d of trackers.entries.slice(0, 10)) {
    const at = d.updatedAt ?? `${d.date}T20:00:00`;
    const parts: string[] = [];
    if (d.sleepMinutes !== null) parts.push(`sleep ${fmt("sleep", d.sleepMinutes)}`);
    if (d.sessions.length)
      parts.push(
        `study ${fmt(
          "study",
          d.sessions.reduce((s, x) => s + x.minutes, 0),
        )}`,
      );
    if (d.waterMl !== null) parts.push(`water ${fmt("water", d.waterMl)}`);
    if (d.energy !== null) parts.push(`energy ${d.energy}/5`);
    if (parts.length === 0) continue;
    out.push({
      id: `tracker-${d.date}`,
      signal: parts[0]!.startsWith("sleep")
        ? "sleep"
        : parts[0]!.startsWith("study")
          ? "study"
          : "energy",
      title: `Logged ${parts.join(" · ")}`,
      sub: "",
      at,
    });
  }
  for (const l of cycle.logs.slice(-3)) {
    out.push({
      id: `cycle-${l.id}`,
      signal: "cycle",
      title: "Logged a period start",
      sub: "",
      at: `${l.start}T09:00:00`,
    });
  }

  return out
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 5)
    .map((a) => ({ ...a, sub: relativeTime(a.at) }));
}

/* --------------------------------- utils --------------------------------- */

export function relativeTime(iso: string, now = new Date()): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diff = Math.max(0, now.getTime() - then);
  const m = Math.round(diff / 60_000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d} days ago`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(iso));
}

export function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function priorityRank(p: string): number {
  return p === "high" ? 0 : p === "medium" ? 1 : 2;
}

export function habitColorVar(color: string): string {
  switch (color) {
    case "sage":
    case "green":
      return "sage";
    case "rose":
    case "pink":
      return "rose";
    case "sky":
    case "blue":
      return "sky";
    case "violet":
    case "purple":
      return "violet";
    default:
      return "amber";
  }
}

export { SIGNAL_LABEL };
