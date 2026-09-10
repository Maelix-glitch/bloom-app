// @vitest-environment jsdom
/**
 * Story domain tests — the pure layer everything renders from.
 * Elements, time labels, and the seen store stay honest here.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ELEMENT_LIMITS,
  makePollElement,
  makeSliderElement,
  makeTextElement,
  sanitizeAdjustments,
  sanitizeElements,
} from "./elements";
import {
  archiveMonthKey,
  archiveMonthLabel,
  countdownParts,
  storyAge,
  storyExpiryLeft,
} from "./time";
import { MOTION_PACK } from "./catalogs";

describe("sanitizeElements", () => {
  it("drops non-arrays and unknown kinds", () => {
    expect(sanitizeElements(null)).toEqual([]);
    expect(sanitizeElements({})).toEqual([]);
    expect(sanitizeElements([{ kind: "explosion" }])).toEqual([]);
  });

  it("clamps placement into the canvas", () => {
    const [el] = sanitizeElements([
      { kind: "text", x: 40, y: -20, scale: 9, rotation: 720, text: "hi" },
    ]);
    expect(el!.x).toBeLessThanOrEqual(1);
    expect(el!.x).toBeGreaterThanOrEqual(0);
    expect(el!.y).toBeGreaterThanOrEqual(0);
    expect(el!.scale).toBeLessThanOrEqual(ELEMENT_LIMITS.maxScale);
    expect(Math.abs(el!.rotation)).toBeLessThanOrEqual(180);
  });

  it("caps text length and rejects unsafe colors", () => {
    const long = "a".repeat(1000);
    const [el] = sanitizeElements([{ kind: "text", text: long, color: "javascript:alert(1)" }]);
    expect(el!.kind).toBe("text");
    if (el!.kind === "text") {
      expect(el.text.length).toBeLessThanOrEqual(ELEMENT_LIMITS.maxTextLength);
      expect(el.color).not.toContain("javascript");
    }
  });

  it("caps the element count per story", () => {
    const many = Array.from({ length: 80 }, (_, i) => ({
      kind: "sticker",
      stickerId: "bloom.flower-1",
      x: 0.1 + (i % 8) * 0.1,
      y: 0.1,
    }));
    const out = sanitizeElements(many);
    expect(out.length).toBe(ELEMENT_LIMITS.maxElements);
  });

  it("drops unknown stickers", () => {
    expect(sanitizeElements([{ kind: "sticker", stickerId: "nope.missing" }])).toEqual([]);
  });

  it("keeps poll options honest", () => {
    const [dropped] = sanitizeElements([{ kind: "poll", question: "", options: ["Only one"] }]);
    expect(dropped).toBeUndefined();
    const good = makePollElement("Tea or coffee?", ["Tea", "Coffee"]);
    const [kept] = sanitizeElements([good]);
    expect(kept!.kind).toBe("poll");
    if (kept!.kind === "poll") expect(kept.options).toHaveLength(2);
  });

  it("slider keeps a short emoji", () => {
    const slider = makeSliderElement("Mood?", "🌙");
    const [kept] = sanitizeElements([slider]);
    expect(kept!.kind).toBe("slider");
    if (kept!.kind === "slider") expect(kept.emoji).toBe("🌙");
  });

  it("text factory seeds readable defaults", () => {
    const el = makeTextElement("hello");
    expect(el.text).toBe("hello");
    expect(el.color).toMatch(/^#/);
    expect(el.preset).toBeTruthy();
    expect(el.align).toBe("center");
  });
});

describe("sanitizeAdjustments", () => {
  it("clamps each channel and drops garbage", () => {
    expect(sanitizeAdjustments(null)).toBeNull();
    const out = sanitizeAdjustments({ brightness: 99, warmth: -99, nope: 1 });
    expect(out).toMatchObject({ brightness: 99, warmth: -99 });
  });
});

describe("story time labels", () => {
  it("ages young stories in minutes, old ones in hours", () => {
    const now = Date.now();
    expect(storyAge(new Date(now - 30_000).toISOString(), now)).toBe("now");
    expect(storyAge(new Date(now - 12 * 60_000).toISOString(), now)).toBe("12m");
    expect(storyAge(new Date(now - 5 * 3_600_000).toISOString(), now)).toBe("5h");
  });

  it("expiry returns null once passed", () => {
    const now = Date.now();
    expect(storyExpiryLeft(new Date(now - 1000).toISOString(), now)).toBeNull();
    expect(storyExpiryLeft(new Date(now + 3_600_000).toISOString(), now)).toBeTruthy();
  });

  it("archive months round-trip through key and label", () => {
    const key = archiveMonthKey("2026-03-14T12:00:00.000Z");
    expect(key).toBe("2026-03");
    expect(archiveMonthLabel(key)).toMatch(/2026/);
  });

  it("countdown splits into days, hours, minutes and flags passing", () => {
    const now = Date.now();
    const parts = countdownParts(new Date(now + 26 * 3_600_000).toISOString(), now);
    expect(parts.done).toBe(false);
    expect(parts.days).toBe(1);
    expect(parts.hours).toBe(2);
    expect(countdownParts(new Date(now - 1000).toISOString(), now).done).toBe(true);
  });
});

describe("motion pack", () => {
  it("ships a full shelf of looping moments", () => {
    expect(MOTION_PACK.length).toBeGreaterThanOrEqual(12);
    const ids = MOTION_PACK.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const item of MOTION_PACK) {
      expect(item.emoji.length).toBeGreaterThan(0);
      expect(["float", "pulse"]).toContain(item.animation);
      expect(item.label.length).toBeGreaterThan(0);
    }
  });

  it("motion places as a valid animated text element", () => {
    const item = MOTION_PACK[0]!;
    const [kept] = sanitizeElements([
      { kind: "text", text: item.emoji, animation: item.animation },
    ]);
    expect(kept!.kind).toBe("text");
    if (kept!.kind === "text") expect(kept.animation).toBe(item.animation);
  });
});

describe("seen store", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });

  it("marks, checks, and counts unseen", async () => {
    const { seenStore } = await import("./seen");
    expect(seenStore.has("a")).toBe(false);
    seenStore.mark("a");
    expect(seenStore.has("a")).toBe(true);
    expect(seenStore.unseenCount(["a", "b", "c"])).toBe(2);
    seenStore.markMany(["b", "c"]);
    expect(seenStore.unseenCount(["a", "b", "c"])).toBe(0);
  });

  it("emits bloom:story-seen exactly once per story", async () => {
    const { seenStore } = await import("./seen");
    const spy = vi.fn();
    window.addEventListener("bloom:story-seen", spy);
    seenStore.mark("b");
    seenStore.mark("b");
    window.removeEventListener("bloom:story-seen", spy);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("subscribe hands back an unsubscribe", async () => {
    const { seenStore } = await import("./seen");
    const spy = vi.fn();
    const off = seenStore.subscribe(spy);
    seenStore.mark("z");
    off();
    seenStore.mark("y");
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
