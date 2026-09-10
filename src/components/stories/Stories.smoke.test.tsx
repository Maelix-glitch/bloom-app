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
import { makePollElement, makeTextElement } from "@/lib/stories/elements";
import { StoryRail } from "./StoryRail";
import { StoryCanvas } from "./StoryCanvas";
import { StoryViewer } from "./StoryViewer";
import { StoryArchive } from "./StoryArchive";
import { StorySettings } from "./StorySettings";
import { ReactionBar } from "./InteractionSheets";
import { BloomShareCard } from "./ShareCard";
import { GifTray, MusicTray } from "./MediaTrays";
import { MOTION_PACK } from "@/lib/stories/catalogs";

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
  it("GIF tray always offers upload + the motion pack", () => {
    const onPickMotion = vi.fn();
    render(<GifTray onPick={() => {}} onPickMotion={onPickMotion} onClose={() => {}} />);
    expect(screen.getByRole("button", { name: /upload a gif/i })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: `Add motion: ${MOTION_PACK[0]!.label}` }),
    ).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /add motion:/i })).toHaveLength(
      MOTION_PACK.length,
    );
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
