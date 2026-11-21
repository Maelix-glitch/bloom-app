/**
 * The Day Arc geometry (M-198) — the pure mapping from the
 * caretaker's times to points on the preview's sun-path. Pinned:
 * the path's own stations, the awake span's ends, the night
 * tail's valley, the evening declutter, and the warp that keeps
 * the now marker between the same neighbours as the nodes.
 */

import { describe, expect, it } from "vitest";

import {
  ARC_DAY_START_X,
  ARC_VALLEY_X,
  arcAnchorsOf,
  arcAwakeFraction,
  arcFrameOf,
  arcPointForTime,
  arcTailPointAt,
  arcYAtX,
  relaxArcXs,
  warpArcX,
} from "./dayArc";

/* The owner's frame: up 06:30, in bed 22:30, 8 hours of sleep. */
const frame = arcFrameOf(390, 1350);

describe("day arc geometry — the path itself", () => {
  it("passes through the preview's stations", () => {
    expect(arcYAtX(24)).toBeCloseTo(176, 1);
    expect(arcYAtX(360)).toBeCloseTo(50, 1);
    expect(arcYAtX(520)).toBeCloseTo(92, 1);
    expect(arcYAtX(640)).toBeCloseTo(150, 1);
    expect(arcYAtX(742)).toBeCloseTo(208, 1);
    expect(arcYAtX(846)).toBeCloseTo(228, 1);
    expect(arcYAtX(870)).toBeCloseTo(184, 1);
  });

  it("rises from the horizon to the peak, then descends into the valley", () => {
    expect(arcYAtX(200)).toBeLessThan(arcYAtX(24));
    expect(arcYAtX(700)).toBeGreaterThan(arcYAtX(520));
    expect(arcYAtX(846)).toBeGreaterThan(arcYAtX(742));
  });
});

describe("day arc geometry — the frame", () => {
  it("wake is fraction 0, bed is fraction 1, midday sits between", () => {
    expect(arcAwakeFraction(390, frame)).toBe(0);
    expect(arcAwakeFraction(1350, frame)).toBe(1);
    expect(arcAwakeFraction(870, frame)).toBeCloseTo(0.5, 6);
  });

  it("a bedtime past midnight wraps on the same frame", () => {
    const late = arcFrameOf(420, 60); // up 07:00, in bed 01:00
    expect(late.awakeSpan).toBe(1080);
    expect(arcAwakeFraction(60, late)).toBe(1);
    expect(arcAwakeFraction(0, late)).toBeCloseTo(1020 / 1080, 6);
  });

  it("the night tail starts at the valley bottom and lifts toward morning", () => {
    const start = arcTailPointAt(0);
    expect(start.x).toBeCloseTo(846, 1);
    expect(start.y).toBeCloseTo(228, 1);
    const mid = arcTailPointAt(0.5);
    expect(mid.x).toBeGreaterThan(846);
    expect(mid.y).toBeLessThan(228);
    const end = arcTailPointAt(1);
    expect(end.x).toBeCloseTo(870, 1);
    expect(end.y).toBeCloseTo(184, 1);
  });
});

describe("day arc geometry — a time's point", () => {
  it("wake rides the path's start, bed the valley bottom", () => {
    const up = arcPointForTime(390, frame);
    expect(up.span).toBe("awake");
    expect(up.x).toBeCloseTo(ARC_DAY_START_X, 6);
    expect(up.y).toBeCloseTo(176, 1);
    const bed = arcPointForTime(1350, frame);
    expect(bed.span).toBe("awake");
    expect(bed.x).toBeCloseTo(ARC_VALLEY_X, 6);
    expect(bed.y).toBeCloseTo(228, 1);
  });

  it("a time inside the night sits in the valley, on the tail", () => {
    const night = arcPointForTime(180, frame); // 03:00
    expect(night.span).toBe("sleep");
    expect(night.x).toBeGreaterThanOrEqual(ARC_VALLEY_X);
    expect(night.y).toBeGreaterThan(200);
    expect(night.y).toBeLessThanOrEqual(228);
  });
});

describe("day arc geometry — placement", () => {
  /* The owner's six moments, as raw time xs: Up, Walk (13:05),
     Caffeine ends (14:30), Last meal by (20:30), Wind-down
     (21:30), In bed. The evening three sit ~51 units apart raw —
     too close for their captions. */
  const minutes = [390, 785, 870, 1230, 1290, 1350];
  const anchors = arcAnchorsOf(minutes, frame);

  it("raw xs are the honest time positions", () => {
    expect(anchors.raw[0]).toBeCloseTo(24, 6);
    expect(anchors.raw[2]).toBeCloseTo(435, 6);
    expect(anchors.raw[5]).toBeCloseTo(846, 6);
  });

  it("relaxation keeps every gap at the minimum, order and bounds intact", () => {
    const placed = anchors.placed;
    for (let i = 0; i < placed.length - 1; i++) {
      expect(placed[i + 1] - placed[i]).toBeGreaterThanOrEqual(99.5);
      expect(placed[i]).toBeGreaterThanOrEqual(ARC_DAY_START_X);
      expect(placed[i]).toBeLessThanOrEqual(ARC_VALLEY_X);
    }
    /* The walk stays at the peak the preview drew. */
    expect(placed[1]).toBeGreaterThan(320);
    expect(placed[1]).toBeLessThan(400);
  });

  it("relaxArcXs leaves an already-spread set untouched", () => {
    expect(relaxArcXs([24, 300, 600, 846])).toEqual([24, 300, 600, 846]);
  });

  it("the warp keeps a free point between the same neighbours", () => {
    /* 21:07 — after the last-meal boundary (20:30), before the
       wind-down (21:30): its warped x must sit between those two
       nodes' placed xs, even though relaxation moved them. */
    const rawX = 24 + ((1277 - 390) / 960) * (846 - 24);
    const warped = warpArcX(rawX, anchors);
    expect(warped).toBeGreaterThan(anchors.placed[3]);
    expect(warped).toBeLessThan(anchors.placed[4]);

    const point = arcPointForTime(1277, frame, anchors);
    expect(point.x).toBeCloseTo(warped, 6);
    expect(point.y).toBeCloseTo(arcYAtX(warped), 6);
  });
});
