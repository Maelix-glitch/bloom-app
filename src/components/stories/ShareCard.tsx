/**
 * ShareCard — Bloom's visual cards for real achievements.
 * Milestones, rewards, and consistency moments become editorial mini-cards
 * that preview exactly the story they'll become. Builders produce the
 * editor source; only events that actually happened can be shared.
 */

import { StickerArt } from "@/lib/stories/stickers";
import { STORY_BACKGROUNDS } from "@/lib/stories/catalogs";
import type { Milestone } from "@/lib/profile/types";
import type { RewardRecord } from "@/lib/profile/journey";
import type { EditorSource } from "./StoryEditor";
import { cn } from "@/lib/utils";

function backgroundCss(id: string): { css: string; ink: string } {
  const found = STORY_BACKGROUNDS.find((b) => b.id === id);
  const fallback = STORY_BACKGROUNDS[0];
  return { css: found?.css ?? fallback?.css ?? "#000", ink: found?.ink ?? fallback?.ink ?? "#f4efe4" };
}

export function BloomShareCard({
  eyebrow,
  title,
  body,
  backgroundId,
  stickerId,
  compact = false,
  className,
}: {
  eyebrow: string;
  title: string;
  body?: string | undefined;
  backgroundId: string;
  stickerId?: string | undefined;
  compact?: boolean | undefined;
  className?: string | undefined;
}) {
  const bg = backgroundCss(backgroundId);
  return (
    <span
      className={cn(
        "relative flex w-full flex-col justify-between overflow-hidden rounded-2xl border border-border text-left",
        compact ? "aspect-[4/5] p-3" : "aspect-[9/13] p-4",
        className,
      )}
      style={{ background: bg.css }}
    >
      <span>
        <span
          className="mono block uppercase"
          style={{
            color: bg.ink,
            opacity: 0.7,
            fontSize: compact ? 8.5 : 10,
            letterSpacing: "0.14em",
          }}
        >
          {eyebrow}
        </span>
        <span
          className="display mt-1.5 block leading-snug"
          style={{ color: bg.ink, fontSize: compact ? 14 : 19 }}
        >
          {title}
        </span>
        {body && !compact ? (
          <span
            className="mt-1.5 block text-[12px] leading-relaxed"
            style={{ color: bg.ink, opacity: 0.8 }}
          >
            {body}
          </span>
        ) : null}
      </span>
      {stickerId ? (
        <span className="flex justify-end" aria-hidden>
          <StickerArt id={stickerId} size={compact ? 44 : 64} />
        </span>
      ) : null}
      <span
        className="display pointer-events-none absolute -bottom-3 left-3 select-none text-[64px] italic leading-none opacity-[0.08]"
        style={{ color: bg.ink }}
        aria-hidden
      >
        Bloom
      </span>
    </span>
  );
}

/* ------------------------------ source builders ------------------------- */

export function shareSourceForMilestone(milestone: Milestone): EditorSource {
  return {
    base: "background",
    backgroundId: "garden",
    storyKind: "milestone",
    source: { kind: "milestone", id: milestone.id },
    accent: "sage",
    captionTitle: milestone.label,
    captionBody: milestone.detail,
  };
}

export function shareSourceForReward(reward: RewardRecord): EditorSource {
  return {
    base: "background",
    backgroundId: "golden-hour",
    storyKind: "reward",
    source: { kind: "reward", id: reward.id },
    accent: "amber",
    captionTitle: reward.title,
    captionBody: "Something earned and kept.",
  };
}

export function shareSourceForStreak(days: number, label: string): EditorSource {
  return {
    base: "background",
    backgroundId: "quiet-room",
    storyKind: "win",
    accent: "amber",
    captionTitle: `${days} days. You kept showing up.`,
    captionBody: label,
  };
}
