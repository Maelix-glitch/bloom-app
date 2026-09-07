import { describe, expect, it } from "vitest";

import {
  addDays,
  analyzeCycle,
  assessLogDraft,
  describeNextPeriod,
  describeNextPeriodShort,
  effectiveMaxPlausible,
  MAX_BLEED_DAYS,
  validateLogDraft,
  type PeriodLog,
} from "./predict";

const TODAY = "2026-09-07";
const ago = (n: number) => addDays(TODAY, -n);

const existing: PeriodLog[] = [
  { id: "a", start: ago(64), end: ago(60), flow: "medium" },
  { id: "b", start: ago(35), end: ago(31), flow: "medium" },
  { id: "c", start: ago(6), end: null, flow: "heavy" },
];

describe("validateLogDraft — the hard walls", () => {
  it("refuses a future start", () => {
    expect(validateLogDraft({ start: addDays(TODAY, 1) }, existing, TODAY).start).toMatch(/future/);
  });

  it("refuses a duplicate start and points at editing", () => {
    expect(validateLogDraft({ start: ago(6) }, existing, TODAY).start).toMatch(/already have/);
  });

  it("refuses a start inside another period's span", () => {
    expect(validateLogDraft({ start: ago(33) }, existing, TODAY).start).toMatch(/falls inside/);
  });

  it("allows the same start while editing that entry", () => {
    expect(validateLogDraft({ start: ago(6) }, existing, TODAY, "c")).toEqual({});
  });

  it("allows a two-year-old date (warned, not blocked) but refuses ten-year-old ones", () => {
    expect(validateLogDraft({ start: ago(800) }, existing, TODAY)).toEqual({});
    expect(validateLogDraft({ start: ago(3700) }, existing, TODAY).start).toMatch(/years back/);
  });

  it("refuses an end before the start, a future end, and an absurd bleed length", () => {
    expect(validateLogDraft({ start: ago(6), end: ago(7) }, [], TODAY).end).toMatch(/before/);
    expect(validateLogDraft({ start: ago(6), end: addDays(TODAY, 1) }, [], TODAY).end).toMatch(
      /future/,
    );
    expect(
      validateLogDraft({ start: ago(40), end: ago(40 - MAX_BLEED_DAYS) }, [], TODAY).end,
    ).toMatch(/more than/);
  });

  it("allows a long-but-real bleed of 12 days", () => {
    expect(validateLogDraft({ start: ago(20), end: ago(9) }, [], TODAY)).toEqual({});
  });

  it("refuses an end date that runs into the next logged period", () => {
    // editing "b" (35 days ago) so its end lands on / past c's start (6 days ago)
    const errors = validateLogDraft({ start: ago(35), end: ago(6) }, existing, TODAY, "b");
    expect(errors.end).toMatch(/runs into/);
  });

  it("still refuses notes longer than 400 characters", () => {
    expect(
      validateLogDraft({ start: ago(1), notes: "x".repeat(401) }, [], TODAY).notes,
    ).toBeDefined();
  });
});

describe("assessLogDraft — soft margins that still save", () => {
  it("warns (does not block) when a start lands too close to the previous one", () => {
    const a = assessLogDraft({ start: ago(2) }, existing, TODAY);
    expect(a.errors).toEqual({});
    expect(a.gapBefore).toBe(4);
    expect(a.warnings.map((w) => w.key)).toEqual(["gap"]);
    expect(a.warnings[0]!.message).toMatch(/left out of your average/);
  });

  it("warns when a start is noticeably earlier than the person's own average", () => {
    const a = assessLogDraft({ start: addDays(ago(6), 0) }, existing.slice(0, 2), TODAY, null, {
      averageLength: 29,
    });
    // ago(6) is 29 days after b → no warning
    expect(a.warnings).toEqual([]);
    const early = assessLogDraft({ start: ago(15) }, existing.slice(0, 2), TODAY, null, {
      averageLength: 29,
    });
    expect(early.warnings[0]!.message).toMatch(/earlier than your usual/);
  });

  it("warns about a bleed longer than ten days but keeps it", () => {
    const a = assessLogDraft({ start: ago(20), end: ago(9) }, [], TODAY);
    expect(a.errors).toEqual({});
    expect(a.warnings[0]!.key).toBe("end");
    expect(a.warnings[0]!.message).toMatch(/12 days/);
  });

  it("warns about a very old date instead of refusing it", () => {
    const a = assessLogDraft({ start: ago(900) }, [], TODAY);
    expect(a.errors).toEqual({});
    expect(a.warnings[0]!.key).toBe("start");
  });

  it("is quiet for an ordinary, on-rhythm entry", () => {
    const a = assessLogDraft({ start: ago(6), end: ago(2) }, existing.slice(0, 2), TODAY, null, {
      averageLength: 29,
    });
    expect(a.errors).toEqual({});
    expect(a.warnings).toEqual([]);
  });
});

describe("analyzeCycle — what the check-ins rely on", () => {
  it("excludes implausible gaps and flags them with a midpoint suggestion", () => {
    const logs: PeriodLog[] = [
      { id: "x", start: ago(100) },
      { id: "y", start: ago(10) },
    ];
    const a = analyzeCycle(logs, TODAY);
    expect(a.cycleLengths).toEqual([]);
    expect(a.isGeneric).toBe(true);
    expect(a.gaps[0]!.suggestedMissedDate).toBe(ago(55));
  });

  it("reports lateness only from three days past the prediction (medium+ confidence)", () => {
    const logs: PeriodLog[] = [
      { id: "a", start: ago(118) },
      { id: "b", start: ago(89) },
      { id: "c", start: ago(60) },
      { id: "d", start: ago(31) }, // 3 steady cycles → medium; average 29 → due 2 days ago
    ];
    expect(analyzeCycle(logs, TODAY).confidence).toBe("medium");
    expect(analyzeCycle(logs, TODAY).isLate).toBe(false);
    expect(analyzeCycle(logs, addDays(TODAY, 1)).isLate).toBe(true);
  });

  it("waits a week before calling a rough estimate late (low confidence)", () => {
    const logs: PeriodLog[] = [
      { id: "a", start: ago(89) },
      { id: "b", start: ago(60) },
      { id: "c", start: ago(31) }, // only 2 usable cycles → low; due 2 days ago
    ];
    expect(analyzeCycle(logs, TODAY).confidence).toBe("low");
    expect(analyzeCycle(logs, addDays(TODAY, 4)).isLate).toBe(false); // 6 days past
    expect(analyzeCycle(logs, addDays(TODAY, 5)).isLate).toBe(true); // 7 days past
    expect(
      analyzeCycle(logs, addDays(TODAY, 5)).flags.find((f) => f.kind === "late")?.title,
    ).toMatch(/past a rough estimate/);
  });

  it("is never late against the population fallback", () => {
    // one period, a natural 35-day body: on day 32 the 28-day guess is 3 days "past"
    const logs: PeriodLog[] = [{ id: "a", start: ago(31), end: ago(27) }];
    const a = analyzeCycle(logs, TODAY);
    expect(a.isGeneric).toBe(true);
    expect(a.lateBy).toBe(3);
    expect(a.isLate).toBe(false);
    expect(a.flags.map((f) => f.kind)).not.toContain("late");
    // and the honest window is wide
    expect(a.nextWindow?.spread).toBe(4);
  });

  it("gives a window that widens as confidence falls", () => {
    const steady: PeriodLog[] = [0, 1, 2, 3, 4].map((i) => ({
      id: `s${i}`,
      start: ago(10 + (4 - i) * 28),
    }));
    const high = analyzeCycle(steady, TODAY);
    expect(high.confidence).toBe("high");
    expect(high.nextWindow?.spread).toBe(1);

    const uneven: PeriodLog[] = [
      { id: "a", start: ago(129) },
      { id: "b", start: ago(108) }, // 21
      { id: "c", start: ago(70) }, // 38
      { id: "d", start: ago(44) }, // 26
      { id: "e", start: ago(0) }, // 44
    ];
    const low = analyzeCycle(uneven, TODAY);
    expect(low.confidence).toBe("low");
    expect(low.nextWindow!.spread).toBeGreaterThanOrEqual(3);
    expect(low.nextWindow!.from < low.nextStart!).toBe(true);
    expect(low.nextWindow!.to > low.nextStart!).toBe(true);
  });
});

describe("analyzeCycle — long cycles are a rhythm, not a mistake", () => {
  const longHistory: PeriodLog[] = [
    { id: "a", start: ago(155) },
    { id: "b", start: ago(103) }, // 52
    { id: "c", start: ago(55) }, // 48
    { id: "d", start: ago(0) }, // 55
  ];

  it("accepts consistent long cycles once two consecutive gaps agree", () => {
    const a = analyzeCycle(longHistory, TODAY);
    expect(a.longCyclesAccepted).toBe(true);
    expect(a.maxPlausible).toBe(55);
    expect(a.cycleLengths).toEqual([52, 48, 55]);
    expect(a.isGeneric).toBe(false);
    expect(a.confidence).not.toBe("none");
    expect(a.flags.map((f) => f.kind)).not.toContain("anomaly");
    expect(a.flags.map((f) => f.kind)).toContain("long-cycles");
    expect(Math.round(a.averageLength)).toBeGreaterThan(48);
  });

  it("still treats a single long gap in an otherwise ordinary record as a probable missed log", () => {
    const logs: PeriodLog[] = [
      { id: "a", start: ago(115) },
      { id: "b", start: ago(87) }, // 28
      { id: "c", start: ago(29) }, // 58 — alone
      { id: "d", start: ago(0) }, // 29
    ];
    const a = analyzeCycle(logs, TODAY);
    expect(a.longCyclesAccepted).toBe(false);
    expect(a.cycleLengths).toEqual([28, 29]);
    expect(a.gaps[1]!.plausible).toBe(false);
  });

  it("honours what the person confirmed, up to the hard ceiling", () => {
    const logs: PeriodLog[] = [
      { id: "a", start: ago(87) },
      { id: "b", start: ago(29) }, // 58 — alone, but confirmed
      { id: "c", start: ago(0) }, // 29
    ];
    expect(analyzeCycle(logs, TODAY).cycleLengths).toEqual([29]);
    const confirmed = analyzeCycle(logs, TODAY, { personalMaxPlausible: 58 });
    expect(confirmed.cycleLengths).toEqual([58, 29]);
    expect(confirmed.maxPlausible).toBe(58);
    // a 200-day postpartum gap is never one cycle, whatever was confirmed
    const huge = analyzeCycle(
      [
        { id: "x", start: ago(229) },
        { id: "y", start: ago(29) },
        { id: "z", start: ago(0) },
      ],
      TODAY,
      { personalMaxPlausible: 200 },
    );
    expect(huge.maxPlausible).toBe(90);
    expect(huge.gaps[0]!.plausible).toBe(false);
  });

  it("effectiveMaxPlausible needs agreement, not just length", () => {
    const o = { maxPlausible: 45, hardMaxPlausible: 90, longCycleAgreement: 7 };
    expect(effectiveMaxPlausible([28, 60, 29], o)).toBe(45);
    expect(effectiveMaxPlausible([50, 70], o)).toBe(45); // 20 days apart — not a rhythm
    expect(effectiveMaxPlausible([50, 56], o)).toBe(56);
    expect(effectiveMaxPlausible([95, 96], o)).toBe(45); // beyond the hard ceiling
  });
});

describe("describeNextPeriod — one sentence every surface can quote", () => {
  const steady = (n: number, len: number, lastStartAgo: number): PeriodLog[] =>
    Array.from({ length: n }, (_, i) => {
      const s = addDays(TODAY, -lastStartAgo - (n - 1 - i) * len);
      return { id: `p${i}`, start: s, end: addDays(s, 4), flow: "medium" as const };
    });

  it("gives a single date only at high confidence", () => {
    const a = analyzeCycle(steady(6, 28, 10), TODAY);
    expect(a.confidence).toBe("high");
    expect(describeNextPeriod(a)).toMatch(/^Next period around .* · in 18 days$/);
    expect(describeNextPeriodShort(a)).toBe("next in 18d");
  });

  it("gives a window at medium confidence", () => {
    /* four periods → three cycles; too few for "high", steady enough for "medium" */
    const a = analyzeCycle(steady(4, 28, 10), TODAY);
    expect(a.confidence).toBe("medium");
    expect(describeNextPeriod(a)).toMatch(/^Next period likely .*–.* · around .*, in 18 days$/);
  });

  it("calls a low-confidence estimate rough and shows the window", () => {
    /* the audit's example: 21 / 38 / 26 / 44 — ±9 days, which is "low" */
    const logs: PeriodLog[] = [
      { id: "a", start: addDays(TODAY, -139), flow: "medium" },
      { id: "b", start: addDays(TODAY, -118), flow: "medium" }, // 21
      { id: "c", start: addDays(TODAY, -80), flow: "medium" }, // 38
      { id: "d", start: addDays(TODAY, -54), flow: "medium" }, // 26
      { id: "e", start: addDays(TODAY, -10), flow: "medium" }, // 44
    ];
    const a = analyzeCycle(logs, TODAY);
    expect(a.confidence).toBe("low");
    expect(describeNextPeriod(a)).toMatch(
      /^Next period roughly .*–.* · a rough estimate, in about \d+ days$/,
    );
    expect(describeNextPeriodShort(a)).toMatch(/^~.*–.*$/);
  });

  it("never dresses the 28-day fallback up as a prediction", () => {
    const a = analyzeCycle([{ id: "only", start: addDays(TODAY, -10), flow: "medium" }], TODAY);
    expect(a.confidence).toBe("none");
    expect(describeNextPeriod(a)).toMatch(/generic 28-day guide, not your pattern yet/);
    expect(describeNextPeriodShort(a)).toBe("28-day guide only");
  });

  it("says how late, once the engine calls it late", () => {
    const a = analyzeCycle(steady(6, 28, 31), TODAY); // 3 days past a high-confidence estimate
    expect(a.isLate).toBe(true);
    expect(describeNextPeriod(a)).toMatch(/^3 days later than predicted \(.*\)$/);
    expect(describeNextPeriodShort(a)).toBe("3d late");
  });

  it("points at a future-dated entry instead of predicting from it", () => {
    const a = analyzeCycle([{ id: "z", start: addDays(TODAY, 3), flow: null }], TODAY);
    expect(describeNextPeriod(a)).toMatch(/starts .* — a date in the future$/);
    expect(describeNextPeriodShort(a)).toMatch(/^starts /);
  });

  it("has nothing to say with nothing logged", () => {
    expect(describeNextPeriod(analyzeCycle([], TODAY))).toBeNull();
    expect(describeNextPeriodShort(analyzeCycle([], TODAY))).toBeNull();
  });
});
