/**
 * StudyMap — the weeks of study that exist, one cell per day.
 *
 * Colour is how much was logged against the goal, not against other people:
 * four shades from "logged something" to "well past the target". Empty days
 * stay empty.
 *
 * The field spans from the week of the record's first day to this week,
 * capped at twelve weeks (Final Audit F-23, M-204): a young record used
 * to draw twelve weeks of grey squares for a handful of real days, and
 * the emptiness read as the product. Weeks that don't exist yet aren't
 * drawn; the field grows as the record does.
 */

import { addDays, diffDays, formatDateShort } from "@/lib/cycle/predict";
import { trackerDef, type DayEntry } from "@/lib/trackers/core";

const WEEKS = 12;

function level(minutes: number, goal: number): number {
  if (minutes <= 0) return 0;
  const share = minutes / Math.max(goal, 1);
  if (share >= 1.5) return 4;
  if (share >= 1) return 3;
  if (share >= 0.5) return 2;
  return 1;
}

export function StudyMap({
  days,
  today,
  goal,
}: {
  days: readonly DayEntry[];
  today: string;
  goal: number;
}) {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const study = trackerDef("study");

  /* Start from the Sunday of the week the record begins, so rows are
     whole weeks — and never more than twelve weeks back. */
  const last = new Date(`${today}T00:00:00`);
  const floorStart = addDays(today, -(WEEKS * 7 - 1) - last.getDay());
  const firstDate = days.reduce<string | null>(
    (acc, d) => (acc === null || d.date < acc ? d.date : acc),
    null,
  );
  let start = floorStart;
  if (firstDate !== null) {
    const first = new Date(`${firstDate}T00:00:00`);
    const recordStart = addDays(firstDate, -first.getDay());
    if (recordStart > floorStart) start = recordStart;
  }
  const weekCount = Math.floor(diffDays(start, today) / 7) + 1;
  const weeksLabel =
    weekCount >= WEEKS ? "Twelve weeks" : weekCount === 1 ? "One week" : `${weekCount} weeks`;

  const cells: { date: string; minutes: number; level: number; today: boolean }[] = [];
  for (let i = 0; i < WEEKS * 7; i += 1) {
    const date = addDays(start, i);
    if (diffDays(date, today) < 0) continue;
    const day = byDate.get(date);
    const minutes = day ? day.sessions.reduce((sum, s) => sum + s.minutes, 0) : 0;
    cells.push({ date, minutes, level: level(minutes, goal), today: date === today });
  }

  return (
    <div>
      <div className="tk-heat-axis" aria-hidden="true">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div
        className="tk-heat"
        role="img"
        aria-label={`${weeksLabel} of study. ${cells.filter((c) => c.minutes > 0).length} of the last ${cells.length} days have sessions logged.`}
      >
        {cells.map((cell) => (
          <i
            key={cell.date}
            data-level={cell.level}
            data-today={String(cell.today)}
            title={`${formatDateShort(cell.date)} · ${
              cell.minutes === 0 ? "nothing logged" : study.format(cell.minutes)
            }`}
          />
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2 text-[length:var(--text-meta)] ci-muted">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <i key={l} aria-hidden className="tk-heat-swatch" data-level={l} />
        ))}
        <span>More</span>
        <span className="ml-auto">target {study.format(goal)} a day</span>
      </div>
    </div>
  );
}

export default StudyMap;
