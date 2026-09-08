import { describe, expect, it } from "vitest";

import { UNDO_WINDOW_MS, restoreRemoved } from "./undo";

type Day = { date: string; sleep: number };
const d = (date: string, sleep = 420): Day => ({ date, sleep });

describe("restoreRemoved — the undo behind tracker delete / clear", () => {
  it("puts removed days back exactly as they were", () => {
    const { merged, restored } = restoreRemoved(
      [d("2026-09-01")],
      [d("2026-09-02", 400)],
      (x) => x.date,
    );
    expect(merged).toEqual([d("2026-09-01"), d("2026-09-02", 400)]);
    expect(restored).toEqual([d("2026-09-02", 400)]);
  });

  it("restores a whole cleared record", () => {
    const all = [d("2026-09-01"), d("2026-09-02"), d("2026-09-03")];
    const { merged, restored } = restoreRemoved([], all, (x) => x.date);
    expect(merged).toEqual(all);
    expect(restored).toHaveLength(3);
  });

  it("never overwrites a day that was re-logged in the meantime", () => {
    const { merged, restored } = restoreRemoved(
      [d("2026-09-01", 480)],
      [d("2026-09-01", 400), d("2026-09-02")],
      (x) => x.date,
    );
    expect(merged).toEqual([d("2026-09-01", 480), d("2026-09-02")]);
    expect(restored).toEqual([d("2026-09-02")]);
  });

  it("keeps a window long enough to notice, short enough to forget", () => {
    expect(UNDO_WINDOW_MS).toBeGreaterThanOrEqual(5000);
    expect(UNDO_WINDOW_MS).toBeLessThanOrEqual(15000);
  });
});
