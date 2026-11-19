// @vitest-environment jsdom
/**
 * Mood guards (Brief v6 Slice 7 — M-135, M-136, M-122, M-137). The §6
 * layout guards need real geometry and are verified live by the
 * parent; what CAN be pinned structurally is pinned here:
 *
 *   1. M-135: ONE primary entry point — the faces. The gold gradient
 *      "Log an entry" button is gone; the Composer stays reachable
 *      through a quiet text action that carries no gold fill.
 *   2. M-136: the page's faces render at FULL strength — the blob fill
 *      and the face strokes sit at opacity 1 whether or not the face
 *      is today's selection, and the stylesheet no longer recedes
 *      unselected faces once a selection exists. (The one genuinely
 *      disabled state — buttons disabled while a save is in flight —
 *      never carried an opacity treatment and still doesn't.)
 *   3. M-122: the page's mood average renders WITH its scale
 *      ("average mood is 7.0 out of 10" — the scale is 1–10,
 *      MoodEntry.mood). This pin passes at baseline: the journey
 *      insight already carried its scale, and the pin exists so it
 *      cannot silently lose it.
 *   4. M-137: the hero pull quote lives inside the hero copy column,
 *      left-aligned with the H1 — no far-right orphan column; the
 *      eyebrow is the sentence-case sans eyebrow (no uppercase).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

beforeAll(() => {
  window.matchMedia = ((query: string) =>
    ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
      onchange: null,
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
});

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    ...rest
  }: {
    to: string;
    children: React.ReactNode;
  }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/notifications/NotificationCenter", () => ({
  NotificationBell: () => null,
}));

const SRC = join(process.cwd(), "src");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");
const STYLES_CSS = read("styles.css");
const MOOD_CSS = read("styles/mood.css");

import {
  aggregateDays,
  calculateAverageMood,
  calculateEmotionDistribution,
  calculateVolatility,
} from "@/lib/mood/analytics";
import { entryFromFace } from "@/lib/mood/page";
import type { MoodSystem } from "@/hooks/useMoodSystem";
import { MoodPage, type MoodPageIdentity } from "./MoodPage";

const atNoon = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(12, 0, 0, 0);
  return d;
};

/* Three logged days, today included — enough for the journey insight
   to state the average, and for one face to be today's selection. */
const ENTRIES = [
  entryFromFace("happy", atNoon(0)),
  entryFromFace("calm", atNoon(1)),
  entryFromFace("sad", atNoon(2)),
];

function makeSystem(): MoodSystem {
  const days = aggregateDays(ENTRIES);
  return {
    loading: true,
    entries: ENTRIES,
    analytics: {
      days,
      allDays: days,
      periodEntries: ENTRIES,
      avg: calculateAverageMood(ENTRIES),
      prevAvg: 0,
      changePct: null,
      volatility: calculateVolatility(days),
      emotions: calculateEmotionDistribution(ENTRIES),
      correlations: [],
      streak: 3,
      bestDay: days[0] ?? null,
    },
    sync: { state: "saved", message: "On this device", pending: 0 },
    range: { label: "Last 30 days" },
    rangeKey: "30d",
    setRangeKey: () => {},
    saveEntry: async () => {},
    retrySync: () => {},
  } as unknown as MoodSystem;
}

const IDENTITY: MoodPageIdentity = {
  displayName: "Maelix",
  avatarPath: null,
  accent: "amber",
  signedIn: true,
};

afterEach(() => cleanup());

function renderPage() {
  return render(
    <MoodPage system={makeSystem()} identity={IDENTITY} onCompose={() => {}} onEdit={() => {}} />,
  );
}

describe("mood v6 guards — one entry point (M-135)", () => {
  it("the gold 'Log an entry' button is gone; a quiet text action remains", () => {
    renderPage();
    expect(screen.queryByText("Log an entry")).toBeNull();
    const quiet = screen.getByRole("button", { name: /log with a note/i });
    expect(quiet.className).not.toContain("mm-btn");
    expect((quiet as HTMLElement).style.backgroundImage).toBe("");
  });

  it("the six faces are the entry: six face buttons render", () => {
    const { container } = renderPage();
    expect(container.querySelectorAll('[data-testid^="mood-face-"]').length).toBe(6);
  });
});

describe("mood v6 guards — faces at full strength (M-136)", () => {
  it("every face's blob and strokes render at opacity 1, selected or not", () => {
    const { container } = renderPage();
    const faces = container.querySelectorAll('[data-testid^="mood-face-"]');
    expect(faces.length).toBe(6);
    for (const face of faces) {
      const blob = face.querySelector("svg path");
      expect(blob?.getAttribute("opacity"), "blob fill opacity").toBe("1");
      const strokes = face.querySelector("svg g");
      expect(strokes?.getAttribute("opacity"), "face stroke opacity").toBe("1");
    }
  });

  it("the stylesheet no longer recedes unselected faces after a selection", () => {
    expect(MOOD_CSS).not.toMatch(
      /\[data-has-selection="true"\]\s*\.mm-face\[data-active="false"\]\s*\{\s*opacity/,
    );
  });
});

describe("mood v6 guards — the average carries its scale (M-122)", () => {
  it("the journey insight states the average out of 10", () => {
    const { container } = renderPage();
    expect(container.textContent).toMatch(/average mood is \d+(\.\d+)? out of 10/);
  });
});

describe("mood v6 guards — hero alignment (M-137)", () => {
  it("the pull quote sits inside the hero copy column", () => {
    renderPage();
    const quote = screen.getByText("Noted honestly, understood over time.");
    expect(quote.closest(".mm-hero-copy")).not.toBeNull();
  });

  it("the mood eyebrow is sentence-case sans (no uppercase transform)", () => {
    const block = STYLES_CSS.match(/\.mp-eyebrow\s*\{[^}]*\}/)?.[0] ?? "";
    expect(block).not.toContain("text-transform: uppercase");
    expect(block).toContain("font-weight: 500");
  });
});
