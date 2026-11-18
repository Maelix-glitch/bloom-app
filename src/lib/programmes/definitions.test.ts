import { describe, expect, it } from "vitest";

import {
  BUILD_AND_FUEL,
  STRONG_START,
  programmeMatchesGoal,
} from "./definitions";

/**
 * Goal matching is data, not prose: a programme declares the goals it
 * is built for on its definition, and the UI's "Matches your goal"
 * badge + primary button derive from the person's stated goal through
 * this one function.
 */
describe("programmeMatchesGoal", () => {
  it("matches Build & Fuel to the build-strength goal, and no other", () => {
    /* "recomp" is the goal whose label is "Build strength and muscle"
       — the goal Build & Fuel's blurb says it is aligned to. */
    expect(programmeMatchesGoal(BUILD_AND_FUEL, "recomp")).toBe(true);
    expect(programmeMatchesGoal(BUILD_AND_FUEL, "lose")).toBe(false);
    expect(programmeMatchesGoal(BUILD_AND_FUEL, "maintain")).toBe(false);
    expect(programmeMatchesGoal(BUILD_AND_FUEL, "gain")).toBe(false);
    expect(programmeMatchesGoal(BUILD_AND_FUEL, "general_health")).toBe(false);
  });

  it("a general programme (no declared goals) matches nothing in particular", () => {
    expect(STRONG_START.goals).toBeUndefined();
    expect(programmeMatchesGoal(STRONG_START, "recomp")).toBe(false);
    expect(programmeMatchesGoal(STRONG_START, "general_health")).toBe(false);
  });

  it("no stated goal matches nothing — the UI recommends nothing", () => {
    expect(programmeMatchesGoal(BUILD_AND_FUEL, null)).toBe(false);
    expect(programmeMatchesGoal(STRONG_START, null)).toBe(false);
  });
});
