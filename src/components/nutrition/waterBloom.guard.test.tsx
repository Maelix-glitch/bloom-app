// @vitest-environment jsdom
/**
 * Water the Bloom — guards (Brief v7 WATER slice; M-145 display half).
 *
 * The scene is a custom-painted canvas, never an SVG widget; the numbers
 * live in HTML; logging writes through the trackers' own quick-add path.
 * What can be pinned structurally is pinned here; the painting itself
 * (light, depth, the pour) is verified live by the parent after deploy.
 *
 *   1. The scene container holds a <canvas> and NO <svg>.
 *   2. The container's aria-label states the real figures in words and
 *      names the bloom stage those figures produce.
 *   3. The visible figure is fmtLitres on both sides ("2.5 L of 3.4 L").
 *   4. "+250 ml" writes through applyQuickAdd — the saveDay payload is
 *      today's entry with waterMl raised by exactly the tap.
 *   5. prefers-reduced-motion starts NO animation loop; full motion does.
 *   6. Quick-add buttons carry the ≥44px class (CSS pin — geometry is
 *      live-verified).
 *   7. The M-145 prose ("Water through the day: … with your meals (…)")
 *      is gone from the Plan section source.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const motion = vi.hoisted(() => ({ reduced: false }));

beforeAll(() => {
  window.matchMedia = ((query: string) =>
    ({
      matches: motion.reduced && query.includes("prefers-reduced-motion"),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
      onchange: null,
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
});

/* Mutable store fixture — the house pattern (see trackersV6 guard):
   only the hook is mocked; applyQuickAdd itself runs for real on it. */
const world = vi.hoisted(() => ({
  current: null as null | Record<string, unknown>,
  saved: [] as Record<string, unknown>[],
}));

vi.mock("@/hooks/useTrackers", () => ({
  useTrackers: () => world.current,
}));

import { emptyDay, type DayEntry } from "@/lib/trackers/core";
import { WaterBloomPanel } from "./WaterBloom";

const TODAY = "2026-11-19";
const TARGET = 3350;

function makeStore(days: DayEntry[]) {
  world.saved = [];
  return {
    sync: { state: "saved", message: "On this device" },
    syncNow: () => {},
    days,
    goals: {},
    analysis: {},
    today: TODAY,
    hydrated: true,
    saveDay: (day: DayEntry) => {
      world.saved.push(day as unknown as Record<string, unknown>);
      return { ok: true as const };
    },
    removeDay: () => {},
    clearAll: () => {},
    setGoal: () => {},
    resetGoals: () => {},
    active: ["water"],
    setActive: () => {},
    toggleActive: () => {},
    customSubjects: [],
    rememberSubject: () => {},
    forgetSubject: () => {},
    undoable: null,
    undo: () => {},
    dismissUndo: () => {},
  };
}

beforeEach(() => {
  motion.reduced = false;
  world.current = makeStore([{ ...emptyDay(TODAY), waterMl: 2500 }]);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Water the Bloom — the scene", () => {
  it("paints on a canvas, with no svg anywhere in the scene container", () => {
    const { container } = render(<WaterBloomPanel targetMl={TARGET} />);
    const scene = container.querySelector("[data-water-bloom]");
    expect(scene).not.toBeNull();
    expect(scene!.querySelector("canvas")).not.toBeNull();
    expect(scene!.querySelector("svg")).toBeNull();
  });

  it("states the real figures and the bloom stage in its aria-label", () => {
    render(<WaterBloomPanel targetMl={TARGET} />);
    const scene = screen.getByRole("img");
    /* 2,500 of 3,350 = 0.746 → half bloom. */
    expect(scene.getAttribute("aria-label")).toBe(
      "Water today: 2.5 of 3.4 litres. The bloom is half open.",
    );
  });

  it("shows the day's water as HTML text in litres", () => {
    render(<WaterBloomPanel targetMl={TARGET} />);
    expect(screen.getByText("2.5 L of 3.4 L")).not.toBeNull();
  });

  it("offers the water tracker's own quick-adds", () => {
    render(<WaterBloomPanel targetMl={TARGET} />);
    expect(screen.getByRole("button", { name: "+250ml" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "+500ml" })).not.toBeNull();
  });
});

describe("Water the Bloom — logging writes through the trackers' path", () => {
  it("+250 ml raises today's waterMl by 250 in the saveDay payload", () => {
    render(<WaterBloomPanel targetMl={TARGET} />);
    fireEvent.click(screen.getByRole("button", { name: "+250ml" }));
    expect(world.saved).toHaveLength(1);
    expect(world.saved[0]).toMatchObject({ date: TODAY, waterMl: 2750 });
  });
});

describe("Water the Bloom — motion discipline", () => {
  it("starts an animation loop when motion is allowed", () => {
    const raf = vi.spyOn(window, "requestAnimationFrame");
    render(<WaterBloomPanel targetMl={TARGET} />);
    expect(raf).toHaveBeenCalled();
  });

  it("starts NO loop under prefers-reduced-motion", () => {
    motion.reduced = true;
    const raf = vi.spyOn(window, "requestAnimationFrame");
    render(<WaterBloomPanel targetMl={TARGET} />);
    expect(raf).not.toHaveBeenCalled();
  });

  it("quick-add buttons carry the 44px-minimum class in the sheet", () => {
    const css = readFileSync(join(process.cwd(), "src/styles/nutrition.css"), "utf8");
    const block = css.match(/\.water-bloom-add\s*\{[^}]*\}/);
    expect(block).not.toBeNull();
    expect(block![0]).toContain("min-height: 44px");
  });
});

describe("M-145 — the prose is gone from the Plan section", () => {
  it("NutritionPlanSection no longer renders water as a sentence", () => {
    const src = readFileSync(
      join(process.cwd(), "src/components/nutrition/NutritionPlanSection.tsx"),
      "utf8",
    );
    expect(src).not.toContain("Water through the day");
    expect(src).not.toContain("with your meals (");
    expect(src).toContain("WaterBloomPanel");
  });
});
