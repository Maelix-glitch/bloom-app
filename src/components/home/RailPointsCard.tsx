/**
 * RailPointsCard — the sidebar's Level card (Reskin slice 2; brief v4
 * Part 4 form since the v4 shell slice).
 *
 * The prototype's richer form of the old PointsChip pill: the real
 * balance, the way through the current rank as a LABELLED meter, and
 * the distance to the next rank in points. Every number derives from
 * Bloom's own progression system — the shared wallet store for the
 * balance (the same snapshot the chips and the award toasts read, so
 * the card lands on a new balance in the same frame as everything
 * else) and `rankFor` in lib/progression/ranks for the rank maths.
 * Nothing is hardcoded, and — the brief's rule — there is no bare
 * percentage anywhere: the meter carries its own label ("465 of 700")
 * and the line under it states the remainder outright ("235 points to
 * Sprout"), both read straight off the RankState thresholds.
 *
 * The level lives HERE and only here: the account row at the rail's
 * foot shows the member's plan instead, so a rank name is never stated
 * twice in the same rail (M-91).
 *
 * While the account balance is still loading the card shows the same
 * neutral dash the chip does — never the provisional device number.
 */

import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

import { useWallet } from "@/hooks/useWallet";
import { formatPoints } from "@/lib/progression/format";
import { rankFor } from "@/lib/progression/ranks";

export interface RailPointsModel {
  /** The current rank's name (Bloom's ladder, e.g. "First Bloom"). */
  rankName: string;
  /** The rank the progress bar is filling towards. */
  nextName: string;
  /** Whole percent of the current rank's span covered, 0–100. Drives
   *  the meter's fill width only — it is never printed bare. */
  pct: number;
  /** Points earned inside the current rank (the meter's value). */
  intoRank: number;
  /** Points the current rank spans (the meter's maximum). */
  span: number;
  /** Points still needed for the next rank, from the thresholds. */
  pointsToNext: number;
}

/** Pure rank maths for a balance — the card's one derivation, unit-tested. */
export function railPointsModel(balance: number): RailPointsModel {
  const state = rankFor(balance);
  return {
    rankName: state.rank.name,
    nextName: state.next.name,
    pct: Math.round(state.progress * 100),
    intoRank: state.intoRank,
    span: state.span,
    pointsToNext: state.remaining,
  };
}

export function RailPointsCard() {
  const wallet = useWallet();
  const model = railPointsModel(wallet.balance);
  const title = wallet.loading
    ? "Loading your account balance…"
    : wallet.source === "account"
      ? "Your account balance"
      : wallet.degraded
        ? "Your account balance couldn't load — showing this device for now"
        : "Earned on this device — sign in to sync";
  return (
    <Link
      to="/rewards"
      data-testid="rail-points-card"
      title={title}
      aria-label={
        wallet.loading
          ? "Loading your Bloom Points — open your Journey"
          : `${formatPoints(wallet.balance)} Bloom Points, ${model.rankName}, ${formatPoints(model.pointsToNext)} points to ${model.nextName} — open your Journey`
      }
      className="rail-points-card block p-[var(--space-4)] transition-colors hover:border-primary/40"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="size-3.5 text-primary" strokeWidth={1.8} aria-hidden />
        <span className="text-[length:var(--text-body)] font-semibold tabular-nums leading-[var(--leading-tight)] text-foreground">
          {wallet.loading ? "—" : formatPoints(wallet.balance)}
        </span>
        <span className="text-[length:var(--text-support)] leading-[var(--leading-tight)] text-muted-foreground">
          points
        </span>
      </div>
      <div className="mt-2.5 flex items-baseline justify-between gap-2">
        <span className="text-[length:var(--text-support)] font-medium leading-[var(--leading-tight)] text-foreground">
          {wallet.loading ? "…" : `${model.rankName} → ${model.nextName}`}
        </span>
        <span className="text-[length:var(--text-meta)] tabular-nums leading-[var(--leading-tight)] text-faint-strong">
          {wallet.loading ? "—" : `${formatPoints(model.intoRank)} of ${formatPoints(model.span)}`}
        </span>
      </div>
      <div
        className="rail-points-track mt-2"
        role="progressbar"
        aria-label={
          wallet.loading
            ? "Loading your level progress"
            : `${model.rankName}: ${formatPoints(model.intoRank)} of ${formatPoints(model.span)} points towards ${model.nextName}`
        }
        aria-valuemin={0}
        aria-valuemax={wallet.loading ? 0 : model.span}
        aria-valuenow={wallet.loading ? 0 : model.intoRank}
      >
        <div
          className="rail-points-fill"
          style={{ width: wallet.loading ? "0%" : `${model.pct}%` }}
        />
      </div>
      <p className="mt-2 text-[length:var(--text-meta)] leading-[var(--leading-meta)] text-faint-strong">
        {wallet.loading
          ? "…"
          : `${formatPoints(model.pointsToNext)} points to ${model.nextName}`}
      </p>
    </Link>
  );
}
