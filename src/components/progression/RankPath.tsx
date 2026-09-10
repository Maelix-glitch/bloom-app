/**
 * The journey path — ranks as a walk through the garden, not a level list.
 *
 *   past      softly glowing (kept, honoured)
 *   current   illuminated, with a slow pulse
 *   future    distant and quiet, but always legible
 *
 * Past the named ladder the path continues into the season cycle, so the walk
 * genuinely has no last step.
 */

import { useMemo } from "react";

import { CYCLE_STEP, journeyRanks, rankFor } from "@/lib/progression/ranks";
import { formatPoints } from "@/lib/progression/format";
import { Emblem } from "./Emblem";

export function RankPath({ points, rankTier }: { points: number; rankTier: number }) {
  const ranks = useMemo(() => journeyRanks(points, 2, 3), [points]);
  const current = useMemo(() => rankFor(points), [points]);

  return (
    <div className="pg-path">
      <span className="pg-path-spine" aria-hidden />
      <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {ranks.map((rank) => {
          const state =
            rank.tier === rankTier ? "current" : rank.tier < rankTier ? "past" : "future";
          const stateLabel =
            state === "current" ? "You are here" : state === "past" ? "Kept" : "Ahead";
          return (
            <li
              key={`${rank.tier}-${rank.id}`}
              className="pg-node"
              data-state={state}
              aria-current={state === "current" ? "step" : undefined}
            >
              <span className="pg-node-mark">
                <span className="pg-node-dot" style={{ color: rank.tone }}>
                  <Emblem id={rank.emblem} size={state === "current" ? 26 : 20} strokeWidth={1.6} />
                  {state === "current" ? <span className="pg-node-pulse" aria-hidden /> : null}
                </span>
              </span>
              <span className="pg-node-copy">
                <span className="pg-node-name">{rank.name}</span>
                <span className="pg-node-meta">
                  {formatPoints(rank.threshold)} Bloom Points
                  {state === "future" && current.rank.tier < rank.tier
                    ? ` · ${formatPoints(Math.max(0, rank.threshold - points))} to go`
                    : ""}
                </span>
              </span>
              <span className="pg-node-state">{stateLabel}</span>
            </li>
          );
        })}
      </ol>
      <p className="pg-path-more">
        Past {ranks[ranks.length - 1]?.name ?? "the named ranks"} the path keeps going — a new season
        every {formatPoints(CYCLE_STEP)} points.
      </p>
    </div>
  );
}
