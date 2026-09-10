/**
 * StoryRing — the signature Bloom affordance: "a living moment around your
 * identity." One component owns the geometry so the ring is engineered,
 * never pasted on: constant stroke, constant inset, stable at every size.
 *
 *   none    — no presence; identity stands alone
 *   unseen  — the Bloom arc (lavender → rose → champagne)
 *   seen    — the same circle, dimmed to a whisper (shape + tone, not color alone)
 *   prompt  — dashed invitation to add a story
 *
 *   tone="close" — the sage-mist arc for close-friends stories.
 *   pulse — a single bloom pulse when a new story lands; never loops.
 */

import { accentVar } from "@/components/mood/primitives";
import { cn } from "@/lib/utils";
import type { BloomAccent } from "@/lib/profile/types";

export type StoryRingState = "none" | "unseen" | "seen" | "prompt";

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
  const stroke = size >= 96 ? 2.5 : 2;
  const inset = size >= 96 ? 6 : 5;
  const active = state === "unseen";

  return (
    <span
      className={cn("bstory relative inline-grid place-items-center rounded-full", className)}
      style={{ width: size + inset * 2 + stroke * 2, height: size + inset * 2 + stroke * 2 }}
    >
      {state !== "none" ? (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 rounded-full transition-[opacity,transform] duration-[var(--motion-med)]",
            animateIn && "story-ring-enter",
            pulse && active && "story-ring-bloom",
          )}
          style={
            active
              ? {
                  padding: stroke,
                  background: tone === "close" ? "var(--story-ring-close)" : "var(--story-ring)",
                  WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                  WebkitMaskComposite: "xor",
                  maskComposite: "exclude",
                }
              : state === "seen"
                ? {
                    border: `${stroke}px solid var(--story-ring-seen)`,
                  }
                : {
                    border: `${stroke}px dashed color-mix(in oklab, ${accentVar[accent]} 55%, transparent)`,
                  }
          }
        />
      ) : null}
      {children}
    </span>
  );
}
