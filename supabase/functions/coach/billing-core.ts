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
 *   · Costs are WEIGHTED by what an action costs to serve (M-215,
 *     owner decision 2026-11-22 — the earlier flat-ish table let one
 *     credit mean a one-line chat or a three-call deliberation):
 *     a Coach message 1 credit, a Coach photo analysis 5 (a vision
 *     call), a Vitalis chat message 2 (it reasons over the full
 *     nutrition record), a Vitalis plan deliberation 10 (up to three
 *     provider calls checking their own numbers), a dish-swap
 *     proposal out of a chat 3, and speech 1 per 500 characters
 *     spoken (minimum 1, rounded up). The gate always checks the
 *     ACTION's own cost: a member with 3 credits can chat with
 *     Vitalis but is refused a 10-credit plan session, with the
 *     numbers named in the refusal.
 *   · Food-photo analysis is a Premium feature: the free tier is
 *     refused with `premium_required` no matter its balance. The
 *     refusal is a 402-style JSON error the client renders as an
 *     upgrade prompt — never a crash, never a fake answer.
 *   · Vitalis is a Premium Plus feature (M-214, owner decision
 *     2026-11-22): the `vitalis` action AND `tts` (the spoken voice
 *     is Vitalis's own — its only caller is the Vitalis speaker)
 *     are refused with `premium_required` / feature "vitalis" for
 *     every tier below premium_plus, balance irrelevant. This is
 *     the expensive surface, so the gate lives here, server-side,
 *     before any provider is called — the client check is only
 *     presentation.
 *   · Credits are deducted AFTER a successful provider response,
 *     never for a failure. A completed answer is never withheld
 *     because a deduct raced an empty balance (the spend is
 *     best-effort at that point and logged; the NEXT request gates).
 *   · When the entitlement RPC does not answer, the gate FAILS
 *     CLOSED: the request is refused with a retryable 503
 *     (`billing_unavailable`) instead of proceeding uncharged. The
 *     billing migration has been live since 2026-11-18, so an
 *     unanswered RPC is an outage, not a launch state — and an
 *     outage must never silently become free AI (pentest 2026-11-19,
 *     finding M2). The old dark-launch behaviour survives ONLY
 *     behind the explicit env flag BLOOM_BILLING_DARK_LAUNCH=1,
 *     which index.ts reads and passes in as `darkLaunch`; it
 *     defaults off, and there is no client-controlled input to the
 *     decision either way.
 */

export type BillingTier = "free" | "premium" | "premium_plus";

export type BillingAction = "coach" | "vitalis" | "tts";

/** Weighted per-action credit costs (M-215). The keys ARE the ledger
 *  reasons `spend_credits` records, so a member's credit history names
 *  the action and the weighted amount it drew. `tts_request` is the
 *  unit price — 1 credit per TTS_CHARS_PER_CREDIT characters of
 *  spoken text — and `ttsCostForChars` does the rounding. */
export const CREDIT_COSTS = {
  coach_message: 1,
  coach_photo: 5,
  vitalis_message: 2,
  vitalis_plan: 10,
  vitalis_dish_swap: 3,
  tts_request: 1,
} as const;

export type CreditReason = keyof typeof CREDIT_COSTS;

/** Speech is priced by length: 1 credit per this many characters of
 *  text actually sent to the voice provider, minimum 1, rounded up
 *  (501 characters cost 2). */
export const TTS_CHARS_PER_CREDIT = 500;

export function ttsCostForChars(chars: number): number {
  const n = Number.isFinite(chars) && chars > 0 ? Math.floor(chars) : 0;
  return Math.max(CREDIT_COSTS.tts_request, Math.ceil(n / TTS_CHARS_PER_CREDIT));
}

/** How a Vitalis request is priced at the gate: "chat" is one message
 *  on the fast path; "plan" is a deliberation session (plan creation
 *  or regeneration). A dish-swap is NOT a gate kind — it cannot be
 *  known before the reply exists; it is priced at charge time by
 *  resolveVitalisCharge. */
export type VitalisKind = "chat" | "plan";

/** What a finished Vitalis request turned out to be, for the charge:
 *  the deliberation outcome outranks a proposal inside it (the member
 *  paid for the session, proposals included). */
export type VitalisOutcome = "chat" | "plan" | "dish_swap";

/**
 * The gate's deliberation classifier — the SAME rule handleVitalisChat
 * deliberates by (a usable record AND (the client's deliberate flag OR
 * plan-like words)), with the record check and the word check computed
 * by the caller from vitalis-core so this module stays dependency-free.
 * When it says "chat", the handler takes the fast path too, so the
 * price and the work can never disagree.
 */
export function vitalisKindFor(input: {
  recordValid: boolean;
  deliberateFlag: boolean;
  planLike: boolean;
}): VitalisKind {
  return input.recordValid && (input.deliberateFlag || input.planLike) ? "plan" : "chat";
}

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
 *  answer — the gate then fails closed unless the dark-launch flag
 *  was explicitly set (see decideGate). */
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
  | { kind: "deny_premium"; feature: "food_photo_analysis" | "vitalis"; tier: BillingTier }
  | { kind: "deny_unavailable" };

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
 * treats that as "entitlement unknown" and the gate fails closed,
 * never as a paying or a blocked user invented by a parse guess.
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

/** The cost + ledger reason for an action, before any tier logic.
 *  `vitalisKind` prices a Vitalis request (gate-time classification,
 *  see vitalisKindFor); `ttsChars` is the length of the text about to
 *  be spoken — speech is the one cost that depends on the request's
 *  size, and the handler passes the exact text it will send. */
export function costFor(
  action: BillingAction,
  opts: { hasMedia?: boolean; vitalisKind?: VitalisKind; ttsChars?: number } = {},
): { cost: number; reason: CreditReason } {
  if (action === "tts") return { cost: ttsCostForChars(opts.ttsChars ?? 0), reason: "tts_request" };
  if (action === "vitalis") {
    return opts.vitalisKind === "plan"
      ? { cost: CREDIT_COSTS.vitalis_plan, reason: "vitalis_plan" }
      : { cost: CREDIT_COSTS.vitalis_message, reason: "vitalis_message" };
  }
  return opts.hasMedia
    ? { cost: CREDIT_COSTS.coach_photo, reason: "coach_photo" }
    : { cost: CREDIT_COSTS.coach_message, reason: "coach_message" };
}

/**
 * The charge a FINISHED Vitalis request actually records. The gate
 * priced the request it could see; the reply decides the rest:
 *   · a deliberation (gated as one, or — defensively — reported as
 *     one) records the plan session's 10 under "vitalis_plan";
 *   · a plain chat whose reply proposed a dish swap records 3 under
 *     "vitalis_dish_swap" — the swap is the action the member got;
 *   · any other chat records the gated chat cost.
 * The spend itself stays the caller's atomic, best-effort-after-success
 * `spend_credits`: if a swap lands for a member whose balance covered
 * the chat (2) but not the swap (3), the spend writes nothing and is
 * logged — a completed answer is never withheld over a credit.
 * Denied and uncharged gate decisions resolve to null: no charge, ever.
 */
export function resolveVitalisCharge(
  decision: GateDecision,
  outcome: VitalisOutcome,
): { cost: number; reason: CreditReason } | null {
  if (decision.kind !== "allow") return null;
  if (decision.reason === "vitalis_plan" || outcome === "plan") {
    return { cost: CREDIT_COSTS.vitalis_plan, reason: "vitalis_plan" };
  }
  if (outcome === "dish_swap") {
    return { cost: CREDIT_COSTS.vitalis_dish_swap, reason: "vitalis_dish_swap" };
  }
  return { cost: decision.cost, reason: decision.reason };
}

/**
 * THE gate. Pure and total over its inputs:
 *   entitlement null  → deny_unavailable (fail closed — billing is
 *                       live; an unanswered RPC is an outage, and an
 *                       outage is not a free tier). ONLY when the
 *                       operator explicitly set the dark-launch flag
 *                       (a future pre-migration deploy) does null
 *                       still mean allow_uncharged.
 *   free + photo      → deny_premium (feature gate, balance irrelevant)
 *   vitalis/tts below → deny_premium, feature "vitalis" (M-214: the
 *   premium_plus          Plus gate, balance irrelevant)
 *   balance < cost    → deny_insufficient (the ACTION's weighted cost)
 *   otherwise         → allow with that cost to deduct on success
 */
export function decideGate(input: {
  entitlement: EntitlementSnapshot | null;
  action: BillingAction;
  hasMedia: boolean;
  /** Vitalis only: the gate-time kind (see vitalisKindFor). Defaults
   *  to a chat — the cheaper read, and the handler's own fallback. */
  vitalisKind?: VitalisKind;
  /** TTS only: characters of text about to be spoken. */
  ttsChars?: number;
  darkLaunch?: boolean;
}): GateDecision {
  const { entitlement, action, hasMedia, darkLaunch } = input;
  if (!entitlement) {
    return darkLaunch ? { kind: "allow_uncharged" } : { kind: "deny_unavailable" };
  }
  if (action === "coach" && hasMedia && entitlement.tier === "free") {
    return { kind: "deny_premium", feature: "food_photo_analysis", tier: entitlement.tier };
  }
  if ((action === "vitalis" || action === "tts") && entitlement.tier !== "premium_plus") {
    return { kind: "deny_premium", feature: "vitalis", tier: entitlement.tier };
  }
  const { cost, reason } = costFor(action, {
    hasMedia,
    ...(input.vitalisKind ? { vitalisKind: input.vitalisKind } : {}),
    ...(input.ttsChars !== undefined ? { ttsChars: input.ttsChars } : {}),
  });
  if (entitlement.creditBalance < cost) {
    return { kind: "deny_insufficient", cost, balance: entitlement.creditBalance, tier: entitlement.tier };
  }
  return { kind: "allow", cost, reason };
}

/** The error body for a denied gate — the client keys its upgrade
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
  if (decision.kind === "deny_unavailable") {
    return {
      error: "billing_unavailable",
      requestId,
    };
  }
  return null;
}

/** The HTTP status for a denied gate: entitlement denials are 402
 *  (the client's upgrade prompt), but an unanswered entitlement RPC
 *  is a retryable 503 — the person has done nothing wrong and their
 *  balance was never read. Allows carry no error, hence null. */
export function gateErrorStatus(decision: GateDecision): number | null {
  if (decision.kind === "deny_unavailable") return 503;
  if (decision.kind === "deny_insufficient" || decision.kind === "deny_premium") return 402;
  return null;
}
