/**
 * Your whole day (M-162; presentation rebuilt M-196) — the plan's
 * caretaker section.
 *
 * The food plan covers the meals; this section covers the day
 * around them, the way a careful dietitian would: a set sleep
 * window, the movement target placed in the day, and the evening's
 * do / avoid lines. It renders ONLY what the derivation in
 * lib/nutrition/dayRhythm computes from three sources the person
 * already gave Bloom — the Trackers goals (read through the
 * trackers' own hook, the same read the Trackers page makes), the
 * wake-time preference, and the composed plan's own meals and
 * timeline — plus the evening's general care windows, which the
 * lib names as constants. It invents no number, makes no medical
 * claim, and changes nothing: the wake-time row writes the
 * preference and nothing else — no plan is regenerated, nothing
 * goes stale, the composer never hears about it.
 *
 * M-196 (owner directive 2026-11-21): the stacked document rows
 * read "like a MS Word document or a form". The section is now a
 * designed day-rhythm composition: a 24-hour ribbon with the day's
 * moments placed on it and the sleep window shaded, sleep as
 * three Fraunces figures with air, and Tonight as two calm lists.
 * Every fact and sentence is byte-identical to the M-162 text —
 * only the composition changed.
 *
 * Placement: its own section in the §7.1 flow, immediately after
 * the day card that holds "How this plan is built" and before
 * "Today's balance" — beside the disclosure that explains the
 * food, this explains the day. Every relative order the shell
 * guard pins (header → water → day → balance → adjusted) stands.
 */

import { useMemo } from "react";

import { useTrackers } from "@/hooks/useTrackers";
import { setPref } from "@/lib/prefs";
import { usePrefValue } from "@/lib/prefsStore";
import { formatClock } from "@/lib/smart/usual";
import {
  DAY_RHYTHM_KEY,
  DEFAULT_DAY_RHYTHM,
  clockToMinutes,
  dayCaretakerOf,
  durationText,
  isClockTime,
  parseDayRhythm,
  type DayCaretaker,
} from "@/lib/nutrition/dayRhythm";
import type { DailyPlan } from "@/lib/nutrition/plan";
import { IconActivity, IconCheck, IconMoon } from "@/components/profile/SettingsIcons";

/** A "HH:MM" clock in the page's own reading ("10:30 PM"). */
const clock = (hhmm: string): string => formatClock(clockToMinutes(hhmm));

/** The Avoid list's last-meal line, worded by the derivation's own
 *  verdict — checked against the plan's clock when the plan has
 *  one, stated against the bedtime alone when it does not. */
function lastMealLine(care: DayCaretaker): string {
  if (care.lastMeal?.time && care.lastMealInsideWindow === true) {
    return `${care.lastMeal.label} at ${clock(care.lastMeal.time)} sits inside the last two hours before bed — on a day you can, bring the last meal earlier.`;
  }
  if (care.lastMeal?.time && care.lastMealInsideWindow === false) {
    return `A heavy meal in the last two hours — ${care.lastMeal.label} at ${clock(care.lastMeal.time)} already sits outside them.`;
  }
  return `A heavy meal in the last two hours before bed — with bed at ${clock(care.bedTime)}, the last meal wants to end by ${clock(care.lastMealEndsBy)}.`;
}

/** A moment's place on the 24-hour ribbon, as a percentage. */
const pct = (hhmm: string): number => (clockToMinutes(hhmm) / 1440) * 100;

export function DayCaretakerSection({ plan }: { plan: DailyPlan }) {
  const rhythm = usePrefValue(DAY_RHYTHM_KEY, parseDayRhythm, DEFAULT_DAY_RHYTHM);
  const { goals } = useTrackers();

  const care = useMemo(
    () =>
      dayCaretakerOf({
        wakeTime: rhythm.wakeTime,
        sleepGoalMinutes: goals.sleepMinutes,
        movementGoalMinutes: goals.movementMinutes,
        screenGoalMinutes: goals.screenMinutes,
        meals: plan.meals,
        timeline: plan.timeline,
      }),
    [rhythm.wakeTime, goals, plan.meals, plan.timeline],
  );

  const onWakeChange = (value: string) => {
    if (isClockTime(value)) setPref(DAY_RHYTHM_KEY, { wakeTime: value });
  };

  /* The ribbon's moments, in the day's own order. The largest
     meal's walk rides the meal's clock when the plan carries one. */
  const moments: { time: string; name: string }[] = [
    { time: care.wakeTime, name: "Up" },
    { time: care.caffeineCutoff, name: "Caffeine ends" },
    ...(care.largestMeal?.time
      ? [{ time: care.largestMeal.time, name: `Walk after ${care.largestMeal.label}` }]
      : []),
    { time: care.lastMealEndsBy, name: "Last meal by" },
    { time: care.windDownTime, name: "Wind-down" },
    { time: care.bedTime, name: "In bed" },
  ].sort((a, b) => clockToMinutes(a.time) - clockToMinutes(b.time));

  /* The shaded sleep window on the ribbon: bed → wake, wrapping
     past midnight when bed is the evening side (the normal case). */
  const bedPct = pct(care.bedTime);
  const wakePct = pct(care.wakeTime);
  const sleepSegments =
    bedPct >= wakePct
      ? [
          { left: bedPct, width: 100 - bedPct },
          { left: 0, width: wakePct },
        ]
      : [{ left: bedPct, width: wakePct - bedPct }];

  return (
    <section className="nut-card nut-rise section nut-care" aria-label="Your whole day">
      <div className="section-head">
        <div className="section-head__main">
          <h2 className="section-head__title">Your whole day</h2>
        </div>
      </div>
      <p className="nut-note">
        Sleep, movement and the evening — set from the same numbers as your plan.
      </p>

      {/* The day on one ribbon — the composition the facts hang on.
          Decorative: every moment is also stated in words below. */}
      <div className="nut-care-ribbon" aria-hidden="true">
        <div className="nut-care-ribbon-track">
          {sleepSegments.map((s, i) => (
            <span
              key={i}
              className="nut-care-ribbon-sleep"
              style={{ left: `${s.left}%`, width: `${s.width}%` }}
            />
          ))}
          {moments.map((m) => (
            <span
              key={`${m.time}-${m.name}`}
              className="nut-care-ribbon-dot"
              style={{ left: `${pct(m.time)}%` }}
            />
          ))}
        </div>
        <div className="nut-care-ribbon-labels">
          {moments.map((m) => (
            <span key={`${m.time}-${m.name}`} className="nut-care-ribbon-label">
              <span className="nut-care-ribbon-time">{clock(m.time)}</span> {m.name}
            </span>
          ))}
        </div>
      </div>

      <div className="nut-care-block">
        <p className="nut-care-kicker">
          <IconMoon className="nut-care-kicker-icon" /> Sleep
        </p>
        <p className="nut-care-figures">
          <span className="nut-care-fig">
            <span className="nut-care-fig-label">In bed by</span>{" "}
            <span className="nut-care-fig-value">{clock(care.bedTime)}</span>
          </span>
          <span className="nut-care-sep" aria-hidden="true">
            {" "}
            ·{" "}
          </span>
          <span className="nut-care-fig">
            <span className="nut-care-fig-label">Up at</span>{" "}
            <span className="nut-care-fig-value">{clock(care.wakeTime)}</span>
          </span>
          <span className="nut-care-sep" aria-hidden="true">
            {" "}
            ·{" "}
          </span>
          <span className="nut-care-fig">
            <span className="nut-care-fig-value">{durationText(care.sleepMinutes)}.</span>
          </span>
        </p>
        <div className="nut-care-wake">
          <label
            htmlFor="day-rhythm-wake"
            className="text-[length:var(--text-meta)] text-muted-foreground"
          >
            Up at
          </label>
          <input
            id="day-rhythm-wake"
            type="time"
            value={care.wakeTime}
            onChange={(e) => onWakeChange(e.target.value)}
            className="rounded-lg border border-border bg-surface-2/40 px-2 py-1 text-sm tabular-nums text-foreground"
          />
          <span className="text-[length:var(--text-meta)] text-muted-foreground">
            Bedtime follows your sleep target in Trackers.
          </span>
        </div>
      </div>

      <div className="nut-care-block">
        <p className="nut-care-kicker">
          <IconActivity className="nut-care-kicker-icon" /> Movement
        </p>
        <p className="nut-note">
          Your movement target is {durationText(care.movementMinutes)} in the day.
          {care.largestMeal ? (
            <>
              {" "}
              The day&rsquo;s largest meal is {care.largestMeal.label}
              {care.largestMeal.time ? <> (~{clock(care.largestMeal.time)})</> : null}. A walk after
              it covers the target in one go.
            </>
          ) : null}
        </p>
      </div>

      <div className="nut-care-block">
        <p className="nut-care-kicker">
          <IconMoon className="nut-care-kicker-icon" /> Tonight
        </p>
        <div className="nut-care-cols">
          <div>
            <p className="nut-care-col-title">Do</p>
            <ul className="nut-care-list2">
              <li>
                <IconCheck className="nut-care-list-icon is-do" />
                <span>
                  From {clock(care.windDownTime)} — screens dim, then off. Your screen target for
                  the day is {durationText(care.screenMinutes)}.
                </span>
              </li>
              <li>
                <IconCheck className="nut-care-list-icon is-do" />
                <span>The room dark and cool; the morning&rsquo;s clothes and bag laid out ready.</span>
              </li>
            </ul>
          </div>
          <div>
            <p className="nut-care-col-title">Avoid</p>
            <ul className="nut-care-list2">
              <li>
                <span className="nut-care-avoid-mark" aria-hidden="true" />
                <span>Caffeine after {clock(care.caffeineCutoff)}.</span>
              </li>
              <li>
                <span className="nut-care-avoid-mark" aria-hidden="true" />
                <span>Screens in the last hour before bed.</span>
              </li>
              <li>
                <span className="nut-care-avoid-mark" aria-hidden="true" />
                <span>{lastMealLine(care)}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <p className="nut-note">
        General care for the day&rsquo;s rhythm, from your own numbers — not medical advice.
      </p>
    </section>
  );
}
