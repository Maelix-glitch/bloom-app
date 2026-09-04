/**
 * Bloom — cycle sync.
 *
 * Talks to the same `cycle_entries` table the legacy page used, upserting on
 * (profile_id, date), so anything logged in the old page shows up here and
 * anything logged here shows up there.
 *
 * The device stays the source of truth for drawing: the page renders instantly
 * from localStorage and reconciles with the table in the background. Losing the
 * network costs sync — never a logged day.
 *
 * The mapping functions are pure and tested; only the four async functions at
 * the bottom touch the network.
 */

import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { normalizeDayLog } from "@/lib/cycle/periodStore";
import type { DayLog } from "@/lib/cycle/dayLogs";

/** Same table and conflict key as the legacy page. */
export const CYCLE_TABLE = "cycle_entries";
export const CYCLE_CONFLICT = "profile_id,date";

const COLUMNS =
  "date, cycle_day, phase, flow, temperature, cervical_mucus, lh_test, pain_level, sexual_activity, contraceptive, energy, sleep_hours, mood, symptoms, notes, logged_at, updated_at";

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

/**
 * A `cycle_entries` row becomes a DayLog. The legacy page wrote the same
 * column names, so old rows and new ones take the same path — and
 * `normalizeDayLog` quietly drops anything out of range instead of throwing.
 */
export function rowToDay(row: unknown): DayLog | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  return normalizeDayLog({
    date: r["date"],
    flow: r["flow"],
    symptoms: r["symptoms"],
    mood: r["mood"],
    energy: r["energy"],
    pain: r["pain_level"] ?? r["pain"],
    sleep: r["sleep_hours"] ?? r["sleep"],
    temperature: r["temperature"],
    mucus: r["cervical_mucus"] ?? r["mucus"],
    lh: r["lh_test"] ?? r["lh"],
    notes: r["notes"],
    updatedAt:
      typeof r["updated_at"] === "string"
        ? r["updated_at"]
        : typeof r["logged_at"] === "string"
          ? r["logged_at"]
          : null,
  });
}

/**
 * A DayLog becomes a `cycle_entries` payload. `cycleDay` and `phase` are
 * passed in rather than computed here — they come from the analysis, and this
 * module stays free of it.
 */
export function dayToRow(
  day: DayLog,
  profileId: string,
  meta: { cycleDay?: number | null; phase?: string | null } = {},
): Record<string, unknown> {
  const now = new Date().toISOString();
  return {
    profile_id: profileId,
    date: day.date,
    cycle_day: meta.cycleDay ?? null,
    phase: meta.phase ?? null,
    flow: day.flow ?? null,
    temperature: day.temperature ?? null,
    cervical_mucus: day.mucus ?? null,
    lh_test: day.lh ?? null,
    pain_level: day.pain ?? null,
    energy: day.energy ?? null,
    sleep_hours: day.sleep ?? null,
    mood: day.mood ?? null,
    symptoms: day.symptoms ?? [],
    notes: day.notes ?? null,
    logged_at: now,
    updated_at: now,
  };
}

/**
 * Reconciles what's on the device with what's in the table.
 *
 * Newer `updatedAt` wins on a shared date; days that exist on only one side are
 * kept. `newerLocal` lists the dates the device holds that are ahead of the
 * table, so the caller can push them back up.
 */
export function mergeDayLists(
  local: readonly DayLog[],
  remote: readonly DayLog[],
): { days: DayLog[]; newerLocal: string[] } {
  const byDate = new Map<string, DayLog>();
  const newerLocal: string[] = [];

  for (const day of local) byDate.set(day.date, day);

  for (const remoteDay of remote) {
    const mine = byDate.get(remoteDay.date);
    if (!mine) {
      byDate.set(remoteDay.date, remoteDay);
      continue;
    }
    const mineAt = Date.parse(mine.updatedAt ?? "") || 0;
    const theirsAt = Date.parse(remoteDay.updatedAt ?? "") || 0;
    if (mineAt > theirsAt) newerLocal.push(mine.date);
    else byDate.set(remoteDay.date, { ...remoteDay, updatedAt: remoteDay.updatedAt ?? null });
  }

  const days = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  return { days, newerLocal };
}

/* ------------------------------- the network ------------------------------ */

/** Every row for this profile, oldest first. Throws only on a real failure. */
export async function pullDays(profileId: string): Promise<DayLog[]> {
  const { data, error } = await supabase
    .from(CYCLE_TABLE)
    .select(COLUMNS)
    .eq("profile_id", profileId)
    .order("date", { ascending: true });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown[];
  return rows.map(rowToDay).filter((d): d is DayLog => d !== null);
}

/** Upsert one day. Same conflict target as the legacy page. */
export async function pushDay(
  profileId: string,
  day: DayLog,
  meta: { cycleDay?: number | null; phase?: string | null } = {},
): Promise<void> {
  const { error } = await supabase
    .from(CYCLE_TABLE)
    .upsert(dayToRow(day, profileId, meta), { onConflict: CYCLE_CONFLICT });
  if (error) throw new Error(error.message);
}

/** Remove one day. */
export async function deleteDay(profileId: string, date: string): Promise<void> {
  const { error } = await supabase
    .from(CYCLE_TABLE)
    .delete()
    .eq("profile_id", profileId)
    .eq("date", date);
  if (error) throw new Error(error.message);
}

/** What the old HTML page left in this browser, if anything. */
export function legacyLocalDays(): DayLog[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem("bloom_cycle_logs_advanced");
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(rowToDay).filter((d): d is DayLog => d !== null);
  } catch {
    return [];
  }
}
