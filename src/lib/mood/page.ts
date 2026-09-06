/**
 * Mood page view-model helpers — pure functions that turn the real Mood
 * record (entries + analytics from useMoodSystem) into exactly what the
 * harmonious-dashboard layout shows: the six mood faces, the journey line,
 * the distribution ring, quick insights and the streak. Nothing here invents
 * data; every empty state is honest.
 */

import { EMOTION_MAP, type DayAggregate, type EmotionKey, type MoodEntry } from "./types";
import { MOOD_BUCKETS, bucketOf, moodLabel } from "./analytics";

export type PageMood = "happy" | "calm" | "neutral" | "sad" | "anxious" | "angry";

export const PAGE_MOODS: PageMood[] = ["happy", "calm", "neutral", "sad", "anxious", "angry"];

/**
 * Each face is a real quick check-in: a mood score (1–10), an energy and a
 * stress reading, and the emotion tag Mood Intelligence already understands.
 */
export const PAGE_MOOD_PRESETS: Record<
  PageMood,
  { mood: number; energy: number; stress: number; emotion: EmotionKey }
> = {
  happy: { mood: 8.5, energy: 7, stress: 3, emotion: "happy" },
  calm: { mood: 7.5, energy: 5, stress: 2, emotion: "calm" },
  neutral: { mood: 6, energy: 5, stress: 4, emotion: "neutral" },
  sad: { mood: 3.5, energy: 3, stress: 5, emotion: "sad" },
  anxious: { mood: 4.5, energy: 6, stress: 8, emotion: "anxious" },
  angry: { mood: 3, energy: 7, stress: 8, emotion: "angry" },
};

const FACE_TO_EMOTIONS: Record<PageMood, EmotionKey[]> = {
  happy: ["happy", "excited", "grateful", "confident", "motivated"],
  calm: ["calm", "focused"],
  neutral: ["neutral", "tired"],
  sad: ["sad", "lonely"],
  anxious: ["anxious", "overwhelmed"],
  angry: ["angry", "frustrated"],
};

/** Which face best describes an entry: its tagged emotion first, else its score. */
export function faceForEntry(entry: Pick<MoodEntry, "mood" | "emotions">): PageMood {
  for (const face of PAGE_MOODS) {
    if (entry.emotions.some((e) => FACE_TO_EMOTIONS[face].includes(e))) return face;
  }
  return faceForScore(entry.mood);
}

export function faceForScore(mood: number): PageMood {
  if (mood >= 8) return "happy";
  if (mood >= 6.5) return "calm";
  if (mood >= 5) return "neutral";
  if (mood >= 3.5) return "sad";
  return "anxious";
}

/**
 * The most recent entry logged today (local date), if any. An entry stamped
 * later than now (a time set by hand in the Composer) never hides a fresh
 * check-in: the latest entry up to now wins, then the latest overall.
 */
export function todayEntry(
  entries: MoodEntry[],
  today: string,
  now = new Date(),
): MoodEntry | null {
  const todays = entries.filter((e) => localDay(e.timestamp) === today);
  if (todays.length === 0) return null;
  const nowIso = now.toISOString();
  const past = todays.filter((e) => e.timestamp <= nowIso);
  const pool = past.length ? past : todays;
  return pool.reduce((a, b) => (a.timestamp > b.timestamp ? a : b));
}

export function localDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Build a fresh MoodEntry from a face tap. */
export function entryFromFace(face: PageMood, now = new Date()): MoodEntry {
  const p = PAGE_MOOD_PRESETS[face];
  return {
    id: `m-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: now.toISOString(),
    mood: p.mood,
    energy: p.energy,
    stress: p.stress,
    emotions: [p.emotion],
    tags: ["quick-log"],
  };
}

/* ------------------------------ journey line ----------------------------- */

const FACE_COLOR: Record<PageMood, string> = {
  happy: "var(--mp-happy)",
  calm: "var(--mp-calm)",
  neutral: "var(--mp-neutral)",
  sad: "var(--mp-sad)",
  anxious: "var(--mp-anxious)",
  angry: "var(--mp-angry)",
};

export function faceColor(face: PageMood): string {
  return FACE_COLOR[face];
}

function shortDate(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(dt);
}

/**
 * The last `count` logged days as chart points (0..1). Days are the real
 * per-day aggregates; the colour is the face of the day's dominant emotion.
 */
export function journeyPoints(days: DayAggregate[], count = 7) {
  const recent = [...days].sort((a, b) => a.date.localeCompare(b.date)).slice(-count);
  return recent.map((d) => {
    const face = d.emotions.length
      ? faceForEntry({ mood: d.mood, emotions: d.emotions })
      : faceForScore(d.mood);
    return {
      label: shortDate(d.date),
      value: Math.min(1, Math.max(0, (d.mood - 1) / 9)),
      color: FACE_COLOR[face],
      mood: d.mood,
      date: d.date,
    };
  });
}

/* ------------------------------ distribution ----------------------------- */

const BUCKET_COLOR: Record<(typeof MOOD_BUCKETS)[number]["key"], string> = {
  excellent: "var(--mp-happy)",
  good: "var(--mp-calm)",
  neutral: "var(--mp-neutral)",
  difficult: "var(--mp-sad)",
  "very-difficult": "var(--mp-anxious)",
};

export function distributionSlices(days: DayAggregate[]) {
  return MOOD_BUCKETS.map((b) => ({
    label: b.label,
    value: days.filter((d) => bucketOf(d.mood).key === b.key).length,
    color: BUCKET_COLOR[b.key],
  }));
}

/** One honest sentence about where days have been landing. */
export function distributionNote(days: DayAggregate[], rangeLabel: string): string {
  if (days.length === 0) return "Log a few days and this ring fills in on its own.";
  const slices = distributionSlices(days);
  const top = [...slices].sort((a, b) => b.value - a.value)[0]!;
  const share = Math.round((top.value / days.length) * 100);
  const noun = top.label.toLowerCase();
  if (days.length === 1) return `One day logged so far — it read as ${noun}.`;
  return `${top.label} days are your most common ones — ${share}% of the ${days.length} days logged in the ${rangeLabel.toLowerCase()}.`;
}

/* ------------------------------ insights --------------------------------- */

export type PageInsight = { id: string; text: string; icon: "trend" | "leaf" | "sun" };

const HOUR_BANDS: { label: string; from: number; to: number }[] = [
  { label: "mornings", from: 5, to: 12 },
  { label: "afternoons", from: 12, to: 17 },
  { label: "evenings", from: 17, to: 22 },
  { label: "late nights", from: 22, to: 29 },
];

function bandOfHour(h: number) {
  const hh = h < 5 ? h + 24 : h;
  return HOUR_BANDS.find((b) => hh >= b.from && hh < b.to) ?? HOUR_BANDS[3]!;
}

/**
 * Up to three gentle, evidence-backed observations. Reuses the analytics
 * layer's numbers (average, previous average, volatility) and adds a
 * time-of-day read when there is enough to say something.
 */
export function quickInsights(input: {
  entries: MoodEntry[];
  days: DayAggregate[];
  avg: number;
  prevAvg: number;
  changePct: number | null;
  volatility: number;
  emotions: { label: string; count: number; share: number }[];
}): PageInsight[] {
  const out: PageInsight[] = [];
  const { entries, days } = input;
  if (days.length < 2) return out;

  if (input.changePct !== null && Math.abs(input.changePct) >= 1 && input.prevAvg > 0) {
    const up = input.changePct > 0;
    out.push({
      id: "trend",
      icon: "trend",
      text: up
        ? `Your mood has lifted ${Math.abs(input.changePct).toFixed(0)}% against the previous period. That's a positive sign.`
        : `Your mood has dipped ${Math.abs(input.changePct).toFixed(0)}% against the previous period. Worth a gentle look at what changed.`,
    });
  } else if (days.length >= 5 && input.volatility <= 1.2) {
    out.push({
      id: "stable",
      icon: "trend",
      text: "Your mood has been more stable lately. That's a positive sign.",
    });
  }

  // Time of day: which band reads calmest / brightest.
  const byBand = new Map<string, number[]>();
  for (const e of entries) {
    const h = new Date(e.timestamp).getHours();
    const band = bandOfHour(h).label;
    byBand.set(band, [...(byBand.get(band) ?? []), e.mood]);
  }
  const bands = [...byBand.entries()]
    .filter(([, xs]) => xs.length >= 2)
    .map(([label, xs]) => ({ label, avg: xs.reduce((a, b) => a + b, 0) / xs.length, n: xs.length }))
    .sort((a, b) => b.avg - a.avg);
  if (bands.length >= 2) {
    const best = bands[0]!;
    out.push({
      id: "timing",
      icon: "leaf",
      text: `Your ${best.label.replace(/s$/, "")} check-ins tend to be your brightest moments of the day.`,
    });
  }

  const topEmotion = input.emotions[0];
  if (topEmotion && topEmotion.count >= 2) {
    out.push({
      id: "emotion",
      icon: "sun",
      text: `"${topEmotion.label}" shows up in ${Math.round(topEmotion.share)}% of your entries — your most frequent note this period.`,
    });
  }

  if (out.length < 3 && days.length >= 3) {
    const best = [...days].sort((a, b) => b.mood - a.mood)[0]!;
    out.push({
      id: "best",
      icon: "sun",
      text: `${shortDate(best.date)} was your brightest day of the period — it read as ${moodLabel(best.mood).toLowerCase()}.`,
    });
  }

  return out.slice(0, 3);
}

/* -------------------------------- streak --------------------------------- */

/** Which of the last seven days (oldest → today) have an entry. */
export function weekDots(days: DayAggregate[], today: string): boolean[] {
  const set = new Set(days.map((d) => d.date));
  const [y, m, d] = today.split("-").map(Number);
  const base = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  const out: boolean[] = [];
  for (let i = 6; i >= 0; i--) {
    const dt = new Date(base);
    dt.setDate(base.getDate() - i);
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    out.push(set.has(key));
  }
  return out;
}

/** Days logged this calendar week vs. the week before, as a % change. */
export function consistencyDelta(days: DayAggregate[], today: string): number | null {
  const set = new Set(days.map((d) => d.date));
  const [y, m, d] = today.split("-").map(Number);
  const base = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  const count = (fromOffset: number, toOffset: number) => {
    let c = 0;
    for (let i = fromOffset; i < toOffset; i++) {
      const dt = new Date(base);
      dt.setDate(base.getDate() - i);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
      if (set.has(key)) c++;
    }
    return c;
  };
  const thisWeek = count(0, 7);
  const lastWeek = count(7, 14);
  if (lastWeek === 0) return thisWeek > 0 ? null : null;
  return Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
}

/** A quiet sentence for the streak panel. */
export function streakLine(streak: number, delta: number | null, loggedThisWeek: number): string {
  if (streak === 0 && loggedThisWeek === 0) return "Your first check-in starts the streak.";
  if (delta !== null && delta > 0) return "You've been more consistent this week.";
  if (delta !== null && delta < 0) return "A lighter week — one check-in brings it back.";
  if (streak >= 7) return "A full week, kept up gently.";
  return "Small check-ins, kept up gently.";
}

/** Emotion label for the day's face, for the hero eyebrow. */
export function emotionLabel(key: EmotionKey): string {
  return EMOTION_MAP[key]?.label ?? key;
}
