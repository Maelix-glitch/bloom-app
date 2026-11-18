// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useConnectivity } from "./useConnectivity";

/**
 * The hook reports the browser's own connectivity word and follows its
 * events — the signal the sync pill was missing. jsdom's navigator is
 * online by default; the offline cases set the word before render and
 * then speak through the real window events.
 */
describe("useConnectivity", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts from navigator.onLine", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const { result } = renderHook(() => useConnectivity());
    expect(result.current).toBe(false);
  });

  it("follows the offline and online events", () => {
    const { result } = renderHook(() => useConnectivity());
    expect(result.current).toBe(true);

    act(() => {
      vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
      window.dispatchEvent(new Event("offline"));
    });
    expect(result.current).toBe(false);

    act(() => {
      vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
      window.dispatchEvent(new Event("online"));
    });
    expect(result.current).toBe(true);
  });
});
