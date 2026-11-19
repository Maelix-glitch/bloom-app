/**
 * RecordBlock — the part that says "this is a tracker's profile".
 *
 *   · four numbers (days logged, streak, this week, points)
 *   · a twelve-week grid, one cell per day, brighter the fuller the day
 *   · what is being tracked right now, as tappable chips
 *
 * Every figure comes from the same records the rest of the app holds — the
 * profile never keeps its own copy.
 */

import { Link } from "@tanstack/react-router";
import { CalendarDays, Flame, Sparkles, Trophy } from "lucide-react";

import { CountUp } from "@/components/mood/primitives";
import { fmtCount, fmtDate } from "@/lib/format";
import { rankFor } from "@/lib/progression/ranks";
import { cn } from "@/lib/utils";
import {
  RECORD_WEEKS,
  type RecordDay,
  type RecordTotals,
  type TrackedThing,
} from "@/lib/profile/record";

const DAY_LABELS = ["M", "", "W", "", "F", "", "S"];

const levelOf = (count: number): 0 | 1 | 2 | 3 | 4 =>
  count <= 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : count <= 5 ? 3 : 4;

const THING_COLOR: Record<TrackedThing["tone"], string> = {
  tracker: "var(--pf-src-trackers)",
  mood: "var(--pf-src-mood)",
  habits: "var(--pf-src-habits)",
  cycle: "var(--pf-src-cycle)",
};

function fmtDay(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function RecordNumbers({
  totals,
  points,
  loading,
}: {
  totals: RecordTotals | null;
  /**
   * The points balance — the SAME figure the TopBar pill and the rank
   * pill show (useHabits' ledger total), passed in rather than derived
   * here, so the number can never disagree with itself across the app.
   * A tile's sub-line may only elaborate the tile's own metric: the
   * points tile's sub is progress to the next rank, nothing else.
   */
  points: number | null;
  loading: boolean;
}) {
  const rankState = points !== null ? rankFor(points) : null;
  const tiles: {
    key: string;
    value: number;
    suffix?: string;
    label: string;
    sub: string;
    icon: typeof Flame;
    to: string;
  }[] = [
    {
      key: "days",
      value: totals?.daysLogged ?? 0,
      label: "Days logged",
      sub: totals?.firstDay ? `since ${fmtDate(totals.firstDay)}` : "anything counts",
      icon: CalendarDays,
      to: "/trackers",
    },
    {
      key: "streak",
      value: totals?.streak ?? 0,
      label: "Day streak",
      /* No sub until the totals exist: "your best yet" is a claim about
         the record, and the tile may not state it before the record has
         settled — the week and points tiles already hold their subs
         empty in that window; the streak tile now does the same. */
      sub: !totals
        ? ""
        : totals.bestStreak > totals.streak
          ? `best ${totals.bestStreak}`
          : "your best yet",
      icon: Flame,
      to: "/",
    },
    {
      key: "week",
      value: totals?.last7 ?? 0,
      suffix: " of 7",
      label: "Of last 7 days",
      sub: totals ? `${fmtCount(totals.last30)} of the last 30 days` : "",
      icon: Sparkles,
      to: "/mood",
    },
    {
      key: "points",
      value: points ?? 0,
      label: "Points",
      sub: rankState ? `${Math.round(rankState.progress * 100)}% to ${rankState.next.name}` : "",
      icon: Trophy,
      to: "/rewards",
    },
  ];
  return (
    <div className="pf-numbers pf-rise pf-rise-1" aria-label="Your record in numbers">
      {tiles.map((t) => {
        const Icon = t.icon;
        return (
          <Link key={t.key} to={t.to} className="pf-number" data-testid={`pf-number-${t.key}`}>
            <span className="flex items-center justify-between">
              <span className="pf-number-label">{t.label}</span>
              <Icon className="size-3.5 text-faint" aria-hidden />
            </span>
            <span
              className={cn(
                "pf-number-value",
                (loading || t.value === 0) && "pf-number-value--zero",
              )}
            >
              {loading ? (
                <>
                  {/* A shaped block in the number's own space — first paint
                      should read as "the number is coming", never as a
                      stray bullet character where the number will be. */}
                  <span className="pf-skel pf-number-skel" aria-hidden />
                  <span className="sr-only">Loading</span>
                </>
              ) : (
                <>
                  <CountUp value={t.value} decimals={0} />
                  {t.suffix ? <span className="pf-number-suffix">{t.suffix}</span> : null}
                </>
              )}
            </span>
            {t.sub ? <span className="pf-number-sub">{t.sub}</span> : null}
          </Link>
        );
      })}
    </div>
  );
}

export function RecordGrid({
  days,
  today,
  onSelectDay,
}: {
  days: RecordDay[];
  today: string;
  onSelectDay?: ((date: string) => void) | undefined;
}) {
  const weeks = Math.round(days.length / 7) || RECORD_WEEKS;
  /* month labels where a month begins, positioned by week column */
  const months: { col: number; label: string }[] = [];
  days.forEach((d, i) => {
    if (i % 7 !== 0) return;
    const col = i / 7;
    const dt = new Date(`${d.date}T12:00:00`);
    const label = dt.toLocaleDateString(undefined, { month: "short" });
    const prev = months[months.length - 1];
    if (!prev || prev.label !== label) months.push({ col, label });
  });
  const logged = days.filter((d) => d.count > 0).length;

  return (
    <div>
      <div className="pf-grid-wrap">
        <div className="pf-grid-days" aria-hidden>
          {DAY_LABELS.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
        <div className="min-w-0">
          <div
            className="pf-grid-months"
            style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }}
            aria-hidden
          >
            {months.map((m) => (
              <span key={`${m.col}-${m.label}`} style={{ gridColumnStart: m.col + 1 }}>
                {m.label}
              </span>
            ))}
          </div>
          <div
            className="pf-grid"
            style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }}
            role={onSelectDay ? "group" : "img"}
            aria-label={`Last ${weeks} weeks: ${logged} days with something logged.${
              onSelectDay ? " Tap a day to open it." : ""
            }`}
          >
            {days.map((d) => {
              const future = d.date > today;
              const title = future
                ? fmtDay(d.date)
                : d.count === 0
                  ? `${fmtDay(d.date)} · nothing logged`
                  : `${fmtDay(d.date)} · ${d.count} logged (${d.sources.join(", ")})`;
              if (onSelectDay && !future) {
                return (
                  <button
                    key={d.date}
                    type="button"
                    className="pf-cell"
                    data-level={levelOf(d.count)}
                    data-today={d.date === today}
                    title={title}
                    aria-label={title}
                    onClick={() => onSelectDay(d.date)}
                  />
                );
              }
              return (
                <span
                  key={d.date}
                  className="pf-cell"
                  data-level={future ? 0 : levelOf(d.count)}
                  data-today={d.date === today}
                  data-future={future}
                  title={title}
                />
              );
            })}
          </div>
        </div>
      </div>
      <div className="pf-grid-legend">
        {/* The count lives in the card header above (one window, stated
            once); the legend carries only the colour scale. The grid's
            aria-label above still speaks the count for screen readers. */}
        <span className="pf-grid-legend-scale" aria-hidden>
          less
          {[0, 1, 2, 3, 4].map((l) => (
            <i key={l} className="pf-cell" data-level={l} style={{ width: 11, height: 11 }} />
          ))}
          more
        </span>
      </div>
    </div>
  );
}

export function TrackedThings({ things }: { things: TrackedThing[] }) {
  if (things.length === 0) return null;
  return (
    <div className="pf-things">
      {things.map((t) => (
        <Link
          key={t.id}
          to={t.to}
          className="pf-thing"
          data-on={t.on}
          style={{ ["--pf-thing-color" as string]: THING_COLOR[t.tone] } as React.CSSProperties}
        >
          <span className="pf-thing-dot" aria-hidden />
          <span className="min-w-0">
            <span className="pf-thing-label">{t.label}</span>
            <span className="pf-thing-detail">{t.detail}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
