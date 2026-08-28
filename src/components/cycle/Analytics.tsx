/**
 * Cycle Intelligence — analytics that explain themselves. Bars stay on a
 * zero-truncated-free axis, statistics require real samples, "prediction
 * accuracy" is deliberately absent (it would be fabrication) and is replaced
 * by a data-sufficiency line. Every derived value carries an "estimated"
 * tone; observations stay strong. BBT and LH sections only exist when the
 * user logged them — no giant empty panels.
 */

import { useMemo, useState } from "react";
import { Info, LineChart, TestTube } from "lucide-react";

import { cn } from "@/lib/utils";
import { fmtShort } from "@/lib/cycle/engine";
import type { CycleEntry, CycleModel, MoodValue } from "@/lib/cycle/types";
import { PHASE_COLOR } from "@/lib/cycle/palette";
import { GhostButton } from "./parts";

type Window = 3 | 6 | 12 | null; // null = all

const MOOD_ORDER: Record<MoodValue, number> = { Low: 1, Flat: 2, Okay: 3, Good: 4, Energized: 5 };

function MethodologyDialog({
  open,
  onClose,
  model,
}: {
  open: boolean;
  onClose: () => void;
  model: CycleModel;
}) {
  if (!open) return null;
  const rows: [string, string][] = [
    [
      "How your average works",
      model.confidence === "assumed"
        ? "You have no completed cycles logged yet, so this page uses a general 28-day pattern — clearly labeled, and nothing pretends to be personal."
        : `Averaged over your last ${Math.min(6, model.completed.length)} completed cycles (start-to-start days).`,
    ],
    [
      "What counts as completed",
      "A new logged period start after a previous one. Gaps shorter than 12 days or longer than 90 are treated as data issues, not cycles — your raw logs stay untouched either way.",
    ],
    [
      "Ovulation estimates",
      "Calendar estimate only: average length minus a standard 14-day luteal phase. It is an estimate for awareness, never proof of ovulation, and never contraception.",
    ],
    [
      "Ranges",
      model.stdDev !== null
        ? `Shown when your history varies: ±${Math.min(5, Math.max(2, Math.ceil(model.stdDev * 1.25)))} days comes from your own spread (σ ≈ ${model.stdDev.toFixed(1)}).`
        : "No ranges yet — they appear once a few cycles exist and variability is meaningful.",
    ],
    [
      "Why no accuracy number",
      "Honest accuracy needs recorded ground truth (confirmed ovulation or actual outcomes) to compare against. Until then, any percentage would be made up — so this page shows data sufficiency instead.",
    ],
    [
      "What sharpens everything",
      "Two more logged cycles narrow the ranges noticeably. A quick log each period day is enough to keep the calendar honest.",
    ],
  ];
  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-end bg-black/60 p-0 sm:place-items-center sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="How estimates are calculated"
    >
      <div
        className="max-h-[85dvh] w-full overflow-y-auto rounded-t-2xl border border-border bg-background p-5 sm:max-w-[520px] sm:rounded-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="display text-[18px]">How these estimates work</h3>
          <button
            type="button"
            onClick={onClose}
            className="mono rounded-full border border-border px-3 py-1 text-[10px] uppercase tracking-[0.08em] text-muted-foreground hover:text-foreground"
          >
            Close
          </button>
        </div>
        <dl className="flex flex-col divide-y divide-border/60">
          {rows.map(([k, v]) => (
            <div key={k} className="py-3">
              <dt className="text-[12px] font-medium text-foreground">{k}</dt>
              <dd className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mono mt-3 text-[9.5px] uppercase tracking-[0.08em] text-faint">
          sample: {model.completed.length} completed cycle{model.completed.length === 1 ? "" : "s"}{" "}
          · logging {fmtShort(model.lastPeriodStart ?? model.today)} → today
        </p>
      </div>
    </div>
  );
}

function Bars({
  values,
  average,
  median,
  labels,
}: {
  values: number[];
  average: number | null;
  median: number | null;
  labels: string[];
}) {
  const max = Math.max(...values, average ?? 0, 30) * 1.12;
  return (
    <div>
      <div
        className="relative flex h-32 items-end gap-2 sm:gap-3"
        role="list"
        aria-label="Cycle lengths, newest on the right"
      >
        {values.map((v, i) => (
          <div
            key={i}
            role="listitem"
            tabIndex={0}
            aria-label={`Cycle ${i + 1}: ${v} days, started ${labels[i]}`}
            className="group flex h-full min-w-0 flex-1 flex-col justify-end gap-1.5 rounded-md outline-none focus-visible:bg-surface-2/60"
          >
            <div
              className="rounded-t-md bg-surface-3 transition-colors duration-300 group-hover:bg-[color-mix(in_oklab,var(--violet)_45%,var(--surface-3))] group-focus-visible:bg-[color-mix(in_oklab,var(--violet)_45%,var(--surface-3))]"
              style={{ height: `${(v / max) * 100}%` }}
            />
            <span className="mono text-center text-[10px] text-faint">{v}</span>
          </div>
        ))}
        {average !== null ? (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-[color:var(--cycle-follicular)] opacity-70"
            style={{ bottom: `calc(1.25rem + ${(average / max) * 100 * 0.72}%)` }}
          />
        ) : null}
      </div>
      <p className="mono mt-1.5 flex flex-wrap items-center justify-center gap-x-3 text-[9px] uppercase tracking-[0.08em] text-faint">
        <span>
          {labels[0]} … {labels[labels.length - 1]}
        </span>
        {average !== null ? (
          <span className="inline-flex items-center gap-1">
            <span
              className="inline-block h-px w-3 border-t border-dashed border-[color:var(--cycle-follicular)]"
              aria-hidden
            />{" "}
            average {average.toFixed(1)}d
          </span>
        ) : null}
        {median !== null ? <span>· median {median.toFixed(1)}d</span> : null}
      </p>
    </div>
  );
}

export function Analytics({ model, entries }: { model: CycleModel; entries: CycleEntry[] }) {
  const [win, setWin] = useState<Window>(6);
  const [method, setMethod] = useState(false);

  const shown = useMemo(() => {
    const all = model.completed;
    return win === null ? all : all.slice(-win);
  }, [model.completed, win]);

  const windowed = useMemo(() => {
    const lens = shown.map((c) => c.lengthDays);
    if (lens.length === 0) return null;
    const mu = lens.reduce((a, b) => a + b, 0) / lens.length;
    const sd =
      lens.length >= 2
        ? Math.sqrt(lens.reduce((a, b) => a + (b - mu) ** 2, 0) / (lens.length - 1))
        : null;
    const sorted = [...lens].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const med =
      sorted.length % 2 ? sorted[mid]! : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
    return {
      avg: mu,
      sd,
      med,
      min: Math.min(...lens),
      max: Math.max(...lens),
      n: lens.length,
      labels: shown.map((c) => fmtShort(c.start)),
      values: lens,
    };
  }, [shown]);

  const temps = useMemo(() => entries.filter((e) => e.temperature !== null), [entries]);
  const lhLogs = useMemo(() => entries.filter((e) => e.lh_test), [entries]);

  const moodSeries = useMemo(
    () =>
      entries
        .filter((e) => e.mood)
        .slice(-14)
        .map((e) => ({ date: e.date, score: MOOD_ORDER[e.mood as MoodValue] ?? 3 })),
    [entries],
  );
  const energySeries = useMemo(
    () =>
      entries
        .filter((e) => e.energy !== null)
        .slice(-14)
        .map((e) => ({ date: e.date, score: e.energy as number })),
    [entries],
  );

  const symptomCounts = useMemo(() => {
    const m = new Map<string, { n: number; days: Set<number> }>();
    for (const e of entries) {
      for (const s of e.symptoms) {
        const cur = m.get(s) ?? { n: 0, days: new Set<number>() };
        cur.n += 1;
        cur.days.add(e.cycle_day);
        m.set(s, cur);
      }
    }
    return [...m.entries()]
      .map(([s, v]) => ({ symptom: s, n: v.n, spread: v.days.size }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 5);
  }, [entries]);

  const sufficiency =
    model.confidence === "strong"
      ? `${model.completed.length} cycles logged — personal enough for real ranges`
      : model.confidence === "fair"
        ? `${model.completed.length} cycles so far — patterns are forming`
        : model.confidence === "early"
          ? "1 cycle — everything here is a starting point"
          : "no cycles completed yet — estimates use the general pattern";

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="mono text-[9.5px] uppercase tracking-[0.08em] text-faint">
          data sufficiency · {sufficiency}
        </p>
        <div className="flex items-center gap-1.5" role="group" aria-label="History window">
          {([3, 6, 12, null] as Window[]).map((w) => (
            <button
              key={String(w)}
              type="button"
              aria-pressed={win === w}
              onClick={() => setWin(w)}
              disabled={w !== null && model.completed.length < 1}
              className={cn(
                "mono rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.06em] transition-colors",
                win === w
                  ? "border-[color:var(--border-strong)] bg-surface-2 text-foreground"
                  : "border-border text-faint hover:text-muted-foreground",
              )}
            >
              {w === null ? "all" : `last ${w}`}
            </button>
          ))}
          <GhostButton onClick={() => setMethod(true)} label="How these numbers are made">
            <Info className="size-3" aria-hidden /> Method
          </GhostButton>
        </div>
      </div>

      {windowed ? (
        <>
          <div className="grid gap-6 sm:grid-cols-[1.4fr_1fr]">
            <div className="rounded-2xl border border-border/70 bg-surface/35 p-4 sm:p-5">
              <p className="eyebrow mb-3">Cycle lengths</p>
              <Bars
                values={windowed.values}
                average={windowed.avg}
                median={windowed.med}
                labels={windowed.labels}
              />
              <p className="sr-only">
                Cycle lengths ranged {windowed.min} to {windowed.max} days, averaging{" "}
                {windowed.avg.toFixed(1)} days across {windowed.n} completed cycles.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <div className="rounded-2xl border border-border/70 bg-surface/35 p-4">
                <p className="eyebrow">Personal baseline</p>
                <p className="numeric mt-1.5 text-[30px] leading-none">
                  {windowed.avg.toFixed(1)}
                  <span className="mono ml-1 text-[11px] text-faint">days avg</span>
                </p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  your range {windowed.min}–{windowed.max} d
                  {windowed.sd !== null ? ` · spread ±${windowed.sd.toFixed(1)}` : ""} ·{" "}
                  {windowed.n} cycle{windowed.n === 1 ? "" : "s"}
                </p>
                {model.variabilityPercent !== null ? (
                  <div className="mt-3" aria-hidden>
                    <div className="relative h-1.5 rounded-full bg-surface-3">
                      <span
                        className="absolute inset-y-0 rounded-full bg-[color:var(--cycle-follicular)] opacity-60"
                        style={{
                          left: `${Math.max(0, Math.min(40, 50 - model.variabilityPercent * 3))}%`,
                          right: `${Math.max(0, Math.min(40, model.variabilityPercent * 3))}%`,
                        }}
                      />
                    </div>
                    <p className="mono mt-1 text-[9px] uppercase tracking-[0.08em] text-faint">
                      variability band · your historical spread, not a biological limit
                    </p>
                  </div>
                ) : null}
              </div>
              <div className="rounded-2xl border border-border/70 bg-surface/35 p-4">
                <p className="eyebrow">Periods</p>
                <p className="numeric mt-1.5 text-[24px] leading-none">
                  {(model.periodLengthAverage ?? 0).toFixed(1)}
                  <span className="mono ml-1 text-[11px] text-faint">days typical</span>
                </p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  from {entries.filter((e) => e.flow && e.flow !== "none").length} logged flow days
                  across {model.completed.length + (model.lastPeriodStart ? 1 : 0)} cycle window
                </p>
              </div>
            </div>
          </div>

          {/* symptom patterns — only when real */}
          {symptomCounts.some((s) => s.n >= 3) ? (
            <div className="rounded-2xl border border-border/70 bg-surface/35 p-4 sm:p-5">
              <p className="eyebrow mb-2.5">What recurs in your logs</p>
              <ul className="flex flex-col gap-1.5">
                {symptomCounts
                  .filter((s) => s.n >= 2)
                  .map((s) => (
                    <li key={s.symptom} className="flex items-center gap-3 text-[13px]">
                      <span className="w-32 shrink-0 truncate text-muted-foreground">
                        {s.symptom}
                      </span>
                      <span
                        className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3"
                        aria-hidden
                      >
                        <span
                          className="block h-full rounded-full bg-[color-mix(in_oklab,var(--violet)_60%,transparent)]"
                          style={{
                            width: `${Math.min(100, (s.n / Math.max(...symptomCounts.map((x) => x.n))) * 100)}%`,
                          }}
                        />
                      </span>
                      <span className="mono w-28 shrink-0 text-right text-[10px] uppercase tracking-[0.06em] text-faint">
                        {s.n}× · {s.spread} day{s.spread === 1 ? "" : "s"}
                      </span>
                    </li>
                  ))}
              </ul>
              <p className="mt-2 text-[11px] text-faint">
                Frequency in your own logs — recurrence across cycles is where patterns start to
                mean something.
              </p>
            </div>
          ) : null}

          {/* mood + energy trend — compact, real, or honest */}
          <div className="grid gap-4 sm:grid-cols-2">
            <TrendStrip
              title="Mood · last 14 logged"
              series={moodSeries}
              accent="var(--cycle-follicular)"
            />
            <TrendStrip
              title="Energy · last 14 logged"
              series={energySeries}
              accent="var(--cycle-ovulation)"
            />
          </div>

          {/* observed fertility evidence — only if logged */}
          {temps.length > 0 || lhLogs.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {temps.length > 0 ? <BbtStrip temps={temps} /> : null}
              {lhLogs.length > 0 ? <LhStrip logs={lhLogs} /> : null}
            </div>
          ) : null}
        </>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-surface/20 px-4 py-8 text-center">
          <LineChart className="size-5 text-faint" strokeWidth={1.5} aria-hidden />
          <p className="display text-[15px] text-muted-foreground">
            The charts fill in as cycles complete.
          </p>
          <p className="max-w-[46ch] text-[12.5px] text-faint">
            Two logged cycles are enough for a personal average. Until then, everything on this page
            stays honestly labeled as the general pattern.
          </p>
        </div>
      )}

      <MethodologyDialog open={method} onClose={() => setMethod(false)} model={model} />
    </div>
  );
}

function TrendStrip({
  title,
  series,
  accent,
}: {
  title: string;
  series: { date: string; score: number }[];
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-surface/35 p-4">
      <p className="eyebrow mb-2.5">{title}</p>
      {series.length < 3 ? (
        <p className="py-3 text-center text-[12px] text-faint">
          {series.length === 0
            ? "Nothing logged yet — a one-tap mood note is enough to start."
            : "A few days in — keep logging and a trend appears here."}
        </p>
      ) : (
        <div
          className="flex h-10 items-end gap-[3px]"
          role="img"
          aria-label={`${series.length} logged values, oldest to newest`}
        >
          {series.map((p) => (
            <span
              key={p.date}
              className="flex-1 rounded-sm"
              style={{ height: `${(p.score / 5) * 100}%`, background: accent, opacity: 0.68 }}
              title={`${p.date} · ${p.score}/5`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BbtStrip({ temps }: { temps: CycleEntry[] }) {
  const pts = temps.slice(-45);
  const vals = pts.map((p) => p.temperature as number);
  const lo = Math.min(...vals) - 0.15;
  const hi = Math.max(...vals) + 0.15;
  const n = pts.length;
  const split = Math.floor(vals.length / 2);
  const lowMean = vals.slice(0, split).reduce((a, b) => a + b, 0) / Math.max(1, split);
  return (
    <div className="rounded-2xl border border-border/70 bg-surface/35 p-4">
      <p className="eyebrow mb-2.5">Basal temperature · °C, your measurements only</p>
      <div className="relative flex h-14 items-end gap-[4px]">
        {pts.map((p, i) => {
          const v = p.temperature as number;
          const h = ((v - lo) / (hi - lo)) * 100;
          const post = i >= split && v >= lowMean + 0.2;
          return (
            <span
              key={p.date}
              title={`${p.date} · ${v.toFixed(2)}°C`}
              className="w-full flex-1 rounded-t-sm"
              style={{
                height: `${h}%`,
                background: post ? "var(--cycle-ovulation)" : "var(--surface-3)",
                opacity: post ? 0.85 : 0.75,
              }}
            />
          );
        })}
      </div>
      <p className="mt-1.5 text-[11px] leading-relaxed text-faint">
        Gaps mean no measurement — nothing is filled in. A sustained rise like the shaded days here
        is the kind of thing a temperature shift looks like; it corroborates, it doesn't diagnose.
      </p>
    </div>
  );
}

function LhStrip({ logs }: { logs: CycleEntry[] }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-surface/35 p-4">
      <p className="eyebrow mb-2.5 flex items-center gap-1.5">
        <TestTube className="size-3" aria-hidden /> LH tests you logged
      </p>
      <ul className="flex flex-col gap-1">
        {logs
          .slice(-6)
          .reverse()
          .map((l) => (
            <li key={l.date} className="flex items-center justify-between gap-3 text-[12.5px]">
              <span className="text-muted-foreground">{fmtShort(l.date)}</span>
              <span
                className={cn(
                  "mono rounded-full border px-2 py-0.5 text-[9.5px] uppercase tracking-[0.08em]",
                  l.lh_test === "positive"
                    ? "border-[var(--cycle-ovulation)] text-[var(--cycle-ovulation)]"
                    : "border-border text-faint",
                )}
              >
                {l.lh_test === "positive" ? "surge observed" : "negative"}
              </span>
            </li>
          ))}
      </ul>
      <p className="mt-2 text-[11px] leading-relaxed text-faint">
        Observed results stay separate from the calendar estimate — the estimate is what would
        appear without them.
      </p>
    </div>
  );
}
