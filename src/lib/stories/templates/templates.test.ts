/**
 * The library is the product. These invariants run the real `instantiate()`
 * against every authored template, so a bad coordinate, an unknown mask or a
 * photo that was baked in as an image (instead of a slot) fails the build
 * rather than shipping to someone's phone.
 */

import { describe, expect, it } from "vitest";

import {
  STORY_TEMPLATE_LIBRARY,
  favoriteTemplateIds,
  instantiateTemplate,
  recentTemplateIds,
  searchTemplates,
  templateById,
  templateMeta,
  templateSections,
} from "./index";
import { TEMPLATE_CATEGORIES, type StoryTemplateDef } from "./dsl";
import { FRAMES, MASKS } from "@/lib/stories/canvas/masks";
import { SHAPES } from "@/lib/stories/canvas/shapes";
import { STORY_FILTERS } from "@/lib/stories/catalogs";
import { gradientPresetById } from "@/lib/stories/canvas/backgrounds";
import { METRICS } from "@/lib/stories/data/metrics";

const MASK_IDS = new Set<string>(MASKS.map((m) => m.id));
const FRAME_IDS = new Set<string>(FRAMES.map((f) => f.id));
const SHAPE_IDS = new Set<string>(SHAPES.map((s) => s.id));
const FILTER_IDS = new Set<string>(STORY_FILTERS.map((f) => f.id));

const inUnit = (n: number) => Number.isFinite(n) && n >= 0 && n <= 1;

describe("story template library", () => {
  it("has a large, category-spanning library", () => {
    expect(STORY_TEMPLATE_LIBRARY.length).toBeGreaterThanOrEqual(120);
    const cats = new Set(STORY_TEMPLATE_LIBRARY.map((t) => t.category));
    expect(cats.size).toBeGreaterThanOrEqual(20);
  });

  it("has unique ids and unique names", () => {
    const ids = new Set(STORY_TEMPLATE_LIBRARY.map((t) => t.id));
    expect(ids.size).toBe(STORY_TEMPLATE_LIBRARY.length);
    const names = new Set(STORY_TEMPLATE_LIBRARY.map((t) => t.name));
    expect(names.size).toBe(STORY_TEMPLATE_LIBRARY.length);
  });

  it("declares only known categories, and every category has designs", () => {
    const known = new Set<string>(TEMPLATE_CATEGORIES.map((c) => c.id));
    for (const t of STORY_TEMPLATE_LIBRARY) expect(known.has(t.category)).toBe(true);
    const used = new Set(STORY_TEMPLATE_LIBRARY.map((t) => t.category));
    for (const c of TEMPLATE_CATEGORIES) expect(used.has(c.id)).toBe(true);
  });

  it("gives every template a name, a hint and tags", () => {
    for (const t of STORY_TEMPLATE_LIBRARY) {
      expect(t.name.length).toBeGreaterThan(1);
      expect(t.hint.length).toBeGreaterThan(3);
      expect(t.tags.length).toBeGreaterThan(0);
      expect(t.seeds.length).toBeGreaterThan(0);
    }
  });

  it("instantiates every template without throwing", () => {
    for (const t of STORY_TEMPLATE_LIBRARY) {
      const composed = instantiateTemplate(t);
      expect(composed, t.id).not.toBeNull();
      expect(composed!.composed.elements.length, t.id).toBe(t.seeds.length);
      expect(composed!.composed.background.v).toBe(1);
    }
  });

  it("keeps every seed inside the canvas", () => {
    for (const t of STORY_TEMPLATE_LIBRARY) {
      for (const seed of t.seeds) {
        expect(inUnit(seed.x), `${t.id} x`).toBe(true);
        expect(inUnit(seed.y), `${t.id} y`).toBe(true);
        if ("w" in seed) expect(inUnit(seed.w), `${t.id} w`).toBe(true);
        if ("h" in seed) expect(inUnit(seed.h), `${t.id} h`).toBe(true);
        expect(Number.isFinite(seed.z), `${t.id} z`).toBe(true);
      }
    }
  });

  it("never ships a baked-in photograph — slots arrive empty", () => {
    let slots = 0;
    for (const t of STORY_TEMPLATE_LIBRARY) {
      for (const seed of t.seeds) {
        if (seed.kind !== "photo") continue;
        slots += 1;
        expect(seed.w, t.id).toBeGreaterThan(0);
        expect(seed.h, t.id).toBeGreaterThan(0);
        if (seed.filterId) expect(FILTER_IDS.has(seed.filterId), t.id).toBe(true);
      }
      // The seed may omit mask/frame; the composed element must not.
      const composed = instantiateTemplate(t)!;
      for (const el of composed.composed.elements) {
        if (el.kind !== "photo") continue;
        expect(el.src, `${t.id} baked-in photo`).toBe("");
        expect(MASK_IDS.has(el.mask), `${t.id} mask ${el.mask}`).toBe(true);
        expect(FRAME_IDS.has(el.frame), `${t.id} frame ${el.frame}`).toBe(true);
        expect(el.zoom, t.id).toBeGreaterThanOrEqual(1);
        expect(Number.isFinite(el.w) && el.w > 0, t.id).toBe(true);
      }
    }
    expect(slots).toBeGreaterThan(60);
  });

  it("references only shapes, metrics and gradients that exist", () => {
    for (const t of STORY_TEMPLATE_LIBRARY) {
      for (const seed of t.seeds) {
        if (seed.kind === "shape")
          expect(SHAPE_IDS.has(seed.shape), `${t.id} ${seed.shape}`).toBe(true);
        if (seed.kind === "data")
          expect(METRICS.includes(seed.metric), `${t.id} ${seed.metric}`).toBe(true);
      }
      const presetId = t.background.presetId;
      if (presetId && t.background.mode === "preset") {
        expect(gradientPresetById(presetId), `${t.id} bg ${presetId}`).not.toBeNull();
      }
      expect(t.background.ink, t.id).toMatch(/^#/);
    }
  });

  it("offers genuinely different compositions, not one design re-skinned", () => {
    // A fingerprint of "what is on the canvas and where". Templates that share
    // a fingerprint are duplicates wearing different colors.
    const fingerprints = new Map<string, string>();
    for (const t of STORY_TEMPLATE_LIBRARY) {
      const fp = t.seeds
        .map((s) => {
          const box = "w" in s && "h" in s ? `${Math.round(s.w * 20)}x${Math.round(s.h * 20)}` : "";
          return `${s.kind}:${Math.round(s.x * 12)},${Math.round(s.y * 12)}:${box}`;
        })
        .sort()
        .join("|");
      fingerprints.set(fp, `${fingerprints.get(fp) ?? ""} ${t.id}`);
    }
    const duplicates = [...fingerprints.entries()].filter(
      ([, ids]) => ids.trim().split(" ").length > 1,
    );
    expect(duplicates, JSON.stringify(duplicates.map(([, ids]) => ids))).toHaveLength(0);
  });
});

describe("template discovery", () => {
  it("looks up by id and groups into sections", () => {
    const first = STORY_TEMPLATE_LIBRARY[0]!;
    expect(templateById(first.id)?.id).toBe(first.id);
    expect(templateById("does-not-exist")).toBeNull();
    const sections = templateSections();
    expect(sections.length).toBeGreaterThanOrEqual(20);
    expect(sections.reduce((n, s) => n + s.items.length, 0)).toBe(STORY_TEMPLATE_LIBRARY.length);
  });

  it("understands natural-language search", () => {
    const workout = searchTemplates("something for my workout");
    expect(workout.length).toBeGreaterThan(0);
    expect(workout.every((t) => t.tags.length > 0)).toBe(true);

    const three = searchTemplates("three photos");
    expect(three.some((t) => templateMeta(t).photoSlots === 3)).toBe(true);

    const space = searchTemplates("something with lots of space");
    expect(space.length).toBeGreaterThan(0);

    const birthday = searchTemplates("birthday");
    expect(birthday.length).toBeGreaterThan(0);
    expect(birthday.some((t) => t.tags.includes("birthday"))).toBe(true);

    const romantic = searchTemplates("something romantic");
    expect(romantic.length).toBeGreaterThan(0);
  });

  it("defers to the sections when the query is empty, and never throws on junk", () => {
    // An empty box renders the category sections instead, so search itself
    // stays quiet rather than shouting the whole library.
    expect(searchTemplates("")).toHaveLength(0);
    expect(searchTemplates("   ")).toHaveLength(0);
    expect(searchTemplates("qqqqqqqqq zzzzz")).toHaveLength(0);
    expect(searchTemplates("photo", 5).length).toBeLessThanOrEqual(5);
    expect(() => searchTemplates("!!! ??? 123")).not.toThrow();
  });

  it("exposes favourites and recents as plain id lists", () => {
    expect(Array.isArray(favoriteTemplateIds())).toBe(true);
    expect(Array.isArray(recentTemplateIds())).toBe(true);
  });
});

describe("template metadata", () => {
  it("counts photo slots and metrics honestly", () => {
    for (const t of STORY_TEMPLATE_LIBRARY) {
      const meta = templateMeta(t);
      expect(meta.photoSlots).toBe(t.seeds.filter((s) => s.kind === "photo").length);
      expect(meta.metrics).toEqual([
        ...new Set(
          t.seeds.filter((s) => s.kind === "data").map((s) => (s as { metric: string }).metric),
        ),
      ]);
    }
  });

  it("keeps at least one multi-photo template per common count", () => {
    const counts = new Set(
      STORY_TEMPLATE_LIBRARY.map((t) => templateMeta(t).photoSlots).filter((n) => n > 1),
    );
    for (const n of [2, 3, 4, 6]) expect(counts.has(n), `no template with ${n} photos`).toBe(true);
  });
});

export type { StoryTemplateDef };
