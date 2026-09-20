/**
 * edge.ts — what the coach's remote brain is told about a person.
 *
 * The personal block is the "zero entries" guarantee for the online coach:
 * identity rides along with an empty record, capped and shaped so a long
 * name or a long focus list can't crowd the facts.
 */
import { describe, expect, it } from "vitest";

import { toFacts, type EdgeFacts } from "./edge";
import type { CoachRecord } from "./responder";

const record = (over: Partial<CoachRecord> = {}): CoachRecord => ({
  today: "2026-09-20",
  trackers: [],
  cycle: null,
  memories: [],
  habitsActive: 0,
  ...over,
});

describe("toFacts — personal identity travels, safely shaped", () => {
  it("carries name, daypart, focus and tenure", () => {
    const facts: EdgeFacts = toFacts(
      record({
        personal: {
          name: "Maya",
          daypart: "evening",
          focusAreas: ["sleep", "mood"],
          daysWithBloom: 3,
        },
      }),
    );
    expect(facts.personal).toEqual({
      name: "Maya",
      daypart: "evening",
      focusAreas: ["sleep", "mood"],
      daysWithBloom: 3,
    });
  });

  it("null when nothing is known — never a stub object", () => {
    expect(toFacts(record()).personal).toBeNull();
  });

  it("caps the focus list so it can't dominate the facts", () => {
    const facts = toFacts(
      record({
        personal: {
          name: null,
          daypart: "morning",
          focusAreas: ["a", "b", "c", "d", "e", "f", "g", "h"],
          daysWithBloom: null,
        },
      }),
    );
    expect(facts.personal?.focusAreas.length).toBeLessThanOrEqual(6);
    expect(facts.personal?.name).toBeNull();
  });

  it("still carries the tracker and cycle facts alongside", () => {
    const facts = toFacts(
      record({
        cycle: {
          daysLogged: 4,
          cycleDay: 16,
          phaseLabel: "Ovulation window",
          nextStart: "2026-09-29",
          daysUntilNext: 9,
          averageLength: 29,
          confidence: "early",
          confidenceReason: "one completed cycle",
        },
      }),
    );
    expect(facts.cycle?.phase).toBe("Ovulation window");
    expect(facts.personal).toBeNull();
  });
});
