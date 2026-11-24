/**
 * MemberBadges — the labelled pills beside the verified tick.
 *
 * A pure rendering of the list `memberBadgesOf` derives in
 * lib/profile/badges: this component holds no truth of its own, asks
 * for nothing, and writes nothing — a badge appears here only because
 * a stored record says so. An empty list renders nothing at all, so a
 * member without badges carries no trace of the system.
 *
 * The pills wear the RankPill recipe (the pill that already sits
 * beside the hero name) in each badge's own palette family — founder
 * gold, trainer sage, tester rose — as a tinted ground, a mixed
 * border and text mixed from the tone toward the foreground, which is
 * the house chip pairing the contrast guard clears. The words are the
 * badge names exactly: Founder, Trainer, Tester.
 */

import type { MemberBadge } from "@/lib/profile/badges";
import { cn } from "@/lib/utils";

export function MemberBadges({
  badges,
  size = "md",
  className,
}: {
  /** The derived badges, in display order (lib/profile/badges). */
  badges: readonly MemberBadge[];
  /** "sm" is the same pills, tighter — search rows and the rail. */
  size?: "md" | "sm";
  className?: string | undefined;
}) {
  if (badges.length === 0) return null;
  return (
    <span
      className={cn("mb-badges", size === "sm" && "mb-badges--sm", className)}
      data-testid="member-badges"
    >
      {badges.map((badge) => (
        <span
          key={badge.kind}
          className={cn("mb-badge", `mb-badge--${badge.kind}`)}
          data-badge={badge.kind}
          title={`${badge.label}, granted by Bloom`}
        >
          {badge.label}
        </span>
      ))}
    </span>
  );
}
