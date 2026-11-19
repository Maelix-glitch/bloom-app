import { describe, expect, it } from "vitest";

import { normalizeDayLog, normalizeLog } from "./periodStore";

/**
 * The strict parsers are the trust boundary for everything on disk and
 * everything arriving from the cloud: Wave B's new fields (excluded,
 * clots, symptom severity) must survive a round trip exactly when they
 * are well-formed, and degrade to absent — never to a guessed value.
 */

describe("normalizeLog — the excluded mark (Wave B8)", () => {
  it("keeps a literal true, drops anything else", () => {
    expect(normalizeLog({ id: "a", start: "2026-01-05", excluded: true })?.excluded).toBe(true);
    expect(normalizeLog({ id: "a", start: "2026-01-05", excluded: "yes" })?.excluded).toBeUndefined();
    expect(normalizeLog({ id: "a", start: "2026-01-05", excluded: 1 })?.excluded).toBeUndefined();
    expect(normalizeLog({ id: "a", start: "2026-01-05" })?.excluded).toBeUndefined();
  });
});

describe("normalizeDayLog — clots + severity (Wave B10)", () => {
  it("keeps clots only when literally true", () => {
    expect(normalizeDayLog({ date: "2026-01-05", clots: true })?.clots).toBe(true);
    expect(normalizeDayLog({ date: "2026-01-05", clots: "yes" })?.clots).toBeNull();
    expect(normalizeDayLog({ date: "2026-01-05" })?.clots).toBeNull();
  });

  it("keeps severity only for symptoms logged that day, on the 1–3 scale", () => {
    const day = normalizeDayLog({
      date: "2026-01-05",
      symptoms: ["cramps", "acne"],
      symptomSeverity: { cramps: 3, acne: 1, headache: 2, bloating: 9, tiredness: "high" },
    });
    expect(day?.symptomSeverity).toEqual({ cramps: 3, acne: 1 });
  });

  it("omits the severity map entirely when nothing valid survives", () => {
    const day = normalizeDayLog({
      date: "2026-01-05",
      symptoms: ["cramps"],
      symptomSeverity: { headache: 2 },
    });
    expect(day?.symptomSeverity).toBeUndefined();
    expect(normalizeDayLog({ date: "2026-01-05", symptomSeverity: "bad" })?.symptomSeverity).toBeUndefined();
  });
});
