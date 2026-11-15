/**
 * Viewer segment flattening.
 *
 * These two functions decide how a story session plays: how many progress bars
 * there are, where a swipe lands, and where the viewer starts. A
 * single-slide story must produce exactly one segment — that is what keeps
 * every existing story playing the way it always did.
 */

import { describe, expect, it, vi } from "vitest";

/* Storage URL resolution needs a configured backend; the flattening rules
   under test don't. A deterministic stand-in keeps them decoupled. */
vi.mock("@/lib/profile/storyMeta", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/profile/storyMeta")>();
  return {
    ...actual,
    storyMediaUrl: (story: { mediaPath?: string | null }) =>
      story.mediaPath ? `https://storage.test/${story.mediaPath}` : null,
  };
});

import { buildSegments, segmentForStory, segmentImageUrls, adjacentImageUrls } from "./segments";
import { toSlide } from "@/lib/stories/slides";
import { makeGifElement, makePhotoElement } from "@/lib/stories/elements";
import { photoBackground } from "@/lib/stories/canvas/backgrounds";
import type { Story } from "@/lib/profile/types";

function story(id: string, overrides: Partial<Story> = {}): Story {
  return {
    id,
    kind: "photo",
    title: id,
    body: "",
    mediaPath: `photos/${id}.jpg`,
    mediaWidth: 1080,
    mediaHeight: 1920,
    accent: "violet",
    atmosphere: "quiet",
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    /* Relative, so the suite can't expire under us: stories are active by
       default; tests that need expiry override with a fixed past date. */
    expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    visibility: "public",
    deletedAt: null,
    mediaType: "image",
    durationMs: null,
    elements: [],
    filterId: null,
    adjustments: null,
    backgroundId: null,
    canvas: null,
    music: null,
    altText: null,
    audience: "all",
    ...overrides,
  } as Story;
}

describe("buildSegments", () => {
  it("gives a legacy single-slide story exactly one segment", () => {
    const segments = buildSegments([story("a")]);

    expect(segments).toHaveLength(1);
    expect(segments[0]!.storyIndex).toBe(0);
    expect(segments[0]!.slideIndex).toBe(0);
    expect(segments[0]!.slideCount).toBe(1);
    // The synthesised slide carries the story's own composition.
    expect(segments[0]!.slide.mediaPath).toBe("photos/a.jpg");
  });

  it("flattens a multi-slide story into one segment per slide", () => {
    const slides = [toSlide({ id: "s1" }), toSlide({ id: "s2" }), toSlide({ id: "s3" })];
    const segments = buildSegments([story("a", { slides })]);

    expect(segments).toHaveLength(3);
    expect(segments.map((s) => s.slideIndex)).toEqual([0, 1, 2]);
    expect(segments.every((s) => s.slideCount === 3)).toBe(true);
    expect(segments.every((s) => s.story.id === "a")).toBe(true);
  });

  it("keeps slide order across several stories", () => {
    const segments = buildSegments([
      story("a", { slides: [toSlide({ id: "s1" }), toSlide({ id: "s2" })] }),
      story("b"),
      story("c", { slides: [toSlide({ id: "s1" }), toSlide({ id: "s2" }), toSlide({ id: "s3" })] }),
    ]);

    expect(segments).toHaveLength(6);
    expect(segments.map((s) => s.storyIndex)).toEqual([0, 0, 1, 2, 2, 2]);
  });

  it("produces stable, unique keys", () => {
    const slides = [toSlide({ id: "s1" }), toSlide({ id: "s2" })];
    const segments = buildSegments([story("a", { slides })]);
    const keys = segments.map((s) => s.key);

    expect(new Set(keys).size).toBe(keys.length);
    expect(keys[0]).toBe("a#s1");
  });

  it("never yields zero segments for a non-empty rail", () => {
    expect(buildSegments([story("a", { slides: [] })])).toHaveLength(1);
    expect(buildSegments([])).toHaveLength(0);
  });
});

describe("segmentForStory", () => {
  const rail = [
    story("a", { slides: [toSlide({ id: "s1" }), toSlide({ id: "s2" })] }),
    story("b"),
    story("c", { slides: [toSlide({ id: "s1" }), toSlide({ id: "s2" }), toSlide({ id: "s3" })] }),
  ];
  const segments = buildSegments(rail);

  it("lands on the first slide of the requested story", () => {
    expect(segmentForStory(segments, 0)).toBe(0);
    expect(segmentForStory(segments, 1)).toBe(2);
    expect(segmentForStory(segments, 2)).toBe(3);
  });

  it("skips an expired story and lands on the next playable one", () => {
    const withExpired = buildSegments([
      story("a", { expiresAt: "2020-01-01T00:00:00.000Z" }),
      story("b", { slides: [toSlide({ id: "s1" }), toSlide({ id: "s2" })] }),
    ]);

    // Asking for the expired story falls through to the next active one, and
    // lands on *its* first slide rather than partway through.
    expect(segmentForStory(withExpired, 0)).toBe(1);
    expect(withExpired[1]!.slideIndex).toBe(0);
  });

  it("returns -1 when nothing is playable", () => {
    const allExpired = buildSegments([story("a", { expiresAt: "2020-01-01T00:00:00.000Z" })]);
    expect(segmentForStory(allExpired, 0)).toBe(-1);
  });

  it("falls back to the first active segment for an out-of-range index", () => {
    expect(segmentForStory(segments, 99)).toBe(0);
  });
});

describe("prefetch image urls", () => {
  const photoEl = {
    ...makePhotoElement({ x: 0.5, y: 0.5, w: 0.6, h: 0.4 }),
    src: "https://cdn.example.test/canvas-photo.jpg",
  };
  const gifEl = makeGifElement({
    gifId: "g1",
    src: "https://cdn.example.test/anim.gif",
    width: 200,
    height: 200,
  })!;

  it("collects everything a rich slide paints — not just its base media", () => {
    const segments = buildSegments([
      story("rich", {
        slides: [
          toSlide({
            id: "s1",
            mediaType: "none",
            mediaPath: null,
            elements: [photoEl, gifEl],
            canvas: photoBackground("https://cdn.example.test/bg.jpg", "#ECE8E1"),
          }),
        ],
      }),
    ]);

    const urls = segmentImageUrls(segments[0]!);
    expect(urls).toContain("https://cdn.example.test/canvas-photo.jpg");
    expect(urls).toContain("https://cdn.example.test/anim.gif");
    expect(urls).toContain("https://cdn.example.test/bg.jpg");
  });

  it("resolves a legacy story's base media through storage", () => {
    const segments = buildSegments([story("a")]);
    const urls = segmentImageUrls(segments[0]!);
    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain("photos/a.jpg");
  });

  it("warms only the neighbours — never the whole rail", () => {
    const rail = ["a", "b", "c", "d", "e"].map((id) => story(id));
    const segments = buildSegments(rail);

    const around = adjacentImageUrls(segments, 2);
    expect(around).toHaveLength(2);
    expect(around.some((u) => u.includes("photos/b.jpg"))).toBe(true);
    expect(around.some((u) => u.includes("photos/d.jpg"))).toBe(true);
    expect(around.some((u) => u.includes("photos/a.jpg"))).toBe(false);
    expect(around.some((u) => u.includes("photos/e.jpg"))).toBe(false);

    // At the rail's edge only the one existing neighbour is warmed.
    expect(adjacentImageUrls(segments, 0)).toHaveLength(1);
    expect(adjacentImageUrls(segments, 4)).toHaveLength(1);
  });

  it("dedupes a photo used by both neighbours", () => {
    const shared = {
      ...makePhotoElement({ x: 0.5, y: 0.5, w: 0.6, h: 0.4 }),
      src: "https://cdn.example.test/shared.jpg",
    };
    const segments = buildSegments([
      story("x", {
        slides: [
          toSlide({ id: "s1", elements: [shared] }),
          toSlide({ id: "s2" }),
          toSlide({ id: "s3", elements: [shared] }),
        ],
      }),
    ]);
    const around = adjacentImageUrls(segments, 1);
    expect(around.filter((u) => u.includes("shared.jpg"))).toHaveLength(1);
  });
});
