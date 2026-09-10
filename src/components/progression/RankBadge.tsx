/**
 * RankBadge — the game-style crest for a rank.
 *
 * Every rank renders as a full insignia: an ornate metallic frame around the
 * rank's botanical emblem, plus an optional notched banner ribbon carrying the
 * rank's name. The frame itself is earned — it grows more elaborate as the
 * ladder climbs, the way competitive games escalate their rank badges:
 *
 *   band 1 · tiers 1–3    Verdant  — a simple struck ring          (bronze-leaf)
 *   band 2 · tiers 4–6    Gilded   — a hex plate with a crown gem  (gold)
 *   band 3 · tiers 7–9    Laurel   — a shield framed by laurels    (rose-gold)
 *   band 4 · tiers 10–12  Radiant  — a winged star with a diadem   (bright gold)
 *   band 5 · cycle ranks  Mythic   — a rosette inside an orbit     (violet-gold)
 *
 * Everything is stroke-drawn SVG — crisp at 64px in a gallery and 300px in the
 * ceremony — and fully deterministic, so SSR and the client always agree.
 */

import { useId, type CSSProperties } from "react";

import type { RankDef } from "@/lib/progression/types";
import { Emblem } from "./Emblem";

export type BadgeBand = 1 | 2 | 3 | 4 | 5;

/** Which crest band a ladder tier has earned. */
export function badgeBand(tier: number): BadgeBand {
  if (tier >= 13) return 5;
  if (tier >= 10) return 4;
  if (tier >= 7) return 3;
  if (tier >= 4) return 2;
  return 1;
}

export const BADGE_BAND_NAMES: Record<BadgeBand, string> = {
  1: "Verdant frame",
  2: "Gilded frame",
  3: "Laurel frame",
  4: "Radiant frame",
  5: "Mythic frame",
};

/* ----------------------------- frame geometry ---------------------------- */

/** A star/polygon path alternating between two radii, centred on (80,80). */
function starPath(points: number, outer: number, inner: number, rotate = -90): string {
  const step = 360 / (points * 2);
  const parts: string[] = [];
  for (let i = 0; i < points * 2; i += 1) {
    const r = i % 2 === 0 ? outer : inner;
    const a = ((rotate + step * i) * Math.PI) / 180;
    const x = 80 + r * Math.cos(a);
    const y = 80 + r * Math.sin(a);
    parts.push(`${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return `${parts.join(" ")} Z`;
}

/** A regular polygon path centred on (80,80). */
function polygonPath(sides: number, radius: number, rotate = -90): string {
  const parts: string[] = [];
  for (let i = 0; i < sides; i += 1) {
    const a = ((rotate + (360 / sides) * i) * Math.PI) / 180;
    const x = 80 + radius * Math.cos(a);
    const y = 80 + radius * Math.sin(a);
    parts.push(`${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return `${parts.join(" ")} Z`;
}

const HEX_OUTER = polygonPath(6, 52);
const HEX_INNER = polygonPath(6, 44);
const STAR_OUTER = starPath(8, 56, 46);
const STAR_INNER = starPath(8, 48, 41);
const ROSETTE_OUTER = starPath(10, 56, 47);
const ROSETTE_INNER = starPath(10, 49, 43);

/** The heraldic shield used by band 3. */
const SHIELD_OUTER = "M80 22 L130 40 V86 C130 114 108 132 80 142 C52 132 30 114 30 86 V40 Z";
const SHIELD_INNER = "M80 32 L121 47 V85 C121 108 103 123 80 132 C57 123 39 108 39 85 V47 Z";

/** One laurel branch (left side); the right side mirrors it. */
function Laurel() {
  return (
    <g>
      <path d="M34 116 C16 104 8 82 14 56" fill="none" />
      {[0, 1, 2, 3, 4].map((i) => {
        const t = i / 4;
        const x = 30 - 14 * t;
        const y = 112 - 52 * t;
        return (
          <path
            key={i}
            d={`M${x} ${y} q -10 -2 -12 -12 q 10 0 12 12`}
            fill="var(--pg-badge-lo)"
            stroke="none"
            opacity={0.9 - i * 0.08}
          />
        );
      })}
    </g>
  );
}

/** One wing (left side) for the radiant band; the right side mirrors it. */
function Wing() {
  return (
    <g fill="none">
      <path d="M30 96 C8 90 -0 68 6 44 C14 58 22 64 32 66" />
      <path d="M32 106 C6 102 -4 76 2 50" opacity="0.7" />
      <path d="M36 116 C12 114 0 88 4 62" opacity="0.45" />
    </g>
  );
}

/** A small cut gem. */
function Gem({ x, y, size = 6 }: { x: number; y: number; size?: number }) {
  return (
    <path
      className="pg-badge-gem"
      d={`M${x} ${y - size} L${x + size * 0.8} ${y} L${x} ${y + size} L${x - size * 0.8} ${y} Z`}
    />
  );
}

/* --------------------------------- banner -------------------------------- */

/**
 * The notched ribbon that carries a rank's name — usable on its own (under the
 * hero's ring) or as part of the full crest via `banner`.
 */
export function RankBanner({
  children,
  tone,
  className,
}: {
  children: string;
  tone?: string;
  className?: string;
}) {
  return (
    <span
      className={`pg-crest-banner${className ? ` ${className}` : ""}`}
      style={tone ? ({ ["--pg-crest-tone" as string]: tone } as CSSProperties) : undefined}
    >
      <span className="pg-crest-banner-tail pg-crest-banner-tail-l" aria-hidden />
      <span className="pg-crest-banner-body">{children}</span>
      <span className="pg-crest-banner-tail pg-crest-banner-tail-r" aria-hidden />
    </span>
  );
}

/* --------------------------------- crest --------------------------------- */

export function RankBadge({
  rank,
  size,
  banner = false,
  muted = false,
  className,
  style,
}: {
  rank: RankDef;
  /**
   * Rendered width of the crest in px. Omit it to fill the parent — every
   * internal layer is percentage-based, so the crest scales as one piece.
   */
  size?: number;
  /** Show the notched ribbon with the rank's name below the crest. */
  banner?: boolean;
  /** Locked/future presentation: the frame stays, the light goes out. */
  muted?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const band = badgeBand(rank.tier);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const metalId = `pg-metal-${uid}`;

  return (
    <div
      className={`pg-crest${muted ? " pg-crest-muted" : ""}${className ? ` ${className}` : ""}`}
      data-band={band}
      style={{
        ...(size !== undefined ? { width: size } : null),
        ["--pg-crest-tone" as string]: rank.tone,
        ...style,
      }}
    >
      <div className="pg-crest-art">
        <svg
          className="pg-crest-frame"
          viewBox="0 0 160 160"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <linearGradient id={metalId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" style={{ stopColor: "var(--pg-badge-hi)" }} />
              <stop offset="48%" style={{ stopColor: "var(--pg-badge-lo)" }} />
              <stop offset="100%" style={{ stopColor: "var(--pg-badge-hi)" }} />
            </linearGradient>
          </defs>

          <g stroke={`url(#${metalId})`}>
            {/* ---- band 1 · Verdant: a struck double ring with a seed notch */}
            {band === 1 ? (
              <>
                <circle cx="80" cy="80" r="52" strokeWidth="2.5" />
                <circle cx="80" cy="80" r="45" strokeWidth="1" opacity="0.7" />
                <path d="M80 24 L84 31 L80 36 L76 31 Z" fill="var(--pg-badge-lo)" strokeWidth="1" />
              </>
            ) : null}

            {/* ---- band 2 · Gilded: hex plate, rivets, crown gem */}
            {band === 2 ? (
              <>
                <path d={HEX_OUTER} strokeWidth="2.5" />
                <path d={HEX_INNER} strokeWidth="1" opacity="0.7" />
                {[0, 60, 120, 180, 240, 300].map((a) => {
                  const rad = ((a - 90) * Math.PI) / 180;
                  return (
                    <circle
                      key={a}
                      cx={80 + 48 * Math.cos(rad)}
                      cy={80 + 48 * Math.sin(rad)}
                      r="1.6"
                      fill="var(--pg-badge-hi)"
                      strokeWidth="0"
                    />
                  );
                })}
              </>
            ) : null}

            {/* ---- band 3 · Laurel: heraldic shield framed by laurel branches */}
            {band === 3 ? (
              <>
                <path d={SHIELD_OUTER} strokeWidth="2.5" />
                <path d={SHIELD_INNER} strokeWidth="1" opacity="0.7" />
                <Laurel />
                <g transform="translate(160 0) scale(-1 1)">
                  <Laurel />
                </g>
              </>
            ) : null}

            {/* ---- band 4 · Radiant: eight-point star, wings, diadem */}
            {band === 4 ? (
              <>
                <path d={STAR_OUTER} strokeWidth="2.25" />
                <path d={STAR_INNER} strokeWidth="1" opacity="0.7" />
                <Wing />
                <g transform="translate(160 0) scale(-1 1)">
                  <Wing />
                </g>
                {/* diadem spikes */}
                <path d="M80 8 L85 20 L80 26 L75 20 Z" fill="var(--pg-badge-lo)" strokeWidth="1" />
                <path
                  d="M64 14 L68 22 L63 26 Z"
                  fill="var(--pg-badge-lo)"
                  strokeWidth="1"
                  opacity="0.8"
                />
                <path
                  d="M96 14 L92 22 L97 26 Z"
                  fill="var(--pg-badge-lo)"
                  strokeWidth="1"
                  opacity="0.8"
                />
              </>
            ) : null}

            {/* ---- band 5 · Mythic: rosette inside a slow orbit ring */}
            {band === 5 ? (
              <>
                <path d={ROSETTE_OUTER} strokeWidth="2.25" />
                <path d={ROSETTE_INNER} strokeWidth="1" opacity="0.7" />
                <circle
                  className="pg-crest-orbit-ring"
                  cx="80"
                  cy="80"
                  r="62"
                  strokeWidth="0.8"
                  strokeDasharray="3 7"
                  opacity="0.8"
                />
                <path d="M80 6 L85 16 L80 22 L75 16 Z" fill="var(--pg-badge-lo)" strokeWidth="1" />
              </>
            ) : null}

            {/* gems: one from band 2, three from band 3 */}
            {band >= 2 ? <Gem x={80} y={band >= 4 ? 34 : band === 3 ? 30 : 26} /> : null}
            {band >= 3 ? (
              <>
                <Gem x={band === 3 ? 36 : 30} y={band === 3 ? 46 : 80} size={4} />
                <Gem x={band === 3 ? 124 : 130} y={band === 3 ? 46 : 80} size={4} />
              </>
            ) : null}
          </g>
        </svg>

        {/* the rank's own botanical mark, lit by its tone */}
        <span className="pg-crest-emblem" style={{ color: rank.tone }}>
          <Emblem id={rank.emblem} size={48} strokeWidth={1.4} className="pg-crest-emblem-svg" />
        </span>

        {/* the light: a soft core glow + a passing sheen, both CSS-driven */}
        <span className="pg-crest-glow" aria-hidden />
        <span className="pg-crest-sheen" aria-hidden />
      </div>

      {banner ? <RankBanner>{rank.name}</RankBanner> : null}
    </div>
  );
}
