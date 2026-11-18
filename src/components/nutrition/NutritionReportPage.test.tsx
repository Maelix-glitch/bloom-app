// @vitest-environment jsdom
/**
 * The clinician report (N-UI): seven days of REAL log data — profile
 * values only where Bloom genuinely has them, unlogged days stated,
 * averages over logged days only, and the provenance share computed
 * from the same ledger the tab shows.
 */
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    ...rest
  }: {
    to: string;
    children: React.ReactNode;
  }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

import { fmtKcalApprox } from "@/lib/format";
import { setPref } from "@/lib/prefs";
import { BODY_KEY, bodyTargetsOf, type BodyProfile } from "@/lib/health/body";
import {
  ASSESSMENT_KEY,
  beginAssessment,
  completeAssessment,
  emptyAssessmentState,
  saveStep,
  type AssessmentState,
} from "@/lib/assessment/state";
import { yesterdayOf } from "@/hooks/useNutrition";
import { todayLocal } from "@/lib/localDay";
import { createEntryFromFood } from "@/lib/nutrition/entries";
import { saveCustomFood } from "@/lib/nutrition/foods";
import { logEntry } from "@/lib/nutrition/log";
import { findUsdaReference } from "@/lib/nutrition/usdaReference";
import { resetPrefCache } from "@/lib/prefsStore";
import type { Food } from "@/lib/nutrition/types";
import { NutritionReportPage } from "./NutritionReportPage";

const PROFILE: BodyProfile = {
  units: "metric",
  heightCm: 178,
  weightKg: 72,
  targetWeightKg: null,
  age: 30,
  sex: "male",
  activity: "moderate",
  goal: "maintain",
  rateKgPerWeek: 0.5,
  updatedAt: "2026-11-15T00:00:00.000Z",
};

beforeEach(() => {
  window.localStorage.clear();
  resetPrefCache();
});

afterEach(() => cleanup());

/** A completed Assessment whose About-you answers differ from PROFILE on
 *  every field, so precedence between the two stores is observable. */
function completedAssessment(): AssessmentState {
  let s = beginAssessment(emptyAssessmentState("2026-11-10T10:00:00.000Z"), "2026-11-10T10:00:00.000Z");
  s = saveStep(
    s,
    { ageYears: 41, sex: "female", heightCm: 165, weightKg: 60 },
    "summary",
    "2026-11-10T10:05:00.000Z",
  );
  return completeAssessment(s, "2026-11-12T09:30:00.000Z");
}

function log(food: Food, grams: number, day: string) {
  const entry = createEntryFromFood({
    food,
    amount: { grams },
    meal: "lunch",
    day,
    source: "search",
    now: `${day}T12:00:00.000Z`,
  });
  if (!entry) throw new Error("entry refused");
  logEntry(entry);
}

describe("NutritionReportPage", () => {
  it("renders the week's real aggregates, guides and provenance share", () => {
    setPref(BODY_KEY, PROFILE);
    const today = todayLocal();
    const egg = findUsdaReference("usda-171287")!;
    log(egg, 100, today); /* 143 kcal, USDA */
    const oats = saveCustomFood({
      name: "Report Oats",
      per100g: { kcal: 380, proteinG: 13, carbsG: 60, fatG: 7 },
    });
    if (!oats) throw new Error("seed refused");
    log(oats, 100, yesterdayOf(today)); /* 380 kcal, own value */

    render(<NutritionReportPage endDay={today} />);
    expect(screen.getByText(/Seven days of intake/)).toBeTruthy();

    const targets = bodyTargetsOf(PROFILE, today)!;
    /* The guide is an estimate: shown rounded to the nearest 50 with
       the tilde (fmtKcalApprox), never as four exact digits. */
    expect(screen.getByText(`${fmtKcalApprox(targets.calories)} / day`)).toBeTruthy();
    expect(screen.getByText("30 g / day")).toBeTruthy(); /* fibre guide */
    expect(screen.getByText("2,000 mg / day")).toBeTruthy(); /* sodium ceiling */

    const table = screen.getByRole("table");
    expect(within(table).getByText("143")).toBeTruthy();
    expect(within(table).getByText("380")).toBeTruthy();
    expect(within(table).getAllByText("Nothing logged").length).toBe(5);
    expect(within(table).getByText(/Average of 2 logged days/)).toBeTruthy();

    /* USDA energy share of the week: 143 / 523 ≈ 27%. */
    expect(screen.getByText("27%")).toBeTruthy();
    expect(screen.getByText(/not a prescription/)).toBeTruthy();
  });

  it("renders Age, Sex, Height and Weight as their own rows from the body profile", () => {
    setPref(BODY_KEY, PROFILE);
    render(<NutritionReportPage endDay={todayLocal()} />);
    expect(screen.getByText("Age")).toBeTruthy();
    expect(screen.getByText("30 years")).toBeTruthy();
    expect(screen.getByText("Sex")).toBeTruthy();
    expect(screen.getByText("male")).toBeTruthy();
    expect(screen.getByText("Height")).toBeTruthy();
    expect(screen.getByText("178 cm")).toBeTruthy();
    expect(screen.getByText("Weight")).toBeTruthy();
    expect(screen.getByText("72 kg")).toBeTruthy();
  });

  it("reads Age, Sex, Height and Weight from the Assessment when they live there", () => {
    /* The owner's case: the answers sit in the completed Assessment and
       the Trackers body profile was never filled — the report must not
       call them "Not recorded". */
    setPref(ASSESSMENT_KEY, completedAssessment());
    render(<NutritionReportPage endDay={todayLocal()} />);
    expect(screen.getByText("41 years")).toBeTruthy();
    expect(screen.getByText("female")).toBeTruthy();
    expect(screen.getByText("165 cm")).toBeTruthy();
    expect(screen.getByText("60 kg")).toBeTruthy();
    expect(screen.queryByText("Not recorded")).toBeNull();
  });

  it("the Assessment's answers win where both stores hold a value", () => {
    setPref(BODY_KEY, PROFILE);
    setPref(ASSESSMENT_KEY, completedAssessment());
    render(<NutritionReportPage endDay={todayLocal()} />);
    expect(screen.getByText("41 years")).toBeTruthy();
    expect(screen.getByText("165 cm")).toBeTruthy();
    expect(screen.queryByText("30 years")).toBeNull();
    expect(screen.queryByText("178 cm")).toBeNull();
  });

  it("a field no store holds reads Not recorded — never a plausible invention", () => {
    render(<NutritionReportPage endDay={todayLocal()} />);
    expect(screen.getAllByText("Not recorded").length).toBe(4);
  });

  it("an empty week renders honestly — every day stated, no averages invented", () => {
    render(<NutritionReportPage endDay={todayLocal()} />);
    expect(screen.getAllByText("Nothing logged").length).toBe(7);
    expect(screen.getByText(/Average of 0 logged days/)).toBeTruthy();
    /* No body profile saved: the guides are "Not set", never guessed. */
    expect(screen.getAllByText("Not set").length).toBeGreaterThan(0);
  });
});
