/**
 * Bloom Story Platform — proprietary sticker library.
 * Every sticker is original Bloom line art drawn in SVG: one family, one
 * stroke language, soft botanical fills. Stable ids, tags, categories,
 * search, recents and favorites all live here.
 */

import { useEffect, useState } from "react";

export type StickerCategory =
  | "bloom"
  | "mood"
  | "wellness"
  | "habits"
  | "fitness"
  | "sleep"
  | "love"
  | "celebrate"
  | "everyday"
  | "deco"
  | "seasonal";

export const STICKER_CATEGORIES: { id: StickerCategory; label: string }[] = [
  { id: "bloom", label: "Bloom" },
  { id: "mood", label: "Mood" },
  { id: "wellness", label: "Wellness" },
  { id: "habits", label: "Habits" },
  { id: "fitness", label: "Move" },
  { id: "sleep", label: "Rest" },
  { id: "love", label: "Love" },
  { id: "celebrate", label: "Celebrate" },
  { id: "everyday", label: "Everyday" },
  { id: "deco", label: "Doodles" },
  { id: "seasonal", label: "Seasonal" },
];

export interface StickerDef {
  id: string;
  name: string;
  category: StickerCategory;
  tags: string[];
  /** Subtle CSS animation in viewer/editor. */
  animated?: boolean | undefined;
  art: React.ReactNode;
}

/* Shared stroke language: round caps, 3px on a 64 grid. */
const P = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 3,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function S({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden focusable="false">
      {children}
    </svg>
  );
}

const F = (color: string, opacity = 0.28) => ({ fill: color, opacity });

/* ------------------------------------------------------------------ art -- */

const ART: Record<string, React.ReactNode> = {
  /* ------------------------------- bloom ------------------------------ */
  "bloom.flower-1": (
    <S>
      <g {...P}>
        <circle cx="32" cy="26" r="5" {...F("#eed9a4", 0.9)} stroke="none" />
        {[0, 60, 120, 180, 240, 300].map((r) => (
          <ellipse
            key={r}
            cx="32"
            cy="14"
            rx="6"
            ry="9"
            transform={`rotate(${r} 32 26)`}
            {...F("#e0a3b8", 0.55)}
          />
        ))}
        <path d="M32 34v20" />
        <path d="M32 46c-5 0-9-3-10-8 5 0 9 2 10 8Z" {...F("#9db89a", 0.7)} />
        <path d="M32 42c5 0 9-3 10-8-5 0-9 2-10 8Z" {...F("#9db89a", 0.7)} />
      </g>
    </S>
  ),
  "bloom.petal-1": (
    <S>
      <g {...P}>
        <path
          d="M32 8c10 8 14 18 12 30-2 10-8 16-12 18-4-2-10-8-12-18-2-12 2-22 12-30Z"
          {...F("#e0a3b8", 0.5)}
        />
        <path d="M32 16c4 8 5 18 2 28" />
      </g>
    </S>
  ),
  "bloom.petal-2": (
    <S>
      <g {...P}>
        <path d="M14 44c2-12 12-22 26-24 2 14-8 24-26 24Z" {...F("#b7a6e8", 0.5)} />
        <path d="M22 52c0-10 8-18 20-20" />
      </g>
    </S>
  ),
  "bloom.sprig-1": (
    <S>
      <g {...P}>
        <path d="M32 56V16" />
        <path d="M32 44c-7 0-12-4-13-11 7 0 12 4 13 11Z" {...F("#9db89a", 0.7)} />
        <path d="M32 44c7 0 12-4 13-11-7 0-12 4-13 11Z" {...F("#9db89a", 0.7)} />
        <path d="M32 30c-6 0-10-3-11-9 6 0 10 3 11 9Z" {...F("#9db89a", 0.7)} />
        <path d="M32 30c6 0 10-3 11-9-6 0-10 3-11 9Z" {...F("#9db89a", 0.7)} />
        <circle cx="32" cy="12" r="2.5" {...F("#eed9a4", 0.9)} />
      </g>
    </S>
  ),
  "bloom.leaf-2": (
    <S>
      <g {...P}>
        <path d="M12 52C14 30 30 14 52 12c-2 22-18 38-40 40Z" {...F("#9db89a", 0.55)} />
        <path d="M16 48C26 38 36 28 48 18" />
      </g>
    </S>
  ),
  "bloom.moon-1": (
    <S>
      <g {...P}>
        <path d="M42 8a20 20 0 1 0 12 36A16 16 0 0 1 42 8Z" {...F("#eed9a4", 0.75)} />
        <path d="M46 12l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z" {...F("#f4efe4", 0.9)} stroke="none" />
      </g>
    </S>
  ),
  "bloom.sun-1": (
    <S>
      <g {...P}>
        <circle cx="32" cy="32" r="10" {...F("#eed9a4", 0.85)} />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((r) => (
          <path key={r} d="M32 10v6" transform={`rotate(${r} 32 32)`} />
        ))}
      </g>
    </S>
  ),
  "bloom.cloud-1": (
    <S>
      <g {...P}>
        <path
          d="M20 46h24a8 8 0 0 0 1-16 11 11 0 0 0-21-3 7 7 0 0 0-4 19Z"
          {...F("#9fb6cf", 0.55)}
        />
        <path d="M24 52l-1.5 3M32 52v3M40 52l1.5 3" strokeWidth={2.4} />
      </g>
    </S>
  ),
  "bloom.spark-2": (
    <S>
      <g {...P}>
        <path d="M32 6l3 14 14 3-14 3-3 14-3-14-14-3 14-3 3-14Z" {...F("#eed9a4", 0.8)} />
        <path d="M50 40l1.6 7 7 1.6-7 1.6-1.6 7-1.6-7-7-1.6 7-1.6 1.6-7Z" {...F("#e0a3b8", 0.8)} />
        <circle cx="14" cy="46" r="2.4" {...F("#b7a6e8", 0.9)} stroke="none" />
      </g>
    </S>
  ),
  "bloom.star-1": (
    <S>
      <g {...P}>
        <path
          d="M32 8l6.5 13.5L53 23.5l-10.5 10 2.5 14.5-13-7-13 7 2.5-14.5-10.5-10 14.5-2L32 8Z"
          {...F("#eed9a4", 0.7)}
        />
      </g>
    </S>
  ),
  "bloom.frame-1": (
    <S>
      <g {...P}>
        <rect x="12" y="14" width="40" height="36" rx="6" {...F("#f4efe4", 0.25)} />
        <circle cx="24" cy="26" r="3" {...F("#eed9a4", 0.8)} />
        <path d="M14 42l10-9 7 6 6-5 9 8" />
        <path
          d="M48 8l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5 1.5-4Z"
          {...F("#e0a3b8", 0.9)}
          stroke="none"
        />
      </g>
    </S>
  ),
  "bloom.rainbow-1": (
    <S>
      <g {...P}>
        <path d="M10 46a22 22 0 0 1 44 0" stroke="#e0a3b8" />
        <path d="M17 46a15 15 0 0 1 30 0" stroke="#eed9a4" />
        <path d="M24 46a8 8 0 0 1 16 0" stroke="#9db89a" />
      </g>
    </S>
  ),

  /* -------------------------------- mood ------------------------------ */
  "mood.calm": (
    <S>
      <g {...P}>
        <circle cx="32" cy="32" r="20" {...F("#9fb6cf", 0.35)} />
        <path d="M24 30c2-2 5-2 7 0M33 30c2-2 5-2 7 0" />
        <path d="M26 40c3 2.5 9 2.5 12 0" />
      </g>
    </S>
  ),
  "mood.happy": (
    <S>
      <g {...P}>
        <circle cx="32" cy="32" r="20" {...F("#eed9a4", 0.5)} />
        <path d="M24 28c1.5-2 4.5-2 6 0M34 28c1.5-2 4.5-2 6 0" />
        <path d="M25 37c2 4 6 6 7 6s5-2 7-6" />
      </g>
    </S>
  ),
  "mood.loved": (
    <S>
      <g {...P}>
        <circle cx="32" cy="32" r="20" {...F("#e0a3b8", 0.4)} />
        <path d="M26 32l2.5 2.5L33 30M36 34.5L38.5 37 43 32.5" strokeWidth={2.6} />
        <path d="M26 40c3 2 9 2 12 0" />
      </g>
    </S>
  ),
  "mood.tired": (
    <S>
      <g {...P}>
        <circle cx="32" cy="32" r="20" {...F("#9fb6cf", 0.3)} />
        <path d="M24 30h8M32 30h8" strokeWidth={2.6} />
        <path d="M28 41h8" strokeWidth={2.6} />
        <path
          d="M48 12l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1 1-2.4Z"
          {...F("#9fb6cf", 0.8)}
          stroke="none"
        />
      </g>
    </S>
  ),
  "mood.grateful": (
    <S>
      <g {...P}>
        <circle cx="32" cy="32" r="20" {...F("#9db89a", 0.35)} />
        <path d="M25 29c2-2 4-2 6 0 2-2 4-2 6 0" strokeWidth={2.6} />
        <path d="M26 38c2.5 3 9.5 3 12 0" />
      </g>
    </S>
  ),
  "mood.low": (
    <S>
      <g {...P}>
        <circle cx="32" cy="32" r="20" {...F("#9fb6cf", 0.3)} />
        <path d="M24 28c2-1.5 5-1.5 7 0M33 28c2-1.5 5-1.5 7 0" strokeWidth={2.6} />
        <path d="M27 41c2.5-2 7.5-2 10 0" strokeWidth={2.6} />
        <path d="M20 50c4 1.5 8-1 9-4" strokeWidth={2.4} />
      </g>
    </S>
  ),
  "mood.energized": (
    <S>
      <g {...P}>
        <path d="M36 6L18 36h10l-3 22 18-30H33l3-22Z" {...F("#eed9a4", 0.75)} />
      </g>
    </S>
  ),
  "mood.peaceful": (
    <S>
      <g {...P}>
        <path
          d="M12 40c6-2 8-8 8-14 8-2 12-8 12-14 8 2 12 8 12 14 6 2 8 8 8 12"
          strokeWidth={2.6}
        />
        <path d="M8 48h48" strokeWidth={2.6} />
        <circle cx="32" cy="18" r="3" {...F("#eed9a4", 0.9)} />
      </g>
    </S>
  ),

  /* ------------------------------ wellness ---------------------------- */
  "well.water": (
    <S>
      <g {...P}>
        <path d="M32 8c8 10 14 17 14 25a14 14 0 0 1-28 0c0-8 6-15 14-25Z" {...F("#9fb6cf", 0.55)} />
        <path d="M26 34a6 6 0 0 0 4 6" strokeWidth={2.4} />
      </g>
    </S>
  ),
  "well.rest": (
    <S>
      <g {...P}>
        <rect x="12" y="26" width="40" height="22" rx="8" {...F("#b7a6e8", 0.35)} />
        <path d="M12 34h40" strokeWidth={2.4} />
        <circle cx="24" cy="20" r="4" {...F("#eed9a4", 0.7)} />
        <path
          d="M44 14l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5 1.5-4Z"
          {...F("#e0a3b8", 0.8)}
          stroke="none"
        />
      </g>
    </S>
  ),
  "well.breathe": (
    <S>
      <g {...P}>
        <circle cx="32" cy="32" r="8" {...F("#9db89a", 0.5)} />
        <circle cx="32" cy="32" r="15" strokeWidth={2.4} />
        <circle cx="32" cy="32" r="22" strokeWidth={2} strokeDasharray="3 5" />
      </g>
    </S>
  ),
  "well.tea": (
    <S>
      <g {...P}>
        <path d="M14 30h26v12a8 8 0 0 1-8 8h-10a8 8 0 0 1-8-8V30Z" {...F("#e8c98a", 0.5)} />
        <path d="M40 32h4a6 6 0 0 1 0 12h-5" />
        <path d="M22 24c-2-3 2-4 0-7M30 24c-2-3 2-4 0-7" strokeWidth={2.4} />
      </g>
    </S>
  ),
  "well.mindful": (
    <S>
      <g {...P}>
        <path
          d="M32 10c12 10 16 20 14 32-10-2-18-8-22-16-4 8-12 14-22 16-2-12 2-22 14-32 5 4 8 4 16 0Z"
          {...F("#b7a6e8", 0.45)}
        />
      </g>
    </S>
  ),

  /* ------------------------------- habits ----------------------------- */
  "habit.check-1": (
    <S>
      <g {...P}>
        <circle cx="32" cy="32" r="20" {...F("#9db89a", 0.4)} />
        <path d="M23 33l6.5 6.5L42 27" strokeWidth={4} />
      </g>
    </S>
  ),
  "habit.streak-1": (
    <S>
      <g {...P}>
        <path
          d="M32 8c2 8 10 12 10 22a10 10 0 0 1-20 0c0-4 2-7 4-9 0 4 2 6 4 7-1-7 0-14 2-20Z"
          {...F("#e8a06a", 0.7)}
        />
        <circle cx="32" cy="34" r="3.5" {...F("#eed9a4", 0.95)} stroke="none" />
      </g>
    </S>
  ),
  "habit.done-1": (
    <S>
      <g {...P}>
        <rect x="14" y="12" width="36" height="40" rx="8" {...F("#f4efe4", 0.3)} />
        <path d="M24 32l5 5 11-11" strokeWidth={4} />
      </g>
    </S>
  ),
  "habit.win-1": (
    <S>
      <g {...P}>
        <path d="M20 10h24v14a12 12 0 0 1-24 0V10Z" {...F("#eed9a4", 0.55)} />
        <path d="M20 14H12a8 8 0 0 0 8 12M44 14h8a8 8 0 0 1-8 12" />
        <path d="M32 36v6M24 50h16M28 44h8" strokeWidth={2.6} />
      </g>
    </S>
  ),

  /* ------------------------------- fitness ---------------------------- */
  "fit.walk": (
    <S>
      <g {...P}>
        <circle cx="36" cy="12" r="4" {...F("#9db89a", 0.6)} />
        <path d="M34 20l-8 8 4 6-6 14M34 20l8 4 6-2M30 34l-10 4" />
        <path d="M14 52h36" strokeWidth={2.4} />
      </g>
    </S>
  ),
  "fit.stretch": (
    <S>
      <g {...P}>
        <path d="M10 50c10-2 12-12 10-22 8-2 14-8 16-16" strokeWidth={2.8} />
        <path d="M54 14c-8 2-12 8-13 14" strokeWidth={2.8} />
        <circle cx="40" cy="44" r="8" {...F("#9db89a", 0.4)} />
      </g>
    </S>
  ),
  "fit.move": (
    <S>
      <g {...P}>
        <path d="M8 40c8-12 16-20 24-20s14 6 24 4" />
        <path d="M46 30l10 6-10 6" />
        <circle cx="10" cy="44" r="2.5" {...F("#e0a3b8", 0.9)} stroke="none" />
      </g>
    </S>
  ),
  "fit.recover": (
    <S>
      <g {...P}>
        <path
          d="M32 52c-10-6-18-12-18-22a10 10 0 0 1 18-6 10 10 0 0 1 18 6c0 10-8 16-18 22Z"
          {...F("#e0a3b8", 0.4)}
        />
        <path d="M24 28h5l2-4 4 8 2-4h5" strokeWidth={2.4} />
      </g>
    </S>
  ),

  /* -------------------------------- sleep ----------------------------- */
  "sleep.moon-2": (
    <S>
      <g {...P}>
        <path d="M40 10a18 18 0 1 0 11 32A14 14 0 0 1 40 10Z" {...F("#9fb6cf", 0.6)} />
        <path
          d="M20 14l1 2.6 2.6 1-2.6 1-1 2.6-1-2.6-2.6-1 2.6-1 1-2.6Z"
          {...F("#f4efe4", 0.9)}
          stroke="none"
        />
      </g>
    </S>
  ),
  "sleep.zzz": (
    <S>
      <g {...P}>
        <path d="M20 44h8l-8 8h8M34 32h7l-7 7h7M46 22h6l-6 6h6" strokeWidth={3.4} />
      </g>
    </S>
  ),
  "sleep.bedtime": (
    <S>
      <g {...P}>
        <path d="M10 40v-6a8 8 0 0 1 8-8h28a8 8 0 0 1 8 8v6" {...F("#b7a6e8", 0.35)} />
        <path d="M8 44h48" strokeWidth={4} />
        <path
          d="M44 10l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5 1.5-4Z"
          {...F("#eed9a4", 0.9)}
          stroke="none"
        />
      </g>
    </S>
  ),

  /* -------------------------------- love ------------------------------ */
  "love.heart-1": (
    <S>
      <g {...P}>
        <path
          d="M32 54C18 44 10 36 10 27a11 11 0 0 1 20-6 11 11 0 0 1 20 6c0 9-8 17-18 27Z"
          {...F("#e0a3b8", 0.6)}
        />
      </g>
    </S>
  ),
  "love.heart-2": (
    <S>
      <g {...P}>
        <path
          d="M30 52C20 45 14 39 14 32a9 9 0 0 1 16-5 9 9 0 0 1 16 5c0 7-5 12-12 18"
          {...F("#e0a3b8", 0.55)}
        />
        <path
          d="M44 12l1.6 5 5 1.6-5 1.6-1.6 5-1.6-5-5-1.6 5-1.6 1.6-5Z"
          {...F("#eed9a4", 0.9)}
          stroke="none"
        />
      </g>
    </S>
  ),
  "love.hug": (
    <S>
      <g {...P}>
        <circle cx="24" cy="24" r="9" {...F("#eed9a4", 0.4)} />
        <circle cx="40" cy="24" r="9" {...F("#e0a3b8", 0.4)} />
        <path d="M12 46c4-8 12-12 20-12s16 4 20 12" />
      </g>
    </S>
  ),

  /* ------------------------------ celebrate --------------------------- */
  "party.popper": (
    <S>
      <g {...P}>
        <path d="M14 50L34 30l-8-8L10 42l4 8Z" {...F("#e0a3b8", 0.5)} />
        <path d="M30 36l6-2M36 42l4-5M26 30l2-6" strokeWidth={2.4} />
        <circle cx="46" cy="16" r="2.4" {...F("#eed9a4", 0.95)} stroke="none" />
        <circle cx="54" cy="26" r="2" {...F("#9db89a", 0.9)} stroke="none" />
        <circle cx="40" cy="26" r="1.8" {...F("#b7a6e8", 0.9)} stroke="none" />
      </g>
    </S>
  ),
  "party.cake": (
    <S>
      <g {...P}>
        <rect x="14" y="34" width="36" height="16" rx="4" {...F("#e0a3b8", 0.5)} />
        <path d="M14 40c4-3 8 3 12 0s8 3 12 0 8 3 12 0" strokeWidth={2.2} />
        <path d="M32 34V22" />
        <path d="M32 14c2.5 2.5 2.5 5 0 6.5-2.5-1.5-2.5-4 0-6.5Z" {...F("#e8a06a", 0.9)} />
      </g>
    </S>
  ),
  "party.bloom-day": (
    <S>
      <g {...P}>
        <circle cx="32" cy="28" r="13" {...F("#e0a3b8", 0.5)} />
        <circle cx="32" cy="28" r="5" {...F("#eed9a4", 0.95)} />
        <path d="M32 41v11M24 52h16" />
        <path
          d="M14 16l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5 1.5-4ZM50 36l1.2 3.2 3.2 1.2-3.2 1.2-1.2 3.2-1.2-3.2-3.2-1.2 3.2-1.2 1.2-3.2Z"
          {...F("#eed9a4", 0.9)}
          stroke="none"
        />
      </g>
    </S>
  ),

  /* ------------------------------ everyday ---------------------------- */
  "day.coffee": (
    <S>
      <g {...P}>
        <path d="M14 28h26v14a8 8 0 0 1-8 8H22a8 8 0 0 1-8-8V28Z" {...F("#d3b795", 0.55)} />
        <path d="M40 30h4a7 7 0 0 1 0 14h-5" />
        <path d="M22 22c-2-3 2-4 0-7M30 22c-2-3 2-4 0-7" strokeWidth={2.4} />
      </g>
    </S>
  ),
  "day.book": (
    <S>
      <g {...P}>
        <path
          d="M14 16a8 6 0 0 1 16 0v32a8 6 0 0 0-16 0V16ZM30 16a8 6 0 0 1 16 0v32a8 6 0 0 0-16 0"
          {...F("#9fb6cf", 0.4)}
        />
      </g>
    </S>
  ),
  "day.music-note": (
    <S>
      <g {...P}>
        <circle cx="22" cy="44" r="6" {...F("#b7a6e8", 0.6)} />
        <path d="M28 44V16l22-4v22" />
        <circle cx="50" cy="34" r="5" {...F("#b7a6e8", 0.6)} />
      </g>
    </S>
  ),
  "day.camera": (
    <S>
      <g {...P}>
        <rect x="10" y="22" width="44" height="28" rx="8" {...F("#9fb6cf", 0.4)} />
        <path d="M24 22l3-6h10l3 6" />
        <circle cx="32" cy="36" r="7" {...F("#f4efe4", 0.5)} />
      </g>
    </S>
  ),
  "day.home": (
    <S>
      <g {...P}>
        <path d="M10 32L32 14l22 18" />
        <path d="M16 30v18h32V30" {...F("#d3b795", 0.4)} />
        <path d="M28 48v-9h8v9" strokeWidth={2.6} />
      </g>
    </S>
  ),

  /* -------------------------------- deco ------------------------------ */
  "doodle.arrow": (
    <S>
      <g {...P}>
        <path d="M10 44c12-2 24-10 30-24" />
        <path d="M32 18l9-8 3 11" />
      </g>
    </S>
  ),
  "doodle.circle": (
    <S>
      <g {...P}>
        <path
          d="M52 30c1 12-9 22-22 22S9 43 11 29C13 17 23 10 33 12c8 2 14 8 15 16"
          strokeWidth={3.4}
        />
      </g>
    </S>
  ),
  "doodle.underline": (
    <S>
      <g {...P}>
        <path d="M8 40c10 8 22 10 48 2" strokeWidth={3.4} />
        <path d="M14 28c12 6 26 6 38 0" strokeWidth={2.2} />
      </g>
    </S>
  ),
  "doodle.stars": (
    <S>
      <g {...P}>
        <path d="M18 14l2 8 8 2-8 2-2 8-2-8-8-2 8-2 2-8Z" {...F("#eed9a4", 0.85)} />
        <path
          d="M44 34l1.6 6.4 6.4 1.6-6.4 1.6-1.6 6.4-1.6-6.4-6.4-1.6 6.4-1.6 1.6-6.4Z"
          {...F("#e0a3b8", 0.85)}
        />
      </g>
    </S>
  ),
  "doodle.hearts": (
    <S>
      <g {...P}>
        <path
          d="M22 40c-7-5-11-9-11-14a7 7 0 0 1 13-3 7 7 0 0 1 13 3c0 5-4 9-11 14l-2 1.6L22 40Z"
          {...F("#e0a3b8", 0.6)}
        />
        <path
          d="M46 16l1.4 4.4 4.4 1.4-4.4 1.4-1.4 4.4-1.4-4.4-4.4-1.4 4.4-1.4 1.4-4.4Z"
          {...F("#eed9a4", 0.9)}
          stroke="none"
        />
      </g>
    </S>
  ),

  /* ------------------------------ seasonal ---------------------------- */
  "season.blossom": (
    <S>
      <g {...P}>
        <path
          d="M10 54C16 36 28 24 46 20c-2 4-6 6-10 7 3 1 4 3 5 6-8 1-15 6-19 13-3 3-7 6-12 8Z"
          {...F("#e0a3b8", 0.5)}
        />
        <circle cx="40" cy="18" r="4" {...F("#f4efe4", 0.85)} />
        <circle cx="28" cy="30" r="3" {...F("#f4efe4", 0.85)} />
      </g>
    </S>
  ),
  "season.sun": (
    <S>
      <g {...P}>
        <circle cx="32" cy="26" r="9" {...F("#eed9a4", 0.85)} />
        <path d="M10 48c4-3 8 3 12 0s8 3 12 0 8 3 12 0" strokeWidth={2.6} />
        <path d="M32 8v4M14 14l3 3M50 14l-3 3" strokeWidth={2.6} />
      </g>
    </S>
  ),
  "season.leaf-fall": (
    <S>
      <g {...P}>
        <path
          d="M32 8c8 6 12 14 10 24-8-2-14-8-16-14-4 6-12 10-18 10 2-8 8-14 16-16 3-2 5-3 8-4Z"
          {...F("#c07a5e", 0.55)}
        />
        <path d="M30 34c-2 6-6 10-12 12" strokeWidth={2.4} />
      </g>
    </S>
  ),
  "season.snow": (
    <S>
      <g {...P}>
        <path d="M32 8v48M12 20l40 24M52 20L12 44" strokeWidth={2.8} />
        <circle cx="32" cy="32" r="4" {...F("#9fb6cf", 0.7)} />
      </g>
    </S>
  ),
};

interface StickerMeta {
  name: string;
  category: StickerCategory;
  tags: string[];
  animated?: boolean | undefined;
}

const META: Record<string, StickerMeta> = {
  "bloom.flower-1": {
    name: "Bloom",
    category: "bloom",
    tags: ["flower", "bloom", "garden", "spring"],
  },
  "bloom.petal-1": {
    name: "Petal",
    category: "bloom",
    tags: ["petal", "soft", "flower"],
    animated: true,
  },
  "bloom.petal-2": {
    name: "Drift petal",
    category: "bloom",
    tags: ["petal", "falling", "soft"],
    animated: true,
  },
  "bloom.sprig-1": { name: "Sprig", category: "bloom", tags: ["leaf", "plant", "grow", "green"] },
  "bloom.leaf-2": { name: "Leaf", category: "bloom", tags: ["leaf", "nature", "green"] },
  "bloom.moon-1": {
    name: "Moon bloom",
    category: "bloom",
    tags: ["moon", "night", "sleep", "evening"],
  },
  "bloom.sun-1": { name: "Sun", category: "bloom", tags: ["sun", "morning", "bright", "day"] },
  "bloom.cloud-1": { name: "Cloud", category: "bloom", tags: ["cloud", "rain", "weather", "soft"] },
  "bloom.spark-2": {
    name: "Sparkles",
    category: "bloom",
    tags: ["sparkle", "shine", "magic", "stars"],
    animated: true,
  },
  "bloom.star-1": { name: "Star", category: "bloom", tags: ["star", "night", "wish"] },
  "bloom.frame-1": {
    name: "Keepsake",
    category: "bloom",
    tags: ["photo", "frame", "memory", "picture"],
  },
  "bloom.rainbow-1": {
    name: "Rainbow",
    category: "bloom",
    tags: ["rainbow", "color", "hope"],
    animated: true,
  },
  "mood.calm": { name: "Calm", category: "mood", tags: ["calm", "peaceful", "face", "mood"] },
  "mood.happy": {
    name: "Happy",
    category: "mood",
    tags: ["happy", "joy", "smile", "face", "mood"],
  },
  "mood.loved": { name: "Loved", category: "mood", tags: ["loved", "heart", "face", "mood"] },
  "mood.tired": { name: "Tired", category: "mood", tags: ["tired", "sleepy", "face", "mood"] },
  "mood.grateful": {
    name: "Grateful",
    category: "mood",
    tags: ["grateful", "thankful", "face", "mood"],
  },
  "mood.low": { name: "Low", category: "mood", tags: ["low", "sad", "face", "mood"] },
  "mood.energized": {
    name: "Energized",
    category: "mood",
    tags: ["energy", "bolt", "power", "mood"],
    animated: true,
  },
  "mood.peaceful": { name: "Peaceful", category: "mood", tags: ["peace", "zen", "calm", "mood"] },
  "well.water": {
    name: "Water",
    category: "wellness",
    tags: ["water", "hydration", "drink", "drop"],
  },
  "well.rest": { name: "Rest", category: "wellness", tags: ["rest", "bed", "recovery", "sleep"] },
  "well.breathe": {
    name: "Breathe",
    category: "wellness",
    tags: ["breathe", "breath", "calm", "meditation"],
    animated: true,
  },
  "well.tea": { name: "Tea", category: "wellness", tags: ["tea", "warm", "cozy", "drink"] },
  "well.mindful": {
    name: "Mindful",
    category: "wellness",
    tags: ["mindful", "lotus", "meditation", "calm"],
  },
  "habit.check-1": {
    name: "Checked",
    category: "habits",
    tags: ["check", "done", "complete", "habit"],
  },
  "habit.streak-1": {
    name: "Streak",
    category: "habits",
    tags: ["streak", "fire", "consistent", "habit"],
  },
  "habit.done-1": { name: "Done", category: "habits", tags: ["done", "task", "complete", "habit"] },
  "habit.win-1": {
    name: "Small win",
    category: "habits",
    tags: ["win", "trophy", "victory", "habit", "milestone"],
  },
  "fit.walk": { name: "Walk", category: "fitness", tags: ["walk", "walking", "steps", "move"] },
  "fit.stretch": {
    name: "Stretch",
    category: "fitness",
    tags: ["stretch", "yoga", "flexible", "move"],
  },
  "fit.move": { name: "Move", category: "fitness", tags: ["move", "run", "go", "fast"] },
  "fit.recover": {
    name: "Recover",
    category: "fitness",
    tags: ["recovery", "heart", "rest", "health"],
  },
  "sleep.moon-2": { name: "Night", category: "sleep", tags: ["moon", "night", "sleep", "bedtime"] },
  "sleep.zzz": { name: "Deep sleep", category: "sleep", tags: ["sleep", "zzz", "tired", "rest"] },
  "sleep.bedtime": { name: "Bedtime", category: "sleep", tags: ["bed", "sleep", "night", "rest"] },
  "love.heart-1": { name: "Heart", category: "love", tags: ["heart", "love", "like"] },
  "love.heart-2": { name: "True heart", category: "love", tags: ["heart", "love", "sparkle"] },
  "love.hug": { name: "Together", category: "love", tags: ["hug", "together", "friends", "love"] },
  "party.popper": {
    name: "Popper",
    category: "celebrate",
    tags: ["party", "celebrate", "confetti", "congrats"],
  },
  "party.cake": {
    name: "Cake",
    category: "celebrate",
    tags: ["cake", "birthday", "celebrate", "sweet"],
  },
  "party.bloom-day": {
    name: "Bloom day",
    category: "celebrate",
    tags: ["celebrate", "milestone", "flower", "day"],
  },
  "day.coffee": {
    name: "Coffee",
    category: "everyday",
    tags: ["coffee", "morning", "drink", "cafe"],
  },
  "day.book": { name: "Reading", category: "everyday", tags: ["book", "read", "study", "learn"] },
  "day.music-note": {
    name: "Song",
    category: "everyday",
    tags: ["music", "song", "listen", "sound"],
  },
  "day.camera": {
    name: "Camera",
    category: "everyday",
    tags: ["camera", "photo", "picture", "shoot"],
  },
  "day.home": { name: "Home", category: "everyday", tags: ["home", "house", "cozy", "stay"] },
  "doodle.arrow": { name: "This", category: "deco", tags: ["arrow", "point", "look", "doodle"] },
  "doodle.circle": { name: "Circle", category: "deco", tags: ["circle", "ring", "draw", "doodle"] },
  "doodle.underline": {
    name: "Underline",
    category: "deco",
    tags: ["underline", "line", "draw", "doodle"],
  },
  "doodle.stars": {
    name: "Starry",
    category: "deco",
    tags: ["stars", "sparkle", "shine", "doodle"],
    animated: true,
  },
  "doodle.hearts": { name: "Hearts", category: "deco", tags: ["hearts", "love", "doodle"] },
  "season.blossom": {
    name: "Blossom",
    category: "seasonal",
    tags: ["spring", "blossom", "flowers", "season"],
  },
  "season.sun": { name: "Summer", category: "seasonal", tags: ["summer", "sun", "sea", "season"] },
  "season.leaf-fall": {
    name: "Autumn",
    category: "seasonal",
    tags: ["autumn", "fall", "leaves", "season"],
  },
  "season.snow": {
    name: "Winter",
    category: "seasonal",
    tags: ["winter", "snow", "cold", "season"],
  },
};

export const STICKER_LIST: StickerDef[] = Object.keys(ART).map((id) => ({
  id,
  name: META[id]?.name ?? id,
  category: META[id]?.category ?? "deco",
  tags: META[id]?.tags ?? [],
  animated: META[id]?.animated,
  art: ART[id],
}));

const BY_ID = new Map(STICKER_LIST.map((s) => [s.id, s]));

export function stickerById(id: string | null | undefined): StickerDef | null {
  if (!id) return null;
  return BY_ID.get(id) ?? null;
}

export function searchStickers(query: string, limit = 24): StickerDef[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/);
  const scored: { def: StickerDef; score: number }[] = [];
  for (const def of STICKER_LIST) {
    let score = 0;
    const hay = `${def.name} ${def.tags.join(" ")}`.toLowerCase();
    for (const t of terms) {
      if (def.name.toLowerCase().startsWith(t)) score += 3;
      else if (def.tags.some((tag) => tag.startsWith(t))) score += 2;
      else if (hay.includes(t)) score += 1;
      else {
        score = 0;
        break;
      }
    }
    if (score > 0) scored.push({ def, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.def);
}

export function stickersByCategory(category: StickerCategory): StickerDef[] {
  return STICKER_LIST.filter((s) => s.category === category);
}

/* ------------------------- recents + favorites -------------------------- */

const RECENTS_KEY = "bloom.stickers.recents.v1";
const FAVORITES_KEY = "bloom.stickers.favorites.v1";
const MAX_RECENTS = 12;

function readIds(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list)
      ? list.filter((v): v is string => typeof v === "string" && BY_ID.has(v))
      : [];
  } catch {
    return [];
  }
}

function writeIds(key: string, ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(ids.slice(0, 48)));
  } catch {
    /* best-effort */
  }
}

export function recordStickerUse(id: string): void {
  if (!BY_ID.has(id)) return;
  const next = [id, ...readIds(RECENTS_KEY).filter((x) => x !== id)].slice(0, MAX_RECENTS);
  writeIds(RECENTS_KEY, next);
  window.dispatchEvent(new CustomEvent("bloom:stickers-changed"));
}

export function toggleStickerFavorite(id: string): boolean {
  const favs = readIds(FAVORITES_KEY);
  const next = favs.includes(id) ? favs.filter((x) => x !== id) : [id, ...favs];
  writeIds(FAVORITES_KEY, next);
  window.dispatchEvent(new CustomEvent("bloom:stickers-changed"));
  return next.includes(id);
}

export function useStickerMemory(): { recents: StickerDef[]; favorites: Set<string> } {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const onChange = () => setTick((t) => t + 1);
    window.addEventListener("bloom:stickers-changed", onChange);
    return () => window.removeEventListener("bloom:stickers-changed", onChange);
  }, []);
  void tick;
  const recents = readIds(RECENTS_KEY)
    .map((id) => BY_ID.get(id))
    .filter((s): s is StickerDef => Boolean(s));
  return { recents, favorites: new Set(readIds(FAVORITES_KEY)) };
}

/* -------------------------------- render -------------------------------- */

export function StickerArt({
  id,
  size = 64,
  tint,
  className,
  style,
}: {
  id: string;
  size?: number;
  tint?: string | undefined;
  className?: string | undefined;
  style?: React.CSSProperties | undefined;
}) {
  const def = stickerById(id);
  if (!def) return null;
  return (
    <span
      className={className}
      data-sticker-animated={def.animated ? "true" : undefined}
      style={{
        display: "inline-grid",
        placeItems: "center",
        width: size,
        height: size,
        color: tint ?? "var(--foreground)",
        filter: "drop-shadow(0 4px 14px rgba(8,6,16,0.45))",
        ...style,
      }}
    >
      <span style={{ display: "block", width: "100%", height: "100%" }}>{def.art}</span>
    </span>
  );
}
