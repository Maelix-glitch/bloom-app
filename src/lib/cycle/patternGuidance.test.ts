// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";

import {
  addDays,
  analyzeCycle,
  type CycleAnalysis,
  type PeriodLog,
} from "./predict";
import type { DayLog } from "./dayLogs";
import {
  cyclePatterns,
  dismissPattern,
  loadPatternDismissals,
  visiblePatterns,
  type PatternNotice,
} from "./patternGuidance";

/**
 * Red-flag pattern guidance (Wave B9). Every rule needs repetition or a
 * large unexplained stretch — the negative pins matter as much as the
 * positive ones: a single slightly late period must NEVER produce a notice.
 */

const log = (start: string, end: string | null = null): PeriodLog => ({
  id: `p-${start}`,
  start,
  end,
});

/** Period starts spaced by the given cycle lengths, each bleeding 5 days. */
function series(first: string, lengths: number[], bleedDays = 5): PeriodLog[] {
  const starts = [first];
  for (const len of lengths) starts.push(addDays(starts[starts.length - 1]!, len));
  return starts.map((s) => log(s, addDays(s, bleedDays - 1)));
}

function run(
  logs: PeriodLog[],
  days: DayLog[],
  opts: { today: string; expecting?: boolean; personalMaxPlausible?: number },
): PatternNotice[] {
  const analysis: CycleAnalysis = analyzeCycle(logs, opts.today);
  return cyclePatterns({
    logs,
    days,
    analysis,
    expecting: opts.expecting ?? true,
    personalMaxPlausible: opts.personalMaxPlausible ?? 75,
  });
}

const ids = (notices: PatternNotice[]) => notices.map((n) => n.id);

describe("cyclePatterns — repetition rules", () => {
  it("flags repeated short cycles", () => {
    const logs = series("2026-01-01", [20, 20, 28]);
    expect(ids(run(logs, [], { today: "2026-03-10" }))).toContain("short-cycles");
  });

  it("flags repeated long cycles — unless the person vouched for them", () => {
    const logs = series("2026-01-01", [40, 42, 28]);
    expect(ids(run(logs, [], { today: "2026-04-25", personalMaxPlausible: 45 }))).toContain(
      "long-cycles",
    );
    expect(ids(run(logs, [], { today: "2026-04-25", personalMaxPlausible: 75 }))).not.toContain(
      "long-cycles",
    );
  });

  it("flags a swing over 9 days", () => {
    const logs = series("2026-01-01", [24, 36, 25, 35]);
    expect(ids(run(logs, [], { today: "2026-05-01" }))).toContain("irregular-swing");
  });

  it("flags bleeding over 7 days when it repeats", () => {
    const logs = series("2026-01-01", [28, 28, 28], 9);
    expect(ids(run(logs, [], { today: "2026-04-01" }))).toContain("long-bleeds");
  });

  it("stays silent on an ordinary, steady record", () => {
    const logs = series("2026-01-01", [28, 29, 28, 27]);
    expect(run(logs, [], { today: "2026-04-25" })).toEqual([]);
  });

  it("NEVER flags a single slightly late period", () => {
    const logs = series("2026-01-01", [28, 28]);
    /* Predicted around 26 Mar; on 30 Mar the period is a few days late on
       an otherwise steady record — the classic false alarm. */
    expect(run(logs, [], { today: "2026-03-30" })).toEqual([]);
  });
});

describe("cyclePatterns — the missed-period rule respects explanations", () => {
  const gapped = (): PeriodLog[] => [
    log("2026-01-01", "2026-01-05"),
    log("2026-01-29", "2026-02-02"),
    log("2026-05-04", "2026-05-08"), // 95 days after the previous start
    log("2026-06-01", "2026-06-05"),
  ];

  it("flags a stretch of three missed periods", () => {
    expect(ids(run(gapped(), [], { today: "2026-06-20" }))).toContain("missed-periods");
  });

  it("stays silent when tracking is not expecting (paused / off)", () => {
    expect(ids(run(gapped(), [], { today: "2026-06-20", expecting: false }))).not.toContain(
      "missed-periods",
    );
  });

  it("stays silent when the stretch is inside the person's own ceiling", () => {
    expect(
      ids(run(gapped(), [], { today: "2026-06-20", personalMaxPlausible: 120 })),
    ).not.toContain("missed-periods");
  });
});

describe("cyclePatterns — what the day log can see", () => {
  it("flags heavy flow repeating across periods (heavy days)", () => {
    const logs = series("2026-01-01", [28, 28, 28]);
    const days: DayLog[] = [];
    for (const p of [logs[0]!, logs[1]!]) {
      for (let i = 0; i < 3; i++) days.push({ date: addDays(p.start, i), flow: "heavy" });
    }
    expect(ids(run(logs, days, { today: "2026-04-01" }))).toContain("heavy-flow");
  });

  it("flags heavy flow from clots days alone", () => {
    const logs = series("2026-01-01", [28, 28, 28]);
    const days: DayLog[] = [];
    for (const p of [logs[1]!, logs[2]!]) {
      for (let i = 0; i < 2; i++) days.push({ date: addDays(p.start, i), flow: "medium", clots: true });
    }
    expect(ids(run(logs, days, { today: "2026-04-01" }))).toContain("heavy-flow");
  });

  it("does not flag one heavy period on its own", () => {
    const logs = series("2026-01-01", [28, 28, 28]);
    const days: DayLog[] = [0, 1, 2].map((i) => ({
      date: addDays(logs[0]!.start, i),
      flow: "heavy" as const,
    }));
    expect(ids(run(logs, days, { today: "2026-04-01" }))).not.toContain("heavy-flow");
  });

  it("flags spotting between periods in more than one cycle", () => {
    const logs = series("2026-01-01", [28, 28, 28]);
    const days: DayLog[] = [
      { date: addDays(logs[0]!.start, 14), flow: "spotting" },
      { date: addDays(logs[1]!.start, 15), flow: "spotting" },
    ];
    expect(ids(run(logs, days, { today: "2026-04-01" }))).toContain("intermenstrual-spotting");
  });

  it("ignores spotting on a period's tail or just before the next one", () => {
    const logs = series("2026-01-01", [28, 28, 28]);
    const days: DayLog[] = [
      { date: addDays(logs[0]!.start, 6), flow: "spotting" }, // day after the end — tail
      { date: addDays(logs[1]!.start, 26), flow: "spotting" }, // 2 days before the next start
    ];
    expect(ids(run(logs, days, { today: "2026-04-01" }))).not.toContain("intermenstrual-spotting");
  });
});

describe("cyclePatterns — the PCOS conversation pattern", () => {
  it("needs irregular cycles AND acne across three cycles", () => {
    const logs = series("2026-01-01", [24, 36, 25, 35]);
    const acne: DayLog[] = [logs[0]!, logs[1]!, logs[2]!].map((p) => ({
      date: addDays(p.start, 10),
      symptoms: ["acne"],
    }));
    expect(ids(run(logs, acne, { today: "2026-05-01" }))).toContain("pcos-conversation");
    expect(ids(run(logs, acne.slice(0, 2), { today: "2026-05-01" }))).not.toContain(
      "pcos-conversation",
    );
  });

  it("stays silent when cycles are regular, however much acne is logged", () => {
    const logs = series("2026-01-01", [28, 28, 28, 28]);
    const acne: DayLog[] = logs.map((p) => ({
      date: addDays(p.start, 10),
      symptoms: ["acne"],
    }));
    expect(ids(run(logs, acne, { today: "2026-05-01" }))).not.toContain("pcos-conversation");
  });
});

describe("pattern dismissal memory — shown once per pattern", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("round-trips and filters dismissed notices", () => {
    dismissPattern("heavy-flow", "2026-04-01");
    expect(loadPatternDismissals()).toEqual({ "heavy-flow": "2026-04-01" });
    const notices: PatternNotice[] = [
      { id: "heavy-flow", title: "t", body: "b" },
      { id: "long-bleeds", title: "t", body: "b" },
    ];
    expect(ids(visiblePatterns(notices, loadPatternDismissals()))).toEqual(["long-bleeds"]);
  });

  it("tolerates a corrupted stored value", () => {
    window.localStorage.setItem("bloom.cycle.patterns.v1", "{nope");
    expect(loadPatternDismissals()).toEqual({});
  });
});
