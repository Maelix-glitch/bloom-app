/**
 * StoryAvatar — the one avatar-with-ring in the story system.
 * The rail, profile hero, viewer header, and highlight covers all share this
 * so the ring never drifts between implementations.
 */

import { Plus } from "lucide-react";

import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { StoryRing, type StoryRingState } from "@/components/profile/StoryRing";
import type { BloomAccent } from "@/lib/profile/types";
import { cn } from "@/lib/utils";

export function StoryAvatar({
  name,
  avatarPath,
  accent,
  size = 64,
  ring = "none",
  closeFriends = false,
  animateIn = false,
  pulse = false,
  showAdd = false,
  onClick,
  label,
  className,
}: {
  name: string;
  avatarPath: string | null;
  accent: BloomAccent;
  size?: number | undefined;
  ring?: StoryRingState | undefined;
  closeFriends?: boolean | undefined;
  animateIn?: boolean | undefined;
  pulse?: boolean | undefined;
  showAdd?: boolean | undefined;
  onClick?: (() => void) | undefined;
  label?: string | undefined;
  className?: string | undefined;
}) {
  const content = (
    <StoryRing
      state={ring}
      size={size}
      accent={accent}
      animateIn={animateIn}
      pulse={pulse}
      tone={closeFriends ? "close" : "bloom"}
      className={className}
    >
      <span className="relative inline-block">
        <ProfileAvatar
          name={name}
          avatarPath={avatarPath}
          accent={accent}
          size={size}
          ring="none"
        />
        {showAdd ? (
          <span className="srail-add" aria-hidden>
            <Plus className="size-3.5" strokeWidth={2.6} />
          </span>
        ) : null}
      </span>
    </StoryRing>
  );

  if (!onClick) return content;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label ?? `Open ${name}'s stories`}
      className={cn("rounded-full outline-none transition-transform active:scale-95")}
    >
      {content}
    </button>
  );
}
