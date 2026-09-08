import { describe, expect, it } from "vitest";

import {
  isEmptyState,
  liveLogs,
  mergePeriodRecords,
  mergeState,
  periodToRow,
  pruneTombstones,
  recordsFromLogs,
  rowToPeriod,
  rowToState,
  stateToRow,
  type CycleState,
  type PeriodRecord,
} from "@/lib/cycle/periodCloud";
import type { PeriodLog } from "@/lib/cycle/predict";

const log = (over: Partial<PeriodLog> & { id: string; start: string }): PeriodLog => ({
  end: null,
  flow: null,
  notes: null,
  ...over,
});

const rec = (l: PeriodLog, updatedAt: string, deletedAt: string | null = null): PeriodRecord => ({
  log: l,
  updatedAt,
  deletedAt,
});

const T1 = "2026-09-01T10:00:00.000Z";
const T2 = "2026-09-02T10:00:00.000Z";
const T3 = "2026-09-03T10:00:00.000Z";

describe("rows ↔ records", () => {
  it("round-trips an entry through the table shape", () => {
    const r = rec(
      log({ id: "a", start: "2026-08-01", end: "2026-08-05", flow: "medium", notes: "ok" }),
      T1,
    );
    const row = periodToRow(r, "p1");
    expect(row).toEqual({
      profile_id: "p1",
      id: "a",
      start_date: "2026-08-01",
      end_date: "2026-08-05",
      flow: "medium",
      notes: "ok",
      updated_at: T1,
      deleted_at: null,
    });
    expect(rowToPeriod(row)).toEqual(r);
  });

  it("drops rows it cannot trust and tolerates a missing stamp", () => {
    expect(rowToPeriod(null)).toBeNull();
    expect(rowToPeriod({ id: "x", start_date: "nope" })).toBeNull();
    expect(rowToPeriod({ id: "", start_date: "2026-08-01" })).toBeNull();
    const r = rowToPeriod({ id: "x", start_date: "2026-08-01", end_date: "2026-07-30" })!;
    expect(r.log.end).toBeNull(); // an end before the start is ignored, the entry kept
    expect(r.updatedAt).toBe(new Date(0).toISOString());
  });
});

describe("mergePeriodRecords — per entry, the later change wins", () => {
  const a = log({ id: "a", start: "2026-07-01", end: "2026-07-05" });
  const b = log({ id: "b", start: "2026-08-01" });

  it("keeps entries that exist on only one side", () => {
    const { records, newerLocal } = mergePeriodRecords([rec(a, T1)], [rec(b, T1)]);
    expect(liveLogs(records).map((l) => l.id)).toEqual(["a", "b"]);
    expect(newerLocal).toEqual([]);
  });

  it("takes the fresher edit and reports what the device holds ahead of the table", () => {
    const mineNewer = mergePeriodRecords(
      [rec({ ...b, end: "2026-08-06" }, T3)],
      [rec({ ...b, end: "2026-08-04" }, T2)],
    );
    expect(liveLogs(mineNewer.records)[0]!.end).toBe("2026-08-06");
    expect(mineNewer.newerLocal).toEqual(["b"]);

    const theirsNewer = mergePeriodRecords(
      [rec({ ...b, end: "2026-08-06" }, T1)],
      [rec({ ...b, end: "2026-08-04" }, T2)],
    );
    expect(liveLogs(theirsNewer.records)[0]!.end).toBe("2026-08-04");
    expect(theirsNewer.newerLocal).toEqual([]);
  });

  it("a deletion made elsewhere removes the entry here — and a later edit here revives it", () => {
    const deletedThere = mergePeriodRecords([rec(a, T1)], [rec(a, T2, T2)]);
    expect(liveLogs(deletedThere.records)).toEqual([]);
    expect(deletedThere.records[0]!.deletedAt).toBe(T2);

    const editedAfter = mergePeriodRecords([rec({ ...a, notes: "back" }, T3)], [rec(a, T2, T2)]);
    expect(liveLogs(editedAfter.records)[0]!.notes).toBe("back");
    expect(editedAfter.newerLocal).toEqual(["a"]);
  });

  it("retires a duplicate period logged on two devices before they first synced", () => {
    const here = rec(log({ id: "here", start: "2026-08-01", end: "2026-08-05" }), T1);
    const there = rec(log({ id: "there", start: "2026-08-01" }), T2);
    const { records, newerLocal } = mergePeriodRecords([here], [there], T3);
    const live = liveLogs(records);
    expect(live).toHaveLength(1);
    expect(live[0]!.id).toBe("here"); // the one with a last day wins
    expect(records.find((r) => r.log.id === "there")!.deletedAt).toBe(T3);
    expect(newerLocal).toEqual(["there"]); // the tombstone goes up
  });
});

describe("recordsFromLogs — the plain list becomes stamped records", () => {
  const a = log({ id: "a", start: "2026-07-01" });
  const b = log({ id: "b", start: "2026-08-01" });

  it("stamps new and changed entries, leaves untouched ones alone", () => {
    const known = [rec(a, T1), rec(b, T1)];
    const { records, changed } = recordsFromLogs([a, { ...b, end: "2026-08-04" }], known, T2);
    expect(changed).toEqual(["b"]);
    expect(records.find((r) => r.log.id === "a")!.updatedAt).toBe(T1);
    expect(records.find((r) => r.log.id === "b")!.updatedAt).toBe(T2);
  });

  it("turns a vanished entry into a tombstone, once", () => {
    const first = recordsFromLogs([a], [rec(a, T1), rec(b, T1)], T2);
    expect(first.changed).toEqual(["b"]);
    const tomb = first.records.find((r) => r.log.id === "b")!;
    expect(tomb.deletedAt).toBe(T2);
    // next pass: nothing new to say about it
    const second = recordsFromLogs([a], first.records, T3);
    expect(second.changed).toEqual([]);
    expect(second.records.find((r) => r.log.id === "b")!.deletedAt).toBe(T2);
  });

  it("re-adding a deleted entry brings it back alive", () => {
    const { records, changed } = recordsFromLogs([a, b], [rec(a, T1), rec(b, T2, T2)], T3);
    expect(changed).toEqual(["b"]);
    expect(records.find((r) => r.log.id === "b")!.deletedAt).toBeNull();
  });

  it("forgets tombstones every device has long since seen", () => {
    const old = rec(b, "2026-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z");
    expect(pruneTombstones([rec(a, T1), old], T3)).toHaveLength(1);
    expect(pruneTombstones([rec(a, T1), rec(b, T2, T2)], T3)).toHaveLength(2);
  });
});

describe("check-in memory + settings travel together", () => {
  const local: CycleState = {
    memory: { dismissed: { "late:x": "2026-09-01" }, snoozed: { "still-open:y": "2026-09-05" } },
    settings: { personalMaxPlausible: 52, mode: "tracking", pause: null },
    updatedAt: T2,
  };
  const remote: CycleState = {
    memory: {
      dismissed: { "missed-log:z": "2026-08-20" },
      snoozed: { "still-open:y": "2026-09-08" },
    },
    settings: { personalMaxPlausible: 58, mode: "tracking", pause: null },
    updatedAt: T1,
  };

  it("keeps every dismissal, the later snooze and the higher confirmed ceiling", () => {
    const m = mergeState(local, remote);
    expect(Object.keys(m.memory.dismissed).sort()).toEqual(["late:x", "missed-log:z"]);
    expect(m.memory.snoozed["still-open:y"]).toBe("2026-09-08");
    expect(m.settings.personalMaxPlausible).toBe(58);
    expect(m.updatedAt).toBe(T2);
  });

  it("a dismissal anywhere beats a snooze anywhere", () => {
    const m = mergeState(
      { ...local, memory: { dismissed: { q: "2026-09-01" }, snoozed: {} } },
      { ...remote, memory: { dismissed: {}, snoozed: { q: "2026-09-09" } } },
    );
    expect(m.memory.snoozed["q"]).toBeUndefined();
    expect(m.memory.dismissed["q"]).toBe("2026-09-01");
  });

  it("round-trips through the table row and shrugs at junk", () => {
    const row = stateToRow(local, "p1");
    expect(rowToState(row)).toEqual(local);
    expect(rowToState({ checkins: "junk", settings: { personalMaxPlausible: -3 } })).toEqual({
      memory: { dismissed: {}, snoozed: {} },
      settings: { personalMaxPlausible: null, mode: "tracking", pause: null },
      updatedAt: new Date(0).toISOString(),
    });
  });

  it("the cycle mode is one deliberate choice — the later choice wins on either side", () => {
    const paused: CycleState = {
      ...local,
      settings: {
        personalMaxPlausible: 52,
        mode: "paused",
        pause: { until: null, reason: "pregnant", since: "2026-09-01" },
        modeChangedAt: T2,
      },
    };
    const backOn: CycleState = {
      ...remote,
      settings: { personalMaxPlausible: 58, mode: "tracking", pause: null, modeChangedAt: T3 },
    };
    expect(mergeState(paused, backOn).settings.mode).toBe("tracking");
    expect(mergeState(backOn, paused).settings.mode).toBe("tracking");
    const olderOn: CycleState = {
      ...backOn,
      settings: { ...backOn.settings, modeChangedAt: T1 },
    };
    const m = mergeState(olderOn, paused);
    expect(m.settings.mode).toBe("paused");
    expect(m.settings.pause?.reason).toBe("pregnant");
    /* the ceiling still merges independently */
    expect(m.settings.personalMaxPlausible).toBe(58);
    /* an "off" choice is worth a row even with nothing else in it */
    expect(
      isEmptyState({
        memory: { dismissed: {}, snoozed: {} },
        settings: { personalMaxPlausible: null, mode: "off", pause: null },
        updatedAt: T1,
      }),
    ).toBe(false);
    /* round trip keeps the pause */
    expect(rowToState(stateToRow(paused, "p1"))).toEqual(paused);
  });
});
