import { useId } from "react";

import { cn } from "@/lib/utils";

/**
 * BloomLogo — the one and only brand mark.
 *
 * The arc is always the favicon's arc: same path, same sage-to-gold gradient
 * (#7FA88F → #E8B75E), so the mark never drifts from the tab icon again.
 *
 * Two ways to wear it:
 *   · `tile` — the favicon itself, the arc on its obsidian rounded tile (with
 *     a hairline ring so the tile reads on dark surfaces). This is how the
 *     logo appears where it plays "the app icon": the access gate.
 *   · bare arc (default) — how the app wears the brand on its own dark
 *     surfaces: the sidebar rail, the mobile bar, the header, the boot
 *     splash, Coach, the Cycle assistant. No box, just the mark.
 */
export function BloomLogo({
  size = 22,
  tile = false,
  className,
  arcClassName,
}: {
  /** rendered width & height in px (CSS classes like `size-4` also work). */
  size?: number;
  /** draw the favicon's rounded obsidian tile behind the arc. */
  tile?: boolean | undefined;
  className?: string | undefined;
  /** class for the arc path only — lets the boot splash animate its draw. */
  arcClassName?: string | undefined;
}) {
  const rawId = useId();
  const gradientId = `bloomLogo${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg
      viewBox="0 0 28 28"
      fill="none"
      width={size}
      height={size}
      className={cn(className)}
      aria-hidden="true"
    >
      {tile ? (
        <>
          <rect width="28" height="28" rx="8" fill="#14151F" />
          <rect x="0.5" y="0.5" width="27" height="27" rx="7.5" stroke="rgba(255,255,255,0.08)" />
        </>
      ) : null}
      <path
        d="M4 20c3-9 7-14 10-14s7 5 10 14"
        stroke={`url(#${gradientId})`}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={100}
        className={arcClassName}
      />
      <defs>
        <linearGradient
          id={gradientId}
          x1="4"
          y1="13"
          x2="24"
          y2="13"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#7FA88F" />
          <stop offset="1" stopColor="#E8B75E" />
        </linearGradient>
      </defs>
    </svg>
  );
}
