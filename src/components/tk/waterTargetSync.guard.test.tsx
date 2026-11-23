// @vitest-environment jsdom
/**
 * Water target sync — acceptance guard (Brief v7 WATER slice; owner
 * directive 2026-11-20: "the water target should automatically set to
 * the trackers and it should be synced with the nutrition as always").
 *
 * Everything here runs on the REAL wiring — the real useTrackers hook
 * over seeded prefs, the real Targets surface, the real WaterBloom
 * panel. The stored tracker goal says 2,600 ml (the old manual value);
 * the body profile's guide says 2,200 ml. Every surface must show the
 * guide's figure, because there is now only one source.
 *
 *   1. The hook resolves waterTargetMl from the body profile and the
 *      analysis judges water against it — while the raw stored goal
 *      stays 2,600 in the record (superseded, not rewritten).
 *   2. The Targets list shows the guide figure, labelled "from your
 *      plan"; the Edit sheet offers NO water input (the other targets
 *      keep theirs) and names the row "Set by your plan".
 *   3. The Plan panel and the Targets list render the identical target
 *      figure from that same source.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, renderHook, screen, waitFor, within } from "@testing-library/react";

beforeAll(() => {
  window.matchMedia = ((query: string) =>
    ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
      onchange: null,
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
});

import { setPref } from "@/lib/prefs";
import { resetPrefCache } from "@/lib/prefsStore";
import { BODY_KEY, type BodyProfile } from "@/lib/health/body";
import { todayKey } from "@/lib/cycle/predict";
import { fmtLitres } from "@/lib/format";
import { useTrackers, type TrackerStore } from "@/hooks/useTrackers";
import { DEFAULT_GOALS, emptyDay } from "@/lib/trackers/core";
import { GOALS_PREF, saveDays } from "@/lib/trackers/store";
import { waterTargetMlOf } from "@/lib/trackers/waterTarget";
import { TargetSheet, TargetsPanel } from "./Targets";
import { WaterBloomPanel } from "@/components/nutrition/WaterBloom";

/* 80 kg · 178 cm · 30 · male · moderate → the guide's water figure is 2,200 ml
   (M-219 drinking-water basis: 1,900 base + 300 activity). */
const PROFILE: BodyProfile = {
  units: "metric",
  heightCm: 178,
  weightKg: 80,
  targetWeightKg: null,
  age: 30,
  sex: "male",
  activity: "moderate",
  goal: "maintain",
  rateKgPerWeek: 0.5,
  updatedAt: "2026-06-01T07:00:00.000Z",
};
const GUIDE = 2200;

beforeEach(() => {
  window.localStorage.clear();
  resetPrefCache();
  setPref(BODY_KEY, PROFILE);
  setPref(GOALS_PREF, { ...DEFAULT_GOALS, waterMl: 2600 });
  saveDays([{ ...emptyDay(todayKey()), waterMl: 2500 }]);
});

afterEach(cleanup);

describe("one water target, from the plan's guide", () => {
  it("the resolver agrees with the fixture's guide figure", () => {
    expect(waterTargetMlOf(PROFILE, todayKey())).toBe(GUIDE);
  });

  it("the hook resolves the target and judges water against it, not the stored goal", async () => {
    const { result } = renderHook(() => useTrackers());
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(result.current.goals.waterMl).toBe(2600);
    expect(result.current.waterTargetMl).toBe(GUIDE);
    expect(result.current.analysis.trackers.water.goal).toBe(GUIDE);
  });

  it("Targets shows the guide figure as from-plan, and the sheet has no water input", async () => {
    const { result } = renderHook(() => useTrackers());
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    const store = result.current as TrackerStore;

    const { container } = render(<TargetsPanel store={store} />);
    const row = container.querySelector('.tk2-targets-display li[data-id="water"]');
    expect(row).not.toBeNull();
    expect(row!.textContent).toContain(fmtLitres(GUIDE));
    expect(row!.textContent).toContain("from your plan");
    expect(row!.textContent).not.toContain(fmtLitres(2600));

    cleanup();
    render(<TargetSheet store={store} />);
    expect(document.querySelector("#target-water")).toBeNull();
    expect(document.querySelector("#target-sleep")).not.toBeNull();
    expect(document.querySelector("#target-study")).not.toBeNull();
    const sheetRow = document.querySelector('.tk2-targets-grid li[data-id="water"]');
    expect(sheetRow).not.toBeNull();
    expect(sheetRow!.textContent).toContain("Set by your plan");
  });

  it("the Plan panel and the Targets list render the identical target figure", async () => {
    const { result } = renderHook(() => useTrackers());
    await waitFor(() => expect(result.current.hydrated).toBe(true));

    render(<TargetsPanel store={result.current as TrackerStore} />);
    const row = document.querySelector('li[data-id="water"]');
    expect(row!.textContent).toContain(fmtLitres(GUIDE));

    render(<WaterBloomPanel targetMl={GUIDE} />);
    /* The panel's own hook instance hydrates from the same store:
       2,500 ml already drunk today, against the same 2,200 ml. */
    await screen.findByText(`2.5 L of ${fmtLitres(GUIDE)}`);
    const scene = screen.getByRole("img");
    expect(scene.getAttribute("aria-label")).toContain(fmtLitres(GUIDE).replace(" L", ""));
  });
});
