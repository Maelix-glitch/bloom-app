/**
 * CycleWheel — the page's visual anchor. A purpose-built SVG (not a
 * chart-library donut): phase arcs proportional to the actual model, small
 * separations between arcs, a refined outer guide ring, and today marked at
 * its true angle without a giant glow. The current day sits in the center
 * with the total length beneath it. Segments are selectable (mouse, touch,
 * keyboard) and reveal a concise phase explanation in place; a text
 * alternative carries the same information for assistive tech. The past
 * stretch of the current cycle is solid — everything ahead stays soft and
 * visibly estimated.
 */

import { useId, useState } from "react";

import { cn } from "@/lib/utils";
import type { CycleModel, PhaseKey } from "@/lib/cycle/types";
import { fmtShort } from "@/lib/cycle/engine";
import { PHASE_COLOR } from "@/lib/cycle/palette";

const VB = 360; // fixed internal coordinate space; CSS scales the whole wheel
const C = VB / 2;

function polar(r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: C + r * Math.cos(rad), y: C + r * Math.sin(rad) };
}

function arc(r: number, startDeg: number, endDeg: number) {
  const sweep = endDeg - startDeg;
  if (sweep <= 0.1) return "";
  const s = polar(r, startDeg);
  const e = polar(r, endDeg);
  const large = sweep > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

function dayToDate(model: CycleModel, dayNum: number): string {
  if (!model.lastPeriodStart) return model.today;
  const d = new Date(`${model.lastPeriodStart}T00:00:00`);
  d.setDate(d.getDate() + Math.max(0, dayNum - 1));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const PHASE_NOTE: Record<PhaseKey, string> = {
  menstrual: "bleeding days — the only phase mostly defined by what you log",
  follicular: "the build-up toward ovulation — estimates, unless you logged signs",
  ovulation: "the brief fertile peak — an estimated window, not a fixed day",
  luteal: "the wait after ovulation — the most variable stretch of any cycle",
};

export function CycleWheel({ model, className }: { model: CycleModel; className?: string }) {
  const uid = useId();
  const [focus, setFocus] = useState<{ phase: PhaseKey; from: number; to: number } | null>(null);
  const [pinned, setPinned] = useState<PhaseKey | null>(null);

  const pick = (s: { phase: PhaseKey; from: number; to: number }) => {
    const wasPinned = pinned === s.phase;
    setPinned(wasPinned ? null : s.phase);
    setFocus(wasPinned ? null : s);
  };

  const cycle = Math.round(model.average ?? 28);
  const r = 148;
  const rIn = r - 16;
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
  const todayDeg = degForDay(Math.min(day, cycle));
  const todayPos = polar(r, todayDeg);

  const altText = model.currentDay
    ? `Cycle wheel — day ${model.currentDay} of about ${cycle}. ` +
      segments.map((s) => `${s.phase}: days ${s.from}–${Math.max(s.to, s.from)}`).join("; ") +
      `. Currently ${model.currentPhase ?? "no phase determined"}${
        model.confidence === "assumed"
          ? " — general pattern, not personalized yet"
          : " — from your model"
      }.`
    : "Cycle wheel — no cycle logged yet. Log a period start to bring it to life.";

  return (
    <figure className={cn("relative flex w-full flex-col items-center gap-2.5", className)}>
      <span
        className="cy-wheel-glow"
        aria-hidden
        style={{
          background: model.currentPhase
            ? `radial-gradient(50% 52% at 50% 50%, color-mix(in oklab, ${PHASE_COLOR[model.currentPhase]} 13%, transparent), transparent 70%)`
            : "radial-gradient(50% 52% at 50% 50%, color-mix(in oklab, var(--violet) 9%, transparent), transparent 70%)",
        }}
      />
      <svg
        viewBox={`0 0 ${VB} ${VB}`}
        role="img"
        aria-label={altText}
        className="w-full"
        style={{ height: "auto" }}
      >
        {/* refined outer guide ring — hairline, optically concentric */}
        <circle cx={C} cy={C} r={r + 12} fill="none" stroke="var(--cycle-hair)" strokeWidth={1} />
        {model.lastPeriodStart ? (
          <circle
            cx={C}
            cy={C}
            r={r + 12}
            fill="none"
            stroke={model.currentPhase ? PHASE_COLOR[model.currentPhase] : "var(--violet)"}
            strokeOpacity={0.5}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeDasharray={`${(todayDeg / 360) * 2 * Math.PI * (r + 12)} ${2 * Math.PI * (r + 12)}`}
            transform={`rotate(-90 ${C} ${C})`}
          />
        ) : null}

        {/* base track */}
        <circle
          cx={C}
          cy={C}
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeOpacity={0.5}
          strokeWidth={10}
        />

        {/* phase arcs, separated by small angular gaps — selectable */}
        {segments.map((s) => {
          const fromDeg = degForDay(s.from);
          const toDeg = degForDay(Math.max(s.to + 1, s.from + 1));
          const span = toDeg - fromDeg;
          const gap = span > 8 ? 1.5 : 0.3;
          const d = arc(r, fromDeg + gap, toDeg - gap);
          if (!d) return null;
          const active = focus?.phase === s.phase;
          return (
            <g
              key={`${uid}-${s.phase}`}
              role="button"
              tabIndex={0}
              aria-label={`${s.phase} phase, cycle days ${s.from} to ${Math.max(s.to, s.from)}`}
              aria-pressed={active}
              onClick={() => pick(s)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setFocus(active ? null : s);
                }
              }}
              onFocus={() => setFocus(s)}
              className="cursor-pointer focus:outline-none"
            >
              <path d={d} fill="none" stroke="transparent" strokeWidth={26} strokeLinecap="round" />
              <path
                d={d}
                fill="none"
                stroke={PHASE_COLOR[s.phase]}
                strokeOpacity={active ? 0.95 : 0.55}
                strokeWidth={active ? 16 : 11}
                strokeLinecap="round"
                className="transition-all duration-[var(--motion-med)]"
              />
            </g>
          );
        })}

        {/* the stretch you actually lived through so far this cycle — solid */}
        {model.lastPeriodStart && day > 1 ? (
          <path
            d={arc(rIn, 0, todayDeg)}
            fill="none"
            stroke={model.currentPhase ? PHASE_COLOR[model.currentPhase] : "var(--foreground)"}
            strokeOpacity={0.85}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        ) : null}

        {/* ahead of today — visibly only estimated */}
        {model.lastPeriodStart && day < cycle ? (
          <path
            d={arc(rIn, todayDeg, 360)}
            fill="none"
            stroke="var(--cycle-predicted)"
            strokeOpacity={0.3}
            strokeWidth={2}
            strokeDasharray="1 6"
            strokeLinecap="round"
          />
        ) : null}

        {/* today — obvious, calm: a marker on the ring + tick toward center */}
        <line
          x1={polar(r - 26, todayDeg).x}
          y1={polar(r - 26, todayDeg).y}
          x2={polar(r - 12, todayDeg).x}
          y2={polar(r - 12, todayDeg).y}
          stroke="var(--foreground)"
          strokeOpacity={0.55}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        <circle cx={todayPos.x} cy={todayPos.y} r={11} fill="var(--background)" />
        <circle
          cx={todayPos.x}
          cy={todayPos.y}
          r={6.5}
          fill={model.currentPhase ? PHASE_COLOR[model.currentPhase] : "var(--foreground)"}
          stroke="var(--background)"
          strokeWidth={3}
        />

        {/* center read-out — day in the middle, total beneath */}
        <text
          x={C}
          y={C - 4}
          textAnchor="middle"
          className="fill-foreground"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 500,
            fontSize: 58,
            letterSpacing: "-0.03em",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {model.currentDay ?? "—"}
        </text>
        <text
          x={C}
          y={C + 20}
          textAnchor="middle"
          className="fill-muted-foreground"
          style={{ fontSize: 13, letterSpacing: "0.06em" }}
        >
          of {cycle} days
        </text>
        <text
          x={C}
          y={C + 46}
          textAnchor="middle"
          style={{
            fontSize: 12,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            fill: model.currentPhase ? PHASE_COLOR[model.currentPhase] : "var(--faint)",
            fontWeight: 600,
          }}
        >
          {model.currentPhase === "ovulation"
            ? "ESTIMATED WINDOW"
            : model.currentPhase
              ? `${model.currentPhase.toUpperCase()} PHASE`
              : "AWAITING FIRST LOG"}
        </text>
      </svg>

      {/* legend doubles as the keyboard route into segment selection */}
      <div
        className="flex flex-wrap items-center justify-center gap-0.5"
        role="group"
        aria-label="Cycle phases — select one for its range"
      >
        {segments.map((s) => (
          <button
            key={`lg-${uid}-${s.phase}`}
            type="button"
            onClick={() => pick(s)}
            onMouseEnter={() => pinned === null && setFocus(s)}
            onMouseLeave={() => pinned === null && setFocus(null)}
            onFocus={() => setFocus(s)}
            onBlur={() => setFocus(null)}
            className="mono flex items-center gap-1.5 rounded-full px-2 py-1 text-[9.5px] uppercase tracking-[0.07em] text-muted-foreground transition-colors hover:text-foreground"
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
        className="min-h-[34px] max-w-[42ch] px-2 text-center text-[11.5px] leading-snug text-muted-foreground"
      >
        {focus
          ? `${focus.phase} — days ${focus.from}–${Math.max(focus.to, focus.from)}${
              model.lastPeriodStart
                ? ` · ${fmtShort(dayToDate(model, focus.from))} – ${fmtShort(dayToDate(model, focus.to))}`
                : ""
            }. ${PHASE_NOTE[focus.phase]}.`
          : "Solid arc = your logged stretch · dashed = estimated ahead. Select a phase for its range."}
      </p>
    </figure>
  );
}
