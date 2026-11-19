import { useMemo } from "react";
import { premenstrualLine, premenstrualPatterns } from "@/lib/cycle/pmsPatterns";
import type { PeriodLog } from "@/lib/cycle/predict";
import type { DayLog } from "@/lib/cycle/dayLogs";

/**
 * "Before your period" (Wave C12) — what repeats in the five days before
 * each period, counted across cycles. Counts only: the card says what the
 * log shows and nothing about why.
 */
export function PmsPatternCard({ logs, days }: { logs: PeriodLog[]; days: DayLog[] }) {
  const view = useMemo(() => premenstrualPatterns(logs, days), [logs, days]);

  if (view.cyclesTotal < 2) {
    return (
      <p className="text-[12.5px] leading-relaxed ci-soft">
        This view compares the five days before each period across cycles — it needs at least two
        periods after your first before a repeat can show.
      </p>
    );
  }

  const hasContent = view.symptoms.length > 0 || view.lowMoodCycles >= 2;
  if (!hasContent) {
    return (
      <p className="text-[12.5px] leading-relaxed ci-soft">
        Nothing repeats yet. A symptom needs to show up in the run-up to at least two of your{" "}
        {view.cyclesTotal} periods before it appears here.
      </p>
    );
  }

  return (
    <div data-testid="pms-patterns">
      <p className="text-[12.5px] leading-relaxed ci-soft">
        The five days before each period, across your last {view.cyclesTotal}{" "}
        {view.cyclesTotal === 1 ? "cycle" : "cycles"} — what keeps showing up there:
      </p>
      <ul className="mt-2.5 space-y-2">
        {view.symptoms.map((p) => (
          <li
            key={p.symptom}
            className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5"
          >
            <span className="text-[13px] capitalize" style={{ color: "var(--ci-text)" }}>
              {p.symptom}
            </span>
            <span className="text-[12px] ci-muted">{premenstrualLine(p)}</span>
          </li>
        ))}
        {view.lowMoodCycles >= 2 ? (
          <li className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <span className="text-[13px]" style={{ color: "var(--ci-text)" }}>
              Low or rough mood
            </span>
            <span className="text-[12px] ci-muted">
              In the run-up to {view.lowMoodCycles} of your {view.cyclesTotal} periods
            </span>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
