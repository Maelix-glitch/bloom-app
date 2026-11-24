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
 * M-214 (owner decisions, 2026-11-22): the yearly India prices rose —
 * Premium ₹4,999/yr, Premium Plus ₹9,999/yr (monthly and international
 * unchanged; anyone who already paid keeps the price they paid) — and
 * the tiers were split for real. Premium is now the essentials:
 * unlimited habits, the Coach, food-photo analysis, the Assessment
 * with a standard plan and grocery, Trackers, Mood, basic Stories.
 * Premium Plus carries the intelligence layer on top: Vitalis (the
 * orb AI) with daily voice, adaptive plans, the Metabolic Twin and
 * Overview intelligence, advanced analytics and reports, photo-led
 * logging and the premium Stories templates. The feature matrix
 * below is that split, and the gates read it — the Vitalis gate is
 * enforced in the coach edge function itself.
 *
 * Two mirrors exist by design and are pinned equal by tests: the SQL
 * `billing_tier_allowance()` in the billing migration, and
 * TIER_ALLOWANCES in supabase/functions/coach/billing-core.ts. Prices
 * live here and in ONE server mirror — PLAN_PRICES_PAISE in
 * supabase/functions/billing/billing-core.ts, which prices the Orders
 * rail (pinned equal by billingOrders.test.ts). Nothing else may
 * quote a price.
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
    tagline: "The everyday Bloom, trackers, habits, mood and a taste of the Coach.",
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
    tagline: "The essentials, unlimited, the Coach, your plan, Nutrition and your full record.",
    monthlyCredits: 300,
    habitLimit: null,
    prices: {
      IN: { monthly: INR(599), yearly: INR(4999) },
      INTL: { monthly: USD(9.99), yearly: USD(59.99) },
    },
  },
  premium_plus: {
    tier: "premium_plus",
    name: "Premium Plus",
    tagline: "The intelligence layer. Vitalis, adaptive plans and the Metabolic Twin, with room to use them daily.",
    monthlyCredits: 800,
    habitLimit: null,
    prices: {
      IN: { monthly: INR(999), yearly: INR(9999) },
      INTL: { monthly: USD(14.99), yearly: USD(89.99) },
    },
  },
};

export const TIER_ORDER: PlanTier[] = ["free", "premium", "premium_plus"];

/** The premium capabilities a tier either has or has not. Coach access
 *  itself is tiered separately (see COACH_ACCESS) because free includes
 *  a limited Coach, not none.
 *
 *  M-214 split: Premium carries the essentials; the intelligence
 *  layer — vitalis, adaptive_plans, metabolic_twin,
 *  overview_intelligence, advanced_analytics, photo_led_logging,
 *  stories_premium_templates and priority_features (named in the
 *  matrix by M-216, where the comparison ledger needed it as data,
 *  not words) — is Premium Plus only. Before M-214
 *  the two paid sets were identical, which is what the owner ended. */
export type PremiumFeature =
  | "unlimited_habits"
  | "food_photo_analysis"
  | "assessment_plan"
  | "nutrition"
  | "vitalis"
  | "adaptive_plans"
  | "metabolic_twin"
  | "overview_intelligence"
  | "advanced_analytics"
  | "photo_led_logging"
  | "stories_premium_templates"
  | "priority_features";

export const TIER_FEATURES: Record<PlanTier, ReadonlySet<PremiumFeature>> = {
  free: new Set<PremiumFeature>(),
  premium: new Set<PremiumFeature>([
    "unlimited_habits",
    "food_photo_analysis",
    "assessment_plan",
    "nutrition",
  ]),
  premium_plus: new Set<PremiumFeature>([
    "unlimited_habits",
    "food_photo_analysis",
    "assessment_plan",
    "nutrition",
    "vitalis",
    "adaptive_plans",
    "metabolic_twin",
    "overview_intelligence",
    "advanced_analytics",
    "photo_led_logging",
    "stories_premium_templates",
    "priority_features",
  ]),
};

/** The paywall's own words for each paid tier — the bullets the
 *  Membership sheet renders, kept here with the plan definitions so
 *  the offer can never drift from the matrix above. Every line is
 *  something the tier actually carries under TIER_FEATURES. */
export const PAYWALL_BULLETS: Record<Exclude<PlanTier, "free">, string[]> = {
  premium: [
    "Unlimited habits",
    "Full Coach, 300 AI credits a month",
    "Food-photo analysis",
    "Assessment + your nutrition plan and grocery list",
    "Trackers, Mood and your full daily record",
    "Basic Stories templates",
  ],
  premium_plus: [
    "Everything in Premium",
    "Vitalis, your nutrition AI, with daily voice conversations",
    "800 AI credits a month (Premium has 300)",
    "Adaptive plans that learn from your days",
    "Metabolic Twin and Overview intelligence",
    "Advanced analytics and reports",
    "Photo-led logging · Stories premium templates",
  ],
};

/** The comparison ledger — design G's rows (M-216, owner pick
 *  2026-11-22). One row per compared feature, in display order, and
 *  NO hand-kept tick table: each row names the authority its tick
 *  reads — a TIER_FEATURES feature, the full-Coach access level, or
 *  an always-included core surface (Trackers, Mood and the basic
 *  Stories templates are part of every tier, Free included, so both
 *  paid columns tick honestly). comparisonHas resolves a row for a
 *  tier from that authority alone, so the ledger can never claim a
 *  Premium tick for a Plus-only feature. */
export type ComparisonAccess =
  | { kind: "feature"; feature: PremiumFeature }
  | { kind: "coach" }
  | { kind: "always" };

export interface PaywallComparisonRow {
  label: string;
  access: ComparisonAccess;
}

const featureRow = (label: string, feature: PremiumFeature): PaywallComparisonRow => ({
  label,
  access: { kind: "feature", feature },
});

export const PAYWALL_COMPARISON: PaywallComparisonRow[] = [
  featureRow("Unlimited habits", "unlimited_habits"),
  { label: "Coach chat", access: { kind: "coach" } },
  featureRow("Food-photo analysis", "food_photo_analysis"),
  featureRow("Assessment + standard plan", "assessment_plan"),
  featureRow("Grocery list", "nutrition"),
  { label: "Trackers & mood", access: { kind: "always" } },
  { label: "Basic Stories templates", access: { kind: "always" } },
  featureRow("Vitalis AI + daily voice", "vitalis"),
  featureRow("Plans that adapt and learn", "adaptive_plans"),
  featureRow("Metabolic Twin", "metabolic_twin"),
  featureRow("Advanced analytics & reports", "advanced_analytics"),
  featureRow("Photo-led logging", "photo_led_logging"),
  featureRow("Stories premium templates", "stories_premium_templates"),
  featureRow("Priority features", "priority_features"),
];

/** Whether a comparison row ticks for a tier — resolved from the
 *  row's authority (the feature matrix, Coach access, or the
 *  always-included core), never from a per-row boolean. */
export function comparisonHas(row: PaywallComparisonRow, tier: PlanTier): boolean {
  switch (row.access.kind) {
    case "feature":
      return canUse(tier, row.access.feature);
    case "coach":
      return COACH_ACCESS[tier] === "full";
    case "always":
      return true;
  }
}

/** What uses credits — the weighted truth (M-215), in one line set.
 *  Credits are weighted by what an action costs to serve; these are
 *  the numbers the coach edge function's gate actually charges
 *  (CREDIT_COSTS in supabase/functions/coach/billing-core.ts), in the
 *  words the credit surfaces show. One home so the Membership card
 *  and the paywall can never quote different weights. */
export const CREDIT_WEIGHTS_LINE =
  "What uses credits: a Coach message 1 · a food photo 5 · a Vitalis message 2 · a Vitalis plan session 10 · voice 1 per 500 characters spoken.";

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

/** "₹599", "₹4,999", "$9.99" — whole rupees group Indian-style by
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
