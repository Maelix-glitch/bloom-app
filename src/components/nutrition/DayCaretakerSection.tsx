/**
 * Your whole day (M-162; presentation rebuilt M-196, then M-198) —
 * the plan's caretaker section.
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
 * read "like a MS Word document or a form"; the section became a
 * 24-hour ribbon composition. Every fact and sentence stayed
 * byte-identical to the M-162 text.
 *
 * M-198 (owner directive 2026-11-21): the ribbon is retired for
 * the DAY ARC — the owner reviewed a preview of the day drawn as
 * one sun-path arc and approved it ("this is cool fix this"), and
 * this composition ports that preview exact: the arc (gold waking
 * hours deepening through dusk into a sage sleep valley, horizon
 * glow, draw-in), six moment medallions riding it, a "You are
 * here" marker placed from the real current time, sleep as three
 * Fraunces figures, and Tonight as two calm tonal zones. Node
 * positions are computed from each moment's real time by the pure
 * geometry in lib/nutrition/dayArc — nothing is hard-coded to one
 * person's day. Every fact and sentence remains byte-identical —
 * only the composition changed.
 *
 * M-199 (live-sweep fixes, 2026-11-21): the walk medallion the
 * preview showed was missing live whenever the plan gave the
 * largest meal no clock — the node now rides by SEQUENCE in
 * that case (after the peak, before Caffeine ends; its caption
 * names the order and claims no hour), and the "You are here"
 * label's placement is the geometry's rule, so it can no longer
 * strike through the Wind-down medallion as it did live at
 * ~22:13. Facts and sentences still byte-identical.
 *
 * Placement: its own section in the §7.1 flow, immediately after
 * the day card that holds "How this plan is built" and before
 * "Today's balance" — beside the disclosure that explains the
 * food, this explains the day. Every relative order the shell
 * guard pins (header → water → day → balance → adjusted) stands.
 */

import { useEffect, useMemo, useState, type ReactNode } from "react";

import { SectionHead } from "@/components/ui/SectionHead";
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
import {
  ARC_DAY_START_X,
  ARC_PATH_D,
  ARC_VALLEY_X,
  ARC_VIEW_H,
  ARC_VIEW_W,
  arcAnchorsFromRawXs,
  arcAwakeFraction,
  arcDroppedLabelRectOf,
  arcFrameOf,
  arcNowLabelPlacementOf,
  arcPointForTime,
  arcSequenceRawX,
  arcXForFraction,
  arcYAtX,
} from "@/lib/nutrition/dayArc";
import type { DailyPlan } from "@/lib/nutrition/plan";
import { IconCheck, IconMoon } from "@/components/profile/SettingsIcons";

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

/* --------------------- the medallions' drawn glyphs --------------------- */
/* One 24px grid, one 1.7 stroke, rounded caps — the preview's own
   drawings, ported as they were approved. */

function ArcGlyph({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

const IconSunrise = () => (
  <ArcGlyph>
    <path d="M4 18h16" />
    <path d="M7 18a5 5 0 0 1 10 0" />
    <path d="M12 8V5.5M5.8 10.5 4.4 9.1M18.2 10.5l1.4-1.4" />
    <path d="M2.5 21h19" opacity="0.55" />
  </ArcGlyph>
);

const IconFootsteps = () => (
  <ArcGlyph>
    <ellipse cx="9" cy="6.4" rx="2.1" ry="3.1" transform="rotate(-18 9 6.4)" />
    <ellipse cx="15.6" cy="12" rx="2.1" ry="3.1" transform="rotate(-18 15.6 12)" />
    <ellipse cx="8.2" cy="16.6" rx="2.1" ry="3.1" transform="rotate(-18 8.2 16.6)" opacity="0.55" />
  </ArcGlyph>
);

const IconCup = () => (
  <ArcGlyph>
    <path d="M5 10h11v5.5A4.5 4.5 0 0 1 11.5 20h-2A4.5 4.5 0 0 1 5 15.5V10Z" />
    <path d="M16 11h1.4a2.9 2.9 0 0 1 0 5.8H16" />
    <path d="M8.2 6.6c0-1 .8-1.1.8-2.1M12 6.6c0-1 .8-1.1.8-2.1" opacity="0.7" />
  </ArcGlyph>
);

const IconPlate = () => (
  <ArcGlyph>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="4.4" opacity="0.65" />
  </ArcGlyph>
);

const IconCrescent = () => (
  <ArcGlyph>
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5Z" />
  </ArcGlyph>
);

const IconBed = () => (
  <ArcGlyph>
    <path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6" />
    <path d="M3 18h18M3 21v-3M21 21v-3" />
    <path d="M6 10V8.5A1.5 1.5 0 0 1 7.5 7h3A1.5 1.5 0 0 1 12 8.5V10" />
    <path d="M17.2 3.4a3.4 3.4 0 1 0 3.4 4.8 2.7 2.7 0 0 1-3.4-4.8Z" opacity="0.75" />
  </ArcGlyph>
);

/* --------------------------------- moments -------------------------------- */

interface ArcMoment {
  key: string;
  /** The moment's clock, minutes since midnight — or null for
   *  the one moment the day may state in order rather than on
   *  the clock: the walk after a largest meal the plan gives no
   *  time. A null moment is placed by sequence (M-199), and its
   *  caption names the order, never an hour. */
  minutes: number | null;
  /** The caption's time line, in the page's own reading. */
  timeLabel: string;
  /** The caption's name line. */
  name: string;
  icon: ReactNode;
  /** A night-side moment: its medallion takes the sage rim. */
  sleep?: boolean;
  /** The wind-down: at phone width its caption steps aside so it
   *  never collides with the In bed caption (the preview's own
   *  staggering solution). */
  stagger?: boolean;
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

  /* The arc's frame and moments, from the caretaker's own times.
     The walk rides the largest meal's clock when the plan carries
     one; when it does not, the node is placed by sequence — after
     the midday peak, before Caffeine ends — and its caption claims
     no hour: the day states the walk in order, so the arc draws it
     in order (M-199; the preview the owner approved shows the walk
     medallion either way). */
  const frame = useMemo(
    () => arcFrameOf(clockToMinutes(care.wakeTime), clockToMinutes(care.bedTime)),
    [care.wakeTime, care.bedTime],
  );

  const moments: ArcMoment[] = [
    {
      key: "up",
      minutes: clockToMinutes(care.wakeTime),
      timeLabel: clock(care.wakeTime),
      name: "Up",
      icon: <IconSunrise />,
    },
    ...(care.largestMeal
      ? [
          {
            key: "walk",
            minutes: care.largestMeal.time ? clockToMinutes(care.largestMeal.time) : null,
            timeLabel: `After ${care.largestMeal.label}`,
            name: `Walk · ${care.movementMinutes} min`,
            icon: <IconFootsteps />,
          } satisfies ArcMoment,
        ]
      : []),
    {
      key: "caffeine",
      minutes: clockToMinutes(care.caffeineCutoff),
      timeLabel: clock(care.caffeineCutoff),
      name: "Caffeine ends",
      icon: <IconCup />,
    },
    {
      key: "lastMeal",
      minutes: clockToMinutes(care.lastMealEndsBy),
      timeLabel: clock(care.lastMealEndsBy),
      name: "Last meal by",
      icon: <IconPlate />,
    },
    {
      key: "windDown",
      minutes: clockToMinutes(care.windDownTime),
      timeLabel: clock(care.windDownTime),
      name: "Wind-down",
      icon: <IconCrescent />,
      sleep: true,
      stagger: true,
    },
    {
      key: "bed",
      minutes: clockToMinutes(care.bedTime),
      timeLabel: clock(care.bedTime),
      name: "In bed",
      icon: <IconBed />,
      sleep: true,
    },
  ];

  /* Placement: each timed moment's raw x from its time; the
     sequence moment (a clock-less walk) takes its raw x from its
     day-order neighbours by the geometry's sequence rule. The
     set is then put in raw-x order and relaxed as one — the
     same relaxation the timed set has always ridden — and the
     now marker warps through these very anchors. */
  const { anchors, ordered } = useMemo(() => {
    const raws = moments.map((m) =>
      m.minutes != null ? arcXForFraction(arcAwakeFraction(m.minutes, frame)) : Number.NaN,
    );
    moments.forEach((m, i) => {
      if (m.minutes == null) {
        raws[i] = arcSequenceRawX(raws[i - 1] ?? ARC_DAY_START_X, raws[i + 1] ?? ARC_VALLEY_X);
      }
    });
    const order = moments.map((_, i) => i).sort((a, b) => raws[a]! - raws[b]!);
    return {
      anchors: arcAnchorsFromRawXs(order.map((i) => raws[i]!)),
      ordered: order.map((i) => moments[i]!),
    };
    // moments is rebuilt from care + frame each render; its inputs
    // are the memoised care and frame, so keying on them is exact.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [care, frame]);

  /* "You are here" — the real current local time, placed on the
     same geometry (warped through the nodes' own relaxation, so
     it keeps the neighbours its time says it should). Display
     only; it refreshes on the house's minute tick. */
  const [nowMinutes, setNowMinutes] = useState(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setNowMinutes(d.getHours() * 60 + d.getMinutes());
    };
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);
  const nowPoint = arcPointForTime(nowMinutes, frame, anchors);

  /* The label's placement is the geometry's rule (M-199): the
     home placement stands while the arc around the marker is
     clear; when a medallion or a caption crowds it, the label
     moves — never over either. The dropped level's height is
     solved from the nodes around the marker, so the component
     hands the label its exact offset in that case. */
  const nodePoints = ordered.map((_, i) => {
    const x = anchors.placed[i]!;
    return { x, y: arcYAtX(x) };
  });
  const nowPlacement = arcNowLabelPlacementOf(nowPoint, nodePoints);
  const nowLabelStyle =
    nowPlacement.level === "dropped"
      ? (() => {
          const rect = arcDroppedLabelRectOf(nowPoint, nodePoints);
          /* The label is positioned inside the marker's box (a
             13-unit dot centred on the point): convert the
             solved arc rect into that box's offsets. */
          return {
            left: rect.x0 - nowPoint.x + 6.5,
            top: rect.y0 - nowPoint.y + 6.5,
            right: "auto" as const,
            bottom: "auto" as const,
          };
        })()
      : undefined;

  const pctX = (x: number): string => `${(x / ARC_VIEW_W) * 100}%`;
  const pctY = (y: number): string => `${(y / ARC_VIEW_H) * 100}%`;

  return (
    <section className="nut-card nut-rise section nut-care" aria-label="Your whole day">
      <SectionHead title="Your whole day" />
      <p className="nut-note">
        Sleep, movement and the evening — set from the same numbers as your plan.
      </p>

      {/* The day as one arc — the composition the facts hang on.
          Decorative: every moment is also stated in words below. */}
      <div className="nut-care-arc-wrap" aria-hidden="true">
        <div className="nut-care-arc">
          <svg
            className="nut-care-arc-svg"
            viewBox={`0 0 ${ARC_VIEW_W} ${ARC_VIEW_H}`}
            focusable="false"
          >
            <defs>
              <linearGradient id="nutCareArcGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" style={{ stopColor: "var(--arc-stop-dawn)" }} />
                <stop offset="0.42" style={{ stopColor: "var(--arc-stop-morning)" }} />
                <stop offset="0.62" style={{ stopColor: "var(--arc-stop-dusk)" }} />
                <stop offset="0.78" style={{ stopColor: "var(--arc-stop-evening)" }} />
                <stop offset="0.92" style={{ stopColor: "var(--arc-stop-night)" }} />
                <stop offset="1" style={{ stopColor: "var(--arc-stop-night)" }} />
              </linearGradient>
              <radialGradient id="nutCareGlow" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0" style={{ stopColor: "var(--arc-stop-dawn)", stopOpacity: 0.16 }} />
                <stop offset="1" style={{ stopColor: "var(--arc-stop-dawn)", stopOpacity: 0 }} />
              </radialGradient>
              <radialGradient id="nutCareNightGlow" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0" style={{ stopColor: "var(--arc-stop-night)", stopOpacity: 0.12 }} />
                <stop offset="1" style={{ stopColor: "var(--arc-stop-night)", stopOpacity: 0 }} />
              </radialGradient>
            </defs>
            {/* horizon glow under the midday peak, and a hush of
                sage in the sleep valley */}
            <ellipse cx="380" cy="84" rx="300" ry="86" fill="url(#nutCareGlow)" />
            <ellipse cx="810" cy="234" rx="130" ry="60" fill="url(#nutCareNightGlow)" />
            {/* the full journey, faintly, beneath the drawn line */}
            <path className="nut-care-arc-track" pathLength={100} d={ARC_PATH_D} />
            <path className="nut-care-arc-path" pathLength={100} d={ARC_PATH_D} />
          </svg>

          {ordered.map((m, i) => {
            const x = anchors.placed[i]!;
            const y = arcYAtX(x);
            return (
              <div
                key={m.key}
                data-arc-node={m.key}
                className={[
                  "nut-care-node",
                  m.sleep ? "is-sleep" : "",
                  m.stagger ? "is-stagger" : "",
                  i === 0 ? "is-first" : "",
                  i === ordered.length - 1 ? "is-last" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{
                  left: pctX(x),
                  top: pctY(y),
                  animationDelay: `${0.3 + i * 0.25}s`,
                }}
              >
                <span className="nut-care-medallion">{m.icon}</span>
                <span className="nut-care-node-cap">
                  <span className="nut-care-node-time">{m.timeLabel}</span>
                  <span className="nut-care-node-label">{m.name}</span>
                </span>
              </div>
            );
          })}

          {/* You are here: the current time, on the same arc. Its
              label's side and level are the geometry's placement
              (M-199) — it flips, drops below the arc, raises or
              lifts as the moments around it require, and in the
              wedged case rests on the valley floor at the solved
              offset — so it never covers a medallion or a caption
              and never leaves the frame. */}
          <div
            data-arc-now
            className={[
              "nut-care-here",
              nowPlacement.side === "left" ? "is-flip" : "",
              nowPlacement.level === "below" ? "is-below" : "",
              nowPlacement.level === "raised" ? "is-raised" : "",
              nowPlacement.level === "lifted" ? "is-lifted" : "",
              nowPlacement.level === "dropped" ? "is-dropped" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ left: pctX(nowPoint.x), top: pctY(nowPoint.y) }}
          >
            <span className="nut-care-here-label" style={nowLabelStyle}>
              You are here
            </span>
            <span className="nut-care-here-dot" />
          </div>
        </div>
        <div className="nut-care-arc-base">
          <span>Dawn</span>
          <span>Midday</span>
          <span>Dusk</span>
          <span>Night</span>
        </div>
      </div>

      {/* The walk line, tied to the arc — the movement sentences,
          verbatim. */}
      <p className="nut-care-walk">
        Your movement target is {durationText(care.movementMinutes)} in the day.
        {care.largestMeal ? (
          <>
            {" "}
            The day&rsquo;s largest meal is{" "}
            <span className="nut-care-walk-strong">{care.largestMeal.label}</span>
            {care.largestMeal.time ? <> (~{clock(care.largestMeal.time)})</> : null}. A walk after
            it covers the target in one go.
          </>
        ) : null}
      </p>

      <div className="nut-care-block">
        <p className="nut-care-kicker">
          <IconMoon className="nut-care-kicker-icon" /> Sleep
        </p>
        <p className="nut-care-figures">
          <span className="nut-care-fig nut-care-fig-bed">
            <span className="nut-care-fig-label">In bed by</span>{" "}
            <span className="nut-care-fig-value">{clock(care.bedTime)}</span>
          </span>
          <span className="nut-care-sep" aria-hidden="true">
            {" "}
            ·{" "}
          </span>
          <span className="nut-care-fig nut-care-fig-up">
            <span className="nut-care-fig-label">Up at</span>{" "}
            <span className="nut-care-fig-value">{clock(care.wakeTime)}</span>
          </span>
          <span className="nut-care-sep" aria-hidden="true">
            {" "}
            ·{" "}
          </span>
          <span className="nut-care-fig nut-care-fig-hero">
            <span className="nut-care-fig-value">{durationText(care.sleepMinutes)}.</span>
          </span>
        </p>
        <p className="nut-care-wake-note">Bedtime follows your sleep target in Trackers.</p>
        <div className="nut-care-wake">
          <label htmlFor="day-rhythm-wake" className="nut-care-wake-label">
            Up at
          </label>
          <input
            id="day-rhythm-wake"
            type="time"
            value={care.wakeTime}
            onChange={(e) => onWakeChange(e.target.value)}
            className="nut-care-wake-input"
          />
        </div>
      </div>

      <div className="nut-care-block">
        <div className="nut-care-cols">
          <div className="nut-care-zone is-do">
            <p className="nut-care-col-title">
              Tonight <span>— do</span>
            </p>
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
          <div className="nut-care-cols-divider" aria-hidden="true" />
          <div className="nut-care-zone is-avoid">
            <p className="nut-care-col-title">
              Tonight <span>— avoid</span>
            </p>
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
