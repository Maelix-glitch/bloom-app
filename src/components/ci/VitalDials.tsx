/**
 * VitalDials — four small gauges for the four things people actually rate:
 * energy, pain, sleep and mood. Weighted means across every day logged, so a
 * single bad Tuesday can't swing the needle.
 */

import { useMemo } from "react";

import type { DayLogAnalysis, PhaseAverage } from "@/lib/cycle/dayLogs";
import { useInView } from "./motion";

function weightedMean(rows: PhaseAverage[]): number | null {
  let sum = 0;
  let days = 0;
  for (const r of rows) {
    if (r.average === null || r.days === 0) continue;
    sum += r.average * r.days;
    days += r.days;
  }
  return days === 0 ? null : sum / days;
}

function Gauge({
  label,
  value,
  max,
  decimals,
  colour,
  suffix,
  caption,
}: {
  label: string;
  value: number | null;
  max: number;
  decimals: number;
  colour: string;
  suffix?: string;
  caption: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>("-40px");
  const frac = value === null ? 0 : Math.max(0, Math.min(1, value / max));
  const r = 34;
  /* Rounded for the same reason as everywhere else: identical output on the
     server and in the browser. */
  const circ = Math.round(2 * Math.PI * r * 100) / 100;

  return (
    <div ref={ref} className="flex flex-col items-center">
      <svg
        viewBox="0 0 84 84"
        className="w-[74px]"
        role="img"
        aria-label={`${label}: ${value === null ? "no data" : value.toFixed(decimals)}${suffix ?? ""} out of ${max}`}
      >
        <circle
          cx={42}
          cy={42}
          r={r}
          fill="none"
          stroke="var(--ci-text)"
          strokeWidth={7}
          opacity={0.1}
        />
        <circle
          className={`ci-gauge-arc${inView ? " is-go" : ""}`}
          cx={42}
          cy={42}
          r={r}
          fill="none"
          stroke={colour}
          strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={Math.round(circ * (1 - frac) * 100) / 100}
          style={
            {
              "--circ": circ,
              "--dash": Math.round(circ * (1 - frac) * 100) / 100,
            } as React.CSSProperties
          }
          transform="rotate(-90 42 42)"
        />
        <text
          x={42}
          y={43}
          textAnchor="middle"
          className="ci-num"
          fontSize={17}
          fill="var(--ci-text)"
        >
          {value === null ? "—" : value.toFixed(decimals)}
        </text>
        <text
          x={42}
          y={55}
          textAnchor="middle"
          className="ci-num"
          fontSize={7.5}
          letterSpacing={1.2}
          fill="var(--ci-text)"
          opacity={0.55}
        >
          {`/${max}${suffix ?? ""}`}
        </text>
      </svg>
      <p className="mt-1.5 text-[11.5px] font-medium">{label}</p>
      <p className="text-[10.5px] leading-snug ci-muted">{caption}</p>
    </div>
  );
}

export function VitalDials({ dayAnalysis }: { dayAnalysis: DayLogAnalysis }) {
  const values = useMemo(
    () => ({
      energy: weightedMean(dayAnalysis.energyByPhase),
      pain: weightedMean(dayAnalysis.painByPhase),
      sleep: weightedMean(dayAnalysis.sleepByPhase),
      mood: weightedMean(dayAnalysis.moodByPhase),
    }),
    [dayAnalysis],
  );

  return (
    <div className="grid grid-cols-2 gap-y-5 sm:grid-cols-4">
      <Gauge
        label="Energy"
        value={values.energy}
        max={5}
        decimals={1}
        colour="var(--ci-follicular)"
        caption="1 low · 5 high"
      />
      <Gauge
        label="Pain"
        value={values.pain}
        max={5}
        decimals={1}
        colour="var(--ci-menstrual)"
        caption="0 none · 5 worst"
      />
      <Gauge
        label="Sleep"
        value={values.sleep}
        max={10}
        decimals={1}
        colour="var(--ci-luteal)"
        suffix="h"
        caption="hours a night"
      />
      <Gauge
        label="Mood"
        value={values.mood}
        max={5}
        decimals={1}
        colour="var(--ci-ovulation)"
        caption="1 rough · 5 great"
      />
    </div>
  );
}

export default VitalDials;
