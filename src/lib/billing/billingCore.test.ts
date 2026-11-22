/**
 * The coach function's billing gate — the exact pure module the
 * deployed function bundles (supabase/functions/coach/billing-core.ts),
 * exercised the way vitalis-core is. The properties that matter:
 * the gate decides BEFORE any provider call, failures are never
 * charged (the charge happens in index.ts only after success), a
 * free photo is refused as a feature regardless of balance, and an
 * unanswered entitlement RPC FAILS CLOSED (pentest 2026-11-19, M2 —
 * billing has been live since 2026-11-18, so the original dark-launch
 * seam now survives only behind the explicit operator flag, pinned
 * here so it can never quietly become a client-controlled bypass).
 */
import { describe, expect, it } from "vitest";

import {
  CREDIT_COSTS,
  TIER_ALLOWANCES,
  costFor,
  decideGate,
  gateErrorBody,
  gateErrorStatus,
  parseEntitlementRows,
  type EntitlementSnapshot,
} from "../../../supabase/functions/coach/billing-core";
import { monthlyCreditsFor } from "./plans";

const snap = (over: Partial<EntitlementSnapshot> = {}): EntitlementSnapshot => ({
  tier: "free",
  status: "none",
  creditBalance: 20,
  monthlyAllowance: 20,
  currentPeriodEnd: null,
  ...over,
});

describe("flat credit costs", () => {
  it("coach message 1 · coach photo 3 · vitalis 2 · tts 1", () => {
    expect(costFor("coach", false)).toEqual({ cost: 1, reason: "coach_message" });
    expect(costFor("coach", true)).toEqual({ cost: 3, reason: "coach_photo" });
    expect(costFor("vitalis", false)).toEqual({ cost: 2, reason: "vitalis_message" });
    expect(costFor("vitalis", true)).toEqual({ cost: 2, reason: "vitalis_message" });
    expect(costFor("tts", false)).toEqual({ cost: 1, reason: "tts_request" });
    expect(CREDIT_COSTS).toEqual({
      coach_message: 1,
      coach_photo: 3,
      vitalis_message: 2,
      tts_request: 1,
    });
  });

  it("server allowances mirror the client plan constants exactly", () => {
    expect(TIER_ALLOWANCES.free).toBe(monthlyCreditsFor("free"));
    expect(TIER_ALLOWANCES.premium).toBe(monthlyCreditsFor("premium"));
    expect(TIER_ALLOWANCES.premium_plus).toBe(monthlyCreditsFor("premium_plus"));
  });
});

describe("decideGate", () => {
  /* PIN CHANGED 2026-11-19 (pentest M2): this used to pin "RPC silent
     → allow uncharged" — the dark-launch seam from before the billing
     migration landed. Billing went live 2026-11-18, so the seam's
     reason expired: an unanswered RPC is now an outage and the gate
     fails CLOSED by default. allow_uncharged survives only behind
     the operator's explicit darkLaunch flag. */
  it("billing RPC silent → fail closed (deny_unavailable), every action", () => {
    for (const action of ["coach", "vitalis", "tts"] as const) {
      expect(decideGate({ entitlement: null, action, hasMedia: false })).toEqual({
        kind: "deny_unavailable",
      });
    }
    expect(decideGate({ entitlement: null, action: "coach", hasMedia: true })).toEqual({
      kind: "deny_unavailable",
    });
  });

  it("dark-launch flag explicitly set → the old uncharged seam, and only then", () => {
    for (const action of ["coach", "vitalis", "tts"] as const) {
      expect(decideGate({ entitlement: null, action, hasMedia: false, darkLaunch: true })).toEqual({
        kind: "allow_uncharged",
      });
    }
    /* The flag changes nothing once the RPC answers. */
    expect(
      decideGate({ entitlement: snap({ creditBalance: 0 }), action: "coach", hasMedia: false, darkLaunch: true })
        .kind,
    ).toBe("deny_insufficient");
  });

  it("free + photo → premium_required no matter the balance", () => {
    expect(decideGate({ entitlement: snap({ creditBalance: 20 }), action: "coach", hasMedia: true })).toEqual({
      kind: "deny_premium",
      feature: "food_photo_analysis",
      tier: "free",
    });
    expect(decideGate({ entitlement: snap({ creditBalance: 0 }), action: "coach", hasMedia: true }).kind).toBe(
      "deny_premium",
    );
  });

  it("balance below the flat cost → insufficient, with the numbers", () => {
    expect(decideGate({ entitlement: snap({ creditBalance: 0 }), action: "coach", hasMedia: false })).toEqual({
      kind: "deny_insufficient",
      cost: 1,
      balance: 0,
      tier: "free",
    });
    expect(
      decideGate({
        entitlement: snap({ tier: "premium", creditBalance: 2, monthlyAllowance: 300 }),
        action: "coach",
        hasMedia: true,
      }),
    ).toEqual({ kind: "deny_insufficient", cost: 3, balance: 2, tier: "premium" });
    /* PIN CHANGED (M-214): vitalis/tts below Plus never reach the
       balance check — they are refused as a tier feature first (see
       the Plus gate block below), so their insufficient cases now
       run on a Plus snapshot. */
    expect(
      decideGate({
        entitlement: snap({ tier: "premium_plus", creditBalance: 1, monthlyAllowance: 800 }),
        action: "vitalis",
        hasMedia: false,
      }),
    ).toEqual({
      kind: "deny_insufficient",
      cost: 2,
      balance: 1,
      tier: "premium_plus",
    });
    expect(
      decideGate({
        entitlement: snap({ tier: "premium_plus", creditBalance: 0, monthlyAllowance: 800 }),
        action: "tts",
        hasMedia: false,
      }).kind,
    ).toBe("deny_insufficient");
  });

  it("balance at or above the cost → allow with that exact cost", () => {
    expect(decideGate({ entitlement: snap({ creditBalance: 1 }), action: "coach", hasMedia: false })).toEqual({
      kind: "allow",
      cost: 1,
      reason: "coach_message",
    });
    expect(
      decideGate({
        entitlement: snap({ tier: "premium", creditBalance: 3, monthlyAllowance: 300 }),
        action: "coach",
        hasMedia: true,
      }),
    ).toEqual({ kind: "allow", cost: 3, reason: "coach_photo" });
    /* PIN CHANGED (M-214): a free snapshot no longer reaches this
       line for vitalis — the Plus gate refuses it first. The allow
       case now runs on the tier that carries the feature. */
    expect(
      decideGate({
        entitlement: snap({ tier: "premium_plus", creditBalance: 2, monthlyAllowance: 800 }),
        action: "vitalis",
        hasMedia: false,
      }),
    ).toEqual({
      kind: "allow",
      cost: 2,
      reason: "vitalis_message",
    });
    expect(
      decideGate({
        entitlement: snap({ tier: "premium_plus", creditBalance: 800, monthlyAllowance: 800 }),
        action: "coach",
        hasMedia: true,
      }).kind,
    ).toBe("allow");
  });
});

describe("decideGate — the Vitalis Plus gate (M-214)", () => {
  it("vitalis is refused below premium_plus, balance irrelevant", () => {
    for (const tier of ["free", "premium"] as const) {
      for (const creditBalance of [0, 20, 300]) {
        expect(
          decideGate({
            entitlement: snap({ tier, creditBalance, monthlyAllowance: tier === "free" ? 20 : 300 }),
            action: "vitalis",
            hasMedia: false,
          }),
        ).toEqual({ kind: "deny_premium", feature: "vitalis", tier });
      }
    }
  });

  it("tts (Vitalis's voice) is refused below premium_plus too", () => {
    for (const tier of ["free", "premium"] as const) {
      expect(
        decideGate({
          entitlement: snap({ tier, creditBalance: 300, monthlyAllowance: 300 }),
          action: "tts",
          hasMedia: false,
        }),
      ).toEqual({ kind: "deny_premium", feature: "vitalis", tier });
    }
  });

  it("premium_plus passes the tier gate and meets only the balance check", () => {
    expect(
      decideGate({
        entitlement: snap({ tier: "premium_plus", creditBalance: 800, monthlyAllowance: 800 }),
        action: "vitalis",
        hasMedia: false,
      }),
    ).toEqual({ kind: "allow", cost: 2, reason: "vitalis_message" });
    expect(
      decideGate({
        entitlement: snap({ tier: "premium_plus", creditBalance: 1, monthlyAllowance: 800 }),
        action: "tts",
        hasMedia: false,
      }),
    ).toEqual({ kind: "allow", cost: 1, reason: "tts_request" });
  });

  it("coach chat and coach photo are NOT Plus-gated — Premium keeps them", () => {
    expect(
      decideGate({
        entitlement: snap({ tier: "premium", creditBalance: 300, monthlyAllowance: 300 }),
        action: "coach",
        hasMedia: false,
      }).kind,
    ).toBe("allow");
    expect(
      decideGate({
        entitlement: snap({ tier: "premium", creditBalance: 300, monthlyAllowance: 300 }),
        action: "coach",
        hasMedia: true,
      }).kind,
    ).toBe("allow");
  });

  it("the vitalis refusal is the 402 premium_required the client already renders", () => {
    const decision = decideGate({
      entitlement: snap({ tier: "premium", creditBalance: 300, monthlyAllowance: 300 }),
      action: "vitalis",
      hasMedia: false,
    });
    expect(gateErrorStatus(decision)).toBe(402);
    expect(gateErrorBody(decision, "req-v")).toEqual({
      error: "premium_required",
      feature: "vitalis",
      tier: "premium",
      requestId: "req-v",
    });
  });
});

describe("gateErrorBody — the 402 the client renders as an upgrade prompt", () => {
  it("insufficient carries error/needed/balance/tier/requestId", () => {
    const decision = decideGate({ entitlement: snap({ creditBalance: 0 }), action: "coach", hasMedia: false });
    expect(gateErrorBody(decision, "req-1")).toEqual({
      error: "insufficient_credits",
      needed: 1,
      balance: 0,
      tier: "free",
      requestId: "req-1",
    });
  });

  it("premium refusal names the feature", () => {
    const decision = decideGate({ entitlement: snap(), action: "coach", hasMedia: true });
    expect(gateErrorBody(decision, "req-2")).toEqual({
      error: "premium_required",
      feature: "food_photo_analysis",
      tier: "free",
      requestId: "req-2",
    });
  });

  it("allows produce no error body", () => {
    expect(gateErrorBody({ kind: "allow", cost: 1, reason: "coach_message" }, "r")).toBeNull();
    expect(gateErrorBody({ kind: "allow_uncharged" }, "r")).toBeNull();
  });

  it("billing unavailable carries the honest error shape, no invented numbers", () => {
    expect(gateErrorBody({ kind: "deny_unavailable" }, "req-3")).toEqual({
      error: "billing_unavailable",
      requestId: "req-3",
    });
  });

  it("statuses: entitlement denials are 402, an unanswered RPC is a retryable 503", () => {
    expect(gateErrorStatus({ kind: "deny_insufficient", cost: 1, balance: 0, tier: "free" })).toBe(402);
    expect(gateErrorStatus({ kind: "deny_premium", feature: "food_photo_analysis", tier: "free" })).toBe(402);
    expect(gateErrorStatus({ kind: "deny_unavailable" })).toBe(503);
    expect(gateErrorStatus({ kind: "allow", cost: 1, reason: "coach_message" })).toBeNull();
    expect(gateErrorStatus({ kind: "allow_uncharged" })).toBeNull();
  });
});

describe("parseEntitlementRows (server copy)", () => {
  it("parses a row; unknown tier reads free; malformed reads null", () => {
    expect(
      parseEntitlementRows([
        { tier: "premium", status: "active", credit_balance: 42, monthly_allowance: 300, current_period_end: null },
      ]),
    ).toEqual({
      tier: "premium",
      status: "active",
      creditBalance: 42,
      monthlyAllowance: 300,
      currentPeriodEnd: null,
    });
    expect(
      parseEntitlementRows([{ tier: "gold", credit_balance: 5 }])?.tier,
    ).toBe("free");
    expect(parseEntitlementRows([])).toBeNull();
    expect(parseEntitlementRows([{ status: "active" }])).toBeNull();
    expect(parseEntitlementRows(null)).toBeNull();
  });
});
