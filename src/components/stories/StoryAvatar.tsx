/**
 * StoryAvatar — Instagram-exact avatar with ring and + badge.
 *
 * Instagram specs:
 * - Avatar 56px (rail) / 32px (viewer header) / 96px+ (profile)
 * - Ring handled by StoryRing (gradient for unseen, gray for seen)
 * - Your story + badge: 20px blue circle (#0095f6) with white plus, 2px white border, bottom-right overlap
 * - For rail: showAdd displays the + badge (Instagram style)
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
  const isRailSize = size <= 70;
  const badgeSize = isRailSize ? 20 : 22;

  const content = (
    <span className={cn("relative inline-block", className)}>
      <StoryRing
        state={ring}
        size={size}
        accent={accent}
        animateIn={animateIn}
        pulse={pulse}
        tone={closeFriends ? "close" : "bloom"}
      >
        <ProfileAvatar
          name={name}
          avatarPath={avatarPath}
          accent={accent}
          size={size}
          ring="none"
        />
      </StoryRing>

      {showAdd ? (
        <span
          className="ig-add-badge"
          aria-hidden
          style={{
            width: badgeSize,
            height: badgeSize,
            bottom: isRailSize ? 2 : 0,
            right: isRailSize ? 2 : 0,
          }}
        >
          <Plus className="size-[12px]" strokeWidth={3} />
        </span>
      ) : null}
    </span>
  );

  if (!onClick) return content;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label ?? `Open ${name}'s stories`}
      className="rounded-full outline-none transition-transform active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-[#0095f6] focus-visible:ring-offset-2"
    >
      {content}
    </button>
  );
}
