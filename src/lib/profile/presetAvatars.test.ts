import { describe, expect, it, vi } from "vitest";

import {
  isPreset,
  PRESET_AVATARS,
  presetFor,
  presetPath,
  resolveAvatar,
} from "./presetAvatars";

/**
 * Presets share one field with uploaded avatars, so the `preset:` prefix is
 * load-bearing: get it wrong and either a bundled photo is handed to Supabase
 * storage as an object key, or an upload is looked up in the preset table.
 * Both fail silently as a missing picture, which is why they are tested.
 */

const remote = (p: string) => `https://storage.example/${p}`;

describe("preset identification", () => {
  it("recognises a preset path", () => {
    expect(isPreset("preset:window")).toBe(true);
  });

  it("does not mistake an upload for one", () => {
    expect(isPreset("user-123/avatar.jpg")).toBe(false);
    expect(isPreset(null)).toBe(false);
    expect(isPreset(undefined)).toBe(false);
  });

  it("round-trips id → path → preset", () => {
    for (const p of PRESET_AVATARS) {
      expect(presetFor(presetPath(p.id))?.id).toBe(p.id);
    }
  });

  it("returns null for a preset id that no longer ships", () => {
    expect(presetFor("preset:removed-in-2027")).toBeNull();
  });
});

describe("resolveAvatar", () => {
  it("serves a bundled asset for a preset, without touching storage", () => {
    const spy = vi.fn(remote);
    const url = resolveAvatar("preset:window", spy);
    expect(url).toBeTruthy();
    expect(spy).not.toHaveBeenCalled();
  });

  it("delegates a normal path to the storage resolver", () => {
    expect(resolveAvatar("user-123/avatar.jpg", remote)).toBe(
      "https://storage.example/user-123/avatar.jpg",
    );
  });

  it("falls back to initials rather than a 404 for an unknown preset", () => {
    const spy = vi.fn(remote);
    expect(resolveAvatar("preset:gone", spy)).toBeNull();
    /* crucially it must NOT be handed to storage as an object key */
    expect(spy).not.toHaveBeenCalled();
  });

  it("has nothing to resolve when there is no avatar", () => {
    expect(resolveAvatar(null, remote)).toBeNull();
    expect(resolveAvatar(undefined, remote)).toBeNull();
  });
});

describe("the preset set itself", () => {
  it("has unique ids", () => {
    const ids = PRESET_AVATARS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every photo a label and a tint", () => {
    for (const p of PRESET_AVATARS) {
      expect(p.label.length).toBeGreaterThan(0);
      expect(p.tint).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
