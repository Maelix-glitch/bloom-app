/**
 * Cycle Intelligence panels — the overview, the brief, the pattern summary and
 * the evidence-backed insight list.
 *
 * Every figure comes from `analyseCycle`; these components only format it. They
 * deliberately show the sample next to the claim, and a "why" disclosure next
 * to every estimate.
 */

import { ChevronDown, Moon, RefreshCw, Sparkles } from "lucide-react";

import { Button, Card } from "../primitives";
import { longDay, rangeLabel } from "@/lib/cycle/intel/dates";
import { compareRecentCycles } from "@/lib/cycle/intel";
import type { ConfidenceLevel, IntelligenceResult, Insight } from "@/lib/cycle/intel";

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

const CONFIDENCE_TONE: Record<ConfidenceLevel, string> = {
  none: "ci-conf--none",
  low: "ci-conf--low",
  moderate: "ci-conf--moderate",
  good: "ci-conf--good",
};

/* -------------------------------- tabs -------------------------------- */

export type IntelTab = "overview" | "calendar" | "insights" | "history";

export function IntelTabs({
  active,
  onChange,
  counts,
}: {
  active: IntelTab;
  onChange: (tab: IntelTab) => void;
  counts?: Partial<Record<IntelTab, number>>;
}) {
  const tabs: { id: IntelTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "calendar", label: "Calendar" },
    { id: "insights", label: "Insights" },
    { id: "history", label: "History" },
  ];
  return (
    <div className="ci-tabs" role="tablist" aria-label="Cycle sections">
      {tabs.map((tab) => {
        const count = counts?.[tab.id];
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            className="ci-tab"
            data-active={active === tab.id}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
            {count !== undefined && count > 0 ? (
              <span className="ci-tab__count">{count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------ overview ------------------------------ */

export function CycleOverviewPanel({
  intel,
  onLogPeriod,
  onLogSymptoms,
  disabled = false,
}: {
  intel: IntelligenceResult;
  onLogPeriod?: (() => void) | undefined;
  onLogSymptoms?: (() => void) | undefined;
  disabled?: boolean | undefined;
}) {
  const { phase, forecast, confidence, baseline, generatedAt } = intel;

  const status =
    phase.day === null
      ? baseline.starts.length === 0
        ? "Nothing logged yet"
        : phase.label
      : `Cycle day ${phase.day}${phase.expectedLength ? ` of ~${phase.expectedLength}` : ""}`;

  const next = forecast.next
    ? rangeLabel(forecast.next.from, forecast.next.to)
    : "No estimate yet";

  return (
    <Card className="ci-overview">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="ci-eyebrow">Cycle overview</p>
          <h2 className="ci-display mt-1.5 text-[24px] leading-tight sm:text-[30px]">{status}</h2>
          <p className="mt-1.5 text-[12.5px] leading-relaxed ci-soft">
            {phase.key !== null ? `${phase.label} · ` : ""}
            {phase.certainty === "estimated" ? "estimated from your record" : phase.certainty === "observed" ? "recorded" : "not yet placeable"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {onLogPeriod ? (
            <Button variant="primary" onClick={onLogPeriod} disabled={disabled}>
              Log period
            </Button>
          ) : null}
          {onLogSymptoms ? (
            <Button variant="ghost" onClick={onLogSymptoms} disabled={disabled}>
              Log symptoms
            </Button>
          ) : null}
        </div>
      </div>

      <dl className="ci-overview__grid">
        <div>
          <dt className="ci-eyebrow">Next expected</dt>
          <dd className="ci-overview__value">{next}</dd>
          <dd className="ci-overview__sub">
            {forecast.next
              ? forecast.next.daysAway >= 0
                ? `${forecast.next.daysAway} ${plural(forecast.next.daysAway, "day", "days")} away`
                : `${Math.abs(forecast.next.daysAway)} ${plural(Math.abs(forecast.next.daysAway), "day", "days")} past the estimate`
              : baseline.starts.length < 2
                ? "needs two period starts"
                : "no interval to estimate from"}
          </dd>
        </div>
        <div>
          <dt className="ci-eyebrow">Confidence</dt>
          <dd className="ci-overview__value">
            <span className={`ci-conf ${CONFIDENCE_TONE[confidence.level]}`}>
              {confidence.label}
            </span>
          </dd>
          <dd className="ci-overview__sub">
            {baseline.plausible.length}{" "}
            {plural(baseline.plausible.length, "interval", "intervals")} measured · a band, not a
            probability
          </dd>
        </div>
        <div>
          <dt className="ci-eyebrow">Last updated</dt>
          <dd className="ci-overview__value">{longDay(generatedAt.slice(0, 10))}</dd>
          <dd className="ci-overview__sub">model {intel.version}</dd>
        </div>
        <div>
          <dt className="ci-eyebrow">Your baseline</dt>
          <dd className="ci-overview__value">
            {baseline.median !== null ? `${Math.round(baseline.median)} days` : "—"}
          </dd>
          <dd className="ci-overview__sub">
            {baseline.median === null
              ? "no completed cycle yet"
              : `${baseline.min}–${baseline.max} day range`}
          </dd>
        </div>
      </dl>

      <Details summary="Why this estimate?">
        <ul className="ci-bullets">
          {intel.explanation.lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </Details>

      {/* The band is the reading. The 0–100 number lives in here, named for
          what it is: an internal heuristic index, never a probability. */}
      <Details summary="How the confidence band is worked out">
        <p className="text-[12px] leading-relaxed ci-soft">{confidence.reason}</p>
        <ul className="ci-bullets mt-2.5">
          {confidence.factors.map((factor) => (
            <li key={factor.id}>
              {factor.label} — {factor.detail}
            </li>
          ))}
        </ul>
        <p className="mt-3 border-t pt-3 text-[11.5px] leading-relaxed ci-muted ci-hair">
          The band is read off an internal heuristic index of{" "}
          <span className="ci-num">{confidence.score}</span> out of 100. The index ranks how much
          evidence stands behind the estimate for your record — it is not a probability, not a
          confidence interval and not an accuracy percentage, so 70 never means “70% likely”. The
          band is what this page reports; the number stays in this note.
        </p>
      </Details>

      <div className="ci-model">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="ci-model__chip">
            <Moon size={12} aria-hidden /> confidence band: {confidence.label}
          </span>
          <span className="ci-model__chip">heuristic band, not a probability</span>
        </div>
      </div>
    </Card>
  );
}

/* -------------------------------- brief -------------------------------- */

export function CycleBriefPanel({ intel }: { intel: IntelligenceResult }) {
  return (
    <Card className="ci-brief">
      <div className="flex items-start gap-3">
        <Sparkles size={16} aria-hidden className="ci-brief__icon" />
        <div className="min-w-0">
          <p className="ci-eyebrow">Your cycle brief</p>
          <p className="ci-display mt-1.5 text-[19px] leading-snug sm:text-[22px]">
            {intel.brief.headline}
          </p>
          <ul className="ci-bullets mt-3">
            {intel.brief.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------- pattern ------------------------------- */

export function PersonalPatternPanel({ intel }: { intel: IntelligenceResult }) {
  const { baseline, symptoms, forecast } = intel;
  const cells: { label: string; value: string; sub: string }[] = [
    {
      label: "Typical cycle",
      value: baseline.median !== null ? `${Math.round(baseline.median)}d` : "—",
      sub:
        baseline.median !== null
          ? `median of ${baseline.plausible.length} ${plural(baseline.plausible.length, "interval", "intervals")}`
          : "needs one completed cycle",
    },
    {
      label: "Recorded range",
      value: baseline.min !== null ? `${baseline.min}–${baseline.max}d` : "—",
      sub: baseline.min !== null ? "shortest to longest" : "not measurable yet",
    },
    {
      label: "Bleed length",
      value: baseline.bleedingMedian !== null ? `${Math.round(baseline.bleedingMedian)}d` : "—",
      sub:
        baseline.bleedingMedian !== null
          ? `from ${baseline.bleedingCount} closed ${plural(baseline.bleedingCount, "period", "periods")}`
          : "no period end recorded",
    },
    {
      label: "Variation",
      value: baseline.cvPercent !== null ? `±${baseline.cvPercent.toFixed(1)}%` : "—",
      sub: forecast.available ? `window ±${forecast.halfWidth}d` : "needs two intervals",
    },
    {
      label: "Most logged symptom",
      value: symptoms.topSymptom ?? "—",
      sub:
        symptoms.topSymptom !== null
          ? `${symptoms.patterns[0]?.cyclesSeen ?? 0} of ${symptoms.patterns[0]?.totalCycles ?? 0} cycles`
          : symptoms.sufficient
            ? "no recurring symptom"
            : "more daily logs needed",
    },
    {
      label: "History",
      value: `${baseline.starts.length}`,
      sub: `${plural(baseline.starts.length, "start", "starts")} recorded · ${baseline.unusual.length} unusual`,
    },
  ];

  return (
    <Card>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="ci-eyebrow">Your personal pattern</p>
          <h2 className="ci-display mt-1.5 text-[19px] leading-tight sm:text-[22px]">
            What your record adds up to
          </h2>
        </div>
      </div>
      <dl className="ci-pattern">
        {cells.map((cell) => (
          <div key={cell.label} className="min-w-0">
            <dt className="ci-eyebrow">{cell.label}</dt>
            <dd className="ci-pattern__value">{cell.value}</dd>
            <dd className="ci-pattern__sub">{cell.sub}</dd>
          </div>
        ))}
      </dl>
      {symptoms.note ? <p className="ci-pattern__note">{symptoms.note}</p> : null}
    </Card>
  );
}

/* ------------------------------- insights ------------------------------- */

export function InsightList({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) {
    return (
      <p className="text-[12.5px] leading-relaxed ci-muted">
        Nothing in your record supports an observation yet. Bloom would rather say nothing than
        manufacture one.
      </p>
    );
  }
  return (
    <ul className="ci-insights">
      {insights.map((insight) => (
        <li key={insight.id} className="ci-insight">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-[13.5px] font-medium">{insight.title}</p>
            <span className="ci-insight__strength" data-strength={insight.strength}>
              {insight.strength} evidence
            </span>
          </div>
          <p className="mt-1.5 text-[12.5px] leading-relaxed ci-soft">{insight.body}</p>
          <ul className="ci-evidence" aria-label="Evidence">
            {insight.evidence.map((item) => (
              <li key={`${insight.id}-${item.label}`}>
                <span className="ci-evidence__label">{item.label}</span>
                <span className="ci-evidence__value">{item.value}</span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

export function WhatChangedPanel({ intel }: { intel: IntelligenceResult }) {
  const changes = intel.changes;
  return (
    <Card>
      <p className="ci-eyebrow">What changed</p>
      <h2 className="ci-display mt-1.5 text-[19px] leading-tight sm:text-[22px]">
        Against your own earlier record
      </h2>
      {changes.length === 0 ? (
        <p className="mt-3 text-[12.5px] leading-relaxed ci-muted">
          No change stands out against your history. That is the finding, not a gap in the page — a
          shift needs several cycles to be visible.
        </p>
      ) : (
        <ul className="ci-insights mt-4">
          {changes.map((finding) => (
            <li key={finding.id} className="ci-insight">
              <p className="text-[13.5px] font-medium">{finding.headline}</p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed ci-soft">{finding.detail}</p>
              <ul className="ci-evidence">
                {finding.evidence.map((item) => (
                  <li key={`${finding.id}-${item.label}`}>
                    <span className="ci-evidence__label">{item.label}</span>
                    <span className="ci-evidence__value">{item.value}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 border-t pt-3 text-[11.5px] leading-relaxed ci-muted ci-hair">
        These are comparisons with your own logged history, not diagnoses. Persistent or worrying
        changes are worth discussing with a qualified clinician — Bloom cannot tell you what they
        mean.
      </p>
    </Card>
  );
}

/* ----------------------------- comparison ----------------------------- */

export function CycleComparisonPanel({ intel }: { intel: IntelligenceResult }) {
  const comparison = compareRecentCycles(intel.record, intel.baseline, 3);
  const rows = comparison.cycles;

  return (
    <Card>
      <p className="ci-eyebrow">Cycle comparison</p>
      <h2 className="ci-display mt-1.5 text-[19px] leading-tight sm:text-[22px]">
        Your last {rows.length} recorded cycles, side by side
      </h2>
      <p className="mt-1.5 text-[12.5px] leading-relaxed ci-soft">
        Differences only — a longer cycle is not a better or worse one.
      </p>
      <div className="ci-compare">
        <table>
          <thead>
            <tr>
              <th scope="col">Cycle</th>
              <th scope="col">Length</th>
              <th scope="col">Bleed</th>
              <th scope="col">Top flow</th>
              <th scope="col">Symptom days</th>
              <th scope="col">Most logged</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.start}>
                <th scope="row">{longDay(row.start)}</th>
                <td>{row.lengthDays !== null ? `${row.lengthDays}d` : "open"}</td>
                <td>{row.bleedingDays !== null ? `${row.bleedingDays}d` : "—"}</td>
                <td>{row.topFlow ?? "—"}</td>
                <td>{row.symptomDays}</td>
                <td>{row.topSymptom ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11.5px] leading-relaxed ci-muted">{comparison.note}</p>
    </Card>
  );
}

/* ------------------------------- model note ------------------------------- */

export function ModelNote({ intel }: { intel: IntelligenceResult }) {
  const { baseline, backtest, confidence } = intel;
  return (
    <div className="ci-model">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className="ci-model__chip">
          <Moon size={12} aria-hidden /> model {intel.version}
        </span>
        <span className="ci-model__chip">
          <RefreshCw size={12} aria-hidden /> recalculated {longDay(intel.generatedAt.slice(0, 10))}
        </span>
        <span className="ci-model__chip">
          {baseline.starts.length} {plural(baseline.starts.length, "start", "starts")} ·{" "}
          {baseline.plausible.length} {plural(baseline.plausible.length, "interval", "intervals")}
        </span>
        <span className="ci-model__chip">
          {backtest.count > 0
            ? `${backtest.count} backtests · ${backtest.meanAbsError?.toFixed(1)}d mean error`
            : "no backtest yet"}
        </span>
        <span className="ci-model__chip">
          confidence band: {confidence.label} — heuristic, not a probability
        </span>
      </div>
    </div>
  );
}

/* --------------------------- foldable sections --------------------------- */

/**
 * A whole section behind one header, where the section already renders its own
 * card. The summary is the closed card, so nothing is boxed inside a box, and
 * the content is folded rather than dropped.
 */
export function Collapse({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <details className="ci-collapse">
      <summary className="ci-collapse__summary">
        <span className="min-w-0">
          <span className="block">{title}</span>
          {hint ? <span className="ci-collapse__hint block">{hint}</span> : null}
        </span>
        <ChevronDown size={14} aria-hidden className="ci-details__chev shrink-0" />
      </summary>
      <div className="ci-collapse__body">{children}</div>
    </details>
  );
}

/**
 * The same fold for content that is not already a card: the reading stays on
 * screen, the charts and tables behind it wait one tap away.
 */
export function CollapsibleSection({
  eyebrow,
  title,
  summary,
  children,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <p className="ci-eyebrow">{eyebrow}</p>
      <h2 className="ci-display mt-1.5 text-[19px] leading-tight sm:text-[22px]">{title}</h2>
      <Details summary={summary}>{children}</Details>
    </Card>
  );
}

/* -------------------------------- shared -------------------------------- */

export function Details({
  summary,
  children,
}: {
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <details className="ci-details">
      <summary className="ci-details__summary">
        {summary}
        <ChevronDown size={14} aria-hidden className="ci-details__chev" />
      </summary>
      <div className="ci-details__body">{children}</div>
    </details>
  );
}
