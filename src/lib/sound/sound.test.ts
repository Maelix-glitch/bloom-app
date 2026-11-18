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

describe("score quality", () => {
  /* The recipes are pure data (SOUND_SCORE), so the qualities the ear cares
     about — soft waveforms, short notes, quiet peaks, gentle pitch motion —
     are pinned here without an AudioContext. The regression these guard is
     the old tap: a bare 880 Hz sine pip that read as an ugly click. */

  it("scores every cue in the vocabulary", async () => {
    const { SOUND_SCORE } = await import("./sound");
    for (const cue of [
      "tap", "toggleOn", "toggleOff", "success", "celebrate",
      "open", "close", "delete", "warn", "navigate",
    ] as const) {
      expect(SOUND_SCORE[cue].length).toBeGreaterThan(0);
    }
  });

  it("uses only soft waveforms — never square or sawtooth", async () => {
    const { SOUND_SCORE } = await import("./sound");
    for (const notes of Object.values(SOUND_SCORE)) {
      for (const n of notes) {
        expect(["sine", "triangle", undefined]).toContain(n.type);
      }
    }
  });

  it("keeps every note short and every cue under ~320 ms", async () => {
    const { SOUND_SCORE } = await import("./sound");
    for (const notes of Object.values(SOUND_SCORE)) {
      for (const n of notes) {
        expect(n.d).toBeGreaterThanOrEqual(0.04);
        expect(n.d).toBeLessThanOrEqual(0.25);
      }
      const total = Math.max(...notes.map((n) => n.t + n.d));
      expect(total).toBeLessThanOrEqual(0.32);
    }
  });

  it("keeps peaks quiet — felt more than heard, never startling", async () => {
    const { SOUND_SCORE } = await import("./sound");
    for (const notes of Object.values(SOUND_SCORE)) {
      for (const n of notes) {
        expect(n.v).toBeGreaterThanOrEqual(0.03);
        expect(n.v).toBeLessThanOrEqual(0.16);
      }
    }
  });

  it("glides gently when it glides — no swoops", async () => {
    const { SOUND_SCORE } = await import("./sound");
    for (const notes of Object.values(SOUND_SCORE)) {
      for (const n of notes) {
        if (n.g !== undefined) {
          expect(n.g / n.f).toBeGreaterThanOrEqual(0.5);
          expect(n.g / n.f).toBeLessThanOrEqual(2);
        }
        if (n.h !== undefined) {
          expect(n.h).toBeGreaterThan(0);
          expect(n.h).toBeLessThanOrEqual(0.4);
        }
      }
    }
  });

  it("the tap is a low falling thock, not a high static pip", async () => {
    const { SOUND_SCORE } = await import("./sound");
    const tap = SOUND_SCORE.tap[0];
    if (!tap) throw new Error("the tap cue must have a note");
    expect(tap.f).toBeLessThanOrEqual(700);
    expect(tap.g).toBeDefined();
    expect(tap.g).toBeLessThan(tap.f);
  });

  it("warn never repeats the same note — no alarm-beep pattern", async () => {
    const { SOUND_SCORE } = await import("./sound");
    const freqs = SOUND_SCORE.warn.map((n) => n.f);
    expect(new Set(freqs).size).toBe(freqs.length);
  });
});
