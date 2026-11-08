import { describe, expect, it } from "vitest";

import { contour, loggedCount, loggedRuns, routePath, spreadRouteDots } from "./atlasCharts";

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
    expect(r.singles).toEqual([{ x: 20, y: 97, i: 2, v: 3 }]);
    expect(r.logged).toBe(1);
  });

  it("consecutive days join with straight segments; the gap stays empty", () => {
    const r = routePath([2, 4, null, 6], x, y);
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0]).not.toContain("C");
    expect(r.singles).toEqual([{ x: 30, y: 94, i: 3, v: 6 }]);
  });

  it("nothing logged: nothing drawn", () => {
    const r = routePath(EMPTY14, x, y);
    expect(r.lines).toEqual([]);
    expect(r.singles).toEqual([]);
    expect(r.logged).toBe(0);
  });
});

describe("spreadRouteDots — six first days must not hide under one dot", () => {
  /* The page's own geometry (TrackersPage): fourteen days across the plot,
     each series scaled to its own peak, so a lone day lands at y=30. */
  const routeX = (i: number) => Math.round((i / 13) * 690 + 15);
  const NOV5 = 11; // index of the one logged day in the fourteen
  const oneDay = (v: number) => {
    const values: (number | null)[] = Array.from({ length: 14 }, () => null);
    values[NOV5] = v;
    return values;
  };

  /* The live account's fixture, verbatim: Nov 5 2026 is the only logged
     day, with all six trackers on it (sleep 1h, water 2L, study 1h,
     movement 10m, energy 1/5, screen 0h40m — in stored units). */
  const FIXTURE: { id: string; v: number }[] = [
    { id: "sleep", v: 60 },
    { id: "water", v: 2000 },
    { id: "study", v: 60 },
    { id: "movement", v: 10 },
    { id: "energy", v: 1 },
    { id: "screen", v: 40 },
  ];

  it("before the spread, all six lone days coincide at one point", () => {
    const raw = FIXTURE.map(({ id, v }) => {
      const values = oneDay(v);
      const peak = Math.max(...values.map((n) => n ?? 0), 1);
      const y = (n: number) => Math.round(200 - (n / peak) * 170);
      return { id, ...routePath(values, routeX, y).singles[0]! };
    });
    /* the defect, pinned: one x, one y, six dots — only the last painted
       (screen) could ever be seen */
    expect(new Set(raw.map((d) => `${d.x},${d.y}`)).size).toBe(1);
  });

  it("after the spread: six distinct dots, same day, all inside the plot", () => {
    const raw = FIXTURE.map(({ id, v }) => {
      const values = oneDay(v);
      const peak = Math.max(...values.map((n) => n ?? 0), 1);
      const y = (n: number) => Math.round(200 - (n / peak) * 170);
      const path = routePath(values, routeX, y);
      expect(path.logged).toBe(1);
      return { id, ...path.singles[0]! };
    });
    const spread = spreadRouteDots(raw, 8, 4, 200);
    expect(spread).toHaveLength(6);
    /* no two dots share a position — every tracker is visible */
    expect(new Set(spread.map((d) => `${d.x},${d.y}`)).size).toBe(6);
    for (const d of spread) {
      /* the day never moves: x is the fact */
      expect(d.x).toBe(routeX(NOV5));
      /* renderable inside the plot area (viewBox 720×230, floor at y=200) */
      expect(d.y).toBeGreaterThanOrEqual(4);
      expect(d.y).toBeLessThanOrEqual(200);
      expect(d.i).toBe(NOV5);
    }
    /* and neighbours are a full dot diameter apart, not merely distinct */
    const ys = spread.map((d) => d.y).sort((a, b) => a - b);
    for (let k = 1; k < ys.length; k += 1) expect(ys[k]! - ys[k - 1]!).toBeGreaterThanOrEqual(8);
  });

  it("dots that are already clear keep their true positions", () => {
    const dots = [
      { x: 100, y: 30 },
      { x: 100, y: 90 },
      { x: 300, y: 30 },
    ];
    expect(spreadRouteDots(dots, 8, 4, 200)).toEqual(dots);
  });

  it("a column that would overflow the floor is lifted whole", () => {
    const dots = [
      { x: 50, y: 196 },
      { x: 50, y: 196 },
      { x: 50, y: 196 },
    ];
    const spread = spreadRouteDots(dots, 8, 4, 200);
    expect(spread.map((d) => d.y)).toEqual([184, 192, 200]);
  });

  it("different days never interact", () => {
    const dots = [
      { x: 10, y: 30 },
      { x: 63, y: 30 },
    ];
    expect(spreadRouteDots(dots, 8, 4, 200)).toEqual(dots);
  });
});
