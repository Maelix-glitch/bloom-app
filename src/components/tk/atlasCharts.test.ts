import { describe, expect, it } from "vitest";

import { contour, loggedCount, loggedRuns, routePath } from "./atlasCharts";

const EMPTY14: (number | null)[] = Array.from({ length: 14 }, () => null);

describe("loggedRuns — a line may only join consecutive logged days", () => {
  it("no logs, no runs", () => {
    expect(loggedRuns(EMPTY14)).toEqual([]);
    expect(loggedCount(EMPTY14)).toBe(0);
  });

  it("a single logged day is a run of one", () => {
    const values = [...EMPTY14];
    values[13] = 7;
    expect(loggedRuns(values)).toEqual([[{ i: 13, v: 7 }]]);
  });

  it("an unlogged day splits the series into two runs — never bridged", () => {
    expect(loggedRuns([5, null, 7, 9])).toEqual([
      [{ i: 0, v: 5 }],
      [
        { i: 2, v: 7 },
        { i: 3, v: 9 },
      ],
    ]);
  });
});

describe("contour — honest at low data", () => {
  it("zero logged days: no line, no area, no dots", () => {
    const c = contour(EMPTY14, 240, 54, 10);
    expect(c.lines).toEqual([]);
    expect(c.areas).toEqual([]);
    expect(c.dots).toEqual([]);
    expect(c.logged).toBe(0);
  });

  it("one logged day: a dot and no line — a shape needs two days", () => {
    const values = [...EMPTY14];
    values[13] = 5;
    const c = contour(values, 240, 54, 10);
    expect(c.lines).toEqual([]);
    expect(c.dots).toHaveLength(1);
    expect(c.logged).toBe(1);
  });

  it("two logged days on adjacent days: one straight segment through both points", () => {
    const c = contour([4, 8], 240, 54, 10);
    expect(c.lines).toHaveLength(1);
    expect(c.lines[0]).not.toContain("C"); // no fabricated curve
    expect(c.dots).toHaveLength(2);
  });

  it("two logged days with a gap between them: two dots, no line across the gap", () => {
    const c = contour([4, null, 8], 240, 54, 10);
    expect(c.lines).toEqual([]);
    expect(c.dots).toHaveLength(2);
  });
});

describe("routePath — a lone day is a dot, not a silent absence", () => {
  const x = (i: number) => i * 10;
  const y = (v: number) => 100 - v;

  it("a tracker with one logged day still appears, as a single dot", () => {
    const r = routePath([null, null, 3, null], x, y);
    expect(r.lines).toEqual([]);
    expect(r.singles).toEqual([{ x: 20, y: 97 }]);
    expect(r.logged).toBe(1);
  });

  it("consecutive days join with straight segments; the gap stays empty", () => {
    const r = routePath([2, 4, null, 6], x, y);
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0]).not.toContain("C");
    expect(r.singles).toEqual([{ x: 30, y: 94 }]);
  });

  it("nothing logged: nothing drawn", () => {
    const r = routePath(EMPTY14, x, y);
    expect(r.lines).toEqual([]);
    expect(r.singles).toEqual([]);
    expect(r.logged).toBe(0);
  });
});
