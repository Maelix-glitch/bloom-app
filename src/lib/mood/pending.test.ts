import { describe, expect, it } from "vitest";

import {
  applyPending,
  confirmRemove,
  confirmSave,
  EMPTY_QUEUE,
  enqueueRemove,
  enqueueSave,
  isLocalId,
  normalizeEntry,
  normalizeQueue,
  queueSize,
} from "@/lib/mood/pending";
import type { MoodEntry } from "@/lib/mood/types";

const entry = (over: Partial<MoodEntry> & { id: string }): MoodEntry => ({
  timestamp: "2026-09-07T09:00:00.000Z",
  mood: 7,
  energy: 6,
  stress: 3,
  emotions: ["calm"],
  tags: [],
  ...over,
});

const UUID = "6f1a2b3c-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const UUID2 = "0a1b2c3d-4e5f-4a6b-9c8d-7e6f5a4b3c2d";

describe("the mood outbox", () => {
  it("tells local ids from account rows", () => {
    expect(isLocalId("m-abc-def")).toBe(true);
    expect(isLocalId(UUID)).toBe(false);
  });

  it("a later save of the same entry replaces the earlier one", () => {
    const q1 = enqueueSave(EMPTY_QUEUE, entry({ id: "m1", mood: 4 }));
    const q2 = enqueueSave(q1, entry({ id: "m1", mood: 8 }));
    expect(q2.entries).toHaveLength(1);
    expect(q2.entries[0]!.mood).toBe(8);
    expect(queueSize(q2)).toBe(1);
  });

  it("deleting a never-synced entry just drops it; deleting an account row is remembered", () => {
    const local = enqueueRemove(enqueueSave(EMPTY_QUEUE, entry({ id: "m1" })), "m1");
    expect(local).toEqual(EMPTY_QUEUE);

    const account = enqueueRemove(enqueueSave(EMPTY_QUEUE, entry({ id: UUID, mood: 2 })), UUID);
    expect(account.entries).toEqual([]);
    expect(account.removed).toEqual([UUID]);
    expect(enqueueRemove(account, UUID).removed).toEqual([UUID]); // not twice
  });

  it("saving again un-deletes", () => {
    const q = enqueueSave(enqueueRemove(EMPTY_QUEUE, UUID), entry({ id: UUID }));
    expect(q.removed).toEqual([]);
    expect(q.entries.map((e) => e.id)).toEqual([UUID]);
  });

  it("confirmations empty the queue item by item", () => {
    const q = enqueueRemove(enqueueSave(EMPTY_QUEUE, entry({ id: "m1" })), UUID);
    expect(queueSize(q)).toBe(2);
    expect(queueSize(confirmSave(q, "m1"))).toBe(1);
    expect(queueSize(confirmRemove(confirmSave(q, "m1"), UUID))).toBe(0);
  });
});

describe("what the screens see", () => {
  const remote = [
    entry({ id: UUID, timestamp: "2026-09-06T09:00:00.000Z", mood: 5 }),
    entry({ id: UUID2, timestamp: "2026-09-05T09:00:00.000Z", mood: 6 }),
  ];

  it("lays this device's unconfirmed changes over the account copy, in time order", () => {
    const q = enqueueRemove(
      enqueueSave(enqueueSave(EMPTY_QUEUE, entry({ id: UUID, mood: 9 })), entry({ id: "m-new" })),
      UUID2,
    );
    const shown = applyPending(remote, q);
    expect(shown.map((e) => e.id)).toEqual([UUID, "m-new"]);
    expect(shown[0]!.mood).toBe(9); // the edit made here wins until confirmed
  });

  it("is just the account copy when nothing is pending", () => {
    expect(applyPending(remote, EMPTY_QUEUE).map((e) => e.id)).toEqual([UUID2, UUID]);
  });
});

describe("what comes off the disk", () => {
  it("keeps sane entries — with their context — and drops the rest", () => {
    const q = normalizeQueue({
      entries: [
        {
          id: "m1",
          timestamp: "2026-09-07T09:00:00.000Z",
          mood: 7,
          sleep: 7.5,
          emotions: ["calm", "nope"],
        },
        { id: "m2", timestamp: "not a date", mood: 7 },
        { id: "", timestamp: "2026-09-07T09:00:00.000Z", mood: 7 },
        { id: "m4", timestamp: "2026-09-07T09:00:00.000Z" },
        "junk",
      ],
      removed: [UUID, 3, UUID],
    });
    expect(q.entries.map((e) => e.id)).toEqual(["m1"]);
    expect(q.entries[0]).toMatchObject({ sleep: 7.5, emotions: ["calm"], energy: 5, stress: 5 });
    expect(q.removed).toEqual([UUID]);
    expect(normalizeQueue(null)).toEqual(EMPTY_QUEUE);
    expect(normalizeEntry({ id: "x", timestamp: "2026-09-07T09:00:00.000Z", mood: 40 })!.mood).toBe(
      10,
    );
  });
});
