/**
 * PointsStrip — "how you earned these".
 *
 * Today says "1,234 points → Rewards"; this is where that link lands. The
 * balance, this week's total, and the habits that earned it — all from the
 * same habit logs the Today page counts, so the numbers agree.
 */

import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

import { useHabits } from "@/hooks/useHabits";
import { todayLocal } from "@/lib/localDay";

const shift = (date: string, days: number): string => {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + days);
  return todayLocal(d);
};

export function PointsStrip() {
  const habits = useHabits();
  const today = habits.today || todayLocal();
  const weekStart = shift(today, -6);

  const rows = useMemo(() => {
    const byHabit = new Map(habits.habits.map((h) => [h.id, h]));
    const weekly = new Map<
      string,
      { name: string; icon: string; color: string; count: number; points: number }
    >();
    let weekTotal = 0;
    for (const log of habits.logs) {
      if (log.date < weekStart || log.date > today) continue;
      const h = byHabit.get(log.habitId);
      if (!h) continue;
      weekTotal += h.points;
      const row = weekly.get(h.id) ?? {
        name: h.name,
        icon: h.icon,
        color: h.color,
        count: 0,
        points: 0,
      };
      row.count += 1;
      row.points += h.points;
      weekly.set(h.id, row);
    }
    const top = [...weekly.values()].sort((a, b) => b.points - a.points).slice(0, 4);
    return { top, weekTotal };
  }, [habits.habits, habits.logs, weekStart, today]);

  /* nothing to say yet: no account points and no habit ticks this week */
  if (habits.auth !== "signed-in" && rows.weekTotal === 0) return null;
  if (habits.loading && habits.points === null && rows.weekTotal === 0) return null;

  return (
    <section
      className="reward-points"
      aria-labelledby="reward-points-title"
      data-testid="reward-points"
    >
      <div className="reward-points-head">
        <div>
          <p className="eyebrow flex items-center gap-2">
            <Sparkles className="size-3.5" aria-hidden /> How you earned these
          </p>
          <h2 id="reward-points-title" className="display mt-2 text-[26px] leading-none">
            {habits.points !== null ? (
              <>
                {habits.points.toLocaleString()} <span className="reward-points-unit">points</span>
              </>
            ) : (
              <>
                {rows.weekTotal.toLocaleString()}{" "}
                <span className="reward-points-unit">points this week</span>
              </>
            )}
          </h2>
        </div>
        <p className="reward-points-week">
          {rows.weekTotal > 0
            ? `+${rows.weekTotal.toLocaleString()} in the last 7 days`
            : "Nothing earned in the last 7 days yet"}
        </p>
      </div>
      {rows.top.length > 0 ? (
        <ul className="reward-points-list">
          {rows.top.map((row) => (
            <li key={row.name} className="reward-points-row">
              <span className="reward-points-dot" style={{ background: row.color }} aria-hidden />
              <span className="reward-points-name">
                {row.icon ? <span aria-hidden>{row.icon} </span> : null}
                {row.name}
              </span>
              <span className="reward-points-count">
                {row.count} × {Math.round(row.points / row.count)}
              </span>
              <span className="reward-points-value">+{row.points.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="reward-points-empty">
          Every habit you tick on{" "}
          <Link to="/" className="underline underline-offset-2">
            Today
          </Link>{" "}
          adds its points here.
        </p>
      )}
    </section>
  );
}
