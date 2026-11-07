import { describe, expect, it } from "vitest";

import type { CoachMessage } from "@/hooks/useCoachSystem";
import { dedupeAdjacentMessages } from "./ui-helpers";

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
    const out = dedupeAdjacentMessages([msg("user", "How did I sleep?"), msg("coach", canned), msg("coach", canned)]);
    expect(out.map((m) => m.role)).toEqual(["user", "coach"]);
    expect(out[1]?.paragraphs).toEqual([canned]);
  });

  it("collapses a re-saved prompt, across the 'you'/'user' role vintages", () => {
    const out = dedupeAdjacentMessages([msg("you", "Plan my week"), msg("user", "Plan my week"), msg("coach", "Here is a plan.")]);
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

  it("treats whitespace-only differences as the same text", () => {
    const out = dedupeAdjacentMessages([msg("coach", "Same  reply."), msg("coach", "Same reply.")]);
    expect(out).toHaveLength(1);
  });
});
