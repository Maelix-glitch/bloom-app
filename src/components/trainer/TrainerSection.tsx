/**
 * TrainerSection — the "Trainer & clinician" card on Profile.
 *
 * Built as settings rows (owner spec, 2026-11-18): a title and ONE
 * microcopy line per feature on the left, the control on the right,
 * hairline dividers instead of stacked boxes. The section answers
 * "what is this, what's my status, what can I do" in a scan — prose
 * no longer does the layout's job, and nothing is explained twice.
 *
 *   · Share summary — the consent switch, OFF by default. Turning it
 *     on reveals the exact summary (built locally, only ever shown
 *     here); while it is off, no summary exists at all.
 *   · Trainer-proposed targets, when one exists: its own block
 *     below, labelled with its proposer, inert until the person
 *     confirms or dismisses it here. A confirmed proposal stays
 *     visible, labelled as trainer-proposed and confirmed by the
 *     person.
 *
 * The referral code is NOT here any more (M-171, 2026-11-21). This
 * card used to derive one locally from the account id and show it to
 * every signed-in person; the owner's ruling is that trainer status
 * is admin-granted and server-held, so the code now lives in
 * TrainerReferralSection — rendered only for accounts the database
 * lists as trainers, showing the server-issued code and the client
 * list. Nothing here invents a number: the preview renders exactly
 * the rows lib/trainer/summary composed from the real record.
 */

import { Switch } from "@/components/ui/switch";
import { useTrainerPro } from "@/hooks/useTrainerPro";

import "@/styles/billing.css";
import "@/styles/trainer.css";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function TrainerSection() {
  const trainer = useTrainerPro();
  const { state, summary } = trainer;

  const pending = state.pendingOverride;
  const confirmed = state.confirmedOverride;

  return (
    <div className="pf-card trn-card">
      <div className="pf-section-head">
        <div>
          <p className="pf-eyebrow">Work with a professional</p>
          <h2 className="pf-title">Trainer &amp; clinician</h2>
        </div>
      </div>

      <p className="trn-intro">Bring your professional into Bloom, on your terms.</p>

      {/* Share summary */}
      <div className="trn-row">
        <div className="trn-row-line">
          <div className="trn-row-main">
            <h3 className="trn-row-title">Share summary</h3>
            <p className="trn-row-copy">
              A one-page summary of your record for your trainer or clinician, visible only while
              sharing is on.
            </p>
          </div>
          <div className="trn-row-control trn-switch-control">
            <span className="trn-state">{state.consentToShare ? "Sharing on" : "Sharing off"}</span>
            <Switch
              aria-label="Share summary"
              checked={state.consentToShare}
              onCheckedChange={(on) => trainer.setConsent(on)}
            />
          </div>
        </div>

        {state.consentToShare && summary ? (
          <div className="trn-preview">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
              {summary.rows.map((row) => (
                <div key={row.label}>
                  <dt className="text-[length:var(--text-caption)] text-muted-foreground">
                    {row.label}
                  </dt>
                  <dd className="mt-0.5 text-[length:var(--text-callout)] text-foreground">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
              Built here, shown only on your Profile. Bloom does not send it anywhere. You show it
              to your trainer or clinician yourself.
            </p>
          </div>
        ) : null}
      </div>

      {/* Trainer-proposed targets */}
      {pending ? (
        <div className="trn-row">
          <p className="pf-eyebrow">Proposed targets, waiting for you</p>
          <p className="mt-1 text-[length:var(--text-callout)] text-[color:var(--text-secondary)]">
            {pending.proposedBy} proposed ~{pending.kcal.toLocaleString("en-IN")} kcal and ~
            {pending.proteinG} g protein a day, on {formatDate(pending.proposedAt)}.
            {pending.note ? ` Their note: “${pending.note}”` : ""} Nothing has changed, these apply
            only if you confirm them.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="bill-btn bill-btn-gold"
              onClick={trainer.confirmOverride}
            >
              Confirm these targets
            </button>
            <button type="button" className="bill-btn" onClick={trainer.dismissOverride}>
              Dismiss
            </button>
          </div>
        </div>
      ) : confirmed ? (
        <div className="trn-row">
          <p className="pf-eyebrow">Trainer-proposed targets</p>
          <p className="mt-1 text-[length:var(--text-callout)] text-[color:var(--text-secondary)]">
            ~{confirmed.kcal.toLocaleString("en-IN")} kcal and ~{confirmed.proteinG} g protein a day, proposed by {confirmed.proposedBy}, confirmed by you on{" "}
            {formatDate(confirmed.confirmedAt)}.
          </p>
        </div>
      ) : null}
    </div>
  );
}
