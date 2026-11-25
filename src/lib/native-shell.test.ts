// @vitest-environment jsdom
/**
 * M-239 · Native shell: the pure decisions and the web no-op contract.
 *
 * The plugin calls themselves only exist inside the wrapper, so what is
 * pinned here is everything that can be decided off-device: which paths
 * count as root, what the Android back button does for each combination of
 * history and route, and that boot is a strict no-op on web (no listener,
 * no throw) so the web bundle can call it unconditionally.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  bootNativeShell,
  decideBackAction,
  isNativePlatform,
  isRootPath,
  SHELL_INK,
} from "./native-shell";

afterEach(() => {
  delete (window as unknown as { Capacitor?: unknown }).Capacitor;
  vi.restoreAllMocks();
});

describe("isRootPath", () => {
  it("treats Today and the empty path as root", () => {
    expect(isRootPath("/")).toBe(true);
    expect(isRootPath("")).toBe(true);
  });

  it("treats every in-app route as not root", () => {
    expect(isRootPath("/mood")).toBe(false);
    expect(isRootPath("/nutrition")).toBe(false);
    expect(isRootPath("/settings")).toBe(false);
  });
});

describe("decideBackAction", () => {
  it("exits on a root route even with history behind it", () => {
    expect(decideBackAction({ canGoBack: true, pathname: "/" })).toBe("exit");
    expect(decideBackAction({ canGoBack: false, pathname: "/" })).toBe("exit");
  });

  it("goes back inside the app when there is history", () => {
    expect(decideBackAction({ canGoBack: true, pathname: "/mood" })).toBe("back");
    expect(decideBackAction({ canGoBack: true, pathname: "/nutrition/plan" })).toBe("back");
  });

  it("exits on a cold entry with nowhere to go", () => {
    expect(decideBackAction({ canGoBack: false, pathname: "/mood" })).toBe("exit");
  });
});

describe("web contract", () => {
  it("is not a native platform without the Capacitor global", () => {
    expect(isNativePlatform()).toBe(false);
  });

  it("boot is a no-op on web", () => {
    expect(() => bootNativeShell()).not.toThrow();
  });

  it("the shell ink is Bloom's official ink", () => {
    expect(SHELL_INK).toBe("#0a0b0e");
  });
});
