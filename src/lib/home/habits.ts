/**
 * Habits for the Today page.
 *
 * Reads and writes the same Supabase tables the legacy Today page used
 * (`habits`, `habit_logs`, `profiles.total_points`), so nothing a person
 * already logged is lost, and mirrors the active set into localStorage under
 * the keys the Coach reads (`bloom.habits`, `bloom.habit_logs`) so the coach
 * can reason about routines without its own network round-trip.
 *
 * Pure data access — no React here. `useHabits` in hooks/ owns the state.
 */

import { supabase, hasSupabaseConfig } from "@/lib/supabase";

export interface Habit {
  id: string;
  name: string;
  icon: string;
  iconUrl: string | null;
  color: string;
  frequency: string;
  points: number;
  reminderTime: string | null;
  priority: string;
  tags: string[];
  goal: { target: number | null; unit: string | null } | null;
  days: number[];
  timesPerWeek: number | null;
  startDate: string | null;
  note: string | null;
  createdAt: string | null;
}

export interface HabitLog {
  habitId: string;
  date: string;
  completedAt: string;
}

export interface HabitDraft {
  name: string;
  note?: string | undefined;
  icon?: { type: string; value: string } | undefined;
  color?: string | undefined;
  frequency?: string | undefined;
  priority?: string | undefined;
  points?: number | undefined;
  reminder?: { enabled: boolean; time: string } | undefined;
  tags?: string[] | undefined;
  startDate?: string | undefined;
}

type Row = Record<string, unknown>;

const HABITS_KEY = "bloom.habits";
const LOGS_KEY = "bloom.habit_logs";
export const HABITS_CHANGED = "bloom:habits-changed";

const str = (v: unknown, fallback = ""): string =>
  typeof v === "string" ? v : v == null ? fallback : String(v);
const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};

/* ------------------------------ localStorage ------------------------------ */

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode — the in-memory copy still works */
  }
}

export function loadLocalHabits(): Habit[] {
  return readJson<Row[]>(HABITS_KEY, [])
    .map(rowToHabit)
    .filter((h): h is Habit => h !== null);
}

export function loadLocalLogs(): HabitLog[] {
  return readJson<Row[]>(LOGS_KEY, [])
    .filter((l) => l && typeof l["habitId"] === "string" && typeof l["date"] === "string")
    .map((l) => ({
      habitId: String(l["habitId"]),
      date: String(l["date"]),
      completedAt: str(l["completedAt"], `${String(l["date"])}T12:00:00.000Z`),
    }));
}

/** Mirror for the Coach + offline fallback. Shape matches readHabitData(). */
export function saveLocal(habits: readonly Habit[], logs: readonly HabitLog[]): void {
  writeJson(
    HABITS_KEY,
    habits.map((h) => ({
      id: h.id,
      name: h.name,
      icon: h.icon,
      iconUrl: h.iconUrl,
      color: h.color,
      frequency: h.frequency,
      points: h.points,
      reminderTime: h.reminderTime,
      priority: h.priority,
      tags: h.tags,
      goal: h.goal,
      days: h.days,
      timesPerWeek: h.timesPerWeek,
      startDate: h.startDate,
      note: h.note,
      createdAt: h.createdAt,
      archived: false,
    })),
  );
  writeJson(LOGS_KEY, logs);
  if (typeof window !== "undefined") window.dispatchEvent(new Event(HABITS_CHANGED));
}

/* --------------------------------- rows ---------------------------------- */

/** Tolerant of both the legacy column pairs (archived/is_archived, points/point_value…). */
export function rowToHabit(r: Row | null | undefined): Habit | null {
  if (!r || typeof r !== "object") return null;
  if (r["is_archived"] === true || r["archived"] === true) return null;
  const id = str(r["id"]);
  const name = str(r["name"]).trim();
  if (!id || !name) return null;
  const iconType = str(r["icon_type"], "emoji");
  const iconUrl = str(r["icon_url"] ?? r["iconUrl"], "") || null;
  const rawGoal = r["goal"];
  const goalObj =
    rawGoal && typeof rawGoal === "object"
      ? {
          target: num((rawGoal as Row)["target"]),
          unit: str((rawGoal as Row)["unit"], "") || null,
        }
      : r["goal_enabled"] === true
        ? { target: num(r["goal_target"]), unit: str(r["goal_unit"], "") || null }
        : null;
  const reminderRaw = r["reminder_time"] ?? r["reminderTime"];
  const reminderEnabled = r["reminder_enabled"] !== false && reminderRaw != null;
  return {
    id,
    name,
    icon: iconType === "image" ? "🖼️" : str(r["icon_value"] ?? r["icon"], "") || "⭐",
    iconUrl: iconType === "image" ? iconUrl : null,
    color: str(r["color"], "amber"),
    frequency: str(r["frequency"], "daily"),
    points: num(r["point_value"]) ?? num(r["points"]) ?? 10,
    reminderTime: reminderEnabled ? str(reminderRaw).slice(0, 5) || null : null,
    priority: str(r["priority"], "medium"),
    tags: Array.isArray(r["tags"]) ? (r["tags"] as unknown[]).map((t) => str(t)) : [],
    goal: goalObj,
    days: Array.isArray(r["days"]) ? (r["days"] as unknown[]).map((d) => num(d) ?? 0) : [],
    timesPerWeek: num(r["times_per_week"] ?? r["timesPerWeek"]),
    startDate: str(r["start_date"] ?? r["startDate"], "") || null,
    note: str(r["note"], "") || null,
    createdAt: str(r["created_at"] ?? r["createdAt"], "") || null,
  };
}

/* -------------------------------- cloud ---------------------------------- */

export function hasHabitCloud(): boolean {
  return hasSupabaseConfig;
}

export async function fetchHabits(profileId: string): Promise<Habit[]> {
  const { data, error } = await supabase
    .from("habits")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as Row[]).map(rowToHabit).filter((h): h is Habit => h !== null);
}

/** Every completion in the last `days` days — enough for streaks and the coach. */
export async function fetchLogs(profileId: string, since: string): Promise<HabitLog[]> {
  const { data, error } = await supabase
    .from("habit_logs")
    .select("habit_id, date, completed_at")
    .eq("profile_id", profileId)
    .gte("date", since);
  if (error) throw error;
  return ((data ?? []) as Row[])
    .filter((l) => l["habit_id"] != null && typeof l["date"] === "string")
    .map((l) => ({
      habitId: String(l["habit_id"]),
      date: String(l["date"]),
      completedAt: str(l["completed_at"], `${String(l["date"])}T12:00:00.000Z`),
    }));
}

export async function insertLog(profileId: string, habitId: string, date: string): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase.from("habit_logs").insert({
    profile_id: profileId,
    habit_id: habitId,
    date,
    value: 1,
    completed_at: now,
    created_at: now,
  });
  if (error) throw error;
}

export async function deleteLog(profileId: string, habitId: string, date: string): Promise<void> {
  const { error } = await supabase
    .from("habit_logs")
    .delete()
    .eq("profile_id", profileId)
    .eq("habit_id", habitId)
    .eq("date", date);
  if (error) throw error;
}

/** Points live on profiles.total_points; the RPCs exist on older projects, so try them first. */
export async function adjustPoints(profileId: string, delta: number): Promise<number | null> {
  if (delta === 0) return null;
  const rpc = delta > 0 ? "increment_points" : "decrement_points";
  const { error: rpcError } = await supabase.rpc(rpc, {
    user_id: profileId,
    pts: Math.abs(delta),
  });
  if (!rpcError) return readPoints(profileId);
  const current = (await readPoints(profileId)) ?? 0;
  const next = Math.max(0, current + delta);
  const { error } = await supabase
    .from("profiles")
    .update({ total_points: next, updated_at: new Date().toISOString() })
    .eq("id", profileId);
  if (error) throw error;
  return next;
}

export async function readPoints(profileId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("total_points")
    .eq("id", profileId)
    .maybeSingle();
  if (error || !data) return null;
  return num((data as Row)["total_points"]);
}

export async function insertHabit(profileId: string, draft: HabitDraft): Promise<Habit> {
  const iconType = draft.icon?.type === "image" ? "image" : "emoji";
  const iconValue = draft.icon?.value ?? "⭐";
  const payload = {
    profile_id: profileId,
    name: draft.name.trim(),
    note: draft.note?.trim() || null,
    icon_type: iconType,
    icon_value: iconValue,
    icon_url: iconType === "image" ? iconValue : null,
    color: draft.color ?? "amber",
    frequency: draft.frequency ?? "daily",
    point_value: draft.points ?? 10,
    priority: draft.priority ?? "medium",
    reminder_enabled: Boolean(draft.reminder?.enabled),
    reminder_time: draft.reminder?.enabled ? draft.reminder.time : null,
    tags: draft.tags && draft.tags.length ? draft.tags : null,
    start_date: draft.startDate ?? new Date().toISOString().slice(0, 10),
  };
  const { data, error } = await supabase.from("habits").insert(payload).select("*").single();
  if (error) throw error;
  const habit = rowToHabit(data as Row);
  if (!habit) throw new Error("The habit was saved but came back in an unexpected shape.");
  return habit;
}

/** Local-only habit, for people who aren't signed in yet. */
export function draftToLocalHabit(draft: HabitDraft): Habit {
  const now = new Date().toISOString();
  return {
    id: `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: draft.name.trim(),
    icon: draft.icon?.type === "image" ? "🖼️" : (draft.icon?.value ?? "⭐"),
    iconUrl: draft.icon?.type === "image" ? draft.icon.value : null,
    color: draft.color ?? "amber",
    frequency: draft.frequency ?? "daily",
    points: draft.points ?? 10,
    reminderTime: draft.reminder?.enabled ? draft.reminder.time : null,
    priority: draft.priority ?? "medium",
    tags: draft.tags ?? [],
    goal: null,
    days: [],
    timesPerWeek: null,
    startDate: draft.startDate ?? now.slice(0, 10),
    note: draft.note?.trim() || null,
    createdAt: now,
  };
}

/* ------------------------------- scheduling ------------------------------- */

/** Whether a habit is expected on a given local date (weekly = any day). */
export function isDueOn(habit: Habit, date: string): boolean {
  if (habit.startDate && date < habit.startDate) return false;
  if (habit.frequency === "custom" && habit.days.length > 0) {
    const weekday = new Date(`${date}T12:00:00`).getDay();
    return habit.days.includes(weekday);
  }
  return true;
}

/* -------------------------------- streaks -------------------------------- */

const shift = (date: string, days: number): string => {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Consecutive due days completed, counting back from today. A day the habit
 * isn't scheduled (custom weekdays, before its start date) neither counts nor
 * breaks the run. Today only counts once it's done, so an open habit still
 * shows yesterday's streak instead of dropping to zero at midnight.
 */
export function streakOf(habit: Habit, logs: readonly HabitLog[], today: string): number {
  const done = new Set<string>();
  for (const l of logs) if (l.habitId === habit.id) done.add(l.date);
  if (done.size === 0) return 0;

  let streak = 0;
  let date = today;
  // Today is a free pass while it's still open.
  if (!done.has(date)) date = shift(date, -1);
  for (let guard = 0; guard < 366; guard++) {
    if (habit.startDate && date < habit.startDate) break;
    if (isDueOn(habit, date)) {
      if (!done.has(date)) break;
      streak++;
    }
    date = shift(date, -1);
  }
  return streak;
}
