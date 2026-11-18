/**
 * Trust & security — the protections Bloom actually runs, in plain words.
 *
 * This row renders ONLY from the claims registry (`src/lib/trust/claims`),
 * and every claim there is pinned by a verification test against the code
 * that makes it true (server-side grants, the coach function's gate
 * order, a scan of the shipped source, the export/erase paths, the photo
 * manifest). If a protection is ever removed, its test fails and the
 * claim leaves this list with it — this section cannot quietly promise
 * more than Bloom does.
 *
 * It offers no action of its own: each line points at the surface that
 * backs it, where the person can see for themselves.
 */

import { useState } from "react";
import { BadgeCheck, ChevronDown, ChevronRight } from "lucide-react";

import { TRUST_CLAIMS } from "@/lib/trust/claims";

export function TrustSection() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="pf-row"
        data-testid="pf-row-trust"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="pf-row-icon" aria-hidden>
          <BadgeCheck className="size-3.5" />
        </span>
        <span className="pf-row-text">
          <span className="pf-row-label">Trust &amp; security</span>
          <span className="pf-row-hint">
            How Bloom protects your data and your money — and how each line is checked
          </span>
        </span>
        <span className="pf-row-value">Verified</span>
        {open ? (
          <ChevronDown className="pf-row-chevron size-3.5" aria-hidden />
        ) : (
          <ChevronRight className="pf-row-chevron size-3.5" aria-hidden />
        )}
      </button>
      {open ? (
        <div className="pf-confirm" data-testid="pf-trust-detail">
          <ul className="flex flex-col gap-3.5">
            {TRUST_CLAIMS.map((claim) => (
              <li key={claim.id}>
                <p className="text-[length:var(--text-caption)] leading-snug text-foreground">
                  {claim.line}
                </p>
                <p className="mt-0.5 text-[length:var(--text-caption)] leading-snug text-muted-foreground">
                  Where to see it: {claim.surface}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-3.5 text-[length:var(--text-caption)] leading-relaxed text-muted-foreground">
            Every line above is checked by Bloom&rsquo;s own guard tests against the code that
            makes it true — a protection that stops being true takes its line with it.
          </p>
        </div>
      ) : null}
    </>
  );
}
