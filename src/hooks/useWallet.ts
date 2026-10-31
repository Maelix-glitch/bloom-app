/**
 * useWallet — one points number, the same everywhere.
 *
 * Signed out (or with no database), the wallet is the device ledger: every
 * habit tick, verified goal and achievement is an idempotent event, so the
 * total is the real sum of what happened on this device.
 *
 * Signed in, the account is authoritative: `profiles.total_points` is read
 * through the same code the habits hook uses, and the ledger is the receipt
 * feed. If that read fails, the device ledger stands in rather than showing a
 * wrong zero.
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import { useSession } from "@/hooks/useSession";
import { hasSupabaseConfig } from "@/lib/supabase";
import { readPoints } from "@/lib/home/habits";
import {
  POINTS_CHANGED,
  pointEvents,
  pointsBalance,
  seedPointsFromDevice,
  todayPointsEarned,
} from "@/lib/points/ledger";
import { PROGRESSION_CHANGED } from "@/lib/progression/store";
import { PREFS_CHANGED } from "@/lib/prefs";

export interface Wallet {
  /** The number to show. Account balance when it is readable, else this device. */
  balance: number;
  /** The device ledger total — always available, never waits on a network. */
  deviceBalance: number;
  /** Points earned on the local day (account-only totals are not split that way). */
  todayEarned: number;
  /** Newest first, for a receipt feed. */
  history: ReturnType<typeof pointEvents>;
  source: "account" | "device";
  /** True when a signed-in balance could not be read, so the device total is shown. */
  degraded: boolean;
  refresh: () => void;
}

export function useWallet(): Wallet {
  const session = useSession();
  const [version, setVersion] = useState(0);
  const [accountBalance, setAccountBalance] = useState<number | null>(null);
  const [degraded, setDegraded] = useState(false);

  /* Seed once: existing ticks/awards on this device become real ledger events. */
  useEffect(() => {
    seedPointsFromDevice();
    setVersion((v) => v + 1);
  }, []);

  /* Every writer (habit tick, goal claim, another tab, a merge) announces. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const bump = () => setVersion((v) => v + 1);
    window.addEventListener(POINTS_CHANGED, bump);
    window.addEventListener(PREFS_CHANGED, bump);
    window.addEventListener(PROGRESSION_CHANGED, bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener(POINTS_CHANGED, bump);
      window.removeEventListener(PREFS_CHANGED, bump);
      window.removeEventListener(PROGRESSION_CHANGED, bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  const signedIn = session.ready && session.userId !== null;

  useEffect(() => {
    if (!signedIn || !session.userId || !hasSupabaseConfig) {
      setAccountBalance(null);
      setDegraded(false);
      return;
    }
    let alive = true;
    void readPoints(session.userId).then((value) => {
      if (!alive) return;
      setAccountBalance(value);
      setDegraded(value === null);
    });
    return () => {
      alive = false;
    };
  }, [signedIn, session.userId, version]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  return useMemo(() => {
    void version;
    const deviceBalance = pointsBalance();
    const history = pointEvents();
    const fromAccount = signedIn && accountBalance !== null;
    return {
      balance: fromAccount ? accountBalance : Math.max(0, deviceBalance),
      deviceBalance: Math.max(0, deviceBalance),
      todayEarned: todayPointsEarned(),
      history,
      source: fromAccount ? "account" : "device",
      degraded: signedIn && degraded,
      refresh,
    };
  }, [version, signedIn, accountBalance, degraded, refresh]);
}
