/**
 * The Overview synthesis — the command centre's four answers.
 *
 * The fixtures are small, complete records: every test builds the exact
 * record it reasons about, runs the real tracker analysis over it, and
 * checks the synthesis end to end. Windows, for TODAY = 2026-11-10:
 * recent = Nov 4–10, prior = Oct 28 – Nov 3.
 */

import { describe, expect, it } from "vitest";

import {
  analyzeTrackers,
  DEFAULT_GOALS,
  type DayEntry,
  type TrackerId,
} from "@/lib/trackers/core";
import type { MoodEntry } from "@/lib/mood/types";
import type { Habit } from "@/lib/home/habits";
import type { HabitToday } from "@/hooks/useHabits";
import {
  EMPTY_ANSWERS,
  emptyAssessmentState,
  type AssessmentState,
} from "@/lib/assessment/state";
import type { AssessmentSummary } from "@/lib/assessment/summary";
import {
  SAFETY_CLASS_COPY,
  SAFETY_DISCLAIMER,
  type SafetyClass,
} from "@/lib/vitalis/domain/safety";
import {
  OVERVIEW_WINDOW_LABEL,
  recordDayKeys,
  synthesizeOverview,
  type OverviewInput,
} from "./synthesis";

const TODAY = "2026-11-10";

/* ------------------------------- fixtures -------------------------------- */

function day(date: string, patch: Partial<DayEntry> = {}): DayEntry {
  return {
    date,
    sleepMinutes: null,
    bedTime: null,
    wakeTime: null,
    sleepQuality: null,
    waterMl: null,
    sessions: [],
    movementMinutes: null,
    energy: null,
    screenMinutes: null,
    notes: null,
    ...patch,
  };
}

let moodSeq = 0;
function moodOn(date: string, mood: number): MoodEntry {
  moodSeq += 1;
  return {
    id: `mood-${moodSeq}`,
    timestamp: `${date}T12:00:00`,
    mood,
    energy: 5,
    stress: 5,
    emotions: [],
    tags: [],
  };
}

function habit(id: string, patch: Partial<Habit> = {}): Habit {
  return {
    id,
    name: id,
    icon: "bloom",
    iconType: "bloom",
    iconUrl: null,
    color: "amber",
    frequency: "daily",
    points: 10,
    reminderTime: null,
    priority: "medium",
    tags: [],
    goal: null,
    days: [],
    timesPerWeek: null,
    startDate: null,
    note: null,
    createdAt: null,
    archived: false,
    pausedFrom: null,
    pausedUntil: null,
    ...patch,
  };
}

function due(h: Habit, done: boolean): HabitToday {
  return {
    ...h,
    done,
    doneAt: done ? `${TODAY}T08:00:00` : null,
    due: true,
    week: null,
    missedYesterday: null,
  };
}

function assessmentState(patch: Partial<AssessmentState> = {}): AssessmentState {
  return { ...emptyAssessmentState("2026-11-01T00:00:00.000Z"), ...patch };
}

function summary(classification: SafetyClass = "standard"): AssessmentSummary {
  return {
    completedAt: "2026-11-01T00:00:00.000Z",
    sections: [],
    bmi: null,
    safety: {
      classification,
      headline: SAFETY_CLASS_COPY[classification],
      findings: [],
      disclaimer: SAFETY_DISCLAIMER,
    },
    plan: { ready: true, missing: [], note: "" },
  };
}

const completeAssessment = {
  state: assessmentState({ status: "complete", completedAt: "2026-11-01T00:00:00.000Z" }),
  summary: summary(),
};

interface InputPatch {
  trackerDays?: DayEntry[];
  active?: TrackerId[];
  habits?: Partial<OverviewInput["habits"]>;
  moodEntries?: MoodEntry[];
  assessment?: OverviewInput["assessment"];
}

function makeInput(patch: InputPatch = {}): OverviewInput {
  const trackerDays = patch.trackerDays ?? [];
  return {
    today: TODAY,
    habits: {
      all: [],
      logs: [],
      todayHabits: [],
      completedToday: 0,
      dueToday: 0,
      points: null,
      ...(patch.habits ?? {}),
    },
    moodEntries: patch.moodEntries ?? [],
    trackerDays,
    trackers: analyzeTrackers(trackerDays, DEFAULT_GOALS, TODAY, {
      active: patch.active ?? [],
    }),
    assessment: patch.assessment ?? { state: assessmentState(), summary: null },
  };
}

const tick = (habitId: string, date: string) => ({
  habitId,
  date,
  completedAt: `${date}T08:00:00`,
});

/* --------------------------------- state --------------------------------- */

describe("state", () => {
  it("an empty record reads as a beginning, with zeroed facts and no deltas", () => {
    const out = synthesizeOverview(makeInput());
    expect(out.state.headline).toBe("Your Bloom record is just beginning.");
    expect(out.state.recordDays).toBe(0);
    expect(out.state.streak).toBe(0);
    expect(out.state.lines).toEqual([]);
    expect(out.state.facts).toContainEqual({ id: "days", label: "Days logged", value: "0" });
    expect(out.changes.deltas).toEqual([]);
    expect(out.changes.note).toMatch(/Nothing to compare yet/);
  });

  it("counts a day once even when every source touches it (the hero's union)", () => {
    const input = makeInput({
      trackerDays: [day("2026-11-09", { sleepMinutes: 420 })],
      habits: { logs: [tick("h1", "2026-11-09")] },
      moodEntries: [moodOn("2026-11-09", 7)],
    });
    expect(recordDayKeys(input).size).toBe(1);
    expect(synthesizeOverview(input).state.recordDays).toBe(1);
  });

  it("streak follows the shared definition: today, else yesterday, else zero", () => {
    const twoDays = makeInput({
      moodEntries: [moodOn("2026-11-10", 7), moodOn("2026-11-09", 7)],
    });
    expect(synthesizeOverview(twoDays).state.streak).toBe(2);

    const yesterdayOnly = makeInput({ moodEntries: [moodOn("2026-11-09", 7)] });
    expect(synthesizeOverview(yesterdayOnly).state.streak).toBe(1);

    const stale = makeInput({ moodEntries: [moodOn("2026-11-05", 7)] });
    expect(synthesizeOverview(stale).state.streak).toBe(0);
  });

  it("points appear in the facts only when the balance is known", () => {
    const withPoints = synthesizeOverview(
      makeInput({ habits: { points: 405 }, moodEntries: [moodOn("2026-11-09", 7)] }),
    );
    expect(withPoints.state.facts).toContainEqual({
      id: "points",
      label: "Points",
      value: "405",
    });
    const without = synthesizeOverview(makeInput({ moodEntries: [moodOn("2026-11-09", 7)] }));
    expect(without.state.facts.some((f) => f.id === "points")).toBe(false);
  });

  it("a fully written day reads as settled", () => {
    const h = habit("h1");
    const out = synthesizeOverview(
      makeInput({
        habits: { all: [h], todayHabits: [due(h, true)], completedToday: 1, dueToday: 1 },
        moodEntries: [moodOn(TODAY, 8)],
        assessment: completeAssessment,
      }),
    );
    expect(out.state.headline).toMatch(/settled day/);
    expect(out.state.lines).toContain("All 1 of today's habits are done.");
    expect(out.state.lines).toContain("Mood logged at 8/10 today.");
  });

  it("a record with nothing today reads as a blank page, not a failure", () => {
    const out = synthesizeOverview(
      makeInput({ moodEntries: [moodOn("2026-11-02", 7), moodOn("2026-11-03", 6)] }),
    );
    expect(out.state.headline).toMatch(/blank page/);
  });
});

/* -------------------------------- changes -------------------------------- */

describe("changes", () => {
  it("labels its window once, in words", () => {
    expect(OVERVIEW_WINDOW_LABEL).toBe("Last 7 days vs the 7 days before");
    const out = synthesizeOverview(makeInput());
    expect(out.changes.windowLabel).toBe(OVERVIEW_WINDOW_LABEL);
  });

  it("mood delta uses the shared entry-weighted average over both windows", () => {
    const out = synthesizeOverview(
      makeInput({
        moodEntries: [
          moodOn("2026-10-29", 8),
          moodOn("2026-10-31", 8),
          moodOn("2026-11-05", 6),
          moodOn("2026-11-08", 6),
        ],
        assessment: completeAssessment,
      }),
    );
    const mood = out.changes.deltas.find((d) => d.id === "mood");
    expect(mood?.direction).toBe("down");
    expect(mood?.sentence).toContain("averaged 6");
    expect(mood?.sentence).toContain("down from 8");
  });

  it("a mood difference inside the flat band reads as much the same", () => {
    const out = synthesizeOverview(
      makeInput({
        moodEntries: [
          moodOn("2026-10-29", 7),
          moodOn("2026-10-31", 7),
          moodOn("2026-11-05", 7),
          moodOn("2026-11-08", 7.4),
        ],
      }),
    );
    const mood = out.changes.deltas.find((d) => d.id === "mood");
    expect(mood?.direction).toBe("flat");
    expect(mood?.sentence).toMatch(/much the same/);
  });

  it("a single check-in is never spoken as an average", () => {
    const out = synthesizeOverview(makeInput({ moodEntries: [moodOn("2026-11-08", 9)] }));
    expect(out.changes.deltas.some((d) => d.id === "mood")).toBe(false);
    expect(out.state.lines.some((l) => l.includes("averages"))).toBe(false);
  });

  it("a series with only a recent week reads as new, not as growth", () => {
    const out = synthesizeOverview(
      makeInput({ moodEntries: [moodOn("2026-11-05", 6), moodOn("2026-11-08", 8)] }),
    );
    const mood = out.changes.deltas.find((d) => d.id === "mood");
    expect(mood?.direction).toBe("new");
    expect(mood?.sentence).toMatch(/no earlier week to compare yet/);
  });

  it("tracker deltas use the tracker's own formatting and window", () => {
    const out = synthesizeOverview(
      makeInput({
        active: ["sleep"],
        trackerDays: [
          day("2026-10-29", { sleepMinutes: 420 }),
          day("2026-10-31", { sleepMinutes: 420 }),
          day("2026-11-08", { sleepMinutes: 360 }),
          day("2026-11-09", { sleepMinutes: 360 }),
        ],
      }),
    );
    const sleep = out.changes.deltas.find((d) => d.id === "tracker-sleep");
    expect(sleep?.direction).toBe("down");
    expect(sleep?.sentence).toContain("6h");
    expect(sleep?.sentence).toContain("7h");
    expect(sleep?.sentence).toMatch(/last 7 days/);
  });

  it("habit ticks compare as counts, in the open", () => {
    const logs = [
      tick("h1", "2026-10-29"),
      tick("h1", "2026-10-30"),
      tick("h1", "2026-11-01"),
      tick("h1", "2026-11-05"),
      tick("h1", "2026-11-06"),
      tick("h1", "2026-11-07"),
      tick("h1", "2026-11-08"),
      tick("h1", "2026-11-09"),
      tick("h1", "2026-11-10"),
    ];
    const out = synthesizeOverview(makeInput({ habits: { logs } }));
    const ticks = out.changes.deltas.find((d) => d.id === "habit-ticks");
    expect(ticks?.direction).toBe("up");
    expect(ticks?.sentence).toContain("6 times in the last 7 days");
    expect(ticks?.sentence).toContain("up from 3");
  });

  it("a record that began this week says so instead of comparing to empty days", () => {
    const out = synthesizeOverview(
      makeInput({ moodEntries: [moodOn("2026-11-08", 7), moodOn("2026-11-09", 7)] }),
    );
    const days = out.changes.deltas.find((d) => d.id === "days-logged");
    expect(days?.direction).toBe("new");
    expect(days?.sentence).toMatch(/record began this week/);
  });

  it("caps the list at four, strongest movement first", () => {
    const days: DayEntry[] = [];
    for (const d of ["2026-10-29", "2026-10-31"]) {
      days.push(
        day(d, { sleepMinutes: 300, waterMl: 1000, movementMinutes: 10, energy: 2 }),
      );
    }
    for (const d of ["2026-11-08", "2026-11-09"]) {
      days.push(
        day(d, { sleepMinutes: 480, waterMl: 2400, movementMinutes: 60, energy: 5 }),
      );
    }
    const out = synthesizeOverview(
      makeInput({
        active: ["sleep", "water", "movement", "energy"],
        trackerDays: days,
        moodEntries: [
          moodOn("2026-10-29", 4),
          moodOn("2026-10-31", 4),
          moodOn("2026-11-08", 9),
          moodOn("2026-11-09", 9),
        ],
        habits: {
          logs: [tick("h1", "2026-10-29"), ...["2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08", "2026-11-09"].map((d) => tick("h1", d))],
        },
      }),
    );
    expect(out.changes.deltas.length).toBe(4);
    expect(out.changes.note).toBeNull();
  });

  it("an old, thin record gets the honest not-enough-data note", () => {
    const out = synthesizeOverview(makeInput({ moodEntries: [moodOn("2026-10-01", 7)] }));
    /* one habit-tick-free, mood-free pair of windows: only days-logged can
       speak (1 day, long ago — outside both windows it stays silent too) */
    expect(out.changes.note).toMatch(/Not enough logged days yet/);
  });
});

/* ------------------------------- priority -------------------------------- */

describe("priority ladder", () => {
  it("empty record, no habits: first steps, add a habit", () => {
    const out = synthesizeOverview(makeInput());
    expect(out.priority.id).toBe("first-steps");
    expect(out.action).toEqual({ kind: "add-habit", label: "Add your first habit" });
  });

  it("empty record with a due habit: first steps ticks that habit", () => {
    const h = habit("meditate", { name: "Meditate" });
    const out = synthesizeOverview(
      makeInput({
        habits: { all: [h], todayHabits: [due(h, false)], completedToday: 0, dueToday: 1 },
      }),
    );
    expect(out.priority.id).toBe("first-steps");
    expect(out.action.kind).toBe("habit");
    expect(out.action.habitId).toBe("meditate");
  });

  it("safety outranks everything, in the domain's own words", () => {
    const out = synthesizeOverview(
      makeInput({
        assessment: {
          state: assessmentState({
            status: "complete",
            completedAt: "2026-11-01T00:00:00.000Z",
          }),
          summary: summary("professional_review_required"),
        },
        /* even with a silent tracker waiting below it */
        active: ["sleep"],
        trackerDays: [
          day("2026-11-02", { sleepMinutes: 400 }),
          day("2026-11-03", { sleepMinutes: 400 }),
          day("2026-11-04", { sleepMinutes: 400 }),
          day("2026-11-05", { sleepMinutes: 400 }),
        ],
      }),
    );
    expect(out.priority.id).toBe("safety-review");
    expect(out.priority.reason).toBe(SAFETY_CLASS_COPY.professional_review_required);
    expect(out.action.kind).toBe("assessment-summary");
  });

  it("a part-finished assessment is the priority once the record is alive", () => {
    const out = synthesizeOverview(
      makeInput({
        moodEntries: [moodOn("2026-11-09", 7)],
        assessment: { state: assessmentState({ status: "in_progress" }), summary: null },
      }),
    );
    expect(out.priority.id).toBe("assessment-finish");
    expect(out.action.kind).toBe("assessment");
  });

  it("an untaken assessment is the priority for an established record", () => {
    const out = synthesizeOverview(
      makeInput({ moodEntries: [moodOn("2026-11-09", 7), moodOn("2026-11-08", 7)] }),
    );
    expect(out.priority.id).toBe("assessment-start");
    expect(out.action).toEqual({ kind: "assessment", label: "Begin assessment" });
  });

  it("a tracker silent for 3+ days after a real history is the priority", () => {
    const out = synthesizeOverview(
      makeInput({
        assessment: completeAssessment,
        active: ["sleep"],
        trackerDays: [
          day("2026-11-02", { sleepMinutes: 400 }),
          day("2026-11-03", { sleepMinutes: 410 }),
          day("2026-11-04", { sleepMinutes: 390 }),
          day("2026-11-05", { sleepMinutes: 405 }),
        ],
      }),
    );
    expect(out.priority.id).toBe("silent-tracker");
    expect(out.priority.reason).toContain("5 days ago");
    expect(out.action).toEqual({ kind: "metrics", label: "Log sleep" });
  });

  it("a tracker logged two days ago has not gone quiet", () => {
    const out = synthesizeOverview(
      makeInput({
        assessment: completeAssessment,
        active: ["sleep"],
        trackerDays: [
          day("2026-11-06", { sleepMinutes: 400 }),
          day("2026-11-07", { sleepMinutes: 410 }),
          day("2026-11-08", { sleepMinutes: 390 }),
        ],
      }),
    );
    expect(out.priority.id).not.toBe("silent-tracker");
    expect(out.priority.id).toBe("mood-today");
  });

  it("mood down a full point against the prior week becomes the priority", () => {
    const entries = [
      moodOn("2026-10-29", 8),
      moodOn("2026-10-31", 8),
      moodOn("2026-11-05", 6),
      moodOn("2026-11-08", 6),
    ];
    const out = synthesizeOverview(makeInput({ moodEntries: entries, assessment: completeAssessment }));
    expect(out.priority.id).toBe("mood-down");
    expect(out.priority.reason).toContain("(6)");
    expect(out.priority.reason).toContain("(8)");
    expect(out.action.kind).toBe("mood");

    const withToday = synthesizeOverview(
      makeInput({
        moodEntries: [...entries, moodOn(TODAY, 6)],
        assessment: completeAssessment,
      }),
    );
    expect(withToday.priority.id).toBe("mood-down");
    expect(withToday.action).toEqual({
      kind: "link",
      label: "Talk it over with Coach",
      to: "/coach",
    });
  });

  it("a small mood dip does not trigger the mood-down priority", () => {
    const out = synthesizeOverview(
      makeInput({
        moodEntries: [
          moodOn("2026-10-29", 7),
          moodOn("2026-10-31", 7),
          moodOn("2026-11-05", 6.6),
          moodOn("2026-11-08", 6.6),
          moodOn(TODAY, 7),
        ],
        assessment: completeAssessment,
      }),
    );
    expect(out.priority.id).toBe("steady");
  });

  it("sleep down half an hour against its own baseline becomes the priority", () => {
    const out = synthesizeOverview(
      makeInput({
        assessment: completeAssessment,
        active: ["sleep"],
        trackerDays: [
          day("2026-10-29", { sleepMinutes: 420 }),
          day("2026-10-31", { sleepMinutes: 420 }),
          day("2026-11-09", { sleepMinutes: 360 }),
          day("2026-11-10", { sleepMinutes: 360 }),
        ],
      }),
    );
    expect(out.priority.id).toBe("sleep-down");
    expect(out.action).toEqual({
      kind: "link",
      label: "See your sleep record",
      to: "/trackers",
    });
  });

  it("the open high-priority habit wins over lower ones, with its reason", () => {
    const low = habit("stretch", { name: "Stretch", priority: "low" });
    const high = habit("run", { name: "Run", priority: "high" });
    const out = synthesizeOverview(
      makeInput({
        assessment: completeAssessment,
        habits: {
          all: [low, high],
          todayHabits: [due(low, false), due(high, false)],
          completedToday: 0,
          dueToday: 2,
        },
        moodEntries: [moodOn(TODAY, 7)],
      }),
    );
    expect(out.priority.id).toBe("top-habit");
    expect(out.priority.title).toBe("Run");
    expect(out.priority.reason).toMatch(/high priority/);
    expect(out.action.habitId).toBe("run");
  });

  it("all habits done and no mood yet: the check-in completes the day", () => {
    const h = habit("h1");
    const out = synthesizeOverview(
      makeInput({
        assessment: completeAssessment,
        habits: { all: [h], todayHabits: [due(h, true)], completedToday: 1, dueToday: 1 },
        moodEntries: [moodOn("2026-11-01", 7)],
      }),
    );
    expect(out.priority.id).toBe("mood-today");
    expect(out.action.kind).toBe("mood");
  });

  it("a complete day reads as steady, steering by the assessment goal", () => {
    const h = habit("h1");
    const state = assessmentState({
      status: "complete",
      completedAt: "2026-11-01T00:00:00.000Z",
      answers: { ...EMPTY_ANSWERS, goal: "general_health" },
    });
    const out = synthesizeOverview(
      makeInput({
        assessment: { state, summary: summary() },
        habits: { all: [h], todayHabits: [due(h, true)], completedToday: 1, dueToday: 1 },
        moodEntries: [moodOn(TODAY, 8)],
      }),
    );
    expect(out.priority.id).toBe("steady");
    expect(out.priority.reason).toContain("general health");
    expect(out.action).toEqual({
      kind: "link",
      label: "See your weekly report",
      to: "/report",
    });
  });
});
