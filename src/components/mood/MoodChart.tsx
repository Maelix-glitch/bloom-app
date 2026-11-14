import { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";

import { movingAverage } from "@/lib/mood/analytics";
import { resolveCssColor } from "@/lib/mood/cssColor";
import type { DayAggregate } from "@/lib/mood/types";
import { Panel, SectionHead, Insufficient } from "./primitives";
import { cn } from "@/lib/utils";

type SeriesKey = "mood" | "avg7" | "avg30" | "energy" | "stress";

/**
 * The house motion curve --ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1),
 * as an echarts easing function. CSS gets the curve from the token; the
 * chart canvas needs the same curve as a function, so it is solved here
 * (standard Newton + bisection cubic-bezier solver) rather than falling
 * back to echarts' cubicOut, which is a different, weaker curve.
 */
export function cubicBezierEasing(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const sampleDerivX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number): number => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i += 1) {
      const err = sampleX(t) - x;
      if (Math.abs(err) < 1e-6) return sampleY(t);
      const deriv = sampleDerivX(t);
      if (Math.abs(deriv) < 1e-6) break;
      t -= err / deriv;
    }
    let lo = 0;
    let hi = 1;
    t = x;
    while (hi - lo > 1e-6) {
      if (sampleX(t) < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return sampleY(t);
  };
}

/** cubic-bezier(0.16, 1, 0.3, 1) — var(--ease-out-expo). */
export const houseEasing = cubicBezierEasing(0.16, 1, 0.3, 1);

const SERIES: { key: SeriesKey; label: string; color: string; type: "line"; dashed?: boolean }[] = [
  { key: "mood", label: "Daily mood", color: "var(--violet)", type: "line" },
  { key: "avg7", label: "7-day average", color: "var(--sky)", type: "line" },
  { key: "avg30", label: "30-day average", color: "var(--amber)", type: "line", dashed: true },
  { key: "energy", label: "Energy", color: "var(--sage)", type: "line" },
  { key: "stress", label: "Stress", color: "var(--rose)", type: "line" },
];

/** ECharts is loaded lazily on the client only — keeps SSR clean and TTI fast. */
export function MoodChart({
  days,
  usualMood,
}: {
  days: DayAggregate[];
  /** Their usual check-in mood — a quiet dashed reference, never a target. */
  usualMood?: number | null | undefined;
}) {
  // A state-held node (not a plain ref) so the init effect re-runs when the
  // chart host mounts later — e.g. after the first day of data arrives.
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const chartRef = useRef<{
    setOption: (o: unknown, opts?: { replaceMerge?: string[] }) => void;
    resize: () => void;
    dispose: () => void;
  } | null>(null);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState<SeriesKey[]>(["mood", "avg7", "energy"]);

  const model = useMemo(() => {
    const dates = days.map((d) => d.date);
    const mood = days.map((d) => d.mood);
    return {
      dates,
      mood,
      avg7: movingAverage(mood, 7),
      avg30: movingAverage(mood, 30),
      energy: days.map((d) => d.energy),
      stress: days.map((d) => d.stress),
      meta: days.map((d) => ({
        entries: d.entries.length,
        emotions: d.emotions.slice(0, 3),
        sleep: d.sleep,
        exercise: d.exercise,
      })),
    };
  }, [days]);

  useEffect(() => {
    let disposed = false;
    if (!host) return;
    import("echarts/core").then(async (echarts) => {
      const [
        { LineChart },
        { GridComponent, TooltipComponent, AxisPointerComponent, MarkLineComponent },
        { CanvasRenderer },
      ] = await Promise.all([
        import("echarts/charts"),
        import("echarts/components"),
        import("echarts/renderers"),
      ]);
      echarts.use([
        LineChart,
        GridComponent,
        TooltipComponent,
        AxisPointerComponent,
        MarkLineComponent,
        CanvasRenderer,
      ]);
      if (disposed) return;
      chartRef.current = echarts.init(host, undefined, { renderer: "canvas" }) as never;
      setReady(true);
    });
    return () => {
      disposed = true;
      setReady(false);
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, [host]);

  useEffect(() => {
    if (!ready) return;
    const onResize = () => chartRef.current?.resize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [ready]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !ready) return;

    const series = SERIES.filter((s) => active.includes(s.key)).map((s) => {
      const line = resolveCssColor(s.color);
      return {
        name: s.label,
        type: "line",
        smooth: 0.32,
        symbol: "circle",
        symbolSize: 0,
        showSymbol: false,
        connectNulls: true,
        lineStyle: {
          width: s.key === "mood" ? 2.4 : 1.4,
          color: line,
          type: s.dashed ? "dashed" : "solid",
          // No canvas shadowBlur: it is re-rasterised on every animation
          // frame and was the single most expensive part of a range switch.
          // The soft area fill below gives the mood line its glow instead.
          shadowBlur: 0,
        },
        emphasis: { focus: "series", lineStyle: { width: s.key === "mood" ? 3 : 2 } },
        areaStyle:
          s.key === "mood"
            ? {
                opacity: 0.18,
                color: {
                  type: "linear",
                  x: 0,
                  y: 0,
                  x2: 0,
                  y2: 1,
                  colorStops: [
                    {
                      offset: 0,
                      color: resolveCssColor("color-mix(in oklab, var(--violet) 55%, transparent)"),
                    },
                    { offset: 1, color: "rgba(0,0,0,0)" },
                  ],
                },
              }
            : undefined,
        data: model[s.key],
        animationDuration: 420,
        animationDurationUpdate: 420,
        animationEasing: houseEasing,
        animationEasingUpdate: houseEasing,
        /* Their usual mood rides on the mood series as a quiet dashed
           reference — a fact about them, not a goal. */
        markLine:
          s.key === "mood" && typeof usualMood === "number" && Number.isFinite(usualMood)
            ? {
                silent: true,
                symbol: "none",
                animation: false,
                lineStyle: { type: "dashed", color: line, opacity: 0.45, width: 1 },
                label: {
                  show: true,
                  position: "insideEndTop",
                  formatter: "usual",
                  fontSize: 9,
                  color: line,
                  opacity: 0.8,
                },
                data: [{ yAxis: usualMood }],
              }
            : undefined,
      };
    });

    /* Chart chrome comes from the design tokens, resolved like the series
       colours — the option once carried hand-copied oklch literals frozen
       at hue 279, so the chart ignored the app's theme variants entirely. */
    const chrome = {
      text: resolveCssColor("var(--muted-foreground)"),
      label: resolveCssColor("var(--faint)"),
      surface: resolveCssColor("var(--surface-2)"),
      border: resolveCssColor("var(--border)"),
      borderSubtle: resolveCssColor("var(--border-subtle)"),
      borderStrong: resolveCssColor("var(--border-strong)"),
    };

    chart.setOption(
      {
        animation: true,
        grid: { top: 24, right: 18, bottom: 28, left: 36 },
        textStyle: { fontFamily: "IBM Plex Mono, monospace", color: chrome.text },
        tooltip: {
          trigger: "axis",
          backgroundColor: chrome.surface,
          borderColor: chrome.borderStrong,
          borderWidth: 1,
          padding: 0,
          extraCssText:
            "border-radius:12px;box-shadow:0 24px 50px -28px rgba(0,0,0,.9);backdrop-filter:blur(6px)",
          axisPointer: {
            type: "line",
            lineStyle: { color: chrome.borderStrong, type: "dashed" },
          },
          formatter: (params: unknown) => {
            const list = params as { dataIndex: number }[];
            const idx = list?.[0]?.dataIndex ?? 0;
            const date = model.dates[idx];
            const meta = model.meta[idx];
            if (!date || !meta) return "";
            const row = (label: string, value: string, color?: string) =>
              `<div style="display:flex;justify-content:space-between;gap:20px;font-size:11px;padding:2px 0">
                 <span style="color:var(--faint)">${label}</span>
                 <span style="color:${color ?? "var(--foreground)"};font-variant-numeric:tabular-nums">${value}</span>
               </div>`;
            return `<div style="padding:12px 14px;min-width:200px">
              <div style="font-family:var(--font-display);font-size:14px;margin-bottom:8px">${dayjs(date).format("ddd, MMM D YYYY")}</div>
              ${row("Mood", (model.mood[idx] ?? 0).toFixed(2), "var(--violet)")}
              ${row("Energy", (model.energy[idx] ?? 0).toFixed(2), "var(--sage)")}
              ${row("Stress", (model.stress[idx] ?? 0).toFixed(2), "var(--rose)")}
              ${model.avg7[idx] !== null ? row("7-day avg", (model.avg7[idx] as number).toFixed(2), "var(--sky)") : ""}
              ${typeof meta.sleep === "number" ? row("Sleep", `${meta.sleep.toFixed(1)}h`) : ""}
              ${typeof meta.exercise === "number" ? row("Exercise", `${Math.round(meta.exercise)} min`) : ""}
              ${row("Entries", String(meta.entries))}
              ${meta.emotions.length ? `<div style="margin-top:8px;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--faint)">${meta.emotions.join(" · ")}</div>` : ""}
            </div>`;
          },
        },
        xAxis: {
          type: "category",
          data: model.dates.map((d) => dayjs(d).format("MMM D")),
          boundaryGap: false,
          axisLine: { lineStyle: { color: chrome.border } },
          axisTick: { show: false },
          axisLabel: { fontSize: 10, color: chrome.label, hideOverlap: true },
        },
        yAxis: {
          type: "value",
          min: 0,
          max: 10,
          interval: 2.5,
          splitLine: { lineStyle: { color: chrome.borderSubtle, type: "dashed" } },
          axisLabel: { fontSize: 10, color: chrome.label },
        },
        series,
      },
      // Merge-update instead of tearing the chart down (`notMerge`) on every
      // range switch; `replaceMerge` still lets toggled-off series disappear.
      { replaceMerge: ["series"] },
    );
  }, [ready, active, model, usualMood]);

  if (days.length < 2)
    return (
      <Panel className="p-6" glow="violet">
        <SectionHead eyebrow="Signal" title="Mood trajectory" />
        <Insufficient>At least 2 logged days are needed to draw a trajectory.</Insufficient>
      </Panel>
    );

  return (
    <Panel className="p-6" glow="violet">
      <SectionHead
        eyebrow="Signal"
        title="Mood trajectory"
        sub="Daily readings with smoothed baselines. Toggle any layer to isolate a signal."
        right={
          <div className="flex flex-wrap gap-2">
            {SERIES.map((s) => {
              const on = active.includes(s.key);
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() =>
                    setActive((prev) => (on ? prev.filter((k) => k !== s.key) : [...prev, s.key]))
                  }
                  aria-pressed={on}
                  className={cn(
                    "mono flex items-center gap-2 rounded-full border px-3 py-1.5 text-[length:var(--text-micro)] uppercase tracking-[var(--tracking-meta)] transition-all duration-300",
                    on
                      ? "border-border-strong bg-surface-2 text-foreground"
                      : "border-border bg-transparent text-faint hover:text-muted-foreground",
                  )}
                >
                  <span
                    className="size-1.5 rounded-full transition-opacity"
                    style={{ background: s.color, opacity: on ? 1 : 0.35 }}
                  />
                  {s.label}
                </button>
              );
            })}
          </div>
        }
      />
      <div
        ref={setHost}
        className="h-[340px] w-full"
        role="img"
        aria-label="Mood trajectory chart"
      />
    </Panel>
  );
}
