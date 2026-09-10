/**
 * The Hall of Crests — the full rank ladder, laid out like a trophy case.
 *
 * Every rank in the named ladder (plus the first seasons of the cycle layer)
 * shows its full game-style crest: earned ones lit, the current one framed in
 * gold, future ones present but unlit — you can always see what you are
 * walking toward, which is most of the pull.
 */

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

import { ladderPreview } from "@/lib/progression/ranks";
import { formatPoints } from "@/lib/progression/format";
import { RankBadge, badgeBand, BADGE_BAND_NAMES } from "./RankBadge";

const LEGEND: { band: 1 | 2 | 3 | 4 | 5; tone: string }[] = [
  { band: 1, tone: "var(--sage)" },
  { band: 2, tone: "var(--gold)" },
  { band: 3, tone: "var(--rose)" },
  { band: 4, tone: "var(--gold)" },
  { band: 5, tone: "var(--violet)" },
];

export function CrestHall({ points, rankTier }: { points: number; rankTier: number }) {
  const [showAll, setShowAll] = useState(false);
  const ladder = useMemo(() => ladderPreview(2), []);

  /* Collapsed: everything earned, plus the next two crests to chase. */
  const visible = showAll ? ladder : ladder.filter((rank) => rank.tier <= rankTier + 2);

  return (
    <div>
      <ul className="pg-hall" style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {visible.map((rank, index) => {
          const state =
            rank.tier === rankTier ? "current" : rank.tier < rankTier ? "earned" : "future";
          return (
            <li
              key={`${rank.tier}-${rank.id}`}
              className="pg-hall-item"
              data-state={state}
              style={{ ["--pg-crest-tone" as string]: rank.tone }}
            >
              <span className="pg-hall-state">
                {state === "current" ? "You are here" : state === "earned" ? "Earned" : "Ahead"}
              </span>
              <RankBadge
                rank={rank}
                muted={state === "future"}
                style={{ ["--pg-i" as string]: index % 5 } as React.CSSProperties}
              />
              <span className="pg-hall-name">{rank.name}</span>
              <span className="pg-hall-meta">
                {BADGE_BAND_NAMES[badgeBand(rank.tier)]} · {formatPoints(rank.threshold)} pts
              </span>
            </li>
          );
        })}
      </ul>

      {!showAll && visible.length < ladder.length ? (
        <div className="pg-pager">
          <button type="button" className="pg-btn pg-btn-quiet" onClick={() => setShowAll(true)}>
            <ChevronDown width={13} height={13} aria-hidden />
            Show all {ladder.length} crests
          </button>
        </div>
      ) : null}

      <p className="pg-hall-legend" aria-label="Crest frames by rank band">
        {LEGEND.map(({ band, tone }) => (
          <i key={band} style={{ ["--legend-tone" as string]: tone } as React.CSSProperties}>
            {BADGE_BAND_NAMES[band]}
          </i>
        ))}
      </p>
    </div>
  );
}
