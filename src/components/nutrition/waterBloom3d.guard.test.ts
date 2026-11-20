// @vitest-environment jsdom
/**
 * Water the Bloom, in 3D — guards (M-163, Bloom's own 3D flower).
 *
 * The painting itself is verified on the owner's phone after deploy
 * (headless Chromium here cannot render WebGL); what can be pinned
 * structurally is pinned here:
 *
 *   1. The progress mapping is pure and honest: the water level spans
 *      the vessel linearly with progress; the petal rings unfurl
 *      staggered across the bloom, outer first and heart last; a pour
 *      is a rise past the shared epsilon, sized by the rise; pixel-
 *      ratio caps step down 2 → 1.5 → 1.25 → 1 and never exceed the
 *      device ratio.
 *   2. The fallback choice: WebGL answers → 3D, anything else → the
 *      2D painter; in an environment without WebGL (this one) the
 *      auto-mount returns the 2D scene and never creates a second
 *      canvas.
 *   3. The lazy boundary: three.js is imported ONLY inside flower3d/,
 *      and the 3D scene module is reached ONLY by the auto-mount's
 *      dynamic import — no static path from the panel (or anywhere
 *      else in src) into the 3D scene, so no unrelated route pays
 *      for it.
 *   4. The 3D scene's smooth contract: the shared adaptive step rule,
 *      the pixel-ratio caps applied through the mapping, exactly one
 *      rAF loop, and a context-loss exit to the fallback.
 *   5. The flower is Bloom's own build: none of the owner-supplied
 *      demo's scene files or their distinctive code is in the tree
 *      (owner direction, 2026-11-20 — the file was reference only).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

import {
  DPR_CAPS,
  MAX_DROPS,
  WATER_LEVEL_MAX,
  WATER_LEVEL_MIN,
  dropletCountForDelta,
  levelForProgress,
  pixelRatioForQuality,
  pourDeltaFor,
  ringOpenFor,
} from "./flower3d/mapping";
import { mountWaterSceneAuto, sceneKindFor, webglAvailable } from "./waterBloomSceneAuto";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

describe("Water the Bloom 3D — the progress mapping", () => {
  it("spans the vessel's water level linearly with progress", () => {
    expect(levelForProgress(0)).toBe(WATER_LEVEL_MIN);
    expect(levelForProgress(1)).toBe(WATER_LEVEL_MAX);
    expect(levelForProgress(0.5)).toBeCloseTo((WATER_LEVEL_MIN + WATER_LEVEL_MAX) / 2, 10);
    /* clamped: the level can never leave the vessel */
    expect(levelForProgress(-0.5)).toBe(WATER_LEVEL_MIN);
    expect(levelForProgress(1.5)).toBe(WATER_LEVEL_MAX);
  });

  it("calls a rise past the shared epsilon a pour, and nothing else", () => {
    expect(pourDeltaFor(0.2, 0.5)).toBeCloseTo(0.3, 10);
    expect(pourDeltaFor(0.5, 0.2)).toBeNull();
    expect(pourDeltaFor(0.5, 0.5)).toBeNull();
    expect(pourDeltaFor(0.5, 0.501)).toBeNull();
    expect(pourDeltaFor(0, 0.003)).toBeCloseTo(0.003, 10);
  });

  it("unfurls the rings staggered — outer first, heart last, continuous", () => {
    /* the scene's own windows (flower3d/scene.ts RINGS + heart) */
    const outer = { start: 0, span: 0.55 };
    const inner = { start: 0.45, span: 0.5 };
    const heart = { start: 0.6, span: 0.4 };
    /* at a young bloom the outer ring leads and the heart is shut */
    expect(ringOpenFor(0.3, outer.start, outer.span)).toBeGreaterThan(0);
    expect(ringOpenFor(0.3, inner.start, inner.span)).toBe(0);
    expect(ringOpenFor(0.3, heart.start, heart.span)).toBe(0);
    /* order holds mid-bloom: outer ahead of inner ahead of heart */
    const mid = 0.65;
    expect(ringOpenFor(mid, outer.start, outer.span)).toBeGreaterThan(ringOpenFor(mid, inner.start, inner.span));
    expect(ringOpenFor(mid, inner.start, inner.span)).toBeGreaterThan(ringOpenFor(mid, heart.start, heart.span));
    /* at the target everything is fully open; before the day starts, shut */
    expect(ringOpenFor(1, outer.start, outer.span)).toBe(1);
    expect(ringOpenFor(1, heart.start, heart.span)).toBe(1);
    expect(ringOpenFor(0, outer.start, outer.span)).toBe(0);
    /* continuous, never stepped */
    expect(ringOpenFor(0.31, outer.start, outer.span)).toBeGreaterThan(ringOpenFor(0.3, outer.start, outer.span));
  });

  it("sizes a pour's droplets by the rise, inside the pool", () => {
    expect(dropletCountForDelta(0.01)).toBe(3);
    expect(dropletCountForDelta(1)).toBe(MAX_DROPS);
    expect(dropletCountForDelta(0.5)).toBeGreaterThan(dropletCountForDelta(0.1));
    expect(dropletCountForDelta(0.5)).toBeLessThanOrEqual(MAX_DROPS);
  });

  it("steps the pixel-ratio caps down from the house cap of 2", () => {
    expect(DPR_CAPS[0]).toBe(2);
    expect(DPR_CAPS).toHaveLength(4);
    for (let i = 1; i < DPR_CAPS.length; i += 1) {
      expect(DPR_CAPS[i]!).toBeLessThan(DPR_CAPS[i - 1]!);
    }
    expect(pixelRatioForQuality(0, 3)).toBe(2);
    expect(pixelRatioForQuality(1, 3)).toBe(1.5);
    expect(pixelRatioForQuality(3, 3)).toBe(1);
    /* never above the device's own ratio */
    expect(pixelRatioForQuality(0, 1)).toBe(1);
    expect(pixelRatioForQuality(2, 1.1)).toBe(1.1);
  });
});

describe("Water the Bloom 3D — the fallback choice", () => {
  it("chooses 3D exactly when WebGL answers", () => {
    expect(sceneKindFor(true)).toBe("3d");
    expect(sceneKindFor(false)).toBe("2d");
  });

  it("falls back to the 2D scene where WebGL is unavailable", () => {
    /* jsdom has no WebGL — the same answer a browser without it gives. */
    expect(webglAvailable()).toBe(false);
    const wrap = document.createElement("div");
    const canvas = document.createElement("canvas");
    wrap.appendChild(canvas);
    document.body.appendChild(wrap);
    const scene = mountWaterSceneAuto(canvas, { reducedMotion: false });
    scene.setProgress(0.5);
    scene.setProgress(0.75);
    /* the 2D painter alone: no second canvas was ever created */
    expect(wrap.querySelectorAll("canvas")).toHaveLength(1);
    scene.destroy();
    wrap.remove();
  });
});

describe("Water the Bloom 3D — the lazy boundary", () => {
  const SRC = join(process.cwd(), "src");
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) files.push(path);
    }
  };
  walk(SRC);
  const rel = (p: string) => relative(SRC, p).split("\\").join("/");

  it("three.js is imported only inside flower3d/", () => {
    const offenders = files.filter(
      (p) =>
        !rel(p).startsWith("components/nutrition/flower3d/") &&
        /from\s+["']three["']|import\s+["']three["']/.test(readFileSync(p, "utf8")),
    );
    expect(offenders.map(rel)).toEqual([]);
  });

  it("the 3D scene is reached only by the auto-mount's dynamic import", () => {
    const auto = read("src/components/nutrition/waterBloomSceneAuto.ts");
    expect(auto).toContain('import("./flower3d/scene")');
    expect(auto).not.toMatch(/from\s+["']\.\/flower3d\/scene["']/);
    const offenders = files.filter(
      (p) =>
        rel(p) !== "components/nutrition/waterBloomSceneAuto.ts" &&
        !rel(p).startsWith("components/nutrition/flower3d/") &&
        readFileSync(p, "utf8").includes("flower3d/scene"),
    );
    expect(offenders.map(rel)).toEqual([]);
  });

  it("the panel itself carries no static path into three or the scene", () => {
    const panel = read("src/components/nutrition/WaterBloom.tsx");
    expect(panel).not.toContain("three");
    expect(panel).not.toContain("flower3d");
    expect(panel).toContain("mountWaterSceneAuto");
  });
});

describe("Water the Bloom 3D — the scene's smooth contract", () => {
  const sceneSrc = read("src/components/nutrition/flower3d/scene.ts");

  it("steps quality by the one shared rule", () => {
    expect(sceneSrc).toContain("qualityForFrameTime");
  });

  it("applies the pixel-ratio caps through the mapping", () => {
    expect(sceneSrc).toContain("pixelRatioForQuality");
  });

  it("owns exactly one animation loop", () => {
    const calls = sceneSrc.match(/requestAnimationFrame\(/g) ?? [];
    expect(calls).toHaveLength(2);
    expect(sceneSrc).toContain("cancelAnimationFrame");
  });

  it("exits to the fallback when the context is lost", () => {
    expect(sceneSrc).toContain("webglcontextlost");
    expect(sceneSrc).toContain("onFail");
  });

  it("keeps a still, settled frame for reduced motion", () => {
    expect(sceneSrc).toContain("settleTo");
  });
});

describe("Water the Bloom 3D — the flower is Bloom's own build", () => {
  const dir = join(process.cwd(), "src/components/nutrition/flower3d");

  it("none of the demo's scene files were carried into the tree", () => {
    const names = readdirSync(dir);
    for (const demoFile of ["blade.ts", "flower.ts", "vase.ts", "textures.ts", "BloomScene.ts", "BloomFlower.tsx"]) {
      expect(names, `${demoFile} must not exist in flower3d/`).not.toContain(demoFile);
    }
  });

  it("no distinctive demo code survives anywhere in the slice", () => {
    const sliceFiles = [
      ...readdirSync(dir).map((n) => join(dir, n)),
      join(process.cwd(), "src/components/nutrition/waterBloomSceneAuto.ts"),
      join(process.cwd(), "src/components/nutrition/WaterBloom.tsx"),
    ];
    const demoFingerprints = [
      "createBladeGeometry",
      "updateBlade",
      "createPetalTextures",
      "createLeafTextures",
      "createHaloTexture",
      "RoomEnvironment",
    ];
    for (const file of sliceFiles) {
      const src = readFileSync(file, "utf8");
      for (const print of demoFingerprints) {
        expect(src, `${print} must not appear in ${file}`).not.toContain(print);
      }
      /* the demo's scene class, as a whole word — Bloom's own module
         names (waterBloomScene…) are not it */
      expect(src, `BloomScene must not appear in ${file}`).not.toMatch(/\bBloomScene\b/);
    }
  });
});
