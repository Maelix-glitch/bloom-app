// @vitest-environment jsdom
/**
 * M-205 (F-28) — the Moments tile must show a composed story's content.
 *
 * The owner's Nov 2026 note carries its words on the canvas (elements),
 * with empty title/body — the pre-fix tile painted only the accent field
 * and read as a blank card. These pins render the grid the way Profile
 * does and assert the composed content is in the tile, while a legacy
 * (pre-canvas) note keeps showing its hand-rolled body.
 */

import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

afterEach(cleanup);

import type { Story } from "@/lib/profile/types";
import { makeGifElement, makeShapeElement, makeTextElement } from "@/lib/stories/elements";
import { MomentsGrid } from "./MomentsGrid";

beforeAll(() => {
  if (typeof window.requestAnimationFrame !== "function") {
    let id = 0;
    const timers = new Map<number, ReturnType<typeof setTimeout>>();
    window.requestAnimationFrame = (cb: FrameRequestCallback) => {
      id += 1;
      timers.set(
        id,
        setTimeout(() => cb(performance.now()), 0),
      );
      return id;
    };
    window.cancelAnimationFrame = (handle: number) => {
      const t = timers.get(handle);
      if (t) clearTimeout(t);
      timers.delete(handle);
    };
  }
  if (typeof window.ResizeObserver !== "function") {
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
  if (typeof window.matchMedia !== "function") {
    window.matchMedia = () =>
      ({
        matches: false,
        media: "",
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList;
  }
});

function mockStory(partial: Partial<Story> = {}): Story {
  const now = new Date();
  return {
    id: `story-${Math.random().toString(36).slice(2)}`,
    kind: "text",
    title: "",
    body: "",
    mediaPath: null,
    mediaWidth: null,
    mediaHeight: null,
    accent: "sage",
    atmosphere: "quiet",
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 20 * 3_600_000).toISOString(),
    visibility: "private",
    deletedAt: null,
    mediaType: "none",
    durationMs: null,
    elements: [],
    filterId: null,
    adjustments: null,
    backgroundId: null,
    canvas: null,
    music: null,
    altText: null,
    audience: "all",
    ...partial,
  };
}

const grid = (stories: Story[]) =>
  render(
    <MomentsGrid
      stories={stories}
      onOpenAt={() => {}}
      onDelete={() => {}}
      onAddToHighlight={() => {}}
      onShareAgain={() => {}}
      onCreate={() => {}}
    />,
  );

describe("MomentsGrid — composed stories (M-205, F-28)", () => {
  it("a canvas note with empty title/body shows its composed text in the tile", () => {
    const el = makeTextElement("Words that live on the canvas");
    grid([mockStory({ elements: [el], backgroundId: "moonlight" })]);
    expect(screen.getByText("Words that live on the canvas")).toBeTruthy();
  });

  it("a legacy note (no canvas) still shows its body in the tile", () => {
    grid([mockStory({ body: "A plain legacy note body." })]);
    expect(screen.getByText("A plain legacy note body.")).toBeTruthy();
  });
});

/**
 * M-207 (F-28, the live shape): the owner's actual 9 Nov 2026 note, as
 * the live record holds it — title "" and body "", a solid #20222A
 * canvas, and exactly two elements: a decorative "underline-hand" shape
 * and one GIF sticker. No words anywhere. M-205's composed-tile test
 * used a text element, so it passed while this shape still read as a
 * blank tile live: the composition at story scale is a near-empty field
 * with a small sticker in the corner. The pin: a wordless story with an
 * image presents that image as the tile's face (full-bleed), and a
 * story that DOES carry words keeps the composed canvas.
 */
const LIVE_GIF_SRC =
  "https://media2.giphy.com/media/v1.Y2lkPTAyMWM5MjI4NW9lY3Nrb3N1Y2kzdDl2dGk0aW04MWZja3RlYWJmbzc4cjZkdDd6aSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/N7aCOnWxcmMSlOy2eH/200w.gif";
const LIVE_GIF_STILL =
  "https://media2.giphy.com/media/v1.Y2lkPTAyMWM5MjI4NW9lY3Nrb3N1Y2kzdDl2dGk0aW04MWZja3RlYWJmbzc4cjZkdDd6aSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/N7aCOnWxcmMSlOy2eH/200w_s.gif";

function liveNoteStory(): Story {
  const underline = makeShapeElement("underline-hand", {
    x: 0.5,
    y: 0.815,
    z: 3,
    w: 0.2,
    h: 0.012,
    fill: "#E0A3B8",
    opacity: 65,
    strokeWidth: 2,
  });
  const gif = makeGifElement(
    {
      gifId: "giphy:N7aCOnWxcmMSlOy2eH",
      src: LIVE_GIF_SRC,
      still: LIVE_GIF_STILL,
      width: 200,
      height: 170,
    },
    { x: 0.6973887118330421, y: 0.8406711771622428, z: 4 },
  );
  if (!underline || !gif) throw new Error("live-shape fixture failed to build");
  gif.scale = 0.9191634062703415;
  return mockStory({
    kind: "text",
    title: "",
    body: "",
    mediaType: "none",
    mediaPath: null,
    accent: "violet",
    atmosphere: "quiet",
    backgroundId: "moonlight",
    createdAt: "2026-11-09T13:52:17.436Z",
    canvas: {
      v: 1,
      ink: "#F7F1E3",
      mode: "solid",
      angle: 180,
      color: "#20222A",
      paint: { type: "solid", color: "#20222A" },
      photo: null,
      overlay: null,
      texture: "none",
      presetId: null,
      textureOpacity: 0.25,
    },
    elements: [underline, gif],
  });
}

describe("MomentsGrid — the wordless composed note (M-207, F-28 live shape)", () => {
  it("presents the note's only image as the tile's face, full-bleed", () => {
    const { container } = grid([liveNoteStory()]);
    const face = container.querySelector(`img[src="${LIVE_GIF_SRC}"]`);
    expect(face, "the GIF is rendered as an image in the tile").not.toBeNull();
    expect(face?.className).toContain("object-cover");
    expect(face?.className).toContain("absolute");
    /* …and the story-scale composition is NOT what fills the tile. */
    expect(container.querySelector(".scanvas")).toBeNull();
  });

  it("a composed story with words keeps its canvas, face treatment aside", () => {
    const story = liveNoteStory();
    const el = makeTextElement("Words that live on the canvas");
    story.elements = [...story.elements, el];
    const { container } = grid([story]);
    expect(container.querySelector(".scanvas")).not.toBeNull();
    expect(screen.getByText("Words that live on the canvas")).toBeTruthy();
  });
});
