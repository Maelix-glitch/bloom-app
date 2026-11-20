import * as THREE from "three";

/**
 * Bloom's petal surface — an original parametric petal, written for
 * Water the Bloom's 3D flower (M-163).
 *
 * A petal is a small grid (SEG_L × SEG_W) grown from a spine curve:
 * the spine leaves the base at `tilt` and bends further by `curve`
 * toward the tip; across the width, the surface cups upward at the
 * edges, creases gently along the mid-rib, and ripples a little at
 * the rim. `open` (0 closed → 1 open) interpolates tilt and curve
 * between their closed and open values, so a petal unfurls rather
 * than rotates as a rigid card.
 *
 * Colour is baked into the vertices once: petals are the house cream,
 * warmed toward gold-soft at the throat, with the faintest rose at
 * the tip's edge; leaves are sage, deeper at the base. Lighting does
 * the rest — one warm key, no tricks.
 */

export interface PetalShape {
  /** Length and half-width, in scene units. */
  length: number;
  width: number;
  /** Spine angle from vertical at the base, closed → open (rad). */
  tilt: readonly [number, number];
  /** Extra bend toward the tip, closed → open (rad). */
  curve: readonly [number, number];
  /** How strongly the edges lift (cupping), 0..1-ish. */
  cup: number;
  /** Depth of the mid-rib crease, 0..1-ish. */
  fold: number;
  /** Edge ripple amplitude, 0..1-ish. */
  ripple: number;
  /** This petal's own phase, for ripple and breathing. */
  phase: number;
}

const SEG_L = 14;
const SEG_W = 10;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};

type Tint = "petal" | "leaf";

const CREAM = new THREE.Color(0xece8e1);
const GOLD_SOFT = new THREE.Color(0xf2e4c6);
const ROSE = new THREE.Color(0xe3919f);
const SAGE = new THREE.Color(0x8fc7a2);
const SAGE_DEEP = new THREE.Color(0x3a7454);

function tintAt(tint: Tint, u: number, v: number, out: THREE.Color) {
  if (tint === "leaf") {
    out.copy(SAGE_DEEP).lerp(SAGE, 0.35 + 0.65 * u);
    return;
  }
  out.copy(CREAM);
  /* the throat warms toward gold-soft near the base */
  out.lerp(GOLD_SOFT, 0.4 * (1 - smooth(u / 0.3)));
  /* the faintest rose, only at the tip's outer edge */
  out.lerp(ROSE, 0.2 * smooth((u - 0.72) / 0.28) * Math.pow(Math.abs(v), 1.5));
}

/** A fresh petal geometry with its grid, indices and baked tints.
 *  Positions are written by updatePetal. */
export function createPetalGeometry(tint: Tint): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const count = (SEG_L + 1) * (SEG_W + 1);
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  const colours = new Float32Array(count * 3);
  const c = new THREE.Color();
  let k = 0;
  for (let i = 0; i <= SEG_L; i++) {
    const u = i / SEG_L;
    for (let j = 0; j <= SEG_W; j++) {
      const v = -1 + (2 * j) / SEG_W;
      tintAt(tint, u, v, c);
      colours[k++] = c.r;
      colours[k++] = c.g;
      colours[k++] = c.b;
    }
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colours, 3));
  const idx: number[] = [];
  for (let i = 0; i < SEG_L; i++) {
    for (let j = 0; j < SEG_W; j++) {
      const a = i * (SEG_W + 1) + j;
      const b = a + 1;
      const cc = a + (SEG_W + 1);
      const d = cc + 1;
      idx.push(a, cc, b, b, cc, d);
    }
  }
  geo.setIndex(idx);
  return geo;
}

/* Spine samples for one update, reused across petals. */
const spineY = new Float32Array(SEG_L + 1);
const spineR = new Float32Array(SEG_L + 1);
const spineT = new Float32Array(SEG_L + 1);

/** Half-width at u: pinched at the base, fullest just past the
 *  middle, easing into the tip. */
function widthAt(shape: PetalShape, u: number): number {
  const belly = Math.pow(Math.sin(Math.PI * Math.pow(u, 0.78)), 0.85);
  const pinch = 0.22 + 0.78 * smooth(u / 0.22);
  return shape.width * belly * pinch;
}

/** Rewrite a petal's positions for openness `open` at time `time`. */
export function updatePetal(geo: THREE.BufferGeometry, shape: PetalShape, open: number, time: number) {
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  const arr = pos.array as Float32Array;
  const o = clamp01(open);
  const tilt = lerp(shape.tilt[0], shape.tilt[1], o);
  const curve = lerp(shape.curve[0], shape.curve[1], o);
  const breathe = Math.sin(time * 0.9 + shape.phase) * 0.008 * (0.3 + o);

  /* walk the spine: each step advances along the local angle */
  let r = 0;
  let y = 0;
  const step = shape.length / SEG_L;
  for (let i = 0; i <= SEG_L; i++) {
    const u = i / SEG_L;
    const th = tilt + curve * Math.pow(u, 1.5) + breathe * u;
    spineR[i] = r;
    spineY[i] = y;
    spineT[i] = th;
    r += Math.sin(th) * step;
    y += Math.cos(th) * step;
  }

  let k = 0;
  for (let i = 0; i <= SEG_L; i++) {
    const u = i / SEG_L;
    const w = widthAt(shape, u);
    const th = spineT[i]!;
    /* in-plane normal of the spine (the petal's "up" off its surface) */
    const nR = Math.cos(th);
    const nY = -Math.sin(th);
    for (let j = 0; j <= SEG_W; j++) {
      const v = -1 + (2 * j) / SEG_W;
      const edge = Math.abs(v);
      let off = shape.cup * v * v * w;
      off -= shape.fold * (1 - edge) * (1 - edge) * w * 0.55;
      off += shape.ripple * Math.sin(u * 8 + shape.phase + v * 2.2) * Math.pow(edge, 3) * w * (0.3 + 0.7 * u);
      arr[k++] = v * w;
      arr[k++] = spineY[i]! + nY * off;
      arr[k++] = spineR[i]! + nR * off;
    }
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}
