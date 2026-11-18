/**
 * TrainerSection — the "Trainer & clinician" card on Profile.
 *
 * Three honest pieces, in the order a person meets them:
 *
 *   · the referral code a trainer shares with clients (created once
 *     from the account id; the 30%-of-received, ₹1,000-threshold
 *     model is stated in plain words, not fine print);
 *   · the consent switch for the share summary — OFF by default, and
 *     while it is off the preview shows nothing of the record at all;
 *   · a trainer's target proposal, when one is waiting: labelled
 *     with its proposer, inert until the person confirms or
 *     dismisses it here. A confirmed proposal stays visible, labelled
 *     as trainer-proposed and confirmed by the person.
 *
 * Nothing here invents a number: the preview renders exactly the
 * rows lib/trainer/summary composed from the real record.
 */

import { useEffect, useRef, useState } from "react";

import { Switch } from "@/components/ui/switch";
import { useTrainerPro } from "@/hooks/useTrainerPro";
import { formatReferralCode } from "@/lib/trainer/referral";

import "@/styles/billing.css";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function TrainerSection({ userId }: { userId: string | null }) {
  const trainer = useTrainerPro();
  const { state, summary } = trainer;
  const [code, setCode] = useState<string | null>(state.referralCode);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current);
    },
    [],
  );

  /* Copy the code exactly as displayed (prefix included — the entry
     side accepts it in that form). Clipboard API first, with the
     legacy textarea path as the fallback for older browsers. */
  const copyCode = async () => {
    if (!code) return;
    const text = formatReferralCode(code);
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      }
      area.remove();
    }
    if (!ok) return;
    setCopied(true);
    if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current);
    copiedTimer.current = window.setTimeout(() => setCopied(false), 2000);
  };

  /* The code is created on first view of this section — once, from
     the account id — and read from the record ever after. */
  useEffect(() => {
    if (state.referralCode) {
      setCode(state.referralCode);
      return;
    }
    if (userId) setCode(trainer.ensureCode(userId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, state.referralCode]);

  const pending = state.pendingOverride;
  const confirmed = state.confirmedOverride;

  return (
    <div className="pf-card pf-card--pad">
      <div className="pf-section-head">
        <div>
          <p className="pf-eyebrow">Work with a professional</p>
          <h2 className="pf-title">Trainer &amp; clinician</h2>
        </div>
      </div>

      <p className="text-[length:var(--text-callout)] text-[color:var(--text-secondary)]">
        If a trainer or clinician helps you, Bloom can meet them halfway — a code that credits
        them when their clients join, and a summary of your record that only exists while you
        allow it.
      </p>

      {/* Referral code */}
      <div className="mt-5">
        <p className="pf-eyebrow">Your trainer referral code</p>
        {code ? (
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <p className="mono text-[length:var(--text-title)] tracking-[var(--tracking-meta)] text-foreground">
              {formatReferralCode(code)}
            </p>
            <button
              type="button"
              className="bill-btn shrink-0"
              style={{ minHeight: 44 }}
              onClick={() => void copyCode()}
              aria-live="polite"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        ) : (
          <p className="mt-1 text-[length:var(--text-callout)] text-muted-foreground">
            {userId ? "Preparing your code…" : "Sign in to get your referral code."}
          </p>
        )}
        <p className="mt-1 text-[length:var(--text-caption)] leading-[var(--leading-body)] text-muted-foreground">
          A trainer earns 30% of what Bloom actually receives from clients who join with their
          code, paid monthly once a month&apos;s commission reaches ₹1,000.
        </p>
      </div>

      {/* Consent + share summary preview */}
      <div className="mt-6 border-t border-border-subtle pt-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="pf-eyebrow">Share summary</p>
            <p className="mt-1 text-[length:var(--text-callout)] text-[color:var(--text-secondary)]">
              A one-page summary of your record for your trainer or clinician.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-[length:var(--text-caption)] text-muted-foreground">
              {state.consentToShare ? "Sharing on" : "Sharing off"}
            </span>
            <Switch
              aria-label="Share summary"
              checked={state.consentToShare}
              onCheckedChange={(on) => trainer.setConsent(on)}
            />
          </div>
        </div>

        {state.consentToShare && summary ? (
          <>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3">
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
            <p className="mt-3 text-[length:var(--text-caption)] leading-[var(--leading-body)] text-muted-foreground">
              This summary exists only while sharing is on, and only here on your Profile —
              Bloom does not send it anywhere. You show it to your trainer or clinician
              yourself.
            </p>
          </>
        ) : (
          <p className="mt-3 text-[length:var(--text-caption)] leading-[var(--leading-body)] text-muted-foreground">
            Sharing is off. Nothing about your record is prepared or sent anywhere while this
            stays off — turning it on shows you the exact summary first.
          </p>
        )}
      </div>

      {/* Trainer-proposed targets */}
      {pending ? (
        <div className="mt-6 border-t border-border-subtle pt-5">
          <p className="pf-eyebrow">Proposed targets — waiting for you</p>
          <p className="mt-1 text-[length:var(--text-callout)] text-[color:var(--text-secondary)]">
            {pending.proposedBy} proposed ~{pending.kcal.toLocaleString("en-IN")} kcal and ~
            {pending.proteinG} g protein a day, on {formatDate(pending.proposedAt)}.
            {pending.note ? ` Their note: “${pending.note}”` : ""} Nothing has changed — these
            apply only if you confirm them.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="bill-btn bill-btn-gold" onClick={trainer.confirmOverride}>
              Confirm these targets
            </button>
            <button type="button" className="bill-btn" onClick={trainer.dismissOverride}>
              Dismiss
            </button>
          </div>
        </div>
      ) : confirmed ? (
        <div className="mt-6 border-t border-border-subtle pt-5">
          <p className="pf-eyebrow">Trainer-proposed targets</p>
          <p className="mt-1 text-[length:var(--text-callout)] text-[color:var(--text-secondary)]">
            ~{confirmed.kcal.toLocaleString("en-IN")} kcal and ~{confirmed.proteinG} g protein a
            day — proposed by {confirmed.proposedBy}, confirmed by you on{" "}
            {formatDate(confirmed.confirmedAt)}.
          </p>
        </div>
      ) : null}
    </div>
  );
}
