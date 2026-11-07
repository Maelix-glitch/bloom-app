/**
 * PointsChip — the wallet, visible on every page.
 *
 * Points are the spine of Bloom: a tick on Today, a verified goal on the
 * Journey, a finished routine at night. Showing the number only inside
 * Rewards meant an earning could happen with no visible result, which read as
 * "the points didn't count". This chip is the one persistent receipt.
 *
 * While the account balance is still loading, the chip shows a dash — never
 * the device number a signed-in user would watch swap to the account number
 * a second later. Every chip reads the one shared wallet store, so they all
 * land on the real number in the same frame.
 */

import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

import { useWallet } from "@/hooks/useWallet";
import { formatPoints } from "@/lib/progression/format";
import { cn } from "@/lib/utils";

export function PointsChip({
  className,
  compact = false,
}: {
  className?: string;
  /** Phone bar: icon + number only, no label. */
  compact?: boolean;
}) {
  const wallet = useWallet();
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
      aria-label={
        wallet.loading
          ? "Loading your Bloom Points — open your Journey"
          : `${formatPoints(wallet.balance)} Bloom Points — open your Journey`
      }
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2/60 px-2.5 py-1.5 text-[12px] font-medium tabular-nums text-foreground transition-colors hover:border-primary/40 hover:text-primary",
        className,
      )}
      data-testid="points-chip"
    >
      <Sparkles className="size-3.5 text-primary" strokeWidth={1.8} aria-hidden />
      <span>{wallet.loading ? "—" : formatPoints(wallet.balance)}</span>
      {compact ? null : <span className="text-muted-foreground">points</span>}
    </Link>
  );
}
