/**
 * StoryComposer — the creation ritual, now powered by the Story Platform.
 * Same public contract the Profile route has always used (open, sources,
 * onPublish, onClose); inside, the full creator: camera, gallery, text,
 * templates, From-Bloom sources, and the canvas editor.
 */

import { useEffect, useState } from "react";

import { StoryCreator } from "./StoryCreator";
import type { MoodEntry } from "@/lib/mood/types";
import type { RewardRecord } from "@/lib/profile/journey";
import type { BloomAccent, Milestone, StoryVisibility } from "@/lib/profile/types";
import type { StoryAudience } from "@/lib/stories/types";
import { getStorySettings } from "@/lib/stories/interactions";
import type { CreateStoryInput } from "@/lib/profile/storyService";

export function StoryComposer({
  open,
  userId,
  defaultAccent,
  defaultVisibility,
  moodEntries,
  rewards,
  milestones,
  initialSource = null,
  initialMilestone = null,
  initialReward = null,
  onPublish,
  onClose,
}: {
  open: boolean;
  userId: string;
  defaultAccent: BloomAccent;
  defaultVisibility: StoryVisibility;
  moodEntries: MoodEntry[];
  rewards: RewardRecord[];
  milestones: Milestone[];
  initialSource?: { kind: "mood" | "reflection"; id: string } | null;
  initialMilestone?: Milestone | null;
  initialReward?: RewardRecord | null;
  onPublish: (input: CreateStoryInput) => Promise<void>;
  onClose: () => void;
}) {
  const [audience, setAudience] = useState<StoryAudience>("all");

  useEffect(() => {
    if (!open) return;
    let alive = true;
    void getStorySettings(userId === "preview" ? null : userId).then((s) => {
      if (alive) setAudience(s.defaultAudience);
    });
    return () => {
      alive = false;
    };
  }, [open, userId]);

  if (!open) return null;

  return (
    <StoryCreator
      userId={userId}
      defaultAccent={defaultAccent}
      defaultVisibility={defaultVisibility}
      defaultAudience={audience}
      moodEntries={moodEntries}
      rewards={rewards}
      milestones={milestones}
      initialSource={initialSource}
      initialMilestone={initialMilestone}
      initialReward={initialReward}
      onPublish={onPublish}
      onClose={onClose}
    />
  );
}
