/**
 * The Money System's plan model — the single client-side source for
 * tiers, prices, AI credit allowances and the feature matrix.
 *
 * The numbers are the owner's, agreed 2026-11-10 and raised 2026-11-12:
 * Premium ₹599/mo or ₹3,999/yr in India (≈ $9.99 / $59.99 outside),
 * Premium Plus ₹999/mo or ₹7,999/yr ($14.99 / $89.99). AI credits are a
 * monthly allowance per tier — free 20 (a real taste, not a demo),
 * premium 300, premium plus 800. Credits out → AI pauses; everything
 * else in Bloom keeps working. Top-ups are credit packs, never a
 * silent bill.
 *
 * Two mirrors exist by design and are pinned equal by tests: the SQL
 * `billing_tier_allowance()` in the billing migration, and
 * TIER_ALLOWANCES in supabase/functions/coach/billing-core.ts. Prices
 * live ONLY here (the server never needs them — the webhook trusts the
 * tier metadata the checkout created, never a client-sent amount).
 */

export type PlanTier = "free" | "premium" | "premium_plus";
export type BillingPeriod = "monthly" | "yearly";
export type PriceRegion = "IN" | "INTL";
export type Currency = "INR" | "USD";

export interface PlanPrice {
  amount: number;
  currency: Currency;
}

export interface PlanDetail {
  tier: PlanTier;
  name: string;
  tagline: string;
  /** AI credits granted each month on this tier. */
  monthlyCredits: number;
  /** Active-habit ceiling; null means unlimited. */
  habitLimit: number | null;
  prices: Record<PriceRegion, Record<BillingPeriod, PlanPrice>>;
}

const INR = (amount: number): PlanPrice => ({ amount, currency: "INR" });
const USD = (amount: number): PlanPrice => ({ amount, currency: "USD" });

export const PLANS: Record<PlanTier, PlanDetail> = {
  free: {
    tier: "free",
    name: "Free",
    tagline: "The everyday Bloom — trackers, habits, mood and a taste of the Coach.",
    monthlyCredits: 20,
    habitLimit: 5,
    prices: {
      IN: { monthly: INR(0), yearly: INR(0) },
      INTL: { monthly: USD(0), yearly: USD(0) },
    },
  },
  premium: {
    tier: "premium",
    name: "Premium",
    tagline: "The full intelligence — Coach, Vitalis, adaptive plans and Nutrition.",
    monthlyCredits: 300,
    habitLimit: null,
    prices: {
      IN: { monthly: INR(599), yearly: INR(3999) },
      INTL: { monthly: USD(9.99), yearly: USD(59.99) },
    },
  },
  premium_plus: {
    tier: "premium_plus",
    name: "Premium Plus",
    tagline: "Premium with a deep AI allowance — for daily Vitalis conversations and photo-led logging.",
    monthlyCredits: 800,
    habitLimit: null,
    prices: {
      IN: { monthly: INR(999), yearly: INR(7999) },
      INTL: { monthly: USD(14.99), yearly: USD(89.99) },
    },
  },
};

export const TIER_ORDER: PlanTier[] = ["free", "premium", "premium_plus"];

/** The premium capabilities a tier either has or has not. Coach access
 *  itself is tiered separately (see COACH_ACCESS) because free includes
 *  a limited Coach, not none. */
export type PremiumFeature =
  | "unlimited_habits"
  | "food_photo_analysis"
  | "assessment_plan"
  | "nutrition"
  | "overview_intelligence"
  | "advanced_analytics"
  | "stories_premium_templates";

export const TIER_FEATURES: Record<PlanTier, ReadonlySet<PremiumFeature>> = {
  free: new Set<PremiumFeature>(),
  premium: new Set<PremiumFeature>([
    "unlimited_habits",
    "food_photo_analysis",
    "assessment_plan",
    "nutrition",
    "overview_intelligence",
    "advanced_analytics",
    "stories_premium_templates",
  ]),
  premium_plus: new Set<PremiumFeature>([
    "unlimited_habits",
    "food_photo_analysis",
    "assessment_plan",
    "nutrition",
    "overview_intelligence",
    "advanced_analytics",
    "stories_premium_templates",
  ]),
};

/** Free Coach is real but bounded — by the credit allowance and by the
 *  absence of photo analysis. Paid tiers are the full Coach. */
export const COACH_ACCESS: Record<PlanTier, "limited" | "full"> = {
  free: "limited",
  premium: "full",
  premium_plus: "full",
};

export function isPlanTier(value: unknown): value is PlanTier {
  return value === "free" || value === "premium" || value === "premium_plus";
}

/** Unknown tiers read as free — the safe direction for every gate. */
export function asPlanTier(value: unknown): PlanTier {
  return isPlanTier(value) ? value : "free";
}

export function canUse(tier: PlanTier, feature: PremiumFeature): boolean {
  return TIER_FEATURES[tier].has(feature);
}

export function habitLimitFor(tier: PlanTier): number | null {
  return PLANS[tier].habitLimit;
}

/** True when creating one more active habit would cross the tier's
 *  ceiling. Unlimited tiers never reach it. */
export function habitLimitReached(tier: PlanTier, activeHabits: number): boolean {
  const limit = habitLimitFor(tier);
  return limit !== null && activeHabits >= limit;
}

export function monthlyCreditsFor(tier: PlanTier): number {
  return PLANS[tier].monthlyCredits;
}

export function priceFor(tier: PlanTier, period: BillingPeriod, region: PriceRegion): PlanPrice {
  return PLANS[tier].prices[region][period];
}

/** "₹599", "₹3,999", "$9.99" — whole rupees group Indian-style by
 *  thousands; dollars keep their cents. */
export function formatPrice(price: PlanPrice): string {
  if (price.currency === "INR") {
    return `₹${price.amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  }
  return `$${price.amount.toFixed(2)}`;
}

/** The per-month figure a yearly price works out to, for honest
 *  comparisons on the pricing surface ("₹333/mo on yearly"). */
export function monthlyEquivalent(tier: PlanTier, region: PriceRegion): PlanPrice {
  const yearly = priceFor(tier, "yearly", region);
  return { amount: Math.round((yearly.amount / 12) * 100) / 100, currency: yearly.currency };
}

/**
 * Which price region to show. India-first: an Indian timezone or an
 * en-IN locale means ₹ pricing; anything else gets the international
 * prices. When nothing can be detected (server render, tests), Bloom
 * defaults to India — its home market.
 */
export function detectPriceRegion(): PriceRegion {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz === "Asia/Kolkata" || tz === "Asia/Calcutta") return "IN";
    const lang = typeof navigator !== "undefined" ? navigator.language : "";
    if (lang && /-IN$/i.test(lang)) return "IN";
    if (tz) return "INTL";
  } catch {
    /* fall through to the India-first default */
  }
  return "IN";
}
