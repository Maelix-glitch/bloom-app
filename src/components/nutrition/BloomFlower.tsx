/**
 * The Bloom flower (brief v4 Part 3.2; rulebook §17.6 — the
 * signature viz): one petal per food group of the day's balance,
 * a filled petal for each group covered today. Petals are one
 * crafted path — a pointed oval grown from the flower's heart —
 * rotated around the centre; the heart is a medallion carrying
 * the Bloom mark itself. Filled petals are the gold family
 * (gold-soft fill, gold stroke); a missing group is the neutral
 * surface fill — never dashed, because dashed is reserved for
 * estimated data (the signature rule). Filled petals draw in
 * once, staggered, growing from their base; the whole figure is
 * one image to a screen reader, labelled with its count.
 */

import type { CSSProperties } from "react";

import { BloomLogo } from "@/components/BloomLogo";
import type { BalanceGroup } from "@/lib/nutrition";

/** One petal, drawn pointing up from the centre of a 120 box:
 *  base at the heart (60,60), tip at (60,6), the two cubic edges
 *  meeting in a true point at both ends. The heart medallion
 *  (r 15) covers the base point; the petal widens just beyond it. */
const PETAL_PATH = "M60 60C48 46 46 27 60 6C74 27 72 46 60 60Z";

export function BloomFlower({
  groups,
  size = 128,
}: {
  groups: readonly BalanceGroup[];
  size?: number;
}) {
  const covered = groups.filter((g) => g.covered).length;
  return (
    <div
      className="flower"
      data-flower
      role="img"
      aria-label={`${covered} of ${groups.length} food groups covered`}
      style={{ inlineSize: size, blockSize: size }}
    >
      <svg viewBox="0 0 120 120" className="flower__svg" aria-hidden="true">
        {groups.map((g, i) => (
          <g key={g.key} transform={`rotate(${(360 / groups.length) * i} 60 60)`}>
            <path
              d={PETAL_PATH}
              className={`petal${g.covered ? " is-on" : ""}`}
              data-petal
              data-group={g.key}
              data-covered={g.covered}
              style={{ "--i": i } as CSSProperties}
            />
          </g>
        ))}
        <circle className="flower__core" cx="60" cy="60" r="15" />
      </svg>
      <span className="flower__mark" aria-hidden="true">
        <BloomLogo size={Math.round(size * 0.24)} />
      </span>
    </div>
  );
}
