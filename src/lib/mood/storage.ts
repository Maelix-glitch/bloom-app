import { supabase } from "@/lib/supabase";
import type { EmotionKey, MoodEntry } from "./types";
import { localDay } from "@/lib/localDay";
import { contextFromJson, contextToJson } from "./context";
import { pageAll } from "@/lib/pageAll";

type MoodRow = {
  id: string;
  profile_id: string;
  mood_label: string | null;
  mood_intensity: number | null;
  energy: number | null;
  stress: number | null;
  note: string | null;
  tags: string[] | null;
  logged_at: string | null;
  date: string | null;
  /** Optional context signals (sleep, exercise, …) — see lib/mood/context. */
  context?: unknown;
};

const BASE_COLUMNS =
  "id, profile_id, mood_label, mood_intensity, energy, stress, note, tags, logged_at, date";

/**
 * `mood_entries.context` arrives with the 20260908_mood_context migration. Until
 * it has been run, the table simply has no such column — Mood must keep
 * working exactly as before, so the first "column does not exist" answer
 * switches this module to the old shape for the rest of the session.
 */
let contextColumn = true;
const missingContextColumn = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: unknown; message?: unknown };
  const msg = typeof e.message === "string" ? e.message : "";
  return (
    e.code === "42703" ||
    e.code === "PGRST204" ||
    /context.*(column|does not exist|schema cache)|(column|schema cache).*context/i.test(msg)
  );
};

/** Run once with the context column; if the table doesn't have it yet, once more without. */
async function withContextFallback<T>(
  run: (withContext: boolean) => Promise<{ data: T; error: unknown }>,
): Promise<T> {
  const first = await run(contextColumn);
  if (!first.error) return first.data;
  if (contextColumn && missingContextColumn(first.error)) {
    contextColumn = false;
    const second = await run(false);
    if (!second.error) return second.data;
    throw second.error;
  }
  throw first.error;
}

const normaliseScore = (value: number | null) => {
  const score = Number(value ?? 5);

  // Supports earlier Bloom values such as 65 = 6.5 / 10.
  const normalised = score > 10 ? score / 10 : score;

  return Math.max(1, Math.min(10, normalised));
};

const cleanEmotion = (value: string): EmotionKey | null => {
  const allowed = new Set<EmotionKey>([
    "happy",
    "calm",
    "excited",
    "focused",
    "motivated",
    "confident",
    "grateful",
    "neutral",
    "tired",
    "anxious",
    "sad",
    "angry",
    "frustrated",
    "overwhelmed",
    "lonely",
  ]);

  const key = value.trim().toLowerCase() as EmotionKey;

  return allowed.has(key) ? key : null;
};

function fromRow(row: MoodRow): MoodEntry {
  const values = [row.mood_label ?? "", ...(row.tags ?? [])]
    .map(cleanEmotion)
    .filter((value): value is EmotionKey => Boolean(value));

  return {
    id: row.id,
    timestamp:
      row.logged_at ?? `${row.date ?? new Date().toISOString().slice(0, 10)}T12:00:00.000Z`,
    mood: normaliseScore(row.mood_intensity),
    energy: row.energy == null ? 5 : normaliseScore(row.energy),
    stress: row.stress == null ? 5 : normaliseScore(row.stress),
    emotions: [...new Set<EmotionKey>(values.length ? values : ["neutral"])],
    tags: row.tags ?? [],
    note: row.note ?? undefined,
    ...contextFromJson(row.context),
  };
}

function toRow(profileId: string, entry: MoodEntry, withContext: boolean) {
  const primaryEmotion = entry.emotions[0] ?? "neutral";

  return {
    profile_id: profileId,
    mood_label: primaryEmotion,
    ...(withContext ? { context: contextToJson(entry) } : {}),

    // Store as 0–100 so it stays compatible with older Bloom Mood entries.
    mood_intensity: Math.round(entry.mood * 10),

    energy: Math.round(entry.energy),
    stress: Math.round(entry.stress),

    tags: [...new Set([...entry.tags, ...entry.emotions.slice(1)])],
    note: entry.note?.trim() || null,
    logged_at: entry.timestamp,
    // the day the person experienced, not the UTC day
    date: localDay(entry.timestamp),
  };
}

export const moodStorage = {
  async all(profileId: string): Promise<MoodEntry[]> {
    const data = await withContextFallback<MoodRow[] | null>((withContext) =>
      /* every row, in pages — the whole record, not the first thousand */
      pageAll<MoodRow>((from, to) =>
        supabase
          .from("mood_entries")
          .select(withContext ? `${BASE_COLUMNS}, context` : BASE_COLUMNS)
          .eq("profile_id", profileId)
          .order("logged_at", { ascending: true })
          .order("id", { ascending: true })
          .range(from, to)
          .then((res) => ({ data: res.data as MoodRow[] | null, error: res.error })),
      ),
    );

    return (data ?? []).map(fromRow);
  },

  async put(profileId: string, entry: MoodEntry): Promise<MoodEntry> {
    // Existing Supabase rows use UUIDs. New Lovable composer entries use a
    // temporary local ID, so let PostgreSQL create the real UUID on insert.
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(entry.id);

    const data = await withContextFallback<MoodRow | null>(async (withContext) => {
      const row = toRow(profileId, entry, withContext);
      const cols = withContext ? `${BASE_COLUMNS}, context` : BASE_COLUMNS;
      const res = isUuid
        ? await supabase
            .from("mood_entries")
            .update(row)
            .eq("id", entry.id)
            .eq("profile_id", profileId)
            .select(cols)
            .single()
        : await supabase.from("mood_entries").insert(row).select(cols).single();
      return { data: res.data as MoodRow | null, error: res.error };
    });

    if (!data) throw new Error("The saved Mood entry did not come back.");
    return fromRow(data);
  },

  async remove(profileId: string, id: string): Promise<void> {
    const { error } = await supabase
      .from("mood_entries")
      .delete()
      .eq("id", id)
      .eq("profile_id", profileId);

    if (error) throw error;
  },
};
