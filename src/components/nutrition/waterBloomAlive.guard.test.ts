/**
 * Water the Bloom, alive — the smooth contract (owner request
 * 2026-11-20: "heavy animation, but the app should be smooth").
 *
 * The painting itself is verified live; what can be pinned
 * structurally is pinned here:
 *   1. The performance constants hold their values: DPR capped at 2,
 *      the pour finishes inside 1.5 s, quality thresholds ordered.
 *   2. The adaptive-quality step rule behaves on synthetic frame
 *      times: slow frames shed, fast frames regain, middling hold.
 *   3. The scene source carries no shadowBlur (the slow glow path) —
 *      glow and caustics are sprites and cached gradients.
 *   4. The DPR cap is applied through the named constant, and there
 *      is exactly ONE rAF loop (start + the frame's own requeue).
 *   5. Bubbles come from a fixed pool sized by MAX_BUBBLES.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  BUBBLE_COUNTS,
  MAX_BUBBLES,
  MAX_DPR,
  MAX_QUALITY_LEVEL,
  POUR_DURATION_MS,
  QUALITY_STEP_DOWN_MS,
  QUALITY_STEP_UP_MS,
  qualityForFrameTime,
} from "./waterBloomScene";

const sceneSrc = readFileSync(
  join(process.cwd(), "src/components/nutrition/waterBloomScene.ts"),
  "utf8",
);

describe("Water the Bloom, alive — performance constants", () => {
  it("caps devicePixelRatio at 2", () => {
    expect(MAX_DPR).toBe(2);
  });

  it("finishes the whole pour within a second and a half", () => {
    expect(POUR_DURATION_MS).toBeGreaterThan(0);
    expect(POUR_DURATION_MS).toBeLessThanOrEqual(1500);
  });

  it("orders the adaptive-quality thresholds so hysteresis can work", () => {
    expect(QUALITY_STEP_UP_MS).toBeLessThan(QUALITY_STEP_DOWN_MS);
    expect(MAX_QUALITY_LEVEL).toBe(3);
    expect(BUBBLE_COUNTS).toHaveLength(MAX_QUALITY_LEVEL + 1);
    expect(BUBBLE_COUNTS[0]).toBe(MAX_BUBBLES);
    /* shedding is monotonic: never more bubbles at a lower level */
    for (let i = 1; i < BUBBLE_COUNTS.length; i += 1) {
      expect(BUBBLE_COUNTS[i]!).toBeLessThanOrEqual(BUBBLE_COUNTS[i - 1]!);
    }
  });
});

describe("Water the Bloom, alive — the adaptive step rule", () => {
  it("sheds a level when frames run long", () => {
    expect(qualityForFrameTime(0, 30)).toBe(1);
    expect(qualityForFrameTime(1, 45)).toBe(2);
  });

  it("never sheds past the floor level", () => {
    expect(qualityForFrameTime(MAX_QUALITY_LEVEL, 60)).toBe(MAX_QUALITY_LEVEL);
  });

  it("regains a level when frames run fast", () => {
    expect(qualityForFrameTime(2, 10)).toBe(1);
    expect(qualityForFrameTime(1, 8)).toBe(0);
  });

  it("never regains past full quality", () => {
    expect(qualityForFrameTime(0, 5)).toBe(0);
  });

  it("holds between the thresholds", () => {
    expect(qualityForFrameTime(1, 16)).toBe(1);
    expect(qualityForFrameTime(1, QUALITY_STEP_DOWN_MS)).toBe(1);
    expect(qualityForFrameTime(1, QUALITY_STEP_UP_MS)).toBe(1);
  });
});

describe("Water the Bloom, alive — source pins", () => {
  it("never paints with shadowBlur", () => {
    /* property use, not the word in prose: no ctx.shadow* anywhere */
    expect(sceneSrc).not.toMatch(/\.shadow(Blur|Color|OffsetX|OffsetY)\b/);
  });

  it("applies the DPR cap through the named constant", () => {
    expect(sceneSrc).toContain("Math.min(MAX_DPR, window.devicePixelRatio");
  });

  it("owns exactly one animation loop", () => {
    const calls = sceneSrc.match(/requestAnimationFrame\(/g) ?? [];
    /* one in start(), one requeue in frame() — no second loop */
    expect(calls).toHaveLength(2);
    expect(sceneSrc).toContain("cancelAnimationFrame");
  });

  it("draws bubbles from a preallocated pool, not per-frame objects", () => {
    expect(sceneSrc).toContain("Array.from({ length: MAX_BUBBLES }");
    expect(sceneSrc).not.toContain("Math.random(");
  });
});
