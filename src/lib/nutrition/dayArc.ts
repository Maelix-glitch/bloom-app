/**
 * Nutrition — the Day Arc geometry (M-198).
 *
 * The whole-day caretaker section draws the day as one sun-path
 * arc (the owner-approved preview, ported exact): the path rises
 * from the wake horizon to a midday peak, descends through dusk
 * into a sage sleep valley at the bedtime end, and lifts a little
 * at the far edge toward the next morning. This module is the
 * pure geometry behind it — no clock, no DOM, no rendering:
 *
 *   · the path is the preview's own, six cubic Bézier segments in
 *     an 880×360 viewBox, x-monotone throughout, so any x on the
 *     day span has exactly one y on the path (found by bisection);
 *   · a time of day maps onto the arc by its place in the day the
 *     caretaker derives: the AWAKE span (wake → bed, on the
 *     caretaker's own frame) runs along the path from its start
 *     to the valley bottom, equal time covering equal x; the
 *     SLEEP span (bed → next wake) runs along the short tail past
 *     the valley, by arc length, so a moment inside the night
 *     sits in the valley;
 *   · node positions are then relaxed — a minimum-gap pass that
 *     spreads moments whose captions would collide (the evening
 *     cluster: last meal, wind-down, bed) while preserving their
 *     order and their ends. The "you are here" marker is warped
 *     through the same relaxation, so it always sits between the
 *     same neighbours the nodes show.
 *
 * Everything here is a function of its inputs; the component
 * supplies the caretaker's times and the current local time.
 */

export const ARC_VIEW_W = 880;
export const ARC_VIEW_H = 360;

/** The day span's ends on the path: the wake horizon where the
 *  path starts, and the valley bottom where the bedtime sits.
 *  Past the valley the tail (the last segment) is the night. */
export const ARC_DAY_START_X = 24;
export const ARC_VALLEY_X = 846;
export const ARC_END_X = 870;

type Pt = { x: number; y: number };
type Cubic = readonly [Pt, Pt, Pt, Pt];

/** The preview's path, segment by segment (P0, C1, C2, P1). */
export const ARC_SEGMENTS: readonly Cubic[] = [
  [
    { x: 24, y: 176 },
    { x: 120, y: 176 },
    { x: 220, y: 50 },
    { x: 360, y: 50 },
  ],
  [
    { x: 360, y: 50 },
    { x: 460, y: 50 },
    { x: 495, y: 74 },
    { x: 520, y: 92 },
  ],
  [
    { x: 520, y: 92 },
    { x: 565, y: 122 },
    { x: 610, y: 138 },
    { x: 640, y: 150 },
  ],
  [
    { x: 640, y: 150 },
    { x: 672, y: 164 },
    { x: 712, y: 196 },
    { x: 742, y: 208 },
  ],
  [
    { x: 742, y: 208 },
    { x: 782, y: 220 },
    { x: 820, y: 226 },
    { x: 846, y: 228 },
  ],
  [
    { x: 846, y: 228 },
    { x: 860, y: 230 },
    { x: 864, y: 208 },
    { x: 870, y: 184 },
  ],
];

/** The full path as SVG path data — the component renders exactly
 *  the curve this module measures. */
export const ARC_PATH_D =
  "M 24 176 C 120 176 220 50 360 50 C 460 50 495 74 520 92 " +
  "C 565 122 610 138 640 150 C 672 164 712 196 742 208 " +
  "C 782 220 820 226 846 228 C 860 230 864 208 870 184";

function cubicAt(seg: Cubic, u: number): Pt {
  const [p0, p1, p2, p3] = seg;
  const v = 1 - u;
  const a = v * v * v;
  const b = 3 * v * v * u;
  const c = 3 * v * u * u;
  const d = u * u * u;
  return {
    x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
  };
}

/** The path's y at a given x. Every segment's control points are
 *  non-decreasing in x, so x(u) is monotone and bisection lands
 *  on the one point of the path that carries this x. */
export function arcYAtX(x: number): number {
  const clamped = Math.min(ARC_END_X, Math.max(ARC_DAY_START_X, x));
  for (const seg of ARC_SEGMENTS) {
    if (clamped <= seg[3].x + 1e-9) {
      let lo = 0;
      let hi = 1;
      for (let i = 0; i < 50; i++) {
        const mid = (lo + hi) / 2;
        if (cubicAt(seg, mid).x < clamped) lo = mid;
        else hi = mid;
      }
      return cubicAt(seg, (lo + hi) / 2).y;
    }
  }
  return ARC_SEGMENTS[ARC_SEGMENTS.length - 1][3].y;
}

/* ------------------------------ the night tail ----------------------------- */

const TAIL_SAMPLES = 200;
const tailLengths: number[] = (() => {
  const seg = ARC_SEGMENTS[ARC_SEGMENTS.length - 1];
  const lengths: number[] = [0];
  let prev = cubicAt(seg, 0);
  for (let i = 1; i <= TAIL_SAMPLES; i++) {
    const p = cubicAt(seg, i / TAIL_SAMPLES);
    lengths.push(lengths[i - 1] + Math.hypot(p.x - prev.x, p.y - prev.y));
    prev = p;
  }
  return lengths;
})();
const TAIL_LENGTH = tailLengths[TAIL_SAMPLES];

/** A point on the night tail, at an arc-length fraction of it:
 *  0 is the valley bottom (bedtime), 1 the far lift (next wake). */
export function arcTailPointAt(s: number): Pt {
  const seg = ARC_SEGMENTS[ARC_SEGMENTS.length - 1];
  const target = Math.min(1, Math.max(0, s)) * TAIL_LENGTH;
  let i = 1;
  while (i < TAIL_SAMPLES && tailLengths[i] < target) i++;
  const before = tailLengths[i - 1];
  const span = tailLengths[i] - before;
  const local = span > 0 ? (target - before) / span : 0;
  return cubicAt(seg, (i - 1 + local) / TAIL_SAMPLES);
}

/* ------------------------------ the day frame ------------------------------ */

export interface ArcFrame {
  /** Wake time, minutes since midnight. */
  wake: number;
  /** Bedtime, minutes since midnight. */
  bed: number;
  /** The awake span, wake → bed on the wrapped clock. A bedtime
   *  stated equal to the wake time leaves no night to draw; the
   *  whole ring then reads as awake. */
  awakeSpan: number;
}

export function arcFrameOf(wakeMinutes: number, bedMinutes: number): ArcFrame {
  const span = (bedMinutes - wakeMinutes + 1440) % 1440;
  return { wake: wakeMinutes, bed: bedMinutes, awakeSpan: span === 0 ? 1440 : span };
}

/** A time's fraction of the awake span, 0 at wake and 1 at bed,
 *  on the caretaker's wrapped frame — clamped, so a moment the
 *  frame places past bedtime (a caffeine boundary behind a very
 *  long sleep) rests at the valley rather than in the night. */
export function arcAwakeFraction(minutes: number, frame: ArcFrame): number {
  const offset = (minutes - frame.wake + 1440) % 1440;
  return Math.min(1, Math.max(0, offset / frame.awakeSpan));
}

/** The arc x for an awake-span fraction: the day span runs from
 *  the path's start to the valley bottom. */
export function arcXForFraction(f: number): number {
  return ARC_DAY_START_X + f * (ARC_VALLEY_X - ARC_DAY_START_X);
}

/* --------------------------- node placement --------------------------- */

/** Spread xs (ascending) so neighbours keep at least minGap,
 *  preserving order and staying inside [lo, hi] — the evening
 *  cluster problem: last meal, wind-down and bed are an hour
 *  apart each on a path whose evening is short. Symmetric pushes,
 *  iterated; the ends are not anchored, only clamped. */
export function relaxArcXs(
  xs: readonly number[],
  minGap = 100,
  lo = ARC_DAY_START_X,
  hi = ARC_VALLEY_X,
): number[] {
  const out = [...xs];
  for (let iter = 0; iter < 200; iter++) {
    let moved = false;
    for (let i = 0; i < out.length - 1; i++) {
      const gap = out[i + 1] - out[i];
      if (gap < minGap - 1e-9) {
        const push = (minGap - gap) / 2;
        out[i] -= push;
        out[i + 1] += push;
        moved = true;
      }
    }
    for (let i = 0; i < out.length; i++) {
      out[i] = Math.min(hi, Math.max(lo, out[i]));
    }
    if (!moved) break;
  }
  return out;
}

export interface ArcAnchors {
  /** Each node's x straight from its time. */
  raw: number[];
  /** Each node's x after the minimum-gap relaxation — where the
   *  medallions actually ride. */
  placed: number[];
}

/** Anchors for a set of moments whose raw xs are already known:
 *  one relaxation over the whole set. Timed moments map time →
 *  raw x (arcAnchorsOf); a sequence moment carries the raw x
 *  arcSequenceRawX gives it — both ride the same relaxation, so
 *  a free point warped through either anchor set keeps the same
 *  neighbours. */
export function arcAnchorsFromRawXs(rawXs: readonly number[]): ArcAnchors {
  return { raw: [...rawXs], placed: relaxArcXs(rawXs) };
}

/** Anchors for a set of moment times (minutes since midnight),
 *  in the order given — the caller passes them in day order. */
export function arcAnchorsOf(minutesList: readonly number[], frame: ArcFrame): ArcAnchors {
  return arcAnchorsFromRawXs(
    minutesList.map((m) => arcXForFraction(arcAwakeFraction(m, frame))),
  );
}

/** The path's peak station — the segment joint where the sun
 *  tops out (arcYAtX(ARC_PEAK_X) is the path's highest point). */
export const ARC_PEAK_X = 360;

/** The raw x for a moment the day states in ORDER, not on the
 *  clock — the walk after the largest meal, when the plan gives
 *  that meal no time (M-199). Position conveys sequence and
 *  nothing more: the moment belongs after the midday peak and
 *  before the next timed moment, so its raw x is the midpoint
 *  of that stretch (the peak station → the next moment's raw
 *  x). When the next moment itself rides before the peak, the
 *  midpoint of its two neighbours is all the order claims. No
 *  hour is ever invented — the caption of such a node names
 *  the order ("After Lunch"), never a time. */
export function arcSequenceRawX(prevRawX: number, nextRawX: number): number {
  return nextRawX > ARC_PEAK_X ? (ARC_PEAK_X + nextRawX) / 2 : (prevRawX + nextRawX) / 2;
}

/** Map an x through the nodes' relaxation, piecewise-linearly
 *  between anchor pairs (extended by the end segments' slopes
 *  outside them), so a free point — the now marker — keeps the
 *  same neighbours it has in raw time. */
export function warpArcX(x: number, anchors: ArcAnchors): number {
  const { raw, placed } = anchors;
  if (raw.length === 0) return x;
  const segment = (i: number): number => {
    const dx = raw[i + 1] - raw[i];
    if (dx <= 0) return placed[i];
    return placed[i] + ((x - raw[i]) / dx) * (placed[i + 1] - placed[i]);
  };
  let y: number;
  if (raw.length === 1 || x <= raw[0]) {
    y = raw.length === 1 ? placed[0] + (x - raw[0]) : segment(0);
  } else if (x >= raw[raw.length - 1]) {
    y = segment(raw.length - 2);
  } else {
    let i = 0;
    while (i < raw.length - 2 && x > raw[i + 1]) i++;
    y = segment(i);
  }
  return Math.min(ARC_VALLEY_X, Math.max(ARC_DAY_START_X, y));
}

/* ------------------------------ a time's point ----------------------------- */

export interface ArcPoint extends Pt {
  /** Which span of the frame the time fell in. */
  span: "awake" | "sleep";
}

/** The arc point for a time of day. Awake times ride the day
 *  span (warped through the node anchors when given, so the
 *  marker agrees with the nodes); sleep times ride the night
 *  tail by arc length and sit in the valley. */
export function arcPointForTime(
  minutes: number,
  frame: ArcFrame,
  anchors?: ArcAnchors,
): ArcPoint {
  const offset = (minutes - frame.wake + 1440) % 1440;
  if (offset <= frame.awakeSpan) {
    const rawX = arcXForFraction(frame.awakeSpan === 0 ? 0 : offset / frame.awakeSpan);
    const x = anchors ? warpArcX(rawX, anchors) : rawX;
    return { x, y: arcYAtX(x), span: "awake" };
  }
  const sleepSpan = 1440 - frame.awakeSpan;
  const s = sleepSpan === 0 ? 0 : (offset - frame.awakeSpan) / sleepSpan;
  const p = arcTailPointAt(s);
  return { x: p.x, y: p.y, span: "sleep" };
}

/* --------------------- the now marker's label --------------------- */

/** Where the "You are here" label sits relative to its dot: a
 *  side (the way it extends from the dot) and a level — above
 *  the arc (the preview's placement), below the arc, or raised /
 *  lifted clear above the medallions when the day crowds in
 *  (M-199: at 22:13 the label, flipped left by the frame rule,
 *  struck through the Wind-down medallion and covered its
 *  glyph). */
export interface ArcNowLabelPlacement {
  side: "left" | "right";
  level: "above" | "below" | "raised" | "lifted" | "dropped";
}

/* The label's measure in arc units — the arc wrap renders the
   880-unit viewBox at roughly unit scale, and the label is
   small caps: ~112 units wide, ~12 tall. Its band sits 19..31
   units from the dot's centre (the stylesheet's own offsets:
   the dot is 13 wide, the label starts 13 past the dot's edge),
   and the lifted level raises the band by 30 more. */
const ARC_LABEL_W = 112;
const ARC_LABEL_H = 12;
const ARC_LABEL_DX = 13;
const ARC_LABEL_DY = 19;
/** The raised level lifts the band by this much; the lifted
 *  level by twice it — at the peak the frame's top edge leaves
 *  room only for the smaller lift, in the evening valley only
 *  the larger one clears the medallions. */
const ARC_LABEL_RAISE = 15;
const ARC_LABEL_LIFT = 30;
/** Past this x the label's home side is the left, so it never
 *  leaves the frame — the placement the component has always
 *  used when the arc around the marker is clear. */
const ARC_LABEL_FLIP_X = 640;

interface ArcRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** The label's rectangle on the arc for a placement. The
 *  dropped level is the exception: it centres on the marker
 *  (its side is nominal) and its height depends on the nodes
 *  around it, so it is solved by arcDroppedLabelRectOf, which
 *  needs them; this function treats a dropped placement as the
 *  centred rect at the marker's own floor and the placement
 *  search uses the solved one. */
export function arcNowLabelRectOf(marker: Pt, placement: ArcNowLabelPlacement): ArcRect {
  if (placement.level === "dropped") return arcDroppedLabelRectOf(marker, []);
  const x0 =
    placement.side === "right"
      ? marker.x + ARC_LABEL_DX
      : marker.x - ARC_LABEL_DX - ARC_LABEL_W;
  const y0 =
    placement.level === "above"
      ? marker.y - ARC_LABEL_DY - ARC_LABEL_H
      : placement.level === "below"
        ? marker.y + ARC_LABEL_DY
        : placement.level === "raised"
          ? marker.y - ARC_LABEL_DY - ARC_LABEL_H - ARC_LABEL_RAISE
          : marker.y - ARC_LABEL_DY - ARC_LABEL_H - ARC_LABEL_LIFT;
  return { x0, y0, x1: x0 + ARC_LABEL_W, y1: y0 + ARC_LABEL_H };
}

/** The dropped label's rectangle: centred on the marker
 *  (clamped inside the frame), resting on the floor beneath
 *  the deepest caption around it — the valley's floor is the
 *  one stretch of the composition that is always empty. */
export function arcDroppedLabelRectOf(marker: Pt, nodes: readonly Pt[]): ArcRect {
  const x0 = Math.min(
    Math.max(2, marker.x - ARC_LABEL_W / 2),
    ARC_VIEW_W - 2 - ARC_LABEL_W,
  );
  let floor = marker.y + 96;
  for (const node of nodes) {
    const caption = arcNodeZonesOf(node)[1]!;
    if (caption.x0 < x0 + ARC_LABEL_W && caption.x1 > x0) {
      floor = Math.max(floor, caption.y1 + 6);
    }
  }
  return { x0, y0: floor, x1: x0 + ARC_LABEL_W, y1: floor + ARC_LABEL_H };
}

/** What a label may never cover: a node's medallion (kept as
 *  its bounding square, inflated by a breath of clearance) and
 *  the caption block beneath it (104 wide, shifted a little at
 *  the frame's edges — the zone allows for both). */
function arcNodeZonesOf(node: Pt): ArcRect[] {
  return [
    { x0: node.x - 28, y0: node.y - 28, x1: node.x + 28, y1: node.y + 28 },
    { x0: node.x - 62, y0: node.y + 30, x1: node.x + 62, y1: node.y + 88 },
  ];
}

function rectOverlapArea(a: ArcRect, b: ArcRect): number {
  const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
  const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
  return w > 0 && h > 0 ? w * h : 0;
}

/** The label's total offence at a placement: the area it would
 *  cover of any node's medallion or caption, plus a heavy
 *  penalty for any part of it that leaves the frame. Zero is a
 *  clean placement. */
export function arcNowLabelOffence(
  marker: Pt,
  placement: ArcNowLabelPlacement,
  nodes: readonly Pt[],
): number {
  const rect =
    placement.level === "dropped"
      ? arcDroppedLabelRectOf(marker, nodes)
      : arcNowLabelRectOf(marker, placement);
  let offence = 0;
  for (const node of nodes) {
    for (const zone of arcNodeZonesOf(node)) offence += rectOverlapArea(rect, zone);
  }
  const outX = Math.max(0, -rect.x0) + Math.max(0, rect.x1 - ARC_VIEW_W);
  const outY = Math.max(0, -rect.y0) + Math.max(0, rect.y1 - ARC_VIEW_H);
  return offence + (outX + outY) * 10000;
}

/** The label's placement, as a rule: the home placement (the
 *  preview's side rule, above the arc) stands whenever it is
 *  clean; when the marker crowds a node, the label tries the
 *  other side, then below the arc, then raised and lifted
 *  clear above the medallions, and finally — when the marker
 *  is wedged between two evening nodes with the frame's edge
 *  behind it — dropped to the empty floor beneath the deepest
 *  caption around it. The first clean placement wins, so the
 *  label can never cover a medallion or a caption while a
 *  clean placement exists. In the pathological case where
 *  none is clean, the least-offending placement stands. */
export function arcNowLabelPlacementOf(
  marker: Pt,
  nodes: readonly Pt[],
): ArcNowLabelPlacement {
  const home: ArcNowLabelPlacement["side"] = marker.x > ARC_LABEL_FLIP_X ? "left" : "right";
  const away: ArcNowLabelPlacement["side"] = home === "left" ? "right" : "left";
  const candidates: ArcNowLabelPlacement[] = [
    { side: home, level: "above" },
    { side: away, level: "above" },
    { side: home, level: "below" },
    { side: away, level: "below" },
    { side: home, level: "raised" },
    { side: away, level: "raised" },
    { side: home, level: "lifted" },
    { side: away, level: "lifted" },
    { side: home, level: "dropped" },
  ];
  let best = candidates[0]!;
  let bestOffence = Infinity;
  for (const candidate of candidates) {
    const offence = arcNowLabelOffence(marker, candidate, nodes);
    if (offence <= 0) return candidate;
    if (offence < bestOffence) {
      best = candidate;
      bestOffence = offence;
    }
  }
  return best;
}
