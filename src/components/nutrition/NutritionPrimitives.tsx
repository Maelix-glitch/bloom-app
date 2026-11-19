/**
 * Nutrition — the prototype's visual primitives (N-UI): the growing
 * Bar and the week's MiniBars, drawn with Bloom's tokens. Pure
 * presentation: callers pass fractions they computed from the lib (or
 * null, which draws the honest empty track — no fill — for a value
 * that has no target to be measured against).
 *
 * The concentric Rings that used to live here are gone (brief v6,
 * M-125): the day hero reads as house meters now, and nothing else
 * consumed the rings.
 */

import type { CSSProperties } from "react";

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
