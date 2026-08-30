/**
 * InsightsPanel — every edge case that currently applies, in plain language.
 * Nothing here diagnoses anything; the late and irregularity notes explicitly
 * point at common, ordinary explanations first.
 */

import {
  Activity,
  CalendarClock,
  CalendarPlus,
  Check,
  Info,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

import { Card, SectionHead } from "./primitives";
import type { CycleAnalysis, InsightFlag } from "@/lib/cycle/predict";

function iconFor(flag: InsightFlag): LucideIcon {
  switch (flag.kind) {
    case "anomaly":
      return CalendarPlus;
    case "late":
      return CalendarClock;
    case "variability":
      return Activity;
    case "trend":
      return flag.title.startsWith("Your cycles have been getting longer")
        ? TrendingUp
        : TrendingDown;
    default:
      return Info;
  }
}

export function InsightsPanel({
  analysis,
  onAddSuggested,
  compact = false,
}: {
  analysis: CycleAnalysis;
  onAddSuggested?: ((start: string) => void) | undefined;
  compact?: boolean;
}) {
  const flags = analysis.flags;

  return (
    <Card>
      <SectionHead
        eyebrow="Insights"
        title="What stands out in your record"
        note={
          flags.length > 0
            ? "Each note below is triggered by something specific in your data — and disappears when it stops being true."
            : undefined
        }
      />

      <div className={compact ? "mt-3 space-y-2.5" : "mt-4 space-y-3"}>
        {flags.length === 0 ? (
          <div className="ci-flag" data-tone="calm">
            <Check size={16} className="ci-flag__icon" aria-hidden />
            <div>
              <p className="text-[13.5px] font-medium">Nothing to flag right now</p>
              <p className="mt-1 text-[12.5px] leading-relaxed ci-soft">
                No missing entries, no impossible gaps, no lateness. Your predictions below are
                doing what they can with what you've logged.
              </p>
            </div>
          </div>
        ) : (
          flags.map((flag) => {
            const Icon = iconFor(flag);
            return (
              <div key={flag.id} className="ci-flag" data-tone={flag.tone}>
                <Icon size={16} className="ci-flag__icon" aria-hidden />
                <div>
                  <p className="text-[13.5px] font-medium leading-snug">{flag.title}</p>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed ci-soft">{flag.body}</p>
                  {flag.action && onAddSuggested ? (
                    <button
                      type="button"
                      className="ci-btn ci-btn--sm mt-3"
                      onClick={() => onAddSuggested(flag.action!.start)}
                    >
                      <CalendarPlus size={13} aria-hidden />
                      {flag.action.label}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
