/**
 * The photo answer that lost its first paragraph — owner-reported live,
 * 2026-11-15. He sent a food photo and asked "what is this dish"; the
 * reply he saw was ONLY "≈ kcal · protein · carbs · fat". Two trims
 * conspired: the question's brevity budget was "brief" (one paragraph),
 * so fitToBudget kept just the first paragraph of the vision reply —
 * which the function's prompt had ordered to be the estimate line —
 * and the identification, if the model wrote one at all, was discarded
 * before the reply was shown or stored.
 *
 * The pins: a request carrying an image stands on the media floor
 * (register at least "normal", room for identification + estimate +
 * one note) on BOTH the wire and the local trim, while a text-only ask
 * keeps its old brevity untouched.
 */
import { describe, expect, it, vi } from "vitest";

import { budgetFor, fitToBudget, withMediaFloor } from "./brevity";
import type { EdgeRequest } from "./edge";

const requests: EdgeRequest[] = [];
const lastRequest = (): EdgeRequest | undefined => requests[requests.length - 1];

const PHOTO_REPLY = [
  "That looks like a paneer thali — paneer curry, yellow dal, rice, two rotis and raita.",
  "≈ 700 kcal · 28 g protein · 85 g carbs · 26 g fat",
  "A balanced plate; the dal and raita carry most of the protein.",
];

vi.mock("./edge", async (importOriginal) => {
  const orig = await importOriginal<typeof import("./edge")>();
  return {
    ...orig,
    askEdge: vi.fn(async (request: EdgeRequest) => {
      requests.push(request);
      return { ok: true as const, paragraphs: [...PHOTO_REPLY], provider: "gemini" };
    }),
  };
});

import { ask } from "./engine";
import { buildCoachContext } from "./intelligence";
import type { CoachRecord } from "./responder";

const CTX = buildCoachContext(
  [],
  [],
  { available: false, habits: [], logs: [], selectedIds: [] } as never,
  "ask",
  "x",
);

const RECORD: CoachRecord = {
  today: "2026-11-15",
  trackers: [],
  cycle: null,
  memories: [],
  habitsActive: 0,
};

const IMAGE = { mediaType: "image/jpeg", dataBase64: "aGVsbG8=" };

describe("withMediaFloor — a photo answer keeps its shape", () => {
  it("lifts a brief budget to room for identification, estimate and one note", () => {
    const brief = budgetFor("what is this dish");
    expect(brief.register).toBe("brief");
    const floored = withMediaFloor(brief);
    expect(floored.register).toBe("normal");
    expect(floored.maxParagraphs).toBeGreaterThanOrEqual(3);
    expect(floored.maxWords).toBeGreaterThanOrEqual(150);
  });

  it("leaves full and plan budgets untouched", () => {
    const full = budgetFor("tell me everything about my sleep in detail");
    expect(withMediaFloor(full)).toBe(full);
  });

  it("the old brief trim kept ONLY the estimate line; the floor keeps the identification", () => {
    /* The reply as the old prompt ordered it: estimate first. Under the
       brief budget the trim kept paragraph one and dropped the rest —
       the exact shape of the owner's complaint. */
    const estimateFirst = [PHOTO_REPLY[1]!, PHOTO_REPLY[0]!, PHOTO_REPLY[2]!];
    expect(fitToBudget(estimateFirst, budgetFor("what is this dish"))).toEqual([PHOTO_REPLY[1]]);
    const kept = fitToBudget(PHOTO_REPLY, withMediaFloor(budgetFor("what is this dish")));
    expect(kept[0]).toContain("paneer thali");
    expect(kept).toContain(PHOTO_REPLY[1]);
  });
});

describe("ask — a photo request rides the floor end to end", () => {
  it("sends at least the normal register and returns the identification AND the estimate", async () => {
    const answer = await ask({
      text: "what is this dish",
      mode: "ask",
      record: RECORD,
      context: CTX as never,
      history: [],
      provider: "auto",
      image: IMAGE,
    });
    expect(lastRequest()?.image).toEqual(IMAGE);
    expect(lastRequest()?.register).toBe("normal");
    expect(answer.paragraphs[0]).toContain("paneer thali");
    expect(answer.paragraphs).toContain(PHOTO_REPLY[1]);
    expect(answer.paragraphs.length).toBeGreaterThanOrEqual(2);
  });

  it("a text-only ask keeps its brevity — same question, brief register, trimmed reply", async () => {
    const answer = await ask({
      text: "what is this dish",
      mode: "ask",
      record: RECORD,
      context: CTX as never,
      history: [],
      provider: "auto",
    });
    expect(lastRequest()?.register).toBe("brief");
    expect(answer.paragraphs).toEqual([PHOTO_REPLY[0]]);
  });
});
