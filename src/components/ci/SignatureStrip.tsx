/**
 * SignatureStrip — the personal read.
 *
 * A consistency ring, a one-sentence summary written from the user's own
 * numbers, a logging streak, and the three figures that matter most. It sits
 * directly under the header because it's the thing someone actually came for:
 * "what does my record say about me?"
 */

import { CountUp, Reveal } from "./motion";
import { Card } from "./primitives";
import type { CycleAnalysis } from "@/lib/cycle/predict";
import type { DayLogAnalysis } from "@/lib/cycle/dayLogs";

function ConsistencyRing({
  value,
  label,
  sub,
}: {
  /** 0–1 */
  value: number | null;
  label: string;
  sub: string;
}) {
  const size = 108;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = value === null ? 0 : Math.min(1, Math.max(0, value));
  const dash = c * clamped;

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} role="img" aria-label={`${label}: ${sub}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            style={{ stroke: "var(--ci-surface-2)" }}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c - dash}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ stroke: "var(--ci-follicular)" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="ci-num text-[20px] leading-none" style={{ color: "var(--ci-text)" }}>
            {value === null ? (
              "—"
            ) : (
              <>
                <CountUp value={Math.round(value * 100)} />%
              </>
            )}
          </span>
          <span className="mt-1 text-[10px] uppercase tracking-[0.14em] ci-muted">{label}</span>
        </div>
      </div>
      <p className="max-w-[22ch] text-[12px] leading-relaxed ci-muted">{sub}</p>
    </div>
  );
}

export function SignatureStrip({
  analysis,
  dayAnalysis,
  compact = false,
}: {
  analysis: CycleAnalysis;
  dayAnalysis: DayLogAnalysis;
  compact?: boolean;
}) {
  if (analysis.entryCount === 0) return null;

  const headline =
    dayAnalysis.headline ??
    (analysis.isGeneric
      ? `One period logged. The ${analysis.averageLength.toFixed(0)}-day figure below is a starting point, not your pattern yet.`
      : `Your average cycle is ${analysis.averageLength.toFixed(1)} days across ${analysis.cycleLengths.length} logged ${analysis.cycleLengths.length === 1 ? "cycle" : "cycles"}.`);

  return (
    <Card className="ci-lift overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-[240px] flex-1">
          <p className="ci-eyebrow">Your pattern, in one line</p>
          <p
            className="ci-display mt-2 text-[19px] leading-snug sm:text-[23px]"
            style={{ color: "var(--ci-text)" }}
          >
            {headline}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            {[
              {
                label: "Cycle day",
                value: analysis.cycleDay ?? null,
                decimals: 0,
                suffix: analysis.cycleDay ? ` of ${Math.round(analysis.averageLength)}` : "",
              },
              {
                label: "Cycles logged",
                value: analysis.stats.cyclesLogged,
                decimals: 0,
                suffix: "",
              },
              {
                label: "Avg length",
                value: analysis.averageLength,
                decimals: 1,
                suffix: "d",
              },
              {
                label: "Day streak",
                value: dayAnalysis.streak,
                decimals: 0,
                suffix:
                  dayAnalysis.bestStreak > dayAnalysis.streak
                    ? ` · best ${dayAnalysis.bestStreak}`
                    : "",
              },
            ].map((item) => (
              <div key={item.label}>
                <p className="ci-eyebrow">{item.label}</p>
                <p
                  className="ci-num mt-1 text-[22px] leading-none sm:text-[26px]"
                  style={{ color: "var(--ci-text)" }}
                >
                  {item.value === null ? (
                    "—"
                  ) : (
                    <>
                      <CountUp value={item.value} decimals={item.decimals} />
                      <span className="ml-1 text-[13px] ci-muted">{item.suffix}</span>
                    </>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>

        {!compact ? (
          <div className="shrink-0">
            <ConsistencyRing
              value={analysis.stats.predictability}
              label="steady"
              sub={
                analysis.stats.predictability === null
                  ? "Log two cycles and this ring fills with how consistent they are."
                  : `The share of your cycles that landed within ±3 days of your average.`
              }
            />
          </div>
        ) : null}
      </div>
    </Card>
  );
}

/** Small editorial header used above each major block. */
export function BlockHead({
  index,
  eyebrow,
  title,
  note,
  aside,
}: {
  index?: string;
  eyebrow: string;
  title: string;
  note?: string;
  aside?: React.ReactNode;
}) {
  return (
    <Reveal className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="ci-eyebrow">
          {index ? <span className="ci-index">{index} / </span> : null}
          {eyebrow}
        </p>
        <h2 className="ci-display mt-1.5 text-[19px] leading-tight sm:text-[22px]">{title}</h2>
        {note ? (
          <p className="mt-1.5 max-w-[62ch] text-[12.5px] leading-relaxed ci-soft">{note}</p>
        ) : null}
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </Reveal>
  );
}
