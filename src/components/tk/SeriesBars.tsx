/**
 * SeriesBars — fourteen days of one tracker.
 *
 * Bars scale against the tallest value or the goal, whichever is higher, so a
 * target line always has somewhere to sit. Unlogged days are a hairline, not
 * a zero — an empty day is not a day of nothing.
 */

import { useMemo } from "react";

import { trackerDef, type SeriesPoint, type TrackerId } from "@/lib/trackers/core";

function dayLabel(date: string): string {
  const day = new Date(`${date}T00:00:00`).getDay();
  return ["S", "M", "T", "W", "T", "F", "S"][day] ?? "";
}

export function SeriesBars({
  id,
  series,
  goal,
  height = 116,
  showAxis = true,
}: {
  id: TrackerId;
  series: SeriesPoint[];
  goal: number;
  height?: number;
  showAxis?: boolean;
}) {
  const def = trackerDef(id);
  const peak = useMemo(() => {
    const values = series
      .map((p) => p.value)
      .filter((v): v is number => v !== null && Number.isFinite(v));
    return Math.max(goal, ...values, 1);
  }, [goal, series]);

  return (
    <div>
      <div className="tk-bars" style={{ height }} aria-hidden="true">
        {series.map((point) => {
          const value = point.value;
          const pct =
            value === null ? 0 : Math.max(2, Math.min(100, (value / peak) * 100));
          return (
            <div
              key={point.date}
              className="tk-bar"
              data-met={String(point.met === true)}
              title={`${point.date}: ${value === null ? "not logged" : def.format(Math.round(value))}`}
            >
              <div
                className="tk-bar__fill"
                data-empty={String(value === null)}
                style={{
                  height: `${pct}%`,
                  animationDelay: `${series.indexOf(point) * 25}ms`,
                }}
              />
              <div
                className="tk-bar__goal"
                style={{ bottom: `${Math.min(100, (goal / peak) * 100)}%` }}
              />
            </div>
          );
        })}
      </div>
      {showAxis ? (
        <div className="tk-axis" aria-hidden="true">
          {series.map((point, i) => (
            <span key={point.date}>{i % 2 === 0 ? dayLabel(point.date) : ""}</span>
          ))}
        </div>
      ) : null}
      <p className="tk-sr">
        {series
          .map((p) => `${p.date}: ${p.value === null ? "not logged" : def.format(Math.round(p.value))}`)
          .join(". ")}
      </p>
    </div>
  );
}

export default SeriesBars;
