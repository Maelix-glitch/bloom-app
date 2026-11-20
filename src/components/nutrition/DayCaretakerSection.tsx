/**
 * Your whole day (M-162; composed in M-164) — the plan's
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
 * M-164 — the composition. The first build stated all of this as
 * stacked paragraphs and read like a document (the owner's word).
 * The facts are unchanged; the form is now a composed surface:
 * the day's rhythm as one 24-hour line read from the wake time —
 * the night as a quiet band at its end, a marker for each moment
 * the caretaker names, decoded by a legend in day order — the
 * sleep window and the movement target as composed figures, and
 * Tonight as two designed lists. A moment the plan gives no
 * clock to (a largest meal on a relative day) has no marker:
 * absence, never an invented position.
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

type RhythmKind = "meal" | "caffeine" | "lastmeal" | "winddown";

interface RhythmMarker {
  kind: RhythmKind;
  /** Place on the wake-origin 24-hour line, 0–100. */
  pct: number;
  /** The legend's name for the moment. */
  name: string;
  /** The moment's clock, in the page's reading. */
  time: string;
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

  /* The rhythm line's geometry: the day read from the wake time,
     so the sleep window is one band at the line's end and every
     marker's place is the derivation's own clock arithmetic. */
  const wakeMin = clockToMinutes(care.wakeTime);
  const pctOf = (hhmm: string): number => {
    const offset = (((clockToMinutes(hhmm) - wakeMin) % 1440) + 1440) % 1440;
    return (offset / 1440) * 100;
  };
  const bedPct = pctOf(care.bedTime);

  const markers: RhythmMarker[] = [];
  if (care.largestMeal?.time) {
    markers.push({
      kind: "meal",
      pct: pctOf(care.largestMeal.time),
      name: `${care.largestMeal.label} · walk after`,
      time: clock(care.largestMeal.time),
    });
  }
  markers.push(
    {
      kind: "caffeine",
      pct: pctOf(care.caffeineCutoff),
      name: "Caffeine ends",
      time: clock(care.caffeineCutoff),
    },
    {
      kind: "lastmeal",
      pct: pctOf(care.lastMealEndsBy),
      name: "Last meal by",
      time: clock(care.lastMealEndsBy),
    },
    {
      kind: "winddown",
      pct: pctOf(care.windDownTime),
      name: "Wind-down",
      time: clock(care.windDownTime),
    },
  );
  markers.sort((a, b) => a.pct - b.pct);

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

      <div className="nut-care-rhythm">
        <p className="nut-group-label">The day&rsquo;s rhythm</p>
        <div className="nut-care-rhythm__track" aria-hidden="true">
          <div className="nut-care-rhythm__night" style={{ left: `${bedPct}%` }} />
          {markers.map((m) => (
            <span
              key={m.kind}
              className="nut-care-rhythm__dot"
              data-kind={m.kind}
              style={{ left: `${m.pct}%` }}
            />
          ))}
          <span className="nut-care-rhythm__dot" data-kind="bed" style={{ left: `${bedPct}%` }} />
        </div>
        <ul className="nut-care-rhythm__legend">
          <li>
            <span className="nut-care-rhythm__swatch" data-kind="wake" aria-hidden="true" />
            <span>Up</span>
            <span className="nut-care-rhythm__time">{clock(care.wakeTime)}</span>
          </li>
          {markers.map((m) => (
            <li key={m.kind}>
              <span className="nut-care-rhythm__swatch" data-kind={m.kind} aria-hidden="true" />
              <span>{m.name}</span>
              <span className="nut-care-rhythm__time">{m.time}</span>
            </li>
          ))}
          <li>
            <span className="nut-care-rhythm__swatch" data-kind="bed" aria-hidden="true" />
            <span>In bed</span>
            <span className="nut-care-rhythm__time">{clock(care.bedTime)}</span>
          </li>
        </ul>
      </div>

      <div className="mt-6">
        <p className="nut-group-label">Sleep</p>
        <div className="nut-care-figures">
          <div className="nut-care-figure" data-care="bedtime">
            <span className="nut-care-figure__label">In bed by</span>
            <span className="nut-care-figure__value">{clock(care.bedTime)}</span>
          </div>
          <div className="nut-care-figure nut-care-figure--span" data-care="sleep-duration">
            <span className="nut-care-figure__rule" aria-hidden="true" />
            <span className="nut-care-figure__value nut-care-figure__value--span">
              {durationText(care.sleepMinutes)}
            </span>
          </div>
          <div className="nut-care-figure nut-care-figure--end" data-care="wake">
            <label htmlFor="day-rhythm-wake" className="nut-care-figure__label">
              Up at
            </label>
            <span className="nut-care-figure__value">{clock(care.wakeTime)}</span>
          </div>
        </div>
        <div className="nut-care-wake">
          <input
            id="day-rhythm-wake"
            type="time"
            value={care.wakeTime}
            onChange={(e) => onWakeChange(e.target.value)}
            aria-label="Wake time"
            className="rounded-lg border border-border bg-surface-2/40 px-2 py-1 text-sm tabular-nums text-foreground"
          />
          <span className="text-[length:var(--text-meta)] text-muted-foreground">
            Bedtime follows your sleep target in Trackers.
          </span>
        </div>
      </div>

      <div className="mt-6">
        <p className="nut-group-label">Movement</p>
        <div className="nut-care-move">
          <div className="nut-care-figure" data-care="movement-target">
            <span className="nut-care-figure__label">Your target · in the day</span>
            <span className="nut-care-figure__value">{durationText(care.movementMinutes)}</span>
          </div>
          {care.largestMeal ? (
            <p className="nut-note nut-care-move__line">
              The day&rsquo;s largest meal is {care.largestMeal.label}
              {care.largestMeal.time ? <> (~{clock(care.largestMeal.time)})</> : null}. A walk after
              it covers the target in one go.
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-6">
        <p className="nut-group-label">Tonight</p>
        <div className="nut-care-tonight">
          <div>
            <p className="nut-group-label">Do</p>
            <ul className="nut-care-list">
              <li>
                From {clock(care.windDownTime)} — screens dim, then off. Your screen target for the
                day is {durationText(care.screenMinutes)}.
              </li>
              <li>The room dark and cool; the morning&rsquo;s clothes and bag laid out ready.</li>
            </ul>
          </div>
          <div>
            <p className="nut-group-label">Avoid</p>
            <ul className="nut-care-list nut-care-list--avoid">
              <li>Caffeine after {clock(care.caffeineCutoff)}.</li>
              <li>Screens in the last hour before bed.</li>
              <li>{lastMealLine(care)}</li>
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
