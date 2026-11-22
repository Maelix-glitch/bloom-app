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
  TTS_CHARS_PER_CREDIT,
  costFor,
  decideGate,
  gateErrorBody,
  gateErrorStatus,
  parseEntitlementRows,
  resolveVitalisCharge,
  ttsCostForChars,
  vitalisKindFor,
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

describe("weighted credit costs (M-215)", () => {
  /* PIN CHANGED (M-215, owner decision 2026-11-22): costs are weighted
     by what an action costs to serve — they were flat-ish before
     (coach photo 3, a Vitalis message 2 with deliberation folded in,
     one flat credit per TTS request). Now: coach message 1, coach
     photo 5, Vitalis chat 2, a Vitalis plan deliberation its own 10,
     a dish-swap proposal 3, and speech 1 per 500 characters. */
  it("coach message 1 · coach photo 5 · vitalis chat 2 · vitalis plan 10 · tts by length", () => {
    expect(costFor("coach")).toEqual({ cost: 1, reason: "coach_message" });
    expect(costFor("coach", { hasMedia: true })).toEqual({ cost: 5, reason: "coach_photo" });
    expect(costFor("vitalis")).toEqual({ cost: 2, reason: "vitalis_message" });
    expect(costFor("vitalis", { hasMedia: true })).toEqual({ cost: 2, reason: "vitalis_message" });
    expect(costFor("vitalis", { vitalisKind: "plan" })).toEqual({ cost: 10, reason: "vitalis_plan" });
    expect(costFor("tts")).toEqual({ cost: 1, reason: "tts_request" });
    expect(CREDIT_COSTS).toEqual({
      coach_message: 1,
      coach_photo: 5,
      vitalis_message: 2,
      vitalis_plan: 10,
      vitalis_dish_swap: 3,
      tts_request: 1,
    });
  });

  it("tts cost is 1 credit per 500 characters of spoken text, minimum 1, rounded up", () => {
    expect(TTS_CHARS_PER_CREDIT).toBe(500);
    expect(ttsCostForChars(0)).toBe(1);
    expect(ttsCostForChars(1)).toBe(1);
    expect(ttsCostForChars(499)).toBe(1);
    expect(ttsCostForChars(500)).toBe(1);
    expect(ttsCostForChars(501)).toBe(2);
    expect(ttsCostForChars(1000)).toBe(2);
    expect(ttsCostForChars(1001)).toBe(3);
    expect(costFor("tts", { ttsChars: 501 })).toEqual({ cost: 2, reason: "tts_request" });
    expect(costFor("tts", { ttsChars: 1000 })).toEqual({ cost: 2, reason: "tts_request" });
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
    /* PIN CHANGED (M-215): a photo costs 5 now, not 3. */
    expect(
      decideGate({
        entitlement: snap({ tier: "premium", creditBalance: 2, monthlyAllowance: 300 }),
        action: "coach",
        hasMedia: true,
      }),
    ).toEqual({ kind: "deny_insufficient", cost: 5, balance: 2, tier: "premium" });
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
    /* PIN CHANGED (M-215): a photo costs 5 now, not 3 — balance 5 is
       the exact-cover case. */
    expect(
      decideGate({
        entitlement: snap({ tier: "premium", creditBalance: 5, monthlyAllowance: 300 }),
        action: "coach",
        hasMedia: true,
      }),
    ).toEqual({ kind: "allow", cost: 5, reason: "coach_photo" });
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

describe("decideGate — weighted costs (M-215)", () => {
  const plus = (creditBalance: number) =>
    snap({ tier: "premium_plus", creditBalance, monthlyAllowance: 800 });

  it("a plan deliberation needs 10: balance 9 refuses with the numbers, 10 allows", () => {
    expect(
      decideGate({ entitlement: plus(9), action: "vitalis", hasMedia: false, vitalisKind: "plan" }),
    ).toEqual({ kind: "deny_insufficient", cost: 10, balance: 9, tier: "premium_plus" });
    expect(
      decideGate({ entitlement: plus(10), action: "vitalis", hasMedia: false, vitalisKind: "plan" }),
    ).toEqual({ kind: "allow", cost: 10, reason: "vitalis_plan" });
  });

  it("3 credits can chat with Vitalis but cannot run a plan session", () => {
    expect(
      decideGate({ entitlement: plus(3), action: "vitalis", hasMedia: false, vitalisKind: "chat" }),
    ).toEqual({ kind: "allow", cost: 2, reason: "vitalis_message" });
    expect(
      decideGate({ entitlement: plus(3), action: "vitalis", hasMedia: false, vitalisKind: "plan" })
        .kind,
    ).toBe("deny_insufficient");
  });

  it("the plan refusal body carries needed=10 and the balance, honestly", () => {
    const decision = decideGate({
      entitlement: plus(4),
      action: "vitalis",
      hasMedia: false,
      vitalisKind: "plan",
    });
    expect(gateErrorBody(decision, "req-plan")).toEqual({
      error: "insufficient_credits",
      needed: 10,
      balance: 4,
      tier: "premium_plus",
      requestId: "req-plan",
    });
    expect(gateErrorStatus(decision)).toBe(402);
  });

  it("tts is gated on the weighted cost of the text being spoken", () => {
    /* 500 chars = 1 credit: a balance of 1 exactly covers it. */
    expect(
      decideGate({ entitlement: plus(1), action: "tts", hasMedia: false, ttsChars: 500 }),
    ).toEqual({ kind: "allow", cost: 1, reason: "tts_request" });
    /* 501 chars = 2 credits: a balance of 1 refuses, 2 allows. */
    expect(
      decideGate({ entitlement: plus(1), action: "tts", hasMedia: false, ttsChars: 501 }),
    ).toEqual({ kind: "deny_insufficient", cost: 2, balance: 1, tier: "premium_plus" });
    expect(
      decideGate({ entitlement: plus(2), action: "tts", hasMedia: false, ttsChars: 501 }),
    ).toEqual({ kind: "allow", cost: 2, reason: "tts_request" });
  });

  it("a free member's 20 credits still buy real tries: 4 photos or 20 chats", () => {
    expect(
      decideGate({
        entitlement: snap({ tier: "premium", creditBalance: 20, monthlyAllowance: 300 }),
        action: "coach",
        hasMedia: true,
      }).kind,
    ).toBe("allow");
    expect(
      decideGate({ entitlement: snap({ creditBalance: 4 }), action: "coach", hasMedia: true }).kind,
    ).toBe("deny_premium");
  });
});

describe("vitalisKindFor — the deliberation classifier (M-215)", () => {
  it("mirrors handleVitalisChat's rule: a valid record AND (flag OR plan-like words)", () => {
    expect(vitalisKindFor({ recordValid: true, deliberateFlag: true, planLike: false })).toBe("plan");
    expect(vitalisKindFor({ recordValid: true, deliberateFlag: false, planLike: true })).toBe("plan");
    expect(vitalisKindFor({ recordValid: true, deliberateFlag: false, planLike: false })).toBe(
      "chat",
    );
    /* No usable record → the handler takes the fast path, so the gate
       must price a chat, never a deliberation that cannot happen. */
    expect(vitalisKindFor({ recordValid: false, deliberateFlag: true, planLike: true })).toBe(
      "chat",
    );
  });
});

describe("resolveVitalisCharge — what a finished Vitalis answer actually costs (M-215)", () => {
  const allowChat = decideGate({
    entitlement: snap({ tier: "premium_plus", creditBalance: 800, monthlyAllowance: 800 }),
    action: "vitalis",
    hasMedia: false,
  });

  it("a plain chat charges the gated chat cost", () => {
    expect(resolveVitalisCharge(allowChat, "chat")).toEqual({ cost: 2, reason: "vitalis_message" });
  });

  it("a dish-swap proposal out of a chat costs 3 in total, ledgered as its own action", () => {
    expect(resolveVitalisCharge(allowChat, "dish_swap")).toEqual({
      cost: 3,
      reason: "vitalis_dish_swap",
    });
  });

  it("a deliberated answer charges the plan session, whatever it proposed", () => {
    const allowPlan = decideGate({
      entitlement: snap({ tier: "premium_plus", creditBalance: 800, monthlyAllowance: 800 }),
      action: "vitalis",
      hasMedia: false,
      vitalisKind: "plan",
    });
    expect(resolveVitalisCharge(allowPlan, "plan")).toEqual({ cost: 10, reason: "vitalis_plan" });
    expect(resolveVitalisCharge(allowPlan, "dish_swap")).toEqual({
      cost: 10,
      reason: "vitalis_plan",
    });
  });

  it("denied and uncharged decisions never resolve to a charge", () => {
    expect(resolveVitalisCharge({ kind: "deny_insufficient", cost: 2, balance: 0, tier: "free" }, "chat")).toBeNull();
    expect(resolveVitalisCharge({ kind: "allow_uncharged" }, "plan")).toBeNull();
    expect(resolveVitalisCharge({ kind: "deny_premium", feature: "vitalis", tier: "free" }, "chat")).toBeNull();
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
