/**
 * Your consent — the settings face of the Assessment's consent step.
 *
 * The Assessment opens by asking two permissions and stores each decision as
 * a ConsentRecord in the assessment state (`health.assessment.v1`, synced
 * through user_prefs like the answers themselves). Until now those records
 * were write-only from the person's side: Bloom kept them, but the person
 * could never see them. This row reports them — nothing more. It reads the
 * same prefs the flow writes, uses the domain's own effective-state rule
 * (a grant made under an older version of the wording no longer counts) and
 * the flow's own copy for what each permission covers, and it offers no
 * action of its own: changing an answer happens in the Assessment, and
 * removing the record happens through Erase everything.
 */

import { useState } from "react";
import { ChevronDown, ChevronRight, ShieldCheck } from "lucide-react";

import { useAssessment } from "@/hooks/useAssessment";
import {
  CONSENT_COPY,
  CONSENT_PURPOSES,
  consentState,
  type ConsentPurpose,
  type ConsentRecord,
} from "@/lib/vitalis/domain/consent";

/** The permissions the Assessment actually asks for, in the order it asks. */
const ASKED_PURPOSES: readonly ConsentPurpose[] = [
  "health_data_processing",
  "sensitive_health_processing",
];

/** The date format the settings list already uses ("Tracking since"). */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function latestFor(
  records: readonly ConsentRecord[],
  purpose: ConsentPurpose,
): ConsentRecord | undefined {
  return records.filter((r) => r.purpose === purpose).at(-1);
}

/**
 * One line of truth about a single permission, taken from its stored record:
 * the decision, and the date the record itself carries. A record without a
 * date is reported without one — no date is ever invented here.
 */
function statusLine(records: readonly ConsentRecord[], purpose: ConsentPurpose): string {
  const latest = latestFor(records, purpose);
  if (!latest) return "Not given";
  const when = latest.decidedAt ? ` on ${formatDate(latest.decidedAt)}` : "";
  const effective = consentState(records, purpose);
  if (effective === "granted") return `Given${when}`;
  if (effective === "withdrawn") return `Withdrawn${when}`;
  /* Effective state is not_asked but a grant sits behind it: the wording
     changed after the decision, so the old grant no longer counts. */
  if (latest.state === "granted") {
    return `Given${when}, under an earlier version of these permissions — it no longer counts, and Bloom will ask again`;
  }
  return "Not given";
}

export function ConsentSection() {
  const { state } = useAssessment();
  const [open, setOpen] = useState(false);
  const records = state.consents;

  const health = consentState(records, "health_data_processing");
  const value =
    records.length === 0
      ? "None yet"
      : health === "granted"
        ? "Given"
        : health === "withdrawn"
          ? "Withdrawn"
          : "Not given";

  /* The two permissions the Assessment asks, plus any other purpose a record
     exists for — in the domain's canonical order. */
  const shown = CONSENT_PURPOSES.filter(
    (purpose) => ASKED_PURPOSES.includes(purpose) || latestFor(records, purpose) !== undefined,
  );

  return (
    <>
      <button
        type="button"
        className="pf-row"
        data-testid="pf-row-consent"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="pf-row-icon" aria-hidden>
          <ShieldCheck className="size-3.5" />
        </span>
        <span className="pf-row-text">
          <span className="pf-row-label">Your consent</span>
          <span className="pf-row-hint">
            {records.length === 0
              ? "Bloom asks before it saves any health answers"
              : "What you allowed Bloom to do with your health data, and when"}
          </span>
        </span>
        <span className="pf-row-value">{value}</span>
        {open ? (
          <ChevronDown className="pf-row-chevron size-3.5" aria-hidden />
        ) : (
          <ChevronRight className="pf-row-chevron size-3.5" aria-hidden />
        )}
      </button>
      {open ? (
        <div className="pf-confirm" data-testid="pf-consent-detail">
          {records.length === 0 ? (
            <p className="text-[length:var(--text-caption)] leading-relaxed text-muted-foreground">
              You haven&rsquo;t been asked for any health-data permissions yet. Bloom asks at the
              start of your Assessment, before any answers are saved — you can begin it from the
              Assessment card on this page.
            </p>
          ) : (
            <>
              <ul className="flex flex-col gap-3.5">
                {shown.map((purpose) => (
                  <li key={purpose}>
                    <p className="text-[length:var(--text-caption)] font-medium leading-snug text-foreground">
                      {CONSENT_COPY[purpose].label}
                    </p>
                    <p className="mt-0.5 text-[length:var(--text-caption)] leading-snug text-muted-foreground">
                      {CONSENT_COPY[purpose].description}
                    </p>
                    <p className="mt-0.5 text-[length:var(--text-caption)] leading-snug text-muted-foreground">
                      {statusLine(records, purpose)}
                    </p>
                  </li>
                ))}
              </ul>
              <p className="mt-3.5 text-[length:var(--text-caption)] leading-relaxed text-muted-foreground">
                To change an answer, retake your Assessment. Erasing everything — in Sharing &amp;
                data, below — removes this record along with the rest of your data.
              </p>
            </>
          )}
        </div>
      ) : null}
    </>
  );
}
