import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({ hasSupabaseConfig: false, supabase: {} }));

import {
  buildExport,
  describeExport,
  EXPORT_FORMAT,
  exportFileName,
  totalRecords,
} from "@/lib/data/exportAll";
import { bloomKeys, eraseDevice, matchesErasePhrase } from "@/lib/data/erase";

describe("exportAll · one file with everything", () => {
  it("carries every record and counts them", () => {
    const bundle = buildExport({
      exportedAt: "2026-09-07T10:00:00.000Z",
      profile: { displayName: "Ada", username: "ada" },
      moodEntries: [{ id: "m1" }, { id: "m2" }] as never,
      habitLogs: [{ habitId: "h", date: "2026-09-01", completedAt: "x" }],
      periods: [{ id: "p", start: "2026-08-01", end: null, flow: null, notes: null }],
    });
    expect(bundle.format).toBe(EXPORT_FORMAT);
    expect(bundle.counts).toMatchObject({
      moodEntries: 2,
      habitLogs: 1,
      periods: 1,
      trackerDays: 0,
    });
    expect(totalRecords(bundle.counts)).toBe(4);
    expect(bundle.profile).toMatchObject({ username: "ada" });
  });

  it("is happy with an empty record and still round-trips as JSON", () => {
    const bundle = buildExport({ exportedAt: "2026-09-07T10:00:00.000Z" });
    expect(totalRecords(bundle.counts)).toBe(0);
    expect(JSON.parse(JSON.stringify(bundle)).cycle.periods).toEqual([]);
    expect(describeExport(bundle.counts)).toMatch(/Nothing logged yet/);
  });

  it("names the file by the day it was made", () => {
    expect(exportFileName("2026-09-07T10:00:00.000Z")).toBe("bloom-export-20260907.json");
  });

  it("summarises what is inside in plain words", () => {
    const bundle = buildExport({ moodEntries: [{ id: "m" }] as never });
    expect(describeExport(bundle.counts)).toBe("1 mood check-in");
  });
});

describe("erase · this device", () => {
  const fakeStorage = (seed: Record<string, string>) => {
    const store = new Map(Object.entries(seed));
    return {
      get length() {
        return store.size;
      },
      key: (i: number) => [...store.keys()][i] ?? null,
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
      _store: store,
    } as Storage & { _store: Map<string, string> };
  };

  it("removes every bloom key and nothing else", () => {
    const storage = fakeStorage({
      "bloom.habits": "[]",
      "bloom.mood.pending.v1": "[]",
      "sb-auth-token": "keep me",
      theme: "dark",
    });
    expect(bloomKeys(storage).sort()).toEqual(["bloom.habits", "bloom.mood.pending.v1"]);
    expect(eraseDevice(storage)).toBe(2);
    expect([...storage._store.keys()].sort()).toEqual(["sb-auth-token", "theme"]);
  });

  it("only accepts the exact typed phrase", () => {
    expect(matchesErasePhrase("  Erase Everything ")).toBe(true);
    expect(matchesErasePhrase("erase")).toBe(false);
    expect(matchesErasePhrase("")).toBe(false);
  });
});
