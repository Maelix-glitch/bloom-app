// @vitest-environment jsdom
/**
 * The bespoke registry (U4, plan §3): every glyph exists, renders as a
 * spec-shaped SVG (24 grid, round caps, currentColor), and follows the
 * optical stroke rule — 1.8 at small sizes, 1.6 at 24.
 */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";

import { BLOOM_ICON_NAMES, BloomIcon, isBloomIconName } from "./BloomIcon";

afterEach(cleanup);

describe("BloomIcon registry", () => {
  it("carries the full v1 set: nav 6, trackers 6, habits 28, ranks 8, coach 5, system 11", () => {
    expect(BLOOM_ICON_NAMES).toHaveLength(64);
    for (const name of [
      // nav
      "today",
      "trackers",
      "cycle",
      "mood",
      "rewards",
      "coach",
      // trackers
      "sleep",
      "water",
      "study",
      "movement",
      "energy",
      "screen",
      // ranks
      "seedling",
      "first-bloom",
      "keeper",
      "streak-bud",
      "century",
      "year",
      "consistent-mind",
      "milestone",
      // coach
      "ask",
      "reflect",
      "plan",
      "context",
      "memory",
      // system
      "empty-garden",
      "no-results",
      "offline",
      "error",
      "check-bloom",
      "chevron-leaf",
      "plus",
      "close",
      "back",
      "calendar-bloom",
      "image",
    ] as const) {
      expect(isBloomIconName(name)).toBe(true);
    }
  });

  it("renders every glyph as a non-empty spec-shaped svg", () => {
    for (const name of BLOOM_ICON_NAMES) {
      const { container, unmount } = render(<BloomIcon name={name} />);
      const svg = container.querySelector("svg");
      expect(svg, name).not.toBeNull();
      expect(svg?.getAttribute("viewBox"), name).toBe("0 0 24 24");
      expect(svg?.getAttribute("stroke"), name).toBe("currentColor");
      expect(svg?.getAttribute("stroke-linecap"), name).toBe("round");
      expect(svg?.getAttribute("stroke-linejoin"), name).toBe("round");
      expect(svg?.getAttribute("fill"), name).toBe("none");
      expect(svg?.childElementCount, name).toBeGreaterThan(0);
      unmount();
    }
  });

  it("applies the optical stroke rule and honours explicit overrides", () => {
    const big = render(<BloomIcon name="sprout" />);
    expect(big.container.querySelector("svg")?.getAttribute("stroke-width")).toBe("1.6");
    big.unmount();

    const small = render(<BloomIcon name="sprout" size={16} />);
    const smallSvg = small.container.querySelector("svg");
    expect(smallSvg?.getAttribute("stroke-width")).toBe("1.8");
    expect(smallSvg?.getAttribute("width")).toBe("16");
    small.unmount();

    const custom = render(<BloomIcon name="sprout" size={22} strokeWidth={2.1} />);
    expect(custom.container.querySelector("svg")?.getAttribute("stroke-width")).toBe("2.1");
  });

  it("rejects names that are not glyphs", () => {
    expect(isBloomIconName("sprout")).toBe(true);
    expect(isBloomIconName("GitBranch")).toBe(false);
    expect(isBloomIconName("")).toBe(false);
    expect(isBloomIconName(null)).toBe(false);
    expect(isBloomIconName(undefined)).toBe(false);
  });
});
