import { describe, expect, it } from "vitest";

import { cubicBezierEasing, houseEasing } from "./MoodChart";

/**
 * The chart's animation must run on the house motion curve
 * (--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1)) like everything else,
 * not on an echarts built-in. Reference values are the true outputs of
 * that cubic-bezier, computed independently of the solver.
 */
describe("houseEasing (cubic-bezier(0.16, 1, 0.3, 1))", () => {
  it("pins the endpoints", () => {
    expect(houseEasing(0)).toBe(0);
    expect(houseEasing(1)).toBe(1);
    expect(houseEasing(-0.5)).toBe(0);
    expect(houseEasing(1.5)).toBe(1);
  });

  it("matches the reference curve", () => {
    // cubic-bezier(0.16, 1, 0.3, 1) rises fast and settles: by x=0.25 the
    // value is already ~0.83, and ~0.97 at the midpoint. (Reference values
    // cross-checked against an independent parametric sampling.)
    expect(houseEasing(0.25)).toBeCloseTo(0.8256, 3);
    expect(houseEasing(0.5)).toBeCloseTo(0.9718, 3);
    expect(houseEasing(0.75)).toBeCloseTo(0.9977, 3);
  });

  it("is monotonic and never overshoots", () => {
    let prev = 0;
    for (let x = 0.05; x <= 1; x += 0.05) {
      const y = houseEasing(x);
      expect(y).toBeGreaterThan(prev);
      expect(y).toBeLessThanOrEqual(1);
      prev = y;
    }
  });

  it("is steeper than a plain cubic-out at the midpoint", () => {
    const cubicOut = (t: number) => 1 - (1 - t) ** 3;
    expect(houseEasing(0.5)).toBeGreaterThan(cubicOut(0.5));
  });

  it("solves other curves too (linear stays linear)", () => {
    const linear = cubicBezierEasing(0, 0, 1, 1);
    expect(linear(0.3)).toBeCloseTo(0.3, 4);
    expect(linear(0.7)).toBeCloseTo(0.7, 4);
  });
});
