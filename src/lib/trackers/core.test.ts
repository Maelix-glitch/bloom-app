/**
 * Tests for the daily-trackers core (src/lib/trackers/core.ts).
 *
 * The core is pure, so these tests are the contract: any frontend or backend
 * that lifts this file can rely on them.
 */

import { describe, expect, it } from "vitest";

import {
  DEFAULT_GOALS,
  TRACKERS,
  advancedInsightOf,
  analyzeTrackers,
  emptyDay,
  isEmptyDay,
  minutesBetween,
  studyMinutesOf,
  validateDay,
  valueOf,
  type DayEntry,
  type Goals,
} from "./core";

const day = (date: string, extra: Partial<DayEntry> = {}): DayEntry => ({
  ...emptyDay(date),
  ...extra,
});

const goals: Goals = { ...DEFAULT_GOALS };

const session = (subject: string, minutes: number, startAt: string | null = null) => ({
  subject,
  minutes,
  startAt,
});

describe("minutesBetween", () => {
  it("measures an ordinary night", () => {
    expect(minutesBetween("23:00", "07:00")).toBe(480);
  });

  it("measures a night that crosses midnight with minutes", () => {
    expect(minutesBetween("23:30", "07:15")).toBe(465);
  });

  it("treats a wake time at or before bedtime as the next morning", () => {
    expect(minutesBetween("07:00", "07:00")).toBe(1440);
    expect(minutesBetween("01:00", "00:30")).toBe(1410);
  });

  it("returns null for anything that is not a time", () => {
    expect(minutesBetween("late", "07:00")).toBeNull();
    expect(minutesBetween("24:00", "07:00")).toBeNull();
    expect(minutesBetween("07:00", "07:60")).toBeNull();
  });
});

describe("valueOf and study totals", () => {
  it("sums study sessions and reads null when there are none", () => {
    expect(studyMinutesOf(day("2026-08-30"))).toBeNull();
    expect(
      studyMinutesOf(
        day("2026-08-30", { sessions: [session("Maths", 45), session("Reading", 30)] }),
      ),
    ).toBe(75);
  });

  it("reads each tracker in its own unit", () => {
    const entry = day("2026-08-30", {
      sleepMinutes: 450,
      waterMl: 1800,
      sessions: [session("Maths", 60)],
      movementMinutes: 25,
      energy: 4,
      screenMinutes: 200,
    });
    expect(valueOf(entry, "sleep")).toBe(450);
    expect(valueOf(entry, "water")).toBe(1800);
    expect(valueOf(entry, "study")).toBe(60);
    expect(valueOf(entry, "movement")).toBe(25);
    expect(valueOf(entry, "energy")).toBe(4);
    expect(valueOf(entry, "screen")).toBe(200);
  });

  it("knows an empty day from a logged one", () => {
    expect(isEmptyDay(day("2026-08-30"))).toBe(true);
    expect(isEmptyDay(day("2026-08-30", { waterMl: 0 }))).toBe(false);
    expect(isEmptyDay(day("2026-08-30", { notes: "long day" }))).toBe(false);
  });
});

describe("validateDay", () => {
  it("rejects a date that hasn't happened", () => {
    const errors = validateDay(day("2026-09-05", { waterMl: 500 }), "2026-08-30");
    expect(errors.date).toMatch(/hasn't happened/);
  });

  it("accepts today and yesterday", () => {
    expect(validateDay(day("2026-08-30"), "2026-08-30")).toEqual({});
    expect(validateDay(day("2026-08-29"), "2026-08-30")).toEqual({});
  });

  it("keeps numbers inside their range, with the range in the message", () => {
    expect(validateDay(day("2026-08-30", { waterMl: 9000 }), "2026-08-30").waterMl).toBe(
      "Water should be between 0 and 8000ml.",
    );
    expect(validateDay(day("2026-08-30", { energy: 9 }), "2026-08-30").energy).toBe(
      "Energy should be between 1 and 5.",
    );
    expect(validateDay(day("2026-08-30", { sleepMinutes: -5 }), "2026-08-30").sleepMinutes).toMatch(
      /Sleep should be between 0 and 1080 minutes/,
    );
  });

  it("checks session minutes and start times", () => {
    expect(
      validateDay(day("2026-08-30", { sessions: [session("Maths", 0)] }), "2026-08-30").sessions,
    ).toMatch(/between 1 and 960/);
    expect(
      validateDay(
        day("2026-08-30", { sessions: [session("Maths", 30, "25:00")] }),
        "2026-08-30",
      ).sessions,
    ).toMatch(/24-hour/);
    expect(
      validateDay(
        day("2026-08-30", { sessions: [session("   ", 30)] }),
        "2026-08-30",
      ).sessions,
    ).toMatch(/needs a subject/);
  });

  it("caps the number of sessions and the length of notes", () => {
    const many = Array.from({ length: 13 }, () => session("Maths", 10));
    expect(validateDay(day("2026-08-30", { sessions: many }), "2026-08-30").sessions).toMatch(
      /Up to 12/,
    );
    expect(
      validateDay(day("2026-08-30", { notes: "x".repeat(401) }), "2026-08-30").notes,
    ).toMatch(/400 characters/);
  });
});

/** Fourteen steady days ending 2026-08-30: sleep 7h30m, water 2.4L, study 2h. */
const spine = (): DayEntry[] => {
  const dates = [
    "2026-08-17",
    "2026-08-18",
    "2026-08-19",
    "2026-08-20",
    "2026-08-21",
    "2026-08-22",
    "2026-08-23",
    "2026-08-24",
    "2026-08-25",
    "2026-08-26",
    "2026-08-27",
    "2026-08-28",
    "2026-08-29",
    "2026-08-30",
  ];
  return dates.map((date) =>
    day(date, {
      sleepMinutes: 450,
      waterMl: 2400,
      sessions: [session("Maths", 60), session("Reading", 60)],
      movementMinutes: 35,
      energy: 4,
      screenMinutes: 150,
    }),
  );
};

describe("analyzeTrackers", () => {
  it("returns empty stats rather than invented ones with no days", () => {
    const a = analyzeTrackers([], goals, "2026-08-30");
    expect(a.daysLogged).toBe(0);
    expect(a.streak).toBe(0);
    expect(a.completion).toBe(0);
    expect(a.trackers.sleep.today).toBeNull();
    expect(a.trackers.sleep.met).toBeNull();
    expect(a.correlations).toEqual([]);
    expect(a.observations).toEqual([]);
  });

  it("reads today's value and whether it met the goal", () => {
    const a = analyzeTrackers(spine(), goals, "2026-08-30");
    expect(a.trackers.sleep.today).toBe(450);
    expect(a.trackers.sleep.met).toBe(false); // 7h30m against an 8h target
    expect(a.trackers.water.today).toBe(2400);
    expect(a.trackers.water.met).toBe(true);
    expect(a.trackers.study.today).toBe(120);
    expect(a.trackers.study.met).toBe(true);
    expect(a.trackers.movement.met).toBe(true);
    expect(a.trackers.screen.met).toBe(true); // 150 under a 180 ceiling
    expect(a.goalsMetToday).toBe(5);
    expect(a.completion).toBeCloseTo(5 / 6, 5);
  });

  it("fills the ring in proportion to the goal", () => {
    const a = analyzeTrackers([day("2026-08-30", { waterMl: 1100 })], goals, "2026-08-30");
    expect(a.trackers.water.progress).toBeCloseTo(0.5, 5);
  });

  it("treats a ceiling tracker as met when it comes in under it", () => {
    const a = analyzeTrackers([day("2026-08-30", { screenMinutes: 400 })], goals, "2026-08-30");
    expect(a.trackers.screen.met).toBe(false);
    expect(a.trackers.screen.progress).toBeLessThan(1);
  });

  it("counts a streak back from today, and from yesterday when today is blank", () => {
    const days = spine();
    const a = analyzeTrackers(days, goals, "2026-08-30");
    expect(a.trackers.water.streak).toBe(14);

    const withoutToday = days.filter((d) => d.date !== "2026-08-30");
    const b = analyzeTrackers(withoutToday, goals, "2026-08-30");
    expect(b.trackers.water.streak).toBe(13);
  });

  it("breaks the streak across a gap", () => {
    const days = spine().filter((d) => d.date !== "2026-08-28");
    const a = analyzeTrackers(days, goals, "2026-08-30");
    expect(a.trackers.water.streak).toBe(2); // 08-29 and 08-30
  });

  it("keeps the longest run separately from the current one", () => {
    const days = spine().filter(
      (d) => d.date !== "2026-08-30" && d.date !== "2026-08-29",
    );
    const a = analyzeTrackers(days, goals, "2026-08-30");
    expect(a.trackers.water.streak).toBe(0); // today and yesterday are blank
    expect(a.trackers.water.bestStreak).toBe(12);
  });

  it("averages the last seven days it has, not seven calendar slots", () => {
    const a = analyzeTrackers(
      [day("2026-08-29", { sleepMinutes: 400 }), day("2026-08-30", { sleepMinutes: 500 })],
      goals,
      "2026-08-30",
    );
    expect(a.trackers.sleep.avg7).toBe(450);
    expect(a.trackers.sleep.daysLogged).toBe(2);
  });

  it("builds a fourteen-day series with nulls for unlogged days", () => {
    const a = analyzeTrackers([day("2026-08-30", { waterMl: 1000 })], goals, "2026-08-30");
    expect(a.trackers.water.series).toHaveLength(14);
    expect(a.trackers.water.series[0]?.date).toBe("2026-08-17");
    expect(a.trackers.water.series[13]?.value).toBe(1000);
    expect(a.trackers.water.series[12]?.value).toBeNull();
  });

  it("spots a trend by comparing the last seven with the seven before", () => {
    /* 08-17…08-23 sleep 6h, 08-24…08-30 sleep 8h. */

    const days: DayEntry[] = [];
    for (let i = 6; i >= 0; i -= 1) {
      days.push(day(`2026-08-${String(17 + i).padStart(2, "0")}`, { sleepMinutes: 360 }));
    }
    for (let i = 6; i >= 0; i -= 1) {
      days.push(day(`2026-08-${String(24 + i).padStart(2, "0")}`, { sleepMinutes: 480 }));
    }
    const a = analyzeTrackers(days, goals, "2026-08-30");
    expect(a.trackers.sleep.trend?.dir).toBe("up");
    expect(a.trackers.sleep.trend?.delta).toBe(120);
  });

  it("totals study time by subject across the record", () => {
    const days = [
      day("2026-08-29", { sessions: [session("Maths", 60), session("Reading", 30)] }),
      day("2026-08-30", { sessions: [session("Maths", 90)] }),
    ];
    const a = analyzeTrackers(days, goals, "2026-08-30");
    expect(a.subjects[0]).toMatchObject({ subject: "Maths", minutes: 150, sessions: 2 });
    expect(a.subjects[1]).toMatchObject({ subject: "Reading", minutes: 30, sessions: 1 });
  });

  it("only claims a study window once five sessions are timed", () => {
    const few = [
      day("2026-08-29", { sessions: [session("Maths", 60, "09:00")] }),
      day("2026-08-30", { sessions: [session("Maths", 60, "09:00")] }),
    ];
    expect(analyzeTrackers(few, goals, "2026-08-30").studyHours).toEqual([]);

    const enough = Array.from({ length: 6 }, (_, i) =>
      day(`2026-08-${String(25 + i).padStart(2, "0")}`, {
        sessions: [session("Maths", 30, i < 4 ? "09:00" : "21:00")],
      }),
    );
    const hours = analyzeTrackers(enough, goals, "2026-08-30").studyHours;
    expect(hours[0]).toEqual({ hour: 9, minutes: 120 });
  });

  it("reports a correlation with the number of days behind it", () => {
    /* Sleep and energy rise together, perfectly, across eight days. */
    const days = Array.from({ length: 8 }, (_, i) =>
      day(`2026-08-${String(23 + i).padStart(2, "0")}`, {
        sleepMinutes: 300 + i * 30,
        energy: i < 4 ? 2 : 4,
      }),
    );
    const a = analyzeTrackers(days, goals, "2026-08-30");
    const correlation = a.correlations.find(
      (c) => (c.a === "sleep" && c.b === "energy") || (c.a === "energy" && c.b === "sleep"),
    );
    expect(correlation).toBeDefined();
    expect(correlation?.n).toBe(8);
    expect(correlation?.r).toBeGreaterThan(0.5);
    expect(correlation?.sentence).toMatch(/8 days/);
  });

  it("stays silent on correlations with fewer than five paired days", () => {
    const days = Array.from({ length: 4 }, (_, i) =>
      day(`2026-08-${String(27 + i).padStart(2, "0")}`, { sleepMinutes: 400 + i, energy: 3 }),
    );
    const a = analyzeTrackers(days, goals, "2026-08-30");
    expect(
      a.correlations.find((c) => c.a === "sleep" && c.b === "energy"),
    ).toBeUndefined();
  });

  it("writes observations from the record, none of them prescriptive", () => {
    const a = analyzeTrackers(spine(), goals, "2026-08-30");
    expect(a.observations.length).toBeGreaterThan(0);
    const joined = a.observations.join(" ").toLowerCase();
    for (const banned of ["should", "must", "you need to", "diagnos", "recommend"]) {
      expect(joined).not.toContain(banned);
    }
    expect(joined).toMatch(/water target on 14 of the last 14 days/);
  });

  it("notes sleep against the target in plain language", () => {
    const a = analyzeTrackers(spine(), goals, "2026-08-30");
    expect(a.observations.join(" ")).toMatch(/7h 30m.*under your 8h target/);
  });

  it("reports how much of the last fortnight was logged", () => {
    const days = spine().slice(0, 5);
    const a = analyzeTrackers(days, goals, "2026-08-30");
    expect(a.observations.join(" ")).toMatch(/logged 0 of the last 14 days|logged \d+ of the last 14/);
  });
});

describe("goals", () => {
  it("follows a changed target rather than the default", () => {
    const custom: Goals = { ...DEFAULT_GOALS, waterMl: 1000 };
    const a = analyzeTrackers([day("2026-08-30", { waterMl: 1000 })], custom, "2026-08-30");
    expect(a.trackers.water.met).toBe(true);
    expect(a.trackers.water.goal).toBe(1000);
  });

  it("has a definition for every tracker the analysis returns", () => {
    const a = analyzeTrackers(spine(), goals, "2026-08-30");
    for (const def of TRACKERS) {
      expect(a.trackers[def.id]).toBeDefined();
    }
  });
});

describe("advanced insight", () => {
  it("says so plainly when there aren't three of each day yet", () => {
    const days = [
      day("2026-08-29", { energy: 5, sleepMinutes: 500 }),
      day("2026-08-30", { energy: 1, sleepMinutes: 300 }),
    ];
    const insight = advancedInsightOf(days);
    expect(insight.contrasts).toEqual([]);
    expect(insight.headline).toMatch(/Not yet/);
    expect(insight.bright).toBe(1);
    expect(insight.low).toBe(1);
  });

  it("contrasts bright days against low ones, with both day counts", () => {
    const days: DayEntry[] = [];
    /* four bright days: long sleep, lots of water */
    for (let i = 0; i < 4; i += 1) {
      days.push(
        day(`2026-08-${String(21 + i).padStart(2, "0")}`, {
          energy: 5,
          sleepMinutes: 500,
          waterMl: 2600,
          movementMinutes: 40,
        }),
      );
    }
    /* four low days: short sleep, little water */
    for (let i = 0; i < 4; i += 1) {
      days.push(
        day(`2026-08-${String(25 + i).padStart(2, "0")}`, {
          energy: 1,
          sleepMinutes: 300,
          waterMl: 1000,
          movementMinutes: 10,
        }),
      );
    }
    const insight = advancedInsightOf(days);
    expect(insight.bright).toBe(4);
    expect(insight.low).toBe(4);
    const sleep = insight.contrasts.find((c) => c.id === "sleep");
    expect(sleep).toMatchObject({ bright: 500, low: 300, delta: 67 });
    /* Movement differs most (10m → 40m), so it leads. */
    expect(insight.contrasts[0]).toMatchObject({ id: "movement", delta: 300 });
    expect(insight.headline).toMatch(/movement sits 300% higher/);
    expect(insight.detail.join(" ")).toMatch(/4 bright days/);
  });

  it("reports a quieter difference without overclaiming", () => {
    const days: DayEntry[] = [];
    for (let i = 0; i < 3; i += 1) {
      days.push(day(`2026-08-${String(21 + i).padStart(2, "0")}`, { energy: 4, sleepMinutes: 480 }));
    }
    for (let i = 0; i < 3; i += 1) {
      days.push(day(`2026-08-${String(25 + i).padStart(2, "0")}`, { energy: 2, sleepMinutes: 470 }));
    }
    const insight = advancedInsightOf(days);
    expect(insight.headline).toMatch(/look alike on paper/);
  });

  it("finds the weekday carrying the most study once three weekdays qualify", () => {
    /* 2026-08-03, 08-10, 08-17 and 08-24 are Mondays; 08-05 etc. Wednesdays. */
    const days = [
      day("2026-08-03", { sessions: [session("Maths", 120)] }),
      day("2026-08-10", { sessions: [session("Maths", 120)] }),
      day("2026-08-17", { sessions: [session("Maths", 120)] }),
      day("2026-08-05", { sessions: [session("Maths", 30)] }),
      day("2026-08-12", { sessions: [session("Maths", 30)] }),
      day("2026-08-19", { sessions: [session("Maths", 30)] }),
      day("2026-08-07", { sessions: [session("Maths", 20)] }),
      day("2026-08-14", { sessions: [session("Maths", 20)] }),
      day("2026-08-21", { sessions: [session("Maths", 20)] }),
    ];
    const insight = advancedInsightOf(days);
    expect(insight.bestDay).toMatchObject({ weekday: "Monday", value: 120, days: 3 });
  });

  it("is exposed on the analysis", () => {
    const a = analyzeTrackers(spine(), goals, "2026-08-30");
    expect(a.advanced).toBeDefined();
    expect(typeof a.advanced.headline).toBe("string");
  });
});
