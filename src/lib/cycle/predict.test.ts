import { describe, expect, it } from "vitest";

import {
  addDays,
  analyzeCycle,
  assessLogDraft,
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

  it("reports lateness only from three days past the prediction", () => {
    const logs: PeriodLog[] = [
      { id: "a", start: ago(89) },
      { id: "b", start: ago(60) },
      { id: "c", start: ago(31) }, // average 29 → due 2 days ago
    ];
    expect(analyzeCycle(logs, TODAY).isLate).toBe(false);
    expect(analyzeCycle(logs, addDays(TODAY, 1)).isLate).toBe(true);
  });
});
