/**
 * Your whole day (M-162) — the plan's caretaker section.
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

  return (
    <section className="nut-card nut-rise section" aria-label="Your whole day">
      <div className="section-head">
        <div className="section-head__main">
          <h2 className="section-head__title">Your whole day</h2>
        </div>
      </div>
      <p className="nut-note">
        Sleep, movement and the evening — set from the same numbers as your plan.
      </p>

      <div className="mt-5">
        <p className="nut-group-label">Sleep</p>
        <p className="nut-note">
          In bed by {clock(care.bedTime)} · Up at {clock(care.wakeTime)} ·{" "}
          {durationText(care.sleepMinutes)}.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
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

      <div className="mt-5">
        <p className="nut-group-label">Movement</p>
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

      <div className="mt-5">
        <p className="nut-group-label">Tonight</p>
        <p className="nut-group-label mt-3">Do</p>
        <ul className="nut-care-list">
          <li>
            From {clock(care.windDownTime)} — screens dim, then off. Your screen target for the day
            is {durationText(care.screenMinutes)}.
          </li>
          <li>The room dark and cool; the morning&rsquo;s clothes and bag laid out ready.</li>
        </ul>
        <p className="nut-group-label mt-3">Avoid</p>
        <ul className="nut-care-list">
          <li>Caffeine after {clock(care.caffeineCutoff)}.</li>
          <li>Screens in the last hour before bed.</li>
          <li>{lastMealLine(care)}</li>
        </ul>
      </div>

      <p className="nut-note">
        General care for the day&rsquo;s rhythm, from your own numbers — not medical advice.
      </p>
    </section>
  );
}
