/**
 * CycleRing — the informative cycle dial. One SVG, no rotation animation:
 * phase arcs around the ring, the observed stretch solid, the estimated
 * stretch soft/dashed, today dominant at its angle. Keyboard-focusable
 * segments reveal their date range in-place. Pure geometry, honest labels.
 */

import { useId, useState } from "react";

import { cn } from "@/lib/utils";
import type { CycleModel, PhaseKey } from "@/lib/cycle/types";
import { fmtShort } from "@/lib/cycle/engine";
import { PHASE_COLOR } from "@/lib/cycle/palette";

const PHASES: PhaseKey[] = ["menstrual", "follicular", "ovulation", "luteal"];

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const sweep = endDeg - startDeg;
  if (sweep <= 0.1) return "";
  const s = polar(cx, cy, r, startDeg);
  const e = polar(cx, cy, r, endDeg);
  const large = sweep > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

export function CycleRing({
  model,
  size = 264,
  className,
}: {
  model: CycleModel;
  size?: number;
  className?: string;
}) {
  const uid = useId();
  const [focus, setFocus] = useState<{ phase: PhaseKey; from: number; to: number } | null>(null);

  const cycle = Math.round(model.average ?? 28);
  const r = size / 2 - 14;
  const cx = size / 2;
  const cy = size / 2;
  const degForDay = (day: number) => ((day - 1) / cycle) * 360;

  const flowLen = Math.max(2, Math.round(model.periodLengthAverage ?? 4));
  const ovu = model.ovulationDay ?? cycle - 14;

  const segments: { phase: PhaseKey; from: number; to: number }[] = [
    { phase: "menstrual", from: 1, to: flowLen },
    { phase: "follicular", from: flowLen + 1, to: Math.max(flowLen + 1, ovu - 2) },
    { phase: "ovulation", from: Math.max(flowLen + 2, ovu - 1), to: ovu + 1 },
    { phase: "luteal", from: Math.max(ovu + 2, flowLen + 1), to: cycle },
  ];

  const day = model.currentDay ?? 1;
  const todayPos = polar(cx, cy, r, degForDay(Math.min(day, cycle)));
  const observedEnd = degForDay(Math.min(day, cycle));

  return (
    <figure
      className={cn("relative flex flex-col items-center gap-3", className)}
      style={{ width: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={
          model.currentDay
            ? `Cycle ring — day ${model.currentDay} of about ${cycle}, currently in the ${model.currentPhase ?? ""} phase`
            : "Cycle ring — no cycle logged yet"
        }
      >
        {/* base track */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeOpacity={0.55}
          strokeWidth={9}
        />

        {/* phase arcs — selectable; whole-cycle soft base */}
        {segments.map((s) => {
          const d = arc(cx, cy, r, degForDay(s.from), degForDay(Math.max(s.to, s.from + 0.2)));
          if (!d) return null;
          const active = focus?.phase === s.phase;
          const label = `${s.phase}: days ${s.from}–${Math.max(s.to, s.from)}${
            model.lastPeriodStart
              ? ` · ${fmtShort(dayToDate(model, s.from))} – ${fmtShort(dayToDate(model, s.to))}`
              : ""
          }${s.phase === "ovulation" || s.phase === "luteal" ? " · estimated unless you logged evidence" : ""}`;
          return (
            <g
              key={`${uid}-${s.phase}`}
              role="button"
              tabIndex={0}
              aria-label={label}
              aria-pressed={active}
              onClick={() => setFocus(active ? null : { phase: s.phase, from: s.from, to: s.to })}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setFocus(active ? null : { phase: s.phase, from: s.from, to: s.to });
                }
              }}
              className="cursor-pointer focus:outline-none"
              onFocus={() => setFocus({ phase: s.phase, from: s.from, to: s.to })}
            >
              {/* fat invisible hit area for touch */}
              <path d={d} fill="none" stroke="transparent" strokeWidth={22} strokeLinecap="round" />
              <path
                d={d}
                fill="none"
                stroke={PHASE_COLOR[s.phase]}
                strokeOpacity={active ? 0.95 : 0.34}
                strokeWidth={active ? 13 : 9}
                strokeLinecap="round"
                className="transition-all duration-[var(--motion-med)]"
              />
            </g>
          );
        })}

        {/* observed stretch of the current cycle — solid + stronger */}
        {model.lastPeriodStart ? (
          <path
            d={arc(cx, cy, r, 0, observedEnd)}
            fill="none"
            stroke={model.currentPhase ? PHASE_COLOR[model.currentPhase] : "var(--foreground)"}
            strokeOpacity={0.9}
            strokeWidth={11}
            strokeLinecap="round"
            className="transition-all duration-[var(--motion-slow)]"
          />
        ) : null}

        {/* remaining stretch stays the soft track (dashed hint) */}
        {model.lastPeriodStart && day < cycle ? (
          <path
            d={arc(cx, cy, r, observedEnd, 360)}
            fill="none"
            stroke="var(--cycle-predicted)"
            strokeOpacity={0.28}
            strokeWidth={2}
            strokeDasharray="1 7"
            strokeLinecap="round"
          />
        ) : null}

        {/* today marker */}
        <g className="transition-transform duration-[var(--motion-slow)]">
          <circle cx={todayPos.x} cy={todayPos.y} r={10} fill="var(--background)" />
          <circle
            cx={todayPos.x}
            cy={todayPos.y}
            r={6.5}
            fill={model.currentPhase ? PHASE_COLOR[model.currentPhase] : "var(--foreground)"}
            stroke="var(--background)"
            strokeWidth={3}
          />
        </g>

        {/* center read-out — day and total length */}
        <text
          x={cx}
          y={cy - 10}
          textAnchor="middle"
          className="fill-foreground"
          style={{ fontFamily: "var(--font-display)", fontSize: 44, letterSpacing: "-0.03em" }}
        >
          {model.currentDay ?? "—"}
          <tspan style={{ fontSize: 18 }} className="fill-[var(--muted-foreground)]">
            {" "}
            / {cycle}
          </tspan>
        </text>
        <text
          x={cx}
          y={cy + 14}
          textAnchor="middle"
          className="fill-muted-foreground"
          style={{ fontSize: 11, letterSpacing: "0.08em" }}
        >
          CYCLE DAY · {model.usesDefaultAssumption ? "general length" : "your length"}
        </text>
        {model.currentPhase ? (
          <text
            x={cx}
            y={cy + 36}
            textAnchor="middle"
            style={{ fontSize: 12.5, fill: PHASE_COLOR[model.currentPhase], fontWeight: 600 }}
          >
            {model.currentPhase === "ovulation"
              ? "estimated window"
              : `${model.currentPhase} phase`}
          </text>
        ) : null}
      </svg>

      {/* focusable phase legend */}
      <div
        className="flex flex-wrap items-center justify-center gap-1"
        role="group"
        aria-label="Cycle phases of the current model — select one for its range"
      >
        {segments.map((s) => (
          <button
            key={`lg-${s.phase}`}
            type="button"
            onFocus={() => setFocus({ phase: s.phase, from: s.from, to: s.to })}
            onBlur={() => setFocus(null)}
            onMouseEnter={() => setFocus({ phase: s.phase, from: s.from, to: s.to })}
            onMouseLeave={() => setFocus(null)}
            className="mono flex items-center gap-1.5 rounded-full px-2 py-1 text-[9.5px] uppercase tracking-[0.07em] text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground"
            aria-label={`${s.phase} phase, days ${s.from} to ${Math.max(s.to, s.from)} of the cycle`}
          >
            <span
              className="size-2 rounded-full"
              style={{ background: PHASE_COLOR[s.phase] }}
              aria-hidden
            />
            {s.phase}
          </button>
        ))}
      </div>

      <p
        aria-live="polite"
        className="min-h-[18px] text-center text-[11.5px] text-muted-foreground"
      >
        {focus
          ? `${focus.phase} — days ${focus.from}–${Math.max(focus.to, focus.from)}${model.lastPeriodStart ? ` · ${fmtShort(dayToDate(model, focus.from))} – ${fmtShort(dayToDate(model, focus.to))}` : ""}${model.confidence === "assumed" ? " · general pattern, not personalized yet" : " · from your model"}`
          : "Solid = your logged stretch · soft = estimated ahead"}
      </p>
    </figure>
  );
}

function dayToDate(model: CycleModel, dayNum: number): string {
  if (!model.lastPeriodStart) return model.today;
  const d = new Date(`${model.lastPeriodStart}T00:00:00`);
  d.setDate(d.getDate() + Math.max(0, dayNum - 1));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
