// @vitest-environment jsdom
/**
 * Women's Health — privacy coverage for cycle data, pinned.
 *
 * This slice adds NO new storage (it reads the existing cycle record), so
 * the requirement is that the EXISTING coverage keeps holding:
 *   · EXPORT — the bundle behind "Download everything" carries the cycle
 *     periods, day logs and settings (buildExport, fed by useExportBundle
 *     from the same stores this system reads);
 *   · ERASE, device half — eraseDevice() removes every bloom.cycle.* key
 *     from this device (it wipes all bloom.* keys);
 *   · ERASE, account half — the newest erase_my_data() deletes the cycle
 *     tables server-side; that half is derived from the migrations and
 *     pinned by src/lib/data/eraseCoverage.test.ts, so it is not
 *     re-asserted here.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({ hasSupabaseConfig: false, supabase: {} }));

import { buildExport } from "@/lib/data/exportAll";
import { bloomKeys, eraseDevice } from "@/lib/data/erase";
import type { PeriodLog } from "@/lib/cycle/predict";

const PERIODS: PeriodLog[] = [
  { id: "p1", start: "2026-08-01", end: "2026-08-05", flow: "medium", notes: null },
  { id: "p2", start: "2026-08-29", end: null, flow: "light", notes: null },
];

describe("cycle data · export coverage", () => {
  it("the export bundle carries periods, day logs and settings verbatim", () => {
    const bundle = buildExport({
      exportedAt: "2026-09-07T10:00:00.000Z",
      periods: PERIODS,
      cycleDays: [{ date: "2026-09-01" } as never],
      cycleSettings: { personalMaxPlausible: null, mode: "tracking", pause: null },
    });
    expect(bundle.cycle.periods).toEqual(PERIODS);
    expect(bundle.cycle.days).toHaveLength(1);
    expect(bundle.cycle.settings?.mode).toBe("tracking");
    expect(bundle.counts.periods).toBe(2);
    /* the downloaded JSON really contains it */
    expect(JSON.parse(JSON.stringify(bundle)).cycle.periods).toEqual(PERIODS);
  });
});

describe("cycle data · device erasure coverage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("eraseDevice removes every bloom.cycle.* key and leaves other apps' keys alone", () => {
    window.localStorage.setItem("bloom.cycle.periods.v1", JSON.stringify(PERIODS));
    window.localStorage.setItem("bloom.cycle.days.v1", "[]");
    window.localStorage.setItem("bloom.cycle.settings.v1", "{}");
    window.localStorage.setItem("bloom.cycle.checkins.v1", "{}");
    window.localStorage.setItem("bloom.cycle.periods.meta.v1", "{}");
    window.localStorage.setItem("someone-elses-key", "keep me");

    expect(bloomKeys(window.localStorage)).toContain("bloom.cycle.periods.v1");
    const removed = eraseDevice();
    expect(removed).toBeGreaterThanOrEqual(5);
    expect(window.localStorage.getItem("bloom.cycle.periods.v1")).toBeNull();
    expect(window.localStorage.getItem("bloom.cycle.days.v1")).toBeNull();
    expect(window.localStorage.getItem("bloom.cycle.settings.v1")).toBeNull();
    expect(window.localStorage.getItem("bloom.cycle.checkins.v1")).toBeNull();
    expect(window.localStorage.getItem("bloom.cycle.periods.meta.v1")).toBeNull();
    expect(window.localStorage.getItem("someone-elses-key")).toBe("keep me");
  });
});
