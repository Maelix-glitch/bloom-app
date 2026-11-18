/**
 * Living Assessment — the pure logic: delta parsing under the hard
 * rule (pattern + budget can never ride a delta), the base+deltas
 * merge, grounded "since your assessment" lines, and the two
 * staleness rules with their thresholds pinned.
 */

import { describe, expect, it } from "vitest";

import type { WeighIn } from "@/lib/health/body";
import type { LogEntry } from "@/lib/nutrition/types";
import {
  beginAssessment,
  completeAssessment,
  emptyAssessmentState,
  saveStep,
  type AssessmentState,
} from "./state";
import {
  ASSESSMENT_DELTA_CAP,
  EMPTY_DELTA_VALUE,
  STALE_AGE_DAYS,
  STALE_WEIGHT_DRIFT_KG,
  appendDelta,
  assessmentStaleness,
  effectiveAnswers,
  effectiveState,
  parseAssessmentDeltaValue,
  parseDeltaChanges,
  sinceLines,
  type AssessmentDeltaValue,
} from "./living";

const T0 = "2026-10-01T07:00:00.000Z";
const COMPLETED = "2026-10-02T09:30:00.000Z";

function completedState(weightKg: number | null = 100): AssessmentState {
  const begun = beginAssessment(emptyAssessmentState(T0), T0);
  const answered = saveStep(
    begun,
    { goal: "lose", dietaryPattern: "eggetarian", foodBudget: 2, weightKg },
    "summary",
    T0,
  );
  return completeAssessment(answered, COMPLETED);
}

const entry = (day: string): LogEntry => ({ day }) as unknown as LogEntry;
const weighIn = (date: string, kg: number): WeighIn => ({ date, kg });

describe("parseDeltaChanges — the hard rule", () => {
  it("keeps only the permitted fields, with the Assessment's own ranges", () => {
    expect(
      parseDeltaChanges({
        weightKg: 97.5,
        activity: "active",
        sleepHoursTypical: 7,
        sleepQuality: "good",
        morningRestedness: 4,
      }),
    ).toEqual({
      weightKg: 97.5,
      activity: "active",
      sleepHoursTypical: 7,
      sleepQuality: "good",
      morningRestedness: 4,
    });
  });

  it("drops dietary pattern and food budget even when they are the only fields", () => {
    expect(parseDeltaChanges({ dietaryPattern: "vegan", foodBudget: 3 })).toBeNull();
  });

  it("strips pattern and budget riding alongside a permitted field", () => {
    expect(
      parseDeltaChanges({ weightKg: 98, dietaryPattern: "vegan", foodBudget: 1 }),
    ).toEqual({ weightKg: 98 });
  });

  it("drops a forged cuisine preference — it is Assessment-only, like pattern and budget", () => {
    expect(parseDeltaChanges({ cuisinePreference: "south_indian" })).toBeNull();
    expect(
      parseDeltaChanges({ weightKg: 98, cuisinePreference: "north_indian" }),
    ).toEqual({ weightKg: 98 });
    /* And a stored delta carrying one never reaches the effective
       answers: the fold only ever applies permitted changes. */
    const forged = parseAssessmentDeltaValue({
      version: 1,
      updates: [
        {
          recordedAt: "2026-10-21T08:00:00.000Z",
          changes: { cuisinePreference: "south_indian", weightKg: 97 },
        },
      ],
    });
    expect(forged?.updates).toHaveLength(1);
    expect(forged?.updates[0]?.changes).toEqual({ weightKg: 97 });
  });

  it("drops out-of-range and unknown values rather than clamping them", () => {
    expect(parseDeltaChanges({ weightKg: 900 })).toBeNull();
    expect(parseDeltaChanges({ sleepHoursTypical: 40 })).toBeNull();
    expect(parseDeltaChanges({ morningRestedness: 9 })).toBeNull();
    expect(parseDeltaChanges({ activity: "olympic" })).toBeNull();
    expect(parseDeltaChanges({ goal: "gain" })).toBeNull();
    expect(parseDeltaChanges(null)).toBeNull();
    expect(parseDeltaChanges("weight")).toBeNull();
  });

  it("accepts the factual kitchen fields — kitchens change (§10.5)", () => {
    expect(
      parseDeltaChanges({
        cookingAbility: "basic",
        equipment: ["stove", "fridge"],
        prepTimeMaxMinutes: 20,
        eatingSetting: "home",
      }),
    ).toEqual({
      cookingAbility: "basic",
      equipment: ["stove", "fridge"],
      prepTimeMaxMinutes: 20,
      eatingSetting: "home",
    });
    /* A stated "none of these" is a real equipment answer. */
    expect(parseDeltaChanges({ equipment: ["none"] })).toEqual({ equipment: ["none"] });
    /* An empty equipment list is not a statement — it changes nothing. */
    expect(parseDeltaChanges({ equipment: [] })).toBeNull();
    /* Values outside the vocabularies drop like any other field. */
    expect(parseDeltaChanges({ cookingAbility: "expert" })).toBeNull();
    expect(parseDeltaChanges({ prepTimeMaxMinutes: 25 })).toBeNull();
    expect(parseDeltaChanges({ eatingSetting: "office" })).toBeNull();
  });

  it("drops forged reflective behavioural fields — they are Assessment-only (§10.5)", () => {
    const forged = {
      hungerPattern: "evenings",
      cravings: ["chocolate"],
      cravingKinds: ["sweet"],
      emotionalEating: 4,
      pastAttempts: [{ approach: "Keto", failureReasons: ["hunger"] }],
      motivation: 5,
      confidence: 1,
    };
    expect(parseDeltaChanges(forged)).toBeNull();
    /* Riding alongside a permitted field, they are stripped, not carried. */
    expect(parseDeltaChanges({ weightKg: 98, ...forged })).toEqual({ weightKg: 98 });
    /* And a stored delta carrying them never reaches the effective
       answers — the fold only ever applies permitted changes. */
    const stored = parseAssessmentDeltaValue({
      version: 1,
      updates: [
        {
          recordedAt: "2026-10-21T08:00:00.000Z",
          changes: { ...forged, cookingAbility: "confident" },
        },
      ],
    });
    expect(stored?.updates).toHaveLength(1);
    expect(stored?.updates[0]?.changes).toEqual({ cookingAbility: "confident" });
  });
});

describe("the delta value", () => {
  it("parses an envelope, drops malformed updates, sorts oldest first", () => {
    const value = parseAssessmentDeltaValue({
      version: 1,
      updates: [
        { recordedAt: "2026-11-01T08:00:00.000Z", changes: { weightKg: 98 } },
        { recordedAt: "2026-10-20T08:00:00.000Z", changes: { activity: "light" } },
        { recordedAt: "not-a-date", changes: { weightKg: 98 } },
        { recordedAt: "2026-10-21T08:00:00.000Z", changes: { foodBudget: 3 } },
        "junk",
      ],
    });
    expect(value!.updates).toHaveLength(2);
    expect(value!.updates[0]!.changes).toEqual({ activity: "light" });
    expect(value!.updates[1]!.changes).toEqual({ weightKg: 98 });
  });

  it("refuses a wrong envelope", () => {
    expect(parseAssessmentDeltaValue(null)).toBeNull();
    expect(parseAssessmentDeltaValue({ version: 99, updates: [] })).toBeNull();
    expect(parseAssessmentDeltaValue({ updates: [] })).toBeNull();
  });

  it("appendDelta with nothing permitted changes nothing — same reference", () => {
    const value = parseAssessmentDeltaValue({ version: 1, updates: [] })!;
    expect(appendDelta(value, {}, COMPLETED)).toBe(value);
    expect(appendDelta(value, { dietaryPattern: "vegan" } as never, COMPLETED)).toBe(value);
  });

  it("appendDelta caps the record at the newest updates", () => {
    let value: AssessmentDeltaValue = EMPTY_DELTA_VALUE;
    for (let i = 0; i < ASSESSMENT_DELTA_CAP + 5; i++) {
      const day = String((i % 28) + 1).padStart(2, "0");
      value = appendDelta(value, { weightKg: 90 + i * 0.1 }, `2027-01-${day}T00:00:00.000Z`);
    }
    expect(value.updates).toHaveLength(ASSESSMENT_DELTA_CAP);
  });
});

describe("the merge — base + deltas", () => {
  it("applies updates in order, latest wins, and never mutates the base", () => {
    const state = completedState(100);
    const baseBefore = { ...state.answers };
    let value: AssessmentDeltaValue = EMPTY_DELTA_VALUE;
    value = appendDelta(value, { weightKg: 99 }, "2026-10-10T08:00:00.000Z");
    value = appendDelta(value, { weightKg: 97.5, activity: "active" }, "2026-11-01T08:00:00.000Z");

    const merged = effectiveAnswers(state.answers, value);
    expect(merged.weightKg).toBe(97.5);
    expect(merged.activity).toBe("active");
    expect(state.answers).toEqual(baseBefore);
    expect(merged).not.toBe(state.answers);
  });

  it("leaves pattern and budget exactly as the Assessment recorded them", () => {
    const state = completedState(100);
    const value = appendDelta(EMPTY_DELTA_VALUE, { weightKg: 95 }, "2026-10-10T08:00:00.000Z");
    const merged = effectiveAnswers(state.answers, value);
    expect(merged.dietaryPattern).toBe("eggetarian");
    expect(merged.foodBudget).toBe(2);
  });

  it("folds a kitchen update over the base, and leaves the reflective answers untouched", () => {
    const state = completedState(100);
    const value = appendDelta(
      EMPTY_DELTA_VALUE,
      { cookingAbility: "basic", equipment: ["stove"], eatingSetting: "home" },
      "2026-10-10T08:00:00.000Z",
    );
    const merged = effectiveAnswers(state.answers, value);
    expect(merged.cookingAbility).toBe("basic");
    expect(merged.equipment).toEqual(["stove"]);
    expect(merged.eatingSetting).toBe("home");
    /* The base answers carry no reflective answers, and no delta can
       have added any — they stay unanswered. */
    expect(merged.hungerPattern).toBeNull();
    expect(merged.emotionalEating).toBeNull();
    expect(merged.confidence).toBeNull();
  });

  it("with no updates the effective state IS the stored state", () => {
    const state = completedState();
    expect(effectiveState(state, EMPTY_DELTA_VALUE)).toBe(state);
    const value = appendDelta(EMPTY_DELTA_VALUE, { sleepQuality: "poor" }, "2026-10-10T08:00:00.000Z");
    const effective = effectiveState(state, value);
    expect(effective).not.toBe(state);
    expect(effective.answers.sleepQuality).toBe("poor");
    expect(effective.completedAt).toBe(state.completedAt);
  });
});

describe("sinceLines — grounded or absent", () => {
  it("an incomplete assessment has no since-lines", () => {
    const state = beginAssessment(emptyAssessmentState(T0), T0);
    expect(sinceLines(state, [weighIn("2026-11-01", 90)], [entry("2026-11-01")], EMPTY_DELTA_VALUE)).toEqual([]);
  });

  it("a weigh-in after completion is stated with its value and date", () => {
    const lines = sinceLines(completedState(100), [weighIn("2026-11-12", 97.5)], [], EMPTY_DELTA_VALUE);
    expect(lines).toHaveLength(1);
    expect(lines[0]!.text).toContain("97.5 kg");
    expect(lines[0]!.text).toContain("2.5 kg below");
    expect(lines[0]!.text).toContain("100 kg");
    expect(lines[0]!.date).toBe("2026-11-12");
  });

  it("weigh-ins from before or on the completion day say nothing", () => {
    const lines = sinceLines(
      completedState(100),
      [weighIn("2026-09-01", 105), weighIn("2026-10-02", 101)],
      [],
      EMPTY_DELTA_VALUE,
    );
    expect(lines).toEqual([]);
  });

  it("no assessment weight — no weight line (nothing to compare against)", () => {
    expect(sinceLines(completedState(null), [weighIn("2026-11-12", 97.5)], [], EMPTY_DELTA_VALUE)).toEqual([]);
  });

  it("logged days are counted once each, with the most recent named", () => {
    const lines = sinceLines(
      completedState(),
      [],
      [entry("2026-10-05"), entry("2026-10-05"), entry("2026-11-17"), entry("2026-09-01")],
      EMPTY_DELTA_VALUE,
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]!.text).toContain("2 days");
    expect(lines[0]!.date).toBe("2026-11-17");
  });

  it("a recorded delta update appears as its own dated line", () => {
    const value = appendDelta(
      EMPTY_DELTA_VALUE,
      { activity: "active", sleepHoursTypical: 7 },
      "2026-11-03T08:00:00.000Z",
    );
    const lines = sinceLines(completedState(), [], [], value);
    expect(lines).toHaveLength(1);
    expect(lines[0]!.text).toContain("Updated on");
    expect(lines[0]!.text).toContain("activity — Active");
    expect(lines[0]!.text).toContain("sleep — about 7 hours");
  });

  it("a kitchen update is described in the same dated line", () => {
    const value = appendDelta(
      EMPTY_DELTA_VALUE,
      {
        cookingAbility: "basic",
        equipment: ["stove", "fridge"],
        prepTimeMaxMinutes: 20,
        eatingSetting: "home",
      },
      "2026-11-03T08:00:00.000Z",
    );
    const lines = sinceLines(completedState(), [], [], value);
    expect(lines).toHaveLength(1);
    expect(lines[0]!.text).toContain("cooking — basic cooking");
    expect(lines[0]!.text).toContain("equipment — stove, fridge");
    expect(lines[0]!.text).toContain("prep time — about 20 minutes");
    expect(lines[0]!.text).toContain("eating — at home");
  });
});

describe("assessmentStaleness — thresholds pinned", () => {
  it("a drift of exactly the threshold is NOT stale; beyond it is", () => {
    const at = assessmentStaleness(
      completedState(100),
      [weighIn("2026-11-01", 100 - STALE_WEIGHT_DRIFT_KG)],
      "2026-11-02T00:00:00.000Z",
    );
    expect(at.stale).toBe(false);
    const beyond = assessmentStaleness(
      completedState(100),
      [weighIn("2026-11-01", 100 - STALE_WEIGHT_DRIFT_KG - 0.1)],
      "2026-11-02T00:00:00.000Z",
    );
    expect(beyond.stale).toBe(true);
    expect(beyond.reasons[0]).toContain("96.9 kg");
  });

  it("age alone never fires — old with no newer records is not stale", () => {
    const now = new Date(Date.parse(COMPLETED) + (STALE_AGE_DAYS + 30) * 86_400_000).toISOString();
    expect(assessmentStaleness(completedState(100), [], now).stale).toBe(false);
    expect(
      assessmentStaleness(completedState(100), [weighIn("2026-09-01", 100)], now).stale,
    ).toBe(false);
  });

  it("old WITH a newer weigh-in fires on age even when the drift is small", () => {
    const now = new Date(Date.parse(COMPLETED) + (STALE_AGE_DAYS + 1) * 86_400_000).toISOString();
    const result = assessmentStaleness(completedState(100), [weighIn("2026-11-01", 99.5)], now);
    expect(result.stale).toBe(true);
    expect(result.reasons).toHaveLength(1);
    expect(result.reasons[0]).toContain("three months");
  });

  it("an incomplete assessment is never stale", () => {
    const state = beginAssessment(emptyAssessmentState(T0), T0);
    expect(assessmentStaleness(state, [weighIn("2027-01-01", 50)], "2027-06-01T00:00:00.000Z")).toEqual({
      stale: false,
      reasons: [],
    });
  });
});
