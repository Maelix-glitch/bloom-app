/**
 * RailPointsCard — the sidebar's points card (Reskin slice 2).
 *
 * The prototype's richer form of the old PointsChip pill: the real balance,
 * the percentage of the way through the current rank, a thin gold-gradient
 * progress track, and the next rank's name. Every number derives from
 * Bloom's own progression system — the shared wallet store for the balance
 * (the same snapshot the chips and the award toasts read, so the card lands
 * on a new balance in the same frame as everything else) and `rankFor` in
 * lib/progression/ranks for the rank maths. Nothing is hardcoded: the
 * percentage is the honest share of the current rank's span the balance
 * has covered (`intoRank / span`), and the "next level" is whatever rank
 * actually follows the current one, named ladder or cycle season alike.
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
  /** Whole percent of the current rank's span covered, 0–100. */
  pct: number;
}

/** Pure rank maths for a balance — the card's one derivation, unit-tested. */
export function railPointsModel(balance: number): RailPointsModel {
  const state = rankFor(balance);
  return {
    rankName: state.rank.name,
    nextName: state.next.name,
    pct: Math.round(state.progress * 100),
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
          : `${formatPoints(wallet.balance)} Bloom Points, ${model.pct}% of the way to ${model.nextName} — open your Journey`
      }
      className="rail-points-card block p-[var(--space-4)] transition-colors hover:border-primary/40"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <Sparkles className="size-3.5 text-primary" strokeWidth={1.8} aria-hidden />
          <span className="text-[length:var(--text-body)] font-semibold tabular-nums leading-[var(--leading-tight)] text-foreground">
            {wallet.loading ? "—" : formatPoints(wallet.balance)}
          </span>
          <span className="text-[length:var(--text-support)] leading-[var(--leading-tight)] text-muted-foreground">
            points
          </span>
        </span>
        <span className="text-[length:var(--text-meta)] tabular-nums leading-[var(--leading-tight)] text-faint-strong">
          {wallet.loading ? "—" : `${model.pct}%`}
        </span>
      </div>
      <div className="rail-points-track mt-3" aria-hidden="true">
        <div
          className="rail-points-fill"
          style={{ width: wallet.loading ? "0%" : `${model.pct}%` }}
        />
      </div>
      <p className="mt-2 text-[length:var(--text-meta)] leading-[var(--leading-meta)] text-faint-strong">
        Next level · {wallet.loading ? "…" : model.nextName}
      </p>
    </Link>
  );
}
