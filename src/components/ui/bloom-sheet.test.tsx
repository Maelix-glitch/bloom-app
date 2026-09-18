// @vitest-environment jsdom
/**
 * Where a centred BloomSheet actually lands.
 *
 * This suite exists because the centring offset was being applied in the
 * stylesheet while Motion wrote the `transform` property at runtime — and
 * Motion's inline style wins the cascade. The sheet is positioned with
 * `left/top: 50%`, so with no `-50%` offset left in `transform` its *top-left*
 * corner sits on the centre of the screen and the whole card runs down-right,
 * off the bottom edge.
 *
 * The fix pins the offset inside Motion's own transform (the `style` prop), so
 * no animation can overwrite it. These tests pin that contract:
 *   · the desktop card carries the offset,
 *   · a phone "pop" carries it too (its CSS may be folded at build time),
 *   · a real bottom sheet does NOT — it must stay anchored to the bottom.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { BloomSheet } from "./bloom-sheet";

afterEach(cleanup);

/** jsdom ships no matchMedia, and BloomSheet asks it whether this is a phone. */
function mockMatchMedia(matches: boolean) {
  window.matchMedia = ((query: string) =>
    ({
      matches,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
}

beforeEach(() => mockMatchMedia(false));

/**
 * The negative offset that pulls the element back by half its own size. A
 * centred sheet needs it on both axes; anything less and it hangs off-centre.
 */
function halfOffsets(el: HTMLElement): number {
  return (el.style.transform.match(/-50%/g) ?? []).length;
}

function renderSheet(placement?: "sheet" | "pop") {
  render(
    <BloomSheet open onClose={() => {}} title="Test sheet" {...(placement ? { placement } : {})}>
      <p>content</p>
    </BloomSheet>,
  );
  return screen.getByRole("dialog");
}

describe("BloomSheet centring", () => {
  it("centres the desktop card with both half-offsets in the transform", () => {
    const dialog = renderSheet();

    expect(dialog.className).toContain("bsheet--card");
    expect(halfOffsets(dialog)).toBeGreaterThanOrEqual(2);
  });

  it("centres a phone pop, which the build folds into transform as well", () => {
    mockMatchMedia(true);
    const dialog = renderSheet("pop");

    expect(dialog.className).toContain("bsheet--pop");
    expect(halfOffsets(dialog)).toBeGreaterThanOrEqual(2);
  });

  it("leaves a real bottom sheet anchored to the bottom", () => {
    mockMatchMedia(true);
    const dialog = renderSheet();

    expect(dialog.className).toContain("bsheet--phone");
    /* Bottom sheets dock via `bottom: 0`; a half-offset here would be wrong. */
    expect(halfOffsets(dialog)).toBe(0);
  });
});
