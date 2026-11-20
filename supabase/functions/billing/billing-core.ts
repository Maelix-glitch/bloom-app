/**
 * billing-core — the pure logic of the billing edge function:
 * provider configuration, Razorpay webhook signature verification,
 * and the mapping from verified provider events to entitlement
 * writes. No Deno APIs and no fetch here (WebCrypto only, which
 * Deno and Node both provide) so vitest exercises the exact code the
 * function bundles — the vitalis-core pattern.
 *
 * The provider seam, honestly: everything provider-shaped sits
 * behind env keys; while they are absent the function answers a
 * clean `payments_not_configured` state and the app shows exactly
 * that — never an error page, never a fake checkout. The owner's
 * Razorpay account was activated 2026-11-19 and test keys supplied
 * 2026-11-20, so the rails below go live as the secrets are set —
 * no code changes, only `supabase secrets set`:
 *
 *   RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET     — API credentials
 *   RAZORPAY_WEBHOOK_SECRET                   — webhook signing secret
 *   RAZORPAY_PLAN_PREMIUM_MONTHLY             — plan ids created in
 *   RAZORPAY_PLAN_PREMIUM_YEARLY                the Razorpay dashboard
 *   RAZORPAY_PLAN_PREMIUM_PLUS_MONTHLY          at the prices in
 *   RAZORPAY_PLAN_PREMIUM_PLUS_YEARLY           src/lib/billing/plans.ts
 *
 * Two checkout rails share this one seam and the one entitlement
 * writer:
 *   · Subscriptions (create_checkout): a Razorpay Subscription
 *     against a dashboard Plan; the price lives in the Plan.
 *   · Orders (create_order): a one-time Razorpay Order for one
 *     period, priced from PLAN_PRICES_PAISE below — the server's
 *     own table, never a client-sent amount — paid through the
 *     Standard Web Checkout modal (checkout.js). The client may
 *     confirm its own payment via verify_payment (HMAC of
 *     order_id|payment_id), but that grants NOTHING: the plan
 *     activates only when the verified webhook reports
 *     payment.captured for the order, amount checked against the
 *     same price table.
 *
 * Money never moves on a client's word: a subscription activates
 * ONLY from a webhook event whose HMAC signature verified against
 * the webhook secret, and the tier comes from the notes the checkout
 * itself wrote at creation — never from anything in the event the
 * client could influence. Verified events are also recorded in
 * billing_webhook_events (keyed by the SHA-256 of the raw body)
 * before they are acted on, so a replayed delivery is ignored.
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
/* Orders rail (Standard Web Checkout)                                */
/*                                                                    */
/* A one-time Order buys ONE period of a tier. Unlike the             */
/* subscription rail — where the price lives in a dashboard Plan —    */
/* an Order carries its amount, so the server prices it from its      */
/* own table: PLAN_PRICES_PAISE mirrors the IN prices in              */
/* src/lib/billing/plans.ts (× 100), pinned equal by tests the way    */
/* the credit allowances are mirrored. A client-sent amount is        */
/* never read, anywhere on this rail.                                 */
/* ------------------------------------------------------------------ */

export const PLAN_PRICES_PAISE: Record<PaidTier, Record<PaidPeriod, number>> = {
  premium: { monthly: 59900, yearly: 399900 },
  premium_plus: { monthly: 99900, yearly: 799900 },
};

/** Razorpay refuses orders under ₹1; Bloom's cheapest period is far
 *  above this, so the floor is a guard on the table, not a price. */
export const MIN_ORDER_PAISE = 100;

export function orderAmountPaiseFor(tier: PaidTier, period: PaidPeriod): number {
  return PLAN_PRICES_PAISE[tier][period];
}

export function isOrderAmountValid(paise: number): boolean {
  return Number.isInteger(paise) && paise >= MIN_ORDER_PAISE;
}

/** The Orders rail needs only the API credentials — no dashboard
 *  Plans — so it can open before the subscription rail does. */
export function ordersConfigured(config: RazorpayConfig): boolean {
  return Boolean(config.keyId && config.keySecret);
}

/** The notes every Bloom plan order carries. The webhook attributes
 *  a captured payment ONLY through these notes (plus the amount
 *  check) — they are written here, server-side, at creation, and
 *  Razorpay copies them onto the payment entity. */
export const ORDER_NOTES_KIND = "bloom_plan";

export interface RazorpayOrderBody {
  amount: number;
  currency: "INR";
  receipt: string;
  notes: { user_id: string; tier: PaidTier; period: PaidPeriod; kind: typeof ORDER_NOTES_KIND };
}

export function buildOrderBody(input: {
  tier: PaidTier;
  period: PaidPeriod;
  userId: string;
  receipt: string;
}): RazorpayOrderBody {
  return {
    amount: orderAmountPaiseFor(input.tier, input.period),
    currency: "INR",
    receipt: input.receipt,
    notes: { user_id: input.userId, tier: input.tier, period: input.period, kind: ORDER_NOTES_KIND },
  };
}

export function parseVerifyRequest(
  body: unknown,
): { orderId: string; paymentId: string; signature: string } | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const orderId = b["razorpay_order_id"];
  const paymentId = b["razorpay_payment_id"];
  const signature = b["razorpay_signature"];
  if (typeof orderId !== "string" || !orderId) return null;
  if (typeof paymentId !== "string" || !paymentId) return null;
  if (typeof signature !== "string" || !signature) return null;
  return { orderId, paymentId, signature };
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

/**
 * Checkout payment verification (Standard Web Checkout): after the
 * modal hands the browser razorpay_payment_id + razorpay_order_id +
 * razorpay_signature, the signature is HMAC-SHA256 of
 * `${order_id}|${payment_id}` under the KEY SECRET (not the webhook
 * secret — two different secrets for two different channels).
 * A verified signature tells the client its payment is genuine so
 * the UI can say so honestly; it grants NOTHING by itself. The plan
 * still activates only from the verified payment.captured webhook.
 */
export async function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string | null,
  keySecret: string,
): Promise<boolean> {
  if (!signature || !keySecret || !orderId || !paymentId) return false;
  const expected = await hmacSha256Hex(keySecret, `${orderId}|${paymentId}`);
  return timingSafeEqual(expected, signature.trim().toLowerCase());
}

/* ------------------------------------------------------------------ */
/* Webhook replay protection                                          */
/*                                                                    */
/* Razorpay's signature scheme carries no timestamp and its payloads */
/* no unique event id, so a captured genuine webhook (body +          */
/* signature) could otherwise be replayed verbatim and honoured       */
/* again (pentest 2026-11-19, M4). The dedupe key is the SHA-256 of   */
/* the RAW body: a verbatim replay hashes identically, while every    */
/* genuine new event (a fresh charge, a later lifecycle change) has   */
/* a different body and a different key. The function records the     */
/* key in billing_webhook_events BEFORE acting on the event; a        */
/* primary-key collision means "already processed — ignore".          */
/* ------------------------------------------------------------------ */

async function sha256Hex(message: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(message));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function webhookEventKey(rawBody: string): Promise<string> {
  return sha256Hex(rawBody);
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

/** The end of the period a one-time order buys: one calendar month
 *  or year after the capture instant (UTC, the way the provider's
 *  own subscription periods are expressed). */
function addPeriod(startIso: string, period: PaidPeriod): string | null {
  const d = new Date(startIso);
  if (Number.isNaN(d.getTime())) return null;
  if (period === "monthly") d.setUTCMonth(d.getUTCMonth() + 1);
  else d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d.toISOString();
}

/**
 * A captured one-time payment (the Orders rail) → the same
 * "activate" write the subscription rail produces, through the same
 * RPC. Every guard must hold, else the event is ignored:
 *   · the payment entity says status "captured" and currency INR;
 *   · its notes are the ones create_order wrote (kind bloom_plan,
 *     a user id, a paid tier, a period);
 *   · the captured amount equals the server price for that
 *     tier+period — a payment for any other amount buys nothing.
 * The write is idempotent the way the subscription one is: the
 * caller records the raw-body key before acting (a replayed
 * delivery is dropped there), and activate_subscription only ever
 * tops credits UP to the tier allowance.
 */
function mapCapturedPayment(root: Record<string, unknown> | null, event: string): WebhookAction {
  const pay = asRecord(asRecord(root?.["payload"])?.["payment"]);
  const entity = asRecord(pay?.["entity"]);
  if (!entity) return { kind: "ignore", event };
  if (entity["status"] !== "captured" || entity["currency"] !== "INR") {
    return { kind: "ignore", event };
  }
  const notes = asRecord(entity["notes"]) ?? {};
  const userId = typeof notes["user_id"] === "string" ? notes["user_id"] : "";
  const tier = notes["tier"];
  const period = notes["period"];
  if (
    notes["kind"] !== ORDER_NOTES_KIND ||
    !userId ||
    (tier !== "premium" && tier !== "premium_plus") ||
    (period !== "monthly" && period !== "yearly")
  ) {
    return { kind: "ignore", event };
  }
  const amount = typeof entity["amount"] === "number" ? entity["amount"] : Number(entity["amount"]);
  if (!Number.isInteger(amount) || amount !== orderAmountPaiseFor(tier, period)) {
    return { kind: "ignore", event };
  }
  const orderId = typeof entity["order_id"] === "string" ? entity["order_id"] : "";
  if (!orderId) return { kind: "ignore", event };
  const periodStart = unixToIso(entity["created_at"]);
  const periodEnd = periodStart ? addPeriod(periodStart, period) : null;
  return {
    kind: "activate",
    userId,
    plan: tier,
    providerSubscriptionId: orderId,
    providerCustomerId: null,
    periodStart,
    periodEnd,
  };
}

/**
 * Map a VERIFIED Razorpay webhook payload to the entitlement write
 * it authorises. Subscription lifecycle events act, and so does a
 * captured one-time payment for a Bloom plan order; everything else
 * is ignored (and still answered 200 by the caller, so the provider
 * does not retry noise). Attribution comes from the notes the
 * checkout wrote (user_id + tier): an event that cannot be
 * attributed to a Bloom user and a paid tier is ignored, never
 * guessed at.
 */
export function mapRazorpayEvent(payload: unknown): WebhookAction {
  const root = asRecord(payload);
  const event = typeof root?.["event"] === "string" ? (root["event"] as string) : "";
  if (event === "payment.captured") return mapCapturedPayment(root, event);
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
