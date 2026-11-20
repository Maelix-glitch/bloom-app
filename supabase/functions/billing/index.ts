/**
 * Bloom billing — the Money System's checkout + webhook seam.
 *
 * Two jobs, both behind the provider seam in billing-core.ts:
 *
 *   · create-checkout ({ action: "create_checkout", tier, period }):
 *     the caller is identified from their own session (getUser, the
 *     dual-ai-router pattern — verify_jwt is false for this function
 *     because the webhook below cannot carry a JWT; every path here
 *     authenticates itself). With Razorpay configured, it creates a
 *     subscription whose notes carry { user_id, tier, period } and
 *     returns the hosted payment link. Without the provider secrets
 *     it answers { state: "payments_not_configured" } — a clean,
 *     expected state the app renders honestly. NOTHING is charged by
 *     this endpoint; it only opens the provider's own checkout.
 *
 *   · create-order ({ action: "create_order", tier, period }): the
 *     Standard Web Checkout rail. Same session authentication. The
 *     amount comes from the server's own price table in
 *     billing-core (never the request), a one-time Razorpay Order is
 *     created with notes { user_id, tier, period, kind }, and the
 *     client opens the checkout.js modal with the order id + the
 *     public key id. The key secret never leaves this function.
 *
 *   · verify-payment ({ action: "verify_payment", razorpay_order_id,
 *     razorpay_payment_id, razorpay_signature }): confirms to the
 *     signed-in buyer that the signature the modal handed back is
 *     genuine (HMAC-SHA256 of order_id|payment_id under the key
 *     secret, constant-time compare). A mismatch is a 400 and
 *     changes NOTHING — verification grants no entitlement; it only
 *     lets the UI say "payment received" honestly while the webhook
 *     does the activating.
 *
 *   · webhook (any POST carrying x-razorpay-signature): the raw body
 *     is HMAC-verified against RAZORPAY_WEBHOOK_SECRET before a byte
 *     of it is trusted, and recorded in billing_webhook_events
 *     (SHA-256 of the raw body) before it is acted on, so a replayed
 *     delivery is ignored. Verified subscription events — and a
 *     verified payment.captured for a Bloom plan order, its amount
 *     checked against the server price table — write through the
 *     service-role RPCs (activate_subscription /
 *     set_subscription_status) — the ONLY path that can make someone
 *     Premium. A checkout click, a client claim, a returned browser:
 *     none of those grant anything.
 *
 * Secrets (Supabase vault, never the client):
 *   RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET,
 *   RAZORPAY_PLAN_PREMIUM_MONTHLY, RAZORPAY_PLAN_PREMIUM_YEARLY,
 *   RAZORPAY_PLAN_PREMIUM_PLUS_MONTHLY, RAZORPAY_PLAN_PREMIUM_PLUS_YEARLY
 * plus the platform-provided SUPABASE_URL / SUPABASE_ANON_KEY /
 * SUPABASE_SECRET_KEY.
 *
 * Stripe is a second adapter behind this same seam when an
 * international account exists; the interface (create checkout →
 * hosted page → verified webhook → the same two RPCs) is identical,
 * so nothing else in Bloom changes when it lands.
 */
/* eslint-disable */
// @ts-nocheck - Deno runtime, not part of the app's TS project.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildOrderBody,
  checkoutConfigured,
  isOrderAmountValid,
  mapRazorpayEvent,
  ordersConfigured,
  parseCheckoutRequest,
  parseVerifyRequest,
  planIdFor,
  razorpayConfigFromEnv,
  verifyPaymentSignature,
  verifyRazorpaySignature,
  webhookConfigured,
  webhookEventKey,
} from "./billing-core.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-razorpay-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function envAll(): Record<string, string | undefined> {
  return {
    RAZORPAY_KEY_ID: Deno.env.get("RAZORPAY_KEY_ID"),
    RAZORPAY_KEY_SECRET: Deno.env.get("RAZORPAY_KEY_SECRET"),
    RAZORPAY_WEBHOOK_SECRET: Deno.env.get("RAZORPAY_WEBHOOK_SECRET"),
    RAZORPAY_PLAN_PREMIUM_MONTHLY: Deno.env.get("RAZORPAY_PLAN_PREMIUM_MONTHLY"),
    RAZORPAY_PLAN_PREMIUM_YEARLY: Deno.env.get("RAZORPAY_PLAN_PREMIUM_YEARLY"),
    RAZORPAY_PLAN_PREMIUM_PLUS_MONTHLY: Deno.env.get("RAZORPAY_PLAN_PREMIUM_PLUS_MONTHLY"),
    RAZORPAY_PLAN_PREMIUM_PLUS_YEARLY: Deno.env.get("RAZORPAY_PLAN_PREMIUM_PLUS_YEARLY"),
  };
}

function adminClient() {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const secret =
    Deno.env.get("SUPABASE_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!url || !secret) return null;
  return createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function handleWebhook(req: Request, rawBody: string): Promise<Response> {
  const config = razorpayConfigFromEnv(envAll());
  if (!webhookConfigured(config)) {
    /* No signing secret: nothing can be verified, so nothing is
       trusted. A clean state, not a hole. */
    return json({ state: "payments_not_configured" }, 503);
  }
  const signature = req.headers.get("x-razorpay-signature");
  const verified = await verifyRazorpaySignature(rawBody, signature, config.webhookSecret);
  if (!verified) {
    console.error("billing webhook: signature verification failed");
    return json({ error: "invalid_signature" }, 400);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ error: "invalid_payload" }, 400);
  }

  const admin = adminClient();
  if (!admin) return json({ error: "server_unconfigured" }, 503);

  /* Replay protection (M4): record this verified event BEFORE acting
     on it. The key is the SHA-256 of the raw body, so a verbatim
     re-delivery — the provider's own retry, or a captured webhook
     replayed later (the signature scheme has no timestamp) — hits
     the primary key and is answered as a duplicate without touching
     entitlement state. If the receipt cannot be recorded we fail
     closed with a 500: the provider retries, and no event is ever
     honoured twice because its receipt was lost. */
  const eventKey = await webhookEventKey(rawBody);
  const eventName =
    payload && typeof payload === "object" && typeof (payload as Record<string, unknown>)["event"] === "string"
      ? ((payload as Record<string, unknown>)["event"] as string)
      : "";
  const { error: receiptError } = await admin
    .from("billing_webhook_events")
    .insert({ event_key: eventKey, provider: "razorpay", event: eventName });
  if (receiptError) {
    if ((receiptError as { code?: string }).code === "23505") {
      return json({ ok: true, handled: "duplicate" }, 200);
    }
    console.error(`billing webhook: event receipt failed: ${receiptError.message}`);
    return json({ error: "receipt_failed" }, 500);
  }
  /* If the entitlement write below fails, the receipt is removed
     again before answering 500 — otherwise the provider's retry
     would be swallowed as a duplicate and the event lost. */
  const dropReceipt = async () => {
    await admin.from("billing_webhook_events").delete().eq("event_key", eventKey);
  };

  const action = mapRazorpayEvent(payload);
  if (action.kind === "ignore") {
    /* Answered 200 on purpose: the provider retries non-200s, and an
       event we do not act on is not an error. The receipt stays —
       the event WAS handled, by deciding to ignore it. */
    return json({ ok: true, handled: "ignore", event: action.event }, 200);
  }

  if (action.kind === "activate") {
    const { error } = await admin.rpc("activate_subscription", {
      p_user_id: action.userId,
      p_plan: action.plan,
      p_provider: "razorpay",
      p_provider_subscription_id: action.providerSubscriptionId,
      p_provider_customer_id: action.providerCustomerId,
      p_period_start: action.periodStart,
      p_period_end: action.periodEnd,
    });
    if (error) {
      console.error(`billing webhook: activate failed: ${error.message}`);
      await dropReceipt();
      return json({ error: "write_failed" }, 500);
    }
    return json({ ok: true, handled: "activate" }, 200);
  }

  const { error } = await admin.rpc("set_subscription_status", {
    p_user_id: action.userId,
    p_status: action.status,
    p_period_end: action.periodEnd,
  });
  if (error) {
    console.error(`billing webhook: status write failed: ${error.message}`);
    await dropReceipt();
    return json({ error: "write_failed" }, 500);
  }
  return json({ ok: true, handled: "status" }, 200);
}

/** The caller proves who they are with their own session — every
 *  checkout action is performed for the signed-in person, never for
 *  an id the request body names. Returns the user, or the error
 *  response to send (401 not signed in, 503 server unconfigured). */
async function authedUser(req: Request): Promise<{ id: string; email: string | null } | Response> {
  const authorization = req.headers.get("Authorization");
  if (!authorization) return json({ error: "not_signed_in" }, 401);
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!url || !anon) return json({ error: "server_unconfigured" }, 503);
  const supabase = createClient(url, anon, {
    global: { headers: { Authorization: authorization } },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ error: "not_signed_in" }, 401);
  return { id: user.id, email: user.email ?? null };
}

async function handleCreateCheckout(req: Request, body: Record<string, unknown>): Promise<Response> {
  const authed = await authedUser(req);
  if (authed instanceof Response) return authed;
  const user = authed;

  const parsed = parseCheckoutRequest(body);
  if (!parsed) return json({ error: "invalid_request" }, 400);

  const config = razorpayConfigFromEnv(envAll());
  if (!checkoutConfigured(config, parsed.tier, parsed.period)) {
    /* The honest pre-launch state: pricing is real, payments are
       not open yet. The client renders this, never an error. */
    return json({ state: "payments_not_configured" }, 200);
  }

  const planId = planIdFor(config, parsed.tier, parsed.period);
  const basic = btoa(`${config.keyId}:${config.keySecret}`);
  try {
    const res = await fetch("https://api.razorpay.com/v1/subscriptions", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan_id: planId,
        /* A long ceiling; the subscription lives until cancelled,
           these are not fixed-term contracts. */
        total_count: parsed.period === "monthly" ? 120 : 10,
        customer_notify: 1,
        notes: { user_id: user.id, tier: parsed.tier, period: parsed.period },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      console.error(`billing checkout: provider status=${res.status}`);
      return json({ state: "provider_error" }, 502);
    }
    const data = (await res.json()) as Record<string, unknown>;
    return json(
      {
        state: "ready",
        provider: "razorpay",
        subscription_id: typeof data["id"] === "string" ? data["id"] : null,
        short_url: typeof data["short_url"] === "string" ? data["short_url"] : null,
        key_id: config.keyId,
      },
      200,
    );
  } catch {
    console.error("billing checkout: provider unreachable");
    return json({ state: "provider_error" }, 502);
  }
}

async function handleCreateOrder(req: Request, body: Record<string, unknown>): Promise<Response> {
  const authed = await authedUser(req);
  if (authed instanceof Response) return authed;
  const user = authed;

  const parsed = parseCheckoutRequest(body);
  if (!parsed) return json({ error: "invalid_request" }, 400);

  const config = razorpayConfigFromEnv(envAll());
  if (!ordersConfigured(config)) {
    /* The same honest pre-launch state as the subscription rail. */
    return json({ state: "payments_not_configured" }, 200);
  }

  const orderBody = buildOrderBody({
    tier: parsed.tier,
    period: parsed.period,
    userId: user.id,
    /* Razorpay caps receipts at 40 characters; this stays well
       under it while remaining unique per attempt. */
    receipt: `blm_${Date.now().toString(36)}_${user.id.replace(/-/g, "").slice(0, 12)}`,
  });
  if (!isOrderAmountValid(orderBody.amount)) {
    console.error(`billing order: amount below floor: ${orderBody.amount}`);
    return json({ error: "amount_below_minimum" }, 400);
  }

  const basic = btoa(`${config.keyId}:${config.keySecret}`);
  try {
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderBody),
      signal: AbortSignal.timeout(15_000),
    });
    if (res.status === 401) {
      /* The provider rejected OUR credentials — a server-side
         misconfiguration, surfaced as 401 so it is never mistaken
         for a buyer's failed payment. */
      console.error("billing order: provider auth failed");
      return json({ error: "provider_auth_failed" }, 401);
    }
    if (!res.ok) {
      console.error(`billing order: provider status=${res.status}`);
      return json({ error: "provider_error" }, 500);
    }
    const data = (await res.json()) as Record<string, unknown>;
    const orderId = typeof data["id"] === "string" ? data["id"] : null;
    if (!orderId) {
      console.error("billing order: provider response carried no order id");
      return json({ error: "provider_error" }, 500);
    }
    return json(
      {
        state: "ready",
        provider: "razorpay",
        order_id: orderId,
        amount: orderBody.amount,
        currency: orderBody.currency,
        key_id: config.keyId,
      },
      200,
    );
  } catch {
    console.error("billing order: provider unreachable");
    return json({ error: "provider_error" }, 500);
  }
}

async function handleVerifyPayment(req: Request, body: Record<string, unknown>): Promise<Response> {
  const authed = await authedUser(req);
  if (authed instanceof Response) return authed;

  const parsed = parseVerifyRequest(body);
  if (!parsed) return json({ error: "invalid_request" }, 400);

  const config = razorpayConfigFromEnv(envAll());
  if (!config.keySecret) {
    return json({ state: "payments_not_configured" }, 503);
  }

  const verified = await verifyPaymentSignature(
    parsed.orderId,
    parsed.paymentId,
    parsed.signature,
    config.keySecret,
  );
  if (!verified) {
    /* A mismatch grants nothing, marks nothing paid, and is a
       plain 400 — the webhook remains the only path to Premium. */
    console.error("billing verify: signature mismatch");
    return json({ error: "invalid_signature" }, 400);
  }
  return json({ state: "verified", verified: true }, 200);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  /* The webhook is identified by its signature header and verified
     against the RAW body — read the text before any JSON parsing. */
  if (req.headers.get("x-razorpay-signature")) {
    const raw = await req.text();
    return await handleWebhook(req, raw);
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "invalid_request" }, 400);
  }

  if (body["action"] === "create_checkout") {
    return await handleCreateCheckout(req, body);
  }
  if (body["action"] === "create_order") {
    return await handleCreateOrder(req, body);
  }
  if (body["action"] === "verify_payment") {
    return await handleVerifyPayment(req, body);
  }
  return json({ error: "unknown_action" }, 400);
});
