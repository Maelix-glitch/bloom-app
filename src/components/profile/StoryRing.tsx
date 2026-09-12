/**
 * StoryRing — Instagram-exact story ring.
 *
 * Instagram specs:
 * - Unseen: gradient ring #feda75 → #fa7e1e → #d62976 → #962fbf → #4f5bd5
 *   thickness 2px, with 2px white/black gap between ring and avatar
 * - Seen: thin 1px light gray #dbdbdb (light) / #363636 (dark) ring, with same gap
 * - Close friends: green ring #1DB954 / gradient green
 * - Prompt/none: no ring
 *
 * Structure:
 * outer (gradient) -> padding 2px -> inner (background gap) -> padding 2px -> avatar
 * Total outer size = avatar size + 8px
 */

import { cn } from "@/lib/utils";
import type { BloomAccent } from "@/lib/profile/types";

export type StoryRingState = "none" | "unseen" | "seen" | "prompt";

const INSTAGRAM_GRADIENT = `conic-gradient(from 45deg at 50% 50%,
  #feda75 0deg,
  #fa7e1e 60deg,
  #d62976 130deg,
  #962fbf 210deg,
  #4f5bd5 280deg,
  #feda75 360deg)`;

const INSTAGRAM_GRADIENT_LINEAR = `linear-gradient(45deg, #feda75, #fa7e1e, #d62976, #962fbf, #4f5bd5)`;

const CLOSE_FRIENDS_GRADIENT = `linear-gradient(45deg, #1DB954, #1ED760)`;

export function StoryRing({
  state,
  size,
  accent,
  animateIn = false,
  pulse = false,
  tone = "bloom",
  children,
  className,
}: {
  state: StoryRingState;
  size: number;
  accent: BloomAccent;
  animateIn?: boolean | undefined;
  pulse?: boolean | undefined;
  tone?: "bloom" | "close" | undefined;
  children: React.ReactNode;
  className?: string | undefined;
}) {
  const isUnseen = state === "unseen";
  const isSeen = state === "seen";
  const isPrompt = state === "prompt";
  const isNone = state === "none";

  // Instagram sizing: avatar + 4px gap (2+2) each side
  const gap = 2; // white gap between gradient and avatar
  const ringThickness = isSeen ? 1 : 2;
  const outerPadding = ringThickness;
  const totalExtra = (outerPadding + gap) * 2;
  const outerSize = size + totalExtra;

  if (isNone || isPrompt) {
    return (
      <span
        className={cn("relative inline-grid place-items-center rounded-full", className)}
        style={{ width: size, height: size }}
      >
        {children}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "relative inline-grid place-items-center rounded-full",
        animateIn && "ig-ring-enter",
        pulse && isUnseen && "ig-ring-pulse",
        className
      )}
      style={{
        width: outerSize,
        height: outerSize,
        // Outer ring
        background: isSeen
          ? undefined
          : tone === "close"
            ? CLOSE_FRIENDS_GRADIENT
            : INSTAGRAM_GRADIENT,
        border: isSeen ? `${ringThickness}px solid #dbdbdb` : undefined,
        padding: outerPadding,
        // For dark mode, seen border should be #363636 - handled via CSS
      }}
      data-ring-state={state}
      data-ring-tone={tone}
    >
      {/* Seen ring dark mode override via CSS class */}
      <span
        className={cn(
          "grid place-items-center rounded-full",
          isSeen && "ig-seen-ring"
        )}
        style={{
          width: "100%",
          height: "100%",
          background: "var(--ig-gap-bg, #fff)",
          padding: gap,
          borderRadius: "50%",
        }}
      >
        <span
          className="grid place-items-center rounded-full overflow-hidden"
          style={{ width: "100%", height: "100%" }}
        >
          {children}
        </span>
      </span>
    </span>
  );
}
