import { supabase } from "@/lib/supabase";
import type { EmotionKey, MoodEntry } from "./types";

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
};

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
      row.logged_at ??
      `${row.date ?? new Date().toISOString().slice(0, 10)}T12:00:00.000Z`,
    mood: normaliseScore(row.mood_intensity),
    energy: row.energy == null ? 5 : normaliseScore(row.energy),
    stress: row.stress == null ? 5 : normaliseScore(row.stress),
    emotions: [...new Set<EmotionKey>(values.length ? values : ["neutral"])],
    tags: row.tags ?? [],
    note: row.note ?? undefined,
  };
}

function toRow(profileId: string, entry: MoodEntry) {
  const primaryEmotion = entry.emotions[0] ?? "neutral";

  return {
    profile_id: profileId,
    mood_label: primaryEmotion,

    // Store as 0–100 so it stays compatible with older Bloom Mood entries.
    mood_intensity: Math.round(entry.mood * 10),

    energy: Math.round(entry.energy),
    stress: Math.round(entry.stress),

    tags: [...new Set([...entry.tags, ...entry.emotions.slice(1)])],
    note: entry.note?.trim() || null,
    logged_at: entry.timestamp,
    date: entry.timestamp.slice(0, 10),
  };
}

export const moodStorage = {
  async all(profileId: string): Promise<MoodEntry[]> {
    const { data, error } = await supabase
      .from("mood_entries")
      .select(
        "id, profile_id, mood_label, mood_intensity, energy, stress, note, tags, logged_at, date",
      )
      .eq("profile_id", profileId)
      .order("logged_at", { ascending: true });

    if (error) throw error;

    return (data as MoodRow[]).map(fromRow);
  },

  async put(profileId: string, entry: MoodEntry): Promise<MoodEntry> {
  const row = toRow(profileId, entry);

  // Existing Supabase rows use UUIDs. New Lovable composer entries use a
  // temporary local ID, so let PostgreSQL create the real UUID on insert.
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      entry.id,
    );

  if (isUuid) {
    const { data, error } = await supabase
      .from("mood_entries")
      .update(row)
      .eq("id", entry.id)
      .eq("profile_id", profileId)
      .select(
        "id, profile_id, mood_label, mood_intensity, energy, stress, note, tags, logged_at, date",
      )
      .single();

    if (error) throw error;

    return fromRow(data as MoodRow);
  }

  const { data, error } = await supabase
    .from("mood_entries")
    .insert(row)
    .select(
      "id, profile_id, mood_label, mood_intensity, energy, stress, note, tags, logged_at, date",
    )
    .single();

  if (error) throw error;

  return fromRow(data as MoodRow);
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