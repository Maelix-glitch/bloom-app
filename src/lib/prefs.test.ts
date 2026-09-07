import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({ hasSupabaseConfig: false, supabase: {} }));

import { mergeDocs, normalizeDoc, type PrefsDoc } from "@/lib/prefs";

describe("prefs · normalizeDoc — nothing corrupt reaches the UI", () => {
  it("keeps well-formed entries and drops the rest", () => {
    const doc = normalizeDoc({
      a: { value: 1, updatedAt: "2026-09-01T00:00:00.000Z" },
      b: { value: "x" }, // no stamp
      c: { updatedAt: "2026-09-01T00:00:00.000Z" }, // no value
      d: { value: null, updatedAt: "not a date" },
      e: "plain",
      f: { value: [1, 2], updatedAt: "2026-09-02T00:00:00.000Z" },
    });
    expect(Object.keys(doc).sort()).toEqual(["a", "f"]);
    expect(doc["f"]!.value).toEqual([1, 2]);
  });

  it("treats arrays, null and scalars as empty", () => {
    expect(normalizeDoc(null)).toEqual({});
    expect(normalizeDoc([])).toEqual({});
    expect(normalizeDoc("x")).toEqual({});
  });
});

describe("prefs · mergeDocs — per key, later wins", () => {
  const at = (s: string) => `2026-09-0${s}T00:00:00.000Z`;
  let local: PrefsDoc;
  let remote: PrefsDoc;
  beforeEach(() => {
    local = {
      goals: { value: { sleepMinutes: 420 }, updatedAt: at("5") },
      active: { value: ["sleep"], updatedAt: at("1") },
      onlyLocal: { value: 1, updatedAt: at("3") },
    };
    remote = {
      goals: { value: { sleepMinutes: 480 }, updatedAt: at("2") },
      active: { value: ["sleep", "water"], updatedAt: at("4") },
      onlyRemote: { value: 2, updatedAt: at("3") },
    };
  });

  it("takes the newer side of each key independently", () => {
    const { merged, localNewer, remoteNewer } = mergeDocs(local, remote);
    expect(merged["goals"]!.value).toEqual({ sleepMinutes: 420 }); // local newer
    expect(merged["active"]!.value).toEqual(["sleep", "water"]); // remote newer
    expect(merged["onlyLocal"]!.value).toBe(1);
    expect(merged["onlyRemote"]!.value).toBe(2);
    expect(localNewer).toBe(true);
    expect(remoteNewer).toBe(true);
  });

  it("reports nothing newer when both sides are identical", () => {
    const { localNewer, remoteNewer } = mergeDocs(remote, { ...remote });
    expect(localNewer).toBe(false);
    expect(remoteNewer).toBe(false);
  });

  it("an empty account takes everything from the device, and vice versa", () => {
    const up = mergeDocs(local, {});
    expect(up.merged).toEqual(local);
    expect(up.localNewer).toBe(true);
    expect(up.remoteNewer).toBe(false);
    const down = mergeDocs({}, remote);
    expect(down.merged).toEqual(remote);
    expect(down.remoteNewer).toBe(true);
    expect(down.localNewer).toBe(false);
  });
});
