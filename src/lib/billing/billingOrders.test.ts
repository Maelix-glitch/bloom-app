/**
 * The Orders rail of the billing function's pure core
 * (supabase/functions/billing/billing-core.ts): server-side pricing,
 * checkout payment-signature verification, and the verified
 * payment.captured → entitlement-write mapping.
 *
 * The properties that matter: an order's amount comes ONLY from the
 * server's price table (pinned equal to plans.ts, the way the credit
 * allowances are mirrored); a payment signature verifies only when
 * it is exactly HMAC-SHA256(order_id|payment_id) under the key
 * secret; and a captured payment activates a plan only when its
 * notes are the ones create_order wrote AND its amount equals the
 * server price — anything else is ignored, never guessed at.
 * All keys here are fakes; real credentials never appear in tests.
 */
import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  MIN_ORDER_PAISE,
  buildOrderBody,
  isOrderAmountValid,
  mapRazorpayEvent,
  orderAmountPaiseFor,
  ordersConfigured,
  parseVerifyRequest,
  razorpayConfigFromEnv,
  verifyPaymentSignature,
  webhookEventKey,
} from "../../../supabase/functions/billing/billing-core";
import { priceFor } from "./plans";

const FAKE_SECRET = "fake-key-secret-for-tests";

const sign = (orderId: string, paymentId: string, secret: string) =>
  createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");

describe("server-side order pricing", () => {
  it("mirrors the plans.ts IN prices, in paise, for every tier + period", () => {
    for (const tier of ["premium", "premium_plus"] as const) {
      for (const period of ["monthly", "yearly"] as const) {
        const rupees = priceFor(tier, period, "IN").amount;
        expect(orderAmountPaiseFor(tier, period)).toBe(Math.round(rupees * 100));
      }
    }
  });

  it("enforces the ₹1 provider floor on amounts", () => {
    expect(MIN_ORDER_PAISE).toBe(100);
    expect(isOrderAmountValid(99)).toBe(false);
    expect(isOrderAmountValid(100)).toBe(true);
    expect(isOrderAmountValid(100.5)).toBe(false);
    for (const tier of ["premium", "premium_plus"] as const) {
      for (const period of ["monthly", "yearly"] as const) {
        expect(isOrderAmountValid(orderAmountPaiseFor(tier, period))).toBe(true);
      }
    }
  });

  it("builds the Razorpay order body from the table, with attribution notes", () => {
    const body = buildOrderBody({
      tier: "premium_plus",
      period: "yearly",
      userId: "user-1",
      receipt: "blm_test_receipt",
    });
    expect(body.amount).toBe(orderAmountPaiseFor("premium_plus", "yearly"));
    expect(body.currency).toBe("INR");
    expect(body.receipt).toBe("blm_test_receipt");
    expect(body.notes).toEqual({
      user_id: "user-1",
      tier: "premium_plus",
      period: "yearly",
      kind: "bloom_plan",
    });
  });

  it("the orders rail needs only the API credentials — no dashboard plan ids", () => {
    const keysOnly = razorpayConfigFromEnv({
      RAZORPAY_KEY_ID: "rzp_test_fake",
      RAZORPAY_KEY_SECRET: FAKE_SECRET,
    });
    expect(ordersConfigured(keysOnly)).toBe(true);
    expect(ordersConfigured(razorpayConfigFromEnv({ RAZORPAY_KEY_ID: "rzp_test_fake" }))).toBe(false);
    expect(ordersConfigured(razorpayConfigFromEnv({ RAZORPAY_KEY_SECRET: FAKE_SECRET }))).toBe(false);
    expect(ordersConfigured(razorpayConfigFromEnv({}))).toBe(false);
  });
});

describe("verify-payment request + signature", () => {
  it("parses only a complete signature triple", () => {
    expect(
      parseVerifyRequest({
        razorpay_order_id: "order_1",
        razorpay_payment_id: "pay_1",
        razorpay_signature: "abc",
      }),
    ).toEqual({ orderId: "order_1", paymentId: "pay_1", signature: "abc" });
    expect(parseVerifyRequest({ razorpay_order_id: "order_1", razorpay_payment_id: "pay_1" })).toBeNull();
    expect(
      parseVerifyRequest({ razorpay_order_id: "", razorpay_payment_id: "pay_1", razorpay_signature: "abc" }),
    ).toBeNull();
    expect(
      parseVerifyRequest({ razorpay_order_id: 7, razorpay_payment_id: "pay_1", razorpay_signature: "abc" }),
    ).toBeNull();
    expect(parseVerifyRequest(null)).toBeNull();
    expect(parseVerifyRequest("nope")).toBeNull();
  });

  it("accepts exactly HMAC-SHA256(order_id|payment_id) under the key secret", async () => {
    const good = sign("order_1", "pay_1", FAKE_SECRET);
    await expect(verifyPaymentSignature("order_1", "pay_1", good, FAKE_SECRET)).resolves.toBe(true);
  });

  it("rejects a signature for a different payment, a different order, or the wrong secret", async () => {
    await expect(
      verifyPaymentSignature("order_1", "pay_2", sign("order_1", "pay_1", FAKE_SECRET), FAKE_SECRET),
    ).resolves.toBe(false);
    await expect(
      verifyPaymentSignature("order_2", "pay_1", sign("order_1", "pay_1", FAKE_SECRET), FAKE_SECRET),
    ).resolves.toBe(false);
    await expect(
      verifyPaymentSignature("order_1", "pay_1", sign("order_1", "pay_1", "another-secret"), FAKE_SECRET),
    ).resolves.toBe(false);
    /* The webhook secret is a different secret — it must not verify here. */
    await expect(
      verifyPaymentSignature("order_1", "pay_1", sign("order_1", "pay_1", FAKE_SECRET), "webhook-secret"),
    ).resolves.toBe(false);
  });

  it("rejects missing pieces outright", async () => {
    const good = sign("order_1", "pay_1", FAKE_SECRET);
    await expect(verifyPaymentSignature("order_1", "pay_1", null, FAKE_SECRET)).resolves.toBe(false);
    await expect(verifyPaymentSignature("order_1", "pay_1", "", FAKE_SECRET)).resolves.toBe(false);
    await expect(verifyPaymentSignature("order_1", "pay_1", good, "")).resolves.toBe(false);
    await expect(verifyPaymentSignature("", "pay_1", good, FAKE_SECRET)).resolves.toBe(false);
    await expect(verifyPaymentSignature("order_1", "pay_1", "not-hex-at-all", FAKE_SECRET)).resolves.toBe(false);
  });
});

/* 2026-01-15T00:00:00Z — a fixed capture instant so the period math
   is pinned to exact calendar dates, not relative arithmetic. */
const CAPTURED_AT = 1768435200;

function capturedPayload(
  entityOver: Record<string, unknown> = {},
  notesOver: Record<string, unknown> | null = {},
): Record<string, unknown> {
  const notes =
    notesOver === null
      ? undefined
      : { user_id: "user-1", tier: "premium", period: "monthly", kind: "bloom_plan", ...notesOver };
  return {
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: "pay_1",
          order_id: "order_1",
          amount: orderAmountPaiseFor("premium", "monthly"),
          currency: "INR",
          status: "captured",
          created_at: CAPTURED_AT,
          notes,
          ...entityOver,
        },
      },
    },
  };
}

describe("payment.captured → entitlement write", () => {
  it("activates the noted tier for exactly one period from the capture instant", () => {
    const action = mapRazorpayEvent(capturedPayload());
    expect(action).toEqual({
      kind: "activate",
      userId: "user-1",
      plan: "premium",
      providerSubscriptionId: "order_1",
      providerCustomerId: null,
      periodStart: "2026-01-15T00:00:00.000Z",
      periodEnd: "2026-02-15T00:00:00.000Z",
    });
  });

  it("a yearly Plus order activates for a full year at the Plus price", () => {
    const action = mapRazorpayEvent(
      capturedPayload(
        { amount: orderAmountPaiseFor("premium_plus", "yearly") },
        { tier: "premium_plus", period: "yearly" },
      ),
    );
    expect(action).toMatchObject({
      kind: "activate",
      plan: "premium_plus",
      periodStart: "2026-01-15T00:00:00.000Z",
      periodEnd: "2027-01-15T00:00:00.000Z",
    });
  });

  it("ignores a captured payment whose amount is not the server price", () => {
    expect(mapRazorpayEvent(capturedPayload({ amount: 100 }))).toMatchObject({ kind: "ignore" });
    expect(
      mapRazorpayEvent(capturedPayload({ amount: orderAmountPaiseFor("premium", "yearly") })),
    ).toMatchObject({ kind: "ignore" });
  });

  it("ignores payments that are not captured, not INR, or not Bloom plan orders", () => {
    expect(mapRazorpayEvent(capturedPayload({ status: "authorized" }))).toMatchObject({ kind: "ignore" });
    expect(mapRazorpayEvent(capturedPayload({ currency: "USD" }))).toMatchObject({ kind: "ignore" });
    expect(mapRazorpayEvent(capturedPayload({}, { kind: "something_else" }))).toMatchObject({ kind: "ignore" });
    expect(mapRazorpayEvent(capturedPayload({}, null))).toMatchObject({ kind: "ignore" });
    expect(mapRazorpayEvent(capturedPayload({}, { user_id: "" }))).toMatchObject({ kind: "ignore" });
    expect(mapRazorpayEvent(capturedPayload({}, { tier: "free" }))).toMatchObject({ kind: "ignore" });
    expect(mapRazorpayEvent(capturedPayload({}, { period: "weekly" }))).toMatchObject({ kind: "ignore" });
    expect(mapRazorpayEvent(capturedPayload({ order_id: "" }))).toMatchObject({ kind: "ignore" });
  });

  it("only payment.captured acts — the same entity under another event is ignored", () => {
    const payload = capturedPayload();
    payload["event"] = "payment.authorized";
    expect(mapRazorpayEvent(payload)).toMatchObject({ kind: "ignore" });
    payload["event"] = "payment.failed";
    expect(mapRazorpayEvent(payload)).toMatchObject({ kind: "ignore" });
  });

  it("is deterministic, and the replay key for its raw body is stable", async () => {
    const payload = capturedPayload();
    expect(mapRazorpayEvent(payload)).toEqual(mapRazorpayEvent(payload));
    const raw = JSON.stringify(payload);
    await expect(webhookEventKey(raw)).resolves.toBe(await webhookEventKey(raw));
  });
});
