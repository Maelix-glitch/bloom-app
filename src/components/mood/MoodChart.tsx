import { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";

import { movingAverage } from "@/lib/mood/analytics";
import { resolveCssColor } from "@/lib/mood/cssColor";
import type { DayAggregate } from "@/lib/mood/types";
import { Panel, SectionHead, Insufficient } from "./primitives";
import { cn } from "@/lib/utils";

type SeriesKey = "mood" | "avg7" | "avg30" | "energy" | "stress";

const SERIES: { key: SeriesKey; label: string; color: string; type: "line"; dashed?: boolean }[] = [
  { key: "mood", label: "Daily mood", color: "var(--violet)", type: "line" },
  { key: "avg7", label: "7-day average", color: "var(--sky)", type: "line" },
  { key: "avg30", label: "30-day average", color: "var(--amber)", type: "line", dashed: true },
  { key: "energy", label: "Energy", color: "var(--sage)", type: "line" },
  { key: "stress", label: "Stress", color: "var(--rose)", type: "line" },
];

/** ECharts is loaded lazily on the client only — keeps SSR clean and TTI fast. */
export function MoodChart({ days }: { days: DayAggregate[] }) {
  // A state-held node (not a plain ref) so the init effect re-runs when the
  // chart host mounts later — e.g. after the first day of data arrives.
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const chartRef = useRef<{ setOption: (o: unknown, b?: boolean) => void; resize: () => void; dispose: () => void } | null>(null);
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
      const [{ LineChart }, { GridComponent, TooltipComponent, AxisPointerComponent }, { CanvasRenderer }] =
        await Promise.all([
          import("echarts/charts"),
          import("echarts/components"),
          import("echarts/renderers"),
        ]);
      echarts.use([LineChart, GridComponent, TooltipComponent, AxisPointerComponent, CanvasRenderer]);
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
          shadowBlur: s.key === "mood" ? 18 : 0,
          shadowColor: line,
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
        animationDuration: 900,
        animationEasing: "cubicOut",
      };
    });

    chart.setOption(
      {
        animation: true,
        grid: { top: 24, right: 18, bottom: 28, left: 36 },
        textStyle: { fontFamily: "IBM Plex Mono, monospace", color: "oklch(0.66 0.026 285)" },
        tooltip: {
          trigger: "axis",
          backgroundColor: "oklch(0.235 0.023 279)",
          borderColor: "oklch(0.4 0.03 279)",
          borderWidth: 1,
          padding: 0,
          extraCssText: "border-radius:12px;box-shadow:0 24px 50px -28px rgba(0,0,0,.9);backdrop-filter:blur(6px)",
          axisPointer: { type: "line", lineStyle: { color: "oklch(0.4 0.03 279)", type: "dashed" } },
          formatter: (params: unknown) => {
            const list = params as { dataIndex: number }[];
            const idx = list?.[0]?.dataIndex ?? 0;
            const date = model.dates[idx];
            const meta = model.meta[idx];
            if (!date || !meta) return "";
            const row = (label: string, value: string, color?: string) =>
              `<div style="display:flex;justify-content:space-between;gap:20px;font-size:11px;padding:2px 0">
                 <span style="color:oklch(0.52 0.028 285)">${label}</span>
                 <span style="color:${color ?? "oklch(0.955 0.008 85)"};font-variant-numeric:tabular-nums">${value}</span>
               </div>`;
            return `<div style="padding:12px 14px;min-width:200px">
              <div style="font-family:Fraunces,serif;font-size:14px;margin-bottom:8px">${dayjs(date).format("ddd, MMM D YYYY")}</div>
              ${row("Mood", (model.mood[idx] ?? 0).toFixed(2), "var(--violet)")}
              ${row("Energy", (model.energy[idx] ?? 0).toFixed(2), "var(--sage)")}
              ${row("Stress", (model.stress[idx] ?? 0).toFixed(2), "var(--rose)")}
              ${model.avg7[idx] !== null ? row("7-day avg", (model.avg7[idx] as number).toFixed(2), "var(--sky)") : ""}
              ${typeof meta.sleep === "number" ? row("Sleep", `${meta.sleep.toFixed(1)}h`) : ""}
              ${typeof meta.exercise === "number" ? row("Exercise", `${Math.round(meta.exercise)} min`) : ""}
              ${row("Entries", String(meta.entries))}
              ${meta.emotions.length ? `<div style="margin-top:8px;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:oklch(0.52 0.028 285)">${meta.emotions.join(" · ")}</div>` : ""}
            </div>`;
          },
        },
        xAxis: {
          type: "category",
          data: model.dates.map((d) => dayjs(d).format("MMM D")),
          boundaryGap: false,
          axisLine: { lineStyle: { color: "oklch(0.33 0.026 279)" } },
          axisTick: { show: false },
          axisLabel: { fontSize: 10, color: "oklch(0.52 0.028 285)", hideOverlap: true },
        },
        yAxis: {
          type: "value",
          min: 0,
          max: 10,
          interval: 2.5,
          splitLine: { lineStyle: { color: "oklch(0.28 0.024 279)", type: "dashed" } },
          axisLabel: { fontSize: 10, color: "oklch(0.52 0.028 285)" },
        },
        series,
      },
      true,
    );
  }, [ready, active, model]);

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
                    "mono flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.08em] transition-all duration-300",
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
      <div ref={setHost} className="h-[340px] w-full" role="img" aria-label="Mood trajectory chart" />
    </Panel>
  );
}