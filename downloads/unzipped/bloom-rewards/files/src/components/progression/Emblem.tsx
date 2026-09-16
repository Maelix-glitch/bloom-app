/**
 * Rank + achievement emblems.
 *
 * One botanical mark per rank, drawn as SVG so it stays crisp at 22px in the
 * journey path and 120px in the ceremony. Everything is stroke-based line art
 * in `currentColor`, which lets the rank's own tone colour the emblem without
 * a second asset. No text is ever baked into the artwork.
 */

import type { CSSProperties, ReactElement } from "react";

export type EmblemId =
  | "seed"
  | "first-bloom"
  | "sprout"
  | "budding"
  | "bloom"
  | "flourish"
  | "wildflower"
  | "evergreen"
  | "keeper"
  | "perennial"
  | "everbloom"
  | "bloomkeeper"
  | "cycle-light"
  | "cycle-roots"
  | "cycle-mist"
  | "cycle-gold"
  | "cycle-blossom";

/** Shared petal helper: n petals rotated around a centre. */
function petals(count: number, radius: number, length: number, cy = 24) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (360 / count) * i;
    return (
      <ellipse
        key={i}
        cx={24}
        cy={cy - length}
        rx={length * 0.36}
        ry={length}
        transform={`rotate(${angle} 24 ${cy})`}
      />
    );
  });
}

const MARKS: Record<EmblemId, ReactElement> = {
  // A seed in the soil — the very beginning.
  seed: (
    <>
      <path d="M24 40c0-6 0-10 0-14" />
      <path d="M24 26c-4.5 0-8-3-8-7 0-3.6 3.4-6.4 8-6.4s8 2.8 8 6.4c0 4-3.5 7-8 7Z" />
      <path d="M14 40h20" />
      <path d="M20 31.5c2.6-1.2 4.6-3 5.6-5.4" opacity="0.55" />
    </>
  ),
  // The first flower opens.
  "first-bloom": (
    <>
      {petals(5, 8, 8, 26)}
      <circle cx="24" cy="26" r="3" />
      <path d="M24 29c0 5-2 8-4 11" />
      <path d="M20 36c3 0 5-1.4 6.4-3.6" opacity="0.6" />
    </>
  ),
  // Two leaves on a young stem.
  sprout: (
    <>
      <path d="M24 42V22" />
      <path d="M24 30c-6 0-10-3-10-7 4.6-1.4 10 .6 10 7Z" />
      <path d="M24 26c6 0 10-3 10-7-4.6-1.4-10 .6-10 7Z" />
      <path d="M15 42h18" opacity="0.5" />
    </>
  ),
  // A bud, still closed, about to open.
  budding: (
    <>
      <path d="M24 42V24" />
      <path d="M24 24c-5-2-7-6-6-10 3.6-1.8 8 .4 8 6 0-5.6 4.4-7.8 8-6 1 4-1 8-6 10" />
      <path d="M24 24c0 0 0 0 0 0" />
      <path d="M24 31c-4 0-6.6-1.8-7.6-4.6" opacity="0.55" />
    </>
  ),
  // Fully open — the middle of the journey.
  bloom: (
    <>
      {petals(8, 9, 9, 24)}
      <circle cx="24" cy="24" r="3.4" />
      <circle cx="24" cy="24" r="1.4" opacity="0.5" />
    </>
  ),
  // Branching outward.
  flourish: (
    <>
      <path d="M24 43V22" />
      <path d="M24 30c-7-1-11-5-11-9 5-1.6 10 1.6 11 9Z" />
      <path d="M24 26c7-1 11-5 11-9-5-1.6-10 1.6-11 9Z" />
      <circle cx="24" cy="16" r="4.6" />
      {petals(6, 11, 4.4, 16)}
    </>
  ),
  // Uneven, free-growing, entirely its own shape.
  wildflower: (
    <>
      <path d="M23 43c1-7 2-12 4-17" />
      {petals(7, 12, 5.4, 20)}
      <circle cx="26" cy="20" r="2.4" />
      <path d="M21 33c-5 .6-8-1.4-9.4-5 4-1.6 8 .4 9.4 5Z" opacity="0.6" />
    </>
  ),
  // The evergreen — seasons changed, it stayed.
  evergreen: (
    <>
      <path d="M24 43V14" />
      <path d="M24 20c-6 0-10-3-10-7 4-2 10 .4 10 7Z" />
      <path d="M24 20c6 0 10-3 10-7-4-2-10 .4-10 7Z" />
      <path d="M24 30c-7 0-12-3.4-12-8 5-2.4 12 .6 12 8Z" />
      <path d="M24 30c7 0 12-3.4 12-8-5-2.4-12 .6-12 8Z" />
      <path d="M15 43h18" opacity="0.45" />
    </>
  ),
  // A bloom held — tended, not just grown.
  keeper: (
    <>
      <path d="M24 34c-6.6 0-12-5.4-12-12S17.4 10 24 10s12 5.4 12 12-5.4 12-12 12Z" opacity="0.5" />
      {petals(6, 8, 6.6, 24)}
      <circle cx="24" cy="24" r="2.6" />
      <path d="M14 37c4 3 6.4 4 10 4s6-1 10-4" />
    </>
  ),
  // Returning each year.
  perennial: (
    <>
      <circle cx="24" cy="24" r="13" opacity="0.45" />
      <path d="M24 37V20" />
      <path d="M24 26c-5.4 0-9-2.6-9-6.4 4-1.6 9 .6 9 6.4Z" />
      <path d="M24 26c5.4 0 9-2.6 9-6.4-4-1.6-9 .6-9 6.4Z" />
      <path d="M24 20c-2-3-1-6 1-7.4 1.8 1.6 2.4 4.4 1 7.4Z" opacity="0.7" />
    </>
  ),
  // Layers and layers of bloom.
  everbloom: (
    <>
      {petals(10, 12, 9.6, 24)}
      {petals(6, 7, 6.2, 24)}
      <circle cx="24" cy="24" r="2.8" />
    </>
  ),
  // The whole garden, in one mark.
  bloomkeeper: (
    <>
      <circle cx="24" cy="24" r="14.5" opacity="0.55" />
      {petals(8, 7, 7.4, 24)}
      <circle cx="24" cy="24" r="3" />
      <path d="M9.5 24c3-1.6 5-4 5.6-7" opacity="0.5" />
      <path d="M38.5 24c-3-1.6-5-4-5.6-7" opacity="0.5" />
    </>
  ),
  // ---- cycle layer: the journey past the named ladder --------------------
  "cycle-light": (
    <>
      <circle cx="24" cy="24" r="6.5" />
      {Array.from({ length: 10 }, (_, i) => (
        <path key={i} d="M24 12.5V9" transform={`rotate(${i * 36} 24 24)`} opacity={i % 2 ? 0.5 : 0.9} />
      ))}
    </>
  ),
  "cycle-roots": (
    <>
      <path d="M24 40V16" />
      <path d="M24 24c-4-1.6-6-4-6.6-7.4 3.6-1 7 .8 6.6 7.4Z" opacity="0.7" />
      <path d="M24 28c-5 1-8 3.4-9.4 7.4 4 1.4 8.6-.8 9.4-7.4Z" />
      <path d="M24 28c5 1 8 3.4 9.4 7.4-4 1.4-8.6-.8-9.4-7.4Z" />
    </>
  ),
  "cycle-mist": (
    <>
      <path d="M11 20c4-2.6 8-2.6 12 0s8 2.6 12 0" opacity="0.85" />
      <path d="M11 27c4-2.6 8-2.6 12 0s8 2.6 12 0" opacity="0.6" />
      <path d="M14 34c3.4-2 6.6-2 10 0s6.6 2 10 0" opacity="0.4" />
      <circle cx="24" cy="13" r="3.4" />
    </>
  ),
  "cycle-gold": (
    <>
      {petals(8, 8, 8.4, 24)}
      <circle cx="24" cy="24" r="3.2" />
      <path d="M12 40h24" opacity="0.4" />
    </>
  ),
  "cycle-blossom": (
    <>
      {petals(5, 6, 6, 17)}
      {petals(5, 6, 6, 31)}
      <circle cx="24" cy="17" r="2" />
      <circle cx="24" cy="31" r="2" />
    </>
  ),
};

export function Emblem({
  id,
  size = 48,
  className,
  style,
  strokeWidth = 1.5,
}: {
  id: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
  strokeWidth?: number;
}) {
  const mark = MARKS[id as EmblemId] ?? MARKS.bloom;
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {mark}
    </svg>
  );
}

export const EMBLEM_IDS = Object.keys(MARKS) as EmblemId[];
