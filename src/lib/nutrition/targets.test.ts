import { describe, expect, it, vi } from "vitest";

import { assertPlausibleTargets, pctOfTarget } from "./targets";

/**
 * Brief v4 Part 3.5's tests, verbatim: the owner's real figures.
 * 458 ÷ 1,350 ≈ 34% and 23 ÷ 171 ≈ 13% are the percentages the
 * audit verified consistent (M-57); {1,350 kcal, 171 g} failing
 * plausibility is the M-82 finding — protein would be ~51% of the
 * day's energy. The gate warns; it never rewrites a target.
 */
describe("targets — pctOfTarget (brief v4 Part 3.5)", () => {
  it("pctOfTarget(458, 1350) === 34", () => {
    expect(pctOfTarget(458, 1350)).toBe(34);
  });

  it("pctOfTarget(23, 171) === 13", () => {
    expect(pctOfTarget(23, 171)).toBe(13);
  });
});

describe("targets — assertPlausibleTargets (brief v4 Part 3.5)", () => {
  it("assertPlausibleTargets({kcal: 1350, proteinG: 171}) === false (M-82)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(assertPlausibleTargets({ kcal: 1350, proteinG: 171 })).toBe(false);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it("an ordinary pair passes silently", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(assertPlausibleTargets({ kcal: 2000, proteinG: 120 })).toBe(true);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("under 1,200 kcal fails regardless of the protein share", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(assertPlausibleTargets({ kcal: 1100, proteinG: 60 })).toBe(false);
    warn.mockRestore();
  });
});
