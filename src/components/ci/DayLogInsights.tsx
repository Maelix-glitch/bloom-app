/**
 * DayLogInsights — what the advanced log adds up to.
 *
 * Symptom frequency, mood/energy/pain/sleep compared across the four phases,
 * a flow curve built from per-day bleeding, temperature readings for anyone
 * tracking BBT, and the recent days themselves. Every number comes from the
 * user's own entries; empty phases show as empty rather than as zero.
 */

import { useRef } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { Button, Card } from "./primitives";
import { useMeasuredWidth } from "./useMeasuredWidth";
import {
  FLOW_SCORE,
  MOOD_LABEL,
  MUCUS_LABEL,
  type DayLog,
  type DayLogAnalysis,
  type PhaseAverage,
} from "@/lib/cycle/dayLogs";
import { PHASE_LABEL, formatDate, formatDateShort, type Phase } from "@/lib/cycle/predict";

const FLOW_WORD: Record<number, string> = { 0: "none", 1: "light", 2: "medium", 3: "heavy" };
const PHASES: Phase[] = ["menstrual", "follicular", "ovulation", "luteal"];
const round1 = (n: number) => Math.round(n * 10) / 10;

function MiniBar({ value, max, colour }: { value: number; max: number; colour: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="h-[5px] w-full max-w-[42px] overflow-hidden rounded-full"
        style={{ background: "var(--ci-surface-2)" }}
      >
        <span
          className="block h-full rounded-full"
          style={{ width: `${Math.max(4, (value / max) * 100)}%`, background: colour }}
        />
      </span>
    </span>
  );
}

function PhaseTable({
  rows,
  max,
  colour,
  emptyLabel,
}: {
  rows: PhaseAverage[];
  max: number;
  colour: string;
  emptyLabel: string;
}) {
  return (
    <table className="ci-table">
      <caption className="ci-sr">{emptyLabel} by phase</caption>
      <thead>
        <tr>
          <th scope="col">Phase</th>
          <th scope="col">Average</th>
          <th scope="col">Days</th>
        </tr>
      </thead>
      <tbody>
        {PHASES.map((phase) => {
          const row = rows.find((r) => r.phase === phase);
          return (
            <tr key={phase}>
              <td>
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="h-2 w-2 rounded-full"
                    style={{ background: `var(--ci-${phase})` }}
                  />
                  {PHASE_LABEL[phase as Exclude<Phase, "late">]}
                </span>
              </td>
              <td>
                {row?.average !== null && row?.average !== undefined ? (
                  <span className="flex items-center gap-2">
                    <span className="ci-num">{round1(row.average)}</span>
                    <MiniBar value={row.average} max={max} colour={colour} />
                  </span>
                ) : (
                  <span className="ci-muted">no data</span>
                )}
              </td>
              <td className="ci-num">{row?.days ?? 0}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/* ------------------------------ temperature chart ------------------------- */

function TemperatureSpark({ points }: { points: DayLogAnalysis["temperatures"] }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const width = useMeasuredWidth(hostRef);
  const height = 96;
  if (points.length < 2) return null;

  const values = points.map((p) => p.value);
  const lo = Math.min(...values) - 0.15;
  const hi = Math.max(...values) + 0.15;
  const x = (i: number) => 6 + (i / Math.max(1, points.length - 1)) * (width - 12);
  const y = (v: number) => height - 14 - ((v - lo) / Math.max(0.01, hi - lo)) * (height - 28);
  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`)
    .join(" ");

  return (
    <div ref={hostRef} className="w-full">
      {width > 0 ? (
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`Temperature readings: ${points.map((p) => `${formatDateShort(p.date)} ${p.value}`).join(", ")}`}
        >
          {[lo, (lo + hi) / 2, hi].map((v, i) => (
            <g key={i}>
              <line x1={0} x2={width} y1={y(v)} y2={y(v)} style={{ stroke: "var(--ci-line)" }} />
              <text
                x={2}
                y={y(v) - 3}
                style={{
                  fill: "var(--ci-text-mute)",
                  fontFamily: "var(--ci-font-mono)",
                  fontSize: 9,
                }}
              >
                {v.toFixed(1)}
              </text>
            </g>
          ))}
          <path d={line} fill="none" style={{ stroke: "var(--ci-ovulation)" }} strokeWidth={1.6} />
          {points.map((p, i) => (
            <circle
              key={p.date}
              cx={x(i)}
              cy={y(p.value)}
              r={2.5}
              style={{ fill: `var(--ci-${p.phase})` }}
            >
              <title>{`${formatDate(p.date)} · ${p.value}°C · ${p.phase}`}</title>
            </circle>
          ))}
        </svg>
      ) : (
        <div style={{ height }} />
      )}
    </div>
  );
}

/* ---------------------------------- panel --------------------------------- */

export function DayLogInsights({
  days,
  dayAnalysis,
  onEditDate,
  onDeleteDate,
  disabled = false,
  compact = false,
}: {
  days: DayLog[];
  dayAnalysis: DayLogAnalysis;
  onEditDate?: ((date: string) => void) | undefined;
  onDeleteDate?: ((date: string) => void) | undefined;
  disabled?: boolean | undefined;
  compact?: boolean | undefined;
}) {
  if (dayAnalysis.total === 0) {
    return (
      <Card>
        <p className="ci-eyebrow">From your daily log</p>
        <h2 className="ci-display mt-1.5 text-[19px] leading-tight sm:text-[22px]">
          Nothing logged day-by-day yet
        </h2>
        <p className="mt-2 max-w-[62ch] text-[12.5px] leading-relaxed ci-soft">
          The advanced log above is where this section comes from. One day with a symptom or a mood
          on it is enough to start; after a handful, the phase comparisons below start saying
          something real about your own pattern.
        </p>
      </Card>
    );
  }

  const topSymptoms = dayAnalysis.symptoms.slice(0, compact ? 5 : 8);
  const maxSymptom = topSymptoms[0]?.count ?? 1;
  const recent = days.slice(0, compact ? 3 : 8);

  return (
    <Card>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="ci-eyebrow">From your daily log</p>
          <h2 className="ci-display mt-1.5 text-[19px] leading-tight sm:text-[22px]">
            What your logged days show
          </h2>
        </div>
        <dl className="flex flex-wrap gap-x-6 gap-y-1.5 text-[11.5px]">
          <div>
            <dt className="ci-eyebrow">Days logged</dt>
            <dd className="ci-num mt-0.5 text-[15px]">{dayAnalysis.total}</dd>
          </div>
          <div>
            <dt className="ci-eyebrow">Last 30 days</dt>
            <dd className="ci-num mt-0.5 text-[15px]">{dayAnalysis.lastThirty}</dd>
          </div>
          <div>
            <dt className="ci-eyebrow">Symptoms seen</dt>
            <dd className="ci-num mt-0.5 text-[15px]">{dayAnalysis.symptoms.length}</dd>
          </div>
        </dl>
      </div>

      {dayAnalysis.notes.length > 0 ? (
        <ul className="mt-4 space-y-1.5">
          {dayAnalysis.notes.map((note) => (
            <li key={note} className="flex gap-2.5 text-[12.5px] leading-relaxed ci-soft">
              <span
                aria-hidden
                className="mt-[7px] h-[5px] w-[5px] shrink-0 rotate-45 rounded-[1px]"
                style={{ background: "var(--ci-follicular)" }}
              />
              {note}
            </li>
          ))}
        </ul>
      ) : null}

      <div className={compact ? "mt-4 space-y-5" : "mt-5 grid gap-5 lg:grid-cols-2"}>
        {/* symptoms */}
        <div>
          <p className="ci-eyebrow">Symptoms by frequency</p>
          <div className="mt-3 space-y-2">
            {topSymptoms.map((s) => (
              <div key={s.key} className="flex items-center gap-3">
                <span
                  className="w-[110px] shrink-0 truncate text-[12px] capitalize ci-soft"
                  title={s.key}
                >
                  {s.key}
                </span>
                <span
                  className="h-[8px] flex-1 overflow-hidden rounded-full"
                  style={{ background: "var(--ci-surface-2)" }}
                >
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${Math.max(4, (s.count / maxSymptom) * 100)}%`,
                      background: "var(--ci-menstrual)",
                      opacity: 0.85,
                    }}
                  />
                </span>
                <span className="ci-num w-[74px] shrink-0 text-right text-[11.5px] ci-muted">
                  {s.count}d · {Math.round(s.share * 100)}%
                </span>
              </div>
            ))}
          </div>
          {!compact && dayAnalysis.lhPositives.length > 0 ? (
            <p className="mt-3 text-[11.5px] ci-muted">
              {dayAnalysis.lhPositives.length} positive LH{" "}
              {dayAnalysis.lhPositives.length === 1 ? "test" : "tests"} logged — most recently{" "}
              {formatDate(dayAnalysis.lhPositives[dayAnalysis.lhPositives.length - 1]!.date)}.
            </p>
          ) : null}
        </div>

        {/* phase comparisons */}
        <div>
          <p className="ci-eyebrow">Across the phases</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-[12px] font-medium">Pain (0–5)</p>
              <PhaseTable
                rows={dayAnalysis.painByPhase}
                max={5}
                colour="var(--ci-menstrual)"
                emptyLabel="Pain"
              />
            </div>
            <div>
              <p className="mb-1.5 text-[12px] font-medium">Energy (1–5)</p>
              <PhaseTable
                rows={dayAnalysis.energyByPhase}
                max={5}
                colour="var(--ci-follicular)"
                emptyLabel="Energy"
              />
            </div>
            <div>
              <p className="mb-1.5 text-[12px] font-medium">Mood (1–5)</p>
              <PhaseTable
                rows={dayAnalysis.moodByPhase}
                max={5}
                colour="var(--ci-ovulation)"
                emptyLabel="Mood"
              />
            </div>
            <div>
              <p className="mb-1.5 text-[12px] font-medium">Sleep (hours)</p>
              <PhaseTable
                rows={dayAnalysis.sleepByPhase}
                max={10}
                colour="var(--ci-luteal)"
                emptyLabel="Sleep"
              />
            </div>
          </div>
        </div>

        {/* flow curve */}
        {dayAnalysis.flowCurve.length > 0 ? (
          <div>
            <p className="ci-eyebrow">Bleeding by day of period</p>
            <p className="mt-1.5 text-[11.5px] leading-relaxed ci-muted">
              Average intensity for each day of your period, from the days you logged bleeding.
            </p>
            <div className="mt-3 flex items-end gap-2" style={{ height: 92 }}>
              {dayAnalysis.flowCurve.map((point) => (
                <div key={point.day} className="flex h-full flex-1 flex-col items-center gap-1.5">
                  <span className="ci-num text-[10px] ci-muted">
                    {FLOW_WORD[Math.round(point.average)]}
                  </span>
                  <span className="flex w-full flex-1 items-end">
                    <span
                      className="w-full rounded-t-[4px]"
                      style={{
                        height: `${Math.max(6, (point.average / 3) * 100)}%`,
                        background: "var(--ci-menstrual)",
                        opacity: 0.4 + (point.average / 3) * 0.5,
                      }}
                      title={`Day ${point.day}: average ${FLOW_WORD[Math.round(point.average)]} across ${point.days} logged ${point.days === 1 ? "day" : "days"}`}
                    />
                  </span>
                  <span className="ci-num text-[10px] ci-muted">d{point.day}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* temperature */}
        {dayAnalysis.temperatures.length >= 2 ? (
          <div>
            <p className="ci-eyebrow">Temperature</p>
            <p className="mt-1.5 text-[11.5px] leading-relaxed ci-muted">
              {dayAnalysis.temperatures.length} readings. Dots are coloured by the phase each
              reading falls in.
            </p>
            <div className="mt-2">
              <TemperatureSpark points={dayAnalysis.temperatures} />
            </div>
          </div>
        ) : null}
      </div>

      {/* recent days */}
      {recent.length > 0 ? (
        <div className="mt-6 border-t pt-4 ci-hair">
          <p className="ci-eyebrow">Recent logged days</p>
          <ul className="mt-3 space-y-2">
            {recent.map((day) => (
              <li
                key={day.date}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[var(--ci-radius-md)] border px-3 py-2.5 ci-hair"
              >
                <span
                  className="ci-num w-[96px] shrink-0 text-[12.5px]"
                  style={{ color: "var(--ci-text)" }}
                >
                  {formatDate(day.date)}
                </span>
                <span className="flex flex-wrap gap-1.5">
                  {day.flow ? (
                    <span
                      className="ci-badge"
                      style={{
                        borderColor: "var(--ci-menstrual)",
                        color: "var(--ci-menstrual)",
                        background: "color-mix(in oklab, var(--ci-menstrual) 12%, transparent)",
                      }}
                    >
                      {FLOW_WORD[FLOW_SCORE[day.flow]] ?? day.flow}
                    </span>
                  ) : null}
                  {day.mood ? <span className="ci-badge">{MOOD_LABEL[day.mood]}</span> : null}
                  {day.pain !== null && day.pain !== undefined ? (
                    <span className="ci-badge">pain {day.pain}</span>
                  ) : null}
                  {day.energy !== null && day.energy !== undefined ? (
                    <span className="ci-badge">energy {day.energy}</span>
                  ) : null}
                  {day.sleep !== null && day.sleep !== undefined ? (
                    <span className="ci-badge">{day.sleep}h sleep</span>
                  ) : null}
                  {(day.symptoms ?? []).slice(0, 3).map((s) => (
                    <span key={s} className="ci-badge capitalize">
                      {s}
                    </span>
                  ))}
                  {(day.symptoms ?? []).length > 3 ? (
                    <span className="ci-badge">+{(day.symptoms ?? []).length - 3}</span>
                  ) : null}
                  {day.mucus ? <span className="ci-badge">{MUCUS_LABEL[day.mucus]}</span> : null}
                  {day.lh === "positive" ? (
                    <span
                      className="ci-badge"
                      style={{
                        borderColor: "var(--ci-ovulation)",
                        color: "var(--ci-ovulation)",
                        background: "color-mix(in oklab, var(--ci-ovulation) 12%, transparent)",
                      }}
                    >
                      LH+
                    </span>
                  ) : null}
                  {day.notes ? (
                    <span className="line-clamp-1 basis-full text-[11.5px] ci-muted">
                      {day.notes}
                    </span>
                  ) : null}
                </span>
                {onEditDate || onDeleteDate ? (
                  <span className="ml-auto flex items-center gap-1">
                    {onEditDate ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={disabled}
                        onClick={() => onEditDate(day.date)}
                        aria-label={`Edit ${formatDate(day.date)}`}
                      >
                        <Pencil size={12} aria-hidden />
                        Edit
                      </Button>
                    ) : null}
                    {onDeleteDate ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={disabled}
                        onClick={() => onDeleteDate(day.date)}
                        aria-label={`Delete the log for ${formatDate(day.date)}`}
                      >
                        <Trash2 size={12} aria-hidden />
                      </Button>
                    ) : null}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}
