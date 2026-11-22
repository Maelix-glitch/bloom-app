/**
 * The library is the product.
 *
 * These invariants run the real `instantiate()` against every authored
 * template, so a bad coordinate, an unknown mask or a photo baked in as an
 * image (instead of a slot) fails the build rather than shipping to someone's
 * phone.
 *
 * The headline invariant is the count. The v2 library is exactly fourteen
 * archetypes — the v1 fifty collapsed into about five repeated compositions
 * (2026-11-10 deep-dive), so v2 asserts depth instead: photo-first, data as
 * the centrepiece, every colour inside the official palette. The assertion
 * fails on 13 and on 15 alike.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  STORY_TEMPLATE_COUNT,
  STORY_TEMPLATE_LIBRARY,
  favoriteTemplateIds,
  instantiateTemplate,
  recentTemplateIds,
  recordTemplateUse,
  searchTemplates,
  templateById,
  templateMeta,
  templateSections,
  validateCollection,
} from "./index";
import { TEMPLATE_CATEGORIES, type StoryTemplateDef } from "./dsl";
import { COLLECTION_SIZES } from "./collection";
import { STORY_V2_PALETTE } from "./collection/kit";
import { resolveText } from "@/lib/stories/canvas/typography";
import type { Paint } from "@/lib/stories/canvas/paint";
import { FRAMES, MASKS } from "@/lib/stories/canvas/masks";
import { SHAPES } from "@/lib/stories/canvas/shapes";
import { STORY_FILTERS } from "@/lib/stories/catalogs";
import { METRICS } from "@/lib/stories/data/metrics";
import { sanitizeElements } from "@/lib/stories/elements";

const MASK_IDS = new Set<string>(MASKS.map((m) => m.id));
const FRAME_IDS = new Set<string>(FRAMES.map((f) => f.id));
const SHAPE_IDS = new Set<string>(SHAPES.map((s) => s.id));
const FILTER_IDS = new Set<string>(STORY_FILTERS.map((f) => f.id));
const PALETTE = new Set(STORY_V2_PALETTE.map((c) => c.toUpperCase()));

const inUnit = (n: number) => Number.isFinite(n) && n >= 0 && n <= 1;

/** Every colour a template paints with, from every field that can hold one. */
function collectPaintColors(paint: Paint, out: string[]): void {
  if (paint.type === "solid") out.push(paint.color);
  else if (paint.type === "layers")
    for (const layer of paint.layers) collectPaintColors(layer, out);
  else for (const [, color] of paint.stops) out.push(color);
}

function templateColors(t: StoryTemplateDef): string[] {
  const colors: string[] = [t.background.ink];
  collectPaintColors(t.background.paint, colors);
  for (const seed of t.seeds) {
    if (seed.kind === "text") {
      colors.push(seed.color);
      if (seed.backdropColor) colors.push(seed.backdropColor);
      if (seed.outlineColor) colors.push(seed.outlineColor);
    }
    if (seed.kind === "shape") {
      if (seed.fill) colors.push(seed.fill);
      if (seed.stroke) colors.push(seed.stroke);
    }
    if (seed.kind === "data" && seed.accent) colors.push(seed.accent);
    if (seed.kind === "sticker" && seed.tint) colors.push(seed.tint);
    if (seed.kind === "photo" && seed.frameColor) colors.push(seed.frameColor);
  }
  return colors;
}

describe("the count is exactly fourteen", () => {
  it("holds exactly 14 templates", () => {
    expect(STORY_TEMPLATE_COUNT).toBe(14);
    expect(STORY_TEMPLATE_LIBRARY).toHaveLength(14);
  });

  it("splits across exactly seven collections, at the agreed sizes", () => {
    expect(TEMPLATE_CATEGORIES).toHaveLength(7);
    for (const [shelf, expected] of Object.entries(COLLECTION_SIZES)) {
      const actual = STORY_TEMPLATE_LIBRARY.filter((t) => t.category === shelf).length;
      expect(actual, `${shelf} shelf`).toBe(expected);
    }
    expect(Object.values(COLLECTION_SIZES).reduce((a, b) => a + b, 0)).toBe(14);
  });

  it("reports no problems from the collection validator", () => {
    expect(validateCollection()).toEqual([]);
  });

  it("has no hidden duplicates — ids and names are unique", () => {
    const ids = new Set(STORY_TEMPLATE_LIBRARY.map((t) => t.id));
    expect(ids.size).toBe(14);
    const names = new Set(STORY_TEMPLATE_LIBRARY.map((t) => t.name));
    expect(names.size).toBe(14);
  });

  it("never uses a technical name", () => {
    for (const t of STORY_TEMPLATE_LIBRARY) {
      expect(t.name, t.id).not.toMatch(/^(template|layout|design|modern|gradient)\s*\d*$/i);
      expect(t.name, t.id).not.toMatch(/^\d+$/);
    }
  });
});

describe("story template library", () => {
  it("declares only known collections, and every collection has designs", () => {
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

  it("renders text at the size the seed authored", () => {
    /* Seeds author size as absolute points on the reference canvas; the
       element contract is a multiplier of the preset's base size, and
       instantiate() converts between them. When the conversion was lost,
       resolveText multiplied base × points and every template rendered
       with giant clipped letters (a 40pt headline at 1,760pt). */
    for (const t of STORY_TEMPLATE_LIBRARY) {
      const composed = instantiateTemplate(t)!;
      const textEls = composed.composed.elements.filter((e) => e.kind === "text");
      const textSeeds = t.seeds.filter((s) => s.kind === "text");
      expect(textEls.length, t.id).toBe(textSeeds.length);
      textSeeds.forEach((seed, i) => {
        if (seed.size === undefined) return;
        const el = textEls[i]!;
        if (el.kind !== "text") return;
        const resolved = resolveText(el.preset, el.style ?? {}, 1);
        expect(resolved.fontSize, `${t.id} "${seed.text.slice(0, 16)}"`).toBeCloseTo(seed.size, 5);
      });
    }
  });

  it("derives stack order from seed order when z is not declared", () => {
    for (const t of STORY_TEMPLATE_LIBRARY) {
      const composed = instantiateTemplate(t)!;
      const zs = composed.composed.elements.map((e) => e.z);
      // Strictly increasing: nothing in a template may sit at the same depth as
      // the thing above it, or the layer order becomes arbitrary.
      for (let i = 1; i < zs.length; i += 1) {
        expect(zs[i]! > zs[i - 1]!, `${t.id} z order at ${i}`).toBe(true);
      }
    }
  });

  it("keeps every seed inside the canvas", () => {
    for (const t of STORY_TEMPLATE_LIBRARY) {
      for (const seed of t.seeds) {
        expect(inUnit(seed.x), `${t.id} x`).toBe(true);
        expect(inUnit(seed.y), `${t.id} y`).toBe(true);
        if ("w" in seed) expect(inUnit(seed.w), `${t.id} w`).toBe(true);
        if ("h" in seed) expect(inUnit(seed.h), `${t.id} h`).toBe(true);
      }
    }
  });

  it("keeps readable content clear of the viewer's top and bottom UI", () => {
    // The viewer draws a header down the top and a reply bar along the bottom.
    // Text and stickers are what someone needs to read, so they stay inside.
    for (const t of STORY_TEMPLATE_LIBRARY) {
      for (const seed of t.seeds) {
        if (seed.kind !== "text" && seed.kind !== "sticker" && seed.kind !== "data") continue;
        expect(seed.y, `${t.id} "${seed.kind}" under the header`).toBeGreaterThanOrEqual(0.11);
        expect(seed.y, `${t.id} "${seed.kind}" under the reply bar`).toBeLessThanOrEqual(0.88);
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
        // The DSL auto-names slots PHOTO_SLOT_n but lets a template name one
        // deliberately; either way it must be a non-empty, stable id.
        expect(seed.slot.length, `${t.id} slot id`).toBeGreaterThan(0);
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
    // v2 is photo-first: 15 slots across 14 templates (twelve photo-led
    // designs: ten singles, one diptych, one triptych). The v1 library
    // managed 25 slots spread across fifty templates.
    expect(slots).toBe(15);
  });

  it("references only shapes and metrics that exist", () => {
    for (const t of STORY_TEMPLATE_LIBRARY) {
      for (const seed of t.seeds) {
        if (seed.kind === "shape")
          expect(SHAPE_IDS.has(seed.shape), `${t.id} ${seed.shape}`).toBe(true);
        if (seed.kind === "data")
          expect(METRICS.includes(seed.metric), `${t.id} ${seed.metric}`).toBe(true);
      }
      expect(t.background.ink, t.id).toMatch(/^#/);
    }
  });

  it("stays inside the official reskin palette — every colour, no exceptions", () => {
    // v1's rule was only "be a hex". v2's rule is the actual brief: ink,
    // panel, gold, gold-soft, sage, rose, cream and their in-family shades —
    // the exact list exported from the kit. A new hue fails here, in the
    // suite, instead of drifting onto someone's shelf.
    const hex = /^#[0-9a-f]{6}$/i;
    for (const t of STORY_TEMPLATE_LIBRARY) {
      for (const color of templateColors(t)) {
        expect(color, `${t.id} colour`).toMatch(hex);
        expect(PALETTE.has(color.toUpperCase()), `${t.id} off-palette colour ${color}`).toBe(true);
      }
    }
  });

  it("offers genuinely different compositions, not one design re-skinned", () => {
    // A fingerprint of "what is on the canvas and where". Templates that share
    // a fingerprint are duplicates wearing different colours.
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

  it("is photo-first and data-led — the v2 brief, pinned", () => {
    // The deep-dive's three failures, inverted into assertions: v1 had half
    // its templates with no photo slot and only five using real data.
    const photoLed = STORY_TEMPLATE_LIBRARY.filter((t) => templateMeta(t).photoSlots > 0).length;
    const dataLed = STORY_TEMPLATE_LIBRARY.filter((t) => templateMeta(t).metrics.length > 0).length;
    const typographic = STORY_TEMPLATE_LIBRARY.filter(
      (t) => templateMeta(t).photoSlots === 0,
    ).length;

    expect(photoLed, "photo-led").toBe(12);
    expect(dataLed, "data-led").toBe(11);
    // Exactly two archetypes earn a no-photo design by being genuinely
    // typographic (the poster, the handwritten line) — no more.
    expect(typographic, "typographic").toBe(2);
  });

  it("uses Bloom's own sticker art — v1 used it in zero templates", () => {
    const withStickers = STORY_TEMPLATE_LIBRARY.filter((t) => templateMeta(t).hasStickers).length;
    expect(withStickers).toBeGreaterThanOrEqual(1);
  });

  it("lets several templates be genuinely minimal", () => {
    // Restraint is part of the brief. At least five templates must carry four
    // seeds or fewer — a great template can be one image and one line.
    const minimal = STORY_TEMPLATE_LIBRARY.filter((t) => t.seeds.length <= 4).length;
    expect(minimal).toBeGreaterThanOrEqual(5);
  });
});

describe("template discovery", () => {
  it("looks up by id and groups into exactly seven sections", () => {
    const first = STORY_TEMPLATE_LIBRARY[0]!;
    expect(templateById(first.id)?.id).toBe(first.id);
    expect(templateById("does-not-exist")).toBeNull();
    const sections = templateSections();
    expect(sections).toHaveLength(7);
    expect(sections.reduce((n, s) => n + s.items.length, 0)).toBe(14);
  });

  it("understands natural-language search over the fourteen", () => {
    const morning = searchTemplates("something for the morning");
    expect(morning.length).toBeGreaterThan(0);
    expect(morning.every((t) => t.tags.length > 0)).toBe(true);

    const memory = searchTemplates("a memory to keep");
    expect(memory.length).toBeGreaterThan(0);
    expect(memory.some((t) => t.category === "memories")).toBe(true);

    const win = searchTemplates("a small win");
    expect(win.some((t) => t.category === "progress")).toBe(true);

    const grateful = searchTemplates("grateful");
    expect(grateful.some((t) => t.category === "reflection")).toBe(true);

    const celebrate = searchTemplates("celebration");
    expect(celebrate.some((t) => t.category === "celebration")).toBe(true);

    const photos = searchTemplates("two photos");
    expect(photos.some((t) => templateMeta(t).photoSlots === 2)).toBe(true);
  });

  it("defers to the sections when the query is empty, and never throws on junk", () => {
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

describe("saved stories survive the library swap", () => {
  it("retired v1 ids resolve to null, never to a wrong template", () => {
    // Every v1 id vanished in v2. Anything that still holds one — a draft, a
    // favourite, a "small win" shortcut — must get null and take its
    // graceful fallback, not somebody else's design.
    for (const retired of [
      "everyday-today",
      "progress-small-win",
      "mood-inner-weather",
      "reflection-grateful-for",
    ]) {
      expect(templateById(retired), retired).toBeNull();
      expect(instantiateTemplate(retired), retired).toBeNull();
    }
    expect(() => recordTemplateUse("everyday-today")).not.toThrow();
  });

  it("a stored story renders from its elements alone — no template lookup", () => {
    // Saved stories persist their composed elements, not a template id, so
    // the sanitizer round-trip is the whole contract: a v1-era story whose
    // template no longer exists still sanitises to renderable elements.
    const stored = [
      {
        kind: "photo",
        src: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
        x: 0.5,
        y: 0.45,
        z: 1,
        w: 0.9,
        h: 0.6,
        mask: "arch",
        frame: "none",
      },
      { kind: "text", text: "from before the swap", x: 0.5, y: 0.8, z: 2, preset: "editorial" },
    ];
    const out = sanitizeElements(stored);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ kind: "photo" });
    expect(out[1]).toMatchObject({ kind: "text", text: "from before the swap" });
  });
});

describe("no dangling references", () => {
  it("every hardcoded templateId in the source exists in the library", () => {
    // Rebuilding the library is exactly the moment a string id elsewhere in the
    // app goes stale, and a stale id fails *silently* — instantiateTemplate
    // returns null and the editor opens blank. So scan for them.
    const root = fileURLToPath(new URL("../../../..", import.meta.url));
    const srcRoot = join(root, "src");
    const offenders: string[] = [];

    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.tsx?$/.test(entry.name) && !entry.name.includes(".test.")) {
          const src = readFileSync(full, "utf8");
          for (const m of src.matchAll(/templateId:\s*"([^"]+)"/g)) {
            const id = m[1]!;
            if (STORY_TEMPLATE_LIBRARY.some((t) => t.id === id)) continue;
            offenders.push(`${relative(root, full)} -> "${id}"`);
          }
        }
      }
    };
    walk(srcRoot);

    expect(offenders, `stale template ids:\n  ${offenders.join("\n  ")}`).toEqual([]);
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

  it("keeps a multi-photo template", () => {
    const counts = new Set(
      STORY_TEMPLATE_LIBRARY.map((t) => templateMeta(t).photoSlots).filter((n) => n > 1),
    );
    expect(counts.has(2), "no template with 2 photos").toBe(true);
    expect(counts.has(3), "no template with 3 photos").toBe(true);
  });
});

describe("premium templates (M-214)", () => {
  const PREMIUM_IDS = [
    "everyday-day-in-numbers",
    "everyday-golden-arch",
    "progress-streak-ring",
    "progress-poster",
    "mood-energy-arc",
    "wellness-in-motion",
  ];

  it("exactly the designated designs are premium", () => {
    expect(STORY_TEMPLATE_LIBRARY.filter((t) => t.premium).map((t) => t.id).sort()).toEqual(
      [...PREMIUM_IDS].sort(),
    );
  });

  it("every category with a premium design keeps a basic one", () => {
    for (const t of STORY_TEMPLATE_LIBRARY.filter((x) => x.premium)) {
      expect(
        STORY_TEMPLATE_LIBRARY.some((x) => x.category === t.category && !x.premium),
        `category ${t.category} would be Plus-only`,
      ).toBe(true);
    }
  });
});

export type { StoryTemplateDef };
