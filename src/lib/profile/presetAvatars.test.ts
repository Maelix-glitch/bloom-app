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

  /* The curated family (2026-11-15 rework): dark botanical, dusk light,
     gold warmth — and nothing else. The retired ids stay retired: `bokeh`
     read as stock speckle with a violet tint its photo does not contain,
     `lake` was a blue daylight landscape in a gold-and-ink app, and the
     rework retired `botanical` (mostly black negative space) and `dusk`
     (a wide interior scene) for reading as smudges at avatar size. */
  it("is exactly the curated set, with the off-palette defaults retired", () => {
    expect(PRESET_AVATARS.map((p) => p.id)).toEqual([
      "leaf",
      "fern",
      "petal",
      "branch",
      "window",
      "candle",
      "bloom",
      "goldenhour",
    ]);
    expect(presetFor("preset:bokeh")).toBeNull();
    expect(presetFor("preset:lake")).toBeNull();
    expect(presetFor("preset:botanical")).toBeNull();
    expect(presetFor("preset:dusk")).toBeNull();
  });

  it("retired ids resolve to initials, never a broken image", () => {
    const remote = vi.fn(() => "https://example.com/should-not-be-used");
    expect(resolveAvatar("preset:botanical", remote)).toBeNull();
    expect(resolveAvatar("preset:dusk", remote)).toBeNull();
    expect(remote).not.toHaveBeenCalled();
  });

  it("serves only imagery already in the repo — no hotlinked defaults", () => {
    for (const p of PRESET_AVATARS) {
      expect(p.src).not.toMatch(/^https?:\/\//);
      expect(p.src.length).toBeGreaterThan(0);
      /* Every member is a bundled avatar edition now — the 2026-11-15
         rework replaced the last public-path original (goldenhour's
         223 KB landscape) with an optimised square derivative. */
      expect(p.src.startsWith("/rewards/")).toBe(false);
    }
  });

  it("tints stay in the gold / botanical family", () => {
    const hueOf = (hex: string): number => {
      const n = parseInt(hex.slice(1), 16);
      const r = (n >> 16) / 255;
      const g = ((n >> 8) & 0xff) / 255;
      const b = (n & 0xff) / 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      if (max === min) return 0;
      const d = max - min;
      const h =
        max === r
          ? ((g - b) / d + (g < b ? 6 : 0)) * 60
          : max === g
            ? ((b - r) / d + 2) * 60
            : ((r - g) / d + 4) * 60;
      return h;
    };
    for (const p of PRESET_AVATARS) {
      const hue = hueOf(p.tint);
      /* Ambers and golds live ~20–55°, botanical greens ~60–170°.
         Violet, blue and pink (200–360°) are outside the family. */
      expect(hue, `${p.id} tint ${p.tint}`).toBeGreaterThanOrEqual(15);
      expect(hue, `${p.id} tint ${p.tint}`).toBeLessThanOrEqual(170);
    }
  });

  it("labels and tints match what the photos actually show", () => {
    /* flower-detail.jpg is a white bloom on dark leaves — not a pink petal. */
    const bloom = presetFor("preset:petal")!;
    expect(bloom.label).toBe("White bloom");
    expect(bloom.tint).not.toBe("#e0a9c8");
    /* No tint may claim the violet/blue the curated family excludes. */
    for (const p of PRESET_AVATARS) {
      expect(p.tint.toLowerCase()).not.toBe("#a58bff");
      expect(p.tint.toLowerCase()).not.toBe("#8fb6d9");
    }
  });
});
