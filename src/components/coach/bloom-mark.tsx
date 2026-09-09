import { useId } from "react";

import { cn } from "@/lib/utils";

/**
 * Bloom's mark, as the Coach wears it — the same single arc as the rest of the
 * app, rendered in a quiet lavender-to-ivory gradient that reads on the deep
 * indigo coach surfaces. `active` (thinking / awaiting) breathes via CSS.
 */
export function CoachGlyph({
  size = 20,
  active = false,
  className,
}: {
  size?: number;
  active?: boolean;
  className?: string;
}) {
  const rawId = useId();
  const gradientId = `coachGlyph${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <span
      className={cn("coach-glyph", active && "coach-glyph-active", className)}
      aria-hidden="true"
    >
      <svg viewBox="0 0 28 28" fill="none" width={size} height={size}>
        <path
          d="M4 20c3-9 7-14 10-14s7 5 10 14"
          stroke={`url(#${gradientId})`}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id={gradientId} x1="4" y1="13" x2="24" y2="13">
            <stop stopColor="var(--coach-mark-a)" />
            <stop offset="1" stopColor="var(--coach-mark-b)" />
          </linearGradient>
        </defs>
      </svg>
    </span>
  );
}

/** A tiny, quiet "n" — Bloom noticing something. Optional label text. */
export function NoticeGlyph({ size = 13, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 28 28"
      fill="none"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <path
        d="M4 20c3-9 7-14 10-14s7 5 10 14"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <circle cx="22.6" cy="6.4" r="1.9" fill="currentColor" />
    </svg>
  );
}
