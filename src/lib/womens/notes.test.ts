/**
 * Women's Health — educational-note copy rules.
 *
 * The notes are general information, never claims about the reader. This
 * suite scans every word the system can surface (all phase notes, plus the
 * available context built from a steady record) for the wording classes
 * that must never appear:
 *   · certainty about the reader ("you will", "you are fertile");
 *   · fertility / contraception content of any kind — Bloom is not a
 *     contraceptive tool and the copy must never imply it is;
 *   · diagnosis or treatment language.
 */

import { describe, expect, it } from "vitest";

import type { PeriodLog } from "@/lib/cycle/predict";
import { buildCycleContext } from "./context";
import { PHASE_NOTES, phaseNote } from "./notes";

const BANNED: { pattern: RegExp; why: string }[] = [
  { pattern: /\byou will\b/i, why: "certainty about the reader" },
  { pattern: /\byou are fertile\b/i, why: "fertility claim about the reader" },
  { pattern: /fertile window/i, why: "fertility-window content" },
  { pattern: /contracept/i, why: "contraception content" },
  { pattern: /safe days?/i, why: "contraception implication" },
  { pattern: /avoid (getting )?pregnan/i, why: "contraception implication" },
  { pattern: /trying to conceive/i, why: "fertility-planning content" },
  { pattern: /diagnos/i, why: "diagnostic language" },
  { pattern: /\byou have (a|an|the)\b.*\b(condition|disorder|syndrome)\b/i, why: "diagnosis" },
  { pattern: /\b(treat|curing|cures)\b/i, why: "treatment language" },
];

const ALL_NOTES = Object.values(PHASE_NOTES);

describe("PHASE_NOTES · copy rules", () => {
  it("covers every phase the engine can return", () => {
    expect(Object.keys(PHASE_NOTES).sort()).toEqual(
      ["follicular", "late", "luteal", "menstrual", "ovulation"].sort(),
    );
  });

  it("no note uses banned wording", () => {
    for (const note of ALL_NOTES) {
      for (const { pattern, why } of BANNED) {
        expect(note, `${why}: ${pattern} in "${note.slice(0, 40)}…"`).not.toMatch(pattern);
      }
    }
  });

  it("every note is framed as general information and defers to her own record", () => {
    for (const note of ALL_NOTES) {
      expect(note).toMatch(/general information only/i);
      expect(note).toMatch(/your own logged patterns matter more than general notes/i);
    }
  });

  it("phaseNote returns null without a phase", () => {
    expect(phaseNote(null)).toBeNull();
    expect(phaseNote("luteal")).toBe(PHASE_NOTES.luteal);
  });

  it("the built context's own words are clean too", () => {
    const logs: PeriodLog[] = [
      { id: "a", start: "2026-05-04" },
      { id: "b", start: "2026-06-01" },
      { id: "c", start: "2026-06-29" },
      { id: "d", start: "2026-07-27" },
      { id: "e", start: "2026-08-24" },
    ];
    const ctx = buildCycleContext({ logs, today: "2026-09-07", mode: "tracking" });
    expect(ctx.state).toBe("available");
    if (ctx.state !== "available") return;
    const surfaced = [ctx.note, ctx.basis, ctx.nextSummary ?? ""].join(" ");
    for (const { pattern, why } of BANNED) {
      expect(surfaced, why).not.toMatch(pattern);
    }
  });
});
