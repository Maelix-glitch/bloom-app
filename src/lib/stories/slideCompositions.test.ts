/**
 * Editor slide state, and the round trip through to the viewer.
 *
 * The important test here is the last one. Editor slides and the viewer's
 * segment list are written and read by different modules, and if their
 * convention about what `slides` holds ever drifts, the failure is not a crash
 * — it is the viewer quietly skipping the first slide. So this asserts the
 * whole chain: editor state -> wire format -> storySlides() -> segments.
 */

import { describe, expect, it } from "vitest";

import {
  appendComposition,
  blankComposition,
  compositionsFromSlides,
  compositionsToSlides,
  duplicateComposition,
  MAX_EDITOR_SLIDES,
  moveComposition,
  removeComposition,
  writeComposition,
  type SlideComposition,
} from "./slideCompositions";
import { storySlides } from "./slides";
import { buildSegments } from "@/components/stories/segments";
import { DEFAULT_ADJUSTMENTS } from "./catalogs";
import { presetBackground } from "./canvas/backgrounds";
import { makeTextElement } from "./elements";
import type { Story } from "@/lib/profile/types";

const bg = presetBackground("moonlight");

function comp(id: string, label: string): SlideComposition {
  return {
    id,
    elements: [
      makeTextElement(label, { preset: "editorial", color: "#F7F1E3", x: 0.5, y: 0.5, z: 1 }),
    ],
    background: bg,
    backgroundId: "moonlight",
    filterId: "none",
    adjustments: DEFAULT_ADJUSTMENTS,
    strokes: [],
  };
}

function storyWith(slides: SlideComposition[]): Story {
  const wire = compositionsToSlides(slides);
  return {
    id: "s1",
    kind: "photo",
    title: "Multi",
    body: "",
    mediaPath: null,
    mediaWidth: null,
    mediaHeight: null,
    accent: "violet",
    atmosphere: "quiet",
    createdAt: "2026-09-18T09:00:00.000Z",
    expiresAt: "2026-09-19T09:00:00.000Z",
    visibility: "public",
    deletedAt: null,
    mediaType: "none",
    durationMs: null,
    elements: slides[0]!.elements,
    filterId: null,
    adjustments: null,
    backgroundId: "moonlight",
    canvas: bg,
    music: null,
    altText: null,
    audience: "all",
    ...(wire ? { slides: wire } : {}),
  } as Story;
}

describe("list operations", () => {
  it("appends up to the cap, then refuses", () => {
    let slides = [comp("a", "one")];
    for (let i = 0; i < MAX_EDITOR_SLIDES - 1; i += 1) {
      const next = appendComposition(slides, { ...comp(`b${i}`, "x") });
      expect(next, `append ${i}`).not.toBeNull();
      slides = next!;
    }
    expect(slides).toHaveLength(MAX_EDITOR_SLIDES);
    expect(appendComposition(slides, { ...comp("over", "x") })).toBeNull();
  });

  it("assigns a fresh id to every appended slide", () => {
    const slides = appendComposition([comp("a", "one")], { ...comp("ignored", "two") })!;
    expect(slides).toHaveLength(2);
    expect(slides[1]!.id).not.toBe("ignored");
    expect(slides[1]!.id).not.toBe("a");
  });

  it("refuses to remove the only slide", () => {
    expect(removeComposition([comp("a", "one")], 0)).toBeNull();
  });

  it("removes and keeps the index in range", () => {
    const slides = [comp("a", "1"), comp("b", "2"), comp("c", "3")];
    const mid = removeComposition(slides, 1)!;
    expect(mid.slides.map((s) => s.id)).toEqual(["a", "c"]);
    expect(mid.index).toBe(1);

    const last = removeComposition(slides, 2)!;
    expect(last.index).toBe(1);
  });

  it("duplicates after the source and selects the copy", () => {
    const res = duplicateComposition([comp("a", "1"), comp("b", "2")], 0)!;
    expect(res.slides).toHaveLength(3);
    expect(res.index).toBe(1);
    expect(res.slides[1]!.id).not.toBe("a");
    // The copy carries the same content.
    expect(res.slides[1]!.elements[0]!.kind).toBe("text");
  });

  it("moves and clamps", () => {
    const slides = [comp("a", "1"), comp("b", "2"), comp("c", "3")];
    expect(moveComposition(slides, 0, 2)!.map((s) => s.id)).toEqual(["b", "c", "a"]);
    expect(moveComposition(slides, 0, 99)!.map((s) => s.id)).toEqual(["b", "c", "a"]);
    expect(moveComposition(slides, 1, 1)).toBeNull();
  });

  it("writeComposition preserves the slide id", () => {
    const slides = [comp("keep-me", "one"), comp("b", "two")];
    const next = writeComposition(slides, 0, { ...comp("hijack", "changed") });
    expect(next[0]!.id).toBe("keep-me");
    expect(next[0]!.elements[0]!.kind).toBe("text");
  });

  it("writeComposition ignores an out-of-range index", () => {
    const slides = [comp("a", "one")];
    expect(writeComposition(slides, 5, { ...comp("z", "z") })).toHaveLength(1);
  });

  it("never mutates the input array", () => {
    const slides = [comp("a", "1"), comp("b", "2")];
    const before = slides.map((s) => s.id);
    appendComposition(slides, { ...comp("c", "3") });
    removeComposition(slides, 0);
    moveComposition(slides, 0, 1);
    writeComposition(slides, 0, { ...comp("z", "z") });
    expect(slides.map((s) => s.id)).toEqual(before);
  });
});

describe("blankComposition", () => {
  it("produces something the editor can render immediately", () => {
    const b = blankComposition(bg, "moonlight", DEFAULT_ADJUSTMENTS);
    expect(b.elements).toEqual([]);
    expect(b.filterId).toBe("none");
    expect(b.strokes).toEqual([]);
    expect(b.id).toMatch(/^slide-/);
  });
});

describe("the editor -> viewer round trip", () => {
  it("sends nothing for a single-slide story", () => {
    expect(compositionsToSlides([comp("a", "one")])).toBeNull();
  });

  it("sends every slide, first one included", () => {
    const wire = compositionsToSlides([comp("a", "1"), comp("b", "2"), comp("c", "3")])!;
    expect(wire).toHaveLength(3);
    expect(wire[0]!.id).toBe("a");
    expect(wire[2]!.id).toBe("c");
  });

  it("gives the viewer every slide — including the first", () => {
    // This is the regression this whole module exists to prevent: if the wire
    // format held only slides 2..n, storySlides() would return those and the
    // first slide would vanish from the session.
    const story = storyWith([comp("a", "1"), comp("b", "2"), comp("c", "3")]);
    const segments = buildSegments([story]);

    expect(segments).toHaveLength(3);
    expect(segments[0]!.slide.id).toBe("a");
    expect(segments[1]!.slide.id).toBe("b");
    expect(segments[2]!.slide.id).toBe("c");
  });

  it("keeps a single-slide story at exactly one segment", () => {
    const story = storyWith([comp("a", "1")]);
    expect(story.slides).toBeUndefined();
    expect(buildSegments([story])).toHaveLength(1);
  });

  it("survives a save and reload", () => {
    const original = [comp("a", "1"), comp("b", "2")];
    const story = storyWith(original);
    const reloaded = compositionsFromSlides({ ...comp("a", "1"), id: "a" }, story.slides ?? null);

    expect(reloaded).toHaveLength(2);
    expect(reloaded.map((s) => s.id)).toEqual(["a", "b"]);
    expect(reloaded[1]!.backgroundId).toBe("moonlight");
  });
});
