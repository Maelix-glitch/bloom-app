/**
 * TrainerReferralSection — "Your trainer code" on Profile (M-171).
 *
 * This section exists ONLY for admin-granted trainers. Trainer status
 * is granted by the owner from a trusted SQL session
 * (admin_grant_trainer, migration 20261121) — there is no self-claim
 * toggle anywhere, and this component renders literally nothing until
 * the server confirms the signed-in account is a trainer. For every
 * other account there is no trace of it: no heading, no placeholder,
 * no disabled teaser.
 *
 * What a trainer gets here:
 *   · Their one permanent code, big and copyable. It never changes
 *     from this screen — re-granting returns the same code, and
 *     changing it is an admin action, not a UI one.
 *   · "My clients": the people who joined with the code — display
 *     name and joined date ONLY, exactly what my_trainer_clients()
 *     returns. Nothing deeper exists to show.
 */

import { useEffect, useRef, useState } from "react";

import { useTrainerReferral } from "@/hooks/useTrainerReferral";
import { formatReferralCode } from "@/lib/trainer/referral";

import "@/styles/billing.css";
import "@/styles/trainer.css";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function TrainerReferralSection() {
  const referral = useTrainerReferral();
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current);
    },
    [],
  );

  /* Not a trainer (or the server hasn't answered, or can't): the
     section does not exist. This early return is the whole privacy
     contract of the feature — it is pinned by guard test. */
  if (referral.kind !== "trainer") return null;

  const { code, clients } = referral;

  /* Copy the code exactly as displayed (prefix included — the entry
     side accepts it in that form). Same clipboard pattern as the rest
     of Profile: API first, legacy textarea fallback. */
  const copyCode = async () => {
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

  return (
    <section
      id="pf-trainer-code"
      className="pf-section pf-jump mt-10"
      aria-label="Your trainer code"
    >
      <div className="pf-card trn-card">
        <div className="pf-section-head">
          <div>
            <p className="pf-eyebrow">For trainers</p>
            <h2 className="pf-title">Your trainer code</h2>
          </div>
        </div>

        <p className="trn-intro">
          Share this code with your clients. When someone joins Bloom and enters it during setup,
          they&rsquo;re linked to you and appear in your list below.
        </p>

        <div className="trnref-code-field">
          <code className="trnref-code">{formatReferralCode(code)}</code>
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

        <div className="trn-row">
          <h3 className="trn-row-title">My clients</h3>
          {clients.length === 0 ? (
            <p className="trn-row-copy">
              Nobody has joined with your code yet — when a client enters it, they&rsquo;ll appear
              here.
            </p>
          ) : (
            <ul className="trnref-clients">
              {clients.map((client) => (
                <li key={`${client.name}-${client.joinedAt}`} className="trnref-client">
                  <span className="trnref-client-name">{client.name}</span>
                  <span className="trnref-client-date">Joined {formatDate(client.joinedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
