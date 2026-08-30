/**
 * RhythmChart — every completed cycle, as a bar, against the average.
 *
 * Excluded gaps (too short / too long to be a real cycle) are drawn in the
 * warning colour with a dashed cap and left out of the average line, so the
 * chart explains the number rather than just repeating it.
 */

import { useRef } from "react";

import { useMeasuredWidth } from "./useMeasuredWidth";
import { formatDateShort, type CycleAnalysis } from "@/lib/cycle/predict";

const pad = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

export function RhythmChart({
  analysis,
  compact = false,
}: {
  analysis: CycleAnalysis;
  compact?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const width = useMeasuredWidth(hostRef);
  const height = compact ? 140 : width < 560 ? 170 : 210;

  const gaps = analysis.gaps;
  const lengths = analysis.cycleLengths;

  const domain = (() => {
    const all = gaps.map((g) => g.days);
    const lo = Math.min(18, ...all, analysis.averageLength - 2);
    const hi = Math.max(34, ...all, analysis.averageLength + 2);
    return { lo: Math.max(0, Math.floor(lo - 2)), hi: Math.ceil(hi + 2) };
  })();

  const padL = compact ? 26 : 34;
  const padR = 8;
  const padT = compact ? 16 : 22;
  const padB = compact ? 20 : 26;
  const plotW = Math.max(10, width - padL - padR);
  const plotH = Math.max(10, height - padT - padB);
  const barW =
    gaps.length > 0 ? Math.min(compact ? 22 : 38, plotW / gaps.length - (compact ? 6 : 10)) : 0;

  const y = (days: number) =>
    padT +
    plotH -
    ((pad(days, domain.lo, domain.hi) - domain.lo) / (domain.hi - domain.lo)) * plotH;

  const avg = analysis.averageLengthRaw;
  const band = analysis.variability;
  const ready = width > 0 && gaps.length > 0;

  return (
    <div ref={hostRef} className="w-full">
      {ready ? (
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={
            lengths.length > 0
              ? `Cycle lengths over time: ${lengths.join(", ")} days. Average ${analysis.averageLength} days, varying by about ${analysis.variability} days.${analysis.stats.excludedGaps > 0 ? ` ${analysis.stats.excludedGaps} gap was left out.` : ""}`
              : "No completed cycles to chart yet."
          }
          className="ci-draw block"
        >
          {/* gridlines + axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((f) => {
            const days = Math.round(domain.lo + (domain.hi - domain.lo) * (1 - f));
            const gy = padT + plotH * f;
            return (
              <g key={f}>
                <line
                  x1={padL}
                  x2={width - padR}
                  y1={gy}
                  y2={gy}
                  style={{ stroke: "var(--ci-line)" }}
                  strokeWidth={1}
                />
                <text
                  x={padL - 6}
                  y={gy + 3}
                  textAnchor="end"
                  style={{
                    fill: "var(--ci-text-mute)",
                    fontFamily: "var(--ci-font-mono)",
                    fontSize: 9.5,
                  }}
                >
                  {days}
                </text>
              </g>
            );
          })}

          {/* ±1 standard deviation band around the average */}
          {lengths.length >= 2 && band > 0 ? (
            <rect
              x={padL}
              y={y(avg + band)}
              width={plotW}
              height={Math.max(1, y(avg - band) - y(avg + band))}
              style={{ fill: "var(--ci-follicular)", fillOpacity: 0.1 }}
            />
          ) : null}

          {/* the bars */}
          {gaps.map((gap, i) => {
            const cx = padL + (plotW / gaps.length) * (i + 0.5);
            const top = y(gap.days);
            const h = Math.max(2, padT + plotH - top);
            const colour = gap.plausible ? "var(--ci-follicular)" : "var(--ci-ovulation)";
            return (
              <g key={`${gap.fromStart}-${gap.toStart}`}>
                <title>
                  {gap.plausible
                    ? `${gap.days} days — ${formatDateShort(gap.fromStart)} to ${formatDateShort(gap.toStart)}`
                    : `${gap.days} days — not counted (${gap.reason ?? "outside the plausible range"})`}
                </title>
                <rect
                  x={cx - barW / 2}
                  y={top}
                  width={barW}
                  height={h}
                  rx={Math.min(5, barW / 3)}
                  style={{
                    fill: colour,
                    fillOpacity: gap.plausible ? 0.32 : 0.22,
                    stroke: colour,
                    strokeOpacity: gap.plausible ? 0.85 : 0.7,
                    strokeDasharray: gap.plausible ? undefined : "3 3",
                    strokeWidth: 1.2,
                  }}
                />
                <text
                  x={cx}
                  y={top - 5}
                  textAnchor="middle"
                  style={{
                    fill: gap.plausible ? "var(--ci-text-soft)" : "var(--ci-ovulation)",
                    fontFamily: "var(--ci-font-mono)",
                    fontSize: compact ? 9 : 10,
                  }}
                >
                  {gap.days}
                </text>
                {!compact ? (
                  <text
                    x={cx}
                    y={height - 8}
                    textAnchor="middle"
                    style={{
                      fill: "var(--ci-text-mute)",
                      fontFamily: "var(--ci-font-mono)",
                      fontSize: 9.5,
                    }}
                  >
                    {formatDateShort(gap.fromStart).replace(/ \d+/, "")}
                  </text>
                ) : null}
              </g>
            );
          })}

          {/* weighted average */}
          {lengths.length > 0 ? (
            <g>
              <line
                x1={padL}
                x2={width - padR}
                y1={y(avg)}
                y2={y(avg)}
                style={{ stroke: "var(--ci-text)", strokeOpacity: 0.6 }}
                strokeWidth={1.2}
                strokeDasharray="6 4"
              />
              <text
                x={width - padR}
                y={y(avg) - 6}
                textAnchor="end"
                style={{
                  fill: "var(--ci-text-soft)",
                  fontFamily: "var(--ci-font-mono)",
                  fontSize: 9.5,
                }}
              >
                avg {analysis.averageLength}d
              </text>
            </g>
          ) : null}
        </svg>
      ) : (
        <div style={{ height }} className="flex items-center">
          <p className="text-[12.5px] ci-muted">
            {analysis.entryCount === 0
              ? "Your cycle lengths chart out here once you've logged a period."
              : "Two entries make a cycle — that's where this chart starts."}
          </p>
        </div>
      )}

      {/* the same data as text */}
      <table className="ci-sr">
        <caption>Cycle lengths derived from your entries</caption>
        <thead>
          <tr>
            <th>From</th>
            <th>To</th>
            <th>Days</th>
            <th>Counted</th>
          </tr>
        </thead>
        <tbody>
          {gaps.map((g) => (
            <tr key={`t-${g.fromStart}`}>
              <td>{g.fromStart}</td>
              <td>{g.toStart}</td>
              <td>{g.days}</td>
              <td>{g.plausible ? "yes" : "no"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
