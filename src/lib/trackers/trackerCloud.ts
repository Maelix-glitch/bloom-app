/**
 * Bloom — trackers sync.
 *
 * Device-first, like the cycle page: the page draws instantly from
 * localStorage, then reconciles with the `tracker_days` table in the
 * background. Losing the network costs sync, never a logged day.
 *
 * The mapping is pure and tested; only the four async functions at the bottom
 * touch the network, and each throws instead of pretending it worked.
 */

import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { normalizeDay } from "@/lib/trackers/store";
import type { DayEntry, StudySession } from "@/lib/trackers/core";

export const TRACKER_TABLE = "tracker_days";
export const TRACKER_CONFLICT = "profile_id,date";

const COLUMNS =
  "date, sleep_minutes, bed_time, wake_time, sleep_quality, water_ml, sessions, movement_minutes, energy, screen_minutes, notes, updated_at";

/** True when this build actually has a project to talk to. */
export function hasCloud(): boolean {
  return hasSupabaseConfig;
}

/** Signed-in user id, or null when there's no session (or no project). */
export async function currentProfileId(): Promise<string | null> {
  if (!hasSupabaseConfig) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

function toSessions(value: unknown): StudySession[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((s): s is Record<string, unknown> => Boolean(s) && typeof s === "object")
    .map((s) => {
      const subject = typeof s["subject"] === "string" ? s["subject"].trim().slice(0, 40) : "";
      const minutes = typeof s["minutes"] === "number" && Number.isFinite(s["minutes"]) ? s["minutes"] : null;
      const startAt = typeof s["startAt"] === "string" && /^\d{1,2}:\d{2}$/.test(s["startAt"]) ? s["startAt"] : null;
      if (!subject || minutes === null || minutes < 1 || minutes > 16 * 60) return null;
      return { subject, minutes: Math.round(minutes), startAt };
    })
    .filter((s): s is StudySession => s !== null)
    .slice(0, 12);
}

/** A `tracker_days` row becomes a DayEntry; anything out of range is dropped. */
export function rowToDay(row: unknown): DayEntry | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const day = normalizeDay({
    date: r["date"],
    sleepMinutes: r["sleep_minutes"],
    bedTime: r["bed_time"],
    wakeTime: r["wake_time"],
    sleepQuality: r["sleep_quality"],
    waterMl: r["water_ml"],
    sessions: toSessions(r["sessions"]),
    movementMinutes: r["movement_minutes"],
    energy: r["energy"],
    screenMinutes: r["screen_minutes"],
    notes: r["notes"],
    updatedAt: r["updated_at"],
  });
  return day;
}

/** A DayEntry becomes a `tracker_days` payload. */
export function dayToRow(day: DayEntry, profileId: string): Record<string, unknown> {
  const now = new Date().toISOString();
  return {
    profile_id: profileId,
    date: day.date,
    sleep_minutes: day.sleepMinutes,
    bed_time: day.bedTime,
    wake_time: day.wakeTime,
    sleep_quality: day.sleepQuality,
    water_ml: day.waterMl,
    sessions: day.sessions,
    movement_minutes: day.movementMinutes,
    energy: day.energy,
    screen_minutes: day.screenMinutes,
    notes: day.notes,
    updated_at: day.updatedAt ?? now,
  };
}

/**
 * Reconciles the device with the table. Newer `updatedAt` wins on a shared
 * date; days that exist on only one side are kept. `newerLocal` lists the dates
 * the device holds that are ahead of the table, so the caller can push them up.
 */
export function mergeDayLists(
  local: readonly DayEntry[],
  remote: readonly DayEntry[],
): { days: DayEntry[]; newerLocal: string[] } {
  const byDate = new Map<string, DayEntry>();
  const newerLocal: string[] = [];
  for (const day of local) byDate.set(day.date, { ...day });

  for (const remoteDay of remote) {
    const mine = byDate.get(remoteDay.date);
    if (!mine) {
      byDate.set(remoteDay.date, remoteDay);
      continue;
    }
    const mineAt = Date.parse(mine.updatedAt ?? "") || 0;
    const theirsAt = Date.parse(remoteDay.updatedAt ?? "") || 0;
    if (mineAt > theirsAt) newerLocal.push(mine.date);
    else byDate.set(remoteDay.date, remoteDay);
  }

  return {
    days: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)),
    newerLocal,
  };
}

/* ------------------------------- the network ------------------------------ */

export async function pullDays(profileId: string): Promise<DayEntry[]> {
  const { data, error } = await supabase
    .from(TRACKER_TABLE)
    .select(COLUMNS)
    .eq("profile_id", profileId)
    .order("date", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown[]).map(rowToDay).filter((d): d is DayEntry => d !== null);
}

export async function pushDay(profileId: string, day: DayEntry): Promise<void> {
  const { error } = await supabase
    .from(TRACKER_TABLE)
    .upsert(dayToRow(day, profileId), { onConflict: TRACKER_CONFLICT });
  if (error) throw new Error(error.message);
}

export async function deleteDay(profileId: string, date: string): Promise<void> {
  const { error } = await supabase
    .from(TRACKER_TABLE)
    .delete()
    .eq("profile_id", profileId)
    .eq("date", date);
  if (error) throw new Error(error.message);
}
