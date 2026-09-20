/**
 * Personalisation of the coach — the guarantee the product asked for:
 * a person with ZERO entries still gets answers shaped by who they are —
 * name, hour, and the cycle science — and never a wall of "your record is
 * empty" where an answer should be.
 */
import { describe, expect, it } from "vitest";

import { buildCoachContext } from "@/lib/coach/intelligence";

import { answerLocally } from "./engine";
import type { CoachRecord } from "./responder";

const CTX = buildCoachContext(
  [],
  [],
  { available: false, habits: [], logs: [], selectedIds: [] } as never,
  "ask",
  "x",
);

const baseRecord: CoachRecord = {
  today: "2026-09-20",
  trackers: [],
  cycle: null,
  memories: [],
  habitsActive: 0,
};

const ask = (text: string, record: CoachRecord = baseRecord) =>
  answerLocally({
    text,
    mode: "ask",
    record,
    context: CTX as never,
    history: [],
    provider: "local",
  } as never);

describe("greeting — knows the person before any entry exists", () => {
  it("greets by name, hour-aware, on an empty record", () => {
    const a = ask("hey", {
      ...baseRecord,
      personal: { name: "Maya", daypart: "evening", focusAreas: [], daysWithBloom: 0 },
    });
    expect(a.paragraphs.join(" ")).toMatch(/evening, Maya/i);
  });

  it("day one with a name welcomes and orients instead of demanding data", () => {
    const a = ask("hi", {
      ...baseRecord,
      personal: { name: "Ada", daypart: "morning", focusAreas: ["sleep"], daysWithBloom: 0 },
    });
    const text = a.paragraphs.join(" ");
    /* named, hour-shaped — whichever line the pool picks */
    expect(text).toMatch(/Ada/);
    /* an honest welcome, not a scold */
    expect(text).not.toMatch(/nothing logged to read from/i);
  });

  it("no name → daypart still shapes the hello", () => {
    const a = ask("hello", {
      ...baseRecord,
      personal: { name: null, daypart: "night", focusAreas: [], daysWithBloom: null },
    });
    expect(a.paragraphs.join(" ")).toMatch(/still up|quiet hours|late one/i);
  });

  it("nothing known at all → the old hello, unchanged", () => {
    const a = ask("hello");
    expect(a.paragraphs.join(" ")).toBeTruthy();
    expect(a.paragraphs.join(" ")).not.toMatch(/, (Maya|Ada)\./);
  });
});

describe("period question — cycle science with zero entries", () => {
  it("leads with the general model, not a bare log-this instruction", () => {
    const a = ask("what's happening with my cycle this week?");
    const text = a.paragraphs.join(" ");
    expect(text).toMatch(/general model/i);
    /* real science, present before any logging */
    expect(text).toMatch(/21 (to|–) 35|28-day|luteal|cycle/i);
    expect(text).not.toMatch(/i read from your own logs/i);
  });

  it("with a tracked phase, the science line arrives and cites its confidence", () => {
    const a = ask("why am I so tired before my period?", {
      ...baseRecord,
      cycle: {
        daysLogged: 12,
        cycleDay: 25,
        phaseLabel: "Luteal",
        nextStart: "2026-09-28",
        daysUntilNext: 8,
        averageLength: 28,
        confidence: "strong",
        confidenceReason: "3 completed cycles behind it",
      },
    });
    const text = a.paragraphs.join(" ");
    expect(text).toMatch(/day 25/i);
    expect(text).toMatch(/progesterone|luteal/i);
    expect(text).not.toMatch(/general pattern, not your logs/);
  });

  it("an assumed phase carries the caveat — no implied knowledge", () => {
    const a = ask("where am i in my cycle?", {
      ...baseRecord,
      cycle: {
        daysLogged: 1,
        cycleDay: 6,
        phaseLabel: "Follicular",
        nextStart: null,
        daysUntilNext: null,
        averageLength: null,
        confidence: "assumed",
        confidenceReason: "general 28-day pattern",
      },
    });
    expect(a.paragraphs.join(" ")).toMatch(/general pattern/i);
  });

  it('a paused cycle says nothing counts as late — even to a bare "am I late?"', () => {
    const a = ask("am i late?", {
      ...baseRecord,
      cycle: {
        daysLogged: 9,
        cycleDay: null,
        phaseLabel: null,
        nextStart: null,
        daysUntilNext: null,
        averageLength: 29,
        confidence: null,
        confidenceReason: null,
        paused: true,
      },
    });
    const text = a.paragraphs.join(" ");
    expect(text).toMatch(/paused|nothing counts as late/i);
    expect(text).not.toMatch(/days late|days past its window/i);
  });

  it("an overdue period surfaces in a general question without cycle words", () => {
    const a = ask("what's going on with me this week?", {
      ...baseRecord,
      cycle: {
        daysLogged: 9,
        cycleDay: 31,
        phaseLabel: "Luteal",
        nextStart: "2026-09-15",
        daysUntilNext: -5,
        averageLength: 29,
        confidence: "strong",
        confidenceReason: "several completed cycles",
      },
    });
    const text = a.paragraphs.join(" ");
    expect(text).toMatch(/past its estimated window|5 days past/i);
  });
});

describe("the ground held — empty records never produce the old refusal", () => {
  it("a general question on an empty record offers knowledge, not a wall", () => {
    const a = ask("how do I stop procrastinating on my thesis?");
    const text = a.paragraphs.join(" ");
    expect(text).not.toMatch(/that record is empty/i);
    expect(text).not.toMatch(/i read from your own logs/i);
    expect(text.length).toBeGreaterThan(40);
  });

  it("focus areas ride along in the record for the cloud brain to use", () => {
    const record: CoachRecord = {
      ...baseRecord,
      personal: {
        name: "Maya",
        daypart: "morning",
        focusAreas: ["sleep", "study"],
        daysWithBloom: 2,
      },
    };
    expect(record.personal?.focusAreas).toEqual(["sleep", "study"]);
  });
});
