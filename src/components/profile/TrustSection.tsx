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
 *
 * Below the claims, the same expanded view carries the evidence ledger's
 * coverage: every rule the nutrition engine runs, with the state the
 * registry itself reports for it — checked against its source, blocked
 * by a licence, or still an unverified draft. That block renders ONLY
 * from the evidence registry (`evidenceCoverage` over the catalogue), so
 * it cannot flatter the engine either: a rule whose citation nobody has
 * verified shows as exactly that.
 */

import { useState } from "react";
import { IconChevronDown, IconChevronRight, IconVerified } from "@/components/profile/SettingsIcons";

import { TRUST_CLAIMS } from "@/lib/trust/claims";
import { CATALOG } from "@/lib/vitalis/evidence/catalog";
import {
  evidenceCoverage,
  type RecommendationEvidenceState,
} from "@/lib/vitalis/evidence/registry";

const EVIDENCE_STATE_LINE: Record<RecommendationEvidenceState, string> = {
  ready: "Checked against its source — and licensed for use in Bloom.",
  blocked:
    "Checked against its source, but Bloom is not licensed to use that source in the app yet.",
  unverified:
    "Recorded honestly — no source has been verified for this yet, so Bloom does not present it as evidence-based.",
};

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
          <IconVerified />
        </span>
        <span className="pf-row-text">
          <span className="pf-row-label">Trust &amp; security</span>
          <span className="pf-row-hint">
            How Bloom protects your data and your money — and how each line is checked
          </span>
        </span>
        <span className="pf-row-value">Verified</span>
        {open ? (
          <IconChevronDown className="pf-row-chevron" />
        ) : (
          <IconChevronRight className="pf-row-chevron" />
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
            Every line above is checked by Bloom&rsquo;s own guard tests against the code that makes
            it true — a protection that stops being true takes its line with it.
          </p>
          <div className="mt-5" data-testid="pf-evidence-detail">
            <p className="text-[length:var(--text-caption)] font-medium leading-snug text-foreground">
              The evidence behind your numbers
            </p>
            <p className="mt-0.5 text-[length:var(--text-caption)] leading-snug text-muted-foreground">
              Every rule your targets and plan are built with, and where it stands. A rule is
              recorded even when its source is not verified yet — and labelled that way, not dressed
              up.
            </p>
            <div className="mt-3 flex flex-col gap-3.5">
              {evidenceCoverage(CATALOG).map((row) => (
                <div key={row.recommendationId}>
                  <p className="text-[length:var(--text-caption)] leading-snug text-foreground">
                    {row.statement}
                  </p>
                  <p className="mt-0.5 text-[length:var(--text-caption)] leading-snug text-muted-foreground">
                    {EVIDENCE_STATE_LINE[row.state]}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
