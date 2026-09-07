/**
 * Mood context signals — the optional sleep / exercise / screen-time / … fields
 * on a MoodEntry.
 *
 * Two jobs live here:
 *   1. the round trip to the `mood_entries.context` jsonb column (so a value
 *      typed in the composer survives a reload — before this, it didn't), and
 *   2. "don't ask twice": the tracker day with the same local date already
 *      knows how long the person slept, moved, studied and looked at a screen,
 *      so those fields are filled from it and only the gaps are left to type.
 *
 * Pure functions, no DOM — everything here is unit-tested.
 */
import type { DayEntry } from "@/lib/trackers/core";
import type { MoodEntry, Weather } from "./types";

export type ContextKey =
  | "sleep"
  | "sleepQuality"
  | "exercise"
  | "steps"
  | "productivity"
  | "study"
  | "screenTime"
  | "social"
  | "workload";

export const CONTEXT_KEYS: readonly ContextKey[] = [
  "sleep",
  "sleepQuality",
  "exercise",
  "steps",
  "productivity",
  "study",
  "screenTime",
  "social",
  "workload",
];

/** The optional part of a MoodEntry, on its own. */
export type MoodContext = Partial<Pick<MoodEntry, ContextKey | "weather">>;

/** Same bounds the composer's fields enforce; anything outside is noise. */
const RANGE: Record<ContextKey, readonly [number, number]> = {
  sleep: [0, 24],
  sleepQuality: [1, 10],
  exercise: [0, 600],
  steps: [0, 60000],
  productivity: [1, 10],
  study: [0, 900],
  screenTime: [0, 24],
  social: [1, 10],
  workload: [1, 10],
};

const WEATHERS: readonly Weather[] = ["clear", "cloudy", "rain", "storm", "snow", "fog"];

const inRange = (key: ContextKey, v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= RANGE[key][0] && v <= RANGE[key][1];

const isWeather = (v: unknown): v is Weather =>
  typeof v === "string" && (WEATHERS as readonly string[]).includes(v);

/** Only the signals that are actually present and sane. */
export function contextOf(source: MoodContext): MoodContext {
  const out: MoodContext = {};
  for (const key of CONTEXT_KEYS) {
    const v = source[key];
    if (inRange(key, v)) out[key] = v;
  }
  if (isWeather(source.weather)) out.weather = source.weather;
  return out;
}

export function hasContext(source: MoodContext): boolean {
  return Object.keys(contextOf(source)).length > 0;
}

/** What goes into the jsonb column — `null` when there's nothing to say. */
export function contextToJson(source: MoodContext): Record<string, number | string> | null {
  const ctx = contextOf(source);
  const entries = Object.entries(ctx).filter(([, v]) => v !== undefined) as [
    string,
    number | string,
  ][];
  return entries.length ? Object.fromEntries(entries) : null;
}

/** Whatever the column holds — a bad or foreign shape simply yields nothing. */
export function contextFromJson(raw: unknown): MoodContext {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return contextOf(raw as MoodContext);
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * The tracker day for the same local date, translated into mood context:
 * sleep minutes → hours, tracker quality 1–5 → 1–10, study sessions summed,
 * screen minutes → hours. Fields the day doesn't have stay absent.
 */
export function contextFromTrackerDay(day: DayEntry | null | undefined): MoodContext {
  if (!day) return {};
  const out: MoodContext = {};
  if (typeof day.sleepMinutes === "number") out.sleep = round1(day.sleepMinutes / 60);
  if (typeof day.sleepQuality === "number") out.sleepQuality = day.sleepQuality * 2;
  if (typeof day.movementMinutes === "number") out.exercise = day.movementMinutes;
  if (day.sessions.length > 0) out.study = day.sessions.reduce((sum, s) => sum + s.minutes, 0);
  if (typeof day.screenMinutes === "number") out.screenTime = round1(day.screenMinutes / 60);
  return contextOf(out);
}

/**
 * Fill only the gaps: a value the person typed always wins over what the
 * trackers know. Returns the same object when there is nothing to add.
 */
export function fillContext<T extends MoodContext>(entry: T, fill: MoodContext): T {
  const add: MoodContext = {};
  for (const key of CONTEXT_KEYS) {
    if (entry[key] === undefined && fill[key] !== undefined) add[key] = fill[key];
  }
  if (entry.weather === undefined && fill.weather !== undefined) add.weather = fill.weather;
  return Object.keys(add).length ? { ...entry, ...add } : entry;
}

/* ------------------------- composer field strings ------------------------- */

export type ContextFields = Record<ContextKey, string>;

export const EMPTY_FIELDS: ContextFields = {
  sleep: "",
  sleepQuality: "",
  exercise: "",
  steps: "",
  productivity: "",
  study: "",
  screenTime: "",
  social: "",
  workload: "",
};

/** Context values as the strings the composer's inputs hold. */
export function contextStrings(ctx: MoodContext): Partial<ContextFields> {
  const out: Partial<ContextFields> = {};
  for (const key of CONTEXT_KEYS) {
    const v = ctx[key];
    if (typeof v === "number") out[key] = String(v);
  }
  return out;
}

/**
 * Move the composer from one prefill to another (the person changed the
 * "When" date): a field still showing the old prefill — or empty — follows
 * the new day; anything they typed themselves is left exactly as it is.
 */
export function applyPrefill(
  fields: ContextFields,
  previous: MoodContext,
  next: MoodContext,
): ContextFields {
  const prev = contextStrings(previous);
  const fresh = contextStrings(next);
  const out: ContextFields = { ...fields };
  for (const key of CONTEXT_KEYS) {
    const untouched = fields[key] === "" || fields[key] === prev[key];
    if (untouched) out[key] = fresh[key] ?? "";
  }
  return out;
}

/** Which fields the prefill actually filled — for the "from your trackers" line. */
export function prefilledKeys(ctx: MoodContext): ContextKey[] {
  return CONTEXT_KEYS.filter((k) => ctx[k] !== undefined);
}

export const CONTEXT_LABEL: Record<ContextKey, string> = {
  sleep: "sleep",
  sleepQuality: "sleep quality",
  exercise: "exercise",
  steps: "steps",
  productivity: "productivity",
  study: "study",
  screenTime: "screen time",
  social: "social",
  workload: "workload",
};
