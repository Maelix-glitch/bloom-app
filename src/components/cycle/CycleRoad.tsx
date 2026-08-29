/**
 * CycleRoad — the forecast as one continuous journey, not boxes. The path
 * begins solid at today (grounded in your logs), loosens into dashes across
 * the modelled stretch, and fades toward the horizon as uncertainty grows.
 * Milestones sit ON the road — the next phase change, ovulation estimate,
 * fertile window, next period — with their dates visually attached; only
 * events the data actually supports are drawn. Below it, one "Next" line
 * carries the nearest event big and serif. With no anchor yet the road
 * renders as an honest ghost: the shape of what will come, no invented
 * dates, and the one action that starts it all.
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import type { CycleModel } from "@/lib/cycle/types";
import { fmtShort } from "@/lib/cycle/engine";

type Stop = {
  key: string;
  name: string;
  date: string;
  tone: string;
  est: boolean;
  above: boolean;
  frac: number;
};

const PATH = "M 8 58 C 170 58 210 24 380 26 C 550 28 600 62 760 56 C 860 52 930 30 992 34";

export function CycleRoad({
  model,
  onOpenMethod,
  onLogStart,
  className,
}: {
  model: CycleModel;
  onOpenMethod: () => void;
  onLogStart: () => void;
  className?: string;
}) {
  const pathRef = useRef<SVGPathElement | null>(null);
  const [pts, setPts] = useState<number[] | null>(null);

  const stops: Stop[] = useMemo(() => {
    if (!model.lastPeriodStart) return [];
    const out: Stop[] = [];
    const next = model.events.find((e) => e.id === "next-period");
    const ovu = model.events.find((e) => e.id === "ovulation");
    const fertile = model.events.find((e) => e.id === "fertile-window");
    const phaseChange = model.events.find((e) => e.id === "phase-change");
    if (phaseChange && (phaseChange.date ?? phaseChange.rangeStart) && phaseChange.daysAway >= 0)
      out.push({
        key: "phase",
        name: "Next phase shift",
        date: phaseChange.date ?? phaseChange.rangeStart!,
        tone: "var(--cycle-follicular)",
        est: phaseChange.predicted,
        above: true,
        frac: 0,
      });
    if (ovu?.date && ovu.daysAway >= 0)
      out.push({
        key: "ovu",
        name: "Ovulation window",
        date: ovu.date,
        tone: "var(--cycle-ovulation)",
        est: ovu.predicted,
        above: false,
        frac: 0,
      });
    if (
      fertile?.rangeStart &&
      fertile.rangeEnd &&
      (fertile.date ?? fertile.rangeStart) &&
      model.events.some((e) => e.id === "fertile-window" && e.daysAway >= 0)
    )
      out.push({
        key: "fertile",
        name: `Fertile window`,
        date: fertile.rangeStart,
        tone: "var(--cycle-follicular)",
        est: true,
        above: true,
        frac: 0,
      });
    if (next && (next.date ?? next.rangeEnd))
      out.push({
        key: "period",
        name: "Next period",
        date: next.date ?? next.rangeEnd!,
        tone: "var(--cycle-menstrual)",
        est: true,
        above: false,
        frac: 0,
      });
    // sort by date, drop duplicates in time, and compute road fraction 0..1
    const uniq: Stop[] = [];
    for (const s of [...out].sort((a, b) => a.date.localeCompare(b.date))) {
      if (
        uniq.some(
          (u) =>
            Math.abs(new Date(u.date).getTime() - new Date(s.date).getTime()) < 86_400_000 * 1.5,
        )
      )
        continue;
      uniq.push(s);
    }
    if (uniq.length === 0) return [];
    const d0 = new Date(model.today).getTime();
    const dEnd = Math.max(...uniq.map((s) => new Date(s.date).getTime()), d0 + 7 * 86_400_000);
    const span = Math.max(1, dEnd - d0);
    return uniq.map((s) => ({ ...s, frac: Math.min(1, (new Date(s.date).getTime() - d0) / span) }));
  }, [model]);

  const nextStop = stops.find((s) => s.key !== "fertile") ?? null;
  const horizon = useMemo(() => {
    // where the modelled (dashed) stretch starts: end of the logged day
    return 0.045;
  }, []);

  useLayoutEffect(() => {
    const p = pathRef.current;
    if (!p) return;
    const len = p.getTotalLength();
    setPts(stops.map((s) => p.getPointAtLength(Math.max(0, Math.min(1, s.frac)) * len).x));
  }, [stops]);

  // re-measure on resize (the svg scales; percentages would, but dot-y
  // picking needs the same scale math — cheap to just recompute)
  useEffect(() => {
    const onR = () => {
      const p = pathRef.current;
      if (!p || pts === null) return;
      const len = p.getTotalLength();
      setPts(stops.map((s) => p.getPointAtLength(Math.max(0, Math.min(1, s.frac)) * len).x));
    };
    window.addEventListener("resize", onR, { passive: true });
    return () => window.removeEventListener("resize", onR);
  }, [pts, stops]);

  if (!model.lastPeriodStart) {
    return (
      <div className={cn("cy-road", className)}>
        <svg viewBox="0 0 1000 84" aria-hidden className="w-full" style={{ height: "auto" }}>
          <path
            d={PATH}
            fill="none"
            stroke="var(--cycle-hair-strong)"
            strokeWidth={1.6}
            strokeDasharray="2 8"
            strokeLinecap="round"
            opacity={0.55}
          />
          {[0.12, 0.42, 0.72, 0.97].map((f, i) => (
            <circle
              key={i}
              cx={1000 * f}
              cy={i % 2 ? 40 : 50}
              r={3.2}
              fill="var(--border-strong)"
              opacity={0.7}
            />
          ))}
        </svg>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
          <p className="cy-title text-[17px]">The road appears with your first anchor.</p>
          <p className="text-[12.5px] text-faint">
            ovulation · fertile window · your next period — no dates until you log one
          </p>
          <button type="button" onClick={onLogStart} className="cy-btn cy-btn--primary ml-auto">
            Log your period
          </button>
        </div>
      </div>
    );
  }

  const cycle = Math.round(model.average ?? 28);

  return (
    <div
      className={cn("cy-road", className)}
      role="img"
      aria-label={`Road ahead: ${stops.map((t) => `${t.name}, ${fmtShort(t.date)}`).join("; ") || "no upcoming events supported by your data yet"}`}
    >
      <div>
        <svg viewBox="0 0 1000 152" aria-hidden className="w-full" style={{ height: "auto" }}>
          <defs>
            <linearGradient id="cy-road-fade" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--cycle-accent)" stopOpacity="0.9" />
              <stop offset="62%" stopColor="var(--cycle-accent)" stopOpacity="0.5" />
              <stop offset="100%" stopColor="var(--cycle-accent)" stopOpacity="0.12" />
            </linearGradient>
          </defs>
          {/* soft band under the path = the modelled stretch */}
          <path
            d={PATH}
            fill="none"
            stroke="url(#cy-road-fade)"
            strokeOpacity={0.14}
            strokeWidth={16}
            strokeLinecap="round"
          />
          {/* today is grounded: solid stub, then dashed into estimate, then fading */}
          <g className="cy-draw" style={{ animationDuration: "1400ms" }}>
            <path
              ref={pathRef}
              d={PATH}
              transform="translate(0 40)"
              pathLength={100}
              fill="none"
              stroke="var(--foreground)"
              strokeOpacity={0.85}
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeDasharray={`${horizon * 100} 100`}
            />
            <path
              d={PATH}
              transform="translate(0 40)"
              pathLength={100}
              fill="none"
              stroke="url(#cy-road-fade)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeDasharray={`0 ${horizon * 100} 5 6 100`}
            />
          </g>
          {/* origin */}
          <g>
            <circle cx={8} cy={98} r={5.2} fill="var(--background)" />
            <circle cx={8} cy={98} r={2.6} fill="var(--foreground)" />
            <text
              x={8}
              y={44}
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 12.5,
                fontWeight: 500,
                fill: "var(--foreground)",
              }}
            >
              Today · day {model.currentDay}
            </text>
            <text x={8} y={62} style={{ fontSize: 11.5, fill: "var(--faint)" }}>
              {model.currentPhase ? `${model.currentPhase} phase · ${cycle}-day model` : ""}
            </text>
          </g>
          {/* milestone dots on the path */}
          {pts
            ? stops.map((s, i) => {
                const x = pts[i] ?? 0;
                const cy = s.above ? 73 : 98;
                return (
                  <g
                    key={s.key}
                    className="cy-focus-in"
                    role="button"
                    tabIndex={0}
                    onClick={onOpenMethod}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onOpenMethod();
                      }
                    }}
                    aria-label={`${s.name}, ${fmtShort(s.date)} — ${s.est ? "estimated" : "observed"}. Activate to see how estimates work.`}
                    style={{ cursor: "pointer" }}
                  >
                    <circle cx={x} cy={cy} r={15} fill="transparent" />
                    <circle cx={x} cy={cy} r={7} fill="var(--background)" />
                    <circle
                      cx={x}
                      cy={cy}
                      r={s.est ? 4.6 : 5.4}
                      fill="none"
                      stroke={s.tone}
                      strokeWidth={s.est ? 1.6 : 2.4}
                      strokeDasharray={s.est ? "2.4 2.2" : undefined}
                    />
                    {s.est ? null : <circle cx={x} cy={cy} r={2} fill={s.tone} />}
                    <text
                      x={Math.min(Math.max(x, 60), 940)}
                      y={s.above ? 30 : 121}
                      textAnchor={x > 860 ? "end" : x < 140 ? "start" : "middle"}
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 12.5,
                        fontWeight: 500,
                        fill: s.tone,
                      }}
                    >
                      {s.name}
                    </text>
                    <text
                      x={Math.min(Math.max(x, 60), 940)}
                      y={s.above ? 48 : 137}
                      textAnchor={x > 860 ? "end" : x < 140 ? "start" : "middle"}
                      style={{ fontSize: 11.5, fill: "var(--faint)" }}
                    >
                      {fmtShort(s.date)}
                      {s.key === "period" && nextStop?.key === "period"
                        ? (() => {
                            const n = model.events.find((e) => e.id === "next-period");
                            return n?.plusMinusDays ? ` ±${n.plusMinusDays}d` : "";
                          })()
                        : ""}
                    </text>
                  </g>
                );
              })
            : null}
        </svg>
      </div>

      {nextStop ? (
        <div className="cy-next">
          <span className="cy-eyebrow shrink-0" style={{ color: nextStop.tone }}>
            Next
          </span>
          <p className="cy-next__big">
            {nextStop.name} · {fmtShort(nextStop.date)}
            {nextStop.key === "period"
              ? (() => {
                  const n = model.events.find((e) => e.id === "next-period");
                  return n?.plusMinusDays ? (
                    <span className="ml-2 text-[13px] text-faint">±{n.plusMinusDays} days</span>
                  ) : null;
                })()
              : null}
          </p>
          <p className="ml-auto max-w-[36ch] text-right text-[12px] leading-snug text-faint">
            {model.confidence === "assumed"
              ? "Estimated on the general pattern — log more cycles and it becomes yours."
              : `Estimated from your ${Math.min(6, model.completed.length)}-cycle history · estimates for planning, not verdicts.`}
          </p>
        </div>
      ) : null}
    </div>
  );
}
