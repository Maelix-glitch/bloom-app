import { describe, expect, it } from "vitest";

import type { DayLog } from "./dayLogs";
import { addDays, type PeriodLog } from "./predict";
import {
  bleedRunFrom,
  classifyBleedDay,
  EMPTY_MEMORY,
  pruneMemory,
  reconcile,
  remember,
  type CheckIn,
} from "./reconcile";
import { analyzeCycle } from "./predict";

const TODAY = "2026-09-07";
const ago = (n: number) => addDays(TODAY, -n);

/** Four steady 29-day cycles; the latest one started `lastStartAgo` days ago. */
function history(lastStartAgo: number, lastEnd: string | null = null): PeriodLog[] {
  const s = ago(lastStartAgo);
  return [
    { id: "a", start: addDays(s, -87), end: addDays(s, -83), flow: "medium" },
    { id: "b", start: addDays(s, -58), end: addDays(s, -54), flow: "medium" },
    { id: "c", start: addDays(s, -29), end: addDays(s, -25), flow: "heavy" },
    { id: "d", start: s, end: lastEnd, flow: "medium" },
  ];
}

const day = (date: string, flow: NonNullable<DayLog["flow"]> | null): DayLog => ({ date, flow });

const kinds = (list: CheckIn[]) => list.map((c) => c.kind);
const find = (list: CheckIn[], kind: CheckIn["kind"]) => list.find((c) => c.kind === kind);

describe("reconcile · ended early", () => {
  it('asks "did your period end early?" when a no-bleed day is logged on day 4 of an open period', () => {
    const logs = history(3); // started 3 days ago → today is day 4
    const days = [
      day(ago(3), "heavy"),
      day(ago(2), "medium"),
      day(ago(1), "light"),
      day(TODAY, "none"),
    ];
    const out = reconcile({ logs, days, today: TODAY });
    const q = find(out, "ended-early");
    expect(q).toBeDefined();
    expect(q!.title).toBe("Bleeding stopped on day 3 — did your period end early?");
    const yes = q!.actions.find((a) => a.id === "yes")!;
    expect(yes.resolution).toEqual({ type: "set-end", periodId: "d", end: ago(1) });
    expect(q!.actions.map((a) => a.label)).toContain("No, it's continuing");
    expect(q!.actions.map((a) => a.label)).toContain("Not now");
  });

  it("does not ask when the recorded end already matches", () => {
    const logs = history(3, ago(1));
    const days = [day(TODAY, "none")];
    expect(find(reconcile({ logs, days, today: TODAY }), "ended-early")).toBeUndefined();
  });

  it("does not ask when bleeding resumes after the quiet day (that's a different question)", () => {
    const logs = history(4);
    const days = [day(ago(2), "none"), day(ago(1), "medium")];
    expect(find(reconcile({ logs, days, today: TODAY }), "ended-early")).toBeUndefined();
  });

  it("stays quiet once the person says it's continuing", () => {
    const logs = history(3);
    const days = [day(TODAY, "none")];
    const first = reconcile({ logs, days, today: TODAY });
    const q = find(first, "ended-early")!;
    const memory = remember(EMPTY_MEMORY, q.id, "dismiss", TODAY);
    expect(find(reconcile({ logs, days, today: TODAY, memory }), "ended-early")).toBeUndefined();
  });

  it('"Not now" parks the question for two days, then it comes back', () => {
    const logs = history(3);
    const days = [day(TODAY, "none")];
    const q = find(reconcile({ logs, days, today: TODAY }), "ended-early")!;
    const memory = remember(EMPTY_MEMORY, q.id, "snooze", TODAY);
    expect(find(reconcile({ logs, days, today: TODAY, memory }), "ended-early")).toBeUndefined();
    expect(
      find(reconcile({ logs, days, today: addDays(TODAY, 1), memory }), "ended-early"),
    ).toBeUndefined();
    expect(
      find(reconcile({ logs, days, today: addDays(TODAY, 3), memory }), "ended-early"),
    ).toBeDefined();
  });
});

describe("reconcile · continued", () => {
  it('asks "did it continue?" when bleeding is logged the day after the recorded last day', () => {
    const logs = history(5, ago(1)); // ended yesterday
    const days = [day(TODAY, "light")];
    const q = find(reconcile({ logs, days, today: TODAY }), "continued");
    expect(q).toBeDefined();
    expect(q!.title).toBe("You logged bleeding the day after your period ended — did it continue?");
    expect(q!.actions.find((a) => a.id === "yes")!.resolution).toEqual({
      type: "set-end",
      periodId: "d",
      end: TODAY,
    });
    expect(q!.actions.some((a) => a.resolution.type === "focus-form")).toBe(true);
  });

  it("extends to the end of the run that follows, not just the first day", () => {
    const logs = history(6, ago(3));
    const days = [day(ago(2), "light"), day(ago(1), "light")];
    const q = find(reconcile({ logs, days, today: TODAY }), "continued")!;
    expect(q.actions[0]!.resolution).toEqual({ type: "set-end", periodId: "d", end: ago(1) });
  });
});

describe("reconcile · same period vs new period", () => {
  it("treats a bleed two days after an older period as the same period, never a new cycle", () => {
    // the latest entry is open with no end; usual bleed length 5 → covers days 1–5
    const logs = history(8); // day 9 today; usual covers through day 5
    const days = [day(ago(2), "medium")]; // day 7 → 2 days after the covered end
    const out = reconcile({ logs, days, today: TODAY });
    const q = find(out, "same-period");
    expect(q).toBeDefined();
    expect(q!.actions[0]!.resolution).toEqual({ type: "set-end", periodId: "d", end: ago(2) });
    const asNew = q!.actions.find((a) => a.id === "new")!;
    expect(asNew.resolution).toEqual({
      type: "add-period",
      start: ago(2),
      end: null,
      flow: "medium",
    });
  });

  it("asks whether an unexplained bleed run far from any entry was a period starting", () => {
    const logs = history(40, ago(36)); // last period long over; nothing logged since
    const days = [day(ago(10), "medium"), day(ago(9), "heavy"), day(ago(8), "light")];
    const out = reconcile({ logs, days, today: TODAY });
    const q = find(out, "new-period");
    expect(q).toBeDefined();
    expect(q!.actions[0]!.resolution).toEqual({
      type: "add-period",
      start: ago(10),
      end: ago(8),
      flow: "heavy",
    });
  });

  it("never proposes a new period inside the 15-day implausible window", () => {
    const logs = history(12, ago(8));
    const days = [day(ago(1), "light")]; // 11 days after the last start, 7 after its end
    const out = reconcile({ logs, days, today: TODAY });
    expect(find(out, "new-period")).toBeUndefined();
    expect(find(out, "same-period")).toBeUndefined();
  });

  it("ignores spotting entirely — it is not a period day", () => {
    const logs = history(20, ago(16));
    const days: DayLog[] = [{ date: ago(2), flow: "spotting" }];
    expect(kinds(reconcile({ logs, days, today: TODAY }))).toEqual([]);
    // the same day with a real bleed WOULD be asked about
    expect(kinds(reconcile({ logs, days: [day(ago(2), "light")], today: TODAY }))).toEqual([
      "new-period",
    ]);
  });
});

describe("reconcile · still open · late · missed", () => {
  it("asks for the last day when an open period runs well past the usual length", () => {
    const logs = history(9); // day 10 with no end; usual 5 + grace 2
    const q = find(reconcile({ logs, days: [], today: TODAY }), "still-open");
    expect(q).toBeDefined();
    expect(q!.actions[0]!.resolution).toEqual({ type: "set-end", periodId: "d", end: ago(5) });
    expect(q!.actions.some((a) => a.resolution.type === "edit-period")).toBe(true);
  });

  it("does not nag about an open period that is still inside its usual length", () => {
    const logs = history(4);
    expect(find(reconcile({ logs, days: [], today: TODAY }), "still-open")).toBeUndefined();
  });

  it('asks "has it started?" once the predicted date is three days past', () => {
    const logs = history(32, ago(28)); // average 29 → due 3 days ago
    const q = find(reconcile({ logs, days: [], today: TODAY }), "late");
    expect(q).toBeDefined();
    expect(q!.title).toBe("Your period was due 3 days ago — has it started?");
    expect(q!.actions[0]!.resolution).toEqual({
      type: "focus-form",
      date: TODAY,
      startPeriod: true,
    });
  });

  it("asks ONE question when late and a bleed is already in the daily log", () => {
    const logs = history(33, ago(29));
    const days = [day(ago(2), "medium")];
    const list = reconcile({ logs, days, today: TODAY });
    // the bleed is the sharper question — "was that a period starting?" — so
    // the late card steps aside instead of asking the same thing twice
    expect(kinds(list)).toEqual(["new-period"]);
    const q = list[0]!;
    expect(q.actions[0]!.label).toContain("period started");
    expect(q.actions[0]!.resolution).toMatchObject({ type: "add-period", start: ago(2) });
  });

  it("never asks 'has it started?' against the population fallback", () => {
    // one period, a natural 35-day body, day 32: the 28-day guess is 3 days past
    const logs: PeriodLog[] = [{ id: "only", start: ago(31), end: ago(27) }];
    expect(find(reconcile({ logs, days: [], today: TODAY }), "late")).toBeUndefined();
  });

  it("waits a week past a rough (low-confidence) estimate before asking", () => {
    const logs: PeriodLog[] = [
      { id: "a", start: ago(93) },
      { id: "b", start: ago(64) },
      { id: "c", start: ago(35) }, // 2 usable cycles → low; average 29 → due 6 days ago
    ];
    expect(find(reconcile({ logs, days: [], today: TODAY }), "late")).toBeUndefined();
    const later = reconcile({ logs, days: [], today: addDays(TODAY, 1) }); // 7 days past
    const q = find(later, "late");
    expect(q).toBeDefined();
    expect(q!.title).toMatch(/roughly expected/);
  });

  it("stops asking whether an open period has finished once it is plainly over", () => {
    // day 10 with no end: asked (usual 5 + grace 2 < 10 <= 5 + 10)
    expect(
      find(reconcile({ logs: history(9), days: [], today: TODAY }), "still-open"),
    ).toBeDefined();
    // day 20: no longer asked — the answer is obvious and the estimate assumes the usual length
    expect(
      find(reconcile({ logs: history(19), days: [], today: TODAY }), "still-open"),
    ).toBeUndefined();
  });

  it("does not ask 'has it finished?' alongside 'has it started?' for the same period", () => {
    // open latest period, 33 days on: late (medium confidence) — still-open would be noise
    const logs = history(33);
    const list = reconcile({ logs, days: [], today: TODAY });
    expect(kinds(list)).toContain("late");
    expect(kinds(list)).not.toContain("still-open");
  });

  it("'it really was that long' teaches the engine instead of just dismissing", () => {
    const logs: PeriodLog[] = [
      { id: "x", start: ago(87) },
      { id: "y", start: ago(29) }, // 58-day gap — alone
      { id: "z", start: ago(0) },
    ];
    const q = find(reconcile({ logs, days: [], today: TODAY }), "missed-log")!;
    const none = q.actions.find((a) => a.id === "none")!;
    expect(none.resolution).toEqual({ type: "accept-long-cycles", days: 58 });
    // once accepted, the gap is a cycle and the question is gone
    const accepted = analyzeCycle(logs, TODAY, { personalMaxPlausible: 58 });
    expect(accepted.cycleLengths).toEqual([58, 29]);
    expect(
      find(reconcile({ logs, days: [], today: TODAY, analysis: accepted }), "missed-log"),
    ).toBeUndefined();
  });

  it("a months-long gap can only be dismissed, never accepted as one cycle", () => {
    const logs: PeriodLog[] = [
      { id: "x", start: ago(229) },
      { id: "y", start: ago(29) }, // 200 days — postpartum, contraception, whatever it was
      { id: "z", start: ago(0) },
    ];
    const q = find(reconcile({ logs, days: [], today: TODAY }), "missed-log")!;
    expect(q.actions.find((a) => a.id === "none")!.resolution).toEqual({ type: "dismiss" });
  });

  it("is silent for a person whose cycles simply run long", () => {
    const logs: PeriodLog[] = [
      { id: "a", start: ago(155), end: ago(151) },
      { id: "b", start: ago(103), end: ago(99) }, // 52
      { id: "c", start: ago(55), end: ago(51) }, // 48
      { id: "d", start: ago(3), end: null }, // 52 — day 4, still bleeding
    ];
    expect(reconcile({ logs, days: [], today: TODAY })).toEqual([]);
  });

  it("points at the midpoint of an implausibly long gap", () => {
    const logs: PeriodLog[] = [
      { id: "x", start: ago(100), end: null },
      { id: "y", start: ago(10), end: ago(6) },
    ];
    const q = find(reconcile({ logs, days: [], today: TODAY }), "missed-log");
    expect(q).toBeDefined();
    expect(q!.actions[0]!.resolution).toEqual({
      type: "focus-form",
      date: ago(55),
      startPeriod: true,
    });
  });

  it("is silent on a clean, closed, on-time record", () => {
    const logs = history(10, ago(6));
    const days = [day(ago(10), "medium"), day(ago(7), "light"), day(ago(6), "light")];
    expect(reconcile({ logs, days, today: TODAY })).toEqual([]);
  });

  it("is silent with nothing logged at all", () => {
    expect(reconcile({ logs: [], days: [], today: TODAY })).toEqual([]);
  });
});

describe("classifyBleedDay — what pre-ticks 'first day of a period'", () => {
  const logs = history(10, ago(6));
  const analysis = analyzeCycle(logs, TODAY);

  it("the start day itself is inside its own period", () => {
    expect(classifyBleedDay(ago(10), logs, analysis)).toMatchObject({
      kind: "inside",
      dayOfPeriod: 1,
    });
  });
  it("day 3 of a period is inside, not a new start", () => {
    expect(classifyBleedDay(ago(8), logs, analysis)).toMatchObject({
      kind: "inside",
      dayOfPeriod: 3,
    });
  });
  it("two days after the last day is adjacent", () => {
    expect(classifyBleedDay(ago(4), logs, analysis)).toMatchObject({
      kind: "adjacent",
      daysAfterEnd: 2,
    });
  });
  it("nine days after the start is too soon to be a cycle", () => {
    expect(classifyBleedDay(ago(1), logs, analysis)).toMatchObject({
      kind: "soon-after",
      daysSinceStart: 9,
    });
  });
  it("a date long after everything is a plausible new start", () => {
    expect(classifyBleedDay(addDays(TODAY, 20), logs, analysis)).toMatchObject({ kind: "new" });
  });
  it("with no entries at all, any bleed is a new start", () => {
    expect(classifyBleedDay(TODAY, [], analyzeCycle([], TODAY))).toEqual({
      kind: "new",
      daysSinceStart: null,
    });
  });
});

describe("helpers", () => {
  it("bleedRunFrom tolerates one quiet day but stops after two", () => {
    const byDate = new Map<string, DayLog>();
    for (const d of [day(ago(6), "medium"), day(ago(4), "light"), day(ago(1), "heavy")]) {
      byDate.set(d.date, d);
    }
    const run = bleedRunFrom(ago(6), byDate, TODAY);
    expect(run.map((d) => d.date)).toEqual([ago(6), ago(4)]);
  });

  it("pruneMemory forgets entries that no longer exist and expired snoozes", () => {
    const memory = {
      dismissed: { "ended-early:d:2026-09-01": TODAY, "ended-early:zzz:2026-09-01": TODAY },
      snoozed: { "late:d:2026-09-10": addDays(TODAY, 1), "late:d:2026-08-10": ago(1) },
    };
    const pruned = pruneMemory(memory, history(3), TODAY);
    expect(Object.keys(pruned.dismissed)).toEqual(["ended-early:d:2026-09-01"]);
    expect(Object.keys(pruned.snoozed)).toEqual(["late:d:2026-09-10"]);
  });
});
