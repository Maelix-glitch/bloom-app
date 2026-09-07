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
import { localDayOf, todayLocal } from "@/lib/localDay";

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
  /** Archived habits keep their history but are never due. */
  archived: boolean;
  /** The one remembered pause window (inclusive). Days inside it are neutral. */
  pausedFrom: string | null;
  pausedUntil: string | null;
}

export interface HabitLog {
  habitId: string;
  date: string;
  completedAt: string;
}

/** What the Add-habit dialog emits (see components/tk/AddHabitModal.tsx). */
export interface HabitDraft {
  name: string;
  note?: string | undefined;
  icon?: { type: string; value: string } | undefined;
  color?: string | undefined;
  frequency?: string | undefined;
  /** 0=Sun..6=Sat — only meaningful when frequency is "custom" */
  days?: number[] | undefined;
  /** only meaningful when frequency is "weekly" */
  timesPerWeek?: number | null | undefined;
  goal?: { enabled: boolean; target: number | null; unit: string | null } | null | undefined;
  priority?: string | undefined;
  points?: number | undefined;
  reminder?: { enabled: boolean; time: string | null } | undefined;
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
      archived: h.archived,
      pausedFrom: h.pausedFrom,
      pausedUntil: h.pausedUntil,
    })),
  );
  writeJson(LOGS_KEY, logs);
  if (typeof window !== "undefined") window.dispatchEvent(new Event(HABITS_CHANGED));
}

/* --------------------------------- rows ---------------------------------- */

/** Tolerant of both the legacy column pairs (archived/is_archived, points/point_value…). */
export function rowToHabit(r: Row | null | undefined): Habit | null {
  if (!r || typeof r !== "object") return null;
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
    archived: r["is_archived"] === true || r["archived"] === true,
    pausedFrom: str(r["paused_from"] ?? r["pausedFrom"], "").slice(0, 10) || null,
    pausedUntil: str(r["paused_until"] ?? r["pausedUntil"], "").slice(0, 10) || null,
  };
}

/** The habit as the Add-habit dialog wants it back, for editing. */
export function habitToDraft(h: Habit): HabitDraft {
  return {
    name: h.name,
    note: h.note ?? undefined,
    icon: h.iconUrl ? { type: "image", value: h.iconUrl } : { type: "emoji", value: h.icon },
    color: h.color,
    frequency: h.frequency,
    days: h.days,
    timesPerWeek: h.timesPerWeek,
    goal: h.goal ? { enabled: true, target: h.goal.target, unit: h.goal.unit } : null,
    priority: h.priority,
    points: h.points,
    reminder: h.reminderTime
      ? { enabled: true, time: h.reminderTime }
      : { enabled: false, time: null },
    tags: h.tags,
    startDate: h.startDate ?? undefined,
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

/** The columns a draft maps onto — shared by insert and update. */
function draftToColumns(draft: HabitDraft) {
  const iconType = draft.icon?.type === "image" ? "image" : "emoji";
  const iconValue = draft.icon?.value ?? "⭐";
  return {
    name: draft.name.trim(),
    note: draft.note?.trim() || null,
    icon_type: iconType,
    icon_value: iconValue,
    icon_url: iconType === "image" ? iconValue : null,
    color: draft.color ?? "amber",
    frequency: draft.frequency ?? "daily",
    days: draft.frequency === "custom" && draft.days?.length ? draft.days : null,
    times_per_week: draft.frequency === "weekly" ? (draft.timesPerWeek ?? null) : null,
    goal_enabled: Boolean(draft.goal?.enabled),
    goal_target: draft.goal?.enabled ? draft.goal.target : null,
    goal_unit: draft.goal?.enabled ? draft.goal.unit : null,
    point_value: draft.points ?? 10,
    priority: draft.priority ?? "medium",
    reminder_enabled: Boolean(draft.reminder?.enabled && draft.reminder.time),
    reminder_time: draft.reminder?.enabled ? draft.reminder.time : null,
    tags: draft.tags && draft.tags.length ? draft.tags : null,
    start_date: draft.startDate ?? todayLocal(),
  };
}

export async function insertHabit(profileId: string, draft: HabitDraft): Promise<Habit> {
  const payload = { profile_id: profileId, ...draftToColumns(draft) };
  const { data, error } = await supabase.from("habits").insert(payload).select("*").single();
  if (error) throw error;
  const habit = rowToHabit(data as Row);
  if (!habit) throw new Error("The habit was saved but came back in an unexpected shape.");
  return habit;
}

export async function updateHabit(
  profileId: string,
  habitId: string,
  draft: HabitDraft,
): Promise<Habit> {
  const payload = { ...draftToColumns(draft), updated_at: new Date().toISOString() };
  const { data, error } = await supabase
    .from("habits")
    .update(payload)
    .eq("id", habitId)
    .eq("profile_id", profileId)
    .select("*")
    .single();
  if (error) throw error;
  const habit = rowToHabit(data as Row);
  if (!habit) throw new Error("The habit was saved but came back in an unexpected shape.");
  return habit;
}

/** True for PostgREST's "no such column" answers (before a migration has been run). */
export function isMissingColumn(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: unknown; message?: unknown };
  const msg = typeof e.message === "string" ? e.message : "";
  return (
    e.code === "42703" ||
    e.code === "PGRST204" ||
    /column .* does not exist|schema cache/i.test(msg)
  );
}

/** Thrown when a pause is asked of a table that doesn't have the pause columns yet. */
export class PauseColumnsMissing extends Error {
  constructor() {
    super("This project hasn't run 20260907_habit_pause.sql yet — the pause stays on this device.");
    this.name = "PauseColumnsMissing";
  }
}

/** Archive / restore, pause / resume — small column flips, history untouched. */
export async function patchHabit(
  profileId: string,
  habitId: string,
  patch: {
    archived?: boolean;
    pausedFrom?: string | null;
    pausedUntil?: string | null;
  },
): Promise<void> {
  const row: Row = { updated_at: new Date().toISOString() };
  if (patch.archived !== undefined) row["is_archived"] = patch.archived;
  const pausing = patch.pausedFrom !== undefined || patch.pausedUntil !== undefined;
  if (patch.pausedFrom !== undefined) row["paused_from"] = patch.pausedFrom;
  if (patch.pausedUntil !== undefined) row["paused_until"] = patch.pausedUntil;
  const { error } = await supabase
    .from("habits")
    .update(row)
    .eq("id", habitId)
    .eq("profile_id", profileId);
  if (error && pausing && isMissingColumn(error)) throw new PauseColumnsMissing();
  if (error) throw error;
}

/** Hard delete — `habit_logs` cascade. Only after the undo window has closed. */
export async function deleteHabitRow(profileId: string, habitId: string): Promise<void> {
  const { error } = await supabase
    .from("habits")
    .delete()
    .eq("id", habitId)
    .eq("profile_id", profileId);
  if (error) throw error;
}

/** Bulk completions — used once, when a device-only habit joins the account. */
export async function insertLogs(
  profileId: string,
  habitId: string,
  logs: readonly HabitLog[],
): Promise<void> {
  if (logs.length === 0) return;
  const rows = logs.map((l) => ({
    profile_id: profileId,
    habit_id: habitId,
    date: l.date,
    value: 1,
    completed_at: l.completedAt,
    created_at: l.completedAt,
  }));
  const { error } = await supabase
    .from("habit_logs")
    .upsert(rows, { onConflict: "profile_id,habit_id,date", ignoreDuplicates: true });
  if (error) throw error;
}

/**
 * Move every device-only habit (and its ticks) onto the account. Returns the
 * habits as the account now knows them plus the ids that were replaced; a
 * habit whose upload fails is left out of both so it stays on the device and
 * is retried next time.
 */
export async function uploadLocalHabits(
  profileId: string,
  habits: readonly Habit[],
  logs: readonly HabitLog[],
): Promise<{ uploaded: Habit[]; replacedIds: string[]; logs: HabitLog[]; failed: number }> {
  const uploaded: Habit[] = [];
  const replacedIds: string[] = [];
  const movedLogs: HabitLog[] = [];
  let failed = 0;
  for (const h of habits) {
    if (!isLocalHabitId(h.id)) continue;
    const own = logs.filter((l) => l.habitId === h.id);
    const earliest = own.reduce<string | null>((a, l) => (a && a < l.date ? a : l.date), null);
    try {
      const draft = habitToDraft(h);
      const start = h.startDate && (!earliest || h.startDate <= earliest) ? h.startDate : earliest;
      const created = await insertHabit(profileId, {
        ...draft,
        startDate: start ?? draft.startDate,
      });
      await insertLogs(profileId, created.id, own);
      let final = created;
      if (h.archived || h.pausedUntil) {
        await patchHabit(profileId, created.id, {
          archived: h.archived,
          pausedFrom: h.pausedFrom,
          pausedUntil: h.pausedUntil,
        });
        final = {
          ...created,
          archived: h.archived,
          pausedFrom: h.pausedFrom,
          pausedUntil: h.pausedUntil,
        };
      }
      uploaded.push(final);
      replacedIds.push(h.id);
      for (const l of own) movedLogs.push({ ...l, habitId: created.id });
    } catch (e) {
      console.warn("[bloom:habits] upload local habit:", e);
      failed += 1;
    }
  }
  return { uploaded, replacedIds, logs: movedLogs, failed };
}

export const isLocalHabitId = (id: string): boolean => id.startsWith("local-");

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
    goal: draft.goal?.enabled ? { target: draft.goal.target, unit: draft.goal.unit } : null,
    days: draft.frequency === "custom" ? [...(draft.days ?? [])] : [],
    timesPerWeek: draft.frequency === "weekly" ? (draft.timesPerWeek ?? null) : null,
    startDate: draft.startDate ?? todayLocal(),
    note: draft.note?.trim() || null,
    createdAt: now,
    archived: false,
    pausedFrom: null,
    pausedUntil: null,
  };
}

/** The same habit with an edited draft applied — id and history kept. */
export function applyDraft(habit: Habit, draft: HabitDraft): Habit {
  const fresh = draftToLocalHabit(draft);
  return {
    ...fresh,
    id: habit.id,
    createdAt: habit.createdAt,
    archived: habit.archived,
    pausedFrom: habit.pausedFrom,
    pausedUntil: habit.pausedUntil,
    startDate: draft.startDate ?? habit.startDate,
  };
}

/* ------------------------------- scheduling ------------------------------- */

const shift = (date: string, days: number): string => {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + days);
  return localDayOf(d);
};

const weekdayOf = (date: string): number => new Date(`${date}T12:00:00`).getDay();

/** Monday of the week that holds `date` (weeks run Mon–Sun, local). */
export function weekStartOf(date: string): string {
  const wd = weekdayOf(date); // 0 = Sun
  return shift(date, wd === 0 ? -6 : 1 - wd);
}

export const isWeekly = (habit: Pick<Habit, "frequency">): boolean => habit.frequency === "weekly";

/** How many times a "weekly" habit wants doing per week (at least once). */
export const weeklyTarget = (habit: Pick<Habit, "timesPerWeek">): number =>
  Math.max(1, Math.min(7, Math.round(habit.timesPerWeek ?? 1)));

/** Whether `date` sits inside the habit's remembered pause window. */
export function isPausedOn(habit: Habit, date: string): boolean {
  if (!habit.pausedUntil) return false;
  const from = habit.pausedFrom ?? habit.pausedUntil;
  return date >= from && date <= habit.pausedUntil;
}

/** Completions this week (Mon–Sun) up to and including `date`, and the target. */
export function weeklyProgress(
  habit: Habit,
  logs: readonly HabitLog[],
  date: string,
): { done: number; target: number; doneToday: boolean } {
  const start = weekStartOf(date);
  const end = shift(start, 6);
  const days = new Set<string>();
  for (const l of logs) {
    if (l.habitId !== habit.id) continue;
    if (l.date >= start && l.date <= end && l.date <= date) days.add(l.date);
  }
  return { done: days.size, target: weeklyTarget(habit), doneToday: days.has(date) };
}

/**
 * Whether a habit is expected on a given local date.
 *
 * - archived or paused → never
 * - before its start date → no
 * - custom weekdays → only on those days
 * - "N× a week" → until the week (Mon–Sun) has N completions; a day already
 *   ticked stays due so it shows as done rather than vanishing
 * - daily → yes
 */
export function isDueOn(habit: Habit, date: string, logs: readonly HabitLog[] = []): boolean {
  if (habit.archived) return false;
  if (habit.startDate && date < habit.startDate) return false;
  if (isPausedOn(habit, date)) return false;
  if (habit.frequency === "custom" && habit.days.length > 0) {
    return habit.days.includes(weekdayOf(date));
  }
  if (isWeekly(habit)) {
    const p = weeklyProgress(habit, logs, date);
    return p.doneToday || p.done < p.target;
  }
  return true;
}

/* -------------------------------- streaks -------------------------------- */

/** What a habit's streak counts: days for daily/custom, weeks for weekly. */
export const streakUnitOf = (habit: Pick<Habit, "frequency">): "day" | "week" =>
  isWeekly(habit) ? "week" : "day";

/**
 * Consecutive due days completed, counting back from today. A day the habit
 * isn't scheduled (custom weekdays, before its start date, inside a pause)
 * neither counts nor breaks the run. Today only counts once it's done, so an
 * open habit still shows yesterday's streak instead of dropping to zero at
 * midnight.
 *
 * Weekly habits count consecutive weeks that reached their target; the
 * current week is a free pass while it is still open.
 */
export function streakOf(habit: Habit, logs: readonly HabitLog[], today: string): number {
  const done = new Set<string>();
  for (const l of logs) if (l.habitId === habit.id) done.add(l.date);
  if (done.size === 0) return 0;

  if (isWeekly(habit)) return weeklyStreak(habit, logs, today);

  let streak = 0;
  let date = today;
  // Today is a free pass while it's still open.
  if (!done.has(date)) date = shift(date, -1);
  for (let guard = 0; guard < 366; guard++) {
    if (habit.startDate && date < habit.startDate) break;
    if (isDueOn(habit, date, logs)) {
      if (!done.has(date)) break;
      streak++;
    }
    date = shift(date, -1);
  }
  return streak;
}

function weeklyStreak(habit: Habit, logs: readonly HabitLog[], today: string): number {
  const target = weeklyTarget(habit);
  let weekStart = weekStartOf(today);
  let streak = 0;
  // the open week counts once it hits the target, and never breaks the run
  const current = weeklyProgress(habit, logs, today);
  if (current.done >= target) streak++;
  weekStart = shift(weekStart, -7);
  for (let guard = 0; guard < 105; guard++) {
    const weekEnd = shift(weekStart, 6);
    if (habit.startDate && weekEnd < habit.startDate) break;
    // a week the habit was paused in is neutral
    let paused = false;
    for (let d = weekStart; d <= weekEnd; d = shift(d, 1)) {
      if (isPausedOn(habit, d)) {
        paused = true;
        break;
      }
    }
    if (!paused) {
      const p = weeklyProgress(habit, logs, weekEnd);
      if (p.done < target) break;
      streak++;
    }
    weekStart = shift(weekStart, -7);
  }
  return streak;
}
