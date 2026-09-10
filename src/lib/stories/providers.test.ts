/**
 * Provider tests — the iTunes catalog mapping and the device-upload guards.
 * Network is stubbed; these pin the shape, never Apple's data.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import { musicProvider, validateGifFile } from "./providers";

const song = (over: Record<string, unknown> = {}) => ({
  trackId: 101,
  trackName: "Morning Light",
  artistName: "The Bloomers",
  artworkUrl100: "https://example.com/art/100x100bb.jpg",
  previewUrl: "https://example.com/preview.m4a",
  trackExplicitness: "notExplicit",
  ...over,
});

function stubFetch(payload: unknown, ok = true) {
  const fetch = vi.fn(async () => ({ ok, status: ok ? 200 : 500, json: async () => payload }));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("iTunes music provider", () => {
  it("maps search results to playable tracks", async () => {
    stubFetch({ results: [song(), song({ trackId: 102, trackExplicitness: "explicit" })] });
    const tracks = await musicProvider.search("morning", 12);
    expect(tracks).toHaveLength(2);
    expect(tracks[0]).toMatchObject({
      id: "itunes:101",
      title: "Morning Light",
      artist: "The Bloomers",
      previewUrl: "https://example.com/preview.m4a",
      durationMs: 30000,
      explicit: false,
    });
    expect(tracks[0]!.artworkUrl).toContain("200x200bb");
    expect(tracks[1]!.explicit).toBe(true);
  });

  it("drops tracks that can't be previewed", async () => {
    stubFetch({ results: [song({ previewUrl: "http://insecure/preview.m4a" }), song()] });
    const tracks = await musicProvider.search("morning", 12);
    expect(tracks).toHaveLength(1);
    expect(tracks[0]!.id).toBe("itunes:101");
  });

  it("never queries on an empty search", async () => {
    const fetch = stubFetch({ results: [song()] });
    expect(await musicProvider.search("   ", 12)).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fails soft when the catalog is unreachable", async () => {
    stubFetch({}, false);
    expect(await musicProvider.search("morning", 12)).toEqual([]);
    expect(await musicProvider.trending(6)).toEqual([]);
  });

  it("trending blends and dedupes", async () => {
    stubFetch({ results: [song(), song({ trackId: 103, trackName: "Second" })] });
    const tracks = await musicProvider.trending(10);
    const ids = tracks.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("itunes:101");
  });
});

describe("validateGifFile", () => {
  it("accepts GIFs and animated WebP under the cap", () => {
    const gif = new File([new Uint8Array(2048)], "fun.gif", { type: "image/gif" });
    expect(validateGifFile(gif)).toBeNull();
    const webp = new File([new Uint8Array(2048)], "fun.webp", { type: "image/webp" });
    expect(validateGifFile(webp)).toBeNull();
  });

  it("rejects the wrong type, the oversized, and the empty", () => {
    const png = new File([new Uint8Array(2048)], "still.png", { type: "image/png" });
    expect(validateGifFile(png)).toMatch(/isn't a GIF/);
    const big = new File([new Uint8Array(8)], "big.gif", { type: "image/gif" });
    Object.defineProperty(big, "size", { value: 5 * 1024 * 1024 });
    expect(validateGifFile(big)).toMatch(/too large/);
    const empty = new File([new Uint8Array(8)], "e.gif", { type: "image/gif" });
    expect(validateGifFile(empty)).toMatch(/empty/);
  });
});
