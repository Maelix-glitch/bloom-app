/**
 * PremiumSection — the membership card on Profile.
 *
 * Shows the person's real plan and AI credit balance, read from the
 * entitlement RPC — and when the entitlement cannot be read (signed
 * out, billing not yet applied), it shows no numbers at all rather
 * than invented ones: just the invitation to see what Premium
 * includes. The button opens the shared paywall sheet.
 */

import { useEntitlement } from "@/hooks/useEntitlement";
import { requestPaywall } from "@/lib/billing/paywall";
import { PLANS } from "@/lib/billing/plans";

import "@/styles/billing.css";

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function PremiumSection() {
  const state = useEntitlement();

  return (
    <div className="pf-card pf-card--pad">
      <div className="pf-section-head">
        <div>
          <p className="pf-eyebrow">Membership</p>
          <h2 className="pf-title">
            {state.kind === "ready" ? PLANS[state.entitlement.tier].name : "Bloom Premium"}
          </h2>
        </div>
      </div>

      {state.kind === "loading" ? (
        <p className="text-[length:var(--text-caption)] text-faint">Loading your plan…</p>
      ) : state.kind === "unavailable" ? (
        <>
          <p className="text-[length:var(--text-callout)] text-[color:var(--text-secondary)]">
            The full Bloom intelligence — unlimited habits, the full Coach and Vitalis, adaptive
            plans and Nutrition.
          </p>
          <div className="mt-4">
            <button type="button" className="bill-btn bill-btn-gold" onClick={() => requestPaywall("profile")}>
              See what Premium includes
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-[length:var(--text-callout)] text-[color:var(--text-secondary)]">
            {state.entitlement.tier === "free"
              ? "You're on Free — the everyday Bloom, with a monthly taste of the AI."
              : PLANS[state.entitlement.tier].tagline}
          </p>

          <div className="mt-4 grid gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[length:var(--text-caption)] text-faint">AI credits this month</span>
              <span className="text-[length:var(--text-callout)]">
                {state.entitlement.creditBalance} of {state.entitlement.monthlyAllowance} left
              </span>
            </div>
            <div
              className="bill-meter"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={state.entitlement.monthlyAllowance}
              aria-valuenow={state.entitlement.creditBalance}
              aria-label="AI credits left this month"
            >
              <div
                className="bill-meter-fill"
                style={{
                  width: `${
                    state.entitlement.monthlyAllowance > 0
                      ? Math.min(100, (state.entitlement.creditBalance / state.entitlement.monthlyAllowance) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>
            {state.entitlement.tier !== "free" && formatDate(state.entitlement.currentPeriodEnd) ? (
              <p className="text-[length:var(--text-caption)] text-faint">
                {state.entitlement.status === "cancelled"
                  ? `Premium ends ${formatDate(state.entitlement.currentPeriodEnd)} — it will not renew.`
                  : state.entitlement.status === "past_due"
                    ? `Payment needs attention — current period ends ${formatDate(state.entitlement.currentPeriodEnd)}.`
                    : `Current period ends ${formatDate(state.entitlement.currentPeriodEnd)}.`}
              </p>
            ) : null}
          </div>

          <div className="mt-4">
            <button type="button" className="bill-btn bill-btn-gold" onClick={() => requestPaywall("profile")}>
              {state.entitlement.tier === "free" ? "See Premium plans" : "Manage or upgrade"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
