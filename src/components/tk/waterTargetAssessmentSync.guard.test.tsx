// @vitest-environment jsdom
/**
 * Water target sync — the ASSESSMENT-ONLY account (regression guard for
 * the live failure found by the post-deploy sweep of PR #210,
 * 2026-11-20).
 *
 * The v7 guard (waterTargetSync.guard.test.tsx) seeded a Trackers body
 * profile — the one case that already worked. The owner's real account
 * is the other shape: the Assessment is complete (2026-11-15) and there
 * is NO Trackers body pref. Live, Nutrition's plan showed its guide
 * figure (3.4 L) while Trackers showed the stored manual goal (2.2 L)
 * with no "from your plan" attribution, because useTrackers resolved
 * the target from the body pref alone and got null.
 *
 * This guard seeds ONLY the Assessment and pins:
 *   1. The hook's waterTargetMl equals the hydration target of a plan
 *      composed exactly the way usePlan composes it from that same
 *      Assessment (generatePlan over targetsFor) — same source, not a
 *      same-looking number.
 *   2. The analysis (and so the water tile, which renders the
 *      analysis goal) judges water against that figure, while the
 *      stored manual goal stays 2,200 in the record.
 *   3. The Targets list shows the plan figure with the "from your
 *      plan" attribution, and the sheet names it "Set by your plan".
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, renderHook, waitFor } from "@testing-library/react";

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
import { BODY_KEY, bodyTargetsOf, DEFAULT_BODY } from "@/lib/health/body";
import { todayKey } from "@/lib/cycle/predict";
import { fmtLitres } from "@/lib/format";
import {
  ASSESSMENT_KEY,
  EMPTY_ANSWERS,
  toHealthProfile,
  type AssessmentState,
} from "@/lib/assessment/state";
import { toSafetyInput } from "@/lib/vitalis/domain/profile";
import { classifySafety } from "@/lib/vitalis/safety/classify";
import { targetsFor } from "@/lib/vitalis/calc/body";
import { generatePlan } from "@/lib/nutrition/plan";
import { nutritionTargetsFromBodyTargets } from "@/lib/nutrition/targets";
import { DISH_LIBRARY } from "@/lib/nutrition/data/dishLibrary";
import { USDA_REFERENCE_FOODS } from "@/lib/nutrition/usdaReference";
import { useTrackers, type TrackerStore } from "@/hooks/useTrackers";
import { DEFAULT_GOALS, emptyDay } from "@/lib/trackers/core";
import { GOALS_PREF, saveDays } from "@/lib/trackers/store";
import { TargetSheet, TargetsPanel } from "./Targets";

/* The owner's shape in miniature: a complete Assessment (82 kg · 175 cm
 * · 30 · female · lose · light), NO Trackers body pref, the stored
 * manual water goal still at the old 2,200 ml default. */
const COMPLETE = {
  ageYears: 30,
  heightCm: 175,
  weightKg: 82,
  sex: "female" as const,
  goal: "lose" as const,
  activity: "light" as const,
  pregnantOrBreastfeeding: false,
  eatingDisorderHistory: false,
  unexplainedWeightChange: false,
};

const ASSESSMENT_STATE: AssessmentState = {
  version: 1,
  status: "complete",
  step: "summary",
  answers: { ...EMPTY_ANSWERS, ...COMPLETE },
  consents: [],
  startedAt: "2026-11-15T03:00:00.000Z",
  completedAt: "2026-11-15T03:05:00.000Z",
  updatedAt: "2026-11-15T03:05:00.000Z",
};

/** The plan figure for this Assessment, composed exactly the way
 *  usePlan wires generatePlan (Assessment profile, gated outcome,
 *  body-profile fallback — which is empty here, as on the account). */
function composedPlanWaterMl(): number {
  const today = todayKey();
  const base = toHealthProfile(ASSESSMENT_STATE, "local");
  const profile = base.goal === null ? { ...base, goal: DEFAULT_BODY.goal } : base;
  const safety = classifySafety(toSafetyInput(profile));
  const bodyTargets = bodyTargetsOf(DEFAULT_BODY, today);
  const outcome = generatePlan({
    profile,
    safety,
    gatedOutcome: targetsFor(profile, safety, today),
    fallbackTargets: nutritionTargetsFromBodyTargets(bodyTargets),
    foods: USDA_REFERENCE_FOODS,
    dishes: DISH_LIBRARY,
    waterMl: bodyTargets?.waterMl ?? null,
    day: today,
    now: `${today}T03:00:00.000Z`,
    id: "plan-assessment-water-sync",
  });
  if (!outcome.ok) throw new Error("expected the fixture Assessment to compose a plan");
  if (!outcome.plan.hydration) throw new Error("expected the plan to carry a hydration schedule");
  return outcome.plan.hydration.targetMl;
}

beforeEach(() => {
  window.localStorage.clear();
  resetPrefCache();
  setPref(ASSESSMENT_KEY, ASSESSMENT_STATE);
  /* Deliberately NO BODY_KEY pref — the Assessment-only account. */
  setPref(GOALS_PREF, { ...DEFAULT_GOALS, waterMl: 2200 });
  saveDays([{ ...emptyDay(todayKey()), waterMl: 2500 }]);
});

afterEach(cleanup);

describe("one water target on an Assessment-only account", () => {
  it("the fixture's plan figure is the guide's, not the stored manual goal", () => {
    const figure = composedPlanWaterMl();
    expect(figure).not.toBe(2200);
    /* M-219 (audit F-07): female drinking base 1,500 + 150 (light)
       = 1,650. The old pin (82 kg × 35 + 250 = 3,100) was the
       retired total-water formula. */
    expect(figure).toBe(1650);
  });

  it("the hook resolves the plan's figure from the Assessment alone", async () => {
    const figure = composedPlanWaterMl();
    const { result } = renderHook(() => useTrackers());
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(result.current.goals.waterMl).toBe(2200);
    expect(result.current.waterTargetMl).toBe(figure);
    /* The tile renders the analysis goal — the same figure. */
    expect(result.current.analysis.trackers.water.goal).toBe(figure);
  });

  it("Targets shows the plan figure as from-plan, and the sheet has no water input", async () => {
    const figure = composedPlanWaterMl();
    const { result } = renderHook(() => useTrackers());
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    const store = result.current as TrackerStore;

    const { container } = render(<TargetsPanel store={store} />);
    const row = container.querySelector('.tk2-targets-display li[data-id="water"]');
    expect(row).not.toBeNull();
    expect(row!.textContent).toContain(fmtLitres(figure));
    expect(row!.textContent).toContain("from your plan");
    expect(row!.textContent).not.toContain(fmtLitres(2200));

    cleanup();
    render(<TargetSheet store={store} />);
    expect(document.querySelector("#target-water")).toBeNull();
    const sheetRow = document.querySelector('.tk2-targets-grid li[data-id="water"]');
    expect(sheetRow).not.toBeNull();
    expect(sheetRow!.textContent).toContain("Set by your plan");
  });
});
