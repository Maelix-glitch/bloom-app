/**
 * CycleOrbit v2 — a personal orbital map, not an analytics donut.
 * Five layers, each legible on its own and composed as one object:
 *   outer complete-cycle ring with week ticks · phase arcs that flow into
 *   one another (micro-separations, no heavy borders) · the current-state
 *   trace (solid ivory = days actually logged/lived) · the forecast shell
 *   (dashed, translucent — uncertainty rendered as material, honestly) ·
 *   today's marker (ivory core, soft glow, indicator hairline, tiny label).
 * Phase names whisper around the rim; hovering or focusing one emphasizes
 * the arc and floats a contextual card beside the ring — dates when the
 * data supports them, "not enough personal data yet" when it doesn't.
 * Rings draw themselves in once on mount; everything honors reduced
 * motion. Geometry adapts to the real cycle length — 24 days, 31, any.
 */

import { useEffect, useId, useMemo, useRef, useState, type MouseEvent } from "react";
import { motion, useReducedMotion } from "motion/react";

import { FADE, MOVE, TAP } from "@/lib/cycle/motion";

import { cn } from "@/lib/utils";
import { dayStateCopy } from "@/lib/cycle/presentation";
import type { CycleEntry, CycleModel, PhaseKey } from "@/lib/cycle/types";
import { addDays, dayStateFor, diffDays, fmtShort } from "@/lib/cycle/engine";
import { PHASE_COLOR } from "@/lib/cycle/palette";

const VBW = 596;
const VBH = 470;
const C = VBW / 2;
const CY = VBH / 2;
const R = 168; // phase ring
const GUIDE = 198; // outer hairline
const TRACE = 140; // days-lived track
const LABEL_R = 224;

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
type BleedingArc = { observedDays: number[]; estimateTo: number; hasEstimate: boolean };

export function segmentsFor(model: CycleModel): Seg[] {
  const cycle = Math.round(model.average ?? 28);
  const ovu = model.ovulationDay ?? cycle - 14;
  return [
    { phase: "follicular", from: 1, to: Math.max(1, ovu - 2) },
    { phase: "ovulation", from: Math.max(2, ovu - 1), to: ovu + 1 },
    { phase: "luteal", from: Math.max(ovu + 2, 2), to: cycle },
  ];
}

export function dayToDate(model: CycleModel, dayNum: number): string {
  if (!model.lastPeriodStart) return model.today;
  return addDays(model.lastPeriodStart, Math.max(0, dayNum - 1));
}

export function CycleOrbit({
  model,
  entries,
  inspect = null,
  selectedPhase = null,
  onSelectPhase,
  className,
}: {
  model: CycleModel;
  entries: CycleEntry[];
  /** a day selected elsewhere on the page — the focus indicator follows */
  inspect?: { day: number; date: string } | null;
  /** phase focused page-wide (the phase explorer drives this too) */
  selectedPhase?: PhaseKey | null;
  onSelectPhase?: (p: PhaseKey | null) => void;
  className?: string;
}) {
  const uid = useId();
  const figureRef = useRef<HTMLElement>(null);
  const [hover, setHover] = useState<Seg | null>(null);
  const [cardPos, setCardPos] = useState({ left: 0, top: 0 });

  const cycle = Math.round(model.average ?? 28);
  const day = model.currentDay ?? 0;
  const degForDay = (d: number) => ((d - 1) / cycle) * 360;
  const segments = useMemo(() => segmentsFor(model), [model]);
  const bleedingArc = useMemo<BleedingArc | null>(() => {
    if (!model.lastPeriodStart) return null;
    const observedDays = entries
      .filter((e) => e.date >= model.lastPeriodStart! && e.flow && e.flow !== "none")
      .map((e) => diffDays(model.lastPeriodStart!, e.date) + 1)
      .filter((d) => d >= 1 && d <= cycle)
      .sort((a, b) => a - b);
    const event = model.events.find((e) => e.id === "bleeding-window");
    const estimatedTo = event?.rangeEnd ? diffDays(model.lastPeriodStart, event.rangeEnd) + 1 : 0;
    const estimateTo = Math.max(observedDays.at(-1) ?? 0, estimatedTo);
    if (observedDays.length === 0 && estimateTo <= 0) return null;
    return {
      observedDays,
      estimateTo: Math.max(1, Math.min(cycle, estimateTo || observedDays.at(-1) || 1)),
      hasEstimate: Boolean(event?.predicted),
    };
  }, [cycle, entries, model]);
  const animated = useAnimatedSegments(segments);
  const highlighted = hover ?? segments.find((x) => x.phase === selectedPhase) ?? null;
  const cardSeg = hover;
  const activePhase = model.currentReproductivePhase;
  const activeSegment = activePhase ? segments.find((x) => x.phase === activePhase) : null;

  const pick = (s: Seg) => {
    onSelectPhase?.(selectedPhase === s.phase ? null : s.phase);
  };

  const moveCardToPointer = (e: MouseEvent<SVGGElement>) => {
    const rect = figureRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cardW = 232;
    const cardH = 104;
    const gap = 16;
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;
    const opensRight = rawX + cardW + gap < rect.width;
    const left = Math.min(
      Math.max(6, opensRight ? rawX + gap : rawX - cardW - gap),
      Math.max(6, rect.width - cardW - 6),
    );
    const top = Math.min(Math.max(6, rawY - cardH / 2), Math.max(6, rect.height - cardH - 6));
    setCardPos({ left, top });
  };

  const todayDeg = day > 0 ? degForDay(Math.min(day, cycle)) : 0;
  const todayPos = polar(R, todayDeg);
  const todayLabelPos = polar(GUIDE + 18, todayDeg);
  const inspectDay = inspect ? Math.min(Math.max(inspect.day, 1), cycle) : null;
  const centerState = inspect
    ? dayStateFor(inspect.date, entries, model)
    : {
        logged: null,
        phase: model.currentPhase,
        bleedingState: model.currentBleedingState,
        bleedingProvenance: model.currentBleedingProvenance,
        reproductivePhase: model.currentReproductivePhase,
        reproductiveProvenance: model.currentReproductiveProvenance,
        cycleDay: model.currentDay,
        predictedPeriod: false,
        predictedFertile: false,
        predictedOvulation: false,
        pms: false,
        provenance: model.currentProvenance,
        conflict: null,
      };
  const centerCopy = dayStateCopy(centerState);
  const inspectDeg = inspectDay ? degForDay(inspectDay) : null;
  const inspectPos = inspectDeg !== null ? polar(R, inspectDeg) : null;
  const pointerDeg = inspectDeg ?? todayDeg;
  const pointerPhase =
    (inspectDay ? model.reproductivePhaseFor(inspectDay) : activePhase) ?? activePhase;
  const pointerRailStart = polar(GUIDE + 34, pointerDeg);
  const pointerRailEnd = polar(R + 15, pointerDeg);
  const pointerLabelPos = polar(GUIDE + 60, pointerDeg);
  const pointerLabelAnchor =
    pointerDeg > 22 && pointerDeg < 158
      ? "start"
      : pointerDeg > 202 && pointerDeg < 338
        ? "end"
        : "middle";

  const loggedCount = (s: Seg) => {
    if (!model.lastPeriodStart) return 0;
    const from = dayToDate(model, s.from);
    const to = dayToDate(model, s.to);
    return entries.filter((e) => e.date >= from && e.date <= to).length;
  };

  // what the ring can honestly claim about the highlighted phase
  const card = (() => {
    if (!cardSeg) return null;
    const hasDates = model.lastPeriodStart !== null;
    const n = loggedCount(cardSeg);
    return {
      phase: cardSeg.phase,
      dates: hasDates
        ? `${fmtShort(dayToDate(model, cardSeg.from))} – ${fmtShort(dayToDate(model, cardSeg.to))}`
        : `days ${cardSeg.from}–${Math.max(cardSeg.to, cardSeg.from)}`,
      basis: hasDates
        ? n > 0
          ? `based on ${n} logged day${n === 1 ? "" : "s"} in this stretch`
          : model.confidence === "assumed"
            ? "general pattern — not enough personal data yet"
            : "outlined by your model; nothing logged here yet"
        : "not enough personal data yet — Bloom won't invent any",
      est: cardSeg.phase === "ovulation" || cardSeg.phase === "luteal",
    };
  })();

  const alt = model.currentDay
    ? `Cycle orbit — day ${model.currentDay} of about ${cycle}. ` +
      segments.map((s) => `${s.phase}: days ${s.from}–${Math.max(s.to, s.from)}`).join("; ") +
      `. Currently ${model.currentReproductivePhase ?? "no reproductive phase"}; bleeding ${model.currentBleedingState === "unlogged" ? "not logged" : model.currentBleedingState} — ${
        model.confidence === "assumed"
          ? "general pattern, not personalized yet"
          : "your own history"
      }.`
    : "Cycle orbit — waiting for your first logged period start.";

  return (
    <figure
      ref={figureRef}
      className={cn("relative m-0 w-full", className)}
      aria-label="Your cycle orbit"
    >
      {/* the stage light — the page's single soft source, phase-tinted */}
      <span
        className="cy-stage-light"
        aria-hidden
        style={{
          inset: "-16% -10%",
          background: activePhase
            ? `radial-gradient(46% 46% at 50% 46%, color-mix(in oklab, ${PHASE_COLOR[activePhase]} 17%, transparent), transparent 68%)`
            : "radial-gradient(46% 46% at 50% 46%, color-mix(in oklab, var(--violet) 10%, transparent), transparent 68%)",
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
          <radialGradient id={`face-${uid}`} cx="50%" cy="44%" r="64%">
            <stop offset="0%" stopColor="var(--foreground)" stopOpacity="0.05" />
            <stop offset="72%" stopColor="var(--foreground)" stopOpacity="0.014" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`lived-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--foreground)" stopOpacity="0.85" />
            <stop offset="100%" stopColor="var(--foreground)" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id={`pointer-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--foreground)" stopOpacity="0.96" />
            <stop
              offset="100%"
              stopColor={activePhase ? PHASE_COLOR[activePhase] : "var(--cycle-accent)"}
              stopOpacity="0.72"
            />
          </linearGradient>
          <filter id={`pointer-glow-${uid}`} x="-90%" y="-90%" width="280%" height="280%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* face + outer complete-cycle ring with week ticks */}
        <circle cx={C} cy={CY} r={R + 34} fill={`url(#face-${uid})`} pointerEvents="none" />
        <g className="cy-draw" style={{ animationDelay: "80ms" }}>
          <circle
            cx={C}
            cy={CY}
            r={GUIDE}
            fill="none"
            stroke="var(--cycle-hair)"
            strokeWidth={1}
            pointerEvents="none"
            pathLength={100}
            className="cy-draw"
            style={{ animationDelay: "120ms" }}
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
                pointerEvents="none"
              />
            );
          })}
        </g>

        {/* forecast shell — the whole cycle outlined as estimate by default */}
        <circle
          cx={C}
          cy={CY}
          r={R}
          fill="none"
          stroke="var(--border)"
          strokeOpacity={0.55}
          strokeWidth={13}
          pointerEvents="none"
        />

        {/* menstrual / bleeding layer — separate from the reproductive phase ring */}
        {bleedingArc ? (
          <g aria-label="Menstrual bleeding layer" pointerEvents="none">
            {bleedingArc.hasEstimate ? (
              <path
                d={arcPath(R - 20, degForDay(1) + 1.2, degForDay(bleedingArc.estimateTo + 1) - 1.2)}
                fill="none"
                stroke="var(--cycle-menstrual)"
                strokeOpacity={0.34}
                strokeWidth={7}
                strokeDasharray="5 6"
                strokeLinecap="round"
              />
            ) : null}
            {bleedingArc.observedDays.map((d) => (
              <path
                key={`bleed-${d}`}
                d={arcPath(R - 20, degForDay(d) + 0.9, degForDay(d + 1) - 0.9)}
                fill="none"
                stroke="var(--cycle-menstrual)"
                strokeOpacity={0.98}
                strokeWidth={8.5}
                strokeLinecap="round"
              />
            ))}
            <text
              x={polar(R - 48, degForDay(Math.max(1, Math.min(bleedingArc.estimateTo, 3)))).x}
              y={polar(R - 48, degForDay(Math.max(1, Math.min(bleedingArc.estimateTo, 3)))).y}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 9.5,
                fontWeight: 600,
                letterSpacing: "0.18em",
                fill: "var(--cycle-menstrual)",
                opacity: 0.78,
                textTransform: "uppercase",
              }}
            >
              menstrual
            </text>
          </g>
        ) : null}

        {/* heartbeat glow — one soft transparent white line on the active phase */}
        {activePhase && activeSegment ? (
          <g aria-hidden="true" className="cy-orbit-heartbeat" pointerEvents="none">
            <path
              className="cy-orbit-heartbeat__line"
              d={arcPath(
                R + 1,
                degForDay(activeSegment.from) + 1.2,
                degForDay(Math.max(activeSegment.to + 1, activeSegment.from + 1)) - 1.2,
              )}
              fill="none"
              stroke="var(--foreground)"
            />
          </g>
        ) : null}

        {/* phase arcs flowing into one another; solid where lived, dashed ahead */}
        {animated.map((s, i) => {
          const a0 = degForDay(s.from);
          const a1 = degForDay(Math.max(s.to + 1, s.from + 1));
          const span = a1 - a0;
          const gap = span > 10 ? 1.6 : 0.4;
          const isActive = activePhase === s.phase;
          const isShown = highlighted?.phase === s.phase;
          const pastEnd = Math.min(Math.max(s.to, s.from), day);
          const solid =
            day > 0 && pastEnd >= s.from ? arcPath(R, a0 + gap, degForDay(pastEnd + 1) - gap) : "";
          const dashed =
            day > 0 && s.to > day
              ? arcPath(R, degForDay(Math.max(day + 1, s.from)) + gap, a1 - gap)
              : "";
          const whole = solid || dashed ? "" : arcPath(R, a0 + gap, a1 - gap);
          const emphasize = isShown ? 1 : 0.72;
          return (
            <g
              key={`${uid}-${s.phase}`}
              role="button"
              tabIndex={0}
              aria-label={`${s.phase} phase, days ${s.from} to ${Math.max(s.to, s.from)}. ${
                model.lastPeriodStart
                  ? loggedCount(s) > 0
                    ? `${loggedCount(s)} day${loggedCount(s) === 1 ? "" : "s"} logged in this stretch of the current cycle`
                    : "nothing logged in this stretch yet"
                  : "not enough personal data yet"
              }. Select to keep its summary.`}
              aria-pressed={selectedPhase === s.phase}
              onClick={() => {
                pick(s);
                setHover(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  pick(s);
                }
              }}
              onMouseEnter={(e) => {
                setHover(s);
                moveCardToPointer(e);
              }}
              onMouseMove={(e) => {
                setHover(s);
                moveCardToPointer(e);
              }}
              onMouseLeave={() => setHover(null)}
              onBlur={() => setHover(null)}
              className="cursor-pointer outline-none"
            >
              {isShown ? (
                <path
                  d={arcPath(R, a0 + gap * 0.25, a1 - gap * 0.25)}
                  fill="none"
                  stroke={PHASE_COLOR[s.phase]}
                  strokeOpacity={0.18}
                  strokeWidth={22}
                  strokeLinecap="round"
                />
              ) : null}
              <path
                d={arcPath(R, a0 + gap, a1 - gap)}
                className="cy-draw"
                style={{ animationDelay: `${220 + i * 110}ms` }}
                pathLength={100}
                fill="none"
                stroke={PHASE_COLOR[s.phase]}
                strokeOpacity={(isShown ? 0.5 : 0.26) * emphasize}
                strokeWidth={isActive ? 13 : 11}
                strokeLinecap="round"
              />
              {solid ? (
                <path
                  d={solid}
                  fill="none"
                  stroke={PHASE_COLOR[s.phase]}
                  strokeOpacity={isShown ? 1 : 0.92}
                  strokeWidth={isActive ? 15 : 13}
                  strokeLinecap="round"
                  className="transition-all duration-[var(--cy-med)]"
                />
              ) : null}
              {dashed ? (
                <path
                  d={dashed}
                  fill="none"
                  stroke={PHASE_COLOR[s.phase]}
                  strokeOpacity={0.44}
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
                  strokeOpacity={0.52}
                  strokeWidth={11}
                  strokeDasharray="3 7"
                  strokeLinecap="round"
                />
              ) : null}
              {isActive && day > 0 && !inspect ? (
                <path
                  d={arcPath(R, a0 + gap, a1 - gap)}
                  className="cy-travel"
                  fill="none"
                  stroke="var(--foreground)"
                  strokeOpacity={0.26}
                  strokeWidth={4}
                  strokeLinecap="round"
                  pathLength={100}
                  strokeDasharray="12 102"
                />
              ) : null}
              <path d={arcPath(R, a0, a1)} fill="none" stroke="transparent" strokeWidth={30} />
            </g>
          );
        })}

        {/* rim whispers — subtle until the phase is touched */}
        {segments.map((s) => {
          const mid = (degForDay(s.from) + degForDay(Math.max(s.to, s.from) + 1)) / 2;
          const p = polar(LABEL_R, mid);
          const lit = highlighted?.phase === s.phase || activePhase === s.phase;
          const anchor =
            mid > 30 && mid < 150 ? "start" : mid > 210 && mid < 330 ? "end" : "middle";
          return (
            <text
              key={`lbl-${uid}-${s.phase}`}
              x={p.x + (anchor === "start" ? -6 : anchor === "end" ? 6 : 0)}
              y={p.y}
              textAnchor={anchor}
              dominantBaseline="middle"
              pointerEvents="none"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 10.5,
                fontWeight: 500,
                letterSpacing: "0.22em",
                fill: PHASE_COLOR[s.phase],
                opacity: lit ? 0.95 : 0.4,
                textTransform: "uppercase",
                transition: "opacity var(--cy-med) ease",
              }}
            >
              {s.phase}
            </text>
          );
        })}

        {/* the days lived — solid ivory trace; the way ahead stays a whisper */}
        {day > 1 ? (
          <path
            d={arcPath(TRACE, 0, todayDeg)}
            fill="none"
            stroke={`url(#lived-${uid})`}
            strokeWidth={2.2}
            strokeLinecap="round"
            pointerEvents="none"
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
            pointerEvents="none"
          />
        ) : null}

        {/* futuristic locator — a small orbital pointer that follows today or the inspected day */}
        {day > 0 ? (
          <g
            aria-hidden="true"
            className="cy-you-pointer"
            style={{
              ["--pointer-c" as never]: pointerPhase
                ? PHASE_COLOR[pointerPhase]
                : "var(--cycle-accent)",
            }}
            pointerEvents="none"
          >
            <motion.line
              initial={false}
              animate={{
                x1: pointerRailStart.x,
                y1: pointerRailStart.y,
                x2: pointerRailEnd.x,
                y2: pointerRailEnd.y,
              }}
              transition={MOVE}
              className="cy-you-pointer__beam"
              stroke={pointerPhase ? PHASE_COLOR[pointerPhase] : "var(--cycle-accent)"}
              strokeWidth={1.5}
              strokeLinecap="round"
            />
            <motion.circle
              initial={false}
              animate={{ cx: pointerRailEnd.x, cy: pointerRailEnd.y }}
              transition={MOVE}
              r={2.2}
              fill="var(--foreground)"
              opacity={0.78}
            />
            <g
              transform={`translate(${pointerRailStart.x} ${pointerRailStart.y}) rotate(${pointerDeg})`}
              className="cy-you-pointer__ship"
              filter={`url(#pointer-glow-${uid})`}
            >
              <path d="M 0 14 L -9 -10 L 0 -5 L 9 -10 Z" fill={`url(#pointer-${uid})`} />
              <path
                d="M 0 14 L -4 -2 M 0 14 L 4 -2"
                fill="none"
                stroke="var(--background)"
                strokeOpacity={0.62}
                strokeWidth={1}
                strokeLinecap="round"
              />
              <path
                d="M -13 -17 L 13 -17"
                stroke={pointerPhase ? PHASE_COLOR[pointerPhase] : "var(--cycle-accent)"}
                strokeOpacity={0.72}
                strokeWidth={1.3}
                strokeLinecap="round"
              />
              <circle cx="0" cy="-17" r="2.4" fill="var(--foreground)" opacity="0.9" />
            </g>
            <motion.text
              initial={false}
              animate={{ x: pointerLabelPos.x, y: pointerLabelPos.y }}
              transition={MOVE}
              textAnchor={pointerLabelAnchor}
              dominantBaseline="middle"
              className="cy-you-pointer__label"
            >
              {inspect ? "viewing" : "you are here"}
            </motion.text>
          </g>
        ) : null}

        {/* today — ivory core, thin outer ring, soft glow, indicator line, label */}
        {day > 0 ? (
          <g pointerEvents="none">
            <motion.line
              initial={false}
              animate={{
                x1: polar(R - 36, todayDeg).x,
                y1: polar(R - 36, todayDeg).y,
                x2: polar(R - 18, todayDeg).x,
                y2: polar(R - 18, todayDeg).y,
              }}
              transition={MOVE}
              stroke="var(--foreground)"
              strokeOpacity={0.4}
              strokeWidth={1.3}
              strokeLinecap="round"
            />
            <motion.circle
              initial={false}
              animate={{ cx: todayPos.x, cy: todayPos.y, r: 16 }}
              transition={MOVE}
              className="cy-breathe"
              fill={activePhase ? PHASE_COLOR[activePhase] : "var(--violet)"}
              opacity={0.16}
            />
            <motion.circle
              initial={false}
              animate={{ cx: todayPos.x, cy: todayPos.y }}
              transition={MOVE}
              r={10.5}
              fill="var(--background)"
            />
            <motion.circle
              initial={false}
              animate={{ cx: todayPos.x, cy: todayPos.y, scale: hover || selectedPhase ? 1.14 : 1 }}
              transition={{ ...MOVE, scale: TAP }}
              r={7.2}
              fill="none"
              stroke={activePhase ? PHASE_COLOR[activePhase] : "var(--foreground)"}
              strokeWidth={1.8}
            />
            <motion.circle
              initial={false}
              animate={{ cx: todayPos.x, cy: todayPos.y }}
              transition={MOVE}
              r={3.2}
              fill="var(--foreground)"
            />
            <motion.text
              initial={false}
              animate={{ x: todayLabelPos.x, y: todayLabelPos.y }}
              transition={MOVE}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: "0.24em",
                fill: "var(--foreground)",
                opacity: 0.75,
                textTransform: "uppercase",
              }}
            >
              today
            </motion.text>
          </g>
        ) : null}

        {/* predicted ovulation position — a quiet gold node, only when the model is personal */}
        {model.ovulationDay !== null && model.confidence !== "assumed" ? (
          <g pointerEvents="none" className="cy-focus-in">
            <circle
              cx={polar(R - 26, degForDay(model.ovulationDay)).x}
              cy={polar(R - 26, degForDay(model.ovulationDay)).y}
              r={3.4}
              fill="none"
              stroke="var(--cycle-ovulation)"
              strokeWidth={1.4}
              opacity={0.8}
            />
            <circle
              cx={polar(R - 26, degForDay(model.ovulationDay)).x}
              cy={polar(R - 26, degForDay(model.ovulationDay)).y}
              r={0.9}
              fill="var(--cycle-ovulation)"
              opacity={0.9}
            />
          </g>
        ) : null}

        <motion.g
          initial={false}
          animate={{ opacity: inspectPos ? 1 : 0 }}
          transition={FADE}
          pointerEvents="none"
        >
          {inspectPos ? (
            <motion.circle
              initial={false}
              animate={{ cx: inspectPos.x, cy: inspectPos.y }}
              transition={MOVE}
              r={9}
              fill="none"
              stroke="var(--foreground)"
              strokeOpacity={0.5}
              strokeWidth={1.4}
              strokeDasharray="2.5 3.5"
            />
          ) : null}
        </motion.g>

        {/* the center — heart of the page */}
        {model.lastPeriodStart && model.currentDay ? (
          <>
            <text
              x={C}
              y={CY - 22}
              textAnchor="middle"
              className="fill-foreground"
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 500,
                fontSize: 46,
                letterSpacing: "-0.02em",
              }}
            >
              Day{" "}
              <tspan
                style={{
                  fontSize: 58,
                  letterSpacing: "-0.03em",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {inspect ? inspect.day : model.currentDay}
              </tspan>
            </text>
            <text
              x={C}
              y={CY + 8}
              textAnchor="middle"
              style={{ fontSize: 12.5, fill: "var(--muted-foreground)" }}
            >
              {centerCopy.title.includes("Period")
                ? "Your period"
                : centerCopy.secondary.split(" · ")[0]}
            </text>
            <text
              x={C}
              y={CY + 36}
              textAnchor="middle"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 16.5,
                fill: PHASE_COLOR[
                  (inspect
                    ? model.reproductivePhaseFor(inspect.day)
                    : model.currentReproductivePhase) ?? "luteal"
                ],
              }}
            >
              {centerCopy.support}
            </text>
            <line
              x1={C - 14}
              y1={CY + 54}
              x2={C + 14}
              y2={CY + 54}
              stroke="var(--cycle-hair-strong)"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
            <text
              x={C}
              y={CY + 74}
              textAnchor="middle"
              style={{ fontSize: 10.5, fill: "var(--faint)" }}
            >
              {centerCopy.secondary}
            </text>
          </>
        ) : (
          <>
            <text
              x={C}
              y={CY - 16}
              textAnchor="middle"
              className="fill-foreground"
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 500,
                fontSize: 27,
                letterSpacing: "-0.015em",
              }}
            >
              Your cycle
            </text>
            <text
              x={C}
              y={CY + 14}
              textAnchor="middle"
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: 22,
                fill: "var(--muted-foreground)",
              }}
            >
              starts here
            </text>
            <text
              x={C}
              y={CY + 42}
              textAnchor="middle"
              style={{ fontSize: 11, fill: "var(--faint)" }}
            >
              Log your first period day to begin
            </text>
            <text
              x={C}
              y={CY + 58}
              textAnchor="middle"
              style={{ fontSize: 11, fill: "var(--faint)" }}
            >
              building your personal pattern.
            </text>
          </>
        )}
      </svg>

      {/* the contextual phase card — dark, warm, compact */}
      {card ? (
        <div
          className="cy-phasecard"
          style={{ left: cardPos.left, top: cardPos.top }}
          role="status"
        >
          <p className="cy-eyebrow" style={{ opacity: 0.9, color: PHASE_COLOR[card.phase] }}>
            {card.phase}
          </p>
          <p className="cy-title mt-1 text-[15.5px] leading-snug">{card.dates}</p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
            {card.basis}
            {card.est && model.lastPeriodStart ? " · estimates stay estimates" : ""}
          </p>
        </div>
      ) : null}
    </figure>
  );
}

/**
 * Arc geometry interpolates from its previous shape to the new one over a
 * soft beat — logging a period start flows the ring into its new state
 * instead of snapping. Reduced motion jumps straight to the answer.
 */
function useAnimatedSegments(target: Seg[]): Seg[] {
  const reduced = useReducedMotion();
  const [cur, setCur] = useState<Seg[]>(target);
  const curRef = useRef<Seg[]>(target);
  const rafRef = useRef(0);

  useEffect(() => {
    if (reduced) {
      curRef.current = target;
      setCur(target);
      return;
    }
    const from = curRef.current.length === target.length ? curRef.current : target;
    const start = performance.now();
    const dur = 460;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - t, 3);
      const next = target.map((s, i) => {
        const f = from[i] ?? s;
        return {
          phase: s.phase,
          from: f.from + (s.from - f.from) * e,
          to: f.to + (s.to - f.to) * e,
        };
      });
      curRef.current = next;
      setCur(next);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, reduced]);

  return cur;
}
