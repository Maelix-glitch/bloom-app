/**
 * StoryRing — the signature Bloom affordance: "a living moment around your
 * identity." One component owns the geometry so the ring is engineered,
 * never pasted on: constant stroke, constant inset, stable at every size.
 *
 *   none    — no presence; identity stands alone
 *   unseen  — a quiet multi-tone Bloom arc (lavender → soft blue → warm gold)
 *   seen    — the same circle, dimmed to a whisper
 *   prompt  — dashed invitation to add a story
 *
 * Motion policy: a single slow entrance when the ring appears; nothing loops.
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
  children,
  className,
}: {
  state: StoryRingState;
  size: number;
  accent: BloomAccent;
  animateIn?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const stroke = size >= 96 ? 2.5 : 2;
  const inset = size >= 96 ? 6 : 5;
  const active = state === "unseen";

  return (
    <span
      className={cn("relative inline-grid place-items-center", className)}
      style={{ width: size + inset * 2 + stroke * 2, height: size + inset * 2 + stroke * 2 }}
    >
      {state !== "none" ? (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 rounded-full transition-[opacity,transform] duration-[var(--motion-med)]",
            animateIn && "story-ring-enter",
          )}
          style={
            active
              ? {
                  padding: stroke,
                  background:
                    "conic-gradient(from 205deg, color-mix(in oklab, var(--violet) 92%, white 8%), var(--sky) 36%, color-mix(in oklab, var(--amber) 80%, var(--rose)) 66%, color-mix(in oklab, var(--violet) 92%, white 8%) 97%)",
                  WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                  WebkitMaskComposite: "xor",
                  maskComposite: "exclude",
                }
              : state === "seen"
                ? {
                    border: `${stroke}px solid color-mix(in oklab, var(--profile-accent, var(--violet)) 32%, transparent)`,
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
