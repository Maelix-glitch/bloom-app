/**
 * billing-core — the Money System's gate logic for the coach edge
 * function, kept pure (no Deno APIs, no fetch, no env) so the exact
 * code the function bundles is what vitest exercises, the same pattern
 * as vitalis-core.ts. index.ts owns the transport: it reads the
 * caller's entitlement from the `get_my_entitlement` RPC and calls
 * `spend_credits` after a successful answer; everything DECIDED is
 * decided here.
 *
 * The semantics, end to end:
 *
 *   · Every AI request is gated BEFORE any provider is called —
 *     Coach chat, Vitalis chat (fast path and deliberation) and TTS.
 *   · Costs are flat per request, so a person can predict them:
 *     a Coach message 1 credit, a Coach photo analysis 3, a Vitalis
 *     message 2 (deliberation included — up to three provider calls
 *     for one flat price), one spoken chunk 1.
 *   · Food-photo analysis is a Premium feature: the free tier is
 *     refused with `premium_required` no matter its balance. The
 *     refusal is a 402-style JSON error the client renders as an
 *     upgrade prompt — never a crash, never a fake answer.
 *   · Credits are deducted AFTER a successful provider response,
 *     never for a failure. A completed answer is never withheld
 *     because a deduct raced an empty balance (the spend is
 *     best-effort at that point and logged; the NEXT request gates).
 *   · When the entitlement RPC does not answer — the billing
 *     migration not yet applied, or no caller token — the gate is
 *     INACTIVE: the request proceeds uncharged. That is a deliberate
 *     dark-launch seam, not a bypass: it exists so this code can be
 *     deployed before the database migration lands without breaking
 *     the Coach for everyone. The moment the RPC answers, enforcement
 *     is total — there is no client-controlled input to the decision.
 */

export type BillingTier = "free" | "premium" | "premium_plus";

export type BillingAction = "coach" | "vitalis" | "tts";

/** Flat per-request credit costs. The ledger reasons are these keys
 *  with the action's own suffix, e.g. "coach_message". */
export const CREDIT_COSTS = {
  coach_message: 1,
  coach_photo: 3,
  vitalis_message: 2,
  tts_request: 1,
} as const;

export type CreditReason = keyof typeof CREDIT_COSTS;

/** Monthly AI credit allowance per tier. Mirrors PLANS in
 *  src/lib/billing/plans.ts and billing_tier_allowance() in the
 *  billing migration — one number, three homes, pinned equal by
 *  tests. */
export const TIER_ALLOWANCES: Record<BillingTier, number> = {
  free: 20,
  premium: 300,
  premium_plus: 800,
};

/** What the entitlement RPC told us about the caller. `null` (handled
 *  by decideGate's caller, not a value here) means the RPC did not
 *  answer and the gate is inactive. */
export interface EntitlementSnapshot {
  tier: BillingTier;
  status: string;
  creditBalance: number;
  monthlyAllowance: number;
  currentPeriodEnd: string | null;
}

export type GateDecision =
  | { kind: "allow"; cost: number; reason: CreditReason }
  | { kind: "allow_uncharged" }
  | { kind: "deny_insufficient"; cost: number; balance: number; tier: BillingTier }
  | { kind: "deny_premium"; feature: "food_photo_analysis"; tier: BillingTier };

function asTier(value: unknown): BillingTier {
  return value === "premium" || value === "premium_plus" ? value : "free";
}

function asCount(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/**
 * Parse the get_my_entitlement() RPC result (a PostgREST array of one
 * row) into a snapshot. Anything malformed returns null — the caller
 * treats that as "billing inactive", never as a paying or a blocked
 * user invented by a parse guess.
 */
export function parseEntitlementRows(rows: unknown): EntitlementSnapshot | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const row = rows[0];
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  if (!("tier" in r) || !("credit_balance" in r)) return null;
  return {
    tier: asTier(r["tier"]),
    status: typeof r["status"] === "string" ? r["status"] : "none",
    creditBalance: asCount(r["credit_balance"]),
    monthlyAllowance: asCount(r["monthly_allowance"]),
    currentPeriodEnd:
      typeof r["current_period_end"] === "string" ? r["current_period_end"] : null,
  };
}

/** The cost + ledger reason for an action, before any tier logic. */
export function costFor(action: BillingAction, hasMedia: boolean): { cost: number; reason: CreditReason } {
  if (action === "tts") return { cost: CREDIT_COSTS.tts_request, reason: "tts_request" };
  if (action === "vitalis") return { cost: CREDIT_COSTS.vitalis_message, reason: "vitalis_message" };
  return hasMedia
    ? { cost: CREDIT_COSTS.coach_photo, reason: "coach_photo" }
    : { cost: CREDIT_COSTS.coach_message, reason: "coach_message" };
}

/**
 * THE gate. Pure and total over its inputs:
 *   entitlement null  → allow_uncharged (billing inactive, see header)
 *   free + photo      → deny_premium (feature gate, balance irrelevant)
 *   balance < cost    → deny_insufficient
 *   otherwise         → allow with the flat cost to deduct on success
 */
export function decideGate(input: {
  entitlement: EntitlementSnapshot | null;
  action: BillingAction;
  hasMedia: boolean;
}): GateDecision {
  const { entitlement, action, hasMedia } = input;
  if (!entitlement) return { kind: "allow_uncharged" };
  if (action === "coach" && hasMedia && entitlement.tier === "free") {
    return { kind: "deny_premium", feature: "food_photo_analysis", tier: entitlement.tier };
  }
  const { cost, reason } = costFor(action, hasMedia);
  if (entitlement.creditBalance < cost) {
    return { kind: "deny_insufficient", cost, balance: entitlement.creditBalance, tier: entitlement.tier };
  }
  return { kind: "allow", cost, reason };
}

/** The 402 body for a denied gate — the client keys its upgrade
 *  prompt off `error`, and shows the numbers honestly. */
export function gateErrorBody(
  decision: GateDecision,
  requestId: string,
): Record<string, unknown> | null {
  if (decision.kind === "deny_insufficient") {
    return {
      error: "insufficient_credits",
      needed: decision.cost,
      balance: decision.balance,
      tier: decision.tier,
      requestId,
    };
  }
  if (decision.kind === "deny_premium") {
    return {
      error: "premium_required",
      feature: decision.feature,
      tier: decision.tier,
      requestId,
    };
  }
  return null;
}
