/**
 * useWallet — one points number, the same everywhere, from one store.
 *
 * This used to be per-component state: every PointsChip (header, sidebar,
 * phone bar) fetched the account balance on its own clock, and until its
 * fetch landed it rendered the device ledger. A signed-in user therefore
 * watched the number start at the device total, then swap to the account
 * total — and two chips could disagree for seconds, because they swapped at
 * different moments. That swap is the flicker the owner reported.
 *
 * Now the wallet is a module store, the same shape as `useSession` and
 * `lib/prefsStore`: one auth watch, one account read, one snapshot. Every
 * consumer renders the identical snapshot, so every points display updates
 * in the same frame, and the account read happens once, not once per chip.
 *
 * What shows, by state:
 *   · signed out (or no database): the device ledger — every habit tick,
 *     verified goal and achievement is an idempotent event, so the total is
 *     the real sum of what happened on this device.
 *   · signed in, account not yet read: `loading` is true and `balance` is
 *     provisional — displays must show a neutral placeholder, never the
 *     device number and never zero. A wrong number that corrects itself is
 *     worse than a brief dash.
 *   · signed in, account read: the account balance, the only number shown.
 *   · signed in, read failed: `degraded` — the device ledger stands in
 *     rather than showing a wrong zero, and displays say so.
 */

import { useEffect, useSyncExternalStore } from "react";

import { hasSupabaseConfig, watchAuth } from "@/lib/supabase";
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
  /**
   * The number to show. Account balance when it is readable, else this
   * device. While `loading` is true this is provisional — do not render it.
   */
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
  /**
   * True while the signed-in account balance is still being read (including
   * while we do not yet know whether there is a session). Displays render a
   * neutral placeholder in this state instead of any number.
   */
  loading: boolean;
  refresh: () => void;
}

/* ------------------------------- the store ------------------------------ */

interface WalletState {
  /** Bumped by every writer (tick, award, another tab, a merge). */
  version: number;
  userId: string | null;
  sessionReady: boolean;
  /** The account balance for `userId`; null until read, or if the read failed. */
  accountBalance: number | null;
  /** Whether the account read for the current user has finished at least once. */
  accountSettled: boolean;
  degraded: boolean;
}

let state: WalletState = {
  version: 0,
  userId: null,
  sessionReady: false,
  accountBalance: null,
  accountSettled: false,
  degraded: false,
};

let snapshot: Wallet | null = null;
const listeners = new Set<() => void>();
let started = false;
let fetchToken = 0;

function computeWallet(): Wallet {
  const deviceBalance = Math.max(0, pointsBalance());
  const signedIn = state.sessionReady && state.userId !== null;
  const fromAccount = signedIn && state.accountBalance !== null;
  return {
    balance: fromAccount ? (state.accountBalance as number) : deviceBalance,
    deviceBalance,
    todayEarned: todayPointsEarned(),
    history: pointEvents(),
    source: fromAccount ? "account" : "device",
    degraded: signedIn && state.degraded,
    // Before the first auth answer we cannot know whether an account
    // balance is coming, so with a database configured the honest state is
    // "loading", not the device number a signed-in user would watch swap.
    loading: !state.sessionReady
      ? hasSupabaseConfig
      : signedIn && !state.accountSettled,
    refresh: refreshWallet,
  };
}

function publish(): void {
  snapshot = computeWallet();
  for (const l of [...listeners]) l();
}

/**
 * The account balance a mutation already knows (P2-5, R16). A claim's
 * award RPC and a habit tick's award both RETURN the new server balance;
 * before this, the wallet ignored that value and re-read it over the
 * network on POINTS_CHANGED, so the points pill trailed the action by a
 * full round trip. Noting the balance moves the pill in the same frame
 * as the action; the next refresh still reconciles with the server.
 * Signed-out or pre-session calls are ignored — the device ledger is
 * that world's balance, and it already updates synchronously.
 */
export function noteAccountBalance(balance: number): void {
  if (!state.sessionReady || state.userId === null) return;
  if (state.accountSettled && state.accountBalance === balance) return;
  state = {
    ...state,
    accountBalance: balance,
    accountSettled: true,
    degraded: false,
  };
  publish();
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function getSnapshot(): Wallet {
  if (!snapshot) snapshot = computeWallet();
  return snapshot;
}

/**
 * SSR: no session, no ledger — a stable constant so hydration matches.
 * With a database configured, the honest server state is still `loading`:
 * whether an account balance is coming is unknowable on the server, and
 * rendering this snapshot's 0 as a device balance painted a brief guest
 * splash (0 points, sign-in framing) on every cold load before the real
 * store published. Same rule computeWallet applies on the client.
 */
const serverWallet: Wallet = {
  balance: 0,
  deviceBalance: 0,
  todayEarned: 0,
  history: [],
  source: "device",
  degraded: false,
  loading: hasSupabaseConfig,
  refresh: () => {},
};
const getServerSnapshot = (): Wallet => serverWallet;

/* ---------------------------- account reading --------------------------- */

function fetchAccount(): void {
  const userId = state.userId;
  if (!state.sessionReady || !userId || !hasSupabaseConfig) {
    if (state.accountBalance !== null || state.degraded || !state.accountSettled) {
      state = { ...state, accountBalance: null, degraded: false, accountSettled: true };
      publish();
    }
    return;
  }
  const token = ++fetchToken;
  void readPoints(userId).then((value) => {
    // A newer fetch (or a different user) supersedes this answer.
    if (token !== fetchToken || state.userId !== userId) return;
    state = {
      ...state,
      accountBalance: value,
      degraded: value === null,
      accountSettled: true,
    };
    publish();
  });
}

function refreshWallet(): void {
  state = { ...state, version: state.version + 1 };
  publish();
  fetchAccount();
}

/* -------------------------------- start --------------------------------- */

function ensureStarted(): void {
  if (started) return;
  started = true;

  /* Seed once: existing ticks/awards on this device become real ledger events. */
  seedPointsFromDevice();

  if (typeof window !== "undefined") {
    /* Every writer announces; one listener set serves the whole app. */
    const bump = () => refreshWallet();
    window.addEventListener(POINTS_CHANGED, bump);
    window.addEventListener(PREFS_CHANGED, bump);
    window.addEventListener(PROGRESSION_CHANGED, bump);
    window.addEventListener("storage", bump);
  }

  watchAuth((userId) => {
    const userChanged = userId !== state.userId;
    state = {
      ...state,
      userId,
      sessionReady: true,
      // A different user starts from "not read yet" — never show the
      // previous account's number, and never the device number in between.
      ...(userChanged
        ? { accountBalance: null, accountSettled: false, degraded: false }
        : {}),
    };
    publish();
    fetchAccount();
  });
}

/** The shared wallet. Every consumer sees the same snapshot. */
export function useWallet(): Wallet {
  const wallet = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => {
    ensureStarted();
  }, []);
  return wallet;
}
