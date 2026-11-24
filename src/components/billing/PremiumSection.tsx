/**
 * PremiumSection — the membership card on Profile, built as a status
 * card: identity → live status → action (rulebook §10.2).
 *
 *   Row 1 (identity): the plan name, and on the right the period fact
 *     as a labelled date — "Renews …" while the plan rolls on,
 *     "Ends …" once it will not. Free shows neither: it has no period.
 *   Row 2 (live status): the AI credit balance is the hero numeral,
 *     with the meter beneath it. The meter turns amber at a quarter
 *     left and rose at a tenth (rulebook PR3) — colour only, because
 *     the product has no top-up action to point at yet.
 *   Row 3: one muted line true for the tier, and the one action.
 *
 * Two honesty notes:
 *   · There is NO billing-cycle badge. The entitlement the card reads
 *     carries no monthly/yearly field — neither the RPC nor the
 *     subscriptions table stores one — so a "Yearly" badge would be
 *     invented data, and this card never invents data.
 *   · When the entitlement cannot be read (signed out, billing not
 *     yet applied), the card shows no numbers at all rather than
 *     invented ones: just the invitation to see what Premium
 *     includes. The button opens the shared paywall sheet.
 */

import { useState } from "react";

import { useEntitlement, type UseEntitlementState } from "@/hooks/useEntitlement";
import { requestPaywall } from "@/lib/billing/paywall";
import { cancelAutoRenew } from "@/lib/billing/checkout";
import { invalidateEntitlement, type Entitlement } from "@/lib/billing/entitlement";
import { CREDIT_WEIGHTS_LINE, PLANS } from "@/lib/billing/plans";

import "@/styles/billing.css";

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/** The Row-1 date fact, or null when there is no period to state.
 *  Only paid tiers have a period; the verb follows the status so the
 *  fact stays true — a cancelled plan does not "renew". */
function periodFact(entitlement: Entitlement): { verb: string; date: string } | null {
  if (entitlement.tier === "free") return null;
  const date = formatDate(entitlement.currentPeriodEnd);
  if (!date) return null;
  switch (entitlement.status) {
    case "active":
      return { verb: "Renews", date };
    case "cancelled":
    case "past_due":
      return { verb: "Ends", date };
    case "expired":
      return { verb: "Ended", date };
    default:
      return null;
  }
}

/** The one muted line of Row 3. A past-due plan's line is its warning:
 *  the attention fact outranks the tier's tagline, and nothing else
 *  true is dropped — the date itself sits in Row 1. */
function descriptionLine(entitlement: Entitlement): string {
  if (entitlement.status === "past_due" && entitlement.tier !== "free") {
    return "Payment needs attention.";
  }
  switch (entitlement.tier) {
    case "free":
      /* "You're on Free" is not repeated — Row 1 already names it. */
      return "The everyday Bloom, with a monthly taste of the AI.";
    case "premium":
      return "The full intelligence. Coach, Vitalis, adaptive plans, Nutrition.";
    case "premium_plus":
      return "Deep AI allowance, daily Vitalis conversations and photo-led logging.";
  }
}

function meterPercent(entitlement: Entitlement): number {
  if (entitlement.monthlyAllowance <= 0) return 0;
  return Math.min(100, (entitlement.creditBalance / entitlement.monthlyAllowance) * 100);
}

/** Rulebook PR3 thresholds: a quarter left reads amber, a tenth rose.
 *  Undefined in the healthy range — the fill keeps its gold gradient. */
function meterLevel(entitlement: Entitlement): "low" | "empty" | undefined {
  const pct = meterPercent(entitlement);
  if (pct <= 10) return "empty";
  if (pct <= 25) return "low";
  return undefined;
}

function planName(state: UseEntitlementState): string {
  return state.kind === "ready" ? PLANS[state.entitlement.tier].name : "Bloom Premium";
}

export function PremiumSection() {
  const state = useEntitlement();
  const fact = state.kind === "ready" ? periodFact(state.entitlement) : null;

  /* M-222: cancel auto-renew. Shown only to a paid member whose
     plan is live; the function answers honestly for every case —
     including "no auto-renewing subscription", which is the truth
     for a one-time Orders purchase or a manual grant (nothing
     renews automatically there, so there is nothing to cancel).
     Cancelling ends the mandate at the period end; the plan stays
     live until then, and this card says so in those words. */
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelNote, setCancelNote] = useState<string | null>(null);
  const onCancelAutoRenew = async () => {
    setCancelBusy(true);
    try {
      const result = await cancelAutoRenew();
      if (result.state === "cancel_scheduled") {
        const date = formatDate(result.periodEnd);
        setCancelNote(
          date
            ? `Auto-renew is off, your plan stays active until ${date}, and nothing is charged after that.`
            : "Auto-renew is off, your plan stays active until the current period ends, and nothing is charged after that.",
        );
        invalidateEntitlement();
      } else if (result.state === "no_active_subscription") {
        setCancelNote(
          "No auto-renewing subscription was found on your account, your plan doesn't renew automatically, so there's nothing to cancel.",
        );
      } else if (result.state === "payments_not_configured") {
        setCancelNote("Auto-renew can't be changed right now. Bloom's payment account isn't connected yet.");
      } else {
        setCancelNote("That didn't go through just now, try again in a moment.");
      }
    } finally {
      setCancelBusy(false);
    }
  };

  return (
    <div className="pf-card bill-plan">
      <div className="bill-plan-head">
        <div>
          <p className="pf-eyebrow">Membership</p>
          <h2 className="pf-title">{planName(state)}</h2>
        </div>
        {fact ? (
          <p className="bill-plan-renews">
            {fact.verb} <strong>{fact.date}</strong>
          </p>
        ) : null}
      </div>

      {state.kind === "loading" ? (
        <p className="text-[length:var(--text-caption)] text-faint">Loading your plan…</p>
      ) : state.kind === "unavailable" ? (
        <div className="bill-plan-foot">
          <p className="bill-plan-desc">
            Unlimited habits, the full Coach and Vitalis, adaptive plans and Nutrition.
          </p>
          <button type="button" className="bill-btn bill-btn-gold" onClick={() => requestPaywall("profile")}>
            See what Premium includes
          </button>
        </div>
      ) : (
        <>
          <div className="bill-plan-usage">
            <p className="bill-plan-count">
              <span className="bill-plan-value">{state.entitlement.creditBalance}</span>
              <span className="bill-plan-of">of {state.entitlement.monthlyAllowance}</span>
              <span className="bill-plan-label">AI credits left this month</span>
            </p>
            <div
              className="bill-meter"
              role="meter"
              aria-valuemin={0}
              aria-valuemax={state.entitlement.monthlyAllowance}
              aria-valuenow={state.entitlement.creditBalance}
              aria-label="AI credits left this month"
            >
              <div
                className="bill-meter-fill"
                data-level={meterLevel(state.entitlement)}
                style={{ width: `${meterPercent(state.entitlement)}%` }}
              />
            </div>
          </div>

          {/* M-215: credits are weighted — the card that shows the
              balance also says what things cost, in the one line set
              every credit surface shares (plans.ts). */}
          <p className="text-[length:var(--text-caption)] text-faint">{CREDIT_WEIGHTS_LINE}</p>

          <div className="bill-plan-foot">
            <p className="bill-plan-desc">{descriptionLine(state.entitlement)}</p>
            <button type="button" className="bill-btn bill-btn-gold" onClick={() => requestPaywall("profile")}>
              {state.entitlement.tier === "free" ? "See Premium plans" : "Manage or upgrade"}
            </button>
          </div>

          {/* M-222: the auto-renew control, on the membership card
              where the membership lives. A quiet ghost action under
              the primary — cancelling is a right, not a dark
              pattern, and its outcome line replaces the button. */}
          {state.entitlement.tier !== "free" && state.entitlement.status === "active" ? (
            cancelNote ? (
              <p className="bill-plan-desc" role="status">
                {cancelNote}
              </p>
            ) : (
              <button
                type="button"
                className="bill-btn bill-btn-ghost"
                disabled={cancelBusy}
                onClick={() => void onCancelAutoRenew()}
              >
                {cancelBusy ? "Cancelling…" : "Cancel auto-renew"}
              </button>
            )
          ) : cancelNote ? (
            <p className="bill-plan-desc" role="status">
              {cancelNote}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
