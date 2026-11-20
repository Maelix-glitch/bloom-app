/**
 * The whole-day caretaker derivation (M-162): the rhythm math is
 * pinned against hand-computed frames — bedtime wrapping past
 * midnight both ways, the caffeine boundary, the last-meal window
 * judged both ways and refused without a clock, the goal fallbacks,
 * and the largest meal read from the composed totals alone.
 */

import { describe, expect, it } from "vitest";

import {
  DEFAULT_DAY_RHYTHM,
  clockToMinutes,
  dayCaretakerOf,
  durationText,
  minutesToClock,
  parseDayRhythm,
  type DayCaretakerInput,
} from "./dayRhythm";
import type { PlanTimeline } from "./plan";

const base: DayCaretakerInput = {
  wakeTime: "06:30",
  sleepGoalMinutes: 480,
  movementGoalMinutes: 30,
  screenGoalMinutes: 180,
  meals: [],
  timeline: null,
};

const timeline = (items: PlanTimeline["items"]): PlanTimeline => ({
  anchor: "sleep_log",
  items,
});

describe("parseDayRhythm", () => {
  it("accepts an object carrying a well-formed wake time", () => {
    expect(parseDayRhythm({ wakeTime: "07:15" })).toEqual({ wakeTime: "07:15" });
    expect(parseDayRhythm({ wakeTime: "00:00" })).toEqual({ wakeTime: "00:00" });
    expect(parseDayRhythm({ wakeTime: "23:59" })).toEqual({ wakeTime: "23:59" });
  });

  it("refuses anything else — the default stands, never a guess", () => {
    expect(parseDayRhythm(null)).toBeNull();
    expect(parseDayRhythm(undefined)).toBeNull();
    expect(parseDayRhythm("06:30")).toBeNull();
    expect(parseDayRhythm(390)).toBeNull();
    expect(parseDayRhythm({})).toBeNull();
    expect(parseDayRhythm({ wakeTime: "24:00" })).toBeNull();
    expect(parseDayRhythm({ wakeTime: "6:30" })).toBeNull();
    expect(parseDayRhythm({ wakeTime: "06:60" })).toBeNull();
    expect(parseDayRhythm({ wakeTime: 390 })).toBeNull();
  });

  it("the default is a 06:30 wake", () => {
    expect(DEFAULT_DAY_RHYTHM).toEqual({ wakeTime: "06:30" });
  });
});

describe("clock math", () => {
  it("round-trips and wraps", () => {
    expect(clockToMinutes("22:30")).toBe(1350);
    expect(minutesToClock(1350)).toBe("22:30");
    expect(minutesToClock(-90)).toBe("22:30");
    expect(minutesToClock(1500)).toBe("01:00");
    expect(minutesToClock(0)).toBe("00:00");
  });

  it("durationText words a span plainly", () => {
    expect(durationText(480)).toBe("8 hours");
    expect(durationText(60)).toBe("1 hour");
    expect(durationText(90)).toBe("1 hour 30 minutes");
    expect(durationText(61)).toBe("1 hour 1 minute");
    expect(durationText(45)).toBe("45 minutes");
    expect(durationText(1)).toBe("1 minute");
    expect(durationText(0)).toBe("0 minutes");
  });
});

describe("the sleep window", () => {
  it("bedtime is the wake time minus the sleep target", () => {
    const care = dayCaretakerOf(base);
    expect(care.wakeTime).toBe("06:30");
    expect(care.bedTime).toBe("22:30");
    expect(care.sleepMinutes).toBe(480);
  });

  it("wraps past midnight in both directions", () => {
    /* A late bedtime: up at 08:00 on a 6-hour target. */
    expect(dayCaretakerOf({ ...base, wakeTime: "08:00", sleepGoalMinutes: 360 }).bedTime).toBe(
      "02:00",
    );
    /* An early bedtime: up at 00:30 on an 8-hour target. */
    expect(dayCaretakerOf({ ...base, wakeTime: "00:30" }).bedTime).toBe("16:30");
    /* A long target: up at 05:00 on 9 hours. */
    expect(dayCaretakerOf({ ...base, wakeTime: "05:00", sleepGoalMinutes: 540 }).bedTime).toBe(
      "20:00",
    );
  });

  it("the evening windows hang off the bedtime", () => {
    const care = dayCaretakerOf(base); // bed 22:30
    expect(care.windDownTime).toBe("21:30");
    expect(care.caffeineCutoff).toBe("14:30");
    expect(care.lastMealEndsBy).toBe("20:30");
  });

  it("the caffeine boundary wraps with a past-midnight bedtime", () => {
    const care = dayCaretakerOf({ ...base, wakeTime: "08:00", sleepGoalMinutes: 360 }); // bed 02:00
    expect(care.caffeineCutoff).toBe("18:00");
    expect(care.windDownTime).toBe("01:00");
    expect(care.lastMealEndsBy).toBe("00:00");
  });
});

describe("goal fallbacks", () => {
  it("unread goals stand in at the Trackers' own defaults", () => {
    const care = dayCaretakerOf({
      ...base,
      sleepGoalMinutes: null,
      movementGoalMinutes: null,
      screenGoalMinutes: null,
    });
    expect(care.sleepMinutes).toBe(480);
    expect(care.movementMinutes).toBe(30);
    expect(care.screenMinutes).toBe(180);
    expect(care.bedTime).toBe("22:30");
  });

  it("each goal falls back on its own", () => {
    const care = dayCaretakerOf({ ...base, sleepGoalMinutes: 450, movementGoalMinutes: null });
    expect(care.sleepMinutes).toBe(450);
    expect(care.bedTime).toBe("23:00");
    expect(care.movementMinutes).toBe(30);
    expect(care.screenMinutes).toBe(180);
  });

  it("stated goals pass through verbatim", () => {
    const care = dayCaretakerOf({
      ...base,
      sleepGoalMinutes: 510,
      movementGoalMinutes: 45,
      screenGoalMinutes: 240,
    });
    expect(care.sleepMinutes).toBe(510);
    expect(care.movementMinutes).toBe(45);
    expect(care.screenMinutes).toBe(240);
  });
});

describe("the largest meal", () => {
  const meals = [
    { meal: "breakfast" as const, kcal: 420 },
    { meal: "lunch" as const, kcal: 760 },
    { meal: "snack" as const, kcal: 180 },
    { meal: "dinner" as const, kcal: 690 },
  ];

  it("is the composed meal carrying the most energy — never a hardcoded lunch", () => {
    expect(dayCaretakerOf({ ...base, meals }).largestMeal?.meal).toBe("lunch");
    const dinnerDay = [
      { meal: "breakfast" as const, kcal: 300 },
      { meal: "dinner" as const, kcal: 900 },
    ];
    expect(dayCaretakerOf({ ...base, meals: dinnerDay }).largestMeal?.meal).toBe("dinner");
  });

  it("a tie goes to the earlier meal in the plan's order", () => {
    const tied = [
      { meal: "lunch" as const, kcal: 700 },
      { meal: "dinner" as const, kcal: 700 },
    ];
    expect(dayCaretakerOf({ ...base, meals: tied }).largestMeal?.meal).toBe("lunch");
  });

  it("carries the timeline's own label and clock for the meal", () => {
    const care = dayCaretakerOf({
      ...base,
      meals,
      timeline: timeline([
        { kind: "meal", meal: "lunch", time: "13:05", label: "Lunch" },
        { kind: "meal", meal: "snack", time: "17:15", label: "Evening snack" },
      ]),
    });
    expect(care.largestMeal).toEqual({ meal: "lunch", label: "Lunch", time: "13:05" });
  });

  it("a plan with no energy in it has no largest meal", () => {
    expect(dayCaretakerOf({ ...base, meals: [] }).largestMeal).toBeNull();
    expect(dayCaretakerOf({ ...base, meals: [{ meal: "snack", kcal: 0 }] }).largestMeal).toBeNull();
  });
});

describe("the last meal and its window", () => {
  const day = (lastTime: string): PlanTimeline =>
    timeline([
      { kind: "wake", time: "06:30", label: "On waking" },
      { kind: "meal", meal: "breakfast", time: "07:15", label: "Breakfast" },
      { kind: "meal", meal: "dinner", time: lastTime, label: "Dinner" },
      { kind: "sleep", time: "22:30", label: "Bedtime" },
    ]);

  it("the last timed meal item is the last meal, with its label and clock", () => {
    const care = dayCaretakerOf({ ...base, timeline: day("19:45") });
    expect(care.lastMeal).toEqual({ meal: "dinner", label: "Dinner", time: "19:45" });
  });

  it("outside the window: a 19:45 dinner on a 22:30 bedtime sits clear", () => {
    expect(dayCaretakerOf({ ...base, timeline: day("19:45") }).lastMealInsideWindow).toBe(false);
    /* Exactly at the boundary — ending by bedtime minus two hours is outside. */
    expect(dayCaretakerOf({ ...base, timeline: day("20:30") }).lastMealInsideWindow).toBe(false);
  });

  it("inside the window: a late snack at 21:15 on a 22:30 bedtime", () => {
    const care = dayCaretakerOf({
      ...base,
      timeline: timeline([
        { kind: "meal", meal: "dinner", time: "19:45", label: "Dinner" },
        { kind: "meal", meal: "snack", time: "21:15", label: "Evening snack" },
      ]),
    });
    expect(care.lastMeal?.meal).toBe("snack");
    expect(care.lastMealInsideWindow).toBe(true);
  });

  it("a past-midnight frame judges a past-midnight meal on the same line", () => {
    /* Up at 08:00, 6-hour target → bed 02:00; the window opens at 00:00. */
    const late = dayCaretakerOf({
      ...base,
      wakeTime: "08:00",
      sleepGoalMinutes: 360,
      timeline: timeline([{ kind: "meal", meal: "snack", time: "00:30", label: "Evening snack" }]),
    });
    expect(late.lastMealInsideWindow).toBe(true);
    const earlier = dayCaretakerOf({
      ...base,
      wakeTime: "08:00",
      sleepGoalMinutes: 360,
      timeline: timeline([{ kind: "meal", meal: "dinner", time: "23:00", label: "Dinner" }]),
    });
    expect(earlier.lastMealInsideWindow).toBe(false);
  });

  it("no clock, no judgement — a relative day and a missing timeline both refuse", () => {
    const relative: PlanTimeline = {
      anchor: "relative",
      items: [
        { kind: "meal", meal: "breakfast", time: null, label: "Breakfast" },
        { kind: "meal", meal: "dinner", time: null, label: "Dinner" },
      ],
    };
    const care = dayCaretakerOf({ ...base, timeline: relative });
    expect(care.lastMeal).toBeNull();
    expect(care.lastMealInsideWindow).toBeNull();

    const none = dayCaretakerOf({ ...base, timeline: null });
    expect(none.lastMeal).toBeNull();
    expect(none.lastMealInsideWindow).toBeNull();
    /* The bedtime-anchored facts still stand — they never needed the plan's clock. */
    expect(none.lastMealEndsBy).toBe("20:30");
    expect(none.caffeineCutoff).toBe("14:30");
  });
});
