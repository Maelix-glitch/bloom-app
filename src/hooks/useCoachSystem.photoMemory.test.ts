// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

/**
 * The photo with no memory — owner-reported live, 2026-11-15.
 *
 * He sent a food photo and asked "what is this dish"; in the SAME thread
 * he then asked "what is the dish?" and the coach answered as if no
 * image had ever been shared. The mechanism: the history handed to the
 * edge function was words only — a photo message contributed its
 * caption and nothing else, no marker that a photo existed, nothing of
 * what it showed — and the image bytes ride only with the turn that
 * carries them. These tests pin the repair: a photo message carries a
 * recorded identification (photoNote, distilled from the vision reply
 * itself) into every later history build, a photo without a recorded
 * identification still announces itself, and a photo that has scrolled
 * out of the eight-turn window is restated rather than forgotten.
 */

vi.mock("@/lib/supabase", () => ({
  hasSupabaseConfig: true,
  supabaseConfigProblem: () => null,
  supabase: {},
  watchAuth: () => () => {},
}));

import { photoNoteFromReply, toHistoryTurns, type CoachMessage } from "./useCoachSystem";

let seq = 0;
const msg = (over: Partial<CoachMessage>): CoachMessage => ({
  id: `m${seq++}`,
  role: "user",
  time: "2026-11-15T09:00:00.000Z",
  paragraphs: [],
  sources: [],
  blocks: [],
  ...over,
});

const PHOTO_NOTE =
  "That looks like a paneer thali, paneer curry, yellow dal, rice, two rotis and raita.";

const photoMessage = (over: Partial<CoachMessage> = {}): CoachMessage =>
  msg({
    paragraphs: ["what is this dish"],
    attachment: { name: "lunch.jpg", type: "image/jpeg", size: 120_000 },
    photoNote: PHOTO_NOTE,
    ...over,
  });

describe("photoNoteFromReply, the note is the reply's own identification", () => {
  it("takes the first paragraph, collapsed to one line", () => {
    expect(
      photoNoteFromReply([
        "That looks like a paneer thali —\npaneer curry, yellow dal.",
        "≈ 700 kcal · 28 g protein · 85 g carbs · 26 g fat",
      ]),
    ).toBe("That looks like a paneer thali — paneer curry, yellow dal.");
  });

  it("caps a long identification so the note can't crowd history", () => {
    const note = photoNoteFromReply(["x".repeat(500)]);
    expect(note).toBeDefined();
    expect(note!.length).toBeLessThanOrEqual(300);
  });

  it("is undefined when the reply said nothing, never invented", () => {
    expect(photoNoteFromReply([])).toBeUndefined();
    expect(photoNoteFromReply(["", "   "])).toBeUndefined();
  });
});

describe("toHistoryTurns, a photo stays in the thread's working memory", () => {
  it("a follow-up turn's history carries the photo and its identification", () => {
    const turns = toHistoryTurns([
      photoMessage(),
      msg({
        role: "coach",
        paragraphs: [PHOTO_NOTE, "≈ 700 kcal · 28 g protein · 85 g carbs · 26 g fat"],
      }),
      msg({ paragraphs: ["what is the dish?"] }),
    ]);
    expect(turns).toHaveLength(3);
    /* The photo turn itself announces the photo and what Bloom saw. */
    expect(turns[0]!.role).toBe("user");
    expect(turns[0]!.content).toContain("what is this dish");
    expect(turns[0]!.content).toContain(
      `[Photo shared with this message. Bloom identified: ${PHOTO_NOTE}]`,
    );
    /* The follow-up is the last turn, unchanged. */
    expect(turns[2]!.content).toBe("what is the dish?");
  });

  it("a photo whose reply failed still announces itself, no identification invented", () => {
    const turns = toHistoryTurns([
      photoMessage({ photoNote: undefined }),
      msg({ paragraphs: ["and the calories?"] }),
    ]);
    expect(turns[0]!.content).toContain("[A photo was shared with this message.]");
    expect(turns[0]!.content).not.toContain("Bloom identified");
  });

  it("a photo scrolled out of the eight-turn window is restated on the newest turn", () => {
    const filler = Array.from({ length: 10 }, (_, i) =>
      msg({
        role: i % 2 === 0 ? "coach" : "user",
        paragraphs: [`turn ${i}`],
      }),
    );
    const turns = toHistoryTurns([
      photoMessage(),
      ...filler,
      msg({ paragraphs: ["so what was that dish, again?"] }),
    ]);
    expect(turns).toHaveLength(8);
    const last = turns[turns.length - 1]!;
    expect(last.content).toContain("so what was that dish, again?");
    expect(last.content).toContain(
      `[Earlier in this thread the person shared a photo. Bloom identified: ${PHOTO_NOTE}]`,
    );
    /* And no in-window turn pretends the photo is attached to it. */
    expect(
      turns.slice(0, -1).every((t) => !t.content.includes("Photo shared with this message")),
    ).toBe(true);
  });

  it("a text-only thread is mapped exactly as before, no markers appear", () => {
    const turns = toHistoryTurns([
      msg({ paragraphs: ["hello"] }),
      msg({ role: "coach", paragraphs: ["Hi. What's on your mind?"] }),
      msg({ text: "how did I sleep?", paragraphs: ["how did I sleep?"] }),
    ]);
    expect(turns).toEqual([
      { role: "user", content: "hello" },
      { role: "assistant", content: "Hi. What's on your mind?" },
      { role: "user", content: "how did I sleep?" },
    ]);
  });
});
