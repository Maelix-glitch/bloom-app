/**
 * The Money System's plan constants and feature matrix — the single
 * source the prices, the paywall and the gates all read. Pinned so a
 * price or allowance can never drift in one surface only.
 */
import { describe, expect, it } from "vitest";

import {
  COACH_ACCESS,
  PAYWALL_BULLETS,
  PAYWALL_COMPARISON,
  PLANS,
  TIER_FEATURES,
  asPlanTier,
  canUse,
  comparisonHas,
  detectPriceRegion,
  formatPrice,
  habitLimitFor,
  habitLimitReached,
  isPlanTier,
  monthlyCreditsFor,
  monthlyEquivalent,
  priceFor,
} from "./plans";

describe("plan prices (owner-agreed 2026-11-10/12; yearly raised M-214, 2026-11-22)", () => {
  it("India: premium ₹599/mo · ₹4,999/yr, plus ₹999/mo · ₹9,999/yr", () => {
    expect(priceFor("premium", "monthly", "IN")).toEqual({ amount: 599, currency: "INR" });
    expect(priceFor("premium", "yearly", "IN")).toEqual({ amount: 4999, currency: "INR" });
    expect(priceFor("premium_plus", "monthly", "IN")).toEqual({ amount: 999, currency: "INR" });
    expect(priceFor("premium_plus", "yearly", "IN")).toEqual({ amount: 9999, currency: "INR" });
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
    expect(formatPrice(priceFor("premium", "yearly", "IN"))).toBe("₹4,999");
    expect(formatPrice(priceFor("premium", "monthly", "IN"))).toBe("₹599");
    expect(formatPrice(priceFor("premium", "monthly", "INTL"))).toBe("$9.99");
    expect(formatPrice(priceFor("free", "monthly", "IN"))).toBe("₹0");
  });

  it("monthly equivalent of a yearly price is the honest twelfth", () => {
    expect(monthlyEquivalent("premium", "IN")).toEqual({ amount: 416.58, currency: "INR" });
    expect(formatPrice(monthlyEquivalent("premium", "IN"))).toBe("₹417");
    expect(formatPrice(monthlyEquivalent("premium_plus", "IN"))).toBe("₹833");
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

describe("feature matrix (M-214 split, 2026-11-22)", () => {
  it("free gets none of the premium features", () => {
    for (const feature of TIER_FEATURES.premium) {
      expect(canUse("free", feature)).toBe(false);
    }
    expect(TIER_FEATURES.free.size).toBe(0);
  });

  it("premium carries the essentials — and only the essentials", () => {
    for (const feature of [
      "unlimited_habits",
      "food_photo_analysis",
      "assessment_plan",
      "nutrition",
    ] as const) {
      expect(canUse("premium", feature)).toBe(true);
    }
    /* The intelligence layer is NOT Premium's any more (M-214). */
    for (const feature of [
      "vitalis",
      "adaptive_plans",
      "metabolic_twin",
      "overview_intelligence",
      "advanced_analytics",
      "photo_led_logging",
      "stories_premium_templates",
    ] as const) {
      expect(canUse("premium", feature)).toBe(false);
    }
  });

  it("premium plus carries the whole matrix", () => {
    for (const feature of TIER_FEATURES.premium_plus) {
      expect(canUse("premium_plus", feature)).toBe(true);
    }
    /* Plus is a strict superset of Premium — nothing Premium has is
       missing from Plus. */
    for (const feature of TIER_FEATURES.premium) {
      expect(canUse("premium_plus", feature)).toBe(true);
    }
  });

  it("the paywall bullets tell the same story as the matrix", () => {
    expect(PAYWALL_BULLETS.premium.length).toBeLessThanOrEqual(6);
    expect(PAYWALL_BULLETS.premium.join(" ")).not.toMatch(/Vitalis/);
    expect(PAYWALL_BULLETS.premium_plus[0]).toBe("Everything in Premium");
    expect(PAYWALL_BULLETS.premium_plus.join(" ")).toMatch(/Vitalis/);
  });

  it("coach access: free is limited, paid is full", () => {
    expect(COACH_ACCESS.free).toBe("limited");
    expect(COACH_ACCESS.premium).toBe("full");
    expect(COACH_ACCESS.premium_plus).toBe("full");
  });
});

describe("the comparison ledger (M-216, design G)", () => {
  /* The ledger the paywall renders — one row per compared feature,
     in display order. The words are the owner's M-214 split stated
     plainly; the tick/dash truth must come from the same matrix the
     gates read, never from a second hand-kept list. */
  const LABELS = [
    "Unlimited habits",
    "Coach chat",
    "Food-photo analysis",
    "Assessment + standard plan",
    "Grocery list",
    "Trackers & mood",
    "Basic Stories templates",
    "Vitalis AI + daily voice",
    "Plans that adapt and learn",
    "Metabolic Twin",
    "Advanced analytics & reports",
    "Photo-led logging",
    "Stories premium templates",
    "Priority features",
  ];
  const PLUS_ONLY = [
    "Vitalis AI + daily voice",
    "Plans that adapt and learn",
    "Metabolic Twin",
    "Advanced analytics & reports",
    "Photo-led logging",
    "Stories premium templates",
    "Priority features",
  ];

  it("carries exactly the compared features, in order", () => {
    expect(PAYWALL_COMPARISON.map((r) => r.label)).toEqual(LABELS);
  });

  it("feature rows read the same TIER_FEATURES matrix the gates read", () => {
    for (const row of PAYWALL_COMPARISON) {
      if (row.access.kind !== "feature") continue;
      for (const tier of ["premium", "premium_plus"] as const) {
        expect(comparisonHas(row, tier), `${row.label} / ${tier}`).toBe(
          canUse(tier, row.access.feature),
        );
      }
    }
  });

  it("Premium has the shared rows and none of the Plus-only rows; Plus has every row", () => {
    for (const row of PAYWALL_COMPARISON) {
      expect(comparisonHas(row, "premium_plus"), `${row.label} / plus`).toBe(true);
      expect(comparisonHas(row, "premium"), `${row.label} / premium`).toBe(
        !PLUS_ONLY.includes(row.label),
      );
    }
  });

  it("priority features are a Plus-only matrix feature, not a ledger invention", () => {
    expect(canUse("premium", "priority_features")).toBe(false);
    expect(canUse("premium_plus", "priority_features")).toBe(true);
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
