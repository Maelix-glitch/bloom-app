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
 * Two rails, one seam:
 *   · startCheckout — the subscription rail: the function creates a
 *     Razorpay Subscription and returns its hosted payment link.
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
   runtime; there is no package to take types from. */
interface RazorpayModalOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: { email?: string };
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
  handler: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
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
  const Razorpay = await loadRazorpayCheckout();
  if (!Razorpay) return { kind: "unavailable" };

  let email: string | undefined;
  try {
    const { data } = await supabase.auth.getSession();
    email = data.session?.user?.email ?? undefined;
  } catch {
    /* prefill is a courtesy; its absence never blocks a payment */
  }

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
            orderId: response.razorpay_order_id,
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
