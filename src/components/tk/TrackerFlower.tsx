/**
 * The Bloom flower for the Trackers board (Brief v6 §5.2; M-131).
 *
 * The 24-hour compass is retired: its rings were near-invisible, its
 * labels were tiny mono, and the column under it stood ~400px tall over
 * nothing. The flower is the house signature instead — the same figure
 * Today and Nutrition carry — drawn from the one fact the dial itself
 * counted: whether each tracker's target was reached today.
 *
 * One petal per tracker the person tracks. A petal is filled when the
 * core says the target was met (`met === true` in lib/trackers/core —
 * the state behind `goalsMetToday`, computed by `metGoal` against the
 * person's own goal and direction) and a hollow outline when it was
 * not — logged-but-short and not-yet-logged both read as "not yet",
 * which is all the dial's centre figure ever claimed either.
 *
 * Geometry follows the house petal pattern (ci/SymptomBloom): polar
 * points around a centre, coordinates rounded to two places so the
 * server and the browser agree on the attribute and React never
 * reports a hydration mismatch.
 */

import type { TrackerId } from "@/lib/trackers/core";

export interface FlowerPetal {
  id: TrackerId;
  name: string;
  /** The core's own reached state for today — never recomputed here. */
  met: boolean;
}

const SIZE = 260;
const C = SIZE / 2;
const R_BASE = 34;
const R_TIP = 102;
const R_SHOULDER = 74;

const round2 = (v: number) => Math.round(v * 100) / 100;

function polar(r: number, deg: number): { x: number; y: number } {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: round2(C + r * Math.cos(rad)), y: round2(C + r * Math.sin(rad)) };
}

/** A leaf: base at the heart, swelling through two shoulders to a tip. */
function petalPath(deg: number): string {
  const base = polar(R_BASE, deg);
  const left = polar(R_SHOULDER, deg - 17);
  const tip = polar(R_TIP, deg);
  const right = polar(R_SHOULDER, deg + 17);
  return `M ${base.x} ${base.y} Q ${left.x} ${left.y} ${tip.x} ${tip.y} Q ${right.x} ${right.y} ${base.x} ${base.y} Z`;
}

export function TrackerFlower({ petals }: { petals: FlowerPetal[] }) {
  const met = petals.filter((p) => p.met).length;
  const summary = petals.map((p) => `${p.name} ${p.met ? "reached" : "not yet"}`).join(", ");

  return (
    <figure className="at-flower" data-testid="tracker-flower">
      <svg
        viewBox={`-36 -36 ${SIZE + 72} ${SIZE + 72}`}
        role="img"
        aria-label={`Today's trackers as a flower: ${met} of ${petals.length} targets reached. ${summary}.`}
      >
        {petals.map((petal, i) => {
          const deg = (i / Math.max(petals.length, 1)) * 360;
          const label = polar(R_TIP + 20, deg);
          return (
            <g key={petal.id}>
              <path
                d={petalPath(deg)}
                className="at-petal"
                data-petal=""
                data-id={petal.id}
                data-met={petal.met ? "true" : "false"}
              />
              <text x={label.x} y={label.y + 4} className="at-petal-label" textAnchor="middle">
                {petal.name}
              </text>
            </g>
          );
        })}
        <circle cx={C} cy={C} r={R_BASE - 10} className="at-flower-heart" />
        <circle cx={C} cy={C} r={4} className="at-flower-seed" />
      </svg>
      <figcaption className="at-flower-count">
        {met} of {petals.length} reached today
      </figcaption>
    </figure>
  );
}

export default TrackerFlower;
