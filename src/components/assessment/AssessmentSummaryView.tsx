/**
 * The assessment summary, readable on its own: what the person told Bloom,
 * section by section, what the safety classifier made of it (in the domain's
 * own words), and whether a plan could start from it. Shared by the flow's
 * final step and the Profile view, so the two can never drift apart.
 *
 * Anti-document form (brief v3, Slice 5): the intro is a `.note`; each
 * section's scalar answers lead as value-first `.vstat`s (the lib hands
 * them over as `stats`, built from the same answers as the prose lines —
 * the stat replaces its line here, the line list itself is unchanged);
 * list-shaped and sentence-shaped answers stay as list lines under the
 * stats. Section state is a badge, not a sentence.
 */

import { AlertTriangle, Check, Info, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { fmtDate } from "@/lib/format";
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
      <div className="note">
        <Info className="size-4" aria-hidden />
        <span>
          Completed {fmtDate(summary.completedAt)}. This is what Bloom holds from your
          assessment. Retaking it updates the summary.
        </span>
      </div>

      {urgent || review ? (
        <div className="assess-box border-rose/40 bg-rose/10" role="alert">
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
        <div className="assess-box border-border bg-surface-2">
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
        {summary.sections.map((section) => {
          const statLines = new Set(section.stats.map((s) => s.line));
          const restLines = section.lines.filter((line) => !statLines.has(line));
          return (
            <section
              key={section.section}
              className="assess-box border-border bg-surface-2"
              aria-label={section.title}
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-display text-[length:var(--text-card)] text-foreground">
                  {section.title}
                </h3>
                <span
                  className={cn(
                    "assess-state shrink-0 text-[length:var(--text-meta)] font-medium uppercase tracking-[var(--tracking-meta)]",
                    section.state === "complete" ? "text-gold" : "text-faint",
                  )}
                >
                  {STATE_LABEL[section.state]}
                </span>
              </div>
              {section.stats.length > 0 ? (
                <div className="vstats mt-3">
                  {section.stats.map((stat) => (
                    <div key={stat.label} className="vstat">
                      <b>{stat.value}</b>
                      <span>{stat.label}</span>
                    </div>
                  ))}
                </div>
              ) : null}
              {restLines.length > 0 ? (
                <ul className="mt-1.5 flex list-none flex-col gap-1">
                  {restLines.map((line) => (
                    <li
                      key={line}
                      className="text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground"
                    >
                      {line}
                    </li>
                  ))}
                </ul>
              ) : section.stats.length === 0 ? (
                <p className="mt-1.5 text-[length:var(--text-support)] leading-[var(--leading-body)] text-faint">
                  Nothing recorded here yet.
                </p>
              ) : null}
            </section>
          );
        })}
      </div>

      <div className="assess-box border-border bg-surface-2">
        <div className="flex items-center gap-2 text-[length:var(--text-meta)] font-medium uppercase tracking-[var(--tracking-meta)] text-muted-foreground">
          <Sparkles className="size-3.5 text-gold" aria-hidden />
          For your plan
        </div>
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
