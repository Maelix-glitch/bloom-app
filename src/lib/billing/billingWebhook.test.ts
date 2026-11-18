/**
 * The billing function's pure core (supabase/functions/billing/
 * billing-core.ts): provider configuration honesty, Razorpay webhook
 * signature verification, and the verified-event → entitlement-write
 * mapping. Money moves only on a verified signature, and attribution
 * comes only from the notes the checkout itself wrote.
 */
import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  checkoutConfigured,
  mapRazorpayEvent,
  parseCheckoutRequest,
  planIdFor,
  razorpayConfigFromEnv,
  verifyRazorpaySignature,
  webhookConfigured,
} from "../../../supabase/functions/billing/billing-core";

const FULL_ENV = {
  RAZORPAY_KEY_ID: "rzp_test_123",
  RAZORPAY_KEY_SECRET: "secret",
  RAZORPAY_WEBHOOK_SECRET: "whsec",
  RAZORPAY_PLAN_PREMIUM_MONTHLY: "plan_pm",
  RAZORPAY_PLAN_PREMIUM_YEARLY: "plan_py",
  RAZORPAY_PLAN_PREMIUM_PLUS_MONTHLY: "plan_qm",
  RAZORPAY_PLAN_PREMIUM_PLUS_YEARLY: "plan_qy",
};

describe("provider configuration honesty", () => {
  it("no env → nothing configured (the payments_not_configured state)", () => {
    const config = razorpayConfigFromEnv({});
    expect(config.keyId).toBe("");
    expect(webhookConfigured(config)).toBe(false);
    expect(checkoutConfigured(config, "premium", "monthly")).toBe(false);
    expect(planIdFor(config, "premium", "monthly")).toBeNull();
  });

  it("full env → checkout configured per tier+period plan id", () => {
    const config = razorpayConfigFromEnv(FULL_ENV);
    expect(webhookConfigured(config)).toBe(true);
    expect(checkoutConfigured(config, "premium", "monthly")).toBe(true);
    expect(checkoutConfigured(config, "premium_plus", "yearly")).toBe(true);
    expect(planIdFor(config, "premium", "yearly")).toBe("plan_py");
    expect(planIdFor(config, "premium_plus", "monthly")).toBe("plan_qm");
  });

  it("keys without the plan id for a tier → that checkout is not configured", () => {
    const { RAZORPAY_PLAN_PREMIUM_PLUS_YEARLY: _drop, ...partial } = FULL_ENV;
    const config = razorpayConfigFromEnv(partial);
    expect(checkoutConfigured(config, "premium", "monthly")).toBe(true);
    expect(checkoutConfigured(config, "premium_plus", "yearly")).toBe(false);
  });

  it("checkout requests accept only paid tiers and real periods", () => {
    expect(parseCheckoutRequest({ tier: "premium", period: "yearly" })).toEqual({
      tier: "premium",
      period: "yearly",
    });
    expect(parseCheckoutRequest({ tier: "free", period: "monthly" })).toBeNull();
    expect(parseCheckoutRequest({ tier: "premium", period: "weekly" })).toBeNull();
    expect(parseCheckoutRequest(null)).toBeNull();
    expect(parseCheckoutRequest("premium")).toBeNull();
  });
});

describe("verifyRazorpaySignature (HMAC-SHA256 over the raw body)", () => {
  const secret = "whsec_test";
  const body = JSON.stringify({ event: "subscription.activated", payload: {} });
  const sign = (b: string, s: string) => createHmac("sha256", s).update(b).digest("hex");

  it("accepts a correct signature", async () => {
    await expect(verifyRazorpaySignature(body, sign(body, secret), secret)).resolves.toBe(true);
  });

  it("rejects a tampered body, a wrong secret, and missing pieces", async () => {
    await expect(verifyRazorpaySignature(body + " ", sign(body, secret), secret)).resolves.toBe(false);
    await expect(verifyRazorpaySignature(body, sign(body, "other"), secret)).resolves.toBe(false);
    await expect(verifyRazorpaySignature(body, null, secret)).resolves.toBe(false);
    await expect(verifyRazorpaySignature(body, sign(body, secret), "")).resolves.toBe(false);
    await expect(verifyRazorpaySignature(body, "deadbeef", secret)).resolves.toBe(false);
  });
});

describe("mapRazorpayEvent — verified events to entitlement writes", () => {
  const payload = (event: string, entity: Record<string, unknown>) => ({
    event,
    payload: { subscription: { entity } },
  });
  const ENTITY = {
    id: "sub_123",
    customer_id: "cust_9",
    current_start: 1795000000,
    current_end: 1797600000,
    notes: { user_id: "user-uuid-1", tier: "premium", period: "monthly" },
  };

  it("activated/charged with checkout notes → activate that user+tier", () => {
    for (const event of ["subscription.activated", "subscription.charged"]) {
      const action = mapRazorpayEvent(payload(event, ENTITY));
      expect(action.kind).toBe("activate");
      if (action.kind === "activate") {
        expect(action.userId).toBe("user-uuid-1");
        expect(action.plan).toBe("premium");
        expect(action.providerSubscriptionId).toBe("sub_123");
        expect(action.providerCustomerId).toBe("cust_9");
        expect(action.periodStart).toBe(new Date(1795000000 * 1000).toISOString());
        expect(action.periodEnd).toBe(new Date(1797600000 * 1000).toISOString());
      }
    }
    const plus = mapRazorpayEvent(
      payload("subscription.activated", { ...ENTITY, notes: { user_id: "u2", tier: "premium_plus" } }),
    );
    expect(plus.kind === "activate" && plus.plan).toBe("premium_plus");
  });

  it("unattributable activations are ignored, never guessed", () => {
    expect(mapRazorpayEvent(payload("subscription.activated", { ...ENTITY, notes: {} })).kind).toBe("ignore");
    expect(
      mapRazorpayEvent(payload("subscription.activated", { ...ENTITY, notes: { user_id: "u", tier: "free" } })).kind,
    ).toBe("ignore");
    expect(mapRazorpayEvent(payload("subscription.activated", { notes: ENTITY.notes })).kind).toBe("ignore");
  });

  it("lifecycle events map to status writes", () => {
    const status = (event: string) => {
      const a = mapRazorpayEvent(payload(event, ENTITY));
      return a.kind === "status" ? a.status : a.kind;
    };
    expect(status("subscription.cancelled")).toBe("cancelled");
    expect(status("subscription.expired")).toBe("expired");
    expect(status("subscription.completed")).toBe("expired");
    expect(status("subscription.pending")).toBe("past_due");
    expect(status("subscription.paused")).toBe("past_due");
  });

  it("unknown events and shapeless payloads are ignored with their name", () => {
    expect(mapRazorpayEvent(payload("payment.captured", ENTITY))).toEqual({
      kind: "ignore",
      event: "payment.captured",
    });
    expect(mapRazorpayEvent(null)).toEqual({ kind: "ignore", event: "" });
    expect(mapRazorpayEvent({ event: "subscription.activated" })).toEqual({
      kind: "ignore",
      event: "subscription.activated",
    });
  });
});
