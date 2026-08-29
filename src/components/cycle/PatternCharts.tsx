/**
 * PatternCharts — personal data art, not business analytics. Two
 * progressive visualizations, built only from what the user logged:
 *
 *   energy (and optionally mood) averaged across the four phases — bars in
 *   the phase colors, every bar carrying its sample count; and the cycle
 *   length line across completed cycles with the personal-average
 *   reference drawn from the same model the ring uses.
 *
 * Axes stay quiet, gridlines barely exist, tooltips are Bloom-styled, and
 * each chart has a text summary for assistive tech. When the data can't
 * support a chart, the card says exactly that — with the same ghost
 * language the rest of the page uses — rather than showing empty geometry.
 */

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { FADE } from "@/lib/cycle/motion";
import { isTallyMeaningful, phaseTally } from "@/lib/cycle/patterns";
import type { CycleEntry, CycleModel, PhaseKey } from "@/lib/cycle/types";
import { PHASE_COLOR } from "@/lib/cycle/palette";
import { fmtShort } from "@/lib/cycle/engine";

const PHASE_SHORT: Record<PhaseKey, string> = {
  menstrual: "period",
  follicular: "follicular",
  ovulation: "ovulation",
  luteal: "luteal",
};

function TipBox({ label, lines }: { label: string; lines: string[] }) {
  return (
    <div className="rounded-lg border border-[var(--cycle-hair-strong)] bg-[color-mix(in_oklab,var(--surface)_94%,black_6%)] px-2.5 py-2 text-[11.5px] shadow-[var(--cy-elev)]">
      <p className="font-medium text-foreground">{label}</p>
      {lines.map((l) => (
        <p key={l} className="text-muted-foreground">
          {l}
        </p>
      ))}
    </div>
  );
}

export function PatternCharts({ model, entries }: { model: CycleModel; entries: CycleEntry[] }) {
  const [showMood, setShowMood] = useState(false);
  const [showLengths, setShowLengths] = useState(false);

  const energy = useMemo(() => phaseTally(entries, model, "energy"), [entries, model]);
  const mood = useMemo(() => phaseTally(entries, model, "mood"), [entries, model]);
  const active = showMood ? mood : energy;
  const meaningful = isTallyMeaningful(active);

  const barData = useMemo(
    () =>
      active.byPhase
        .filter((b) => b.n > 0)
        .map((b) => ({
          name: PHASE_SHORT[b.phase],
          phase: b.phase,
          avg: b.avg === null ? 0 : Math.round(b.avg * 10) / 10,
          n: b.n,
        })),
    [active],
  );

  const lengthData = useMemo(
    () =>
      model.completed.map((c, i) => ({
        name: `#${i + 1}`,
        len: c.lengthDays,
        start: c.start,
      })),
    [model.completed],
  );

  const summary = meaningful
    ? `Across ${active.n} logged days: ${barData
        .map((b) => `${b.name} averaged ${b.avg} of 5 (${b.n} day${b.n === 1 ? "" : "s"})`)
        .join("; ")}. Differences are observations from your logs, not causes.`
    : `Only ${active.n} logged days carry ${showMood ? "mood" : "energy"} marks — not enough for a phase comparison yet.`;

  return (
    <div className="mt-9 grid gap-5 lg:grid-cols-2">
      <section
        className="cy-chart-card"
        aria-label={`${showMood ? "Mood" : "Energy"} by phase chart`}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="cy-title text-[16.5px]">
            {showMood ? "Mood across phases" : "Energy across phases"}
          </h3>
          <button type="button" onClick={() => setShowMood((m) => !m)} className="cy-link">
            {showMood ? "show energy instead" : "compare mood too"}
          </button>
        </div>
        {meaningful ? (
          <>
            <div className="mt-3 h-[150px]" role="img" aria-label={summary}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={barData} margin={{ top: 6, right: 6, bottom: 0, left: -18 }}>
                  <CartesianGrid vertical={false} stroke="var(--cycle-hair)" strokeOpacity={0.6} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "var(--faint)", fontSize: 10.5 }}
                    axisLine={{ stroke: "var(--cycle-hair)" }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 5]}
                    ticks={[0, 1, 2, 3, 4, 5]}
                    tick={{ fill: "var(--faint)", fontSize: 9.5 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--cycle-hair)", opacity: 0.4 }}
                    content={({ active: on, payload }) => {
                      const p = payload?.[0]?.payload as
                        { name: string; avg: number; n: number } | undefined;
                      if (!on || !p) return null;
                      return (
                        <TipBox
                          label={`${p.name} — ${p.avg}/5`}
                          lines={[`${p.n} logged day${p.n === 1 ? "" : "s"}`]}
                        />
                      );
                    }}
                  />
                  <Bar dataKey="avg" radius={[5, 5, 2, 2]} maxBarSize={44} isAnimationActive>
                    {barData.map((b) => (
                      <Cell
                        key={b.phase}
                        fill={PHASE_COLOR[b.phase as PhaseKey]}
                        fillOpacity={0.82}
                      />
                    ))}
                  </Bar>
                  <ReferenceLine y={3} stroke="var(--cycle-hair-strong)" strokeDasharray="3 4" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-[11.5px] leading-relaxed text-faint">
              averages of your {active.n} logged {showMood ? "mood" : "energy"} marks — the dashed
              line is neutral, not a target. Observation, not cause.
            </p>
          </>
        ) : (
          <div className="cy-ghost-lines mt-4 h-[110px] justify-end pb-1" aria-hidden>
            {[38, 62, 46, 70].map((h, i) => (
              <i key={i} style={{ height: h / 2.4, width: 44 }} />
            ))}
          </div>
        )}
        <p
          className={
            meaningful ? "sr-only" : "mt-3 text-[12.5px] leading-relaxed text-muted-foreground"
          }
        >
          {meaningful
            ? null
            : `${summary} Log mood or energy for a handful of days in a couple of phases and the comparison appears here.`}
        </p>
        {meaningful ? <p className="sr-only">{summary}</p> : null}
      </section>

      <section className="cy-chart-card" aria-label="Cycle length history chart">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="cy-title text-[16.5px]">Cycle lengths, one point per cycle</h3>
          {lengthData.length >= 2 ? (
            <button type="button" onClick={() => setShowLengths((v) => !v)} className="cy-link">
              {showLengths ? "hide" : "explore"}
            </button>
          ) : null}
        </div>
        {lengthData.length < 2 ? (
          <p className="mt-3 max-w-[44ch] text-[12.5px] leading-relaxed text-muted-foreground">
            {lengthData.length === 0
              ? "No completed cycles yet — the line appears with your second period start."
              : "One cycle is a single point; give Bloom one more period start and your variation becomes visible."}
          </p>
        ) : (
          <>
            <AnimatePresence initial={false}>
              {showLengths || lengthData.length >= 4 ? (
                <motion.div
                  key="len"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={FADE}
                  style={{ overflow: "hidden" }}
                >
                  <div
                    className="mt-3 h-[150px]"
                    role="img"
                    aria-label={`${lengthData.length} completed cycles, from ${lengthData[0]?.len} to ${lengthData[lengthData.length - 1]?.len} days, average ${model.average?.toFixed(1)} days`}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={lengthData}
                        margin={{ top: 10, right: 10, bottom: 0, left: -22 }}
                      >
                        <CartesianGrid
                          vertical={false}
                          stroke="var(--cycle-hair)"
                          strokeOpacity={0.6}
                        />
                        <XAxis
                          dataKey="name"
                          tick={{ fill: "var(--faint)", fontSize: 10 }}
                          axisLine={{ stroke: "var(--cycle-hair)" }}
                          tickLine={false}
                        />
                        <YAxis
                          domain={[
                            Math.max(14, Math.min(...lengthData.map((d) => d.len)) - 3),
                            Math.max(...lengthData.map((d) => d.len)) + 3,
                          ]}
                          tick={{ fill: "var(--faint)", fontSize: 9.5 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          cursor={{ stroke: "var(--cycle-hair-strong)" }}
                          content={({ active: on, payload }) => {
                            const p = payload?.[0]?.payload as
                              { len: number; start: string } | undefined;
                            if (!on || !p) return null;
                            return (
                              <TipBox
                                label={`${p.len} days`}
                                lines={[
                                  `started ${fmtShort(p.start)}`,
                                  model.average !== null
                                    ? `${(p.len - model.average).toFixed(1)} vs your average`
                                    : "",
                                ]}
                              />
                            );
                          }}
                        />
                        {model.average !== null ? (
                          <ReferenceLine
                            y={model.average}
                            stroke="var(--cycle-accent)"
                            strokeOpacity={0.6}
                            strokeDasharray="4 4"
                            label={{
                              value: "your average",
                              position: "insideTopRight",
                              fill: "var(--faint)",
                              fontSize: 10,
                            }}
                          />
                        ) : null}
                        <Line
                          type="monotone"
                          dataKey="len"
                          stroke="var(--cycle-accent)"
                          strokeWidth={2}
                          dot={{ r: 3, fill: "var(--background)", stroke: "var(--cycle-accent)" }}
                          activeDot={{ r: 5 }}
                          isAnimationActive
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="mt-2 text-[11.5px] leading-relaxed text-faint">
                    every point is a cycle you actually completed — the dashed line is your own
                    average, shown for reading variation, not judging it.
                  </p>
                </motion.div>
              ) : (
                <p className="mt-3 text-[12.5px] text-muted-foreground">
                  {lengthData.length} completed cycle{lengthData.length === 1 ? "" : "s"} so far —
                  explore opens the full line whenever you like.
                </p>
              )}
            </AnimatePresence>
          </>
        )}
      </section>
    </div>
  );
}
