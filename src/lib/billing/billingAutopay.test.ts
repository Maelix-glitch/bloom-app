/**
 * M-222 Autopay — the billing core's subscription-rail additions:
 * ensured-plan construction (priced from the SAME server table the
 * Orders rail uses), the halted/authenticated webhook mappings, and
 * the tracking-row derivation. The entitlement discipline is
 * unchanged: money moves only on verified events, attribution only
 * from the notes the checkout itself wrote.
 */
import { describe, expect, it } from "vitest";

import {
  buildPlanBody,
  mapRazorpayEvent,
  orderAmountPaiseFor,
  planKeyFor,
  razorpayConfigFromEnv,
  subscriptionConfigured,
  trackingRowForEvent,
} from "../../../supabase/functions/billing/billing-core";

describe("buildPlanBody — the ensured plan is priced from the server table", () => {
  it("every tier+period carries exactly the Orders rail's amount", () => {
    for (const tier of ["premium", "premium_plus"] as const) {
      for (const period of ["monthly", "yearly"] as const) {
        const body = buildPlanBody(tier, period);
        expect(body.item.amount).toBe(orderAmountPaiseFor(tier, period));
        expect(body.item.currency).toBe("INR");
        expect(body.period).toBe(period);
        expect(body.interval).toBe(1);
      }
    }
  });

  it("the plan names the tier and period, and its notes carry the attribution kind", () => {
    const body = buildPlanBody("premium_plus", "yearly");
    expect(body.name).toContain("Premium Plus");
    expect(body.name).toContain("Yearly");
    expect(body.notes).toEqual({ kind: "bloom_plan", tier: "premium_plus", period: "yearly" });
    expect(planKeyFor("premium", "monthly")).toBe("premium_monthly");
    expect(planKeyFor("premium_plus", "yearly")).toBe("premium_plus_yearly");
  });
});

describe("subscriptionConfigured — the M-222 rail needs only the API credentials", () => {
  it("keys alone configure it (plan ids are ensured, not required up front)", () => {
    const config = razorpayConfigFromEnv({
      RAZORPAY_KEY_ID: "rzp_live_x",
      RAZORPAY_KEY_SECRET: "secret",
    });
    expect(subscriptionConfigured(config)).toBe(true);
  });

  it("missing either key leaves it unconfigured", () => {
    expect(subscriptionConfigured(razorpayConfigFromEnv({}))).toBe(false);
    expect(
      subscriptionConfigured(razorpayConfigFromEnv({ RAZORPAY_KEY_ID: "rzp_live_x" })),
    ).toBe(false);
    expect(
      subscriptionConfigured(razorpayConfigFromEnv({ RAZORPAY_KEY_SECRET: "secret" })),
    ).toBe(false);
  });
});

describe("mapRazorpayEvent — the M-222 lifecycle additions", () => {
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

  it("halted → a status write that lapses at the period end, never instantly", () => {
    const action = mapRazorpayEvent(payload("subscription.halted", ENTITY));
    expect(action.kind).toBe("status");
    if (action.kind === "status") {
      /* "cancelled" is the one status billing_effective_tier keeps
         alive until current_period_end — the paid period is honoured
         in full before the plan lapses. */
      expect(action.status).toBe("cancelled");
      expect(action.periodEnd).toBe(new Date(1797600000 * 1000).toISOString());
    }
  });

  it("halted without attribution is ignored, never guessed", () => {
    expect(
      mapRazorpayEvent(payload("subscription.halted", { ...ENTITY, notes: {} })).kind,
    ).toBe("ignore");
  });

  it("authenticated → ignore: a mandate alone grants nothing", () => {
    expect(mapRazorpayEvent(payload("subscription.authenticated", ENTITY))).toEqual({
      kind: "ignore",
      event: "subscription.authenticated",
    });
  });

  it("charged still activates with credits alignment via the shared write", () => {
    const action = mapRazorpayEvent(payload("subscription.charged", ENTITY));
    expect(action.kind).toBe("activate");
    if (action.kind === "activate") {
      expect(action.providerSubscriptionId).toBe("sub_123");
      expect(action.periodEnd).toBe(new Date(1797600000 * 1000).toISOString());
    }
  });
});

describe("trackingRowForEvent — the provider's own lifecycle record", () => {
  const payload = (event: string, entity: Record<string, unknown>) => ({
    event,
    payload: { subscription: { entity } },
  });
  const ENTITY = {
    id: "sub_123",
    current_start: 1795000000,
    current_end: 1797600000,
    notes: { user_id: "user-uuid-1", tier: "premium_plus", period: "yearly" },
  };

  it("keeps the provider's raw status word (halted stays halted)", () => {
    const row = trackingRowForEvent(payload("subscription.halted", ENTITY));
    expect(row).not.toBeNull();
    expect(row?.status).toBe("halted");
    expect(row?.providerSubscriptionId).toBe("sub_123");
    expect(row?.userId).toBe("user-uuid-1");
    expect(row?.planKey).toBe("premium_plus_yearly");
    expect(row?.tier).toBe("premium_plus");
    expect(row?.period).toBe("yearly");
    expect(row?.periodEnd).toBe(new Date(1797600000 * 1000).toISOString());
  });

  it("charged reads as active; authenticated is recorded as itself", () => {
    expect(trackingRowForEvent(payload("subscription.charged", ENTITY))?.status).toBe("active");
    expect(trackingRowForEvent(payload("subscription.authenticated", ENTITY))?.status).toBe(
      "authenticated",
    );
  });

  it("payment events and unattributable payloads produce no row", () => {
    expect(trackingRowForEvent({ event: "payment.captured", payload: {} })).toBeNull();
    expect(trackingRowForEvent(payload("subscription.charged", { id: "sub_1", notes: {} }))).toBeNull();
    expect(trackingRowForEvent(null)).toBeNull();
    expect(trackingRowForEvent({ event: "subscription.charged" })).toBeNull();
  });
});
