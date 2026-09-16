/**
 * A small, contextual line for Home: where the journey stands and how far the
 * next rank is. Deliberately one chip — Home is not Rewards, it just remembers
 * that the journey exists.
 */

import { Sparkles } from "lucide-react";

import { rankFor } from "@/lib/progression/ranks";
import { formatPoints } from "@/lib/progression/format";
import { Emblem } from "./Emblem";

export function RankChip({ points }: { points: number | null }) {
  if (points === null) {
    return (
      <>
        <Sparkles className="size-4" style={{ color: "var(--home-cycle)" }} />
        Your journey
      </>
    );
  }
  const state = rankFor(points);
  const remaining = state.remaining;
  return (
    <>
      <span style={{ display: "inline-flex", color: state.rank.tone }} aria-hidden>
        <Emblem id={state.rank.emblem} size={15} strokeWidth={1.7} />
      </span>
      <span className="sr-only">{state.rank.name} —</span>
      {remaining > 0
        ? `${formatPoints(remaining)} points to ${state.next.name}`
        : `${state.rank.name} · ${formatPoints(points)} points`}
    </>
  );
}
