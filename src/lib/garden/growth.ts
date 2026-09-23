/**
 * Bloom Garden — derived view, never invented.
 * Pure function, reads real records only. No DB table.
 */

import { currentStreak } from "@/lib/mood/analytics";

export type GardenStage = "seed" | "sprout" | "budding" | "bloom" | "flourish" | "keeper";
export type GardenHealth = number; // 0..1

export interface GardenState {
  stage: GardenStage;
  health: GardenHealth;
  petals: number;
  sprouts: number;
  blooms: number;
  streak: number;
  wilting: boolean;
  label: string;
}

function stageFor(petals: number, streak: number): GardenStage {
  const score = petals + streak * 2;
  if (score >= 40) return "keeper";
  if (score >= 28) return "flourish";
  if (score >= 16) return "bloom";
  if (score >= 8) return "budding";
  if (score >= 3) return "sprout";
  return "seed";
}

const STAGE_LABEL: Record<GardenStage, string> = {
  seed: "Seed",
  sprout: "Sprout",
  budding: "Budding",
  bloom: "Bloom",
  flourish: "Flourish",
  keeper: "Keeper",
};

export function gardenState(input: {
  habits?: { id: string }[];
  habitLogs?: { date: string; completed?: boolean }[];
  trackerDays?: { date: string }[];
  moodEntries?: { date: string; value?: number }[];
}): GardenState {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - 6);
  const startStr = startOfWeek.toISOString().slice(0, 10);

  const habitLogs = input.habitLogs ?? [];
  const trackerDays = input.trackerDays ?? [];
  const moodEntries = input.moodEntries ?? [];

  // habits done this week (completed logs)
  const habitsDone = habitLogs.filter((l) => l.date >= startStr && l.completed !== false).length;
  // tracker days with any data this week
  const trackersMet = trackerDays.filter((d) => d.date >= startStr).length;

  // streak from mood entries (reuse analytics logic if available, fallback)
  let streak = 0;
  try {
    // aggregateDays expects DayEntry shape, we approximate
    const days = moodEntries.map((e) => ({ date: e.date, value: e.value ?? 3 }));
    // @ts-ignore - tolerate missing fn
    streak = typeof currentStreak === "function" ? currentStreak(days as any) : 0;
  } catch {
    streak = 0;
  }

  const petals = habitsDone * 2 + trackersMet;
  const stage = stageFor(petals, streak);

  // health: high streak + consistent logs = healthy, wilts if no log 2 days
  const lastLog = [...habitLogs, ...trackerDays].sort((a, b) => b.date.localeCompare(a.date))[0]?.date;
  const daysSinceLast = lastLog ? (Date.now() - new Date(lastLog).getTime()) / 86400000 : 99;
  const wilting = daysSinceLast > 2 && petals < 6;
  const health = wilting ? 0.45 : Math.min(1, 0.6 + streak * 0.08 + petals * 0.02);

  return {
    stage,
    health,
    petals,
    sprouts: Math.min(5, Math.floor(petals / 4)),
    blooms: stage === "bloom" || stage === "flourish" || stage === "keeper" ? 1 : 0,
    streak,
    wilting,
    label: STAGE_LABEL[stage],
  };
}

export const GARDEN_COPY: Record<GardenStage, string> = {
  seed: "Your garden is listening. One log and it stirs.",
  sprout: "A sprout — you showed up.",
  budding: "Budding. Keep the rhythm.",
  bloom: "In bloom. Your week is breathing.",
  flourish: "Flourishing — this is your season.",
  keeper: "Keeper’s garden — you tend what you’ve grown.",
};
