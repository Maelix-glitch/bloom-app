/**
 * The shared view model for "what a profile looks like" — used by the
 * private page (full), the preview dialog, and other users' public page.
 * One representation; no parallel components.
 */

import type {
  BloomAccent,
  FeaturedMoment,
  HighlightItem,
  ProfileIdentity,
  Story,
} from "@/lib/profile/types";
import { formatRelativeDay } from "@/lib/profile/journey";

export interface FeaturedContent {
  eyebrow: string;
  title: string;
  body?: string | undefined;
  date: string;
  accent: BloomAccent;
}

export interface ProfileViewModel {
  identity: ProfileIdentity;
  stories: Story[];
  highlights: HighlightItem[];
  featured: FeaturedContent | null;
  canBeShared: boolean;
}

export interface FeaturedSources {
  stories: Story[];
  reflections: { id: string; title: string; body: string; date: string; accent: BloomAccent }[];
  rewards: { id: string; title: string; date: string }[];
  milestones: { id: string; label: string; detail: string; achievedAt: string | null }[];
}

export function resolveFeatured(
  featured: FeaturedMoment | null,
  s: FeaturedSources,
): FeaturedContent | null {
  if (!featured) return null;
  if (featured.kind === "story") {
    const story = s.stories.find((x) => x.id === featured.id);
    if (!story) return null;
    return {
      eyebrow: "A shared moment",
      title: story.title || "Untitled moment",
      body: story.body || undefined,
      date: formatRelativeDay(story.createdAt),
      accent: story.accent,
    };
  }
  if (featured.kind === "reflection") {
    const note = s.reflections.find((x) => x.id === featured.id);
    if (!note) return null;
    return {
      eyebrow: "A reflection worth keeping",
      title: note.title,
      body: note.body,
      date: note.date,
      accent: note.accent,
    };
  }
  if (featured.kind === "reward") {
    const reward = s.rewards.find((x) => x.id === featured.id);
    if (!reward) return null;
    return {
      eyebrow: "A reward earned",
      title: reward.title,
      date: reward.date,
      accent: "amber",
    };
  }
  const milestone = s.milestones.find((x) => x.id === featured.id);
  if (!milestone) return null;
  return {
    eyebrow: "A milestone reached",
    title: milestone.label,
    body: milestone.detail,
    date: milestone.achievedAt ? formatRelativeDay(milestone.achievedAt) : "",
    accent: "sage",
  };
}

export function buildViewModel({
  identity,
  allStories,
  highlights,
  privacyPublic,
  sources,
}: {
  identity: ProfileIdentity;
  allStories: Story[];
  highlights: HighlightItem[];
  privacyPublic: boolean;
  sources: FeaturedSources;
}): ProfileViewModel {
  const now = Date.now();
  const shared = privacyPublic
    ? allStories.filter(
        (s) => s.visibility === "public" && !s.deletedAt && new Date(s.expiresAt).getTime() > now,
      )
    : [];

  return {
    identity,
    stories: shared,
    highlights: privacyPublic ? highlights : [],
    featured: resolveFeatured(privacyPublic ? identity.featured : null, sources),
    canBeShared: privacyPublic,
  };
}
