/**
 * CycleDial — one cycle as one circle.
 *
 * Day 1 sits at twelve o'clock and the cycle runs clockwise, so the shape of
 * a month is readable at a glance: the bleed arc, the fertile arc, the dot
 * that is today, and the gap left before the next start.
 *
 * Every mark is derived: phase arcs from the phase windows, today from
 * `cycleDay`, the fertile band from the ovulation estimate, the inner dots
 * from days actually logged. Nothing here is decoration.
 */

import { useMemo } from "react";

import { placeDate, type DayLog } from "@/lib/cycle/dayLogs";
import { PHASE_LABEL, type CycleAnalysis } from "@/lib/cycle/predict";

const SIZE = 240;
const C = SIZE / 2;
const R_PHASE = 100;
const R_TRACK = 100;
const R_DOTS = 78;
const R_FERTILE = 66;

function polar(r: number, deg: number): { x: number; y: number } {
  const rad = ((deg - 90) * Math.PI) / 180;
  /* Rounded: the server and the browser can differ in the last digit of a
     float, which React reports as a hydration mismatch on the attribute. */
  return {
    x: Math.round((C + r * Math.cos(rad)) * 100) / 100,
    y: Math.round((C + r * Math.sin(rad)) * 100) / 100,
  };
}

/** Arc path between two day positions on a ring of `r`, in day units. */
function arc(r: number, fromDay: number, toDay: number, length: number): string {
  const a0 = ((fromDay - 1) / length) * 360;
  const a1 = (toDay / length) * 360;
  const p0 = polar(r, a0);
  const p1 = polar(r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
}

const PHASE_VAR: Record<string, string> = {
  menstrual: "var(--ci-menstrual)",
  follicular: "var(--ci-follicular)",
  ovulation: "var(--ci-ovulation)",
  luteal: "var(--ci-luteal)",
  late: "var(--ci-menstrual)",
};

export function CycleDial({ analysis, days }: { analysis: CycleAnalysis; days?: DayLog[] }) {
  const length = Math.max(1, Math.round(analysis.averageLength));

  const logged = useMemo(() => {
    if (!days || days.length === 0 || !analysis.lastStart) return [] as number[];
    const out: number[] = [];
    for (const d of days.slice(-120)) {
      const placed = placeDate(analysis, d.date);
      if (!placed || placed.reconstructed) continue;
      out.push(placed.cycleDay);
    }
    return out;
  }, [days, analysis]);

  const today = analysis.cycleDay;
  const capped = today ? Math.min(today, length) : null;
  const dayAngle = capped ? ((capped - 1) / length) * 360 : 0;
  const gapAngle = today && today > length ? ((length - 1) / length) * 360 : dayAngle;

  const fertile = useMemo(() => {
    if (!analysis.fertileStart || !analysis.fertileEnd || !analysis.lastStart) return null;
    const diff = (a: string, b: string) => Math.round((Date.parse(a) - Date.parse(b)) / 86_400_000);
    const from = diff(analysis.fertileStart, analysis.lastStart) + 1;
    const to = diff(analysis.fertileEnd, analysis.lastStart) + 1;
    if (!Number.isFinite(from) || !Number.isFinite(to) || to <= 0) return null;
    return { from: Math.max(1, from), to: Math.min(length, to) };
  }, [analysis, length]);

  const ovulationDay = analysis.ovulationDay;
  const marker = polar(R_PHASE, gapAngle);
  const fertileFrom = fertile ? polar(R_FERTILE, ((fertile.from - 1) / length) * 360) : null;
  const fertileTo = fertile ? polar(R_FERTILE, (fertile.to / length) * 360) : null;

  const countdown =
    analysis.daysUntilNext === null
      ? null
      : analysis.daysUntilNext > 0
        ? `in ${analysis.daysUntilNext}d`
        : analysis.daysUntilNext === 0
          ? "due today"
          : `${Math.abs(analysis.daysUntilNext)}d past`;

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="ci-dial w-full max-w-[300px]"
        role="img"
        aria-label={
          today
            ? `Cycle dial: day ${today} of ${length}, ${analysis.phaseLabel}. ${
                fertile ? `Fertile window estimated day ${fertile.from} to ${fertile.to}.` : ""
              }`
            : "Cycle dial — log a period start to fill it."
        }
      >
        {/* track */}
        <circle
          cx={C}
          cy={C}
          r={R_TRACK}
          fill="none"
          stroke="color-mix(in oklab, var(--ci-text) 9%, transparent)"
          strokeWidth={14}
        />

        {/* phase arcs */}
        <g className="ci-dial-arcs">
          {analysis.phaseWindows.map((w) => (
            <path
              key={w.phase}
              d={arc(R_PHASE, w.fromDay, Math.min(w.toDay, length), length)}
              fill="none"
              stroke={PHASE_VAR[w.phase]}
              strokeWidth={14}
              strokeLinecap="butt"
              opacity={w.current ? 1 : 0.5}
            />
          ))}
        </g>

        {/* day ticks */}
        <g opacity={0.5}>
          {Array.from({ length }, (_, i) => i + 1).map((day) => {
            const major = day === 1 || day % 7 === 0;
            const a = ((day - 1) / length) * 360;
            const p0 = polar(R_PHASE + 11, a);
            const p1 = polar(R_PHASE + (major ? 17 : 14), a);
            return (
              <line
                key={day}
                x1={p0.x}
                y1={p0.y}
                x2={p1.x}
                y2={p1.y}
                stroke="var(--ci-text)"
                strokeWidth={major ? 1.4 : 0.8}
                opacity={major ? 0.55 : 0.28}
              />
            );
          })}
        </g>

        {/* days actually logged, as small dots inside the ring */}
        {logged.length > 0 ? (
          <g className="ci-dial-dots">
            {logged.map((day, i) => {
              const p = polar(R_DOTS, ((day - 1) / length) * 360);
              return (
                <circle
                  key={`${day}-${i}`}
                  cx={p.x}
                  cy={p.y}
                  r={2.4}
                  fill="var(--ci-text)"
                  opacity={0.42}
                />
              );
            })}
          </g>
        ) : null}

        {/* fertile band */}
        {fertile && fertileFrom && fertileTo ? (
          <path
            d={arc(R_FERTILE, fertile.from, fertile.to, length)}
            fill="none"
            stroke="var(--ci-ovulation)"
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray="2 5"
            opacity={0.85}
          />
        ) : null}

        {/* ovulation marker */}
        {ovulationDay && ovulationDay <= length
          ? (() => {
              const p = polar(R_PHASE, ((ovulationDay - 1) / length) * 360);
              return (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={3.6}
                  fill="var(--ci-ovulation)"
                  stroke="var(--ci-bg)"
                  strokeWidth={1.5}
                />
              );
            })()
          : null}

        {/* today */}
        {capped ? (
          <g>
            <circle
              className="ci-dial-pulse"
              cx={marker.x}
              cy={marker.y}
              r={9}
              fill="var(--ci-text)"
              opacity={0.28}
            />
            <circle
              cx={marker.x}
              cy={marker.y}
              r={6}
              fill="var(--ci-text)"
              stroke="var(--ci-bg)"
              strokeWidth={2.5}
            />
          </g>
        ) : null}

        {/* centre readout */}
        <text
          x={C}
          y={C + 2}
          textAnchor="middle"
          className="ci-display"
          fontSize={44}
          fill="var(--ci-text)"
        >
          {today ?? "—"}
        </text>
        <text
          x={C}
          y={C + 22}
          textAnchor="middle"
          className="ci-num"
          fontSize={11}
          letterSpacing={1.5}
          fill="var(--ci-text)"
          opacity={0.65}
        >
          {`OF ${length}`}
        </text>
        <text
          x={C}
          y={C - 28}
          textAnchor="middle"
          className="ci-num"
          fontSize={10}
          letterSpacing={2}
          fill={
            analysis.phase && analysis.phase !== "late"
              ? PHASE_VAR[analysis.phase]
              : "var(--ci-text)"
          }
          opacity={0.9}
        >
          {(analysis.phaseLabel ?? PHASE_LABEL.menstrual).toUpperCase()}
        </text>
      </svg>

      <p className="mt-1 text-[11.5px] ci-muted">
        {countdown ? (
          <>
            Next start{" "}
            <span style={{ color: "var(--ci-text)" }} className="ci-num">
              {countdown}
            </span>
          </>
        ) : (
          "Log a period start to fill the dial."
        )}
      </p>
    </div>
  );
}

export default CycleDial;
