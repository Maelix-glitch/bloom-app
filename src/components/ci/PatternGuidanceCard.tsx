import { useMemo, useState } from "react";
import { HeartPulse, X } from "lucide-react";
import { Card, SectionHead } from "./primitives";
import {
  cyclePatterns,
  dismissPattern,
  loadPatternDismissals,
  visiblePatterns,
} from "@/lib/cycle/patternGuidance";
import type { CycleAnalysis, PeriodLog } from "@/lib/cycle/predict";
import type { DayLog } from "@/lib/cycle/dayLogs";

/**
 * Pattern guidance (Wave B9) — the gentle red-flag layer. Renders only when
 * a researched pattern is present in the person's own record and hasn't
 * been dismissed; each notice is shown once per pattern, ever, on this
 * device. Always paired with the history/export offer. Free, always.
 */
export function PatternGuidanceCard({
  logs,
  days,
  analysis,
  expecting,
  personalMaxPlausible,
  today,
}: {
  logs: PeriodLog[];
  days: DayLog[];
  analysis: CycleAnalysis;
  expecting: boolean;
  personalMaxPlausible: number;
  today: string;
}) {
  const [dismissed, setDismissed] = useState<Record<string, string>>(loadPatternDismissals);
  const notices = useMemo(
    () =>
      visiblePatterns(
        cyclePatterns({ logs, days, analysis, expecting, personalMaxPlausible }),
        dismissed,
      ),
    [logs, days, analysis, expecting, personalMaxPlausible, dismissed],
  );

  if (notices.length === 0) return null;

  return (
    <Card data-testid="pattern-guidance">
      <SectionHead
        eyebrow="Worth knowing"
        title="Patterns in your record"
        note="Bloom reads patterns, it doesn't diagnose. If something here sounds familiar, it's written to take to a doctor — your full history is under History, and you can export it any time to bring along."
      />
      <div className="mt-3 space-y-3">
        {notices.map((notice) => (
          <div key={notice.id} className="ci-flag" data-tone="calm">
            <HeartPulse size={16} className="ci-flag__icon" aria-hidden />
            <div className="min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[13.5px] font-medium" style={{ color: "var(--ci-text)" }}>
                  {notice.title}
                </p>
                <button
                  type="button"
                  className="ci-btn ci-btn--sm ci-btn--ghost"
                  aria-label={`Dismiss: ${notice.title}`}
                  onClick={() => {
                    dismissPattern(notice.id, today);
                    setDismissed(loadPatternDismissals());
                  }}
                >
                  <X size={13} aria-hidden />
                </button>
              </div>
              <p className="mt-1 text-[12.5px] leading-relaxed ci-soft">{notice.body}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
