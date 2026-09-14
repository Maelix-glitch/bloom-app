/**
 * Unit tests for the shared crop geometry. Both the live canvas and the
 * exporter call these functions, so pinning their behaviour pins the crop the
 * user sees to the crop they export.
 */

import { describe, expect, it } from "vitest";

import { clampPan, coverGeometry, coverGeometryPercent } from "./photogeom";

describe("coverGeometry", () => {
  it("centres the image at pan 0", () => {
    const g = coverGeometry(
      { w: 3, h: 4 },
      {
        naturalWidth: 8,
        naturalHeight: 4,
        zoom: 1,
        panX: 0,
        panY: 0,
        flipX: false,
        flipY: false,
        fit: "cover",
      },
    );
    // 8×4 over a 3×4 box covers at height 4, width 8, centred horizontally.
    expect(g.w).toBeCloseTo(8, 5);
    expect(g.h).toBeCloseTo(4, 5);
    expect(g.dx).toBeCloseTo(-2.5, 5);
    expect(g.dy).toBeCloseTo(0, 5);
  });

  it("pan ±0.5 pushes the image exactly to the edge", () => {
    const box = { w: 10, h: 10 };
    const base = {
      naturalWidth: 20,
      naturalHeight: 20,
      zoom: 2,
      panX: 0,
      panY: 0,
      flipX: false,
      flipY: false,
      fit: "cover" as const,
    };
    const right = coverGeometry(box, { ...base, panX: 0.5 });
    const left = coverGeometry(box, { ...base, panX: -0.5 });
    expect(right.dx + right.w).toBeCloseTo(box.w, 4);
    expect(left.dx).toBeCloseTo(0, 4);
  });

  it("cover never draws smaller than the box", () => {
    const g = coverGeometry(
      { w: 10, h: 10 },
      {
        naturalWidth: 30,
        naturalHeight: 10,
        zoom: 1,
        panX: 0,
        panY: 0,
        flipX: false,
        flipY: false,
        fit: "cover",
      },
    );
    expect(g.w).toBeGreaterThanOrEqual(10 - 1e-9);
    expect(g.h).toBeGreaterThanOrEqual(10 - 1e-9);
  });

  it("contain never overflows the box", () => {
    const g = coverGeometry(
      { w: 10, h: 10 },
      {
        naturalWidth: 30,
        naturalHeight: 10,
        zoom: 1,
        panX: 0,
        panY: 0,
        flipX: false,
        flipY: false,
        fit: "contain",
      },
    );
    expect(g.w).toBeLessThanOrEqual(10 + 1e-9);
    expect(g.h).toBeLessThanOrEqual(10 + 1e-9);
  });

  it("zoom grows the drawn image", () => {
    const box = { w: 10, h: 10 };
    const one = coverGeometry(box, {
      naturalWidth: 20,
      naturalHeight: 20,
      zoom: 1,
      panX: 0,
      panY: 0,
      flipX: false,
      flipY: false,
      fit: "cover",
    });
    const two = coverGeometry(box, {
      naturalWidth: 20,
      naturalHeight: 20,
      zoom: 2,
      panX: 0,
      panY: 0,
      flipX: false,
      flipY: false,
      fit: "cover",
    });
    expect(two.w).toBeGreaterThan(one.w);
  });
});

describe("coverGeometryPercent", () => {
  it("returns scale-invariant percentages", () => {
    const input = {
      naturalWidth: 40,
      naturalHeight: 30,
      zoom: 1.5,
      panX: 0.2,
      panY: -0.1,
      flipX: false,
      flipY: false,
      fit: "cover" as const,
    };
    const small = coverGeometryPercent({ w: 100, h: 160 }, input);
    const large = coverGeometryPercent({ w: 1080, h: 1728 }, input);
    // Same box aspect → same percentages regardless of absolute size.
    expect(small.left).toBeCloseTo(large.left, 4);
    expect(small.top).toBeCloseTo(large.top, 4);
    expect(small.width).toBeCloseTo(large.width, 4);
    expect(small.height).toBeCloseTo(large.height, 4);
  });
});

describe("clampPan", () => {
  it("clamps to ±0.5", () => {
    expect(clampPan(0.9)).toBe(0.5);
    expect(clampPan(-0.9)).toBe(-0.5);
    expect(clampPan(0.2)).toBe(0.2);
  });
});
