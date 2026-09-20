/**
 * phaseScience.ts — the borderland rules, enforced.
 *
 * Science-based means hedged: population framing, mechanisms over promises,
 * and a caveat whenever the phase behind the line came from the general
 * pattern rather than the person's record.
 */
import { describe, expect, it } from "vitest";

import { GENERAL_MODEL_LINES, allPhaseLines, phaseKeyOf, phaseScienceLine } from "./phaseScience";

describe("phaseKeyOf — tolerant of the engine's display labels", () => {
  it("maps every engine label", () => {
    expect(phaseKeyOf("Menstrual")).toBe("menstrual");
    expect(phaseKeyOf("Follicular")).toBe("follicular");
    expect(phaseKeyOf("Ovulation window")).toBe("ovulation");
    expect(phaseKeyOf("Luteal")).toBe("luteal");
  });
  it("refuses the unknown honestly", () => {
    expect(phaseKeyOf(null)).toBeNull();
    expect(phaseKeyOf("")).toBeNull();
    expect(phaseKeyOf("Unknown")).toBeNull();
  });
});

describe("phaseScienceLine — hedged, stable, caveated when assumed", () => {
  it("returns real content for a known phase", () => {
    const line = phaseScienceLine("Luteal", "strong", "seed");
    expect(line).toBeTruthy();
    expect(line).toMatch(/progesterone|luteal/i);
  });

  it("is deterministic for a given seed", () => {
    expect(phaseScienceLine("Menstrual", "strong", "a")).toBe(
      phaseScienceLine("Menstrual", "strong", "a"),
    );
  });

  it("the assumed phase admits it — the app never implies knowledge it lacks", () => {
    const line = phaseScienceLine("Follicular", "assumed", "seed");
    expect(line).toMatch(/general pattern, not your logs/i);
  });

  it("a confirmed phase carries no caveat", () => {
    const line = phaseScienceLine("Follicular", "strong", "seed");
    expect(line).not.toMatch(/general pattern/);
  });

  it("null for anything unrecognised", () => {
    expect(phaseScienceLine(null, "strong")).toBeNull();
    expect(phaseScienceLine("Unknown", "strong")).toBeNull();
  });
});

describe("the population-framing rules — nothing here diagnoses or promises", () => {
  const lines = [...allPhaseLines(), ...GENERAL_MODEL_LINES];

  it("no 'you will' promises anywhere", () => {
    expect(lines.join(" ")).not.toMatch(/you will (feel|be|get)/i);
  });

  it("no diagnosis of PMS or PMDD", () => {
    expect(lines.join(" ")).not.toMatch(/\b(you have|this means you have) (pms|pmdd)\b/i);
  });

  it("the 21–35 day honest range appears in the general model", () => {
    expect(GENERAL_MODEL_LINES.join(" ")).toMatch(/21 to 35|21–35/);
  });

  it("every line is a sentence with content", () => {
    for (const line of lines) {
      expect(line.length).toBeGreaterThan(40);
    }
  });
});

describe("the hash never indexes a pool out of range", () => {
  it("every phase label with arbitrary seeds yields a real line — visual QA regression", () => {
    const labels = ["Menstrual", "Follicular", "Ovulation window", "Luteal"];
    const seeds = [
      "Luteal-2026-09-20", // the seed that exposed the negative-hash bug live
      "Menstrual-2026-02-11",
      "Follicular-2026-12-31",
      "Ovulation window-2026-07-04",
      "x",
      "",
      "一句话",
    ];
    for (const label of labels) {
      for (const seed of seeds) {
        const line = phaseScienceLine(label, "strong", seed);
        expect(line).toBeTruthy();
        expect(line).not.toMatch(/undefined/i);
        expect(line!.length).toBeGreaterThan(40);
      }
    }
  });
});
