import { describe, expect, it } from "vitest";

import { DOCK_RETURN_MS, dockHiddenAfterScroll } from "./dockVisibility";

describe("dockHiddenAfterScroll", () => {
  it("hides the dock when scrolling down", () => {
    expect(dockHiddenAfterScroll(false, 12)).toBe(true);
    expect(dockHiddenAfterScroll(false, 1)).toBe(true);
  });

  it("stays hidden while the downward scroll continues", () => {
    expect(dockHiddenAfterScroll(true, 240)).toBe(true);
  });

  it("brings the dock back the moment the scroll turns up", () => {
    expect(dockHiddenAfterScroll(true, -1)).toBe(false);
    expect(dockHiddenAfterScroll(true, -180)).toBe(false);
  });

  it("holds its state on a zero move (no vertical scroll)", () => {
    expect(dockHiddenAfterScroll(false, 0)).toBe(false);
    expect(dockHiddenAfterScroll(true, 0)).toBe(true);
  });

  it("returns on its own after a short rest, not instantly", () => {
    expect(DOCK_RETURN_MS).toBe(700);
  });
});
