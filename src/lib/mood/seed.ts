import type { EmotionKey, MoodEntry, Weather } from "./types";

/**
 * Optional demo dataset. Never generated silently — the user opts in from the
 * empty state so analytics are always backed by data they know the origin of.
 */

let seed = 20260820;
function rnd() {
  // Deterministic LCG so the demo dataset is reproducible.
  seed = (seed * 1103515245 + 12345) % 2 ** 31;
  return seed / 2 ** 31;
}
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rnd() * arr.length)]!;
const between = (a: number, b: number) => a + rnd() * (b - a);
const clamp = (v: number, lo = 1, hi = 10) => Math.min(hi, Math.max(lo, Math.round(v * 10) / 10));

const POSITIVE: EmotionKey[] = ["happy", "calm", "focused", "motivated", "grateful", "confident", "excited"];
const NEGATIVE: EmotionKey[] = ["tired", "anxious", "sad", "frustrated", "overwhelmed", "lonely", "angry"];
const WEATHER: Weather[] = ["clear", "cloudy", "rain", "storm", "fog"];
const TAGS = ["work", "deep-work", "family", "training", "travel", "rest", "social", "study", "outdoors"];
const NOTES = [
  "Finished an important project.",
  "Long day, but the hard part is behind me.",
  "Morning run reset everything.",
  "Too many meetings — no deep work.",
  "Slept badly and felt it all day.",
  "Quiet evening, read for an hour.",
  "Shipped the thing I had been avoiding.",
  "Felt scattered, hard to focus.",
];

export function generateDemoEntries(days = 118): MoodEntry[] {
  const out: MoodEntry[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let d = days - 1; d >= 0; d--) {
    const date = new Date(today);
    date.setDate(date.getDate() - d);
    const weekday = date.getDay();

    // Skip some days so logging consistency is realistic.
    if (rnd() < 0.14) continue;

    const weekendLift = weekday === 0 || weekday === 6 ? 0.55 : 0;
    const drift = ((days - d) / days) * 0.9; // slow long-term improvement
    const sleep = clamp(between(5.2, 8.9), 4, 10);
    const exercise = rnd() < 0.55 ? Math.round(between(15, 75)) : 0;
    const screenTime = clamp(between(2.5, 8.5), 1, 12);
    const workload = clamp(between(2, 9));

    const base =
      5.6 +
      drift +
      weekendLift +
      (sleep - 7) * 0.42 +
      (exercise > 20 ? 0.5 : -0.1) +
      (screenTime > 6 ? -0.35 : 0.15) +
      (workload > 7 ? -0.4 : 0.1) +
      between(-0.6, 0.6);

    const dayMood = clamp(base);
    const entryCount = rnd() < 0.45 ? 3 : rnd() < 0.7 ? 2 : 1;
    const hours = [between(7.5, 10.5), between(12, 16.5), between(18, 22)];

    for (let i = 0; i < entryCount; i++) {
      const hour = hours[i] ?? between(9, 21);
      const ts = new Date(date);
      ts.setHours(Math.floor(hour), Math.floor((hour % 1) * 60), 0, 0);
      const mood = clamp(dayMood + between(-0.7, 0.7) + (hour > 17 ? 0.25 : 0));
      const stress = clamp(11 - mood + between(-1.4, 1.4));
      const energy = clamp(mood * 0.7 + (sleep - 6) * 0.5 + between(-0.8, 0.8));
      const emotions: EmotionKey[] = [];
      emotions.push(mood >= 6.5 ? pick(POSITIVE) : pick(NEGATIVE));
      if (rnd() < 0.6) emotions.push(mood >= 6 ? pick(POSITIVE) : pick(NEGATIVE));
      if (rnd() < 0.25) emotions.push(pick(POSITIVE));

      out.push({
        id: `demo-${ts.getTime()}-${i}`,
        timestamp: ts.toISOString(),
        mood,
        energy,
        stress,
        emotions: [...new Set(emotions)],
        tags: rnd() < 0.6 ? [pick(TAGS)] : [],
        ...(rnd() < 0.4 ? { note: pick(NOTES) } : {}),
        sleep,
        sleepQuality: clamp(sleep * 1.1 + between(-1.5, 1.5)),
        exercise,
        steps: Math.round(between(2500, 14000)),
        productivity: clamp(mood * 0.8 + between(-1.2, 1.6)),
        study: rnd() < 0.4 ? Math.round(between(20, 150)) : 0,
        screenTime,
        social: clamp(between(1, 9)),
        weather: pick(WEATHER),
        workload,
      });
    }
  }
  return out;
}
