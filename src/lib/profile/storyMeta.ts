/**
 * Shared metadata for story kinds — one definition for the viewer, the
 * composer, and archive labels.
 */

import { CloudSun, Flag, Gift, NotebookPen, Sprout, type LucideIcon } from "lucide-react";

import type { Story } from "./types";
import { objectUrl } from "./profileService";

export const STORY_KIND_META: Record<Story["kind"], { label: string; icon: LucideIcon | null }> = {
  text: { label: "A note", icon: null },
  photo: { label: "A photo", icon: null },
  mood: { label: "Mood", icon: CloudSun },
  reflection: { label: "Reflection", icon: NotebookPen },
  win: { label: "Small win", icon: Sprout },
  reward: { label: "Reward", icon: Gift },
  milestone: { label: "Milestone", icon: Flag },
};

export function storyMediaUrl(story: Pick<Story, "mediaPath">): string | null {
  return objectUrl(story.mediaPath ?? null);
}
