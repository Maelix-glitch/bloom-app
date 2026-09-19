import { useId } from "react";

import { cn } from "@/lib/utils";

/**
 * BloomLogo — the one and only brand mark.
 *
 * This is the favicon, exactly: the icon that sits beside the web address —
 * a sage-to-gold arc blooming out of an obsidian rounded tile. Every surface
 * that wears the brand (the access gate, the sidebar rail, the mobile bar,
 * the header, the boot splash, Coach, the Cycle assistant) renders this one
 * component, so the mark can never drift from the tab icon again.
 *
 * The hairline ring keeps the tile's silhouette readable when the logo sits
 * on the app's dark surfaces; on light surfaces it all but disappears.
 */
export function BloomLogo({
  size = 22,
  className,
  arcClassName,
}: {
  /** rendered width & height in px (CSS classes like `size-4` also work). */
  size?: number;
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
      <rect width="28" height="28" rx="8" fill="#14151F" />
      <rect x="0.5" y="0.5" width="27" height="27" rx="7.5" stroke="rgba(255,255,255,0.08)" />
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
