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
import { useNavigate } from "@tanstack/react-router";
import { Check } from "lucide-react";

import { BloomIcon } from "@/components/icons/BloomIcon";
import { BloomSheet } from "@/components/ui/bloom-sheet";
import { useEntitlement } from "@/hooks/useEntitlement";
import { createOrder, payWithRazorpay, verifyPayment } from "@/lib/billing/checkout";
import { invalidateEntitlement } from "@/lib/billing/entitlement";
import {
  PAYWALL_HEADLINES,
  onPaywallRequest,
  type PaywallContext,
} from "@/lib/billing/paywall";
import {
  PAYWALL_BULLETS,
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

/* The cards' bullets are PAYWALL_BULLETS in lib/billing/plans —
   M-214 moved them there so the offer renders from the same module
   that defines the tiers and their feature matrix. (M-205's F-37
   note stands: the two cards carry comparable length, so neither
   reads as the lesser plan — under the M-214 split the Plus card
   lists the intelligence layer it alone carries.) */

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
  const navigate = useNavigate();
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

  /* M-214: the two tiers no longer save the same share on yearly
     (India: Premium 30%, Plus 17% — the deeper allowance carries a
     shallower discount). One number on the toggle must not claim
     Plus saves what only Premium does, so the toggle states the
     best saving, labelled "up to"; each card's own "works out to"
     line carries its tier's real figure. */
  const yearlySaving = useMemo(() => {
    const savingFor = (tier: Exclude<PlanTier, "free">) => {
      const monthly = priceFor(tier, "monthly", region).amount;
      const yearly = priceFor(tier, "yearly", region).amount;
      if (monthly <= 0) return 0;
      return Math.max(0, Math.round((1 - yearly / (monthly * 12)) * 100));
    };
    return Math.max(savingFor("premium"), savingFor("premium_plus"));
  }, [region]);

  /* The buy action runs the Standard Web Checkout rail: the edge
     function creates a one-time Order priced from the server's own
     table, Razorpay's modal opens in-page, and the signature the
     modal returns is confirmed through the function. The plan
     itself is switched on by the provider's verified webhook —
     this flow only ever reports what honestly happened. */
  const go = async (tier: Exclude<PlanTier, "free">) => {
    setBusyTier(tier);
    setNotice(null);
    try {
      const order = await createOrder(tier, period);
      if (order.state === "payments_not_configured") {
        setNotice(
          "Payments open soon — Bloom's payment account isn't connected yet, so checkout can't start today. Nothing has been charged. The moment it connects, this button goes straight to a secure checkout.",
        );
        return;
      }
      if (order.state !== "ready") {
        setNotice("Checkout couldn't start just now — nothing has been charged. Try again in a moment.");
        return;
      }
      const pay = await payWithRazorpay({
        keyId: order.keyId,
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        description: `${PLANS[tier].name} — ${period === "monthly" ? "monthly" : "yearly"}`,
      });
      if (pay.kind === "dismissed") {
        setNotice("Checkout closed — nothing has been charged.");
        return;
      }
      if (pay.kind === "unavailable") {
        setNotice(
          "The secure payment window couldn't load — check your connection and try again. Nothing has been charged.",
        );
        return;
      }
      if (pay.kind === "failed") {
        setNotice(
          `Payment didn't go through — ${pay.message} No plan was started; if your bank shows a debit for it, Razorpay refunds it automatically.`,
        );
        return;
      }
      const confirmed = await verifyPayment(pay.signature);
      /* The webhook does the actual switching-on; refresh the
         entitlement now and once more shortly after, so the sheet
         reflects the new plan as soon as it lands. */
      invalidateEntitlement();
      if (confirmed) {
        setNotice("Payment received — your plan is switching on now. It can take a few seconds to show here.");
        window.setTimeout(() => invalidateEntitlement(), 4000);
      } else {
        setNotice(
          "Your payment is being confirmed — if it went through, your plan switches on automatically within a few minutes, and you won't be charged twice for the same period.",
        );
      }
    } finally {
      setBusyTier(null);
    }
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
              {/* M-205 (F-37): a paid member's plan is marked ONCE — on
                  their card ("Your current plan"). The banner used to
                  claim it a second time; it now leads with the facts a
                  member opens the sheet for: credits and period. Free
                  keeps its claim — Free is on no card to mark it. */}
              {entitlement.tier === "free" ? (
                <>
                  You're on <strong>{PLANS[entitlement.tier].name}</strong> —{" "}
                  {entitlement.creditBalance} of {entitlement.monthlyAllowance} AI credits left
                  this month.
                </>
              ) : (
                <>
                  {entitlement.creditBalance} AI credits left this month
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
                Yearly{yearlySaving > 0 ? <span className="bill-save"> · save up to {yearlySaving}%</span> : null}
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
                    {PAYWALL_BULLETS[tier].map((f) => (
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

          {/* M-205 (F-37): a Premium Plus member's sheet used to have
              NO primary action at all — both cards are badges for
              them. One clear action: manage the membership where the
              membership actually lives (Settings). Premium members
              already have "Upgrade to Plus" as the sheet's primary;
              this renders only when no card carries an action. */}
          {entitlement && myTier === "premium_plus" ? (
            <button
              type="button"
              className="bill-btn bill-btn-gold bill-manage"
              onClick={() => {
                onClose();
                void navigate({ to: "/settings" });
              }}
            >
              Manage your membership
            </button>
          ) : null}

          {notice ? (
            <p className="bill-note" role="status">
              {notice}
            </p>
          ) : null}
        </div>
      </div>
      {/* M-202 (F-03): the reassurance line is the sheet's footer, not
          scroll content — it lives in the shell's always-visible foot
          zone (.bsheet-foot), so the panel cap can never slice it
          mid-line at the fold again. Same words, always whole. */}
      <div className="bsheet-foot bill-foot-zone">
        <p className="bill-foot">
          Free keeps working either way — trackers, habits, mood and your records are never held
          hostage. AI credits refill monthly; when they run out, the AI pauses and everything
          else carries on.
        </p>
      </div>
    </BloomSheet>
  );
}
