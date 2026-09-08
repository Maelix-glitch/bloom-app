import { describe, expect, it } from "vitest";

import {
  parseDateToken,
  parsePeriodImport,
  planImport,
  previewImport,
  toDrafts,
} from "@/lib/data/importPeriods";
import type { PeriodLog } from "@/lib/cycle/predict";

const TODAY = "2026-09-07";
const opts = { today: TODAY };

describe("importPeriods · parseDateToken", () => {
  it("reads ISO, slashed ISO and day-first dates", () => {
    expect(parseDateToken("2026-08-03")).toBe("2026-08-03");
    expect(parseDateToken("2026/08/03")).toBe("2026-08-03");
    expect(parseDateToken("03/08/2026")).toBe("2026-08-03");
    expect(parseDateToken("03/08/2026", false)).toBe("2026-03-08");
  });

  it("uses the impossible half to break the ambiguity", () => {
    expect(parseDateToken("25/08/2026", false)).toBe("2026-08-25");
    expect(parseDateToken("08/25/2026")).toBe("2026-08-25");
  });

  it("refuses dates the calendar doesn't have", () => {
    expect(parseDateToken("2026-02-30")).toBeNull();
    expect(parseDateToken("hello")).toBeNull();
    expect(parseDateToken("")).toBeNull();
  });
});

describe("importPeriods · parsePeriodImport", () => {
  it("reads the CSV Bloom itself writes, header and all", () => {
    const { rows, problems } = parsePeriodImport(
      [
        "start,end,flow,notes",
        "2026-07-02,2026-07-06,medium,heavy first day",
        "2026-08-01,2026-08-05,light,",
      ].join("\n"),
      opts,
    );
    expect(problems).toEqual([]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      start: "2026-07-02",
      end: "2026-07-06",
      flow: "medium",
      notes: "heavy first day",
    });
    expect(rows[1]!.notes).toBeNull();
  });

  it("reads bare start days and written ranges", () => {
    const { rows } = parsePeriodImport(
      ["2026-06-01", "2026-07-01 to 2026-07-05", "2026-08-01 - 2026-08-04", ""].join("\n"),
      opts,
    );
    expect(rows.map((r) => [r.start, r.end])).toEqual([
      ["2026-06-01", null],
      ["2026-07-01", "2026-07-05"],
      ["2026-08-01", "2026-08-04"],
    ]);
  });

  it("reports every unreadable line with its number, and keeps the rest", () => {
    const { rows, problems } = parsePeriodImport(
      ["2026-07-02", "nonsense here", "2027-01-01", "2026-08-10,2026-08-01"].join("\n"),
      opts,
    );
    expect(rows.map((r) => r.start)).toEqual(["2026-07-02"]);
    expect(problems.map((p) => p.line)).toEqual([2, 3, 4]);
    expect(problems[1]!.reason).toMatch(/future/i);
    expect(problems[2]!.reason).toMatch(/before/i);
  });

  it("skips blank lines and comments without complaining", () => {
    const { rows, problems } = parsePeriodImport("# from my old app\n\n2026-08-01\n", opts);
    expect(rows).toHaveLength(1);
    expect(problems).toEqual([]);
  });

  it("treats an over-long bleed as a mistake, not a period", () => {
    const { problems } = parsePeriodImport("2026-07-01,2026-07-25", opts);
    expect(problems[0]!.reason).toMatch(/15 days/);
  });
});

describe("importPeriods · previewImport — nothing is written blind", () => {
  const existing: PeriodLog[] = [
    { id: "p1", start: "2026-08-01", end: "2026-08-05", flow: null, notes: null },
  ];

  it("marks duplicates, overlaps and new rows separately", () => {
    const { rows } = parsePeriodImport(
      ["2026-08-01", "2026-08-03", "2026-06-02,2026-06-06"].join("\n"),
      opts,
    );
    const preview = previewImport(rows, existing);
    expect(preview.counts).toMatchObject({ total: 3, add: 1, duplicate: 1, overlaps: 1 });
    expect(preview.rows.map((r) => r.status)).toEqual(["new", "duplicate", "overlaps"]);
    expect(preview.addable.map((r) => r.start)).toEqual(["2026-06-02"]);
  });

  it("de-duplicates within the paste itself", () => {
    const { rows } = parsePeriodImport(["2026-06-02", "2026-06-02"].join("\n"), opts);
    const preview = previewImport(rows, []);
    expect(preview.counts.add).toBe(1);
    expect(preview.counts.duplicate).toBe(1);
  });

  it("hands back drafts the existing add() already accepts", () => {
    const plan = planImport("2026-06-02,2026-06-06,light,cramps", [], opts);
    expect(toDrafts(plan.addable)).toEqual([
      { start: "2026-06-02", end: "2026-06-06", flow: "light", notes: "cramps" },
    ]);
  });

  it("carries the unreadable lines through the plan", () => {
    const plan = planImport("2026-06-02\nwhat", [], opts);
    expect(plan.counts.add).toBe(1);
    expect(plan.problems).toHaveLength(1);
  });
});
