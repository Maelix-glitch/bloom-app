/**
 * The client side of the Money System: reading the caller's
 * entitlement from the `get_my_entitlement` RPC, cached and shared.
 *
 * Honesty rules, mirroring the server gate:
 *   · This is a DISPLAY + UX layer. The real enforcement is
 *     server-side (the coach function gates AI; the database holds
 *     the state behind RLS). Nothing here can grant anything.
 *   · When the entitlement cannot be read — no project configured,
 *     signed out, the billing migration not applied yet, offline —
 *     the state is "unavailable", and the UI treats the person as
 *     free WITHOUT inventing numbers: no balance is shown that was
 *     not actually read.
 *   · A short cache keeps every surface from hammering the RPC; an
 *     auth change invalidates it immediately, and a completed AI
 *     answer can invalidate it too (the balance just moved).
 */

import { hasSupabaseConfig, supabase, watchAuth } from "@/lib/supabase";
import { asPlanTier, type PlanTier } from "@/lib/billing/plans";

export interface Entitlement {
  tier: PlanTier;
  status: string;
  currentPeriodEnd: string | null;
  creditBalance: number;
  monthlyAllowance: number;
  periodStart: string | null;
}

export type EntitlementState =
  | { kind: "ready"; entitlement: Entitlement }
  | { kind: "unavailable" };

const UNAVAILABLE: EntitlementState = { kind: "unavailable" };
const CACHE_MS = 60_000;

let cache: { state: EntitlementState; at: number } | null = null;
let inflight: Promise<EntitlementState> | null = null;
const listeners = new Set<(state: EntitlementState) => void>();
let authWatched = false;

function emit(state: EntitlementState) {
  for (const cb of listeners) {
    try {
      cb(state);
    } catch {
      /* a listener's failure never breaks the others */
    }
  }
}

function ensureAuthWatch() {
  if (authWatched) return;
  authWatched = true;
  /* A sign-in/out changes whose entitlement this is — drop the cache
     and let subscribers refetch for the new identity. */
  watchAuth(() => {
    cache = null;
    emit(UNAVAILABLE);
    void fetchEntitlement(true);
  });
}

/** Parse the RPC's row array. Anything unexpected → null (the caller
 *  reads that as unavailable, never as an invented entitlement). */
export function parseEntitlementRows(rows: unknown): Entitlement | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const row = rows[0];
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  if (!("tier" in r) || !("credit_balance" in r)) return null;
  const count = (v: unknown) => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  };
  return {
    tier: asPlanTier(r["tier"]),
    status: typeof r["status"] === "string" ? r["status"] : "none",
    currentPeriodEnd: typeof r["current_period_end"] === "string" ? r["current_period_end"] : null,
    creditBalance: count(r["credit_balance"]),
    monthlyAllowance: count(r["monthly_allowance"]),
    periodStart: typeof r["period_start"] === "string" ? r["period_start"] : null,
  };
}

export async function fetchEntitlement(force = false): Promise<EntitlementState> {
  ensureAuthWatch();
  if (!force && cache && Date.now() - cache.at < CACHE_MS) return cache.state;
  if (inflight) return inflight;
  inflight = (async (): Promise<EntitlementState> => {
    let state: EntitlementState = UNAVAILABLE;
    if (hasSupabaseConfig) {
      try {
        const { data, error } = await supabase.rpc("get_my_entitlement");
        if (!error) {
          const parsed = parseEntitlementRows(data);
          if (parsed) state = { kind: "ready", entitlement: parsed };
        }
      } catch {
        state = UNAVAILABLE;
      }
    }
    cache = { state, at: Date.now() };
    emit(state);
    return state;
  })();
  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

/** The last state read, synchronously — for creation paths (habit
 *  creation) that must decide in the moment. Null means "never
 *  read": those paths then allow the action, because an unread
 *  entitlement must never block a free feature. */
export function peekEntitlement(): EntitlementState | null {
  return cache?.state ?? null;
}

/** Drop the cache (after a spend, a checkout return, a plan change)
 *  and refetch in the background. */
export function invalidateEntitlement() {
  cache = null;
  void fetchEntitlement(true);
}

export function subscribeEntitlement(cb: (state: EntitlementState) => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
