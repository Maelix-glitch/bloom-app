import { describe, expect, it } from "vitest";

import { BLOOM_ICON_NAMES, isBloomIconName } from "./BloomIcon";
import { EMOJI_TWIN_MAP, HABIT_ICON_CATALOGUE, resolveHabitIcon, twinGlyphFor } from "./habitIcons";

describe("the habit icon catalogue (plan §3.3)", () => {
  it("keeps all 28 picker choices, in order, with their original search keywords", () => {
    expect(HABIT_ICON_CATALOGUE).toHaveLength(28);
    expect(HABIT_ICON_CATALOGUE.map((c) => c.legacy)).toEqual([
      "⭐",
      "🌱",
      "📚",
      "💧",
      "🧘",
      "🏃",
      "✍️",
      "🍎",
      "😴",
      "🎯",
      "🎨",
      "💪",
      "🧹",
      "💊",
      "🚶",
      "☀️",
      "🌙",
      "💰",
      "📵",
      "🧠",
      "🎧",
      "🧴",
      "🦷",
      "📞",
      "🌿",
      "🍵",
      "🚴",
      "🧺",
    ]);
    expect(HABIT_ICON_CATALOGUE.map((c) => c.k)).toEqual([
      "star favourite",
      "grow plant seed",
      "read book study",
      "water drink hydrate",
      "meditate calm yoga",
      "run exercise cardio",
      "write journal note",
      "eat food fruit",
      "sleep rest bed",
      "goal focus target",
      "art draw create",
      "gym strength workout",
      "clean tidy chore",
      "medicine pill health",
      "walk steps outside",
      "morning sun wake",
      "night evening moon",
      "save money budget",
      "no phone screen detox",
      "learn brain think",
      "music listen podcast",
      "skincare routine",
      "teeth brush dental",
      "call family friend",
      "nature outdoors green",
      "tea drink calm",
      "bike cycle ride",
      "laundry chore home",
    ]);
  });

  it("names a real registry glyph for every choice", () => {
    for (const choice of HABIT_ICON_CATALOGUE) {
      expect(isBloomIconName(choice.id)).toBe(true);
      expect(BLOOM_ICON_NAMES).toContain(choice.id);
    }
  });
});

describe("the emoji twin-map (plan §3.4)", () => {
  it("maps every one of the 28 catalogue emoji to its bespoke twin — 28/28", () => {
    for (const choice of HABIT_ICON_CATALOGUE) {
      expect(twinGlyphFor(choice.legacy)).toBe(choice.id);
      expect(EMOJI_TWIN_MAP[choice.legacy]).toBe(choice.id);
    }
    const catalogueKeys = HABIT_ICON_CATALOGUE.map((c) => c.legacy);
    const mapped = catalogueKeys.filter((e) => twinGlyphFor(e) !== null);
    expect(mapped).toHaveLength(28);
  });

  it("keeps the recognised synonyms that have a true counterpart", () => {
    expect(twinGlyphFor("📖")).toBe("book");
    expect(twinGlyphFor("📕")).toBe("book");
    expect(twinGlyphFor("📝")).toBe("pen");
    expect(twinGlyphFor("📓")).toBe("pen");
    expect(twinGlyphFor("🚰")).toBe("droplet");
    expect(twinGlyphFor("🍃")).toBe("fern");
    // §3.2: the streak flame is replaced by a rising bud.
    expect(twinGlyphFor("🔥")).toBe("streak-bud");
  });

  it("leaves unmapped emoji to render as themselves", () => {
    expect(twinGlyphFor("🦄")).toBeNull();
    expect(twinGlyphFor("🥤")).toBeNull();
    expect(twinGlyphFor("❤️")).toBeNull();
  });
});

describe("resolveHabitIcon — the renderer's resolution order", () => {
  it("renders a bloom row as its registry glyph", () => {
    expect(resolveHabitIcon("bloom", "fern")).toEqual({ kind: "glyph", name: "fern" });
    expect(resolveHabitIcon("bloom", "star-bloom")).toEqual({ kind: "glyph", name: "star-bloom" });
  });

  it("degrades an unknown bloom id to star-bloom, never to raw text", () => {
    expect(resolveHabitIcon("bloom", "not-a-glyph")).toEqual({ kind: "glyph", name: "star-bloom" });
    expect(resolveHabitIcon("bloom", "")).toEqual({ kind: "glyph", name: "star-bloom" });
  });

  it("renders a legacy catalogue emoji row as its bespoke twin glyph", () => {
    expect(resolveHabitIcon("emoji", "🌱")).toEqual({ kind: "glyph", name: "sprout" });
    expect(resolveHabitIcon("emoji", "⭐")).toEqual({ kind: "glyph", name: "star-bloom" });
    expect(resolveHabitIcon("emoji", "🚴")).toEqual({ kind: "glyph", name: "bicycle" });
    // rows from before icon_type existed resolve the same way
    expect(resolveHabitIcon(undefined, "💧")).toEqual({ kind: "glyph", name: "droplet" });
  });

  it("renders a free-pasted emoji as itself", () => {
    expect(resolveHabitIcon("emoji", "🦄")).toEqual({ kind: "emoji", value: "🦄" });
    expect(resolveHabitIcon("emoji", "🥗")).toEqual({ kind: "emoji", value: "🥗" });
  });

  it("treats placeholders and word-like legacy values as missing", () => {
    expect(resolveHabitIcon("emoji", "")).toEqual({ kind: "missing" });
    expect(resolveHabitIcon("emoji", "🖼️")).toEqual({ kind: "missing" });
    expect(resolveHabitIcon("image", "🖼️")).toEqual({ kind: "missing" });
    expect(resolveHabitIcon("emoji", "droplet")).toEqual({ kind: "missing" });
    expect(resolveHabitIcon(null, null)).toEqual({ kind: "missing" });
  });
});
