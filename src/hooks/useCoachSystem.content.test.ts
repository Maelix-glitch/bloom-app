// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

/**
 * The Coach replies that rendered with no body. An older client (August
 * 2026) wrote `coach_messages.content` as the whole response object —
 * `{ paragraphs: [...], blocks: [...] }` — instead of the plain string.
 * The importer's text unwrapper never probed `paragraphs`, so those rows
 * arrived as messages with a header, a source label and buttons but no
 * words, while the text sat in the account the whole time. These tests
 * pin the recovery: the object shape unwraps, its blocks survive a
 * strict shape check, locally stored copies repair at read time, and
 * already-imported content-less copies can be patched from their cloud
 * rows by id.
 */

vi.mock("@/lib/supabase", () => ({
  hasSupabaseConfig: true,
  supabaseConfigProblem: () => null,
  supabase: {},
  watchAuth: () => () => {},
}));

import {
  contentToBlocks,
  contentToText,
  messageHasContent,
  repairFromLegacyContent,
  repairMessagesFromRows,
  rowsToMessage,
  type CoachMessage,
} from "./useCoachSystem";

const UUID = "3f6d1c2a-9b4e-4a1c-8d2f-5e6a7b8c9d0e";

const storedReply = {
  paragraphs: [
    "Your sleep has been steadier this week.",
    "Keep the wind-down where it is.",
  ],
  blocks: [],
};

describe("contentToText and the object-shaped content", () => {
  it("unwraps the { paragraphs, blocks } shape an older client stored", () => {
    expect(contentToText(storedReply)).toBe(
      "Your sleep has been steadier this week.\n\nKeep the wind-down where it is.",
    );
  });

  it("keeps the established shapes and precedence untouched", () => {
    expect(contentToText("plain")).toBe("plain");
    expect(contentToText({ text: "field wins", paragraphs: ["other"] })).toBe(
      "field wins",
    );
    expect(contentToText({ blocks: [] })).toBe("");
    expect(contentToText(null)).toBe("");
  });
});

describe("contentToBlocks", () => {
  it("returns well-formed stored blocks", () => {
    const metric = {
      type: "metric",
      label: "Sleep",
      value: "7h 20m",
      series: [6.5, 7, 7.3],
    };
    const plan = { type: "plan", title: "Tonight", steps: [{ label: "Lights out 22:30" }] };
    const proposal = { type: "proposal", title: "Shift the run" };
    expect(contentToBlocks({ paragraphs: [], blocks: [metric, plan, proposal] })).toEqual([
      metric,
      plan,
      proposal,
    ]);
  });

  it("drops anything not shaped exactly like a renderable block", () => {
    expect(
      contentToBlocks({
        blocks: [
          { type: "metric", label: "Sleep" }, // no value, no series
          { type: "metric", label: "Sleep", value: "7h", series: ["7"] }, // non-numeric series
          { type: "plan", title: "Tonight", steps: [{ note: "?" }] }, // steps without labels
          { type: "mystery", title: "?" },
          "metric",
          null,
        ],
      }),
    ).toEqual([]);
    expect(contentToBlocks("a string")).toEqual([]);
    expect(contentToBlocks({})).toEqual([]);
  });
});

describe("rowsToMessage on an object-shaped row", () => {
  it("recovers the reply's words and blocks instead of importing it empty", () => {
    const message = rowsToMessage(
      {
        id: UUID,
        role: "assistant",
        content: storedReply,
        sources: ["live-data"],
        created_at: "2026-08-25T10:00:00.000Z",
      },
      0,
    );
    expect(message.paragraphs).toEqual(storedReply.paragraphs);
    expect(message.text).toContain("steadier this week");
    expect(message.sources).toEqual(["live-data"]);
    expect(messageHasContent(message)).toBe(true);
  });

  it("still imports a plain string row exactly as before", () => {
    const message = rowsToMessage(
      {
        id: UUID,
        role: "user",
        content: "How did I sleep?",
        sources: [],
        created_at: "2026-08-25T09:59:00.000Z",
      },
      0,
    );
    expect(message.role).toBe("user");
    expect(message.paragraphs).toEqual(["How did I sleep?"]);
    expect(message.blocks).toEqual([]);
  });
});

describe("repairFromLegacyContent", () => {
  const damaged = {
    id: UUID,
    role: "coach",
    time: "2026-08-25T10:00:00.000Z",
    paragraphs: [],
    sources: ["live-data"],
    blocks: [],
    content: storedReply,
  } as unknown as CoachMessage;

  it("rebuilds a content-less stored message from its legacy content field", () => {
    const repaired = repairFromLegacyContent(damaged);
    expect(repaired.paragraphs).toEqual(storedReply.paragraphs);
    expect(messageHasContent(repaired)).toBe(true);
  });

  it("leaves healthy messages and hopeless ones untouched", () => {
    const healthy: CoachMessage = { ...damaged, paragraphs: ["Already here."] };
    expect(repairFromLegacyContent(healthy)).toBe(healthy);
    const hopeless = { ...damaged, content: { blocks: [] } } as unknown as CoachMessage;
    expect(repairFromLegacyContent(hopeless)).toBe(hopeless);
  });
});

describe("repairMessagesFromRows", () => {
  const damagedMessage: CoachMessage = {
    id: UUID,
    role: "coach",
    time: "2026-08-25T10:00:00.000Z",
    paragraphs: [],
    sources: ["live-data"],
    blocks: [],
  };
  const store = {
    v: 1 as const,
    activeId: "cloud-x",
    conversations: [
      {
        id: "cloud-x",
        title: "Earlier with Bloom",
        mode: "ask" as const,
        createdAt: "2026-08-25T10:00:00.000Z",
        updatedAt: "2026-08-25T10:00:00.000Z",
        messages: [damagedMessage],
      },
    ],
  };

  it("patches a content-less message from its cloud row, matched by id", () => {
    const row = rowsToMessage(
      {
        id: UUID,
        role: "assistant",
        content: storedReply,
        sources: ["live-data"],
        created_at: "2026-08-25T10:00:00.000Z",
      },
      0,
    );
    const repaired = repairMessagesFromRows(store, [row]);
    expect(repaired).not.toBe(store);
    expect(repaired.conversations[0]?.messages[0]?.paragraphs).toEqual(
      storedReply.paragraphs,
    );
  });

  it("returns the same store when no row can repair anything", () => {
    const emptyRow = rowsToMessage(
      { id: UUID, role: "assistant", content: "", sources: [], created_at: "2026-08-25T10:00:00.000Z" },
      0,
    );
    expect(repairMessagesFromRows(store, [emptyRow])).toBe(store);
    expect(repairMessagesFromRows(store, [])).toBe(store);
  });

  it("never overwrites a message that already has content", () => {
    const healthyStore = {
      ...store,
      conversations: [
        {
          ...store.conversations[0]!,
          messages: [{ ...damagedMessage, paragraphs: ["Mine."] }],
        },
      ],
    };
    const row = rowsToMessage(
      {
        id: UUID,
        role: "assistant",
        content: storedReply,
        sources: ["live-data"],
        created_at: "2026-08-25T10:00:00.000Z",
      },
      0,
    );
    expect(repairMessagesFromRows(healthyStore, [row])).toBe(healthyStore);
  });
});
