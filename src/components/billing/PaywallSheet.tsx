/**
 * The one upgrade prompt for the whole app.
 *
 * PaywallHost mounts once at the app root and opens this sheet when
 * any surface calls requestPaywall(context) — Coach out of credits,
 * the free habit limit, the plan composer, the Assessment. The sheet
 * is specific first (what was reached, in the context strip) and
 * commercial second.
 *
 * M-216 — the commercial composition is design G, "The Comparison"
 * (owner pick from preview round 2, 2026-11-22): two column heads
 * (price, works-out-to, credit line) over ONE shared feature ledger,
 * one button per column. The ledger renders PAYWALL_COMPARISON from
 * lib/billing/plans and resolves every tick or dash through
 * comparisonHas, so a row can never claim a Premium tick for a
 * Plus-only feature — the M-214 split is the ledger's dashes. The
 * checkout flow, period state, current-plan handling and notices
 * are the card era's, unchanged; only the presentation was rebuilt.
 * Nothing here can grant Premium; only the provider's verified
 * webhook can.
 */

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Check } from "lucide-react";

import { BloomIcon } from "@/components/icons/BloomIcon";
import { BloomSheet } from "@/components/ui/bloom-sheet";
import { useEntitlement } from "@/hooks/useEntitlement";
import {
  createOrder,
  loadRazorpayCheckout,
  payWithRazorpay,
  verifyPayment,
} from "@/lib/billing/checkout";
import { invalidateEntitlement } from "@/lib/billing/entitlement";
import {
  PAYWALL_HEADLINES,
  onPaywallRequest,
  type PaywallContext,
} from "@/lib/billing/paywall";
import {
  CREDIT_WEIGHTS_LINE,
  PAYWALL_COMPARISON,
  PLANS,
  TIER_ORDER,
  comparisonHas,
  detectPriceRegion,
  formatPrice,
  monthlyEquivalent,
  priceFor,
  type BillingPeriod,
  type PlanTier,
} from "@/lib/billing/plans";

import "@/styles/billing.css";

/* Contexts that are ABOUT the Plus layer spotlight its column —
   the member arrived from a Plus boundary (the Vitalis gate, the
   Twin, the reports), so the ledger's right column is where their
   eye should land. */
const PLUS_SPOTLIGHT_CONTEXTS: ReadonlySet<PaywallContext> = new Set([
  "vitalis_plus",
  "premium_plus",
  "vitalis_credits",
]);

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

  /* M-217: warm the Razorpay script the moment the sheet opens —
     checkout.js downloads while the member reads the plans, so a
     tap only waits for the order round trip. The loader caches its
     promise, so this fires once per open and costs nothing after
     the first success; a failed preload stays silent here (the
     loader clears its cache on failure, and the tap path retries
     and reports the honest unavailable state). */
  useEffect(() => {
    if (!open) return;
    void loadRazorpayCheckout().catch(() => {});
  }, [open]);

  const headline = PAYWALL_HEADLINES[context];
  const entitlement = entitlementState.kind === "ready" ? entitlementState.entitlement : null;
  const myTier: PlanTier = entitlement?.tier ?? "free";
  const myRank = TIER_ORDER.indexOf(myTier);
  const spotlightPlus = PLUS_SPOTLIGHT_CONTEXTS.has(context);

  /* M-214: the two tiers no longer save the same share on yearly
     (India: Premium 30%, Plus 17% — the deeper allowance carries a
     shallower discount). One number on the toggle must not claim
     Plus saves what only Premium does, so the toggle states the
     best saving, labelled "up to"; each head's own "works out to"
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
    /* M-217: start (or confirm) the checkout.js download BEFORE the
       order round trip, never after it — payWithRazorpay awaits the
       same cached promise, so the modal opens the moment the order
       lands. No order is created here beyond the one below. */
    void loadRazorpayCheckout().catch(() => {});
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

  const paidTiers = ["premium", "premium_plus"] as const;

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
          {/* Design G's head — the approved preview's words, verbatim. */}
          <div>
            <p className="bill-eyebrow">Bloom Membership</p>
            <h3 className="bill-title">Two plans. One ledger.</h3>
            <p className="bill-body">Every feature, side by side — so the difference is plain.</p>
          </div>

          {/* What was reached, stated plainly — the context's own
              headline, kept from the card era: the sheet is specific
              first, commercial second. */}
          <p className="bill-context">
            <strong>{headline.title}</strong> — {headline.body}
          </p>

          {entitlement ? (
            <p className="bill-status" role="status">
              {/* M-205 (F-37): a paid member's plan is marked ONCE — on
                  their column ("Your plan"). The banner used to claim
                  it a second time; it now leads with the facts a
                  member opens the sheet for: credits and period. Free
                  keeps its claim — Free is on no column to mark it. */}
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

          {/* M-215: the sheet quotes the allowances (300 / 800), so it
              also says what a credit buys — the weighted line set
              every credit surface shares (plans.ts). */}
          <p className="bill-weights">{CREDIT_WEIGHTS_LINE}</p>

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

          {/* The two column heads. Plus carries the gold treatment and
              the "Most loved" eyebrow (the preview's composition);
              the member's own column is marked "Your plan", a lower
              included column "Included". At phone width the pair
              stays side by side — the columns tighten, never stack. */}
          <div className="bill-g-heads">
            {paidTiers.map((tier) => {
              const plan = PLANS[tier];
              const price = priceFor(tier, period, region);
              const equivalent = monthlyEquivalent(tier, region);
              const rank = TIER_ORDER.indexOf(tier);
              const isMine = rank === myRank && entitlement !== null;
              const included = rank < myRank;
              return (
                <div
                  key={tier}
                  data-plan-head={tier}
                  className={
                    `bill-g-head` +
                    `${tier === "premium_plus" ? " bill-g-head--plus" : ""}` +
                    `${isMine ? " bill-g-head--mine" : ""}` +
                    `${tier === "premium_plus" && spotlightPlus ? " bill-g-head--spotlight" : ""}`
                  }
                >
                  {tier === "premium_plus" ? <p className="bill-g-loved">Most loved</p> : null}
                  <p className="bill-g-plan">{plan.name}</p>
                  <p className="bill-price">
                    {formatPrice(price)}
                    <small> / {period === "monthly" ? "month" : "year"}</small>
                  </p>
                  {period === "yearly" ? (
                    <p className="bill-equivalent">Works out to {formatPrice(equivalent)} a month.</p>
                  ) : null}
                  <p className="bill-g-credits">{plan.monthlyCredits} AI credits a month</p>
                  {isMine ? (
                    <p className="bill-g-yours">Your plan</p>
                  ) : included ? (
                    <p className="bill-g-yours">Included</p>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* The shared ledger. Every row is a PAYWALL_COMPARISON row;
              every cell resolves through comparisonHas against the
              tier data in plans.ts — a gold tick where the tier
              carries the feature, an honest muted dash where it does
              not. The words "Included" / "Not included" ride along
              screen-reader-only, so the tick is never the only signal. */}
          <div className="bill-g-ledger">
            <div className="bill-g-row bill-g-row--head" aria-hidden="true">
              <span />
              <span className="bill-g-cell bill-g-colname">Premium</span>
              <span className="bill-g-cell bill-g-colname bill-g-colname--plus">Plus</span>
            </div>
            {PAYWALL_COMPARISON.map((row) => (
              <div key={row.label} className="bill-g-row" data-comparison-row={row.label}>
                <span className="bill-g-label">{row.label}</span>
                {paidTiers.map((tier) => {
                  const included = comparisonHas(row, tier);
                  return (
                    <span
                      key={tier}
                      className="bill-g-cell"
                      data-tier={tier}
                      data-included={String(included)}
                    >
                      {included ? (
                        <>
                          <Check aria-hidden />
                          <span className="sr-only">Included in {PLANS[tier].name}</span>
                        </>
                      ) : (
                        <>
                          <span className="bill-g-dash" aria-hidden="true">
                            —
                          </span>
                          <span className="sr-only">Not included in {PLANS[tier].name}</span>
                        </>
                      )}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>

          {/* One button per column. A plan state is a DISABLED button
              in the sage state treatment — it holds the column's foot
              so the pair composes, it cannot be tapped, and it never
              wears the gold action fill. Only a real next step — go /
              upgrade, including the tap that surfaces the honest
              payments-open-soon notice — is a live gold button. */}
          <div className="bill-g-btns">
            {paidTiers.map((tier) => {
              const rank = TIER_ORDER.indexOf(tier);
              const isMine = rank === myRank && entitlement !== null;
              const included = rank < myRank;
              if (isMine || included) {
                return (
                  <button
                    key={tier}
                    type="button"
                    className="bill-btn bill-btn-state"
                    disabled
                  >
                    {isMine ? "Your plan" : "Included in your plan"}
                  </button>
                );
              }
              return (
                <button
                  key={tier}
                  type="button"
                  className="bill-btn bill-btn-gold"
                  disabled={busyTier !== null}
                  onClick={() => void go(tier)}
                >
                  {busyTier === tier
                    ? "Opening checkout…"
                    : tier === "premium"
                      ? "Go Premium"
                      : "Go Premium Plus"}
                </button>
              );
            })}
          </div>

          {/* M-205 (F-37): a Premium Plus member's sheet used to have
              NO primary action at all — both columns are states for
              them. One clear action: manage the membership where the
              membership actually lives (Settings). Premium members
              already have "Go Premium Plus" as the sheet's primary;
              this renders only when no column carries an action. */}
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
      {/* M-202 (F-03): the closing lines are the sheet's footer, not
          scroll content — they live in the shell's always-visible foot
          zone (.bsheet-foot), so the panel cap can never slice them
          mid-line at the fold. The free-keeps-working promise first,
          then the payment honesty lines, whole. */}
      <div className="bsheet-foot bill-foot-zone">
        <p className="bill-foot">
          Free keeps working either way — trackers, habits, mood and your records are never held
          hostage. AI credits refill monthly; when they run out, the AI pauses and everything
          else carries on.
        </p>
        <p className="bill-foot">
          Payments are handled securely by Razorpay — UPI, cards and netbanking.
        </p>
        <p className="bill-foot">
          The first payment confirms your plan. Renewals are charged manually in this version —
          nothing is taken automatically, and you keep Premium until the period ends.
        </p>
      </div>
    </BloomSheet>
  );
}
