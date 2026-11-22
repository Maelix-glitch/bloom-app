/**
 * PlusGate — the full-page invitation a Premium Plus surface shows
 * a member whose KNOWN entitlement is below Plus (M-214).
 *
 * One component so every gated page refuses the same way: the
 * surface's own name, one honest paragraph about where the feature
 * lives, and the button that opens the Membership sheet. An unread
 * entitlement never reaches this component — callers render it only
 * on a ready state that fails canUse, per the house rule that an
 * entitlement that could not be read must never block.
 *
 * Presentation only: these surfaces compute on-device from the
 * person's own record, so there is no server read to refuse. The
 * one Plus feature with a server gate is Vitalis (the coach edge
 * function refuses it) — see M-214's registry entry.
 */

import { Link } from "@tanstack/react-router";

import { BloomLogo } from "@/components/BloomLogo";
import { requestPaywall } from "@/lib/billing/paywall";

export function PlusGate({ title, body }: { title: string; body: string }) {
  return (
    <div className="app-shell min-h-screen bg-background text-foreground">
      <main className="min-w-0 px-5 pb-28 pt-5 sm:px-8 sm:pt-6 lg:px-10 lg:pb-16 lg:pt-7">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-[length:var(--text-callout)] text-muted-foreground"
        >
          <BloomLogo size={20} /> Back to Today
        </Link>
        <h1 className="display mt-10 max-w-[22ch] text-[length:var(--text-display)] leading-[var(--leading-display)]">
          {title}
        </h1>
        <p className="mt-4 max-w-[58ch] text-[length:var(--text-body)] leading-[var(--leading-body)] text-muted-foreground">
          {body}
        </p>
        <button
          type="button"
          className="bill-btn bill-btn-gold mt-8"
          onClick={() => requestPaywall("premium_plus")}
        >
          See Premium Plus
        </button>
      </main>
    </div>
  );
}
