/**
 * The one upgrade prompt for the whole app.
 *
 * PaywallHost mounts once at the app root and opens this sheet when
 * any surface calls requestPaywall(context) — Coach out of credits,
 * the free habit limit, the plan composer, the Assessment. The sheet
 * is specific first (what was reached, in the context strip) and
 * commercial second.
 *
 * M-220 — the commercial composition is design A, "The Invitation"
 * (owner pick from the membership preview round, 2026-11-23): the
 * invitation gate rebuilt as membership, copied EXACTLY from the
 * approved preview — the ink ground with the four corner glows, the
 * bloom orb, the centred 340px column, serif headline, the three
 * plan rows with radio marks, one gold pill CTA whose label follows
 * the selection. It replaces M-216's design G ("The Comparison");
 * the shared ledger is retired from this sheet (the comparison data
 * still lives in plans.ts and still drives the gates). The checkout
 * flow, period state, current-plan handling and notices are the
 * earlier eras', unchanged; only the presentation was rebuilt.
 *
 * The owner's one amendment to the preview (2026-11-23): when a plan
 * is selected, a GLASS drop-down expands under its row listing what
 * is included in that plan (PAYWALL_BULLETS, the sheet's own words
 * from plans.ts). The drop-down is the ONE glass element inside a
 * sheet — an explicit owner exception to the sheet-opacity rule,
 * recorded in M-220; the panel itself stays the family's opaque
 * slab (wearing the preview's ink tone), and the drop-down's text
 * rides the glass material's strong tint so it stays fully legible.
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
  CHECKOUT_RAIL,
  createOrder,
  createSubscription,
  loadRazorpayCheckout,
  payWithRazorpay,
  payWithRazorpaySubscription,
  verifyPayment,
} from "@/lib/billing/checkout";
import { invalidateEntitlement } from "@/lib/billing/entitlement";
import {
  PAYWALL_HEADLINES,
  onPaywallRequest,
  type PaywallContext,
} from "@/lib/billing/paywall";
import {
  COACH_ACCESS,
  CREDIT_WEIGHTS_LINE,
  PAYWALL_BULLETS,
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

/* Contexts that are ABOUT the Plus layer pre-select its row — the
   member arrived from a Plus boundary (the Vitalis gate, the Twin,
   the reports), so the invitation opens on the plan they reached
   for. (Design G spotlighted the column; design A selects the row.) */
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

/** The preview's bloom orb, drawn exactly as the preview draws it —
 *  the radial gold-to-sage core, the three ellipse strokes, the lit
 *  centre. Ids are sheet-scoped so the gradient can never collide
 *  with the Coach orb's own. */
function InvitationOrb() {
  return (
    <svg
      className="bill-a-orb"
      width="76"
      height="76"
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="bill-a-orb-core" cx="42%" cy="38%" r="75%">
          <stop offset="0%" className="orb-s0" />
          <stop offset="45%" className="orb-s1" />
          <stop offset="78%" className="orb-s2" />
          <stop offset="100%" className="orb-s3" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#bill-a-orb-core)" />
      <g fill="none" stroke="rgba(60, 50, 20, 0.28)" strokeWidth="2.4">
        <ellipse cx="50" cy="50" rx="34" ry="17" />
        <ellipse cx="50" cy="50" rx="34" ry="17" transform="rotate(60 50 50)" />
        <ellipse cx="50" cy="50" rx="34" ry="17" transform="rotate(120 50 50)" />
      </g>
      <circle cx="50" cy="50" r="10.5" className="bill-a-orb-core" />
      <circle cx="46.5" cy="46" r="3.4" className="bill-a-orb-glint" opacity="0.85" />
    </svg>
  );
}

/** What the drop-down lists for a tier — the sheet's own inclusion
 *  words from plans.ts. Paid tiers carry PAYWALL_BULLETS verbatim;
 *  Free's list is assembled from the same authorities (its habit
 *  ceiling and credit allowance from PLANS, the always-included rows
 *  of the comparison, its limited Coach access) so no line is
 *  invented for it either. */
function inclusionsFor(tier: PlanTier): string[] {
  if (tier !== "free") return [...PAYWALL_BULLETS[tier]];
  return [
    `Up to ${PLANS.free.habitLimit} habits`,
    ...PAYWALL_COMPARISON.filter((row) => comparisonHas(row, "free")).map((row) => row.label),
    `Coach chat, ${COACH_ACCESS.free}`,
    `${PLANS.free.monthlyCredits} AI credits a month`,
  ];
}

/** The row's one-line summary, in the preview's words, with the
 *  numbers read from PLANS so they can never drift from the offer. */
function rowTagline(tier: PlanTier): string {
  switch (tier) {
    case "free":
      return `${PLANS.free.habitLimit} habits · trackers & mood · ${PLANS.free.monthlyCredits} AI credits a month`;
    case "premium":
      return `Full Coach · food-photo logging · your personal plan · ${PLANS.premium.monthlyCredits} credits`;
    case "premium_plus":
      return `Vitalis with voice · adaptive intelligence · ${PLANS.premium_plus.monthlyCredits} credits`;
  }
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
  const [picked, setPicked] = useState<PlanTier | null>(null);
  const [busyTier, setBusyTier] = useState<PlanTier | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const region = useMemo(() => detectPriceRegion(), []);

  /* A fresh open starts clean — no stale checkout notice from the
     last time the sheet was up, and the selection back to its
     default row. */
  useEffect(() => {
    if (open) {
      setNotice(null);
      setPicked(null);
    }
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
  }, [open ]);

  const headline = PAYWALL_HEADLINES[context];
  const entitlement = entitlementState.kind === "ready" ? entitlementState.entitlement : null;
  const myTier: PlanTier = entitlement?.tier ?? "free";
  const myRank = TIER_ORDER.indexOf(myTier);
  const spotlightPlus = PLUS_SPOTLIGHT_CONTEXTS.has(context);

  /* The row the invitation opens on: the member's own paid plan if
     they have one, the Plus row from a Plus-bound context, otherwise
     Premium — the preview's pre-selected row. */
  const selected: PlanTier =
    picked ?? (myRank > 0 ? myTier : spotlightPlus ? "premium_plus" : "premium");
  const selectedRank = TIER_ORDER.indexOf(selected);
  const selectedIsMine = entitlement !== null && selected === myTier;
  const selectedIncluded = entitlement !== null && selectedRank < myRank;

  /* M-214: the two tiers no longer save the same share on yearly
     (India: Premium 30%, Plus 17% — the deeper allowance carries a
     shallower discount). One number must not claim Plus saves what
     only Premium does, so the monthly note states the best saving,
     labelled "up to"; the yearly note is design A's own line, its
     amounts computed from the same constants (India: ₹2,189 on
     Premium · ₹1,989 on Plus, the preview's figures). */
  const yearlySaving = useMemo(() => {
    const savingFor = (tier: Exclude<PlanTier, "free">) => {
      const monthly = priceFor(tier, "monthly", region).amount;
      const yearly = priceFor(tier, "yearly", region).amount;
      if (monthly <= 0) return 0;
      return Math.max(0, Math.round((1 - yearly / (monthly * 12)) * 100));
    };
    return Math.max(savingFor("premium"), savingFor("premium_plus"));
  }, [region]);

  const periodNote = useMemo(() => {
    if (period === "monthly") {
      return yearlySaving > 0 ? `Switch to yearly to save up to ${yearlySaving}%` : null;
    }
    const savedFor = (tier: Exclude<PlanTier, "free">) => {
      const monthly = priceFor(tier, "monthly", region);
      const yearly = priceFor(tier, "yearly", region);
      return formatPrice({
        amount: Math.max(0, Math.round((monthly.amount * 12 - yearly.amount) * 100) / 100),
        currency: monthly.currency,
      });
    };
    return `Yearly saves ${savedFor("premium")} on Premium · ${savedFor("premium_plus")} on Plus`;
  }, [period, region, yearlySaving]);

  /* The buy action runs the rail CHECKOUT_RAIL selects (checkout.ts):
     Autopay by default (M-222 — a Razorpay Subscription with a
     mandate), the Standard Web Checkout Orders rail as the fallback
     (a one-time Order priced from the server's own table, the
     modal's signature confirmed through the function). Either way
     the plan itself is switched on by the provider's verified
     webhook — this flow only ever reports what honestly happened. */

  const go = async (tier: Exclude<PlanTier, "free">) => {
    setBusyTier(tier);
    setNotice(null);
    /* M-217: start (or confirm) the checkout.js download BEFORE the
       order round trip, never after it — payWithRazorpay awaits the
       same cached promise, so the modal opens the moment the order
       lands. No order is created here beyond the one below. */
    void loadRazorpayCheckout().catch(() => {});
    try {
      /* M-222: the default rail is Autopay — the function ensures
         the plan and creates a Razorpay Subscription, and the modal
         opens in subscription mode: the member authorises a mandate
         (UPI AutoPay / card) and the first charge, and renewals
         debit automatically until cancelled. The Orders rail below
         is the fallback, selected by CHECKOUT_RAIL in checkout.ts.
         Either way the plan switches on ONLY from the provider's
         verified webhook; this flow reports what honestly happened. */
      if (CHECKOUT_RAIL === "subscription") {
        const sub = await createSubscription(tier, period);
        if (sub.state === "payments_not_configured") {
          setNotice(
            "Payments open soon. Bloom's payment account isn't connected yet, so checkout can't start today. Nothing has been charged. The moment it connects, this button goes straight to a secure checkout.",
          );
          return;
        }
        if (sub.state !== "ready") {
          setNotice("Checkout couldn't start just now, nothing has been charged. Try again in a moment.");
          return;
        }
        const pay = await payWithRazorpaySubscription({
          keyId: sub.keyId,
          subscriptionId: sub.subscriptionId,
          description: `${PLANS[tier].name} - ${period === "monthly" ? "monthly" : "yearly"}`,
        });
        if (pay.kind === "dismissed") {
          setNotice("Checkout closed, nothing has been charged.");
          return;
        }
        if (pay.kind === "unavailable") {
          setNotice(
            "The secure payment window couldn't load, check your connection and try again. Nothing has been charged.",
          );
          return;
        }
        if (pay.kind === "failed") {
          setNotice(
            `Payment didn't go through, ${pay.message} No plan was started; if your bank shows a debit for it, Razorpay refunds it automatically.`,
          );
          return;
        }
        /* Mandate authorised + first charge accepted. The webhook
           does the actual switching-on; refresh the entitlement now
           and once more shortly after, as the Orders flow does. */
        invalidateEntitlement();
        setNotice(
          "Payment received, your plan is switching on now. It renews automatically each period until you cancel; cancel auto-renew anytime from your Profile. It can take a few seconds to show here.",
        );
        window.setTimeout(() => invalidateEntitlement(), 4000);
        return;
      }
      const order = await createOrder(tier, period);
      if (order.state === "payments_not_configured") {
        setNotice(
          "Payments open soon. Bloom's payment account isn't connected yet, so checkout can't start today. Nothing has been charged. The moment it connects, this button goes straight to a secure checkout.",
        );
        return;
      }
      if (order.state !== "ready") {
        setNotice("Checkout couldn't start just now, nothing has been charged. Try again in a moment.");
        return;
      }
      const pay = await payWithRazorpay({
        keyId: order.keyId,
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        description: `${PLANS[tier].name} - ${period === "monthly" ? "monthly" : "yearly"}`,
      });
      if (pay.kind === "dismissed") {
        setNotice("Checkout closed, nothing has been charged.");
        return;
      }
      if (pay.kind === "unavailable") {
        setNotice(
          "The secure payment window couldn't load, check your connection and try again. Nothing has been charged.",
        );
        return;
      }
      if (pay.kind === "failed") {
        setNotice(
          `Payment didn't go through, ${pay.message} No plan was started; if your bank shows a debit for it, Razorpay refunds it automatically.`,
        );
        return;
      }
      const confirmed = await verifyPayment(pay.signature);
      /* The webhook does the actual switching-on; refresh the
         entitlement now and once more shortly after, so the sheet
         reflects the new plan as soon as it lands. */
      invalidateEntitlement();
      if (confirmed) {
        setNotice("Payment received, your plan is switching on now. It can take a few seconds to show here.");
        window.setTimeout(() => invalidateEntitlement(), 4000);
      } else {
        setNotice(
          "Your payment is being confirmed, if it went through, your plan switches on automatically within a few minutes, and you won't be charged twice for the same period.",
        );
      }
    } finally {
      setBusyTier(null);
    }
  };

  return (
    <BloomSheet
      open={open}
      onClose={onClose}
      title="Bloom Premium"
      size="lg"
      panelClassName="bill-a-panel"
    >
      {/* Design A's scene: the preview's four corner glows over the
          ink ground, fixed to the panel while the column scrolls
          above them. Decorative only. */}
      <div className="bill-a-glows" aria-hidden="true">
        <i className="bill-a-glow bill-a-glow--gold-tl" />
        <i className="bill-a-glow bill-a-glow--sage-r" />
        <i className="bill-a-glow bill-a-glow--rose-bl" />
        <i className="bill-a-glow bill-a-glow--gold-br" />
      </div>
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
          <div className="bill-a-wrap">
            {/* Design A's head — the approved preview's composition
                and words, verbatim: orb, eyebrow, serif headline,
                the invitation's own sub. */}
            <InvitationOrb />
            <p className="bill-a-eyebrow">Bloom Membership</p>
            <h3 className="bill-a-title">
              Bloom, in
              <br />
              full bloom.
            </h3>
            <p className="bill-a-sub">
              Choose how much of Bloom you want. Every plan keeps your data, your history and
              your streak, upgrading only opens more of the garden.
            </p>

            {/* What was reached, stated plainly — the context's own
                headline, kept from the card era: the sheet is specific
                first, commercial second. */}
            <p className="bill-context">
              <strong>{headline.title}</strong> - {headline.body}
            </p>

            {entitlement ? (
              <p className="bill-status" role="status">
                {/* M-205 (F-37): a paid member's plan is marked ONCE —
                    on their row ("Your plan"). The banner used to claim
                    it a second time; it now leads with the facts a
                    member opens the sheet for: credits and period. Free
                    keeps its claim — Free is on no other mark. */}
                {entitlement.tier === "free" ? (
                  <>
                    You're on <strong>{PLANS[entitlement.tier].name}</strong> -{" "}
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

            {/* The preview's period switch: a bordered pill, the
                chosen period in the gold gradient, the saving stated
                beside it in sage. */}
            <div className="bill-a-period">
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
                  Yearly
                </button>
              </div>
              {periodNote ? <span className="bill-a-period-note">{periodNote}</span> : null}
            </div>

            {/* The three rows of the invitation. Each is a radio;
                the selected row opens the owner's glass drop-down
                under it — what is included in that plan, in the
                sheet's own words from plans.ts. The member's own row
                carries the "Your plan" pill in place of the design's
                marketing pill — a state outranks a slogan. */}
            <div className="bill-a-rows" role="radiogroup" aria-label="Choose a plan">
              {TIER_ORDER.map((tier) => {
                const plan = PLANS[tier];
                const price = priceFor(tier, period, region);
                const isMine = entitlement !== null && tier === myTier;
                const isSelected = tier === selected;
                return (
                  <div key={tier} className="bill-a-row-wrap">
                    <button
                      type="button"
                      className="bill-a-row"
                      role="radio"
                      aria-checked={isSelected}
                      data-plan-row={tier}
                      onClick={() => setPicked(tier)}
                    >
                      <span className="bill-a-radio" aria-hidden="true" />
                      <span className="bill-a-row-main">
                        <span className="bill-a-name">
                          {plan.name}
                          {isMine ? (
                            <span className="bill-a-pill bill-a-pill--yours">Your plan</span>
                          ) : tier === "premium" ? (
                            <span className="bill-a-pill bill-a-pill--pop">Most popular</span>
                          ) : tier === "premium_plus" ? (
                            <span className="bill-a-pill bill-a-pill--plus">Vitalis</span>
                          ) : null}
                        </span>
                        <span className="bill-a-tag">{rowTagline(tier)}</span>
                      </span>
                      <span className="bill-a-price">
                        <span className="bill-a-amt">{formatPrice(price)}</span>
                        <span className="bill-a-per">
                          {tier === "free"
                            ? "forever"
                            : period === "monthly"
                              ? "per month"
                              : `per year · ${formatPrice(monthlyEquivalent(tier, region))}/mo`}
                        </span>
                      </span>
                    </button>
                    {isSelected ? (
                      <div
                        className="glass-panel bill-a-includes"
                        role="group"
                        aria-label={`What's included in ${plan.name}`}
                        data-includes-for={tier}
                      >
                        <p className="bill-a-includes-title">What's included</p>
                        <ul className="bill-a-includes-list">
                          {inclusionsFor(tier).map((line) => (
                            <li key={line}>
                              <Check aria-hidden />
                              <span>{line}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {/* The one gold pill. Its label follows the selection, as
                the preview's does; a plan state (yours, or included
                in yours) is a DISABLED pill in the sage state
                treatment — it cannot be tapped and never wears the
                gold action fill. Free's pill simply stays: it closes
                the sheet. */}
            {selected === "free" ? (
              <button type="button" className="bill-a-cta" onClick={onClose}>
                Stay on Free
              </button>
            ) : selectedIsMine || selectedIncluded ? (
              <button type="button" className="bill-a-cta bill-a-cta--state" disabled>
                {selectedIsMine ? "Your plan" : "Included in your plan"}
              </button>
            ) : (
              <button
                type="button"
                className="bill-a-cta"
                disabled={busyTier !== null}
                onClick={() => void go(selected)}
              >
                {busyTier === selected
                  ? "Opening checkout…"
                  : `Continue with ${PLANS[selected].name}`}
              </button>
            )}

            {/* M-205 (F-37): a Premium Plus member's sheet used to have
                NO primary action at all — every plan is a state for
                them. One clear action: manage the membership where the
                membership actually lives (Settings). */}
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
      </div>
      {/* M-202 (F-03): the closing lines are the sheet's footer, not
          scroll content — they live in the shell's always-visible foot
          zone (.bsheet-foot), so the panel cap can never slice them
          mid-line at the fold. The free-keeps-working promise first,
          then what a credit buys (M-215 — the sheet quotes the
          allowances in its rows, so the weighted line rides here,
          where design A's composition has no room for it in the
          column), then the payment honesty lines, whole. */}
      <div className="bsheet-foot bill-foot-zone">
        <p className="bill-foot">
          Free keeps working either way, trackers, habits, mood and your records are never held
          hostage. AI credits refill monthly; when they run out, the AI pauses and everything
          else carries on.
        </p>
        <p className="bill-foot">{CREDIT_WEIGHTS_LINE}</p>
        <p className="bill-foot">
          Payments are handled securely by Razorpay. UPI, cards and netbanking.
        </p>
        <p className="bill-foot">
          {CHECKOUT_RAIL === "subscription"
            ? "The first payment confirms your plan, and it renews automatically each period until you cancel. Cancel auto-renew anytime from your Profile, you keep Premium until the period ends, and nothing is charged after that."
            : "The first payment confirms your plan. Renewals are charged manually in this version, nothing is taken automatically, and you keep Premium until the period ends."}
        </p>
      </div>
    </BloomSheet>
  );
}
