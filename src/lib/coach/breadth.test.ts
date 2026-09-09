import { describe, expect, it } from "vitest";

import { answerLocally, isGrounded } from "./engine";
import { KNOWLEDGE, CLINICAL } from "./knowledge";
import { detectTopics } from "./topics";
import { buildCoachContext } from "./intelligence";

/**
 * The regression this file exists for.
 *
 * The coach felt "very strict" — it would only discuss two or three subjects.
 * Probing it showed why, and it was NOT a refusal rule. Recognition had been
 * widened to 30 topics, but answering hadn't: any subject the responder
 * couldn't ground in tracker data fell through to
 *
 *   "I read from your own logs … Right now that record is empty."
 *
 * So "how do I stop procrastinating on my thesis?" — correctly detected as
 * `study` — was answered with a request to go log some data.
 *
 * These tests assert the property that actually matters to a person using it:
 * ask about anything in the app's theme and you get a real answer, with no
 * data logged at all.
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

const words = (parts: string[]) => parts.join(" ").split(/\s+/).filter(Boolean).length;

/* A representative sweep of what a person might actually type. */
const QUESTIONS = [
  "why do I keep waking up at 3am?",
  "how do I stop procrastinating on my thesis?",
  "my roommate is driving me insane",
  "is intermittent fasting worth trying?",
  "I think I'm burning out at work",
  "what should I eat before a run?",
  "how do I know if I need therapy?",
  "money is tight and I can't sleep",
  "explain why caffeine crashes happen",
  "how do I export my data?",
  "I've been really lonely since I moved",
  "I can't get motivated to do anything",
  "does alcohol actually affect sleep",
  "my cramps are getting worse",
  "how do I stop doomscrolling at night",
  "I don't feel good about my body",
  "how do I build a habit that sticks",
  "I never have enough time",
  "I keep second-guessing myself at work",
  "my grandmother died last month",
];

describe("breadth — every subject gets a real answer with no data logged", () => {
  it.each(QUESTIONS)("%s", (q) => {
    const a = ask(q);
    expect(a.paragraphs.length).toBeGreaterThan(0);
    /* The refusal must not appear for any of these. */
    for (const p of a.paragraphs) {
      expect(isGrounded(p)).toBe(true);
    }
    /* Nor the generic "I have nothing on that" fallback. */
    expect(a.paragraphs.join(" ")).not.toMatch(/don't have anything specific stored/i);
  });

  it("recognises all of them as something other than a shrug", () => {
    const unknown = QUESTIONS.filter((q) => detectTopics(q).primary === "general");
    expect(unknown).toEqual([]);
  });
});

describe("brevity — a short question gets a short answer", () => {
  it("answers a one-line closed question in one paragraph", () => {
    const a = ask("did I drink enough water");
    expect(a.paragraphs).toHaveLength(1);
    expect(words(a.paragraphs)).toBeLessThanOrEqual(70);
  });

  it("keeps a greeting to a handful of words", () => {
    const a = ask("hey");
    expect(a.paragraphs).toHaveLength(1);
    expect(words(a.paragraphs)).toBeLessThanOrEqual(30);
  });

  it("gives an open question room", () => {
    const a = ask("why do I keep waking up at 3am?");
    expect(a.paragraphs.length).toBeGreaterThan(1);
  });

  it("never exceeds the paragraph ceiling it set itself", () => {
    for (const q of QUESTIONS) {
      const a = ask(q);
      expect(a.paragraphs.length).toBeLessThanOrEqual(a.budget.maxParagraphs);
    }
  });

  it("short questions are reliably shorter than open ones", () => {
    const short = words(ask("is my sleep ok").paragraphs);
    const open = words(ask("explain in detail why my sleep is bad").paragraphs);
    expect(short).toBeLessThan(open);
  });
});

describe("relevance — the line chosen answers the question asked", () => {
  it("picks the fasting line for a fasting question", () => {
    expect(ask("is intermittent fasting worth trying?").paragraphs.join(" ")).toMatch(/fasting/i);
  });

  it("picks the pre-exercise line for a pre-run question", () => {
    expect(ask("what should I eat before a run?").paragraphs.join(" ")).toMatch(
      /before a run|carbohydrate/i,
    );
  });
});

describe("the log nudge", () => {
  it("never appears for a subject with no tracker behind it", () => {
    /* "Log a few days" is a non-sequitur for therapy or a difficult roommate,
       and that reflex is what made the coach feel like it only wanted data. */
    for (const q of ["how do I know if I need therapy?", "my roommate is driving me insane"]) {
      expect(ask(q).paragraphs.join(" ")).not.toMatch(/log (a few days|one day)/i);
    }
  });
});

describe("clinical honesty", () => {
  it("keeps the see-someone line even when the budget is one paragraph", () => {
    /* Weighted above the record precisely so a trim can't drop it. */
    const a = ask("am I ill");
    expect(a.paragraphs.length).toBeGreaterThan(0);
    expect(a.paragraphs.join(" ")).toMatch(/doctor|diagnos|clinician|person/i);
  });

  it("marks the topics where a human is part of the honest answer", () => {
    expect(CLINICAL.has("illness")).toBe(true);
    expect(CLINICAL.has("grief")).toBe(true);
    expect(CLINICAL.has("water")).toBe(false);
  });
});

describe("the knowledge base itself", () => {
  it("covers a wide range, not two or three subjects", () => {
    expect(Object.keys(KNOWLEDGE).length).toBeGreaterThanOrEqual(20);
  });

  it("gives every entry at least one core line", () => {
    for (const [topic, k] of Object.entries(KNOWLEDGE)) {
      expect(k!.core.length, topic).toBeGreaterThan(0);
      for (const line of k!.core) expect(line.trim().length, topic).toBeGreaterThan(20);
    }
  });

  it("has no duplicated lines across topics", () => {
    /* Duplication is how a knowledge base starts feeling like a template. */
    const all = Object.values(KNOWLEDGE).flatMap((k) => [
      ...k!.core,
      ...(k!.more ?? []),
      ...(k!.step ?? []),
    ]);
    expect(new Set(all).size).toBe(all.length);
  });
});

describe("isGrounded", () => {
  it("rejects the responder's empty-record boilerplate", () => {
    expect(isGrounded("Right now that record is empty.")).toBe(false);
    expect(isGrounded("I read from your own logs — sleep, water …")).toBe(false);
  });

  it("keeps real statements about the person", () => {
    expect(isGrounded("You've averaged 6.1 hours across the last week.")).toBe(true);
  });
});
