/**
 * buildVitalisContext — the scope of what Vitalis may know, pinned.
 *
 * Vitalis answers from Nutrition + Assessment ONLY. These tests pin
 * both halves of that promise: the nutrition/assessment record IS
 * assembled (person, targets, plan, log, dishes), and data from every
 * other domain CANNOT appear — decoys are fed through the input and
 * must not survive into the record, because the builder has no field
 * that could carry them.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { EMPTY_ANSWERS } from "@/lib/assessment/state";
import type { Nutrients } from "@/lib/nutrition";

import { buildVitalisContext, type VitalisContextInput } from "./context";

const TOTALS: Nutrients = { kcal: 1644, proteinG: 110, carbsG: 180, fatG: 52, fibreG: 21 };

function fullInput(): VitalisContextInput {
  return {
    today: "2026-11-17",
    assessment: {
      status: "complete",
      completedAt: "2026-11-15T10:00:00.000Z",
      answers: {
        ...EMPTY_ANSWERS,
        ageYears: 22,
        sex: "male",
        heightCm: 175,
        weightKg: 100,
        goal: "recomp",
        dietaryPattern: "eggetarian",
        mealsPerDay: 3,
        allergies: ["peanuts"],
        dislikedFoods: ["bitter gourd"],
        activity: "light",
      },
    },
    targets: { kcal: 3288, proteinG: 220 },
    targetsBlocked: false,
    plan: {
      day: "2026-11-17",
      stale: false,
      goalLabel: "Build strength and muscle",
      targets: { kcal: 3288, proteinG: 220 },
      meals: [
        {
          meal: "breakfast",
          kcal: 822,
          proteinG: 55,
          items: ["Egg white (180 g)", "Oats (80 g)"],
          dishIds: [],
          note: null,
        },
      ],
      notes: [],
    },
    todayLog: {
      day: "2026-11-17",
      entries: [{ name: "Masala oats", meal: "breakfast", kcal: 640, proteinG: 42 }],
      totals: TOTALS,
    },
    recentDays: [{ day: "2026-11-16", entriesCount: 3, totals: { kcal: 2900, proteinG: 190, carbsG: 300, fatG: 90 } }],
    customFoods: [{ name: "Grandma's sambar powder mix", kcal: 310, proteinG: 12 }],
    dishes: [{ name: "Paneer Bhurji", category: "Mains", kcal: 445, proteinG: 28 }],
  };
}

describe("buildVitalisContext — the nutrition + assessment record", () => {
  it("assembles the person, targets, plan, log and library sections", () => {
    const { text, sections } = buildVitalisContext(fullInput());
    expect(sections).toContain("THE PERSON — FROM THEIR ASSESSMENT");
    expect(sections).toContain("TARGETS — COMPUTED BY BLOOM'S ENGINE, QUOTE EXACTLY");
    expect(sections).toContain("THEIR CURRENT PLAN");
    expect(sections).toContain("LOGGED TODAY (2026-11-17)");
    expect(sections).toContain("RECENT DAYS");
    expect(text).toContain("eggetarian");
    expect(text).toContain("Allergies: peanuts");
    expect(text).toContain("Build strength and muscle");
    expect(text).toContain("3,288 kcal");
    expect(text).toContain("220 g");
    expect(text).toContain("Masala oats");
    expect(text).toContain("Paneer Bhurji");
    expect(text).toContain("Grandma's sambar powder mix");
  });

  it("derives today's standing against the targets from the given numbers", () => {
    const { text } = buildVitalisContext(fullInput());
    expect(text).toContain("50% of the energy target");
    expect(text).toContain("50% of the protein target");
  });
});

describe("buildVitalisContext — nothing from other domains can appear", () => {
  it("drops decoy habit, mood and points data fed through the input", () => {
    const decoyed = {
      ...fullInput(),
      habits: [{ name: "DECOY_HABIT_MARKER", streak: 12 }],
      moodEntries: [{ note: "DECOY_MOOD_MARKER" }],
      points: 987654,
      rewards: ["DECOY_REWARD_MARKER"],
    } as VitalisContextInput;
    const { text, sections } = buildVitalisContext(decoyed);
    expect(text).not.toContain("DECOY_HABIT_MARKER");
    expect(text).not.toContain("DECOY_MOOD_MARKER");
    expect(text).not.toContain("DECOY_REWARD_MARKER");
    expect(text).not.toContain("987654");
    for (const header of sections) {
      expect(header.toLowerCase()).not.toContain("habit");
      expect(header.toLowerCase()).not.toContain("mood");
      expect(header.toLowerCase()).not.toContain("point");
    }
  });

  it("the builder module imports nothing from the mood, habit or tracker domains", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/vitalis-ai/context.ts"), "utf8");
    const imports = source.split("\n").filter((line) => line.startsWith("import"));
    const joined = imports.join("\n");
    expect(joined).not.toContain("mood");
    expect(joined).not.toContain("habit");
    expect(joined).not.toContain("tracker");
    expect(joined).not.toContain("coach");
  });
});

describe("buildVitalisContext — honest absences, never invented numbers", () => {
  it("a blocked gate means NO target numbers are handed over", () => {
    const input = fullInput();
    input.targets = null;
    input.targetsBlocked = true;
    input.plan = null;
    const { text } = buildVitalisContext(input);
    expect(text).toContain("has NOT cleared nutrition targets");
    expect(text).not.toContain("Energy target:");
    expect(text).not.toContain("3,288");
  });

  it("no targets and no block reads as not-enough-information, not a refusal", () => {
    const input = fullInput();
    input.targets = null;
    input.targetsBlocked = false;
    const { text } = buildVitalisContext(input);
    expect(text).toContain("No targets have been computed yet");
  });

  it("an untouched record says so, section by section", () => {
    const { text } = buildVitalisContext({
      today: "2026-11-17",
      assessment: { status: "not_started", completedAt: null, answers: EMPTY_ANSWERS },
      targets: null,
      targetsBlocked: false,
      plan: null,
      todayLog: { day: "2026-11-17", entries: [], totals: { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 } },
      recentDays: [],
      customFoods: [],
      dishes: [],
    });
    expect(text).toContain("NOT completed their Assessment");
    expect(text).toContain("No plan has been generated yet");
    expect(text).toContain("Nothing logged yet today");
    expect(text).toContain("No food logged on earlier days yet");
  });
});
