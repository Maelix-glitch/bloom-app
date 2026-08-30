/**
 * PhaseWave — the one visually distinctive element on the page, and it earns
 * its place: it encodes where someone actually is in their cycle.
 *
 * The curve is an energy shape (low through the bleed, rising to an ovulation
 * peak, easing down across the luteal), banded by the four phase colours, with
 * a marker for today and a marker for the predicted next start.
 *
 * Everything is drawn from real pixel measurements (ResizeObserver) so strokes
 * stay crisp at any width, and it degrades to a plain-language description for
 * screen readers.
 */

import { useMemo, useRef } from "react";

import { PHASE_LABEL, type CycleAnalysis } from "@/lib/cycle/predict";
import { useMeasuredWidth } from "./useMeasuredWidth";

interface Pt {
  x: number;
  y: number;
}
interface Seg {
  p0: Pt;
  c1: Pt;
  c2: Pt;
  p1: Pt;
}

/** Catmull-Rom → cubic bezier segments (no overshoot, no external dep). */
function toSegments(pts: Pt[]): Seg[] {
  const segs: Seg[] = [];
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[i - 1] ?? pts[i]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[i + 2] ?? p2;
    segs.push({
      p0: p1,
      c1: { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
      c2: { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 },
      p1: p2,
    });
  }
  return segs;
}

function pathOf(segs: Seg[]): string {
  if (segs.length === 0) return "";
  const first = segs[0]!;
  let d = `M ${first.p0.x.toFixed(2)} ${first.p0.y.toFixed(2)}`;
  for (const s of segs) {
    d += ` C ${s.c1.x.toFixed(2)} ${s.c1.y.toFixed(2)}, ${s.c2.x.toFixed(2)} ${s.c2.y.toFixed(2)}, ${s.p1.x.toFixed(2)} ${s.p1.y.toFixed(2)}`;
  }
  return d;
}

function sample(segs: Seg[], perSeg = 14): Pt[] {
  const out: Pt[] = [];
  for (const s of segs) {
    for (let i = 0; i <= perSeg; i += 1) {
      const t = i / perSeg;
      const mt = 1 - t;
      out.push({
        x: mt ** 3 * s.p0.x + 3 * mt ** 2 * t * s.c1.x + 3 * mt * t ** 2 * s.c2.x + t ** 3 * s.p1.x,
        y: mt ** 3 * s.p0.y + 3 * mt ** 2 * t * s.c1.y + 3 * mt * t ** 2 * s.c2.y + t ** 3 * s.p1.y,
      });
    }
  }
  return out;
}

function yAt(samples: Pt[], x: number): number {
  let best = samples[0]?.y ?? 0;
  let bestDx = Infinity;
  for (const p of samples) {
    const dx = Math.abs(p.x - x);
    if (dx < bestDx) {
      bestDx = dx;
      best = p.y;
    }
  }
  return best;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

export function PhaseWave({
  analysis,
  compact = false,
}: {
  analysis: CycleAnalysis;
  compact?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const width = useMeasuredWidth(hostRef);

  const height = compact ? 132 : width < 560 ? 158 : 196;
  const padX = compact ? 8 : 14;

  const model = useMemo(() => {
    const length = Math.max(1, Math.round(analysis.averageLength));
    const cycleDay = analysis.cycleDay;
    const periodLength = clamp(analysis.periodLength, 1, length - 6);
    const ovDay = clamp(analysis.ovulationDay ?? length - 14, 3, length - 2);

    const plotW = Math.max(10, width - padX * 2);
    const top = compact ? 26 : 36;
    const bottom = height - (compact ? 20 : 30);
    const amp = (bottom - top) * 0.74;
    const base = bottom - 4;

    const x = (day: number) =>
      padX + (clamp(day, 1, length + 1) - 1) * (plotW / Math.max(1, length));
    const y = (v: number) => base - v * amp;

    const pl = periodLength / length;
    const pov = ovDay / length;

    const pts: Pt[] = [
      { x: x(1), y: y(0.16) },
      { x: x(periodLength), y: y(0.08) },
      { x: x(Math.max(periodLength + 1, ovDay - length * 0.14)), y: y(0.6) },
      { x: x(ovDay), y: y(1) },
      { x: x(Math.min(length - 1, ovDay + length * 0.12)), y: y(0.52) },
      { x: x(length - Math.max(1, Math.round(length * 0.08))), y: y(0.2) },
      { x: x(length + 1), y: y(0.12) },
    ];

    // phase bands, in day space, forced monotonic
    const ovHalf = Math.max(1.5, length * 0.045);
    const bands = [
      { phase: "menstrual" as const, from: 1, to: periodLength },
      {
        phase: "follicular" as const,
        from: periodLength,
        to: Math.max(periodLength + 0.5, ovDay - ovHalf),
      },
      {
        phase: "ovulation" as const,
        from: Math.max(periodLength + 0.5, ovDay - ovHalf),
        to: ovDay + ovHalf,
      },
      { phase: "luteal" as const, from: ovDay + ovHalf, to: length + 1 },
    ];

    const fertileFrom = clamp(ovDay - 5, 1, length + 1);
    const fertileTo = clamp(ovDay + 1, 1, length + 1);

    const segs = toSegments(pts);
    const line = pathOf(segs);
    const area =
      segs.length > 0
        ? `${line} L ${x(length + 1).toFixed(2)} ${bottom.toFixed(2)} L ${x(1).toFixed(2)} ${bottom.toFixed(2)} Z`
        : "";

    return {
      length,
      cycleDay,
      ovDay,
      periodLength,
      plotW,
      top,
      bottom,
      x,
      y,
      pts,
      segs,
      line,
      area,
      bands,
      fertileFrom,
      fertileTo,
    };
  }, [analysis, width, height, padX, compact]);

  const ready = width > 0 && analysis.entryCount > 0;
  const samples = useMemo(() => sample(model.segs), [model.segs]);

  const todayX =
    model.cycleDay !== null ? model.x(clamp(model.cycleDay, 1, model.length + 1)) : null;
  const todayY = todayX !== null ? yAt(samples, todayX) : null;
  const isPastEnd = model.cycleDay !== null && model.cycleDay > model.length + 1;

  const gradientId = `ci-wave-${compact ? "c" : "f"}-${Math.round(model.length)}-${Math.round(model.top)}`;

  const ariaLabel = analysis.entryCount
    ? `Cycle map: about ${model.length} days. Today is day ${analysis.cycleDay ?? "unknown"} of the cycle, in the ${analysis.phaseLabel} phase. Ovulation is estimated around day ${model.ovDay}, the fertile window around days ${Math.max(1, model.ovDay - 5)} to ${model.ovDay + 1}, and the next period is predicted at day ${model.length + 1}.`
    : "Cycle map: empty until a period is logged.";

  return (
    <figure className="m-0">
      <div ref={hostRef} className="relative w-full" style={{ height }}>
        {ready ? (
          <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={ariaLabel}
            className="ci-draw block"
          >
            <defs>
              <linearGradient
                id={gradientId}
                gradientUnits="userSpaceOnUse"
                x1={model.x(1)}
                x2={model.x(model.length + 1)}
              >
                {model.bands.flatMap((b, i) => {
                  const a = (model.x(b.from) - model.x(1)) / Math.max(1, model.plotW);
                  const c = (model.x(b.to) - model.x(1)) / Math.max(1, model.plotW);
                  return [
                    <stop
                      key={`${b.phase}-a-${i}`}
                      offset={`${(clamp(a, 0, 1) * 100).toFixed(2)}%`}
                      style={{ stopColor: `var(--ci-${b.phase})` }}
                    />,
                    <stop
                      key={`${b.phase}-b-${i}`}
                      offset={`${(clamp(c, 0, 1) * 100).toFixed(2)}%`}
                      style={{ stopColor: `var(--ci-${b.phase})` }}
                    />,
                  ];
                })}
              </linearGradient>
              <linearGradient id={`${gradientId}-fade`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" style={{ stopColor: `var(--ci-text)`, stopOpacity: 0.26 }} />
                <stop offset="100%" style={{ stopColor: `var(--ci-text)`, stopOpacity: 0.02 }} />
              </linearGradient>
            </defs>

            {/* baseline grid */}
            {[0.25, 0.5, 0.75].map((f) => {
              const gy = model.top + (model.bottom - model.top) * f;
              return (
                <line
                  key={f}
                  x1={model.x(1)}
                  x2={model.x(model.length + 1)}
                  y1={gy}
                  y2={gy}
                  style={{ stroke: "var(--ci-line)" }}
                  strokeWidth={1}
                />
              );
            })}

            {/* fertile window band */}
            <rect
              x={model.x(model.fertileFrom)}
              y={model.top - 6}
              width={Math.max(2, model.x(model.fertileTo) - model.x(model.fertileFrom))}
              height={model.bottom - model.top + 12}
              style={{
                fill: "var(--ci-ovulation)",
                fillOpacity: 0.08,
                stroke: "var(--ci-ovulation)",
                strokeOpacity: 0.22,
                strokeDasharray: "3 4",
              }}
            />

            {/* the wave */}
            <path d={model.area} fill={`url(#${gradientId})`} fillOpacity={0.16} />
            <path
              d={model.line}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth={compact ? 2 : 2.5}
              strokeLinecap="round"
            />

            {/* predicted next period */}
            <line
              x1={model.x(model.length + 1)}
              x2={model.x(model.length + 1)}
              y1={model.top - 10}
              y2={model.bottom + (compact ? 8 : 12)}
              style={{ stroke: "var(--ci-menstrual)", strokeOpacity: 0.85 }}
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />
            <circle
              cx={model.x(model.length + 1)}
              cy={model.bottom + (compact ? 8 : 12)}
              r={compact ? 3 : 3.5}
              style={{ fill: "var(--ci-menstrual)" }}
            />

            {/* today */}
            {todayX !== null && todayY !== null ? (
              <>
                <line
                  x1={todayX}
                  x2={todayX}
                  y1={model.top - 10}
                  y2={model.bottom}
                  style={{ stroke: "var(--ci-text)", strokeOpacity: isPastEnd ? 0.3 : 0.55 }}
                  strokeWidth={1}
                />
                <circle
                  cx={todayX}
                  cy={todayY}
                  r={compact ? 9 : 11}
                  className="ci-pulse"
                  style={{ fill: "var(--ci-text)" }}
                />
                <circle
                  cx={todayX}
                  cy={todayY}
                  r={compact ? 4.5 : 5.5}
                  style={{ fill: "var(--ci-bg)", stroke: "var(--ci-text)", strokeWidth: 2 }}
                />
              </>
            ) : null}

            {/* day ticks */}
            {!compact ? (
              <g style={{ fontFamily: "var(--ci-font-mono)", fontSize: 10 }}>
                <text
                  x={model.x(1)}
                  y={height - 8}
                  style={{ fill: "var(--ci-text-mute)" }}
                  textAnchor="start"
                >
                  Day 1
                </text>
                <text
                  x={model.x(model.ovDay)}
                  y={height - 8}
                  style={{ fill: "var(--ci-ovulation)" }}
                  textAnchor="middle"
                >
                  ovulation ≈ d{model.ovDay}
                </text>
                <text
                  x={model.x(model.length)}
                  y={height - 8}
                  style={{ fill: "var(--ci-text-mute)" }}
                  textAnchor="end"
                >
                  {model.length}d cycle
                </text>
              </g>
            ) : null}
          </svg>
        ) : (
          <div className="flex h-full items-center">
            <svg width="100%" height="2" aria-hidden className="block">
              <line
                x1="0"
                y1="1"
                x2="100%"
                y2="1"
                style={{ stroke: "var(--ci-line-strong)" }}
                strokeWidth={2}
                strokeDasharray="6 8"
              />
            </svg>
            <p
              className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-[12px] ci-muted"
              style={{ background: "transparent" }}
            >
              Your wave appears with your first entry
            </p>
          </div>
        )}

        {/* today label */}
        {ready && todayX !== null ? (
          <span
            className="pointer-events-none absolute top-0 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-[3px] text-[10.5px] font-medium"
            style={{
              left: clamp(todayX, compact ? 34 : 46, Math.max(compact ? 34 : 46, width - 46)),
              background: "var(--ci-surface-2)",
              border: "1px solid var(--ci-line-strong)",
              color: "var(--ci-text)",
              fontFamily: "var(--ci-font-mono)",
            }}
          >
            {isPastEnd ? `today · ${analysis.lateBy}d past` : `today · day ${analysis.cycleDay}`}
          </span>
        ) : null}

        {/* next period label */}
        {ready ? (
          <span
            className="pointer-events-none absolute right-0 whitespace-nowrap text-[10.5px]"
            style={{
              top: model.top - (compact ? 22 : 28),
              color: "var(--ci-menstrual)",
              fontFamily: "var(--ci-font-mono)",
            }}
          >
            next period
          </span>
        ) : null}
      </div>

      {/* phase ribbon */}
      <div
        className="mt-2 flex gap-[3px]"
        aria-hidden={!ready}
        style={{ opacity: ready ? 1 : 0.35 }}
      >
        {model.bands.map((b) => {
          const pct = ((b.to - b.from) / (model.length + 1)) * 100;
          return (
            <div key={b.phase} className="min-w-0" style={{ width: `${pct}%` }}>
              <div
                className="h-[5px] rounded-full"
                style={{ background: `var(--ci-${b.phase})`, opacity: 0.85 }}
              />
              <p
                className="mt-1.5 truncate text-[10.5px] tracking-tight ci-muted"
                style={{ color: "var(--ci-text-mute)" }}
              >
                {compact ? PHASE_LABEL[b.phase].slice(0, 4) : PHASE_LABEL[b.phase]}
              </p>
            </div>
          );
        })}
      </div>

      {/* the same information as text, for anyone who can't see the chart */}
      <dl className="ci-sr">
        <dt>Cycle length used</dt>
        <dd>{model.length} days</dd>
        {model.bands.map((b) => (
          <div key={b.phase}>
            <dt>{PHASE_LABEL[b.phase]}</dt>
            <dd>
              day {Math.round(b.from)} to {Math.round(b.to)}
            </dd>
          </div>
        ))}
        <dt>Today</dt>
        <dd>day {analysis.cycleDay ?? "not available"}</dd>
      </dl>
    </figure>
  );
}
