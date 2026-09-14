/**
 * Provider tests — the iTunes catalog mapping and the device-upload guards.
 * Network is stubbed; these pin the shape, never Apple's data.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import { GiphyGifProvider, GiphyStickerProvider, musicProvider } from "./providers";

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

describe("music chain — Deezer backs up iTunes", () => {
  const deezerTrack = (over: Record<string, unknown> = {}) => ({
    id: 555,
    title: "Chart Topper",
    preview: "https://example.com/preview.mp3",
    explicit_lyrics: false,
    artist: { name: "Chart Act" },
    album: { cover_medium: "https://example.com/cover.jpg" },
    ...over,
  });

  it("falls back to Deezer when iTunes answers nothing", async () => {
    stubFetch({ data: [deezerTrack()] });
    const tracks = await musicProvider.search("chart", 10);
    expect(tracks).toHaveLength(1);
    expect(tracks[0]).toMatchObject({
      id: "deezer:555",
      title: "Chart Topper",
      artist: "Chart Act",
      previewUrl: "https://example.com/preview.mp3",
      explicit: false,
    });
  });

  it("drops Deezer tracks that can't be previewed", async () => {
    stubFetch({ data: [deezerTrack({ preview: "http://insecure/x.mp3" })] });
    expect(await musicProvider.search("chart", 10)).toEqual([]);
  });

  it("trending prefers real charts over blended guesses", async () => {
    stubFetch({ results: [song()], data: [deezerTrack()] });
    const tracks = await musicProvider.trending(10);
    expect(tracks.length).toBeGreaterThan(0);
    expect(tracks.every((t) => t.id.startsWith("deezer:"))).toBe(true);
  });

  it("search prefers iTunes when both answer", async () => {
    stubFetch({ results: [song()], data: [deezerTrack()] });
    const tracks = await musicProvider.search("morning", 10);
    expect(tracks.length).toBeGreaterThan(0);
    expect(tracks.every((t) => t.id.startsWith("itunes:"))).toBe(true);
  });
});

describe("GIF + sticker providers — GIPHY", () => {
  const giphyItem = (id: string, title: string, url: string, still: string) => ({
    id,
    title,
    images: {
      fixed_width: { url, width: "200", height: id === "abc123" ? "180" : "200" },
      fixed_width_still: { url: still },
    },
  });

  it("maps GIPHY results to playable GIFs", async () => {
    const query = vi.fn(async () => [
      giphyItem(
        "abc123",
        "Happy dance",
        "https://media.giphy.com/media/abc123/200w.gif",
        "https://media.giphy.com/media/abc123/200w_s.gif",
      ),
      { id: "broken", images: { fixed_width: { url: "http://insecure/x.gif" } } },
    ]);
    const provider = new GiphyGifProvider({ configured: true, query });
    const gifs = await provider.search("happy", 10);
    expect(gifs).toHaveLength(1);
    expect(gifs[0]).toMatchObject({
      id: "giphy:abc123",
      src: "https://media.giphy.com/media/abc123/200w.gif",
      title: "Happy dance",
      width: 200,
      height: 180,
    });
    expect(query).toHaveBeenCalledWith(
      "gifs",
      "search",
      expect.objectContaining({ q: "happy", limit: "10" }),
    );
  });

  it("maps GIPHY sticker results to playable assets", async () => {
    const query = vi.fn(async () => [
      giphyItem(
        "sticker1",
        "Celebrate",
        "https://media.giphy.com/media/sticker1/200w.gif",
        "https://media.giphy.com/media/sticker1/200w_s.gif",
      ),
      { id: "broken", images: { original: { url: "http://insecure/x.gif" } } },
    ]);
    const provider = new GiphyStickerProvider({ configured: true, query });
    const stickers = await provider.trending(10);
    expect(stickers).toHaveLength(1);
    expect(stickers[0]).toMatchObject({
      id: "giphy:sticker1",
      src: "https://media.giphy.com/media/sticker1/200w.gif",
      title: "Celebrate",
    });
    expect(query).toHaveBeenCalledWith(
      "stickers",
      "trending",
      expect.objectContaining({ limit: "10" }),
    );
  });

  it("unconfigured providers stay silent", async () => {
    const query = vi.fn(async () => []);
    expect(await new GiphyGifProvider({ configured: false, query }).search("x", 10)).toEqual([]);
    expect(await new GiphyStickerProvider({ configured: false, query }).trending(10)).toEqual([]);
    expect(query).not.toHaveBeenCalled();
  });

  it("never ships a GIPHY key in the client", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const src = readFileSync(join(process.cwd(), "src/lib/stories/providers.ts"), "utf8");
    const edge = readFileSync(join(process.cwd(), "src/lib/stories/giphy-edge.ts"), "utf8");
    const example = readFileSync(join(process.cwd(), ".env.example"), "utf8");
    expect(src).not.toMatch(/VITE_GIPHY_API_KEY/);
    expect(edge).not.toMatch(/VITE_GIPHY_API_KEY/);
    expect(example).not.toMatch(/VITE_GIPHY_API_KEY=/);
  });
});
