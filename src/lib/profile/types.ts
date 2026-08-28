/**
 * Bloom — Profile 2.0 domain types.
 * These mirror the shape enforced by supabase/migrations/20260828_profile_identity_stories.sql.
 */

export type BloomAccent = "violet" | "sky" | "amber" | "sage" | "rose";

export const BLOOM_ACCENTS: readonly BloomAccent[] = ["violet", "sky", "amber", "sage", "rose"];

export const ACCENT_LABELS: Record<BloomAccent, string> = {
  violet: "Lavender",
  sky: "Soft Blue",
  amber: "Warm Gold",
  sage: "Sage",
  rose: "Rose",
};

/** Every story kind we can render. Each maps to a composer mode. */
export type StoryKind = "text" | "photo" | "mood" | "reflection" | "win" | "reward" | "milestone";

export type StoryVisibility = "private" | "public";

export interface Story {
  id: string;
  kind: StoryKind;
  title: string;
  body: string;
  mediaPath: string | null;
  mediaWidth: number | null;
  mediaHeight: number | null;
  accent: BloomAccent;
  createdAt: string;
  expiresAt: string;
  visibility: StoryVisibility;
  deletedAt: string | null;
  /** How much of the dwell time has been watched (0–1). */
  seen?: boolean;
}

/** Stories older than the rail but kept privately. */
export type ArchivedStory = Story;

export interface StoryDraft {
  kind: StoryKind;
  title: string;
  body: string;
  accent: BloomAccent;
  visibility: StoryVisibility;
  /** Pending local photo (data URL) before upload. */
  photo: LocalImage | null;
  /** When composing from existing Bloom data, the source it came from. */
  source: { kind: "mood" | "reward" | "milestone"; id: string } | null;
}

export interface LocalImage {
  /** data: URL preview of the processed image. */
  dataUrl: string;
  width: number;
  height: number;
  /** Encoded bytes for upload. */
  blob: Blob;
}

export interface HighlightItem {
  id: string;
  name: string;
  accent: BloomAccent;
  stories: Story[];
  createdAt: string;
}

export interface ProfileIdentity {
  displayName: string;
  username: string | null;
  bio: string | null;
  avatarPath: string | null;
  accent: BloomAccent;
  featured: FeaturedMoment | null;
}

export interface ProfilePrivacy {
  profileVisibility: StoryVisibility;
  storyVisibility: StoryVisibility;
}

export type FeaturedMoment =
  | { kind: "story"; id: string }
  | { kind: "reflection"; id: string }
  | { kind: "reward"; id: string }
  | { kind: "milestone"; id: string };

export interface AccountDetails {
  email: string | null;
  memberSince: string | null;
}

export interface ProfileStats {
  daysTracked: number;
  checkIns: number;
  streak: number;
  rewardsEarned: number;
}

export interface Milestone {
  id: string;
  label: string;
  detail: string;
  achievedAt: string | null;
}

export interface JourneyState {
  stats: ProfileStats;
  milestones: Milestone[];
  nextMilestone: { label: string; progress: number; of: number } | null;
  activity: ActivityEntry[];
}

export type ActivityTone = "mood" | "story" | "reward" | "milestone" | "highlight";

export interface ActivityEntry {
  id: string;
  tone: ActivityTone;
  text: string;
  detail?: string;
  at: string;
}

export interface PublicProfile {
  displayName: string;
  username: string;
  bio: string | null;
  avatarUrl: string | null;
  accent: BloomAccent;
  featured: FeaturedMoment | null;
  stories: Story[];
  highlights: HighlightItem[];
}

export type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "error"; message: string };

/** Duration a story rests on screen, in ms. */
export const STORY_DWELL_MS: Record<StoryKind, number> = {
  text: 7000,
  photo: 6000,
  mood: 7000,
  reflection: 9000,
  win: 6000,
  reward: 7000,
  milestone: 6000,
};

export const STORY_TTL_HOURS = 24;

export const STORY_KIND_LABELS: Record<StoryKind, string> = {
  text: "Text",
  photo: "Photo",
  mood: "Mood",
  reflection: "Reflection",
  win: "Small win",
  reward: "Reward",
  milestone: "Milestone",
};

export function isStoryActive(story: Story, now: number = Date.now()): boolean {
  if (story.deletedAt) return false;
  return new Date(story.expiresAt).getTime() > now;
}

export function normalizeAccent(value: unknown, fallback: BloomAccent = "violet"): BloomAccent {
  return typeof value === "string" && (BLOOM_ACCENTS as readonly string[]).includes(value)
    ? (value as BloomAccent)
    : fallback;
}

export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "B";
  if (parts.length === 1) return (parts[0] ?? "B").slice(0, 1).toUpperCase();
  return `${(parts[0] ?? "").slice(0, 1)}${(parts[parts.length - 1] ?? "").slice(0, 1)}`.toUpperCase();
}
