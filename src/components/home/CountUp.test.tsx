// @vitest-environment jsdom
/**
 * The count-up's hard rules, pinned:
 * · the animation ends EXACTLY on the real value (the frame function returns
 *   the target untouched at progress 1 — formatting happens only at render);
 * · under prefers-reduced-motion there is no animation at all, just the
 *   exact value;
 * · a warm remount (same id, later in the session) shows the exact value
 *   immediately — entrances never replay on a tab return.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { CountUp, countUpFrame } from "./CountUp";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("countUpFrame", () => {
  it("is exact at both ends", () => {
    expect(countUpFrame(0, 865, 0)).toBe(0);
    expect(countUpFrame(0, 865, 1)).toBe(865);
    expect(countUpFrame(855, 865, 1)).toBe(865);
    expect(countUpFrame(865, 855, 1)).toBe(855);
  });

  it("never overshoots and rises monotonically", () => {
    let prev = -Infinity;
    for (let p = 0; p <= 1.0001; p += 0.05) {
      const v = countUpFrame(0, 100, Math.min(1, p));
      expect(v).toBeGreaterThanOrEqual(prev);
      expect(v).toBeLessThanOrEqual(100);
      prev = v;
    }
    expect(prev).toBe(100);
  });

  it("eases out — most of the distance lands early", () => {
    expect(countUpFrame(0, 100, 0.5)).toBeGreaterThan(80);
  });
});

describe("CountUp", () => {
  it("snaps to the exact value under reduced motion", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: true })),
    );
    render(<CountUp value={1234} id="test-reduced" />);
    expect(screen.getByText("1,234")).toBeTruthy();
  });

  it("shows the exact value on a warm remount of the same id", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: true })),
    );
    const first = render(<CountUp value={865} id="test-warm" />);
    expect(screen.getByText("865")).toBeTruthy();
    first.unmount();
    render(<CountUp value={865} id="test-warm" />);
    expect(screen.getByText("865")).toBeTruthy();
  });
});
