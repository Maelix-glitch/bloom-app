/**
 * Bloom — the journey layer. Everything here is derived from real records
 * (mood entries, claimed rewards, stories, highlights). Nothing is invented:
 * if a milestone hasn't happened, it simply isn't shown.
 */

import { aggregateDays, currentStreak } from "@/lib/mood/analytics";
import type { MoodEntry } from "@/lib/mood/types";
import type {
  ActivityEntry,
  HighlightItem,
  Milestone,
  ProfileIdentity,
  ProfileStats,
  Story,
} from "./types";

export interface RewardRecord {
  id: string;
  title: string;
  claimed_at: string | null;
}

export interface JourneyInput {
  entries: MoodEntry[];
  rewards: RewardRecord[];
  stories: Story[];
  highlights: HighlightItem[];
  memberSince: string | null;
}

const DAY = 86_400_000;
const dayKey = (iso: string) => iso.slice(0, 10);

export function computeStats(input: JourneyInput): ProfileStats {
  const days = new Set(input.entries.map((e) => dayKey(e.timestamp)));
  return {
    daysTracked: days.size,
    checkIns: input.entries.length,
    streak: input.entries.length ? currentStreak(aggregateDays(input.entries)) : 0,
    rewardsEarned: input.rewards.filter((r) => r.claimed_at).length,
  };
}

interface MilestoneDef {
  id: string;
  label: string;
  detail: string;
  /** Earliest moment the milestone became true, or null. */
  achievedAt(input: JourneyInput, days: Set<string>): string | null;
}

const FIRST_OF = (dates: string[]): string | null =>
  dates.length ? ([...dates].sort()[0] ?? null) : null;

const MILESTONE_DEFS: MilestoneDef[] = [
  {
    id: "first-checkin",
    label: "First check-in",
    detail: "The day the record began.",
    achievedAt: (i) => FIRST_OF(i.entries.map((e) => e.timestamp)),
  },
  {
    id: "first-reflection",
    label: "First reflection",
    detail: "Your first words about how it felt.",
    achievedAt: (i) =>
      FIRST_OF(i.entries.filter((e) => e.note && e.note.trim().length > 0).map((e) => e.timestamp)),
  },
  {
    id: "days-7",
    label: "7 days tracked",
    detail: "A week of showing up.",
    achievedAt: (i, days) =>
      days.size >= 7
        ? dayKey(
            [...i.entries].sort((a, b) => a.timestamp.localeCompare(b.timestamp))[
              i.entries.length - 7
            ]!.timestamp,
          )
        : null,
  },
  {
    id: "days-30",
    label: "30 days tracked",
    detail: "A month in your own company.",
    achievedAt: (i, days) =>
      days.size >= 30
        ? dayKey(
            [...i.entries].sort((a, b) => a.timestamp.localeCompare(b.timestamp))[
              i.entries.length - 30
            ]!.timestamp,
          )
        : null,
  },
  {
    id: "first-reward",
    label: "First reward",
    detail: "Something earned, then kept.",
    achievedAt: (i) => FIRST_OF(i.rewards.filter((r) => r.claimed_at).map((r) => r.claimed_at!)),
  },
  {
    id: "first-story",
    label: "First story",
    detail: "The first moment you chose to keep in the open.",
    achievedAt: (i) => FIRST_OF(i.stories.map((s) => s.createdAt)),
  },
  {
    id: "first-highlight",
    label: "First highlight",
    detail: "The first thing you decided to keep forever.",
    achievedAt: (i) => (i.highlights.length ? i.highlights[0]!.createdAt : null),
  },
  {
    id: "checkins-100",
    label: "100 check-ins",
    detail: "A hundred quiet acts of attention.",
    achievedAt: (i) =>
      i.entries.length >= 100
        ? [...i.entries].sort((a, b) => a.timestamp.localeCompare(b.timestamp))[
            i.entries.length - 100
          ]!.timestamp
        : null,
  },
];

export function computeMilestones(input: JourneyInput): {
  achieved: Milestone[];
  next: { label: string; progress: number; of: number } | null;
} {
  const days = new Set(input.entries.map((e) => dayKey(e.timestamp)));

  const achieved: Milestone[] = [];
  let next: { label: string; progress: number; of: number } | null = null;

  for (const def of MILESTONE_DEFS) {
    const at = def.achievedAt(input, days);
    if (at) {
      achieved.push({ id: def.id, label: def.label, detail: def.detail, achievedAt: at });
    } else if (!next) {
      if (def.id === "days-7") next = { label: def.label, progress: days.size, of: 7 };
      if (def.id === "days-30") next = { label: def.label, progress: days.size, of: 30 };
      if (def.id === "checkins-100")
        next = { label: def.label, progress: input.entries.length, of: 100 };
    }
  }

  return { achieved, next };
}

export function computeActivity(input: JourneyInput): ActivityEntry[] {
  const items: ActivityEntry[] = [];

  for (const story of input.stories.slice(0, 12)) {
    items.push({
      id: `story-${story.id}`,
      tone: "story",
      text: story.title ? `Shared a story — ${story.title}` : "Shared a story",
      at: story.createdAt,
    });
  }

  for (const entry of input.entries.slice(-24).reverse()) {
    const hasNote = Boolean(entry.note?.trim());
    items.push({
      id: `mood-${entry.id}`,
      tone: "mood",
      text: hasNote ? "Wrote a reflection" : "Recorded a mood",
      detail: hasNote
        ? entry.note!.trim()
        : `${Math.round(entry.mood)}/10 · ${entry.emotions[0] ?? "neutral"}`,
      at: entry.timestamp,
    });
  }

  for (const reward of input.rewards) {
    if (reward.claimed_at) {
      items.push({
        id: `reward-${reward.id}`,
        tone: "reward",
        text: `Earned “${reward.title}”`,
        at: reward.claimed_at,
      });
    }
  }

  for (const highlight of input.highlights) {
    items.push({
      id: `highlight-${highlight.id}`,
      tone: "highlight",
      text: `Created the highlight “${highlight.name}”`,
      at: highlight.createdAt,
    });
  }

  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 10);
}

export interface Completeness {
  done: number;
  total: number;
  /** Only surfaced while the space is still forming. */
  show: boolean;
}

export function computeCompleteness(
  identity: Pick<ProfileIdentity, "displayName" | "username" | "bio" | "avatarPath" | "featured">,
  hasStories: boolean,
): Completeness {
  const checks = [
    identity.displayName.trim().length > 0 && identity.displayName.trim() !== "Bloom User",
    Boolean(identity.avatarPath),
    Boolean(identity.bio?.trim()),
    Boolean(identity.username),
    hasStories || Boolean(identity.featured),
  ];
  const done = checks.filter(Boolean).length;
  return { done, total: checks.length, show: done > 0 && done < checks.length };
}

/** "6h left" — time before a story stops showing on the rail (real data). */
export function formatRemaining(expiresAt: string, now: number = Date.now()): string | null {
  const left = new Date(expiresAt).getTime() - now;
  if (left <= 0) return null;
  if (left < 60 * 60_000) return `${Math.max(1, Math.floor(left / 60_000))}m left`;
  if (left < 6 * 3600_000) return `${Math.round(left / 3600_000)}h left`;
  return null;
}

export function formatRelativeDay(iso: string, now: number = Date.now()): string {
  const t = new Date(iso).getTime();
  const diff = now - t;
  if (diff < 0) return "today";
  if (diff < DAY) {
    const hours = Math.floor(diff / 3_600_000);
    if (hours < 1) {
      const mins = Math.max(1, Math.floor(diff / 60_000));
      return `${mins} min ago`;
    }
    return `${hours} h ago`;
  }
  if (diff < 2 * DAY) return "yesterday";
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)} days ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export type ArchiveGroup = { label: string; stories: Story[] };

/** Groups for the private Story archive: Today, Yesterday, This month, years. */
export function groupStories(stories: Story[], now = Date.now()): ArchiveGroup[] {
  const DAY = 86_400_000;
  const buckets = new Map<string, Story[]>();
  const put = (label: string, story: Story) => {
    const list = buckets.get(label) ?? [];
    list.push(story);
    buckets.set(label, list);
  };

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  for (const story of stories) {
    const t = new Date(story.createdAt).getTime();
    const ageDays = (startOfToday.getTime() - t) / DAY;
    if (t >= startOfToday.getTime()) put("Today", story);
    else if (ageDays < 1) put("Yesterday", story);
    else if (t >= startOfToday.getTime() - 30 * DAY) put("This month", story);
    else put(String(new Date(t).getFullYear()), story);
  }

  const order = ["Today", "Yesterday", "This month"];
  const yearLabels = [...buckets.keys()]
    .filter((k) => !order.includes(k))
    .sort((a, b) => Number(b) - Number(a));

  return [...order, ...yearLabels]
    .filter((label) => buckets.has(label))
    .map((label) => ({ label, stories: buckets.get(label) ?? [] }));
}
