/**
 * Delta-pill colour semantics, pinned: the pill is coloured by what the
 * direction means for the person, not by its raw sign. Screen time is the
 * one inverted metric; flat and brand-new series are always neutral.
 */
import { describe, expect, it } from "vitest";

import { deltaTone } from "./DeltaPill";

describe("deltaTone", () => {
  it("colours natural metrics by direction: up sage, down rose", () => {
    for (const id of ["mood", "tracker-sleep", "tracker-water", "habit-ticks", "days-logged"]) {
      expect(deltaTone(id, "up")).toBe("sage");
      expect(deltaTone(id, "down")).toBe("rose");
    }
  });

  it("inverts screen time: down is the win", () => {
    expect(deltaTone("tracker-screen", "down")).toBe("sage");
    expect(deltaTone("tracker-screen", "up")).toBe("rose");
  });

  it("keeps flat and new neutral for every metric", () => {
    for (const id of ["mood", "tracker-screen", "habit-ticks"]) {
      expect(deltaTone(id, "flat")).toBe("neutral");
      expect(deltaTone(id, "new")).toBe("neutral");
    }
  });
});
