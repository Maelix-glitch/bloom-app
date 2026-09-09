import { describe, expect, it } from "vitest";

import { answerLocally } from "./engine";
import { APP_FACT_SOURCE } from "./knowledge";
import { buildCoachContext } from "./intelligence";

/**
 * Regression guard for the app-facts branch.
 *
 * Questions about Bloom itself — points, rewards, what the app is, what the
 * coach can do — must be answered from Bloom's own rules, never by reading
 * the person's (possibly empty) record. The bug this prevents: "how do I get
 * more points?" landing in the general responder, finding nothing logged,
 * and deflecting with "your record is empty". Points come from the app's
 * rules, not from any log.
 */

const CTX = buildCoachContext(
  [],
  [],
  { available: false, habits: [], logs: [], selectedIds: [] } as never,
  "ask",
  "x",
);
const EMPTY_RECORD = {
  today: "2026-09-08",
  trackers: [],
  cycle: null,
  memories: [],
  habitsActive: 0,
};

const ask = (text: string) =>
  answerLocally({
    text,
    mode: "ask",
    record: EMPTY_RECORD as never,
    context: CTX as never,
    history: [],
    provider: "local",
  } as never);

const joined = (parts: string[]) => parts.join("\n");

describe("app facts — Bloom questions answer from Bloom's rules, not the record", () => {
  it("answers a points question from the rewards rules, even with an empty record", () => {
    const a = ask("how do I get more points?");
    const text = joined(a.paragraphs);
    expect(text).toMatch(/point/i);
    expect(text).not.toMatch(/record is empty|nothing in your record/i);
    expect(a.sources).toContain(APP_FACT_SOURCE);
  });

  it("answers 'what is bloom' with an overview, never a deflection", () => {
    const a = ask("what is bloom?");
    const text = joined(a.paragraphs);
    expect(text.toLowerCase()).toMatch(/tracker|habit|mood|cycle/);
    expect(text).not.toMatch(/record is empty|rather say nothing/i);
    expect(a.sources).toContain(APP_FACT_SOURCE);
  });

  it("answers 'what can you do' from the abilities list", () => {
    const a = ask("what can you do?");
    const text = joined(a.paragraphs);
    expect(text.toLowerCase()).toMatch(/habit|photo|remember|log/i);
    expect(text).not.toMatch(/record is empty/i);
    expect(a.sources).toContain(APP_FACT_SOURCE);
  });

  it("still answers ordinary wellbeing questions normally", () => {
    const a = ask("I keep waking up at 3am");
    expect(a.paragraphs.length).toBeGreaterThan(0);
    expect(a.sources).not.toContain(APP_FACT_SOURCE);
  });
});
