/**
 * Bloom — daily trackers (pure core).
 *
 * Sleep, water, study, movement, energy and screen time, one row per calendar
 * day. Everything here is pure: no React, no storage, no clock. Feed it the
 * days plus today's date and it hands back the numbers, the streaks, the
 * correlations and the observations.
 *
 * Two rules carry over from the cycle work and hold here just as firmly:
 *
 *  1. Nothing is invented. Every figure on the page comes from a day someone
 *     actually logged; an empty day is an empty day, not a zero.
 *  2. Nothing on this page is advice. The observations describe what the
 *     record shows — they do not diagnose, and they do not prescribe.
 */

import { addDays, diffDays, isValidDateKey, stdDev } from "@/lib/cycle/predict";

/* --------------------------------- model --------------------------------- */

export type TrackerId = "sleep" | "water" | "study" | "movement" | "energy" | "screen";

export interface StudySession {
  subject: string;
  minutes: number;
  /** "HH:MM" — when the session started, if it was noted. */
  startAt: string | null;
}

export interface DayEntry {
  /** "YYYY-MM-DD" — the one field everything hangs off. */
  date: string;
  sleepMinutes: number | null;
  /** "HH:MM" bedtime, kept so the duration can be recomputed and checked. */
  bedTime: string | null;
  wakeTime: string | null;
  /** 1 (rough) – 5 (excellent). */
  sleepQuality: number | null;
  waterMl: number | null;
  sessions: StudySession[];
  movementMinutes: number | null;
  /** 1 (drained) – 5 (bright). */
  energy: number | null;
  screenMinutes: number | null;
  notes: string | null;
}

export interface Goals {
  sleepMinutes: number;
  waterMl: number;
  studyMinutes: number;
  movementMinutes: number;
  energy: number;
  screenMinutes: number;
}

export const DEFAULT_GOALS: Goals = {
  sleepMinutes: 480,
  waterMl: 2200,
  studyMinutes: 120,
  movementMinutes: 30,
  energy: 3,
  screenMinutes: 180,
};

export interface TrackerDef {
  id: TrackerId;
  name: string;
  /** Short line under the dial. */
  blurb: string;
  kind: "duration" | "volume" | "rating";
  /** "more" = towards a target; "less" = under a ceiling. */
  direction: "more" | "less";
  goalKey: keyof Goals;
  /** Quick-add amounts, in the tracker's own unit. */
  quickAdds: number[];
  min: number;
  max: number;
  /** CSS custom property used for this tracker's marks. */
  accent: string;
  /** How a value reads on the page. */
  format: (value: number) => string;
}

const hours = (m: number) => `${Math.floor(m / 60)}h${m % 60 === 0 ? "" : ` ${m % 60}m`}`;

export const TRACKERS: TrackerDef[] = [
  {
    id: "sleep",
    name: "Sleep",
    blurb: "Last night, against your target",
    kind: "duration",
    direction: "more",
    goalKey: "sleepMinutes",
    quickAdds: [30, 60],
    min: 0,
    max: 18 * 60,
    accent: "var(--ci-luteal)",
    format: (v) => hours(v),
  },
  {
    id: "water",
    name: "Water",
    blurb: "Glassed up today",
    kind: "volume",
    direction: "more",
    goalKey: "waterMl",
    quickAdds: [250, 500],
    min: 0,
    max: 8000,
    accent: "var(--ci-follicular)",
    format: (v) => (v >= 1000 ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}L` : `${v}ml`),
  },
  {
    id: "study",
    name: "Study",
    blurb: "Focused minutes logged",
    kind: "duration",
    direction: "more",
    goalKey: "studyMinutes",
    quickAdds: [25, 50],
    min: 0,
    max: 16 * 60,
    accent: "var(--ci-ovulation)",
    format: (v) => hours(v),
  },
  {
    id: "movement",
    name: "Movement",
    blurb: "Minutes on your feet",
    kind: "duration",
    direction: "more",
    goalKey: "movementMinutes",
    quickAdds: [10, 20],
    min: 0,
    max: 8 * 60,
    accent: "var(--ci-follicular)",
    format: (v) => (v < 60 ? `${v}m` : hours(v)),
  },
  {
    id: "energy",
    name: "Energy",
    blurb: "How today actually felt",
    kind: "rating",
    direction: "more",
    goalKey: "energy",
    quickAdds: [],
    min: 1,
    max: 5,
    accent: "var(--ci-ovulation)",
    format: (v) => `${v}/5`,
  },
  {
    id: "screen",
    name: "Screen",
    blurb: "Against the ceiling you set",
    kind: "duration",
    direction: "less",
    goalKey: "screenMinutes",
    quickAdds: [30, 60],
    min: 0,
    max: 20 * 60,
    accent: "var(--ci-menstrual)",
    format: (v) => hours(v),
  },
];

export const TRACKER_IDS: TrackerId[] = TRACKERS.map((t) => t.id);

export function trackerDef(id: TrackerId): TrackerDef {
  return TRACKERS.find((t) => t.id === id) ?? TRACKERS[0]!;
}

export const SUBJECTS = [
  "General",
  "Maths",
  "Science",
  "Language",
  "Reading",
  "Coding",
  "Revision",
] as const;

/* ------------------------------- day helpers ------------------------------ */

export function emptyDay(date: string): DayEntry {
  return {
    date,
    sleepMinutes: null,
    bedTime: null,
    wakeTime: null,
    sleepQuality: null,
    waterMl: null,
    sessions: [],
    movementMinutes: null,
    energy: null,
    screenMinutes: null,
    notes: null,
  };
}

export function studyMinutesOf(day: DayEntry): number | null {
  if (day.sessions.length === 0) return null;
  return day.sessions.reduce((sum, s) => sum + s.minutes, 0);
}

/** The value of one tracker on one day, in that tracker's own unit. */
export function valueOf(day: DayEntry, id: TrackerId): number | null {
  switch (id) {
    case "sleep":
      return day.sleepMinutes;
    case "water":
      return day.waterMl;
    case "study":
      return studyMinutesOf(day);
    case "movement":
      return day.movementMinutes;
    case "energy":
      return day.energy;
    case "screen":
      return day.screenMinutes;
    default:
      return null;
  }
}

export function isEmptyDay(day: DayEntry): boolean {
  return (
    day.sleepMinutes === null &&
    day.waterMl === null &&
    day.sessions.length === 0 &&
    day.movementMinutes === null &&
    day.energy === null &&
    day.screenMinutes === null &&
    !day.notes
  );
}

/**
 * Minutes between a bedtime and a wake time. A 23:30 → 07:00 night is 7h 30m,
 * not minus sixteen hours: any wake time at or before the bedtime is treated
 * as the next morning.
 */
export function minutesBetween(bed: string, wake: string): number | null {
  const parse = (value: string): number | null => {
    const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
    if (!match) return null;
    const h = Number(match[1]);
    const m = Number(match[2]);
    if (h > 23 || m > 59) return null;
    return h * 60 + m;
  };
  const from = parse(bed);
  const to = parse(wake);
  if (from === null || to === null) return null;
  const raw = to - from;
  return raw <= 0 ? raw + 1440 : raw;
}

/* ------------------------------- validation ------------------------------- */

export type DayFieldErrors = Partial<
  Record<
    | "date"
    | "sleepMinutes"
    | "bedTime"
    | "wakeTime"
    | "sleepQuality"
    | "waterMl"
    | "sessions"
    | "movementMinutes"
    | "energy"
    | "screenMinutes"
    | "notes",
    string
  >
>;

const isTime = (value: unknown): value is string =>
  typeof value === "string" && minutesBetween(value, value) !== null;

export function validateDay(draft: DayEntry, today: string): DayFieldErrors {
  const errors: DayFieldErrors = {};

  if (!isValidDateKey(draft.date)) {
    errors.date = "Pick a real date — the log hangs off it.";
  } else if (diffDays(today, draft.date) > 0) {
    errors.date = "That day hasn't happened yet. Log today or an earlier one.";
  }

  const range = (
    value: number | null,
    min: number,
    max: number,
    label: string,
    unit: string,
  ): string | undefined => {
    if (value === null || Number.isNaN(value)) return undefined;
    if (value < min || value > max) return `${label} should be between ${min} and ${max}${unit}.`;
    return undefined;
  };

  const sleep = range(draft.sleepMinutes, 0, 18 * 60, "Sleep", " minutes");
  if (sleep) errors.sleepMinutes = sleep;
  const water = range(draft.waterMl, 0, 8000, "Water", "ml");
  if (water) errors.waterMl = water;
  const movement = range(draft.movementMinutes, 0, 8 * 60, "Movement", " minutes");
  if (movement) errors.movementMinutes = movement;
  const screen = range(draft.screenMinutes, 0, 20 * 60, "Screen time", " minutes");
  if (screen) errors.screenMinutes = screen;
  const energy = range(draft.energy, 1, 5, "Energy", "");
  if (energy) errors.energy = energy;
  const quality = range(draft.sleepQuality, 1, 5, "Sleep quality", "");
  if (quality) errors.sleepQuality = quality;

  if (draft.bedTime !== null && !isTime(draft.bedTime)) {
    errors.bedTime = "Use a 24-hour time, like 23:30.";
  }
  if (draft.wakeTime !== null && !isTime(draft.wakeTime)) {
    errors.wakeTime = "Use a 24-hour time, like 07:00.";
  }

  if (draft.sessions.length > 12) {
    errors.sessions = "Up to 12 sessions a day keeps the chart readable.";
  } else {
    for (const s of draft.sessions) {
      if (!s.subject.trim()) {
        errors.sessions = "Every session needs a subject.";
        break;
      }
      if (!Number.isFinite(s.minutes) || s.minutes < 1 || s.minutes > 16 * 60) {
        errors.sessions = "A session is between 1 and 960 minutes.";
        break;
      }
      if (s.startAt !== null && !isTime(s.startAt)) {
        errors.sessions = "Session start times use 24-hour, like 14:00.";
        break;
      }
    }
  }

  if ((draft.notes ?? "").length > 400) {
    errors.notes = "Notes are capped at 400 characters.";
  }

  return errors;
}

/* -------------------------------- analysis -------------------------------- */

export interface SeriesPoint {
  date: string;
  value: number | null;
  met: boolean | null;
}

export interface TrackerStat {
  id: TrackerId;
  /** Today's value, in the tracker's own unit. Null when nothing logged. */
  today: number | null;
  goal: number;
  /** 0–1 towards the target. Values past the goal read as 1. */
  progress: number;
  /** True when the goal is met, false when it isn't, null when nothing logged. */
  met: boolean | null;
  avg7: number | null;
  avg30: number | null;
  /** Best day in the whole record — highest for "more", lowest for "less". */
  best: number | null;
  bestDate: string | null;
  /** Last seven logged days against the seven before them. */
  trend: { dir: "up" | "down" | "flat"; delta: number } | null;
  series: SeriesPoint[];
  /** Consecutive days meeting the goal, counting back from today. */
  streak: number;
  bestStreak: number;
  daysLogged: number;
  /** Spread of the logged values, in the tracker's own unit. */
  spread: number | null;
}

export interface Correlation {
  a: TrackerId;
  b: TrackerId;
  /** Days where both were logged — always shown next to the finding. */
  n: number;
  /** Pearson r, -1 to 1. */
  r: number;
  strength: "weak" | "moderate" | "strong";
  /** Plain language, observation only: no cause, no prescription. */
  sentence: string;
}

/**
 * The advanced read: what separates the days that felt bright from the days
 * that didn't, using only this person's own numbers.
 *
 * It reports differences, never causes, and it never says what to do about
 * them. Both halves carry the number of days behind them.
 */
export interface AdvancedInsight {
  /** Days with an energy reading, split into the two groups below. */
  bright: number;
  low: number;
  /** Biggest gaps between the two groups, strongest first. */
  contrasts: {
    id: TrackerId;
    bright: number;
    low: number;
    /** Percentage difference from the low days, signed. */
    delta: number;
  }[];
  /** The weekday that carries the most of one tracker, when it's earned. */
  bestDay: { weekday: string; id: TrackerId; value: number; days: number } | null;
  headline: string;
  detail: string[];
}

export interface TrackerAnalysis {
  today: string;
  /** Newest first. */
  entries: DayEntry[];
  /** Days with anything on them. */
  daysLogged: number;
  /** Consecutive days with any entry, anchored to today (or yesterday). */
  streak: number;
  bestStreak: number;
  /** Share of the six goals met today, 0–1. */
  completion: number;
  goalsMetToday: number;
  trackers: Record<TrackerId, TrackerStat>;
  /** Minutes per subject across the whole record, newest-agnostic. */
  subjects: { subject: string; minutes: number; sessions: number }[];
  /** Hours of the day study sessions start in, when enough are timed. */
  studyHours: { hour: number; minutes: number }[];
  correlations: Correlation[];
  /** Plain-language observations, strongest first, never advice. */
  observations: string[];
  /** The deeper read — what separates bright days from low ones. */
  advanced: AdvancedInsight;
}

const SERIES_DAYS = 14;

function dayMap(entries: readonly DayEntry[]): Map<string, DayEntry> {
  const map = new Map<string, DayEntry>();
  for (const e of entries) map.set(e.date, e);
  return map;
}

/** Mean of the non-null values, or null when there are none. */
function mean(xs: readonly (number | null)[]): number | null {
  const values = xs.filter((v): v is number => v !== null && Number.isFinite(v));
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function metGoal(value: number, goal: number, def: TrackerDef): boolean {
  return def.direction === "more" ? value >= goal : value <= goal;
}

function progressOf(value: number, goal: number, def: TrackerDef): number {
  if (goal <= 0) return 1;
  if (def.direction === "more") return Math.max(0, Math.min(1, value / goal));
  /* Under a ceiling: full ring when at or below it, emptying as you go over. */
  if (value <= goal) return 1;
  return Math.max(0, 1 - (value - goal) / goal);
}

/** Consecutive days meeting a goal, counting back from today or yesterday. */
function streakOf(
  byDate: Map<string, DayEntry>,
  id: TrackerId,
  goal: number,
  today: string,
): { streak: number; bestStreak: number } {
  const def = trackerDef(id);
  const qualifies = (date: string): boolean => {
    const day = byDate.get(date);
    if (!day) return false;
    const value = valueOf(day, id);
    return value !== null && metGoal(value, goal, def);
  };

  /* Current run: anchored to today, or to yesterday when today isn't logged
     yet — an unlogged morning shouldn't read as a broken streak. */
  let cursor = today;
  if (!qualifies(cursor)) cursor = addDays(today, -1);
  let streak = 0;
  if (qualifies(cursor)) {
    for (let i = 0; i < 400; i += 1) {
      if (!qualifies(cursor)) break;
      streak += 1;
      cursor = addDays(cursor, -1);
    }
  }

  /* Longest run anywhere in the record. */
  const dates = [...byDate.keys()].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const date of dates) {
    const continues = prev !== null && diffDays(prev, date) === 1;
    if (qualifies(date)) {
      run = continues ? run + 1 : 1;
      if (run > best) best = run;
    } else {
      run = 0;
    }
    prev = date;
  }

  return { streak, bestStreak: Math.max(best, streak) };
}

function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 5 || ys.length !== n) return null;
  const mx = mean(xs);
  const my = mean(ys);
  if (mx === null || my === null) return null;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i += 1) {
    const a = xs[i]! - mx;
    const b = ys[i]! - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  if (dx === 0 || dy === 0) return null;
  return num / Math.sqrt(dx * dy);
}

const PAIRS: [TrackerId, TrackerId, string][] = [
  ["sleep", "energy", "the more you sleep, the higher your energy reads"],
  ["sleep", "study", "longer nights sit alongside longer study days"],
  ["study", "energy", "heavier study days come with a different energy reading"],
  ["movement", "energy", "movement and energy move together"],
  ["screen", "sleep", "more screen time sits alongside shorter nights"],
  ["water", "energy", "water and energy track each other"],
];

function correlationsOf(entries: readonly DayEntry[], map: Map<string, DayEntry>) {
  const out: Correlation[] = [];
  for (const [a, b, phrase] of PAIRS) {
    const xs: number[] = [];
    const ys: number[] = [];
    for (const e of entries) {
      const va = valueOf(e, a);
      const vb = valueOf(e, b);
      if (va === null || vb === null) continue;
      xs.push(va);
      ys.push(vb);
    }
    const r = pearson(xs, ys);
    if (r === null) continue;
    const strength: Correlation["strength"] =
      Math.abs(r) >= 0.6 ? "strong" : Math.abs(r) >= 0.35 ? "moderate" : "weak";
    const dir = r > 0 ? "" : "in the opposite direction — ";
    out.push({
      a,
      b,
      n: xs.length,
      r: Math.round(r * 100) / 100,
      strength,
      sentence: `Across ${xs.length} days where you logged both, ${phrase} (${strength}, r = ${(Math.round(r * 100) / 100).toFixed(2)})${dir ? ` — ${dir}as one goes up, the other tends to come down.` : "."}`,
    });
  }
  /* Strongest relationship first. */
  return out.sort((x, y) => Math.abs(y.r) - Math.abs(x.r));
}

export function analyzeTrackers(
  entries: readonly DayEntry[],
  goals: Goals,
  today: string,
): TrackerAnalysis {
  const sorted = [...entries].filter((e) => isValidDateKey(e.date)).sort((a, b) => a.date.localeCompare(b.date));
  const map = dayMap(sorted);
  const desc = [...sorted].reverse();

  const trackers = {} as Record<TrackerId, TrackerStat>;
  for (const def of TRACKERS) {
    const goal = goals[def.goalKey];

    const series: SeriesPoint[] = [];
    for (let i = SERIES_DAYS - 1; i >= 0; i -= 1) {
      const date = addDays(today, -i);
      const day = map.get(date);
      const value = day ? valueOf(day, def.id) : null;
      series.push({
        date,
        value,
        met: value === null ? null : metGoal(value, goal, def),
      });
    }

    const values = series.map((p) => p.value);
    const last7 = values.slice(-7);
    const prev7 = values.slice(0, 7);

    const recent = mean(last7);
    const prior = mean(prev7);
    const trend =
      recent === null || prior === null
        ? null
        : Math.abs(recent - prior) < (def.kind === "rating" ? 0.25 : goal * 0.05)
          ? { dir: "flat" as const, delta: Math.round((recent - prior) * 10) / 10 }
          : {
              dir: recent > prior ? ("up" as const) : ("down" as const),
              delta: Math.round((recent - prior) * 10) / 10,
            };

    const logged = sorted
      .map((d) => ({ date: d.date, value: valueOf(d, def.id) }))
      .filter((d): d is { date: string; value: number } => d.value !== null);
    const best =
      logged.length === 0
        ? null
        : logged.reduce(
            (acc, cur) =>
              def.direction === "more"
                ? cur.value > acc.value
                  ? cur
                  : acc
                : cur.value < acc.value
                  ? cur
                  : acc,
            logged[0]!,
          );

    const { streak, bestStreak } = streakOf(map, def.id, goal, today);
    const todayValue = valueOf(map.get(today) ?? emptyDay(today), def.id);

    trackers[def.id] = {
      id: def.id,
      today: todayValue,
      goal,
      progress: todayValue === null ? 0 : progressOf(todayValue, goal, def),
      met: todayValue === null ? null : metGoal(todayValue, goal, def),
      avg7: recent === null ? null : Math.round(recent * 10) / 10,
      avg30: mean(values),
      best: best?.value ?? null,
      bestDate: best?.date ?? null,
      trend,
      series,
      streak,
      bestStreak,
      daysLogged: logged.length,
      spread:
        logged.length >= 3
          ? Math.round(stdDev(logged.map((l) => l.value)) * 10) / 10
          : null,
    };
  }

  /* ------------------------------ subjects ------------------------------- */
  const subjectTotals = new Map<string, { minutes: number; sessions: number }>();
  for (const day of sorted) {
    for (const s of day.sessions) {
      const key = s.subject.trim() || "General";
      const cur = subjectTotals.get(key) ?? { minutes: 0, sessions: 0 };
      subjectTotals.set(key, {
        minutes: cur.minutes + s.minutes,
        sessions: cur.sessions + 1,
      });
    }
  }
  const subjects = [...subjectTotals.entries()]
    .map(([subject, v]) => ({ subject, ...v }))
    .sort((a, b) => b.minutes - a.minutes);

  /* ---------------------------- study hours ------------------------------ */
  const hourTotals = new Map<number, number>();
  let timedSessions = 0;
  for (const day of sorted) {
    for (const s of day.sessions) {
      if (!s.startAt) continue;
      const hour = Number(/^(\d{1,2}):/.exec(s.startAt)?.[1] ?? NaN);
      if (!Number.isFinite(hour)) continue;
      timedSessions += 1;
      hourTotals.set(hour, (hourTotals.get(hour) ?? 0) + s.minutes);
    }
  }
  const studyHours =
    timedSessions >= 5
      ? [...hourTotals.entries()]
          .map(([hour, minutes]) => ({ hour, minutes }))
          .sort((a, b) => b.minutes - a.minutes)
          .slice(0, 4)
      : [];

  /* ------------------------------- streaks ------------------------------- */
  const hasEntry = (date: string) => {
    const day = map.get(date);
    return Boolean(day && !isEmptyDay(day));
  };
  let cursor = today;
  if (!hasEntry(cursor)) cursor = addDays(today, -1);
  let streak = 0;
  for (let i = 0; i < 400; i += 1) {
    if (!hasEntry(cursor)) break;
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  let bestStreak = 0;
  let run = 0;
  let prev: string | null = null;
  for (const day of sorted) {
    const continues = prev !== null && diffDays(prev, day.date) === 1;
    if (!isEmptyDay(day)) {
      run = continues ? run + 1 : 1;
      if (run > bestStreak) bestStreak = run;
    } else {
      run = 0;
    }
    prev = day.date;
  }
  bestStreak = Math.max(bestStreak, streak);

  const goalsMetToday = TRACKERS.filter((t) => trackers[t.id].met === true).length;
  const completion = goalsMetToday / TRACKERS.length;

  return {
    today,
    entries: desc,
    daysLogged: sorted.filter((d) => !isEmptyDay(d)).length,
    streak,
    bestStreak,
    completion,
    goalsMetToday,
    trackers,
    subjects,
    studyHours,
    correlations: correlationsOf(sorted, map),
    observations: observationsOf(trackers, sorted, subjects, studyHours, today, desc),
    advanced: advancedInsightOf(sorted),
  };
}

/* --------------------------- advanced insight ----------------------------- */

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Splits the record by energy — the brightest days against the lowest — and
 * reports where the two groups actually differ. Three days on each side
 * minimum, because two days is a coincidence, not a pattern.
 *
 * Observational throughout: "your bright days had more sleep" is a fact about
 * the record. "You should sleep more" is not, and never appears here.
 */
export function advancedInsightOf(entries: readonly DayEntry[]): AdvancedInsight {
  const withEnergy = entries.filter((d) => d.energy !== null);
  const bright = withEnergy.filter((d) => (d.energy ?? 0) >= 4);
  const low = withEnergy.filter((d) => (d.energy ?? 0) <= 2);

  /* Day-of-week shape, only once there's enough to see one. It doesn't
     depend on energy, so it's computed before the two-group test. */
  let bestDay: AdvancedInsight["bestDay"] = null;
  const byWeekday = new Map<number, { minutes: number; days: number }>();
  for (const d of entries) {
    const minutes = studyMinutesOf(d);
    if (minutes === null) continue;
    const weekday = new Date(`${d.date}T00:00:00`).getDay();
    const cur = byWeekday.get(weekday) ?? { minutes: 0, days: 0 };
    byWeekday.set(weekday, { minutes: cur.minutes + minutes, days: cur.days + 1 });
  }
  const ranked = [...byWeekday.entries()]
    .filter(([, v]) => v.days >= 2)
    .map(([weekday, v]) => ({
      weekday: WEEKDAYS[weekday] ?? "",
      id: "study" as TrackerId,
      value: Math.round(v.minutes / v.days),
      days: v.days,
    }))
    .sort((a, b) => b.value - a.value);
  if (ranked.length >= 3 && ranked[0] && ranked[0].value > 0) bestDay = ranked[0];

  if (bright.length < 3 || low.length < 3) {
    const detail = [
      `So far: ${bright.length} day${bright.length === 1 ? "" : "s"} at 4–5 energy, ${low.length} at 1–2.`,
    ];
    if (bestDay) {
      detail.push(
        `${bestDay.weekday}s carry the most study — ${trackerDef("study").format(bestDay.value)} a day across ${bestDay.days} of them.`,
      );
    }
    return {
      bright: bright.length,
      low: low.length,
      contrasts: [],
      bestDay,
      headline: "Not yet — three bright days and three low days, and this writes itself.",
      detail,
    };
  }

  const ids: TrackerId[] = ["sleep", "water", "study", "movement", "screen"];
  const contrasts: AdvancedInsight["contrasts"] = [];
  for (const id of ids) {
    const brightValues = bright.map((d) => valueOf(d, id)).filter((v): v is number => v !== null);
    const lowValues = low.map((d) => valueOf(d, id)).filter((v): v is number => v !== null);
    if (brightValues.length < 2 || lowValues.length < 2) continue;
    const b = mean(brightValues);
    const l = mean(lowValues);
    if (b === null || l === null || l === 0) continue;
    contrasts.push({
      id,
      bright: Math.round(b * 10) / 10,
      low: Math.round(l * 10) / 10,
      delta: Math.round(((b - l) / l) * 100),
    });
  }
  contrasts.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  const top = contrasts[0];
  const def = top ? trackerDef(top.id) : null;
  const headline =
    top && def
      ? Math.abs(top.delta) < 8
        ? "Your bright and low days look alike on paper."
        : `On your brighter days, ${def.name.toLowerCase()} sits ${Math.abs(top.delta)}% ${
            top.delta > 0 ? "higher" : "lower"
          }.`
      : "Not enough paired days yet to compare.";

  const detail: string[] = [];
  for (const c of contrasts.slice(0, 3)) {
    const d = trackerDef(c.id);
    detail.push(
      `${d.name}: ${d.format(Math.round(c.bright))} on the ${bright.length} bright day${
        bright.length === 1 ? "" : "s"
      } against ${d.format(Math.round(c.low))} on the ${low.length} low one${
        low.length === 1 ? "" : "s"
      }.`,
    );
  }
  if (bestDay) {
    detail.push(
      `${bestDay.weekday}s carry the most study — ${trackerDef("study").format(bestDay.value)} a day across ${bestDay.days} of them.`,
    );
  }
  detail.push(
    `This is a description of ${bright.length + low.length} days you logged, not a cause and not a plan.`,
  );

  return { bright: bright.length, low: low.length, contrasts, bestDay, headline, detail };
}

/* ------------------------------ observations ------------------------------ */

const pct = (value: number) => `${Math.round(value * 100)}%`;

function observationsOf(
  trackers: Record<TrackerId, TrackerStat>,
  entries: readonly DayEntry[],
  subjects: { subject: string; minutes: number }[],
  studyHours: { hour: number; minutes: number }[],
  today: string,
  desc: readonly DayEntry[],
): string[] {
  const out: string[] = [];
  if (entries.length === 0) return out;

  /* Sleep against its own target, in plain terms. */
  const sleep = trackers.sleep;
  if (sleep.avg7 !== null) {
    const gap = sleep.goal - sleep.avg7;
    if (Math.abs(gap) >= 20) {
      out.push(
        gap > 0
          ? `Sleep has averaged ${trackerDef("sleep").format(Math.round(sleep.avg7))} over the last seven nights — ${trackerDef("sleep").format(Math.round(gap))} under your ${trackerDef("sleep").format(sleep.goal)} target.`
          : `Sleep has averaged ${trackerDef("sleep").format(Math.round(sleep.avg7))} over the last seven nights, which is at or above your target.`,
      );
    }
  }
  if (sleep.trend && sleep.trend.dir !== "flat" && Math.abs(sleep.trend.delta) >= 20) {
    out.push(
      `Nights have been getting ${sleep.trend.dir === "up" ? "longer" : "shorter"} — about ${Math.abs(Math.round(sleep.trend.delta))} minutes on average against the week before.`,
    );
  }

  /* Consistency: the spread of the last fortnight, only when it means something. */
  if (sleep.spread !== null && sleep.daysLogged >= 5) {
    out.push(
      sleep.spread <= 45
        ? `Your nights sit close together — about ${Math.round(sleep.spread)} minutes either side of your average.`
        : `Your nights move around: about ${Math.round(sleep.spread)} minutes either side of your average.`,
    );
  }

  /* Streaks worth naming. */
  for (const id of ["water", "study", "movement"] as const) {
    const stat = trackers[id];
    if (stat.streak >= 3) {
      out.push(
        `${trackerDef(id).name} goal met ${stat.streak} days running${
          stat.bestStreak > stat.streak ? ` — your longest run is ${stat.bestStreak}.` : "."
        }`,
      );
    }
  }

  /* Water. */
  const water = trackers.water;
  const waterDays = water.series.filter((p) => p.value !== null).length;
  if (waterDays >= 4) {
    const metDays = water.series.filter((p) => p.met === true).length;
    out.push(
      `You've reached your water target on ${metDays} of the last ${waterDays} days you logged it.`,
    );
  }

  /* Study: where the time goes. */
  if (subjects.length >= 2 && subjects[0]) {
    const total = subjects.reduce((sum, s) => sum + s.minutes, 0);
    out.push(
      `Most of your study time has gone to ${subjects[0].subject} — ${pct(subjects[0].minutes / total)} of everything logged.`,
    );
  }
  if (studyHours.length > 0 && studyHours[0]) {
    const top = studyHours[0];
    const label = `${String(top.hour).padStart(2, "0")}:00`;
    out.push(
      `Sessions starting near ${label} have logged the most minutes — ${trackerDef("study").format(top.minutes)} of them.`,
    );
  }

  /* Screen, framed without a scold. */
  const screen = trackers.screen;
  if (screen.avg7 !== null) {
    out.push(
      screen.avg7 <= screen.goal
        ? `Screen time has averaged ${trackerDef("screen").format(Math.round(screen.avg7))} a day, inside the ${trackerDef("screen").format(screen.goal)} ceiling you set.`
        : `Screen time has averaged ${trackerDef("screen").format(Math.round(screen.avg7))} a day, above the ${trackerDef("screen").format(screen.goal)} ceiling you set.`,
    );
  }

  /* Energy against sleep, from the person's own days. */
  const energy = trackers.energy;
  if (energy.avg7 !== null && sleep.avg7 !== null && energy.daysLogged >= 5) {
    const best = desc.find((d) => d.energy !== null && d.sleepMinutes !== null && d.sleepMinutes >= sleep.goal);
    const worst = desc.find((d) => d.energy !== null && d.sleepMinutes !== null && d.sleepMinutes < sleep.goal - 60);
    if (best && worst && best.energy !== null && worst.energy !== null && best.energy > worst.energy) {
      out.push(
        `On the nights you hit ${trackerDef("sleep").format(Math.round(sleep.goal))}, your energy read higher than on your short nights.`,
      );
    }
  }

  /* Unlogged gaps — an honest note, not a nudge. */
  const loggedDates = new Set(entries.filter((d) => !isEmptyDay(d)).map((d) => d.date));
  const window = 14;
  let inWindow = 0;
  for (let i = 0; i < window; i += 1) {
    if (loggedDates.has(addDays(today, -i))) inWindow += 1;
  }
  if (inWindow > 0 && inWindow < window) {
    out.push(
      `You've logged ${inWindow} of the last ${window} days. The gaps are left empty on purpose — nothing here is filled in for you.`,
    );
  }

  return out.slice(0, 6);
}
