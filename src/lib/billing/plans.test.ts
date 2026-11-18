/**
 * The Money System's plan constants and feature matrix — the single
 * source the prices, the paywall and the gates all read. Pinned so a
 * price or allowance can never drift in one surface only.
 */
import { describe, expect, it } from "vitest";

import {
  COACH_ACCESS,
  PLANS,
  TIER_FEATURES,
  asPlanTier,
  canUse,
  detectPriceRegion,
  formatPrice,
  habitLimitFor,
  habitLimitReached,
  isPlanTier,
  monthlyCreditsFor,
  monthlyEquivalent,
  priceFor,
} from "./plans";

describe("plan prices (owner-agreed 2026-11-10/12)", () => {
  it("India: premium ₹599/mo · ₹3,999/yr, plus ₹999/mo · ₹7,999/yr", () => {
    expect(priceFor("premium", "monthly", "IN")).toEqual({ amount: 599, currency: "INR" });
    expect(priceFor("premium", "yearly", "IN")).toEqual({ amount: 3999, currency: "INR" });
    expect(priceFor("premium_plus", "monthly", "IN")).toEqual({ amount: 999, currency: "INR" });
    expect(priceFor("premium_plus", "yearly", "IN")).toEqual({ amount: 7999, currency: "INR" });
    expect(priceFor("free", "monthly", "IN").amount).toBe(0);
  });

  it("International: premium $9.99/$59.99, plus $14.99/$89.99", () => {
    expect(priceFor("premium", "monthly", "INTL")).toEqual({ amount: 9.99, currency: "USD" });
    expect(priceFor("premium", "yearly", "INTL")).toEqual({ amount: 59.99, currency: "USD" });
    expect(priceFor("premium_plus", "monthly", "INTL")).toEqual({ amount: 14.99, currency: "USD" });
    expect(priceFor("premium_plus", "yearly", "INTL")).toEqual({ amount: 89.99, currency: "USD" });
  });

  it("yearly undercuts twelve monthly payments on every paid tier", () => {
    for (const tier of ["premium", "premium_plus"] as const) {
      for (const region of ["IN", "INTL"] as const) {
        expect(priceFor(tier, "yearly", region).amount).toBeLessThan(
          priceFor(tier, "monthly", region).amount * 12,
        );
      }
    }
  });

  it("formats ₹ with Indian grouping and $ with two decimals", () => {
    expect(formatPrice(priceFor("premium", "yearly", "IN"))).toBe("₹3,999");
    expect(formatPrice(priceFor("premium", "monthly", "IN"))).toBe("₹599");
    expect(formatPrice(priceFor("premium", "monthly", "INTL"))).toBe("$9.99");
    expect(formatPrice(priceFor("free", "monthly", "IN"))).toBe("₹0");
  });

  it("monthly equivalent of a yearly price is the honest twelfth", () => {
    expect(monthlyEquivalent("premium", "IN")).toEqual({ amount: 333.25, currency: "INR" });
    expect(formatPrice(monthlyEquivalent("premium", "IN"))).toBe("₹333");
    expect(formatPrice(monthlyEquivalent("premium", "INTL"))).toBe("$5.00");
  });
});

describe("AI credit allowances", () => {
  it("free 20 · premium 300 · premium_plus 800 per month", () => {
    expect(monthlyCreditsFor("free")).toBe(20);
    expect(monthlyCreditsFor("premium")).toBe(300);
    expect(monthlyCreditsFor("premium_plus")).toBe(800);
    expect(PLANS.free.monthlyCredits).toBe(20);
  });
});

describe("feature matrix (agreed model)", () => {
  it("free gets none of the premium features", () => {
    for (const feature of TIER_FEATURES.premium) {
      expect(canUse("free", feature)).toBe(false);
    }
    expect(TIER_FEATURES.free.size).toBe(0);
  });

  it("premium and plus carry every premium feature", () => {
    for (const feature of [
      "unlimited_habits",
      "food_photo_analysis",
      "assessment_plan",
      "nutrition",
      "overview_intelligence",
      "advanced_analytics",
      "stories_premium_templates",
    ] as const) {
      expect(canUse("premium", feature)).toBe(true);
      expect(canUse("premium_plus", feature)).toBe(true);
    }
  });

  it("coach access: free is limited, paid is full", () => {
    expect(COACH_ACCESS.free).toBe("limited");
    expect(COACH_ACCESS.premium).toBe("full");
    expect(COACH_ACCESS.premium_plus).toBe("full");
  });
});

describe("habit limit", () => {
  it("free caps at 5 active habits; paid tiers are unlimited", () => {
    expect(habitLimitFor("free")).toBe(5);
    expect(habitLimitFor("premium")).toBeNull();
    expect(habitLimitFor("premium_plus")).toBeNull();
    expect(habitLimitReached("free", 4)).toBe(false);
    expect(habitLimitReached("free", 5)).toBe(true);
    expect(habitLimitReached("free", 9)).toBe(true);
    expect(habitLimitReached("premium", 500)).toBe(false);
  });
});

describe("tier coercion + region detection", () => {
  it("unknown tiers fall back to free, never to a paid tier", () => {
    expect(isPlanTier("premium")).toBe(true);
    expect(isPlanTier("gold")).toBe(false);
    expect(asPlanTier("gold")).toBe("free");
    expect(asPlanTier(null)).toBe("free");
    expect(asPlanTier("premium_plus")).toBe("premium_plus");
  });

  it("region detection always lands on a real region", () => {
    /* The detector reads the runtime's own Intl timezone + locale,
       which the test environment cannot fix — what is pinned is
       that it never returns anything outside the two regions. */
    expect(["IN", "INTL"]).toContain(detectPriceRegion());
  });
});
