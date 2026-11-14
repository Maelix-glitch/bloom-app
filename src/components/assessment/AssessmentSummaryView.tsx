/**
 * The assessment summary, readable on its own: what the person told Bloom,
 * section by section, what the safety classifier made of it (in the domain's
 * own words), and whether a plan could start from it. Shared by the flow's
 * final step and the Profile view, so the two can never drift apart.
 */

import { AlertTriangle, Check } from "lucide-react";

import { cn } from "@/lib/utils";
import type { AssessmentSummary } from "@/lib/assessment/summary";

const STATE_LABEL = {
  complete: "Complete",
  partial: "Partly answered",
  missing: "Not answered",
} as const;

export function AssessmentSummaryView({ summary }: { summary: AssessmentSummary }) {
  const urgent = summary.safety.classification === "urgent_escalation";
  const review = summary.safety.classification === "professional_review_required";

  return (
    <div className="flex flex-col gap-5">
      <p className="text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
        Completed{" "}
        {new Date(summary.completedAt).toLocaleDateString(undefined, {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
        . This is what Bloom holds from your assessment. Retaking it updates the summary.
      </p>

      {urgent || review ? (
        <div className="rounded-2xl border border-rose/40 bg-rose/10 px-4 py-3.5" role="alert">
          <p className="flex items-start gap-2 text-[length:var(--text-support)] font-medium leading-[var(--leading-body)] text-foreground">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose" aria-hidden />
            {summary.safety.headline}
          </p>
          {summary.safety.findings.length > 0 ? (
            <ul className="mt-2 flex list-none flex-col gap-1.5 pl-6">
              {summary.safety.findings.map((finding) => (
                <li
                  key={finding}
                  className="text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground"
                >
                  {finding}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-surface-2 px-4 py-3.5">
          <p className="flex items-start gap-2 text-[length:var(--text-support)] leading-[var(--leading-body)] text-foreground">
            <Check className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
            {summary.safety.headline}
          </p>
          {summary.safety.findings.length > 0 ? (
            <ul className="mt-2 flex list-none flex-col gap-1.5 pl-6">
              {summary.safety.findings.map((finding) => (
                <li
                  key={finding}
                  className="text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground"
                >
                  {finding}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {summary.sections.map((section) => (
          <section
            key={section.section}
            className="rounded-2xl border border-border bg-surface-2 px-4 py-3.5"
            aria-label={section.title}
          >
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-display text-[length:var(--text-card)] text-foreground">
                {section.title}
              </h3>
              <span
                className={cn(
                  "shrink-0 text-[length:var(--text-meta)] font-medium uppercase tracking-[var(--tracking-meta)]",
                  section.state === "complete" ? "text-gold" : "text-faint",
                )}
              >
                {STATE_LABEL[section.state]}
              </span>
            </div>
            {section.lines.length > 0 ? (
              <ul className="mt-1.5 flex list-none flex-col gap-1">
                {section.lines.map((line) => (
                  <li
                    key={line}
                    className="text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground"
                  >
                    {line}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1.5 text-[length:var(--text-support)] leading-[var(--leading-body)] text-faint">
                Nothing recorded here yet.
              </p>
            )}
          </section>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-surface-2 px-4 py-3.5">
        <p className="text-[length:var(--text-meta)] font-medium uppercase tracking-[var(--tracking-meta)] text-muted-foreground">
          For your plan
        </p>
        <p className="mt-1.5 text-[length:var(--text-support)] leading-[var(--leading-body)] text-foreground">
          {summary.plan.note}
        </p>
      </div>

      <p className="text-[length:var(--text-caption)] leading-[var(--leading-body)] text-faint">
        {summary.safety.disclaimer}
      </p>
    </div>
  );
}
