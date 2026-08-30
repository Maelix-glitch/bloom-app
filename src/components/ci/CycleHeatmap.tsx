/**
 * CycleHeatmap — the last twelve weeks as a grid, one cell per day, coloured
 * by the phase that day fell in. Days with more logged detail read brighter.
 *
 * It gives the page a sense of time passing: you can see the rhythm of
 * someone's month rather than reading it off a number.
 */

import { placeDate, type DayLog } from "@/lib/cycle/dayLogs";
import { diffDays, formatDate, type CycleAnalysis } from "@/lib/cycle/predict";

const WEEKS = 12;
const DAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", "Sun"];

function observationCount(day: DayLog | undefined): number {
  if (!day) return 0;
  let n = 0;
  if (day.flow) n += 1;
  if ((day.symptoms ?? []).length > 0) n += 1;
  if (day.mood) n += 1;
  if (typeof day.energy === "number") n += 1;
  if (typeof day.pain === "number") n += 1;
  if (typeof day.sleep === "number") n += 1;
  if (typeof day.temperature === "number") n += 1;
  if (day.mucus) n += 1;
  if (day.lh) n += 1;
  if (day.notes) n += 1;
  return n;
}

/** Monday of the week containing `key`. */
function weekStart(key: string): string {
  const dt = new Date(`${key}T00:00:00Z`);
  const dow = (dt.getUTCDay() + 6) % 7; // Monday = 0
  dt.setUTCDate(dt.getUTCDate() - dow);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(
    dt.getUTCDate(),
  ).padStart(2, "0")}`;
}

export function CycleHeatmap({
  days,
  analysis,
  compact = false,
}: {
  days: DayLog[];
  analysis: CycleAnalysis;
  compact?: boolean;
}) {
  if (analysis.entryCount === 0) {
    return (
      <p className="text-[12.5px] ci-muted">
        Log a period and the last twelve weeks start filling in here.
      </p>
    );
  }

  const byDate = new Map(days.map((d) => [d.date, d]));
  const end = weekStart(analysis.today);
  const gridStart = weekStart(
    new Date(new Date(`${end}T00:00:00Z`).getTime() - (WEEKS - 1) * 7 * 86_400_000)
      .toISOString()
      .slice(0, 10),
  );

  const cells: { date: string; day: DayLog | undefined; phase: string | null; count: number }[] =
    [];
  const totalDays = diffDays(gridStart, end) + 7;
  for (let i = 0; i < totalDays; i += 1) {
    const date = new Date(new Date(`${gridStart}T00:00:00Z`).getTime() + i * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const day = byDate.get(date);
    const place = placeDate(analysis, date);
    cells.push({
      date,
      day,
      phase: place?.phase ?? null,
      count: observationCount(day),
    });
  }

  const logged = cells.filter((c) => c.day).length;

  return (
    <div>
      <div className="flex gap-1.5">
        <div className="flex flex-col justify-between py-[1px] pr-1">
          {DAY_LABELS.map((label, i) => (
            <span key={i} className="h-[13px] text-[9px] leading-[13px] ci-muted">
              {label}
            </span>
          ))}
        </div>
        <div
          className="grid flex-1 gap-[3px]"
          style={{ gridTemplateColumns: `repeat(${totalDays / 7}, minmax(0, 1fr))` }}
          role="img"
          aria-label={`The last ${WEEKS} weeks: ${logged} days logged. Cells are coloured by the phase each day fell in.`}
        >
          {cells.map((cell) => {
            const intensity = cell.count === 0 ? 0 : Math.min(1, 0.35 + cell.count * 0.16);
            return (
              <span
                key={cell.date}
                title={describe(cell, analysis)}
                className="h-[13px] rounded-[2px]"
                style={{
                  background: cell.day
                    ? `color-mix(in oklab, var(--ci-${cell.phase ?? "follicular"}) ${Math.round(25 + intensity * 70)}%, transparent)`
                    : "var(--ci-surface-2)",
                  outline:
                    cell.date === analysis.today
                      ? "1px solid var(--ci-text)"
                      : cell.day
                        ? `1px solid color-mix(in oklab, var(--ci-${cell.phase ?? "follicular"}) 35%, transparent)`
                        : "none",
                }}
              />
            );
          })}
        </div>
      </div>

      {!compact ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10.5px] ci-muted">
          <span className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-[2px]"
              style={{ background: "var(--ci-surface-2)" }}
            />
            not logged
          </span>
          {(["menstrual", "follicular", "ovulation", "luteal"] as const).map((phase) => (
            <span key={phase} className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-[2px]"
                style={{ background: `var(--ci-${phase})`, opacity: 0.85 }}
              />
              {phase}
            </span>
          ))}
          <span className="ml-auto">{logged} days logged in 12 weeks</span>
        </div>
      ) : null}
    </div>
  );
}

function describe(
  cell: { date: string; day: DayLog | undefined; phase: string | null; count: number },
  analysis: CycleAnalysis,
): string {
  if (!cell.day) {
    return `${formatDate(cell.date)} · ${cell.phase ?? "unplaced"} · nothing logged`;
  }
  const parts: string[] = [];
  if (cell.day.flow) parts.push(`${cell.day.flow} flow`);
  if ((cell.day.symptoms ?? []).length > 0) parts.push((cell.day.symptoms ?? []).join(", "));
  if (cell.day.mood) parts.push(`${cell.day.mood} mood`);
  if (typeof cell.day.pain === "number") parts.push(`pain ${cell.day.pain}`);
  if (typeof cell.day.sleep === "number") parts.push(`${cell.day.sleep}h sleep`);
  const place = placeDate(analysis, cell.date);
  const head = `${formatDate(cell.date)} · day ${place?.cycleDay ?? "?"} · ${cell.phase ?? "?"}`;
  return parts.length > 0 ? `${head} — ${parts.join(" · ")}` : `${head} — logged`;
}
