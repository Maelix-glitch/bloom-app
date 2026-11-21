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
  ARC_PEAK_X,
  ARC_VALLEY_X,
  arcAnchorsFromRawXs,
  arcAnchorsOf,
  arcAwakeFraction,
  arcFrameOf,
  arcNowLabelOffence,
  arcNowLabelPlacementOf,
  arcPointForTime,
  arcSequenceRawX,
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

describe("day arc geometry — the sequence-placed walk (M-199)", () => {
  it("a next moment past the peak anchors the walk between the peak and it", () => {
    /* The owner's shape: Up raw 24, Caffeine ends raw 435 — the
       walk belongs after the peak station (360) and before the
       caffeine node: the midpoint of that stretch. */
    expect(arcSequenceRawX(24, 435)).toBeCloseTo((ARC_PEAK_X + 435) / 2, 6);
    expect(arcSequenceRawX(24, 435)).toBeGreaterThan(ARC_PEAK_X);
    expect(arcSequenceRawX(24, 435)).toBeLessThan(435);
  });

  it("a next moment before the peak leaves the midpoint of its neighbours", () => {
    expect(arcSequenceRawX(24, 300)).toBeCloseTo(162, 6);
    expect(arcSequenceRawX(24, ARC_PEAK_X)).toBeCloseTo((24 + ARC_PEAK_X) / 2, 6);
  });

  it("anchors built from raw xs are the timed anchors, unchanged", () => {
    const minutes = [390, 785, 870, 1230, 1290, 1350];
    const timed = arcAnchorsOf(minutes, frame);
    expect(arcAnchorsFromRawXs(timed.raw)).toEqual(timed);
  });

  it("the sequence walk rides the relaxation between Up and Caffeine ends", () => {
    /* The owner's day with the walk placed by sequence instead
       of by the meal's clock: Up 24, walk (sequence), Caffeine
       ends 435, Last meal by, Wind-down, In bed. */
    const raw = [24, arcSequenceRawX(24, 435), 435, 743.25, 794.625, 846];
    const seq = arcAnchorsFromRawXs(raw);
    for (let i = 0; i < seq.placed.length - 1; i++) {
      expect(seq.placed[i + 1]! - seq.placed[i]!).toBeGreaterThanOrEqual(99.5);
    }
    expect(seq.placed[1]).toBeGreaterThan(seq.placed[0]);
    expect(seq.placed[1]).toBeLessThan(seq.placed[2]);
    /* …and it stays at the peak the preview drew. */
    expect(seq.placed[1]).toBeGreaterThan(320);
    expect(seq.placed[1]).toBeLessThan(400);
  });
});

describe("day arc geometry — the now label's placement (M-199)", () => {
  const minutes = [390, 785, 870, 1230, 1290, 1350];
  const anchors = arcAnchorsOf(minutes, frame);
  const nodes = anchors.placed.map((x) => ({ x, y: arcYAtX(x) }));
  const placementAt = (t: number) => {
    const marker = arcPointForTime(t, frame, anchors);
    return { marker, placement: arcNowLabelPlacementOf(marker, nodes) };
  };

  it("a clear stretch of arc keeps the home placement", () => {
    /* 09:00 — the morning climb, nothing near the marker. */
    const { marker, placement } = placementAt(540);
    expect(placement).toEqual({ side: "right", level: "above" });
    expect(arcNowLabelOffence(marker, placement, nodes)).toBe(0);
  });

  it("the 22:13 defect: the label lifts clear of the Wind-down medallion", () => {
    /* Live on the owner's phone, 2026-11-21 ~22:13: the marker
       sat between Wind-down and In bed and the old frame rule
       (x > 640 → label left) struck the label through the
       Wind-down medallion. The rule now lifts it above every
       medallion, on the same side, offence zero. */
    const { marker, placement } = placementAt(1333);
    expect(placement).toEqual({ side: "left", level: "lifted" });
    expect(arcNowLabelOffence(marker, placement, nodes)).toBe(0);
    /* …and the placement it replaces really did offend. */
    expect(arcNowLabelOffence(marker, { side: "left", level: "above" }, nodes)).toBeGreaterThan(0);
  });

  it("wedged between Wind-down and In bed, the label drops to the valley floor", () => {
    /* ~21:50 — the marker is boxed in: Wind-down's medallion
       and caption on one side, In bed and the frame's edge on
       the other, Last meal's medallion above. No side or level
       at the dot's own height is clean; the floor is. */
    const { marker, placement } = placementAt(1310);
    expect(placement.level).toBe("dropped");
    expect(arcNowLabelOffence(marker, placement, nodes)).toBe(0);
  });

  it("the night marker's label is clean too, on the home side", () => {
    const { marker, placement } = placementAt(180); // 03:00, in the valley
    expect(marker.span).toBe("sleep");
    expect(placement.side).toBe("left");
    expect(arcNowLabelOffence(marker, placement, nodes)).toBe(0);
  });

  it("every minute of the day resolves to a clean placement", () => {
    for (let t = 0; t < 1440; t++) {
      const { marker, placement } = placementAt(t);
      expect(arcNowLabelOffence(marker, placement, nodes), `t=${t}`).toBe(0);
    }
  });
});
