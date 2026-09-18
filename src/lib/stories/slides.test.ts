/**
 * Multi-slide model.
 *
 * The behaviour that matters most is back-compat: every story published before
 * this feature must still render as exactly one slide, unchanged. That is what
 * the first group of tests pins down.
 */

import { describe, expect, it } from "vitest";

import {
  addSlide,
  clampSlideDuration,
  cloneSlide,
  duplicateSlide,
  emptySlide,
  isMultiSlide,
  MAX_SLIDES,
  moveSlide,
  removeSlide,
  sanitizeSlides,
  SLIDE_DURATION_BOUNDS,
  slideDurationMs,
  storySlides,
  toSlide,
  totalDurationMs,
  updateSlide,
  type StorySlide,
} from "./slides";
import type { Story } from "@/lib/profile/types";

/** A story shaped exactly like a row published before multi-slide existed. */
function legacyStory(overrides: Partial<Story> = {}): Story {
  return {
    id: "story-legacy",
    kind: "photo",
    title: "Morning",
    body: "",
    mediaPath: "photos/a.jpg",
    mediaWidth: 1080,
    mediaHeight: 1920,
    accent: "violet",
    atmosphere: "quiet",
    createdAt: "2026-01-01T00:00:00.000Z",
    expiresAt: "2026-01-02T00:00:00.000Z",
    visibility: "public",
    deletedAt: null,
    mediaType: "image",
    durationMs: null,
    elements: [],
    filterId: "warm",
    adjustments: null,
    backgroundId: null,
    canvas: null,
    music: null,
    altText: "A window",
    audience: "all",
    ...overrides,
  } as Story;
}

describe("storySlides back-compat", () => {
  it("reads a pre-multi-slide story as exactly one slide", () => {
    const slides = storySlides(legacyStory());

    expect(slides).toHaveLength(1);
    const slide = slides[0]!;
    expect(slide.mediaPath).toBe("photos/a.jpg");
    expect(slide.mediaWidth).toBe(1080);
    expect(slide.mediaHeight).toBe(1920);
    expect(slide.filterId).toBe("warm");
    expect(slide.altText).toBe("A window");
    expect(slide.mediaType).toBe("image");
  });

  it("never returns an empty array, even for a blank story", () => {
    expect(storySlides({})).toHaveLength(1);
    expect(storySlides({ slides: [] })).toHaveLength(1);
    expect(storySlides({ slides: null })).toHaveLength(1);
  });

  it("prefers explicit slides when present", () => {
    const a = toSlide({ mediaPath: "a.jpg" });
    const b = toSlide({ mediaPath: "b.jpg" });
    const slides = storySlides({ slides: [a, b] });

    expect(slides).toHaveLength(2);
    expect(slides[0]!.mediaPath).toBe("a.jpg");
    expect(slides[1]!.mediaPath).toBe("b.jpg");
  });

  it("caps an oversized slide array at MAX_SLIDES", () => {
    const many = Array.from({ length: MAX_SLIDES + 5 }, () => toSlide({}));
    expect(storySlides({ slides: many })).toHaveLength(MAX_SLIDES);
  });

  it("isMultiSlide is false for legacy rows and true past one slide", () => {
    expect(isMultiSlide(legacyStory())).toBe(false);
    expect(isMultiSlide({ slides: [toSlide({})] })).toBe(false);
    expect(isMultiSlide({ slides: [toSlide({}), toSlide({})] })).toBe(true);
  });
});

describe("toSlide tolerance", () => {
  it("fills in every field from an empty object", () => {
    const slide = toSlide({});
    expect(slide.id).toMatch(/^slide-/);
    expect(slide.mediaType).toBe("none");
    expect(slide.mediaPath).toBeNull();
    expect(slide.elements).toEqual([]);
    expect(slide.canvas).toBeNull();
    expect(slide.adjustments).toBeNull();
  });

  it("rejects a bogus mediaType rather than trusting it", () => {
    expect(toSlide({ mediaType: "hologram" as never }).mediaType).toBe("none");
  });

  it("treats non-finite dimensions as absent", () => {
    const slide = toSlide({ mediaWidth: Number.NaN, mediaHeight: Infinity });
    expect(slide.mediaWidth).toBeNull();
    expect(slide.mediaHeight).toBeNull();
  });

  it("only keeps a duration for video slides", () => {
    expect(toSlide({ mediaType: "image", durationMs: 4000 }).durationMs).toBeNull();
    expect(toSlide({ mediaType: "video", durationMs: 4000 }).durationMs).toBe(4000);
  });

  it("keeps an existing id so React keys survive a round trip", () => {
    expect(toSlide({ id: "kept" }).id).toBe("kept");
  });

  it("gives every new slide a distinct id", () => {
    const ids = new Set(Array.from({ length: 200 }, () => emptySlide().id));
    expect(ids.size).toBe(200);
  });
});

describe("clampSlideDuration", () => {
  it("clamps to the bounds", () => {
    expect(clampSlideDuration(-50)).toBe(SLIDE_DURATION_BOUNDS.min);
    expect(clampSlideDuration(999_999)).toBe(SLIDE_DURATION_BOUNDS.max);
    expect(clampSlideDuration(3000)).toBe(3000);
  });

  it("falls back to the default for junk", () => {
    expect(clampSlideDuration(undefined)).toBe(6000);
    expect(clampSlideDuration("4000")).toBe(6000);
    expect(clampSlideDuration(Number.NaN)).toBe(6000);
  });
});

describe("timing", () => {
  it("uses the clip length for video and the fallback otherwise", () => {
    const video = toSlide({ mediaType: "video", durationMs: 4000 });
    const image = toSlide({ mediaType: "image" });

    expect(slideDurationMs(video, 7000)).toBe(4000);
    expect(slideDurationMs(image, 7000)).toBe(7000);
  });

  it("sums the story", () => {
    const slides = [
      toSlide({ mediaType: "video", durationMs: 4000 }),
      toSlide({ mediaType: "image" }),
      toSlide({}),
    ];
    expect(totalDurationMs(slides, 7000)).toBe(4000 + 7000 + 7000);
  });
});

describe("list operations", () => {
  const three = () =>
    [toSlide({ id: "a" }), toSlide({ id: "b" }), toSlide({ id: "c" })] satisfies StorySlide[];

  it("adds a slide", () => {
    const next = addSlide(three());
    expect(next).toHaveLength(4);
  });

  it("refuses to add past the cap", () => {
    const full = Array.from({ length: MAX_SLIDES }, () => toSlide({}));
    expect(addSlide(full)).toBeNull();
  });

  it("duplicates in place, after the source", () => {
    const next = duplicateSlide(three(), 1)!;
    expect(next.map((s) => s.id)).toEqual(["a", "b", expect.stringMatching(/^slide-/), "c"]);
  });

  it("refuses to remove the last slide", () => {
    expect(removeSlide([toSlide({})], 0)).toBeNull();
  });

  it("removes by index", () => {
    expect(removeSlide(three(), 1)!.map((s) => s.id)).toEqual(["a", "c"]);
  });

  it("rejects an out-of-range removal", () => {
    expect(removeSlide(three(), 7)).toBeNull();
  });

  it("moves forward and backward", () => {
    expect(moveSlide(three(), 0, 2)!.map((s) => s.id)).toEqual(["b", "c", "a"]);
    expect(moveSlide(three(), 2, 0)!.map((s) => s.id)).toEqual(["c", "a", "b"]);
  });

  it("clamps an out-of-range move target instead of throwing", () => {
    expect(moveSlide(three(), 0, 99)!.map((s) => s.id)).toEqual(["b", "c", "a"]);
  });

  it("returns null for a no-op move", () => {
    expect(moveSlide(three(), 1, 1)).toBeNull();
  });

  it("updates in place and preserves the id", () => {
    const next = updateSlide(three(), 1, { mediaPath: "new.jpg", id: "hijack" })!;
    expect(next[1]!.mediaPath).toBe("new.jpg");
    expect(next[1]!.id).toBe("b");
  });

  it("cloneSlide copies content but not the id", () => {
    const src = toSlide({ id: "orig", mediaPath: "x.jpg" });
    const copy = cloneSlide(src);
    expect(copy.mediaPath).toBe("x.jpg");
    expect(copy.id).not.toBe("orig");
  });

  it("list helpers are pure — they never mutate the input", () => {
    const input = three();
    const snapshot = input.map((s) => s.id);
    addSlide(input);
    removeSlide(input, 0);
    moveSlide(input, 0, 2);
    updateSlide(input, 0, { mediaPath: "z.jpg" });
    expect(input.map((s) => s.id)).toEqual(snapshot);
    expect(input[0]!.mediaPath).toBeNull();
  });
});

describe("sanitizeSlides", () => {
  it("accepts a well-formed array", () => {
    const slides = sanitizeSlides([{ mediaPath: "a.jpg" }, { mediaPath: "b.jpg" }]);
    expect(slides).toHaveLength(2);
    expect(slides![0]!.mediaPath).toBe("a.jpg");
  });

  it("rejects junk so the caller can fall back to the legacy path", () => {
    expect(sanitizeSlides(null)).toBeNull();
    expect(sanitizeSlides(undefined)).toBeNull();
    expect(sanitizeSlides([])).toBeNull();
    expect(sanitizeSlides("nope")).toBeNull();
    expect(sanitizeSlides([null])).toBeNull();
    expect(sanitizeSlides([{ ok: true }, 42])).toBeNull();
  });

  it("truncates an oversized payload", () => {
    const many = Array.from({ length: MAX_SLIDES + 3 }, () => ({}));
    expect(sanitizeSlides(many)).toHaveLength(MAX_SLIDES);
  });
});
