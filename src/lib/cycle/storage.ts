/**
 * Bloom — Cycle persistence. Talks to the same `cycle_entries` table the
 * legacy page uses, upserting on (profile_id, date). Errors surface as calm
 * copy; the raw provider error goes to the console only.
 */

import { supabase } from "@/lib/supabase";
import type { CycleEntry } from "./types";

const SELECT =
  "date, cycle_day, phase, flow, temperature, cervical_mucus, lh_test, pain_level, sexual_activity, contraceptive, energy, sleep_hours, mood, symptoms, notes, next_period_in_days, logged_at, created_at, updated_at";

function friendly(error: unknown): string {
  console.error("[bloom:cycle]", error);
  const msg = error instanceof Error ? error.message : "";
  if (/fetch|network|Failed to fetch/i.test(msg))
    return "You're offline — your last saved state is still here.";
  return "Couldn't reach your cycle records just now.";
}

export const cycleStorage = {
  async all(profileId: string): Promise<CycleEntry[]> {
    const { data, error } = await supabase
      .from("cycle_entries")
      .select(SELECT)
      .eq("profile_id", profileId)
      .order("date", { ascending: true });
    if (error) throw new Error(friendly(error));
    return ((data ?? []) as Partial<CycleEntry>[]).map((r) => ({
      date: r.date!,
      cycle_day: r.cycle_day ?? 1,
      phase: r.phase ?? null,
      flow: r.flow ?? null,
      temperature: r.temperature ?? null,
      cervical_mucus: r.cervical_mucus ?? null,
      lh_test: r.lh_test ?? null,
      pain_level: r.pain_level ?? null,
      sexual_activity: r.sexual_activity ?? null,
      contraceptive: r.contraceptive ?? null,
      energy: r.energy ?? null,
      sleep_hours: r.sleep_hours ?? null,
      mood: r.mood ?? null,
      symptoms: Array.isArray(r.symptoms) ? (r.symptoms as string[]) : [],
      notes: r.notes ?? null,
      next_period_in_days: r.next_period_in_days ?? null,
      logged_at: r.logged_at ?? null,
      created_at: r.created_at ?? null,
      updated_at: r.updated_at ?? null,
    }));
  },

  async save(profileId: string, row: Partial<CycleEntry> & { date: string }): Promise<void> {
    const payload: Record<string, unknown> = {
      profile_id: profileId,
      updated_at: new Date().toISOString(),
    };
    for (const [k, v] of Object.entries(row)) if (v !== undefined) payload[k] = v;
    payload["updated_at"] = new Date().toISOString(); // never let a stale null clobber audit columns
    if (payload["created_at"] === null) delete payload["created_at"];
    if (payload["logged_at"] === null) delete payload["logged_at"];

    const { error } = await supabase
      .from("cycle_entries")
      .upsert(payload, { onConflict: "profile_id,date" });
    if (error) throw new Error(friendly(error));
  },

  async remove(profileId: string, date: string): Promise<void> {
    const { error } = await supabase
      .from("cycle_entries")
      .delete()
      .eq("profile_id", profileId)
      .eq("date", date);
    if (error) throw new Error(friendly(error));
  },
};

/** Client-side CSV export of the user's own rows — no server round trip. */
export function entriesToCsv(entries: CycleEntry[]): string {
  const headers = [
    "date",
    "cycle_day",
    "phase",
    "flow",
    "temperature_c",
    "cervical_mucus",
    "lh_test",
    "pain_level",
    "sexual_activity",
    "contraceptive",
    "energy",
    "sleep_hours",
    "mood",
    "symptoms",
    "notes",
  ];
  const esc = (v: unknown) => {
    const s = Array.isArray(v) ? v.join("; ") : v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = entries.map((e) =>
    [
      e.date,
      e.cycle_day,
      e.phase,
      e.flow,
      e.temperature,
      e.cervical_mucus,
      e.lh_test,
      e.pain_level,
      e.sexual_activity,
      e.contraceptive,
      e.energy,
      e.sleep_hours,
      e.mood,
      e.symptoms,
      e.notes,
    ]
      .map(esc)
      .join(","),
  );
  return [headers.join(","), ...rows].join("\n");
}
