import { describe, expect, it } from "vitest";

import type { CoachMessage } from "@/hooks/useCoachSystem";
import { dedupeAdjacentMessages, dedupeDuplicatedTurns, orderImportedMessages } from "./ui-helpers";

/**
 * The cloud thread can hold adjacent duplicate rows (a regenerated reply is
 * inserted, its prompt re-saved, and the replaced row is never removed).
 * Importing must not show the same reply twice in a row — and must not eat
 * anything that is a real, separate turn.
 */

let seq = 0;
function msg(role: CoachMessage["role"], text: string): CoachMessage {
  seq += 1;
  return {
    id: `m-${seq}`,
    role,
    time: new Date(2026, 10, 7, 9, seq).toISOString(),
    paragraphs: text ? [text] : [],
    sources: [],
    blocks: [],
  };
}

describe("dedupeAdjacentMessages", () => {
  it("collapses two identical coach replies in a row into one", () => {
    const canned = "Sorry — I lost my train of thought there. Ask me again?";
    const out = dedupeAdjacentMessages([
      msg("user", "How did I sleep?"),
      msg("coach", canned),
      msg("coach", canned),
    ]);
    expect(out.map((m) => m.role)).toEqual(["user", "coach"]);
    expect(out[1]?.paragraphs).toEqual([canned]);
  });

  it("collapses a re-saved prompt, across the 'you'/'user' role vintages", () => {
    const out = dedupeAdjacentMessages([
      msg("you", "Plan my week"),
      msg("user", "Plan my week"),
      msg("coach", "Here is a plan."),
    ]);
    expect(out).toHaveLength(2);
    expect(out[0]?.role).toBe("you");
  });

  it("keeps identical text that is not adjacent", () => {
    const out = dedupeAdjacentMessages([
      msg("user", "Yes"),
      msg("coach", "Noted."),
      msg("user", "Yes"),
      msg("coach", "Noted."),
    ]);
    expect(out).toHaveLength(4);
  });

  it("keeps the same words spoken by the other side", () => {
    const out = dedupeAdjacentMessages([msg("user", "I feel calm"), msg("coach", "I feel calm")]);
    expect(out).toHaveLength(2);
  });

  it("keeps distinct adjacent replies and empty (attachment-only) turns", () => {
    const out = dedupeAdjacentMessages([
      msg("coach", "First answer."),
      msg("coach", "A different second answer."),
      msg("user", ""),
      msg("user", ""),
    ]);
    expect(out).toHaveLength(4);
  });

  it("collapses both halves of the live pattern: a duplicated prompt and its duplicated reply", () => {
    // Seen in an existing local thread after the import-path fix: the same
    // user prompt twice in a row, then the same reply twice in a row. The
    // local store load (readStored in useCoachSystem) runs this same helper
    // over already-stored conversations, so both pairs collapse there too.
    const reply =
      "I read from your logs — and I'd rather say nothing than guess at something I can't see.";
    const out = dedupeAdjacentMessages([
      msg("user", "hello"),
      msg("user", "hello"),
      msg("coach", reply),
      msg("coach", reply),
      msg("user", "Thanks — plan tonight?"),
    ]);
    expect(out.map((m) => m.role)).toEqual(["user", "coach", "user"]);
    expect(out.map((m) => m.paragraphs[0])).toEqual(["hello", reply, "Thanks — plan tonight?"]);
  });

  it("treats whitespace-only differences as the same text", () => {
    const out = dedupeAdjacentMessages([msg("coach", "Same  reply."), msg("coach", "Same reply.")]);
    expect(out).toHaveLength(1);
  });
});

describe("dedupeDuplicatedTurns", () => {
  const reply =
    "I read from your logs — and I'd rather say nothing than guess at something I can't see.";

  it("collapses the exact live pattern: hello / reply / hello / reply becomes one turn", () => {
    // The stored thread the adjacent pass could not repair: the prompt and
    // its reply are each identical, but a reply sits between the two
    // prompts, so no two neighbours are alike.
    const thread = [
      msg("user", "hello"),
      msg("coach", reply),
      msg("user", "hello"),
      msg("coach", reply),
    ];
    const out = dedupeDuplicatedTurns(dedupeAdjacentMessages(thread));
    expect(out.map((m) => m.role)).toEqual(["user", "coach"]);
    expect(out.map((m) => m.paragraphs[0])).toEqual(["hello", reply]);
  });

  it("collapses a turn repeated three times down to the first", () => {
    const out = dedupeDuplicatedTurns([
      msg("user", "hello"),
      msg("coach", reply),
      msg("user", "hello"),
      msg("coach", reply),
      msg("user", "hello"),
      msg("coach", reply),
    ]);
    expect(out).toHaveLength(2);
  });

  it("keeps a legitimate repeat: same prompt, different reply", () => {
    const out = dedupeDuplicatedTurns([
      msg("user", "hello"),
      msg("coach", reply),
      msg("user", "hello"),
      msg("coach", "Hello again — what are we looking at today?"),
    ]);
    expect(out).toHaveLength(4);
  });

  it("keeps a repeated prompt that has no reply yet (the thread just ends)", () => {
    const out = dedupeDuplicatedTurns([
      msg("user", "hello"),
      msg("coach", reply),
      msg("user", "hello"),
    ]);
    expect(out).toHaveLength(3);
  });

  it("keeps identical turns that are not consecutive", () => {
    const out = dedupeDuplicatedTurns([
      msg("user", "hello"),
      msg("coach", reply),
      msg("user", "How did I sleep?"),
      msg("coach", "Soundly — seven and a half hours."),
      msg("user", "hello"),
      msg("coach", reply),
    ]);
    expect(out).toHaveLength(6);
  });

  it("keeps a turn whose reply is attachment-only (no text to compare)", () => {
    const out = dedupeDuplicatedTurns([
      msg("user", "hello"),
      msg("coach", ""),
      msg("user", "hello"),
      msg("coach", ""),
    ]);
    expect(out).toHaveLength(4);
  });

  it("leaves a coach lead-in and the turns after it alone", () => {
    const out = dedupeDuplicatedTurns([
      msg("coach", "Welcome back."),
      msg("user", "hello"),
      msg("coach", reply),
      msg("user", "Thanks — plan tonight?"),
      msg("coach", "Here is a gentle plan."),
    ]);
    expect(out).toHaveLength(5);
  });

  it("compares across the 'you'/'user' role vintages", () => {
    const out = dedupeDuplicatedTurns([
      msg("you", "hello"),
      msg("coach", reply),
      msg("user", "hello"),
      msg("coach", reply),
    ]);
    expect(out).toHaveLength(2);
    expect(out[0]?.role).toBe("you");
  });
});

describe("orderImportedMessages", () => {
  /* Rows stamped at the exact same instant — the shape behind the live
     "reply above its question" render. The tiebreak must restore spoken
     order without disturbing anything the timestamps actually order. */
  const T = "2026-11-07T12:34:00.000Z";
  const at = (role: CoachMessage["role"], text: string, time: string): CoachMessage => ({
    id: `${role}-${text}`,
    role,
    time,
    paragraphs: [text],
    sources: [],
    blocks: [],
  });

  it("puts a reply stamped at the same instant as its question after it", () => {
    const out = orderImportedMessages([
      at("coach", "You slept 6h 40m.", T),
      at("user", "How did I sleep?", T),
    ]);
    expect(out.map((m) => m.role)).toEqual(["user", "coach"]);
  });

  it("untangles a whole same-timestamp thread into turns", () => {
    const out = orderImportedMessages([
      at("coach", "Reply two", T),
      at("user", "Question two", T),
      at("coach", "Reply one", T),
      at("user", "Question one", T),
    ]);
    /* One shared instant cannot recover which turn came first beyond the
       user-before-reply rule; within that rule arrival order is kept. */
    expect(out.map((m) => m.role)).toEqual(["user", "user", "coach", "coach"]);
    expect(out[0]?.paragraphs[0]).toBe("Question two");
  });

  it("leaves genuinely ordered threads untouched", () => {
    const input = [
      at("user", "Morning", "2026-11-07T09:00:00.000Z"),
      at("coach", "Morning!", "2026-11-07T09:00:20.000Z"),
      at("user", "Plan today?", "2026-11-07T09:01:00.000Z"),
      at("coach", "Here is a plan.", "2026-11-07T09:01:20.000Z"),
    ];
    expect(orderImportedMessages(input).map((m) => m.id)).toEqual(input.map((m) => m.id));
  });

  it("still orders by timestamp when times differ across a reply-first pair", () => {
    const out = orderImportedMessages([
      at("coach", "Later reply", "2026-11-07T09:05:00.000Z"),
      at("user", "Earlier question", "2026-11-07T09:04:00.000Z"),
    ]);
    expect(out.map((m) => m.role)).toEqual(["user", "coach"]);
  });

  it("treats 'you' as the person's side, same as 'user'", () => {
    const out = orderImportedMessages([at("coach", "Reply", T), at("you", "Question", T)]);
    expect(out.map((m) => m.role)).toEqual(["you", "coach"]);
  });

  it("keeps arrival order when a timestamp cannot be parsed", () => {
    const out = orderImportedMessages([at("coach", "Reply", "now"), at("user", "Question", "now")]);
    expect(out.map((m) => m.role)).toEqual(["coach", "user"]);
  });
});
