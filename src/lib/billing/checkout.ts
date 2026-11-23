/**
 * Starting a checkout — the client half of the billing seam.
 *
 * Asks the billing edge function to open a provider checkout for the
 * signed-in person. The function's answers are states, not errors:
 * "payments_not_configured" is the honest pre-launch state (Bloom's
 * payment account is not connected yet) and the UI renders it as
 * such; "ready" carries what the chosen rail needs. Nothing is
 * charged by asking, and nothing here can grant Premium — only the
 * provider's verified webhook can.
 *
 * Rails, one seam:
 *   · createSubscription + payWithRazorpaySubscription — the M-222
 *     Autopay rail (the default, CHECKOUT_RAIL below): the function
 *     ensures a Razorpay Plan and creates a Subscription against it;
 *     the modal opens in subscription mode, the member authorises a
 *     mandate (UPI AutoPay / card e-mandate) plus the first charge,
 *     and Razorpay debits each renewal itself.
 *   · startCheckout — the legacy subscription rail: the function
 *     creates a Razorpay Subscription and returns its hosted payment
 *     link.
 *   · createOrder + payWithRazorpay — the Standard Web Checkout
 *     rail: the function creates a one-time Order priced from the
 *     SERVER's table, and the Razorpay modal (checkout.js) opens
 *     in-page with the order id and the public key id. The key
 *     secret never reaches this file — it lives only in the
 *     function's secrets. After the modal reports success, the
 *     signature is confirmed through the function (verifyPayment)
 *     so the UI can say "payment received" truthfully; the plan
 *     itself still activates from the webhook alone.
 */

import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import type { BillingPeriod, PlanTier } from "@/lib/billing/plans";

export type CheckoutResult =
  | { state: "ready"; shortUrl: string | null; subscriptionId: string | null }
  | { state: "payments_not_configured" }
  | { state: "provider_error" }
  | { state: "failed" };

export async function startCheckout(
  tier: Exclude<PlanTier, "free">,
  period: BillingPeriod,
): Promise<CheckoutResult> {
  if (!hasSupabaseConfig) return { state: "failed" };
  try {
    const { data, error } = await supabase.functions.invoke("billing", {
      body: { action: "create_checkout", tier, period },
    });
    if (error) return { state: "failed" };
    const d = (data ?? {}) as Record<string, unknown>;
    if (d["state"] === "payments_not_configured") return { state: "payments_not_configured" };
    if (d["state"] === "provider_error") return { state: "provider_error" };
    if (d["state"] === "ready") {
      return {
        state: "ready",
        shortUrl: typeof d["short_url"] === "string" ? d["short_url"] : null,
        subscriptionId: typeof d["subscription_id"] === "string" ? d["subscription_id"] : null,
      };
    }
    return { state: "failed" };
  } catch {
    return { state: "failed" };
  }
}

/* ------------------------------------------------------------------ */
/* Orders rail — Standard Web Checkout                                */
/* ------------------------------------------------------------------ */

export type OrderResult =
  | { state: "ready"; orderId: string; amount: number; currency: string; keyId: string }
  | { state: "payments_not_configured" }
  | { state: "provider_error" }
  | { state: "failed" };

export async function createOrder(
  tier: Exclude<PlanTier, "free">,
  period: BillingPeriod,
): Promise<OrderResult> {
  if (!hasSupabaseConfig) return { state: "failed" };
  try {
    const { data, error } = await supabase.functions.invoke("billing", {
      body: { action: "create_order", tier, period },
    });
    if (error) return { state: "failed" };
    const d = (data ?? {}) as Record<string, unknown>;
    if (d["state"] === "payments_not_configured") return { state: "payments_not_configured" };
    if (d["state"] === "provider_error") return { state: "provider_error" };
    if (
      d["state"] === "ready" &&
      typeof d["order_id"] === "string" &&
      typeof d["key_id"] === "string" &&
      typeof d["amount"] === "number"
    ) {
      return {
        state: "ready",
        orderId: d["order_id"],
        amount: d["amount"],
        currency: typeof d["currency"] === "string" ? d["currency"] : "INR",
        keyId: d["key_id"],
      };
    }
    return { state: "failed" };
  } catch {
    return { state: "failed" };
  }
}

export interface PaymentSignature {
  orderId: string;
  paymentId: string;
  signature: string;
}

/** Ask the function to confirm the signature the modal handed back.
 *  True means the payment is genuinely Razorpay's; the entitlement
 *  still arrives via the webhook, never via this call. */
export async function verifyPayment(sig: PaymentSignature): Promise<boolean> {
  if (!hasSupabaseConfig) return false;
  try {
    const { data, error } = await supabase.functions.invoke("billing", {
      body: {
        action: "verify_payment",
        razorpay_order_id: sig.orderId,
        razorpay_payment_id: sig.paymentId,
        razorpay_signature: sig.signature,
      },
    });
    if (error) return false;
    const d = (data ?? {}) as Record<string, unknown>;
    return d["state"] === "verified" && d["verified"] === true;
  } catch {
    return false;
  }
}

/* The narrow slice of the Razorpay checkout.js surface Bloom uses —
   declared here because the script is loaded from Razorpay's CDN at
   runtime; there is no package to take types from. An order checkout
   carries amount + order_id; a subscription checkout carries
   subscription_id instead (the plan holds the amount). */
interface RazorpayModalOptions {
  key: string;
  amount?: number;
  currency?: string;
  name: string;
  description: string;
  order_id?: string;
  subscription_id?: string;
  prefill?: { email?: string };
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
  handler: (response: {
    razorpay_payment_id: string;
    razorpay_order_id?: string;
    razorpay_subscription_id?: string;
    razorpay_signature: string;
  }) => void;
}

interface RazorpayInstance {
  open: () => void;
  on: (
    event: "payment.failed",
    handler: (response: { error?: { description?: string } }) => void,
  ) => void;
}

type RazorpayConstructor = new (options: RazorpayModalOptions) => RazorpayInstance;

const CHECKOUT_JS_URL = "https://checkout.razorpay.com/v1/checkout.js";
let checkoutJsPromise: Promise<RazorpayConstructor | null> | null = null;

/** Load checkout.js once (the way any third-party script is loaded
 *  here: a single injected tag, the promise cached). Null when the
 *  script cannot load — blocked network, offline — so the caller can
 *  say so honestly instead of opening nothing. */
export function loadRazorpayCheckout(): Promise<RazorpayConstructor | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  const w = window as unknown as { Razorpay?: RazorpayConstructor };
  if (w.Razorpay) return Promise.resolve(w.Razorpay);
  if (checkoutJsPromise) return checkoutJsPromise;
  checkoutJsPromise = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = CHECKOUT_JS_URL;
    script.async = true;
    script.onload = () => resolve(w.Razorpay ?? null);
    script.onerror = () => {
      checkoutJsPromise = null;
      resolve(null);
    };
    document.head.appendChild(script);
  });
  return checkoutJsPromise;
}

export type ModalPaymentResult =
  | { kind: "paid"; signature: PaymentSignature }
  | { kind: "dismissed" }
  | { kind: "failed"; message: string }
  | { kind: "unavailable" };

/** Open the Razorpay modal for an order the function created, and
 *  settle exactly once: paid (with the signature triple the caller
 *  verifies through the function), dismissed (the person closed it
 *  — nothing was charged), failed (the provider's own wording), or
 *  unavailable (checkout.js itself could not load). */
export async function payWithRazorpay(input: {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  description: string;
}): Promise<ModalPaymentResult> {
  /* M-217: the checkout.js download and the prefill session fetch
     run CONCURRENTLY — the modal opens when the slower of the two
     lands, not after both in series. (In the sheet flow the script
     is usually already warm: the sheet preloads it on open and the
     tap starts it before the order round trip, so this await is
     the cached promise resolving.) */
  const [Razorpay, email] = await Promise.all([
    loadRazorpayCheckout(),
    (async (): Promise<string | undefined> => {
      try {
        const { data } = await supabase.auth.getSession();
        return data.session?.user?.email ?? undefined;
      } catch {
        /* prefill is a courtesy; its absence never blocks a payment */
        return undefined;
      }
    })(),
  ]);
  if (!Razorpay) return { kind: "unavailable" };

  return await new Promise<ModalPaymentResult>((resolve) => {
    let settled = false;
    const settle = (r: ModalPaymentResult) => {
      if (settled) return;
      settled = true;
      resolve(r);
    };
    const rzp = new Razorpay({
      key: input.keyId,
      amount: input.amount,
      currency: input.currency,
      name: "Bloom Vitalis",
      description: input.description,
      order_id: input.orderId,
      ...(email ? { prefill: { email } } : {}),
      theme: { color: "#dcc08f" },
      modal: { ondismiss: () => settle({ kind: "dismissed" }) },
      handler: (response) =>
        settle({
          kind: "paid",
          signature: {
            orderId: response.razorpay_order_id ?? input.orderId,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          },
        }),
    });
    rzp.on("payment.failed", (response) =>
      settle({
        kind: "failed",
        message: response.error?.description ?? "The payment did not go through.",
      }),
    );
    rzp.open();
  });
}

/* ------------------------------------------------------------------ */
/* Autopay rail — Razorpay Subscriptions (M-222)                      */
/*                                                                    */
/* The default checkout. The function ensures the plan, creates the   */
/* subscription and returns its id + the public key id; the modal     */
/* opens in subscription mode — no amount, no order id: the plan      */
/* carries the price. The member authorises the mandate and the       */
/* first period's charge in the modal; renewals debit automatically   */
/* until cancelled. The plan itself still activates ONLY from the     */
/* verified subscription.charged webhook — the modal's success        */
/* callback is the member's receipt, never the entitlement.           */
/* ------------------------------------------------------------------ */

/** Which rail the paywall's buy action runs. "subscription" is the
 *  default (Autopay); flip to "order" to return every purchase to
 *  the one-time Orders rail — both rails stay live in the function,
 *  and the webhook honours both. */
export const CHECKOUT_RAIL: "subscription" | "order" = "subscription";

export type SubscriptionResult =
  | { state: "ready"; subscriptionId: string; keyId: string }
  | { state: "payments_not_configured" }
  | { state: "provider_error" }
  | { state: "failed" };

export async function createSubscription(
  tier: Exclude<PlanTier, "free">,
  period: BillingPeriod,
): Promise<SubscriptionResult> {
  if (!hasSupabaseConfig) return { state: "failed" };
  try {
    const { data, error } = await supabase.functions.invoke("billing", {
      body: { action: "create_subscription", tier, period },
    });
    if (error) return { state: "failed" };
    const d = (data ?? {}) as Record<string, unknown>;
    if (d["state"] === "payments_not_configured") return { state: "payments_not_configured" };
    if (d["state"] === "provider_error") return { state: "provider_error" };
    if (
      d["state"] === "ready" &&
      typeof d["subscription_id"] === "string" &&
      typeof d["key_id"] === "string"
    ) {
      return { state: "ready", subscriptionId: d["subscription_id"], keyId: d["key_id"] };
    }
    return { state: "failed" };
  } catch {
    return { state: "failed" };
  }
}

export type SubscriptionModalResult =
  | { kind: "authorized"; paymentId: string; subscriptionId: string }
  | { kind: "dismissed" }
  | { kind: "failed"; message: string }
  | { kind: "unavailable" };

/** Open the Razorpay modal in subscription mode for a subscription
 *  the function created, settling exactly once the way the order
 *  modal does: authorized (mandate + first charge accepted by the
 *  provider — the entitlement still arrives via webhook), dismissed,
 *  failed (the provider's own wording), or unavailable. */
export async function payWithRazorpaySubscription(input: {
  keyId: string;
  subscriptionId: string;
  description: string;
}): Promise<SubscriptionModalResult> {
  /* The same M-217 concurrency contract as the order modal: the
     checkout.js download and the prefill session fetch run together,
     and the sheet's on-open preload usually makes both instant. */
  const [Razorpay, email] = await Promise.all([
    loadRazorpayCheckout(),
    (async (): Promise<string | undefined> => {
      try {
        const { data } = await supabase.auth.getSession();
        return data.session?.user?.email ?? undefined;
      } catch {
        /* prefill is a courtesy; its absence never blocks a payment */
        return undefined;
      }
    })(),
  ]);
  if (!Razorpay) return { kind: "unavailable" };

  return await new Promise<SubscriptionModalResult>((resolve) => {
    let settled = false;
    const settle = (r: SubscriptionModalResult) => {
      if (settled) return;
      settled = true;
      resolve(r);
    };
    const rzp = new Razorpay({
      key: input.keyId,
      name: "Bloom Vitalis",
      description: input.description,
      subscription_id: input.subscriptionId,
      ...(email ? { prefill: { email } } : {}),
      theme: { color: "#dcc08f" },
      modal: { ondismiss: () => settle({ kind: "dismissed" }) },
      handler: (response) =>
        settle({
          kind: "authorized",
          paymentId: response.razorpay_payment_id,
          subscriptionId: response.razorpay_subscription_id ?? input.subscriptionId,
        }),
    });
    rzp.on("payment.failed", (response) =>
      settle({
        kind: "failed",
        message: response.error?.description ?? "The payment did not go through.",
      }),
    );
    rzp.open();
  });
}

/* ------------------------------------------------------------------ */
/* Cancel auto-renew (M-222)                                          */
/* ------------------------------------------------------------------ */

export type CancelAutoRenewResult =
  | { state: "cancel_scheduled"; periodEnd: string | null }
  | { state: "no_active_subscription" }
  | { state: "payments_not_configured" }
  | { state: "provider_error" }
  | { state: "failed" };

/** Ask the function to end auto-renew on the caller's own Razorpay
 *  subscription (cancel at cycle end — the plan stays live until the
 *  paid period ends). "no_active_subscription" is an honest answer,
 *  not an error: a one-time order or a manual grant has no mandate
 *  to cancel. */
export async function cancelAutoRenew(): Promise<CancelAutoRenewResult> {
  if (!hasSupabaseConfig) return { state: "failed" };
  try {
    const { data, error } = await supabase.functions.invoke("billing", {
      body: { action: "cancel_subscription" },
    });
    if (error) return { state: "failed" };
    const d = (data ?? {}) as Record<string, unknown>;
    if (d["state"] === "cancel_scheduled") {
      return {
        state: "cancel_scheduled",
        periodEnd: typeof d["period_end"] === "string" ? d["period_end"] : null,
      };
    }
    if (d["state"] === "no_active_subscription") return { state: "no_active_subscription" };
    if (d["state"] === "payments_not_configured") return { state: "payments_not_configured" };
    if (d["state"] === "provider_error") return { state: "provider_error" };
    return { state: "failed" };
  } catch {
    return { state: "failed" };
  }
}
