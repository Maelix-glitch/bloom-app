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
import { makeTextElement } from "@/lib/stories/elements";
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
