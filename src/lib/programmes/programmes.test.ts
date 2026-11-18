/**
 * Transformation Programmes — the definitions, the enrolment
 * rules and the progress engine. Pinned here: targets are only
 * ever things Bloom records; the copy promises structure, never
 * outcomes; one active run at a time; quitting keeps history;
 * restarting is a separate run; and a week with no records reads
 * "no record" — never a zero-filled success, never failure
 * theatre.
 */

import { describe, expect, it } from "vitest";

import {
  BUILD_AND_FUEL,
  PROGRAMMES,
  STRONG_START,
  programmeById,
} from "./definitions";
import {
  EMPTY_PROGRAMMES_VALUE,
  EMPTY_RECORDS,
  activeRunOf,
  enrolRun,
  parseProgrammesValue,
  progressForRun,
  quitRun,
  type ProgrammeRecords,
  type ProgrammeRun,
} from "./programmes";

const START = "2026-11-02"; // a Monday; only relative offsets matter

function run(overrides: Partial<ProgrammeRun> = {}): ProgrammeRun {
  return {
    id: "run-1",
    programmeId: "strong-start",
    startedOn: START,
    status: "active",
    endedOn: null,
    ...overrides,
  };
}

describe("programme definitions", () => {
  it("ships exactly the two foundation programmes, at 4 and 12 weeks", () => {
    expect(PROGRAMMES).toHaveLength(2);
    expect(STRONG_START.weeks).toHaveLength(4);
    expect(BUILD_AND_FUEL.weeks).toHaveLength(12);
    expect(programmeById("strong-start")).toBe(STRONG_START);
    expect(programmeById("nope")).toBeNull();
  });

  it("every week has a focus line and 2–3 checkable targets (Build & Fuel may carry 4 kinds)", () => {
    for (const p of PROGRAMMES) {
      for (const week of p.weeks) {
        expect(week.focus.length).toBeGreaterThan(0);
        expect(week.targets.length).toBeGreaterThanOrEqual(2);
        expect(week.targets.length).toBeLessThanOrEqual(4);
        for (const target of week.targets) {
          expect(target.count).toBeGreaterThan(0);
          expect(target.count).toBeLessThanOrEqual(7);
        }
      }
    }
  });

  it("Build & Fuel ramps plan adherence across the 12 weeks", () => {
    const planCounts = BUILD_AND_FUEL.weeks.map(
      (w) => w.targets.find((t) => t.kind === "plan_days")!.count,
    );
    expect(planCounts[0]).toBe(3);
    expect(planCounts[11]).toBe(6);
    for (let i = 1; i < planCounts.length; i++) {
      expect(planCounts[i]!).toBeGreaterThanOrEqual(planCounts[i - 1]!);
    }
    // Every week asks for exactly one weigh-in — the cadence the
    // plan's expenditure learning reads.
    for (const w of BUILD_AND_FUEL.weeks) {
      expect(w.targets.find((t) => t.kind === "weigh_in_count")!.count).toBe(1);
    }
  });

  it("the copy promises structure, never outcomes", () => {
    const banned = [
      "transform your",
      "lose weight",
      "guarantee",
      "will lose",
      "will gain",
      "dream body",
      "before and after",
      "before/after",
      "results in",
    ];
    for (const p of PROGRAMMES) {
      const text = `${p.name} ${p.blurb} ${p.weeks.map((w) => w.focus).join(" ")}`.toLowerCase();
      for (const phrase of banned) expect(text).not.toContain(phrase);
    }
  });
});

describe("parseProgrammesValue", () => {
  it("round-trips a well-formed value and drops forged runs", () => {
    const value = {
      version: 1,
      runs: [
        run(),
        run({ id: "run-2", programmeId: "unknown-programme" }),
        run({ id: "run-3", status: "quit", endedOn: null }),
        run({ id: "run-1" }), // duplicate id
        "junk",
      ],
    };
    const parsed = parseProgrammesValue(value);
    expect(parsed!.runs).toEqual([run()]);
  });

  it("refuses wrong versions and non-objects", () => {
    expect(parseProgrammesValue({ version: 2, runs: [] })).toBeNull();
    expect(parseProgrammesValue(null)).toBeNull();
    expect(parseProgrammesValue("nope")).toBeNull();
  });
});

describe("enrolment rules", () => {
  it("enrolling prepends a fresh active run", () => {
    const value = enrolRun(EMPTY_PROGRAMMES_VALUE, "strong-start", "run-1", START);
    expect(value.runs).toEqual([run()]);
    expect(activeRunOf(value, START)).toEqual(run());
  });

  it("one active programme at a time: a second enrol writes nothing", () => {
    const value = enrolRun(EMPTY_PROGRAMMES_VALUE, "strong-start", "run-1", START);
    const again = enrolRun(value, "build-and-fuel", "run-2", "2026-11-03");
    expect(again).toBe(value);
  });

  it("quitting keeps the run in history with its end date, and frees enrolment", () => {
    let value = enrolRun(EMPTY_PROGRAMMES_VALUE, "strong-start", "run-1", START);
    value = quitRun(value, "run-1", "2026-11-10");
    expect(value.runs).toEqual([
      run({ status: "quit", endedOn: "2026-11-10" }),
    ]);
    expect(activeRunOf(value, "2026-11-10")).toBeNull();
    // Restarting is a separate run record, never a resume.
    value = enrolRun(value, "strong-start", "run-2", "2026-11-11");
    expect(value.runs.map((r) => r.id)).toEqual(["run-2", "run-1"]);
  });

  it("a run past its final week no longer blocks enrolment", () => {
    const value = enrolRun(EMPTY_PROGRAMMES_VALUE, "strong-start", "run-1", START);
    // Strong Start ends 2026-11-29 (4 weeks from Nov 2).
    expect(activeRunOf(value, "2026-11-29")).toEqual(run());
    expect(activeRunOf(value, "2026-11-30")).toBeNull();
    const next = enrolRun(value, "build-and-fuel", "run-2", "2026-11-30");
    expect(next.runs.map((r) => r.id)).toEqual(["run-2", "run-1"]);
  });

  it("quitting an already-quit or unknown run writes nothing", () => {
    let value = enrolRun(EMPTY_PROGRAMMES_VALUE, "strong-start", "run-1", START);
    value = quitRun(value, "run-1", "2026-11-05");
    expect(quitRun(value, "run-1", "2026-11-06")).toEqual(value);
    expect(quitRun(value, "ghost", "2026-11-06")).toEqual(value);
  });
});

describe("progress engine", () => {
  it("a week with no records reads no_record — never met, never missed", () => {
    const progress = progressForRun(run(), EMPTY_RECORDS, "2026-11-20")!;
    // Weeks 1–2 fully past, week 3 current (Nov 16–22): all no_record.
    expect(progress.weeks.map((w) => w.state)).toEqual([
      "no_record",
      "no_record",
      "no_record",
      "upcoming",
    ]);
    expect(progress.summary).toEqual({
      weeksMet: 0,
      weeksMissed: 0,
      weeksNoRecord: 3,
      weeksInProgress: 0,
      weeksUpcoming: 1,
    });
    for (const week of progress.weeks.slice(0, 3)) {
      for (const tp of week.targets) {
        expect(tp.actual).toBe(0);
        expect(tp.state).toBe("no_record");
      }
    }
  });

  it("counts real records per week and marks met / missed / in progress honestly", () => {
    const records: ProgrammeRecords = {
      // Week 1 (Nov 2–8): full house — 3 food days, 3 habit days, 1 weigh-in.
      foodLogDays: ["2026-11-02", "2026-11-04", "2026-11-04", "2026-11-06"],
      habitTickDays: ["2026-11-02", "2026-11-05", "2026-11-08"],
      weighInDays: ["2026-11-03"],
      // Week 2 (Nov 9–15): some record, short of target → missed.
      planDays: ["2026-11-10"],
    };
    const progress = progressForRun(run(), records, "2026-11-18")!;
    expect(progress.weeks[0]!.state).toBe("met");
    expect(progress.weeks[0]!.targets.map((t) => t.actual)).toEqual([3, 3, 1]);
    expect(progress.weeks[1]!.state).toBe("missed");
    // Week 3 is current with no records yet → no_record, not missed.
    expect(progress.weeks[2]!.state).toBe("no_record");
    expect(progress.currentWeek).toBe(3);
    expect(progress.state).toBe("active");
  });

  it("the current week with partial records is in_progress, targets individually stated", () => {
    const records: ProgrammeRecords = {
      ...EMPTY_RECORDS,
      foodLogDays: ["2026-11-02", "2026-11-03"],
    };
    const progress = progressForRun(run(), records, "2026-11-04")!;
    expect(progress.weeks[0]!.state).toBe("in_progress");
    const food = progress.weeks[0]!.targets.find((t) => t.target.kind === "food_log_days")!;
    expect(food.actual).toBe(2);
    expect(food.state).toBe("in_progress");
    const weigh = progress.weeks[0]!.targets.find((t) => t.target.kind === "weigh_in_count")!;
    expect(weigh.state).toBe("in_progress");
  });

  it("weigh-ins count entries, day-kind targets count distinct days", () => {
    const records: ProgrammeRecords = {
      ...EMPTY_RECORDS,
      weighInDays: ["2026-11-03", "2026-11-03"],
      foodLogDays: ["2026-11-03", "2026-11-03", "2026-11-03"],
    };
    const week = progressForRun(run(), records, "2026-11-04")!.weeks[0]!;
    expect(week.targets.find((t) => t.target.kind === "weigh_in_count")!.actual).toBe(2);
    expect(week.targets.find((t) => t.target.kind === "food_log_days")!.actual).toBe(1);
  });

  it("a completed run reports its state and no current week", () => {
    const progress = progressForRun(run(), EMPTY_RECORDS, "2026-12-15")!;
    expect(progress.state).toBe("completed");
    expect(progress.currentWeek).toBeNull();
    expect(progress.summary.weeksUpcoming).toBe(0);
    expect(progress.summary.weeksNoRecord).toBe(4);
  });

  it("a quit run is judged only up to the day it was quit", () => {
    const quit = run({ status: "quit", endedOn: "2026-11-10" });
    const progress = progressForRun(quit, EMPTY_RECORDS, "2026-12-15")!;
    expect(progress.state).toBe("quit");
    expect(progress.currentWeek).toBeNull();
    // Weeks 3–4 start after the quit day: never attempted, upcoming
    // in the strip rather than counted against the person.
    expect(progress.weeks[2]!.state).toBe("upcoming");
    expect(progress.weeks[3]!.state).toBe("upcoming");
    expect(progress.summary.weeksNoRecord).toBe(2);
  });
});
