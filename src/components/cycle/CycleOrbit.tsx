/**
 * CycleOrbit — the bespoke center of the page. Layered SVG: an outer guide
 * hairline with week ticks, the four phase arcs with small separations,
 * the day's truth split into what is grounded and what is modelled
 * (solid = logged stretch, soft-dashed = estimated ahead), a quiet ivory
 * trace of the days actually lived so far, a breathing today marker with an
 * ivory center and thin accent ring, and a highlight that travels, slowly,
 * through the active phase. Phase names sit on the orbit itself — you can
 * see where you are and where you're going without reading a legend, but
 * the keyboard-accessible legend + pinned selection stay for everyone.
 * Selecting a day anywhere on the page (timeline, calendar) moves the
 * focus indicator here; the geometry recomputes from the model, never from
 * hardcoded pixels.
 */

import { useId, useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import type { CycleEntry, CycleModel, PhaseKey } from "@/lib/cycle/types";
import { fmtShort } from "@/lib/cycle/engine";
import { PHASE_COLOR } from "@/lib/cycle/palette";

const VBW = 540;
const VBH = 424;
const C = VBW / 2;
const CY = VBH / 2;
const R = 164; // phase ring
const GUIDE = 192; // outer hairline
const TRACE = 140; // "days lived" inner track

function polar(r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: C + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function arcPath(r: number, a0: number, a1: number) {
  const sweep = a1 - a0;
  if (sweep <= 0.15) return "";
  const s = polar(r, a0);
  const e = polar(r, a1);
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${e.x} ${e.y}`;
}

export type Seg = { phase: PhaseKey; from: number; to: number };

const PHASE_NOTE: Record<PhaseKey, string> = {
  menstrual: "bleeding days — mostly defined by what you log",
  follicular: "the build-up toward ovulation",
  ovulation: "the brief fertile peak — a window, never a guaranteed day",
  luteal: "the long wait — the most variable stretch of any cycle",
};

export function segmentsFor(model: CycleModel): Seg[] {
  const cycle = Math.round(model.average ?? 28);
  const flowLen = Math.max(2, Math.round(model.periodLengthAverage ?? 4));
  const ovu = model.ovulationDay ?? cycle - 14;
  return [
    { phase: "menstrual", from: 1, to: flowLen },
    { phase: "follicular", from: flowLen + 1, to: Math.max(flowLen + 1, ovu - 2) },
    { phase: "ovulation", from: Math.max(flowLen + 2, ovu - 1), to: ovu + 1 },
    { phase: "luteal", from: Math.max(ovu + 2, flowLen + 1), to: cycle },
  ];
}

export function dayToDate(model: CycleModel, dayNum: number): string {
  if (!model.lastPeriodStart) return model.today;
  const d = new Date(`${model.lastPeriodStart}T00:00:00`);
  d.setDate(d.getDate() + Math.max(0, dayNum - 1));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function CycleOrbit({
  model,
  entries,
  inspect = null,
  className,
}: {
  model: CycleModel;
  entries: CycleEntry[];
  /** a day selected elsewhere on the page — the focus indicator moves here */
  inspect?: { day: number; date: string } | null;
  className?: string;
}) {
  const uid = useId();
  const [hover, setHover] = useState<Seg | null>(null);
  const [pinned, setPinned] = useState<Seg | null>(null);

  const cycle = Math.round(model.average ?? 28);
  const day = model.currentDay ?? 0;
  const degForDay = (d: number) => ((d - 1) / cycle) * 360;
  const segments = useMemo(() => segmentsFor(model), [model]);
  const shown = pinned ?? hover;

  const pick = (s: Seg) => {
    const wasPinned = pinned?.phase === s.phase;
    setPinned(wasPinned ? null : s);
    setHover(wasPinned ? null : s);
  };

  const todayDeg = day > 0 ? degForDay(Math.min(day, cycle)) : 0;
  const todayPos = polar(R, todayDeg);
  const inspectPos = inspect
    ? polar(R, degForDay(Math.min(Math.max(inspect.day, 1), cycle)))
    : null;

  const activePhase = model.currentPhase;

  const loggedCount = (s: Seg) => {
    if (!model.lastPeriodStart) return 0;
    const from = dayToDate(model, s.from);
    const to = dayToDate(model, s.to);
    return entries.filter((e) => e.date >= from && e.date <= to).length;
  };

  const note = shown
    ? `${shown.phase} — days ${shown.from}–${Math.max(shown.to, shown.from)}${
        model.lastPeriodStart
          ? ` · ${fmtShort(dayToDate(model, shown.from))} – ${fmtShort(dayToDate(model, shown.to))}`
          : ""
      } · ${PHASE_NOTE[shown.phase]}.${
        model.lastPeriodStart
          ? loggedCount(shown) > 0
            ? ` You logged ${loggedCount(shown)} day${loggedCount(shown) === 1 ? "" : "s"} in this stretch of the current cycle.`
            : " Nothing logged in this stretch yet — it stays an outline until you do."
          : ""
      }`
    : inspect
      ? `Viewing ${fmtShort(inspect.date)} — cycle day ${inspect.day}. Everything on the page follows your selection.`
      : "Solid = your logged stretch · soft dashes = Bloom's estimate ahead.";

  const alt = model.currentDay
    ? `Cycle orbit — day ${model.currentDay} of about ${cycle}. ` +
      segments.map((s) => `${s.phase}: days ${s.from}–${Math.max(s.to, s.from)}`).join("; ") +
      `. Currently ${model.currentPhase ?? "no phase"} — ${
        model.confidence === "assumed"
          ? "general pattern, not personalized yet"
          : "your own history"
      }.`
    : "Cycle orbit — waiting for your first logged period start.";

  return (
    <figure className={cn("relative flex w-full flex-col items-center gap-3", className)}>
      <span
        className="cy-orbit-halo"
        aria-hidden
        style={{
          background: activePhase
            ? `radial-gradient(46% 46% at 50% 50%, color-mix(in oklab, ${PHASE_COLOR[activePhase]} 15%, transparent), transparent 70%)`
            : "radial-gradient(46% 46% at 50% 50%, color-mix(in oklab, var(--violet) 9%, transparent), transparent 70%)",
        }}
      />
      <svg
        viewBox={`0 0 ${VBW} ${VBH}`}
        role="img"
        aria-label={alt}
        className="w-full"
        style={{ height: "auto" }}
      >
        <defs>
          <radialGradient id={`face-${uid}`} cx="50%" cy="42%" r="65%">
            <stop offset="0%" stopColor="var(--foreground)" stopOpacity="0.045" />
            <stop offset="70%" stopColor="var(--foreground)" stopOpacity="0.012" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* floating face + outer guide with week ticks */}
        <circle cx={C} cy={CY} r={R + 26} fill={`url(#face-${uid})`} pointerEvents="none" />
        <circle
          cx={C}
          cy={CY}
          r={GUIDE}
          fill="none"
          stroke="var(--cycle-hair)"
          strokeWidth={1}
          pointerEvents="none"
        />
        {Array.from({ length: Math.floor(cycle / 7) }, (_, i) => {
          const d = 1 + (i + 1) * 7;
          if (d > cycle) return null;
          const p0 = polar(GUIDE - 4, degForDay(d));
          const p1 = polar(GUIDE + 4, degForDay(d));
          return (
            <line
              key={`t${i}`}
              x1={p0.x}
              y1={p0.y}
              x2={p1.x}
              y2={p1.y}
              stroke="var(--cycle-hair-strong)"
              strokeWidth={1}
            />
          );
        })}

        {/* faint base ring so the orbit reads as one system */}
        <circle
          cx={C}
          cy={C}
          r={R}
          fill="none"
          stroke="var(--border)"
          strokeOpacity={0.5}
          strokeWidth={12}
        />

        {/* phase arcs: grounded stretch solid, estimate ahead soft-dashed */}
        {segments.map((s) => {
          const a0 = degForDay(s.from);
          const a1 = degForDay(Math.max(s.to + 1, s.from + 1));
          const span = a1 - a0;
          const gap = span > 10 ? 2 : 0.4;
          const isActive = activePhase === s.phase;
          const isShown = shown?.phase === s.phase;
          const pastEnd = Math.min(Math.max(s.to, s.from), day);
          const solid =
            day > 0 && pastEnd >= s.from ? arcPath(R, a0 + gap, degForDay(pastEnd + 1) - gap) : "";
          const dashed =
            day > 0 && s.to > day
              ? arcPath(R, degForDay(Math.max(day + 1, s.from)) + gap, a1 - gap)
              : "";
          const whole = solid || dashed ? "" : arcPath(R, a0 + gap, a1 - gap); // pre-anchor: all outline
          return (
            <g
              key={`${uid}-${s.phase}`}
              role="button"
              tabIndex={0}
              aria-label={`${s.phase} phase, cycle days ${s.from} to ${Math.max(s.to, s.from)}. Activate to keep its summary open.`}
              aria-pressed={pinned?.phase === s.phase}
              onClick={() => pick(s)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  pick(s);
                }
              }}
              onMouseEnter={() => setHover(s)}
              onMouseLeave={() => pinned === null && setHover(null)}
              onFocus={() => setHover(s)}
              onBlur={() => pinned === null && setHover(null)}
              className="cursor-pointer outline-none"
            >
              {isShown ? (
                <path
                  d={arcPath(R, a0 + gap * 0.25, a1 - gap * 0.25)}
                  fill="none"
                  stroke={PHASE_COLOR[s.phase]}
                  strokeOpacity={0.17}
                  strokeWidth={20}
                  strokeLinecap="round"
                />
              ) : null}
              {/* soft modelled baseline for the whole segment */}
              <path
                d={arcPath(R, a0 + gap, a1 - gap)}
                fill="none"
                stroke={PHASE_COLOR[s.phase]}
                strokeOpacity={isShown ? 0.4 : 0.24}
                strokeWidth={isActive ? 13 : 11}
                strokeLinecap="round"
                className="transition-all duration-[var(--cy-med)]"
              />
              {solid ? (
                <path
                  d={solid}
                  fill="none"
                  stroke={PHASE_COLOR[s.phase]}
                  strokeOpacity={isShown ? 1 : 0.88}
                  strokeWidth={isActive ? 14 : 12}
                  strokeLinecap="round"
                  className="transition-all duration-[var(--cy-med)]"
                />
              ) : null}
              {dashed ? (
                <path
                  d={dashed}
                  fill="none"
                  stroke={PHASE_COLOR[s.phase]}
                  strokeOpacity={0.42}
                  strokeWidth={isActive ? 12 : 10}
                  strokeDasharray="7 7"
                  strokeLinecap="round"
                />
              ) : null}
              {whole ? (
                <path
                  d={whole}
                  fill="none"
                  stroke={PHASE_COLOR[s.phase]}
                  strokeOpacity={0.5}
                  strokeWidth={10}
                  strokeDasharray="3 7"
                  strokeLinecap="round"
                />
              ) : null}
              {/* the slow highlight travelling through the active phase */}
              {isActive && day > 0 && !inspect ? (
                <path
                  d={arcPath(R, a0 + gap, a1 - gap)}
                  className="cy-travel"
                  fill="none"
                  stroke="var(--foreground)"
                  strokeOpacity={0.28}
                  strokeWidth={4}
                  strokeLinecap="round"
                  pathLength={100}
                  strokeDasharray="12 102"
                  style={{ strokeDashoffset: 0 }}
                />
              ) : null}
              <path d={arcPath(R, a0, a1)} fill="none" stroke="transparent" strokeWidth={30} />
            </g>
          );
        })}

        {/* phase names integrated on the orbit */}
        {segments.map((s) => {
          const mid = (degForDay(s.from) + degForDay(Math.max(s.to, s.from) + 1)) / 2;
          const p = polar(R + 36, mid);
          const isActive = activePhase === s.phase;
          const anchor =
            mid > 30 && mid < 150 ? "start" : mid > 210 && mid < 330 ? "end" : "middle";
          const dx = anchor === "start" ? -4 : anchor === "end" ? 4 : 0;
          return (
            <text
              key={`lbl-${uid}-${s.phase}`}
              x={p.x + dx}
              y={p.y}
              textAnchor={anchor}
              dominantBaseline="middle"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9.2,
                letterSpacing: "0.1em",
                fill: PHASE_COLOR[s.phase],
                opacity: shown?.phase === s.phase || isActive ? 0.95 : 0.48,
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "opacity var(--cy-med) ease",
              }}
              onClick={() => pick(s)}
              aria-hidden
            >
              {s.phase}
            </text>
          );
        })}

        {/* the stretch actually lived — ivory trace inside */}
        {day > 1 ? (
          <path
            d={arcPath(TRACE, 0, todayDeg)}
            fill="none"
            stroke="var(--foreground)"
            strokeOpacity={0.6}
            strokeWidth={2}
            strokeLinecap="round"
          />
        ) : null}
        {day > 0 && day < cycle ? (
          <path
            d={arcPath(TRACE, todayDeg, 360)}
            fill="none"
            stroke="var(--cycle-predicted)"
            strokeOpacity={0.3}
            strokeWidth={1.5}
            strokeDasharray="1 6"
            strokeLinecap="round"
          />
        ) : null}

        {/* today — deliberate, not a chart cursor */}
        {day > 0 ? (
          <g>
            <line
              x1={polar(R - 34, todayDeg).x}
              y1={polar(R - 34, todayDeg).y}
              x2={polar(R - 20, todayDeg).x}
              y2={polar(R - 20, todayDeg).y}
              stroke="var(--foreground)"
              strokeOpacity={0.45}
              strokeWidth={1.4}
              strokeLinecap="round"
            />
            <circle
              className="cy-breathe"
              cx={todayPos.x}
              cy={todayPos.y}
              r={15}
              fill={activePhase ? PHASE_COLOR[activePhase] : "var(--violet)"}
              opacity={0.16}
            />
            <circle cx={todayPos.x} cy={todayPos.y} r={10} fill="var(--background)" />
            <circle
              cx={todayPos.x}
              cy={todayPos.y}
              r={7}
              fill="none"
              stroke={activePhase ? PHASE_COLOR[activePhase] : "var(--foreground)"}
              strokeWidth={2}
            />
            <circle cx={todayPos.x} cy={todayPos.y} r={3.1} fill="var(--foreground)" />
          </g>
        ) : null}

        {/* selected-day focus moves here */}
        {inspectPos ? (
          <g className="cy-focus-in">
            <circle
              cx={inspectPos.x}
              cy={inspectPos.y}
              r={9}
              fill="none"
              stroke="var(--foreground)"
              strokeOpacity={0.55}
              strokeWidth={1.4}
              strokeDasharray="2.5 3.5"
            />
          </g>
        ) : null}

        {/* center: a hierarchy, not just a number */}
        {model.lastPeriodStart && model.currentDay ? (
          <>
            <text
              x={C}
              y={CY - 44}
              textAnchor="middle"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9.5,
                letterSpacing: "0.16em",
                fill: "var(--faint)",
                textTransform: "uppercase",
              }}
            >
              {inspect ? `viewing · ${fmtShort(inspect.date)}` : "cycle day"}
            </text>
            <text
              x={C}
              y={CY + 4}
              textAnchor="middle"
              className="fill-foreground"
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 500,
                fontSize: 62,
                letterSpacing: "-0.035em",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {inspect ? inspect.day : model.currentDay}
            </text>
            <text
              x={C}
              y={CY + 30}
              textAnchor="middle"
              className="fill-muted-foreground"
              style={{ fontSize: 12.5, letterSpacing: "0.02em" }}
            >
              of your {model.confidence === "assumed" ? "general" : "estimated"} {cycle}-day cycle
            </text>
            <text
              x={C}
              y={CY + 58}
              textAnchor="middle"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 16.5,
                fill: PHASE_COLOR[
                  (inspect ? model.dayPhase(inspect.day) : model.currentPhase) ?? "luteal"
                ],
              }}
            >
              {(() => {
                const ph = inspect ? model.dayPhase(inspect.day) : model.currentPhase;
                if (!ph) return "";
                const label =
                  ph === "ovulation"
                    ? "Ovulation window"
                    : ph.charAt(0).toUpperCase() + ph.slice(1) + " phase";
                return model.confidence === "assumed" ? `${label} · estimated` : label;
              })()}
            </text>
          </>
        ) : (
          <>
            <text
              x={C}
              y={CY - 16}
              textAnchor="middle"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 21,
                letterSpacing: "-0.015em",
                fill: "var(--foreground)",
              }}
            >
              Your first cycle
            </text>
            <text
              x={C}
              y={CY + 10}
              textAnchor="middle"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 21,
                letterSpacing: "-0.015em",
                fill: "var(--foreground)",
              }}
            >
              starts here
            </text>
            <text
              x={C}
              y={CY + 38}
              textAnchor="middle"
              className="fill-muted-foreground"
              style={{ fontSize: 11.5 }}
            >
              Bloom is ready to learn your pattern —
            </text>
            <text
              x={C}
              y={CY + 54}
              textAnchor="middle"
              className="fill-muted-foreground"
              style={{ fontSize: 11.5 }}
            >
              not to guess it.
            </text>
          </>
        )}
      </svg>

      <p
        aria-live="polite"
        className="min-h-[34px] max-w-[46ch] px-2 text-center text-[11.5px] leading-snug text-muted-foreground"
      >
        {note}
      </p>
    </figure>
  );
}
