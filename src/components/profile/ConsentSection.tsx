/**
 * Your consent — the settings face of the Assessment's consent step.
 *
 * The Assessment opens by asking two permissions and stores each decision as
 * a ConsentRecord in the assessment state (`health.assessment.v1`, synced
 * through user_prefs like the answers themselves). Until now those records
 * were write-only from the person's side: Bloom kept them, but the person
 * could never see them. This row reports them. It reads the same prefs
 * the flow writes, uses the domain's own effective-state rule (a grant
 * made under an older version of the wording no longer counts) and the
 * flow's own copy for what each permission covers. The health-data
 * answers still change only in the Assessment — but the AI-explanations
 * permission (M-232) is switchable right here: the Assessment never
 * asks it, the just-in-time ask in Coach / Vitalis points back to this
 * row, and this is where a "not now" can be undone. Removing the whole
 * record still happens through Erase everything.
 */

import { useState } from "react";
import { IconChevronDown, IconChevronRight, IconShieldCheck } from "@/components/profile/SettingsIcons";

import { Button } from "@/components/ui/button";
import { useAssessment } from "@/hooks/useAssessment";
import {
  CONSENT_COPY,
  CONSENT_PURPOSES,
  consentDecision,
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
  return new Date(iso).toLocaleDateString("en-IN", {
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
    return `Given${when}, under an earlier version of these permissions, it no longer counts, and Bloom will ask again`;
  }
  return "Not given";
}

export function ConsentSection() {
  const { state, recordConsents } = useAssessment();
  const [open, setOpen] = useState(false);
  const records = state.consents;
  const aiState = consentState(records, "ai_assistance");

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
     exists for — in the domain's canonical order. ai_assistance is the one
     exception: it gets its own block below, with the switch. */
  const shown = CONSENT_PURPOSES.filter(
    (purpose) =>
      purpose !== "ai_assistance" &&
      (ASKED_PURPOSES.includes(purpose) || latestFor(records, purpose) !== undefined),
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
          <IconShieldCheck />
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
          <IconChevronDown className="pf-row-chevron" />
        ) : (
          <IconChevronRight className="pf-row-chevron" />
        )}
      </button>
      {open ? (
        <div className="pf-confirm" data-testid="pf-consent-detail">
          {records.length === 0 ? (
            <p className="text-[length:var(--text-caption)] leading-relaxed text-muted-foreground">
              You haven&rsquo;t been asked for any health-data permissions yet. Bloom asks at the
              start of your Assessment, before any answers are saved, you can begin it from the
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
                To change a health-data answer, retake your Assessment. Erasing everything, in
                Sharing &amp; data, below, removes this record along with the rest of your data.
              </p>
            </>
          )}

          {/* AI explanations (M-232): the one permission this section can
              change. The Assessment never asks it — Coach and Vitalis ask
              just-in-time, and this switch is the standing control the
              ask points to. The provider line is the Privacy page's own
              account of what is sent and to whom. */}
          <div className="mt-4 border-t border-border/60 pt-3.5" data-testid="pf-consent-ai">
            <p className="text-[length:var(--text-caption)] font-medium leading-snug text-foreground">
              {CONSENT_COPY.ai_assistance.label}
            </p>
            <p className="mt-0.5 text-[length:var(--text-caption)] leading-snug text-muted-foreground">
              {CONSENT_COPY.ai_assistance.description} Coach and Vitalis send your message and the
              parts of your record a reply needs to Bloom&rsquo;s AI providers; if a reply is
              spoken aloud, its text goes to ElevenLabs, which provides the voice.
            </p>
            <p className="mt-0.5 text-[length:var(--text-caption)] leading-snug text-muted-foreground">
              {statusLine(records, "ai_assistance")}
            </p>
            <div className="mt-2.5">
              {aiState === "granted" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  data-testid="pf-consent-ai-off"
                  onClick={() => recordConsents([consentDecision("ai_assistance", false)])}
                >
                  Turn off
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  data-testid="pf-consent-ai-on"
                  onClick={() => recordConsents([consentDecision("ai_assistance", true)])}
                >
                  Allow AI explanations
                </Button>
              )}
            </div>
            <p className="mt-2 text-[length:var(--text-caption)] leading-relaxed text-muted-foreground">
              You can change this here any time, it takes effect right away.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
