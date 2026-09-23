/**
 * Pure garden logic — no Discord, no I/O. Everything here is deterministic so
 * it can be unit-tested and reused by the bot, the setup script and the preview.
 *
 * The same convictions as the app apply: nothing is invented. A streak is the
 * run of consecutive days someone actually checked in *in this server*; a rank
 * is the number of days they actually showed up. Missing a day is not a
 * failure state — the garden just starts counting again.
 */

/* --------------------------------- time ---------------------------------- */

/** `YYYY-MM-DD` for `date` as seen in `tz`. */
export function dayKey(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Hour (0–23) for `date` as seen in `tz`. */
export function hourIn(date: Date, tz: string): number {
  const h = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hourCycle: "h23" }).format(date);
  return Number(h) % 24;
}

function keyToUTC(key: string): number {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d);
}

/** Whole days between two day keys (b − a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((keyToUTC(b) - keyToUTC(a)) / 86_400_000);
}

/** Day key shifted by `n` days. */
export function shiftDay(key: string, n: number): string {
  return new Date(keyToUTC(key) + n * 86_400_000).toISOString().slice(0, 10);
}

/** ISO-8601 week id (`2026-W39`) for a day key. Weeks start on Monday. */
export function weekKey(key: string): string {
  const t = new Date(keyToUTC(key));
  const dow = (t.getUTCDay() + 6) % 7; // Mon=0
  t.setUTCDate(t.getUTCDate() - dow + 3); // Thursday of this week
  const year = t.getUTCFullYear();
  const week = 1 + Math.floor((t.getTime() - Date.UTC(year, 0, 1)) / 86_400_000 / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/* ------------------------------- midnight -------------------------------- */

export const MIDNIGHT_OPENS = 22;
export const MIDNIGHT_CLOSES = 5;

/** 🌙・midnight-bloom is open from 22:00 until 05:00 local garden time. */
export function isMidnightOpen(date: Date, tz: string): boolean {
  const h = hourIn(date, tz);
  return h >= MIDNIGHT_OPENS || h < MIDNIGHT_CLOSES;
}

/* -------------------------------- streaks -------------------------------- */

export interface StreakSummary {
  /** Consecutive days up to and including today (or yesterday — still alive). */
  current: number;
  longest: number;
  total: number;
  checkedInToday: boolean;
}

/** `days` may be unsorted and contain duplicates. */
export function summarize(days: readonly string[], today: string): StreakSummary {
  const sorted = [...new Set(days)].sort();
  let longest = 0;
  let run = 0;
  let prev: string | undefined;
  for (const d of sorted) {
    run = prev && daysBetween(prev, d) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  const last = sorted.at(-1);
  // A streak stays alive through today: if you checked in yesterday and not yet
  // today, it is still yours until the day ends.
  const alive = last !== undefined && daysBetween(last, today) <= 1 && daysBetween(last, today) >= 0;
  return {
    current: alive ? run : 0,
    longest,
    total: sorted.length,
    checkedInToday: last === today,
  };
}

/** Streak lengths that earn a quiet mention in 🔥・streaks. */
export const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365] as const;

export function isMilestone(streak: number): boolean {
  return (STREAK_MILESTONES as readonly number[]).includes(streak) || (streak > 365 && streak % 365 === 0);
}

/* --------------------------------- ranks --------------------------------- */

/**
 * Garden ranks borrow names from the app's own ladder (src/lib/progression/
 * ranks.ts) but are earned here by *days shown up*, not points — the Discord
 * can't see app data and must not pretend to.
 */
export interface GardenRank {
  key: string;
  name: string;
  days: number;
  color: number;
  affirmation: string;
}

export const GARDEN_RANKS: readonly GardenRank[] = [
  { key: "seedling", name: "Seedling", days: 0, color: 0x83ad91, affirmation: "Everything begins quietly. You began." },
  { key: "sprout", name: "Sprout", days: 7, color: 0x9fc8a8, affirmation: "Small days, stacked. Look what they grew into." },
  { key: "budding", name: "Budding", days: 30, color: 0xcf8fa7, affirmation: "Something is taking shape here." },
  { key: "in-bloom", name: "In Bloom", days: 100, color: 0xa590d9, affirmation: "This is what consistency looks like when it opens." },
  { key: "evergreen", name: "Evergreen", days: 365, color: 0xecca8e, affirmation: "Seasons changed. You stayed." },
];

export function rankForDays(total: number): GardenRank {
  let rank = GARDEN_RANKS[0]!;
  for (const r of GARDEN_RANKS) if (total >= r.days) rank = r;
  return rank;
}

export function nextRank(total: number): GardenRank | undefined {
  return GARDEN_RANKS.find((r) => r.days > total);
}

/* ------------------------------- feelings -------------------------------- */

export interface Feeling {
  key: string;
  emoji: string;
  label: string;
  /** How the card reads: "<name> is {phrase} today". */
  phrase: string;
  color: number;
}

export const FEELINGS: readonly Feeling[] = [
  { key: "blooming", emoji: "🌸", label: "Blooming", phrase: "blooming", color: 0xcf8fa7 },
  { key: "steady", emoji: "🌿", label: "Steady", phrase: "feeling steady", color: 0x83ad91 },
  { key: "growing", emoji: "🌱", label: "Growing", phrase: "growing through it", color: 0x9fc8a8 },
  { key: "cloudy", emoji: "🌧️", label: "Cloudy", phrase: "a little cloudy", color: 0x7fa5ce },
  { key: "resting", emoji: "🌙", label: "Resting", phrase: "resting", color: 0xa590d9 },
];

export function feeling(key: string): Feeling | undefined {
  return FEELINGS.find((f) => f.key === key);
}

/* ------------------------------ progress bar ----------------------------- */

/** A soft, text-only progress bar: `🌸🌸🌸🌱🌱🌱🌱🌱🌱🌱`. */
export function gardenBar(value: number, goal: number, width = 10): string {
  const ratio = goal <= 0 ? 0 : Math.min(1, value / goal);
  const filled = Math.round(ratio * width);
  return "🌸".repeat(filled) + "🌱".repeat(width - filled);
}
