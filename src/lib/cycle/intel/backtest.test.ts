import { describe, expect, it } from "vitest";

import { runBacktest } from "./backtest";
import { addDays } from "./dates";

function startsFrom(first: string, lengths: number[]): string[] {
  const out = [first];
  for (const length of lengths) out.push(addDays(out[out.length - 1]!, length));
  return out;
}

describe("chronological backtesting", () => {
  it("scores a perfectly regular history at zero error", () => {
    const result = runBacktest(startsFrom("2026-01-01", [28, 28, 28, 28, 28]));
    expect(result.count).toBe(4);
    expect(result.meanAbsError).toBe(0);
    expect(result.withinTwo).toBe(1);
    expect(result.predictions.map((p) => p.intervalsUsed)).toEqual([1, 2, 3, 4]);
  });

  it("never uses the target or any later start", () => {
    const starts = startsFrom("2026-01-01", [26, 33, 24, 35]);
    const result = runBacktest(starts);
    for (const prediction of result.predictions) {
      expect(prediction.intervalsUsed).toBe(
        starts.indexOf(prediction.target) - 1,
      );
    }
  });

  it("needs at least two intervals before it can score anything", () => {
    const result = runBacktest(startsFrom("2026-01-01", [28]));
    expect(result.count).toBe(0);
    expect(result.meanAbsError).toBeNull();
    expect(result.withinTwo).toBeNull();
  });

  it("records the signed error, not just its size", () => {
    const starts = startsFrom("2026-01-01", [28, 35]);
    const [prediction] = runBacktest(starts).predictions;
    expect(prediction).toBeDefined();
    /* Predicted from the single 28-day interval; the cycle actually ran 35. */
    expect(prediction!.errorDays).toBe(7);
  });
});
