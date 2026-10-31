// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";

import { mergeDocs, type PrefsDoc } from "@/lib/prefs";
import {
  POINTS_LEDGER_KEY,
  loadPointsDoc,
  mergePointsDocs,
  parsePointsDoc,
  pointEvents,
  pointsBalance,
  recordPointEvent,
  revokePointEvent,
} from "./ledger";

const stamp = (iso: string) => ({ value: iso, updatedAt: iso });

beforeEach(() => {
  window.localStorage.clear();
});

describe("points ledger · idempotency", () => {
  it("pays the same key once, however many times it is recorded", () => {
    const first = recordPointEvent({
      key: "habit:h1:2026-10-30",
      points: 10,
      kind: "habit",
      label: "Read",
      refId: "h1",
    });
    const second = recordPointEvent({
      key: "habit:h1:2026-10-30",
      points: 10,
      kind: "habit",
      label: "Read",
      refId: "h1",
    });
    expect(first).not.toBeNull();
    expect(second).toBeNull();
    expect(pointsBalance()).toBe(10);
  });

  it("revokes once and can revive on a later tick", () => {
    recordPointEvent({ key: "habit:h1:d1", points: 10, kind: "habit", label: "Read" });
    expect(revokePointEvent("habit:h1:d1")).toBe(true);
    expect(revokePointEvent("habit:h1:d1")).toBe(false);
    expect(pointsBalance()).toBe(0);
    expect(loadPointsDoc().events["habit:h1:d1"]?.removed).toBe(true);

    expect(
      recordPointEvent({ key: "habit:h1:d1", points: 10, kind: "habit", label: "Read" }),
    ).not.toBeNull();
    expect(pointsBalance()).toBe(10);
  });

  it("ignores malformed events instead of half-reading them", () => {
    const doc = parsePointsDoc({
      version: 1,
      events: {
        good: { points: 25, kind: "goal", at: "2026-10-30T10:00:00Z", updatedAt: "2026-10-30T10:00:00Z" },
        zero: { points: 0, kind: "goal", at: "2026-10-30T10:00:00Z", updatedAt: "2026-10-30T10:00:00Z" },
        badKind: { points: 5, kind: "nope", at: "2026-10-30T10:00:00Z", updatedAt: "2026-10-30T10:00:00Z" },
        badDate: { points: 5, kind: "goal", at: "not-a-date", updatedAt: "x" },
      },
    });
    expect(Object.keys(doc.events)).toEqual(["good"]);
    expect(pointsBalance(doc)).toBe(25);
  });
});

describe("points ledger · device merge", () => {
  const event = (key: string, points: number, updatedAt: string) => ({
    key,
    points,
    kind: "habit",
    label: "Read",
    refId: null,
    at: updatedAt,
    updatedAt,
  });

  it("unions earnings from two devices instead of dropping one side", () => {
    const phone = { version: 1, events: { a: event("a", 10, "2026-10-30T08:00:00Z") } };
    const laptop = { version: 1, events: { b: event("b", 25, "2026-10-30T09:00:00Z") } };
    const merged = mergePointsDocs(phone, laptop);
    expect(Object.keys(merged.events).sort()).toEqual(["a", "b"]);
    expect(pointsBalance(merged)).toBe(35);
  });

  it("newer tombstone wins for the same key", () => {
    const before = { version: 1, events: { a: event("a", 10, "2026-10-30T08:00:00Z") } };
    const after = {
      version: 1,
      events: { a: { ...event("a", 10, "2026-10-30T09:00:00Z"), removed: true } },
    };
    const merged = mergePointsDocs(before, after);
    expect(pointEvents(merged)).toHaveLength(0);
    expect(pointsBalance(merged)).toBe(0);
  });

  it("the prefs document merge applies the same union, not last-write-wins", () => {
    const local: PrefsDoc = {
      [POINTS_LEDGER_KEY]: stamp("2026-10-30T08:00:00Z"),
    };
    local[POINTS_LEDGER_KEY]!.value = {
      version: 1,
      events: { a: event("a", 10, "2026-10-30T08:00:00Z") },
    };
    const remote: PrefsDoc = {
      [POINTS_LEDGER_KEY]: stamp("2026-10-30T09:00:00Z"),
    };
    remote[POINTS_LEDGER_KEY]!.value = {
      version: 1,
      events: { b: event("b", 25, "2026-10-30T09:00:00Z") },
    };

    const { merged } = mergeDocs(local, remote);
    const value = merged[POINTS_LEDGER_KEY]!.value;
    expect(Object.keys((value as { events: Record<string, unknown> }).events).sort()).toEqual([
      "a",
      "b",
    ]);
  });
});
