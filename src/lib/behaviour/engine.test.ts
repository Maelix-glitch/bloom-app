/**
 * Behaviour Change (System 8) — the right-moment engine, pinned.
 *
 * Every detector must earn its voice from real evidence: no pattern,
 * no nudge. The ranking is one primary (plus one secondary of a
 * different kind), and the quiet rules — dismiss rests a kind, snooze
 * hides for today, never the identical nudge on consecutive days —
 * hold exactly as documented in engine.ts.
 */

import { describe, expect, it } from "vitest";

import type { Habit, HabitLog } from "@/lib/home/habits";
import type { WeighIn } from "@/lib/health/body";
import type { MoodEntry } from "@/lib/mood/types";
import type { LogEntry, Meal } from "@/lib/nutrition/types";
import { EMPTY_NUDGE_STATE, type NudgeState } from "./state";
import { selectNudges, type NudgeInputs } from "./engine";

const TODAY = "2026-11-18"; // a Wednesday
const YESTERDAY = "2026-11-17";

/** ISO timestamp for a local wall-clock time on a day key — parses
 *  back to the same local time in any timezone. */
const at = (day: string, hh: number, mm = 0): string => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y!, m! - 1, d!, hh, mm).toISOString();
};

/** `n` consecutive day keys ending on `end`, newest first. */
const daysBack = (end: string, n: number): string[] => {
  const out: string[] = [];
  const [y, m, d] = end.split("-").map(Number);
  for (let i = 0; i < n; i++) {
    const dt = new Date(y!, m! - 1, d! - i);
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    out.push(key);
  }
  return out;
};

const habit = (over: Partial<Habit> = {}): Habit => ({
  id: "h1",
  name: "Read",
  icon: "📖",
  iconType: "emoji",
  iconUrl: null,
  color: "sky",
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
  ...over,
});

const habitLog = (day: string, hh = 7, mm = 30, habitId = "h1"): HabitLog => ({
  habitId,
  date: day,
  completedAt: at(day, hh, mm),
});

const entry = (day: string, meal: Meal, hh = 8, mm = 0): LogEntry => ({
  id: `${day}-${meal}`,
  day,
  meal,
  foodId: null,
  snapshot: null,
  name: "Something",
  amount: { grams: 100 },
  nutrients: { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  provenance: { kind: "user_entered", sourceId: "log-fixture", label: "Your value" },
  source: "search",
  createdAt: at(day, hh, mm),
});

const moodEntry = (day: string, hh = 9, mm = 0): MoodEntry => ({
  id: `mood-${day}-${hh}`,
  timestamp: at(day, hh, mm),
  mood: 7,
  energy: 6,
  stress: 3,
  emotions: [],
  tags: [],
});

const base = (over: Partial<NudgeInputs> = {}): NudgeInputs => ({
  today: TODAY,
  nowMinutes: 12 * 60,
  habits: [],
  habitLogs: [],
  foodEntries: [],
  plan: null,
  weighIns: [],
  moodEntries: [],
  ...over,
});

const state = (over: Partial<NudgeState> = {}): NudgeState => ({
  ...EMPTY_NUDGE_STATE,
  dismissed: {},
  snoozed: {},
  lastShown: {},
  ...over,
});

/* --------------------------------- habit --------------------------------- */

describe("habit detector", () => {
  const sixDays = daysBack(YESTERDAY, 6).map((d) => habitLog(d));

  it("fires past the usual time, naming the streak and the usual time", () => {
    const { primary } = selectNudges(base({ habits: [habit()], habitLogs: sixDays }), state());
    expect(primary?.kind).toBe("habit");
    expect(primary?.key).toBe("habit:h1");
    expect(primary?.detail).toContain("6 days in a row");
    expect(primary?.detail).toContain("7:30 AM");
    expect(primary?.action).toEqual({ kind: "toggle-habit", habitId: "h1" });
  });

  it("stays silent before the usual time", () => {
    const { primary } = selectNudges(
      base({ habits: [habit()], habitLogs: sixDays, nowMinutes: 6 * 60 }),
      state(),
    );
    expect(primary).toBeNull();
  });

  it("stays silent when the habit is already ticked today", () => {
    const { primary } = selectNudges(
      base({ habits: [habit()], habitLogs: [...sixDays, habitLog(TODAY)] }),
      state(),
    );
    expect(primary).toBeNull();
  });

  it("stays silent with too little history — two ticks are not a pattern", () => {
    const { primary } = selectNudges(
      base({ habits: [habit()], habitLogs: daysBack(YESTERDAY, 2).map((d) => habitLog(d)) }),
      state(),
    );
    expect(primary).toBeNull();
  });

  it("falls back to a recent-days pattern when tick times are unusable", () => {
    // Ticks on 4 of the last 7 days, but their timestamps never
    // survived (an import's corrupt values): no usual time can be
    // derived, yet the days themselves are real evidence.
    const logs = daysBack(YESTERDAY, 4).map((d) => ({
      habitId: "h1",
      date: d,
      completedAt: "not-a-timestamp",
    }));
    const { primary } = selectNudges(base({ habits: [habit()], habitLogs: logs }), state());
    expect(primary?.kind).toBe("habit");
    expect(primary?.detail).toContain("4 of the last 7 days");
  });

  it("stays silent for an abandoned habit — an old usual time is not a live pattern", () => {
    const old = daysBack("2026-11-05", 6).map((d) => habitLog(d));
    const { primary } = selectNudges(base({ habits: [habit()], habitLogs: old }), state());
    expect(primary).toBeNull();
  });

  it("an archived habit never fires", () => {
    const { primary } = selectNudges(
      base({ habits: [habit({ archived: true })], habitLogs: sixDays }),
      state(),
    );
    expect(primary).toBeNull();
  });
});

/* ---------------------------------- meal --------------------------------- */

describe("meal detector", () => {
  const breakfasts = daysBack(YESTERDAY, 6).map((d) => entry(d, "breakfast", 8, 15));
  // A plan for today is present throughout, so the plan detector —
  // which reads the same food log — stays out of these assertions.
  const planToday = { day: TODAY } as NudgeInputs["plan"];
  const mealBase = (over: Partial<NudgeInputs> = {}) =>
    base({ foodEntries: breakfasts, plan: planToday, ...over });

  it("fires for a streak meal past its usual time, naming the streak", () => {
    const { primary } = selectNudges(mealBase(), state());
    expect(primary?.kind).toBe("meal");
    expect(primary?.key).toBe("meal:breakfast");
    expect(primary?.detail).toContain("logged breakfast 6 days in a row");
    expect(primary?.detail).toContain("8:15 AM");
  });

  it("stays silent before the usual time and once logged today", () => {
    expect(selectNudges(mealBase({ nowMinutes: 7 * 60 }), state()).primary).toBeNull();
    expect(
      selectNudges(mealBase({ foodEntries: [...breakfasts, entry(TODAY, "breakfast")] }), state())
        .primary,
    ).toBeNull();
  });

  it("a two-day streak is not a pattern", () => {
    const two = daysBack(YESTERDAY, 2).map((d) => entry(d, "breakfast", 8, 15));
    expect(selectNudges(mealBase({ foodEntries: two }), state()).primary).toBeNull();
  });

  it("a broken streak (missed yesterday) stays silent", () => {
    const broken = daysBack("2026-11-16", 5).map((d) => entry(d, "breakfast", 8, 15));
    expect(selectNudges(mealBase({ foodEntries: broken }), state()).primary).toBeNull();
  });
});

/* ---------------------------------- mood --------------------------------- */

describe("mood detector", () => {
  const checkIns = daysBack(YESTERDAY, 5).map((d) => moodEntry(d, 9, 0));

  it("fires when a daily-ish routine is missing today, past the usual time", () => {
    const { primary } = selectNudges(base({ moodEntries: checkIns }), state());
    expect(primary?.kind).toBe("mood");
    expect(primary?.detail).toContain("5 of the last 7 days");
    expect(primary?.detail).toContain("9:00 AM");
  });

  it("stays silent with only two check-ins in the week — not a routine", () => {
    const two = daysBack(YESTERDAY, 2).map((d) => moodEntry(d));
    expect(selectNudges(base({ moodEntries: two }), state()).primary).toBeNull();
  });

  it("stays silent once checked in today", () => {
    const withToday = [...checkIns, moodEntry(TODAY, 8, 0)];
    expect(selectNudges(base({ moodEntries: withToday }), state()).primary).toBeNull();
  });
});

/* ---------------------------------- plan --------------------------------- */

describe("plan detector", () => {
  // Snack entries build the logging routine without ever being a
  // streak meal, so the meal detector stays out of these assertions.
  const lunches = daysBack(YESTERDAY, 4).map((d) => entry(d, "snack", 13, 0));

  it("fires when no plan exists for today and logging usually started by now", () => {
    const { primary } = selectNudges(base({ foodEntries: lunches, nowMinutes: 15 * 60 }), state());
    expect(primary?.kind).toBe("plan");
    expect(primary?.detail).toContain("started logging by 1:00 PM");
  });

  it("names the last plan's day when a stale plan is stored", () => {
    const plan = { day: "2026-11-16" } as NudgeInputs["plan"];
    const { primary } = selectNudges(base({ foodEntries: lunches, nowMinutes: 15 * 60, plan }), state());
    expect(primary?.detail).toContain("Your last plan was for Mon 16 Nov");
  });

  it("stays silent before the usual first-log time", () => {
    expect(
      selectNudges(base({ foodEntries: lunches, nowMinutes: 10 * 60 }), state()).primary,
    ).toBeNull();
  });

  it("stays silent when a plan for today exists", () => {
    const plan = { day: TODAY } as NudgeInputs["plan"];
    expect(
      selectNudges(base({ foodEntries: lunches, nowMinutes: 15 * 60, plan }), state()).primary,
    ).toBeNull();
  });
});

/* -------------------------------- weigh-in ------------------------------- */

describe("weigh-in detector", () => {
  const routine: WeighIn[] = [
    { date: "2026-10-21", kg: 101 },
    { date: "2026-10-28", kg: 100.6 },
    { date: "2026-11-04", kg: 100.2 },
    { date: "2026-11-09", kg: 100 },
  ];

  it("fires on a real gap in a weekly routine, naming the last weigh-in", () => {
    const { primary } = selectNudges(base({ weighIns: routine }), state());
    expect(primary?.kind).toBe("weigh-in");
    expect(primary?.title).toContain("9 days");
    expect(primary?.detail).toContain("100 kg");
  });

  it("stays silent inside the gap threshold", () => {
    const recent: WeighIn[] = [
      { date: "2026-11-08", kg: 100 },
      { date: "2026-11-15", kg: 99.8 },
    ];
    expect(selectNudges(base({ weighIns: recent }), state()).primary).toBeNull();
  });

  it("stays silent for a monthly routine — a 9-day gap is normal there", () => {
    const monthly: WeighIn[] = [
      { date: "2026-09-10", kg: 102 },
      { date: "2026-10-10", kg: 101 },
      { date: "2026-11-09", kg: 100 },
    ];
    expect(selectNudges(base({ weighIns: monthly }), state()).primary).toBeNull();
  });

  it("one weigh-in ever is not a routine", () => {
    expect(
      selectNudges(base({ weighIns: [{ date: "2026-11-01", kg: 100 }] }), state()).primary,
    ).toBeNull();
  });
});

/* --------------------------- ranking + quiet rules ------------------------ */

describe("ranking and quiet rules", () => {
  const habitLogs = daysBack(YESTERDAY, 6).map((d) => habitLog(d));
  const breakfasts = daysBack(YESTERDAY, 6).map((d) => entry(d, "breakfast", 8, 15));
  const both = base({ habits: [habit()], habitLogs, foodEntries: breakfasts });

  it("the habit (most perishable) outranks the meal; the meal is secondary", () => {
    const { primary, secondary } = selectNudges(both, state());
    expect(primary?.kind).toBe("habit");
    expect(secondary?.kind).toBe("meal");
  });

  it("a dismissed kind rests: the meal takes the primary slot", () => {
    const { primary, secondary } = selectNudges(both, state({ dismissed: { habit: TODAY } }));
    expect(primary?.kind).toBe("meal");
    // The same food log also supports a plan nudge — it becomes the
    // secondary rather than disappearing.
    expect(secondary?.kind).toBe("plan");
  });

  it("the rest lasts three days, then the kind may speak again", () => {
    const dismissed = state({ dismissed: { habit: "2026-11-16" } });
    // Dismissed on the 16th: the 18th is still inside the rest.
    expect(selectNudges(both, dismissed).primary?.kind).toBe("meal");
    // On the 19th the rest has elapsed (16th + 3 days), and a record
    // that still supports the habit nudge lets it lead again.
    const day19 = base({
      habits: [habit()],
      habitLogs: daysBack("2026-11-18", 6).map((d) => habitLog(d)),
      today: "2026-11-19",
    });
    expect(selectNudges(day19, dismissed).primary?.kind).toBe("habit");
  });

  it("a snoozed nudge is hidden for today only", () => {
    const snoozed = state({ snoozed: { "habit:h1": TODAY } });
    const { primary } = selectNudges(both, snoozed);
    expect(primary?.kind).toBe("meal");
    const yesterday = state({ snoozed: { "habit:h1": YESTERDAY } });
    expect(selectNudges(both, yesterday).primary?.kind).toBe("habit");
  });

  it("the identical nudge is never shown on consecutive days", () => {
    const shownYesterday = state({ lastShown: { "habit:h1": YESTERDAY } });
    const { primary } = selectNudges(both, shownYesterday);
    expect(primary?.kind).toBe("meal");
    // Shown today already (a re-render) is fine — same day, same nudge.
    const shownToday = state({ lastShown: { "habit:h1": TODAY } });
    expect(selectNudges(both, shownToday).primary?.kind).toBe("habit");
  });

  it("an empty record earns silence — no nudge at all", () => {
    const { primary, secondary } = selectNudges(base(), state());
    expect(primary).toBeNull();
    expect(secondary).toBeNull();
  });
});
