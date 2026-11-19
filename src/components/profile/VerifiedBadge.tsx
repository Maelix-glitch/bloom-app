/**
 * VerifiedBadge — the verified tick.
 *
 * Blue on purpose, even inside Bloom's gold palette: the universal
 * verification blue (VERIFIED_BLUE, defined with the criteria in
 * lib/profile/verification) is what makes the mark read as "verified" at a
 * glance, the way it does everywhere else. It is a claim, not a decoration
 * — it renders ONLY for a status from `verificationStatus` whose criteria
 * are actually met, and callers pass the whole status so there is no
 * boolean to set by hand.
 *
 * One tone exception (brief v4 Part 4; M-91): the sidebar rail passes
 * `tone="gold"` — same badge, same criteria, Bloom's own gold — because
 * inside the rail the blue read as an off-palette social-media import.
 */

import {
  VERIFIED_BLUE,
  VERIFIED_GOLD,
  type VerificationStatus,
} from "@/lib/profile/verification";

export { VERIFIED_BLUE, VERIFIED_GOLD };

export function VerifiedBadge({
  status,
  size = 18,
  className,
  tone = "blue",
}: {
  /** The derived status — the badge shows only when `status.verified`. */
  status: VerificationStatus;
  size?: number;
  className?: string | undefined;
  /** "blue" (default, Profile surfaces) or "gold" (the sidebar rail). */
  tone?: "blue" | "gold";
}) {
  if (!status.verified) return null;
  const fill = tone === "gold" ? VERIFIED_GOLD : VERIFIED_BLUE;
  return (
    <span
      role="img"
      aria-label="Verified account"
      title="Verified account"
      data-testid="verified-badge"
      className={className}
      style={{ display: "inline-flex", flexShrink: 0, lineHeight: 0 }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable="false">
        {/* badge-check: scalloped seal with a cut-out tick */}
        <path
          fill={fill}
          fillRule="evenodd"
          clipRule="evenodd"
          d="M12 1.8 14.5 4l3.35-.28 1.02 3.22 3.02 1.48-1.28 3.13 1.28 3.13-3.02 1.48-1.02 3.22-3.35-.28L12 22.2 9.5 20l-3.35.28-1.02-3.22-3.02-1.48L3.39 12 2.11 8.87l3.02-1.48L6.15 4.17 9.5 4.45 12 1.8Zm4.9 8.05a1 1 0 0 0-1.42-1.4l-4.24 4.3-1.72-1.75a1 1 0 1 0-1.42 1.4l2.43 2.47a1 1 0 0 0 1.42 0l4.95-5.02Z"
        />
      </svg>
    </span>
  );
}
