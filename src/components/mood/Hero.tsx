import dayjs from "dayjs";
import { Activity, Flame, Plus, Sparkles, Zap } from "lucide-react";

import { moodLabel } from "@/lib/mood/analytics";
import type { MoodSystem } from "@/hooks/useMoodSystem";
import type { RangeKey } from "@/lib/mood/types";
import { CountUp, Delta, Metric, Panel } from "./primitives";
import { cn } from "@/lib/utils";

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7D" },
  { key: "30d", label: "30D" },
  { key: "90d", label: "90D" },
  { key: "1y", label: "1Y" },
  { key: "custom", label: "Custom" },
];

export function Hero({ system, onCompose }: { system: MoodSystem; onCompose: () => void }) {
  const { analytics: a, range, rangeKey, setRangeKey, custom, setCustom, entries } = system;

  return (
    <header className="relative">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow mb-3 flex items-center gap-2">
            <span className="relative flex size-1.5">
              <span className="animate-ping-soft absolute inline-flex size-full rounded-full bg-violet" />
              <span className="relative inline-flex size-1.5 rounded-full bg-violet" />
            </span>
            Mood intelligence · {dayjs().format("dddd, MMMM D YYYY")}
          </p>
          <h1 className="display text-[34px] leading-[1.05] sm:text-[52px]">
            Your inner weather,
            <br />
            <span className="animate-gradient-pan bg-gradient-to-r from-violet via-sky to-amber bg-[length:220%_auto] bg-clip-text text-transparent">
              measured precisely.
            </span>
          </h1>
          <p className="mt-4 max-w-[62ch] text-[14px] text-muted-foreground">
            A command center for how you actually feel — trends, rhythms, correlations and anomalies
            derived only from what you have logged. Nothing invented, nothing assumed.
          </p>
        </div>

        <div className="flex flex-col items-start gap-4 lg:items-end">
          <button
            type="button"
            onClick={onCompose}
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full px-5 py-3 text-[13px] font-medium text-background transition-transform duration-500 hover:scale-[1.02]"
            style={{ background: "var(--grad-violet)", backgroundSize: "200% 200%", boxShadow: "var(--glow-violet)" }}
          >
            <span
              aria-hidden
              className="animate-sweep absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/25 to-transparent"
              style={{ transform: "translateX(-170%) skewX(-14deg)" }}
            />
            <Plus className="size-4 transition-transform duration-500 group-hover:rotate-90" />
            Log an entry
          </button>
          <div className="flex flex-wrap gap-1.5">
            {RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setRangeKey(r.key)}
                aria-pressed={rangeKey === r.key}
                className={cn(
                  "mono rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.08em] transition-all duration-300",
                  rangeKey === r.key
                    ? "border-violet/60 bg-[var(--dim-violet)] text-violet"
                    : "border-border text-faint hover:border-border-strong hover:text-muted-foreground",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
          {rangeKey === "custom" ? (
            <div className="mono flex items-center gap-2 text-[11px] text-faint">
              <input
                type="date"
                value={custom.start}
                max={custom.end}
                onChange={(e) => setCustom({ ...custom, start: e.target.value })}
                className="rounded-lg border border-border bg-surface-2 px-2 py-1 text-foreground"
              />
              <span>→</span>
              <input
                type="date"
                value={custom.end}
                min={custom.start}
                onChange={(e) => setCustom({ ...custom, end: e.target.value })}
                className="rounded-lg border border-border bg-surface-2 px-2 py-1 text-foreground"
              />
            </div>
          ) : null}
        </div>
      </div>

      <Panel className="mt-8 overflow-hidden" glow="violet">
        <div className="grid divide-y divide-border sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
          <Metric
            label={`Average mood · ${range.label}`}
            value={a.avg}
            suffix="/10"
            accent="violet"
            decimals={2}
            sub={
              <span className="flex items-center gap-2">
                <Delta value={a.changePct} />
                <span className="text-faint">vs previous</span>
              </span>
            }
          />
          <Metric
            label="Stability index"
            raw={a.volatility.stability === null ? "—" : `${a.volatility.stability}`}
            suffix="%"
            accent="sage"
            sub={
              <span className="mono text-[11px] text-faint">
                avg daily change {a.volatility.avgDelta.toFixed(2)}
              </span>
            }
          />
          <Metric
            label="Logging streak"
            raw={`${a.streak}`}
            suffix="days"
            accent="amber"
            sub={<span className="mono text-[11px] text-faint">{a.consistency}% of days covered</span>}
          />
          <Metric
            label="Current state"
            raw={a.days.length ? moodLabel(a.avg) : "—"}
            accent="sky"
            sub={
              <span className="mono text-[11px] text-faint">
                energy <CountUp value={a.avgEnergy} /> · stress <CountUp value={a.avgStress} />
              </span>
            }
          />
        </div>
        <div className="hairline" />
        <div className="mono flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3 text-[10px] uppercase tracking-[0.08em] text-faint">
          <span className="flex items-center gap-2">
            <Sparkles className="size-3 text-violet" /> depth: {a.tier.current.label}
          </span>
          <span className="flex items-center gap-2">
            <Activity className="size-3 text-sky" /> {entries.length} entries · {a.days.length} days in range
          </span>
          <span className="flex items-center gap-2">
            <Zap className="size-3 text-amber" /> trend {a.trend.direction} ({a.trend.perWeek > 0 ? "+" : ""}
            {a.trend.perWeek}/wk)
          </span>
          {a.tier.next ? (
            <span className="flex items-center gap-2">
              <Flame className="size-3 text-rose" /> {a.tier.next.min - entries.length} more entries unlock{" "}
              {a.tier.next.label}
            </span>
          ) : null}
        </div>
      </Panel>
    </header>
  );
}
