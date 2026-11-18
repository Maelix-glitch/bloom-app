/**
 * billing-core — the pure logic of the billing edge function:
 * provider configuration, Razorpay webhook signature verification,
 * and the mapping from verified provider events to entitlement
 * writes. No Deno APIs and no fetch here (WebCrypto only, which
 * Deno and Node both provide) so vitest exercises the exact code the
 * function bundles — the vitalis-core pattern.
 *
 * The provider seam, honestly: Bloom has no payment-provider account
 * yet. Everything provider-shaped sits behind env keys; while they
 * are absent the function answers a clean `payments_not_configured`
 * state and the app shows exactly that — never an error page, never
 * a fake checkout. When the owner creates the Razorpay account and
 * sets the secrets, the same code goes live with no changes:
 *
 *   RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET     — API credentials
 *   RAZORPAY_WEBHOOK_SECRET                   — webhook signing secret
 *   RAZORPAY_PLAN_PREMIUM_MONTHLY             — plan ids created in
 *   RAZORPAY_PLAN_PREMIUM_YEARLY                the Razorpay dashboard
 *   RAZORPAY_PLAN_PREMIUM_PLUS_MONTHLY          at the prices in
 *   RAZORPAY_PLAN_PREMIUM_PLUS_YEARLY           src/lib/billing/plans.ts
 *
 * Money never moves on a client's word: a subscription activates
 * ONLY from a webhook event whose HMAC signature verified against
 * the webhook secret, and the tier comes from the notes the checkout
 * itself wrote at creation — never from anything in the event the
 * client could influence.
 */

export type PaidTier = "premium" | "premium_plus";
export type PaidPeriod = "monthly" | "yearly";

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  planIds: Record<string, string>;
}

/** Build the config from an env map (Deno.env in the function, a
 *  plain object in tests). Missing pieces stay empty strings; the
 *  caller decides what "configured" means via the helpers below. */
export function razorpayConfigFromEnv(env: Record<string, string | undefined>): RazorpayConfig {
  const get = (k: string) => (env[k] ?? "").trim();
  return {
    keyId: get("RAZORPAY_KEY_ID"),
    keySecret: get("RAZORPAY_KEY_SECRET"),
    webhookSecret: get("RAZORPAY_WEBHOOK_SECRET"),
    planIds: {
      premium_monthly: get("RAZORPAY_PLAN_PREMIUM_MONTHLY"),
      premium_yearly: get("RAZORPAY_PLAN_PREMIUM_YEARLY"),
      premium_plus_monthly: get("RAZORPAY_PLAN_PREMIUM_PLUS_MONTHLY"),
      premium_plus_yearly: get("RAZORPAY_PLAN_PREMIUM_PLUS_YEARLY"),
    },
  };
}

/** Checkout can be offered only when API credentials AND the plan id
 *  for the requested tier+period exist. */
export function checkoutConfigured(config: RazorpayConfig, tier: PaidTier, period: PaidPeriod): boolean {
  return Boolean(config.keyId && config.keySecret && planIdFor(config, tier, period));
}

export function webhookConfigured(config: RazorpayConfig): boolean {
  return Boolean(config.webhookSecret);
}

export function planIdFor(config: RazorpayConfig, tier: PaidTier, period: PaidPeriod): string | null {
  return config.planIds[`${tier}_${period}`] || null;
}

export function parseCheckoutRequest(body: unknown): { tier: PaidTier; period: PaidPeriod } | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const tier = b["tier"];
  const period = b["period"];
  if (tier !== "premium" && tier !== "premium_plus") return null;
  if (period !== "monthly" && period !== "yearly") return null;
  return { tier, period };
}

/* ------------------------------------------------------------------ */
/* Webhook signature verification (Razorpay: HMAC-SHA256 of the raw   */
/* body with the webhook secret, hex, in x-razorpay-signature).       */
/* ------------------------------------------------------------------ */

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time comparison over the hex strings — a signature check
 *  should not leak how much of a guess was right. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyRazorpaySignature(
  rawBody: string,
  signature: string | null,
  secret: string,
): Promise<boolean> {
  if (!signature || !secret) return false;
  const expected = await hmacSha256Hex(secret, rawBody);
  return timingSafeEqual(expected, signature.trim().toLowerCase());
}

/* ------------------------------------------------------------------ */
/* Verified event → entitlement write                                 */
/* ------------------------------------------------------------------ */

export type WebhookAction =
  | {
      kind: "activate";
      userId: string;
      plan: PaidTier;
      providerSubscriptionId: string;
      providerCustomerId: string | null;
      periodStart: string | null;
      periodEnd: string | null;
    }
  | {
      kind: "status";
      userId: string;
      status: "past_due" | "cancelled" | "expired";
      periodEnd: string | null;
    }
  | { kind: "ignore"; event: string };

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function unixToIso(v: unknown): string | null {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Date(n * 1000).toISOString();
}

/**
 * Map a VERIFIED Razorpay webhook payload to the entitlement write
 * it authorises. Only subscription lifecycle events act; everything
 * else is ignored (and still answered 200 by the caller, so the
 * provider does not retry noise). Attribution comes from the notes
 * the checkout wrote (user_id + tier): an event that cannot be
 * attributed to a Bloom user and a paid tier is ignored, never
 * guessed at.
 */
export function mapRazorpayEvent(payload: unknown): WebhookAction {
  const root = asRecord(payload);
  const event = typeof root?.["event"] === "string" ? (root["event"] as string) : "";
  const sub = asRecord(asRecord(root?.["payload"])?.["subscription"]);
  const entity = asRecord(sub?.["entity"]);
  if (!entity) return { kind: "ignore", event };

  const notes = asRecord(entity["notes"]) ?? {};
  const userId = typeof notes["user_id"] === "string" ? notes["user_id"] : "";
  const tier = notes["tier"];
  const periodStart = unixToIso(entity["current_start"]);
  const periodEnd = unixToIso(entity["current_end"]);
  const subscriptionId = typeof entity["id"] === "string" ? entity["id"] : "";
  const customerId = typeof entity["customer_id"] === "string" ? entity["customer_id"] : null;

  switch (event) {
    case "subscription.activated":
    case "subscription.charged": {
      if (!userId || (tier !== "premium" && tier !== "premium_plus") || !subscriptionId) {
        return { kind: "ignore", event };
      }
      return {
        kind: "activate",
        userId,
        plan: tier,
        providerSubscriptionId: subscriptionId,
        providerCustomerId: customerId,
        periodStart,
        periodEnd,
      };
    }
    case "subscription.cancelled":
      if (!userId) return { kind: "ignore", event };
      return { kind: "status", userId, status: "cancelled", periodEnd };
    case "subscription.expired":
    case "subscription.completed":
      if (!userId) return { kind: "ignore", event };
      return { kind: "status", userId, status: "expired", periodEnd };
    case "subscription.pending":
    case "subscription.paused":
      if (!userId) return { kind: "ignore", event };
      return { kind: "status", userId, status: "past_due", periodEnd };
    default:
      return { kind: "ignore", event };
  }
}
