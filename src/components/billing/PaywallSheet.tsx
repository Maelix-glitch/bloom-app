/**
 * The one upgrade prompt for the whole app.
 *
 * PaywallHost mounts once at the app root and opens this sheet when
 * any surface calls requestPaywall(context) — Coach out of credits,
 * the free habit limit, the plan composer, the Assessment. The sheet
 * is specific first (what was reached, what your plan looks like
 * right now) and commercial second: two plan cards with the real
 * prices from lib/billing/plans, and a checkout button that tells
 * the truth about its own state — until Bloom's payment account is
 * connected it says payments open soon, because that is what is
 * true. Nothing here can grant Premium; only the provider's
 * verified webhook can.
 */

import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";

import { BloomIcon } from "@/components/icons/BloomIcon";
import { BloomSheet } from "@/components/ui/bloom-sheet";
import { useEntitlement } from "@/hooks/useEntitlement";
import { startCheckout } from "@/lib/billing/checkout";
import {
  PAYWALL_HEADLINES,
  onPaywallRequest,
  type PaywallContext,
} from "@/lib/billing/paywall";
import {
  PLANS,
  TIER_ORDER,
  detectPriceRegion,
  formatPrice,
  monthlyEquivalent,
  priceFor,
  type BillingPeriod,
  type PlanTier,
} from "@/lib/billing/plans";

import "@/styles/billing.css";

const FEATURE_BULLETS: Record<Exclude<PlanTier, "free">, string[]> = {
  premium: [
    "Unlimited habits",
    "Full Coach & Vitalis — 300 AI credits a month",
    "Food-photo analysis",
    "Assessment + adaptive plans that learn from your days",
    "Full Nutrition & Overview intelligence",
    "Advanced analytics · Stories premium templates",
  ],
  premium_plus: [
    "Everything in Premium",
    "800 AI credits a month",
    "Room for daily Vitalis voice conversations and photo-led logging",
  ],
};

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function PaywallHost() {
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState<PaywallContext>("generic");

  useEffect(
    () =>
      onPaywallRequest((next) => {
        setContext(next);
        setOpen(true);
      }),
    [],
  );

  return <PaywallSheet open={open} onClose={() => setOpen(false)} context={context} />;
}

export function PaywallSheet({
  open,
  onClose,
  context,
}: {
  open: boolean;
  onClose: () => void;
  context: PaywallContext;
}) {
  const entitlementState = useEntitlement();
  const [period, setPeriod] = useState<BillingPeriod>("yearly");
  const [busyTier, setBusyTier] = useState<PlanTier | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const region = useMemo(() => detectPriceRegion(), []);

  /* A fresh open starts clean — no stale checkout notice from the
     last time the sheet was up. */
  useEffect(() => {
    if (open) setNotice(null);
  }, [open, context]);

  const headline = PAYWALL_HEADLINES[context];
  const entitlement = entitlementState.kind === "ready" ? entitlementState.entitlement : null;
  const myTier: PlanTier = entitlement?.tier ?? "free";
  const myRank = TIER_ORDER.indexOf(myTier);

  const yearlySaving = useMemo(() => {
    const monthly = priceFor("premium", "monthly", region).amount;
    const yearly = priceFor("premium", "yearly", region).amount;
    if (monthly <= 0) return 0;
    return Math.max(0, Math.round((1 - yearly / (monthly * 12)) * 100));
  }, [region]);

  const go = async (tier: Exclude<PlanTier, "free">) => {
    setBusyTier(tier);
    setNotice(null);
    const result = await startCheckout(tier, period);
    setBusyTier(null);
    if (result.state === "ready" && result.shortUrl) {
      window.location.href = result.shortUrl;
      return;
    }
    if (result.state === "payments_not_configured") {
      setNotice(
        "Payments open soon — Bloom's payment account isn't connected yet, so checkout can't start today. Nothing has been charged. The moment it connects, this button goes straight to a secure checkout.",
      );
      return;
    }
    setNotice("Checkout couldn't start just now — nothing has been charged. Try again in a moment.");
  };

  return (
    <BloomSheet open={open} onClose={onClose} title="Bloom Premium" size="lg">
      {/* The family's visible way out, like the tracker and data sheets
          carry: Escape and the backdrop already dismissed this sheet,
          but nothing on screen said so. It only dismisses. The 44px
          sizing rides in billing.css (.bill-close) — the shared
          .bsheet-icon is 38px, under the touch-target floor. */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="bsheet-icon bill-close absolute right-4 top-4 z-10 sm:right-5"
      >
        <BloomIcon name="close" size={16} />
      </button>
      {/* The shell's own scroll region, like every other sheet: the panel
          itself is overflow-hidden with a 28px radius, so content rendered
          flush inside it is clipped by the rounded corners and can never
          scroll once it outgrows the panel cap. */}
      <div className="bsheet-scroll">
        <div className="bill-stack">
          <div>
            <p className="bill-eyebrow">Bloom Premium</p>
            <h3 className="bill-title">{headline.title}</h3>
            <p className="bill-body">{headline.body}</p>
          </div>

          {entitlement ? (
            <p className="bill-status" role="status">
              You're on <strong>{PLANS[entitlement.tier].name}</strong>
              {entitlement.tier === "free" ? (
                <>
                  {" "}
                  — {entitlement.creditBalance} of {entitlement.monthlyAllowance} AI credits left
                  this month.
                </>
              ) : (
                <>
                  {" "}
                  — {entitlement.creditBalance} AI credits left this month
                  {formatDate(entitlement.currentPeriodEnd)
                    ? ` · current period ends ${formatDate(entitlement.currentPeriodEnd)}`
                    : ""}
                  .
                </>
              )}
            </p>
          ) : null}

          <div className="bill-toggle-row">
            <div className="bill-toggle" role="group" aria-label="Billing period">
              <button
                type="button"
                aria-pressed={period === "monthly"}
                onClick={() => setPeriod("monthly")}
              >
                Monthly
              </button>
              <button
                type="button"
                aria-pressed={period === "yearly"}
                onClick={() => setPeriod("yearly")}
              >
                Yearly{yearlySaving > 0 ? <span className="bill-save"> · save {yearlySaving}%</span> : null}
              </button>
            </div>
          </div>

          <div className="bill-cards">
            {(["premium", "premium_plus"] as const).map((tier) => {
              const plan = PLANS[tier];
              const price = priceFor(tier, period, region);
              const equivalent = monthlyEquivalent(tier, region);
              const rank = TIER_ORDER.indexOf(tier);
              const isMine = rank === myRank && entitlement !== null;
              const included = rank < myRank;
              /* The gold border belongs to the member's own plan — a
                 Premium Plus member's Premium card used to out-glow the
                 Plus card they actually own, because the featured class
                 was hard-coded to Premium. A visitor with no paid plan
                 still meets Premium featured, as the entry plan. */
              const featured = isMine || (myTier === "free" && tier === "premium");
              return (
                <article
                  key={tier}
                  className={`bill-card${featured ? " bill-card--featured" : ""}`}
                >
                  <p className="bill-card-name">{plan.name}</p>
                  <p className="bill-price">
                    {formatPrice(price)}
                    <small> / {period === "monthly" ? "month" : "year"}</small>
                  </p>
                  {period === "yearly" ? (
                    <p className="bill-equivalent">Works out to {formatPrice(equivalent)} a month.</p>
                  ) : null}
                  <ul className="bill-features">
                    {FEATURE_BULLETS[tier].map((f) => (
                      <li key={f}>
                        <Check aria-hidden /> {f}
                      </li>
                    ))}
                  </ul>
                  {/* A plan state is a status, not an action: the owned
                      and included cards get a non-interactive badge, so
                      nothing on the card pretends to be a button that
                      does nothing. Only a real next step — go / upgrade,
                      including the tap that surfaces the honest
                      payments-open-soon notice — stays a button. */}
                  {isMine || included ? (
                    <p className="bill-card-status">
                      {isMine ? "Your current plan" : "Included in your plan"}
                    </p>
                  ) : (
                    <button
                      type="button"
                      className="bill-btn bill-btn-gold"
                      disabled={busyTier !== null}
                      onClick={() => void go(tier)}
                    >
                      {busyTier === tier
                        ? "Opening checkout…"
                        : tier === "premium"
                          ? "Go Premium"
                          : "Upgrade to Plus"}
                    </button>
                  )}
                </article>
              );
            })}
          </div>

          {notice ? (
            <p className="bill-note" role="status">
              {notice}
            </p>
          ) : null}

          <p className="bill-foot">
            Free keeps working either way — trackers, habits, mood and your records are never held
            hostage. AI credits refill monthly; when they run out, the AI pauses and everything
            else carries on.
          </p>
        </div>
      </div>
    </BloomSheet>
  );
}
