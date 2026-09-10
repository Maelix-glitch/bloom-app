/**
 * The rank pill shown beside a name (Profile, public profile).
 * It states the rank a real earned-point balance corresponds to, nothing more.
 */

import { Link } from "@tanstack/react-router";

import { rankFor } from "@/lib/progression/ranks";
import { formatPoints } from "@/lib/progression/format";
import { Emblem } from "./Emblem";

export function RankPill({ points, linkTo = true }: { points: number | null; linkTo?: boolean }) {
  if (points === null) return null;
  const state = rankFor(points);
  const content = (
    <span
      className="pg-rank-pill"
      style={{ ["--rank-tone" as string]: state.rank.tone }}
      title={`Rank ${state.rank.tier} · ${formatPoints(points)} Bloom Points`}
    >
      <Emblem id={state.rank.emblem} size={14} strokeWidth={1.8} />
      {state.rank.name}
    </span>
  );
  if (!linkTo) return content;
  return (
    <Link to="/rewards" className="pg-rank-pill-link" aria-label={`${state.rank.name} — your journey`}>
      {content}
    </Link>
  );
}
