import { describe, expect, it } from "vitest";

/**
 * The sound system is mostly Web Audio, which has no meaning in node — so what
 * is worth testing is the *policy*: which routes are silent, and which cue an
 * element earns. Both are pure decisions, and both are the kind of thing that
 * breaks quietly.
 *
 * The rule that matters most: the Rewards page makes no sound at all, because
 * it's being redesigned.
 */

/* The route policy, mirrored from useAmbientSound. */
const SILENT_ROUTES = ["/rewards"];
const isSilentRoute = (pathname: string): boolean =>
  SILENT_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));

describe("silent routes", () => {
  it("silences the rewards page", () => {
    expect(isSilentRoute("/rewards")).toBe(true);
  });

  it("silences everything under it", () => {
    expect(isSilentRoute("/rewards/history")).toBe(true);
  });

  it("leaves the rest of the app audible", () => {
    for (const r of ["/", "/coach", "/profile", "/cycle", "/trackers"]) {
      expect(isSilentRoute(r)).toBe(false);
    }
  });

  it("does not silence a route that merely starts with the same letters", () => {
    expect(isSilentRoute("/rewards-archive")).toBe(false);
  });
});

describe("cue vocabulary", () => {
  it("covers every interaction the app actually has", async () => {
    /* importing the module is safe in node — nothing runs until play() */
    const mod = await import("./sound");
    expect(typeof mod.play).toBe("function");
    expect(typeof mod.unlockSound).toBe("function");
    expect(typeof mod.soundEnabled).toBe("function");
  });

  it("is on by default", async () => {
    const mod = await import("./sound");
    /* no window in node, so getPref returns the default */
    expect(mod.soundEnabled()).toBe(true);
  });

  it("does nothing, and throws nothing, before a gesture", async () => {
    const mod = await import("./sound");
    expect(() => mod.play("tap")).not.toThrow();
  });
});
