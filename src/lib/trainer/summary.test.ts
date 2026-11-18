/**
 * Share summary — pinned: no consent, no summary; every row comes
 * from the real record with the clinician report's resolution order
 * (Assessment first, body profile fallback); what Bloom does not
 * hold reads "Not recorded", never an invention.
 */

import { describe, expect, it } from "vitest";

import { EMPTY_ANSWERS, type AssessmentAnswers } from "@/lib/assessment/state";
import { DEFAULT_BODY, type BodyProfile } from "@/lib/health/body";
import type { WeekAggregates } from "@/lib/nutrition/dayView";

import { buildShareSummary, shareSummaryLines, type ShareSummaryInput } from "./summary";

const ANSWERS: AssessmentAnswers = {
  ...EMPTY_ANSWERS,
  ageYears: 22,
  heightCm: 175,
  weightKg: 100,
  sex: "male",
  goal: "recomp",
  dietaryPattern: "eggetarian",
};

const PROFILE: BodyProfile = {
  ...DEFAULT_BODY,
  age: 30,
  heightCm: 170,
  weightKg: 90,
  activity: "moderate",
  goal: "maintain",
};

const WEEK: WeekAggregates = {
  days: [],
  loggedDays: 5,
  avgKcal: 3100,
  avgProteinG: 205.5,
  avgCarbsG: null,
  avgFatG: null,
  proteinHitDays: 3,
};

const INPUT: ShareSummaryInput = {
  consent: true,
  answers: ANSWERS,
  profile: PROFILE,
  targets: { kcal: 3288, proteinG: 220 },
  week: WEEK,
};

function row(summary: NonNullable<ReturnType<typeof buildShareSummary>>, label: string) {
  return summary.rows.find((r) => r.label === label)?.value;
}

describe("buildShareSummary", () => {
  it("builds nothing at all without consent", () => {
    expect(buildShareSummary({ ...INPUT, consent: false })).toBeNull();
  });

  it("resolves identity fields Assessment-first, like the clinician report", () => {
    const summary = buildShareSummary(INPUT)!;
    expect(row(summary, "Age")).toBe("22 years");
    expect(row(summary, "Height")).toBe("175 cm");
    expect(row(summary, "Weight")).toBe("100 kg");
    expect(row(summary, "Goal")).toBe("Build strength and muscle");
    expect(row(summary, "Eating pattern")).toContain("eggetarian");
  });

  it("falls back to the body profile when the Assessment holds nothing", () => {
    const summary = buildShareSummary({ ...INPUT, answers: { ...EMPTY_ANSWERS } })!;
    expect(row(summary, "Age")).toBe("30 years");
    expect(row(summary, "Weight")).toBe("90 kg");
    expect(row(summary, "Eating pattern")).toBe("Not recorded");
  });

  it("reads Not recorded where neither store holds a value", () => {
    const summary = buildShareSummary({
      consent: true,
      answers: null,
      profile: DEFAULT_BODY,
      targets: null,
      week: null,
    })!;
    expect(row(summary, "Age")).toBe("Not recorded");
    expect(row(summary, "Sex")).toBe("Not recorded");
    expect(row(summary, "Height")).toBe("Not recorded");
    expect(row(summary, "Weight")).toBe("Not recorded");
    expect(row(summary, "Days logged (last 7)")).toBe("Not recorded");
    expect(row(summary, "Average intake")).toBe("Not recorded");
  });

  it("shows the engine's targets, and Not set when the engine set none", () => {
    const withTargets = buildShareSummary(INPUT)!;
    expect(row(withTargets, "Energy target")).toBe("~3288 kcal / day");
    expect(row(withTargets, "Protein target")).toBe("~220 g / day");
    const without = buildShareSummary({ ...INPUT, targets: null })!;
    expect(row(without, "Energy target")).toBe("Not set");
    expect(row(without, "Protein target")).toBe("Not set");
  });

  it("reports adherence from the log's own aggregates, with the day count named", () => {
    const summary = buildShareSummary(INPUT)!;
    expect(row(summary, "Days logged (last 7)")).toBe("5 of 7");
    expect(row(summary, "Average intake")).toBe("~3100 kcal / day over 5 logged days");
    expect(row(summary, "Average protein")).toBe("~205.5 g / day over 5 logged days");
    expect(summary.loggedDays).toBe(5);
  });

  it("flattens to plain lines for a share surface", () => {
    const lines = shareSummaryLines(buildShareSummary(INPUT)!);
    expect(lines[0]).toBe("Age: 22 years");
    expect(lines).toHaveLength(12);
  });
});
