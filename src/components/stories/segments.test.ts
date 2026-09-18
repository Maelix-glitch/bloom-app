/**
 * Viewer segment flattening.
 *
 * These two functions decide how a story session plays: how many progress bars
 * there are, where a swipe lands, and where the viewer starts. A
 * single-slide story must produce exactly one segment — that is what keeps
 * every existing story playing the way it always did.
 */

import { describe, expect, it } from "vitest";

import { buildSegments, segmentForStory } from "./segments";
import { toSlide } from "@/lib/stories/slides";
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
    createdAt: "2026-09-18T09:00:00.000Z",
    expiresAt: "2026-09-19T09:00:00.000Z",
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
