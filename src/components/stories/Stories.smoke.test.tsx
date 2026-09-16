// @vitest-environment jsdom
/**
 * Story surface smoke tests — every major surface renders without crashing
 * and exposes its key affordances. jsdom only; interaction timing and media
 * stay in manual QA.
 */

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

// vitest runs with `globals: false`, so Testing Library's automatic
// `afterEach(cleanup)` never registers — without this, each test renders into
// the same document and queries see every previous surface.
afterEach(cleanup);

import type { Story } from "@/lib/profile/types";
import { ELEMENT_LIMITS, makePollElement, makeTextElement } from "@/lib/stories/elements";
import { StoryRail } from "./StoryRail";
import { ElementLayer } from "./ElementLayer";
import { StoryCanvas } from "./StoryCanvas";
import { StoryViewer } from "./StoryViewer";
import { StoryArchive } from "./StoryArchive";
import { StorySettings } from "./StorySettings";
import { ReactionBar } from "./InteractionSheets";
import { BloomShareCard } from "./ShareCard";
import { GifTray, MusicTray } from "./MediaTrays";
import { StickerTray } from "./StickerTray";

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
    window.matchMedia = () => ({
      matches: false,
      media: "",
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });
  }
});

function mockStory(partial: Partial<Story> = {}): Story {
  const now = new Date();
  return {
    id: `story-${Math.random().toString(36).slice(2)}`,
    kind: "text",
    title: "A quiet morning",
    body: "Coffee, light, and one deep breath.",
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
    backgroundId: "moonlight",
    // Stories from before the canvas column existed carry null here.
    canvas: null,
    music: null,
    altText: null,
    audience: "all",
    ...partial,
  };
}

describe("StoryRail", () => {
  it("renders your ring first with an add affordance", () => {
    const stories = [mockStory(), mockStory()];
    render(
      <StoryRail
        name="June"
        avatarPath={null}
        accent="sage"
        stories={stories}
        seenIds={new Set()}
        loading={false}
        onOpen={() => {}}
        onAdd={() => {}}
      />,
    );
    expect(screen.getByRole("list", { name: "Stories" })).toBeTruthy();
    expect(screen.getByText("Your story")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add to your story" })).toBeTruthy();
  });

  it("shows skeletons while loading", () => {
    render(
      <StoryRail
        name="June"
        avatarPath={null}
        accent="sage"
        stories={[]}
        seenIds={new Set()}
        loading
        onOpen={() => {}}
        onAdd={() => {}}
      />,
    );
    expect(screen.getByText("Loading stories…")).toBeTruthy();
  });
});

describe("StoryCanvas", () => {
  it("renders text elements in static mode", () => {
    const story = mockStory({
      elements: [
        makeTextElement("Hello, Bloom", { x: 0.5, y: 0.4 }),
        makePollElement("Tea?", ["Yes", "No"], { x: 0.5, y: 0.7 }),
      ],
    });
    render(
      <div style={{ width: 390, height: 690 }}>
        <StoryCanvas
          media={{ type: "none", src: null }}
          backgroundId={story.backgroundId}
          elements={story.elements}
          mode="static"
        />
      </div>,
    );
    expect(screen.getByText("Hello, Bloom")).toBeTruthy();
    expect(screen.getByText("Tea?")).toBeTruthy();
  });

  it("gives the selected element four resize handles, and only that one", () => {
    const els = [
      makeTextElement("Resize me", { x: 0.5, y: 0.4 }),
      makeTextElement("Leave me", { x: 0.5, y: 0.7 }),
    ];
    const { container } = render(
      <div style={{ width: 390, height: 690 }}>
        <StoryCanvas
          media={{ type: "none", src: null }}
          elements={els}
          mode="edit"
          selectedId={els[0]!.id}
          onSelect={() => {}}
          onResizeStart={() => {}}
        />
      </div>,
    );
    const handles = container.querySelectorAll("[data-se-handle]");
    // Four corners on the selected element, none on the other one.
    expect(handles).toHaveLength(4);
    const corners = [...handles].map((h) => h.getAttribute("data-corner"));
    expect(corners.sort()).toEqual(["ne", "nw", "se", "sw"]);
    // Every handle resolves back to its own element, which is how the gesture
    // knows what to resize before selection has landed.
    for (const h of handles) {
      expect(h.closest("[data-se-el]")?.getAttribute("data-se-el")).toBe(els[0]!.id);
    }
  });

  it("hides the handles while a tool sheet owns the screen", () => {
    const els = [makeTextElement("No handles", { x: 0.5, y: 0.4 })];
    const { container } = render(
      <div style={{ width: 390, height: 690 }}>
        <StoryCanvas
          media={{ type: "none", src: null }}
          elements={els}
          mode="edit"
          selectedId={els[0]!.id}
          onSelect={() => {}}
          onResizeStart={() => {}}
          resizeEnabled={false}
        />
      </div>,
    );
    expect(container.querySelectorAll("[data-se-handle]")).toHaveLength(0);
  });
});

describe("StoryViewer", () => {
  it("opens on the story with header, caption, and footer", () => {
    const stories = [mockStory({ title: "First light" })];
    render(
      <StoryViewer
        target={{ stories, startIndex: 0 }}
        viewerName="June"
        viewerAvatarPath={null}
        accent="sage"
        onClose={() => {}}
      />,
    );
    expect(screen.getByText("June")).toBeTruthy();
    expect(screen.getByRole("button", { name: /close/i })).toBeTruthy();
  });

  it("is closed when no target is given", () => {
    const { container } = render(
      <StoryViewer target={null} viewerName="June" accent="sage" onClose={() => {}} />,
    );
    expect(container.textContent ?? "").not.toContain("June");
  });
});

describe("StoryArchive", () => {
  it("groups memories by month with a view affordance", () => {
    const stories = [
      mockStory({ createdAt: "2026-03-14T12:00:00.000Z" }),
      mockStory({ createdAt: "2026-03-02T12:00:00.000Z" }),
    ];
    render(
      <StoryArchive
        open
        onClose={() => {}}
        archived={stories}
        active={[]}
        onView={() => {}}
        onShareAgain={() => {}}
        onDelete={() => {}}
        onAddToHighlight={() => {}}
      />,
    );
    expect(screen.getByText(/2026/)).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /view story/i })).toHaveLength(2);
  });

  it("explains the empty vault kindly", () => {
    render(
      <StoryArchive
        open
        onClose={() => {}}
        archived={[]}
        active={[]}
        onView={() => {}}
        onShareAgain={() => {}}
        onDelete={() => {}}
        onAddToHighlight={() => {}}
      />,
    );
    expect(screen.getByText(/nothing resting here yet/i)).toBeTruthy();
  });
});

describe("StorySettings", () => {
  it("renders every control with a default audience choice", () => {
    render(<StorySettings userId={null} onClose={() => {}} />);
    expect(screen.getByRole("switch", { name: /replies/i })).toBeTruthy();
    expect(screen.getByRole("switch", { name: /reactions/i })).toBeTruthy();
    expect(screen.getByRole("switch", { name: /blooms/i })).toBeTruthy();
    expect(screen.getByRole("switch", { name: /keep in archive/i })).toBeTruthy();
    expect(screen.getByRole("radio", { name: /everyone/i })).toBeTruthy();
    expect(screen.getByRole("radio", { name: /close friends/i })).toBeTruthy();
  });
});

describe("InteractionSheets", () => {
  it("reaction bar offers the full vocabulary", () => {
    const onPop = vi.fn();
    render(<ReactionBar storyId="s1" userId="u1" enabled onPop={onPop} />);
    for (const name of ["Love", "Bloom", "Sparkle", "Warm smile", "Cheering", "Quiet night"]) {
      expect(screen.getByRole("button", { name })).toBeTruthy();
    }
  });
});

describe("MediaTrays", () => {
  it("GIF tray searches GIPHY only", () => {
    render(<GifTray onPick={() => {}} onClose={() => {}} />);
    expect(screen.getByRole("textbox", { name: /search gifs/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /upload a gif/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /add motion:/i })).toBeNull();
  });

  it("sticker tray searches GIPHY only", () => {
    render(<StickerTray onPick={() => {}} onClose={() => {}} />);
    expect(screen.getByRole("textbox", { name: /search stickers/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /favorite/i })).toBeNull();
  });

  it("music tray offers search, moods, and own audio", () => {
    render(<MusicTray onPick={() => {}} onClose={() => {}} />);
    expect(screen.getByRole("textbox", { name: /search music/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Lo-fi chill" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /use your own audio/i })).toBeTruthy();
  });
});

describe("ShareCard", () => {
  it("previews the achievement it will become", () => {
    render(
      <BloomShareCard
        eyebrow="Milestone"
        title="30 days"
        backgroundId="garden"
        stickerId="habit.streak-1"
        compact
      />,
    );
    expect(screen.getByText("Milestone")).toBeTruthy();
    expect(screen.getByText("30 days")).toBeTruthy();
  });
});

describe("ElementLayer resize gesture", () => {
  /**
   * Mount the real ElementLayer + StoryCanvas pair and hand the layer a canvas
   * with a genuine 390x690 box, since jsdom lays nothing out. Returns the layer
   * container and the scale values it reported.
   */
  function mountResize() {
    const stage = document.createElement("div");
    stage.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 390, height: 690, right: 390, bottom: 690 }) as DOMRect;
    const canvasRef = { current: stage } as React.RefObject<HTMLDivElement | null>;

    const el = makeTextElement("Drag my corner", { x: 0.5, y: 0.5 });
    const seen: { id: string; x: number; y: number; scale: number }[] = [];

    const { container } = render(
      <ElementLayer
        elements={[el]}
        selectedId={el.id}
        onSelect={() => {}}
        onTransform={(id, t) => seen.push({ id, x: t.x, y: t.y, scale: t.scale })}
        onTransformEnd={() => {}}
        onEditText={() => {}}
        onDelete={() => {}}
        onDragState={() => {}}
        canvasRef={canvasRef}
      >
        <StoryCanvas
          media={{ type: "none", src: null }}
          elements={[el]}
          mode="edit"
          selectedId={el.id}
          onSelect={() => {}}
          onResizeStart={() => {}}
        />
      </ElementLayer>,
    );

    const handle = container.querySelector('[data-se-handle="se"]') as HTMLElement;
    // The element sits at the canvas centre (195, 345).
    const fire = (type: string, x: number, y: number) =>
      handle.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          pointerId: 1,
          clientX: x,
          clientY: y,
        }),
      );

    return { el, seen, handle, fire };
  }

  it("rescales the selected element from the distance to its centre", () => {
    const { el, seen, handle, fire } = mountResize();
    expect(handle).toBeTruthy();

    fire("pointerdown", 295, 345); // 100px right of centre
    fire("pointermove", 395, 345); // 200px right of centre
    fire("pointerup", 395, 345);

    expect(seen.length).toBeGreaterThan(0);
    const last = seen[seen.length - 1]!;
    expect(last.id).toBe(el.id);
    expect(last.scale).toBeCloseTo(2, 5);
  });

  it("clamps the resize to the element scale limits", () => {
    const { seen, fire } = mountResize();

    fire("pointerdown", 295, 345);
    fire("pointermove", 3950, 345); // absurdly far out
    fire("pointerup", 3950, 345);

    expect(seen.length).toBeGreaterThan(0);
    expect(seen[seen.length - 1]!.scale).toBe(ELEMENT_LIMITS.maxScale);
  });

  it("shrinks no further than the minimum scale", () => {
    const { seen, fire } = mountResize();

    fire("pointerdown", 295, 345);
    fire("pointermove", 197, 345); // barely 2px from centre
    fire("pointerup", 197, 345);

    expect(seen.length).toBeGreaterThan(0);
    expect(seen[seen.length - 1]!.scale).toBe(ELEMENT_LIMITS.minScale);
  });

  it("keeps the element pinned where it was while resizing", () => {
    const { seen, fire } = mountResize();

    fire("pointerdown", 295, 345);
    fire("pointermove", 395, 445); // pull diagonally, off both axes
    fire("pointerup", 395, 445);

    // A resize must change size only — the centre stays exactly where it was,
    // so the element never drifts away from the user's finger.
    expect(seen.length).toBeGreaterThan(0);
    for (const t of seen) {
      expect(t.x).toBe(0.5);
      expect(t.y).toBe(0.5);
    }
    expect(seen[seen.length - 1]!.scale).toBeGreaterThan(1);
  });
});
