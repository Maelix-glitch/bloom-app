/**
 * Nutrition — the prototype's visual primitives (N-UI): concentric
 * Rings, the growing Bar and the week's MiniBars, drawn with Bloom's
 * tokens. Pure presentation: callers pass fractions they computed from
 * the lib (or null, which draws the honest empty track — no arc, no
 * fill — for a value that has no target to be measured against).
 */

import type { CSSProperties, ReactNode } from "react";

export interface RingSpec {
  /** 0..1 of the ring's guide; null draws the track only. */
  fraction: number | null;
  /** Stroke colour (a token reference, e.g. "var(--sage)"). */
  color: string;
}

export function Rings({
  rings,
  size = 272,
  stroke = 12,
  gap = 8,
  children,
}: {
  rings: readonly RingSpec[];
  size?: number;
  stroke?: number;
  gap?: number;
  children?: ReactNode;
}) {
  const centre = size / 2;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        {rings.map((ring, i) => {
          const r = centre - stroke / 2 - i * (stroke + gap);
          const circ = 2 * Math.PI * r;
          const fraction =
            ring.fraction === null ? null : Math.max(0, Math.min(1, ring.fraction));
          return (
            <g key={i}>
              <circle
                cx={centre}
                cy={centre}
                r={r}
                fill="none"
                strokeWidth={stroke}
                style={{ stroke: "color-mix(in oklab, var(--foreground) 7%, transparent)" }}
              />
              {fraction !== null ? (
                <circle
                  cx={centre}
                  cy={centre}
                  r={r}
                  fill="none"
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${centre} ${centre})`}
                  strokeDasharray={circ}
                  className="nut-ring-arc"
                  style={
                    {
                      stroke: ring.color,
                      filter: `drop-shadow(0 0 10px ${ring.color})`,
                      "--circ": circ,
                      "--len": circ * (1 - fraction),
                      "--d": `${i * 140}ms`,
                    } as CSSProperties
                  }
                />
              ) : null}
            </g>
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
}

/** A horizontal bar: track + a fill that grows in. Null fraction = the
 *  track alone (a total with no target is not drawn as 0% of one). */
export function Bar({
  fraction,
  color,
  height = 6,
  delay = 0,
}: {
  fraction: number | null;
  color: string;
  height?: number;
  delay?: number;
}) {
  return (
    <div className="nut-track" style={{ height }}>
      {fraction !== null ? (
        <span
          className="nut-track-fill nut-grow-x"
          style={
            {
              width: `${Math.max(0, Math.min(1, fraction)) * 100}%`,
              background: color,
              "--d": `${delay}ms`,
            } as CSSProperties
          }
        />
      ) : null}
    </div>
  );
}

/** The week's rhythm: one bar per day, unlogged days as faint stubs,
 *  an optional dashed target line. Values are kcal; null = unlogged. */
export function MiniBars({
  values,
  max,
  target,
  height = 110,
  labels,
}: {
  values: readonly (number | null)[];
  max: number;
  target?: number | null;
  height?: number;
  labels: readonly string[];
}) {
  const safeMax = Math.max(1, max);
  return (
    <div>
      <div className="relative flex items-end gap-2" style={{ height }}>
        {target !== null && target !== undefined ? (
          <div
            className="absolute inset-x-0 border-t border-dashed"
            style={{
              bottom: `${Math.min(100, (target / safeMax) * 100)}%`,
              borderColor: "color-mix(in oklab, var(--gold) 45%, transparent)",
            }}
            aria-hidden
          />
        ) : null}
        {values.map((value, i) => (
          <div key={i} className="flex flex-1 items-end justify-center" style={{ height }}>
            {value === null ? (
              <div
                className="w-full rounded-t"
                style={{
                  height: 3,
                  background: "color-mix(in oklab, var(--foreground) 10%, transparent)",
                }}
              />
            ) : (
              <div
                className="nut-grow-y w-full rounded-t"
                style={
                  {
                    height: `${Math.max(2, (value / safeMax) * 100)}%`,
                    backgroundImage: "var(--gold-gradient)",
                    opacity: i === values.length - 1 ? 1 : 0.55,
                    "--d": `${i * 70}ms`,
                  } as CSSProperties
                }
              />
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        {labels.map((label, i) => (
          <div
            key={i}
            className="flex-1 text-center text-[length:var(--text-micro)] uppercase tracking-[var(--tracking-meta)] text-faint-strong"
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
