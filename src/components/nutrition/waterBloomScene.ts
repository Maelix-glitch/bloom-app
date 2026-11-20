/**
 * Water the Bloom — the scene painter (Brief v7 WATER slice; alive
 * pass, owner request 2026-11-20: "real water and real flower
 * animation — heavy animation, but the app should be smooth").
 *
 * A custom-painted canvas scene, drawn only for Bloom: a glass vase of
 * water on the plan page, and the Bloom flower opening as the day's
 * water rises toward its target. No SVG, no icon font, no stock widget
 * — every shape below is a bezier path painted for this one surface,
 * lit from the top-left in the house palette (cream, gold, sage on ink).
 *
 * The painter owns no data. The component hands it a progress (drunk ÷
 * target) and it animates the level, the bloom, and — when the progress
 * rises — a pour.
 *
 * Motion, calm and physical, never busy:
 * - the surface is three sine layers travelling in opposing
 *   directions at different speeds, so the water reads as flowing,
 *   not as one static wiggle redrawn;
 * - two soft caustic light blobs drift through the water body and a
 *   shimmer rides the surface, all painted from pre-rendered sprites
 *   (drawImage) — never shadowBlur, which is the slow path;
 * - bubbles spawn at the base from a preallocated pool, rise at
 *   varied speeds with a gentle wobble, and respawn at the floor;
 * - the stem sways on two slow frequencies, as if in a light
 *   current; petals open CONTINUOUSLY with progress (each petal on
 *   its own slight stagger, so the bloom breathes toward the next
 *   stage instead of snapping between four pictures), and when the
 *   stage advances the bloom eases open in a soft ~2 s bloom-in;
 * - a pour runs 1,450 ms end to end: a tapering stream, five
 *   staggered ripples, a dozen pooled droplets, and a surface slosh
 *   that settles back into the flow.
 *
 * Smooth contract (pinned by waterBloomAlive.guard.test):
 * - ONE requestAnimationFrame loop, delta-time driven — `phase` is
 *   accumulated from clamped frame deltas, so motion speed is the
 *   same at 60 Hz and 120 Hz;
 * - devicePixelRatio capped at MAX_DPR; the canvas is sized to its
 *   box only; the loop pauses offscreen (IntersectionObserver) and
 *   when the tab is hidden;
 * - no per-frame allocations in the hot loop: bubble / ripple /
 *   droplet pools are preallocated, gradients live in a small cache
 *   keyed by rounded geometry and rebuilt only when that changes
 *   (and cleared on resize), sprites are rendered once;
 * - adaptive quality: a rolling frame-time average steps the scene
 *   down (fewer bubbles → no caustics → one wave layer) before it
 *   can jank, and steps back up when headroom returns, on the
 *   deterministic thresholds below;
 * - prefers-reduced-motion: no loop, no pour — one still frame per
 *   state, exactly as before.
 */

export type BloomStage = "bud" | "opening" | "half" | "full";

/** The stage a day's progress has reached. One map for the painting
 *  and for the words the aria-label speaks, so they can never differ. */
export function bloomStageOf(progress: number): BloomStage {
  if (progress >= 0.9) return "full";
  if (progress >= 0.6) return "half";
  if (progress >= 0.25) return "opening";
  return "bud";
}

export const BLOOM_STAGE_WORDS: Record<BloomStage, string> = {
  bud: "still a bud",
  opening: "opening",
  half: "half open",
  full: "in full bloom",
};

const STAGE_INDEX: Record<BloomStage, number> = { bud: 0, opening: 1, half: 2, full: 3 };

/* ------------------------- performance contract ------------------------ */

/** devicePixelRatio cap — beyond 2 the extra pixels cost fill-rate
 *  and buy nothing at this scene's size. */
export const MAX_DPR = 2;
/** The whole pour, stream to last ripple, in milliseconds. */
export const POUR_DURATION_MS = 1450;
/** Adaptive quality levels: 0 full, 1 fewer bubbles, 2 no caustics,
 *  3 one wave layer. The scene sheds in that order. */
export const MAX_QUALITY_LEVEL = 3;
/** Rolling-average frame time above which quality steps DOWN. */
export const QUALITY_STEP_DOWN_MS = 22;
/** Rolling-average frame time below which quality may step back UP
 *  (after two consecutive good windows — hysteresis, no flapping). */
export const QUALITY_STEP_UP_MS = 12.5;
/** Bubbles alive per quality level, drawn from the one pool. */
export const BUBBLE_COUNTS: readonly number[] = [22, 12, 12, 6];
export const MAX_BUBBLES = 22;

/** The step rule, pure so it can be pinned with synthetic frame
 *  times: above the down threshold shed a level, below the up
 *  threshold regain one, between them hold. */
export function qualityForFrameTime(current: number, avgFrameMs: number): number {
  if (avgFrameMs > QUALITY_STEP_DOWN_MS) return Math.min(MAX_QUALITY_LEVEL, current + 1);
  if (avgFrameMs < QUALITY_STEP_UP_MS) return Math.max(0, current - 1);
  return current;
}

/* ------------------------------- palette ------------------------------- */

type Rgb = readonly [number, number, number];
const WHITE: Rgb = [255, 255, 255];
const CREAM: Rgb = [244, 240, 230];
const GOLD: Rgb = [220, 192, 143];
const GOLD_BRIGHT: Rgb = [246, 233, 205];
const GOLD_SOFT: Rgb = [242, 228, 198];
const GOLD_EDGE: Rgb = [199, 157, 98];
const SAGE: Rgb = [143, 199, 162];
const SAGE_DEEP: Rgb = [58, 116, 84];
const WATER_TOP: Rgb = [198, 231, 213];
const WATER_MID: Rgb = [127, 190, 160];
const WATER_DEEP: Rgb = [33, 90, 88];

const rgba = (c: Rgb, a: number) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/* ------------------------------- geometry ------------------------------ */

interface Vase {
  cx: number;
  rimY: number;
  baseY: number;
  neck: number;
  wide: number;
  foot: number;
}

function vaseOf(w: number, h: number): Vase {
  return {
    cx: w / 2,
    rimY: h * 0.46,
    baseY: h * 0.935,
    neck: w * 0.115,
    wide: w * 0.295,
    foot: w * 0.225,
  };
}

function vasePath(v: Vase, h: number): Path2D {
  const p = new Path2D();
  const { cx, rimY, baseY, neck, wide, foot } = v;
  p.moveTo(cx - neck, rimY);
  p.bezierCurveTo(cx - neck * 1.06, rimY + h * 0.07, cx - wide, rimY + h * 0.1, cx - wide, rimY + h * 0.21);
  p.bezierCurveTo(cx - wide, baseY - h * 0.1, cx - foot, baseY - h * 0.014, cx - foot, baseY);
  p.lineTo(cx + foot, baseY);
  p.bezierCurveTo(cx + foot, baseY - h * 0.014, cx + wide, baseY - h * 0.1, cx + wide, rimY + h * 0.21);
  p.bezierCurveTo(cx + wide, rimY + h * 0.1, cx + neck * 1.06, rimY + h * 0.07, cx + neck, rimY);
  p.closePath();
  return p;
}

/* -------------------------------- sprites ------------------------------ */

/* Soft radial sprites, rendered once and drawn with drawImage: the
   cheap way to fake glow and caustic light without shadowBlur. */
let softLightSprite: HTMLCanvasElement | null | undefined;
let softDarkSprite: HTMLCanvasElement | null | undefined;

function makeSprite(rgb: string): HTMLCanvasElement | null {
  try {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 128;
    const g = c.getContext("2d");
    if (!g) return null;
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, `rgba(${rgb}, 1)`);
    grad.addColorStop(1, `rgba(${rgb}, 0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    return c;
  } catch {
    return null;
  }
}

function lightSprite(): HTMLCanvasElement | null {
  if (softLightSprite === undefined) softLightSprite = makeSprite("255, 252, 240");
  return softLightSprite;
}

function darkSprite(): HTMLCanvasElement | null {
  if (softDarkSprite === undefined) softDarkSprite = makeSprite("0, 0, 0");
  return softDarkSprite;
}

/* --------------------------------- scene -------------------------------- */

interface Ripple {
  t0: number;
  active: boolean;
}
interface Droplet {
  t0: number;
  vx: number;
  vy: number;
  active: boolean;
}
interface Bubble {
  fx: number;
  depth: number; // 0 at the surface, 1 at the floor of the water column
  r: number;
  rise: number; // column-fractions per second
  wobFreq: number;
  wobPhase: number;
}

const RIPPLE_DELAYS: readonly number[] = [0, 0.13, 0.27, 0.42, 0.58];
const RIPPLE_LIFE_S = 0.8;
const STREAM_LIFE_S = 0.95;
const DROPLET_COUNT = 12;
const DROPLET_LIFE_S = 0.55;
/** Per-petal opening stagger — small, irregular on purpose, so the
 *  bloom unfurls like a flower and not like a machine. */
const PETAL_STAGGER: readonly number[] = [0, 0.04, 0.015, 0.05, 0.02, 0.045, 0.01, 0.035];
const BLOOM_IN_S = 2.2;

export interface WaterScene {
  /** Hand the scene a new progress. A rise pours (unless reduced
   *  motion, where the frame simply changes). */
  setProgress: (progress: number) => void;
  destroy: () => void;
}

export function mountWaterScene(
  canvas: HTMLCanvasElement,
  opts: { reducedMotion: boolean },
): WaterScene {
  const ctx = canvas.getContext("2d");
  const reduced = opts.reducedMotion;

  let w = 0;
  let h = 0;
  let raf = 0;
  let running = false;
  let destroyed = false;
  let inView = true;
  let last = 0;

  let target = 0;
  let level = 0;
  let bloom = 0;
  let seenFirst = false;
  /* Scene clock, in seconds, accumulated from frame deltas — every
     speed below is per-second, so 60 Hz and 120 Hz agree. */
  let phase = 0;
  let pourT0 = -10;
  let pulseT0 = -10;
  let stageIdx = 0;

  /* Adaptive quality state: a rolling window of frame times. */
  let quality = 0;
  let frameSum = 0;
  let frameCount = 0;
  let goodWindows = 0;
  const FRAME_WINDOW = 40;

  /* Deterministic respawn scatter (seeded LCG — no Math.random in
     the loop, and the scene behaves the same on every machine). */
  let seed = 987654321;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  const bubbles: Bubble[] = Array.from({ length: MAX_BUBBLES }, (_, i) => ({
    fx: -0.78 + (i % 6) * 0.31 + (i > 5 ? 0.12 : 0),
    depth: (i * 0.37) % 1,
    r: 0.8 + ((i * 7) % 10) / 7,
    rise: 0.05 + ((i * 29) % 10) * 0.013,
    wobFreq: 1.1 + ((i * 17) % 10) * 0.16,
    wobPhase: i * 1.7,
  }));
  const ripples: Ripple[] = RIPPLE_DELAYS.map(() => ({ t0: 0, active: false }));
  const droplets: Droplet[] = Array.from({ length: DROPLET_COUNT }, () => ({
    t0: 0,
    vx: 0,
    vy: 0,
    active: false,
  }));

  /* Gradient cache: gradients are rebuilt only when the rounded
     geometry they depend on changes, and cleared wholesale on
     resize. Static-per-size gradients live in plain variables. */
  const gradCache = new Map<string, CanvasGradient>();
  let lightGrad: CanvasGradient | null = null;
  let shadowGrad: CanvasGradient | null = null;
  let glassGrad: CanvasGradient | null = null;
  let streakGrad: CanvasGradient | null = null;
  let stemGrad: CanvasGradient | null = null;

  function cachedGrad(key: string, build: () => CanvasGradient): CanvasGradient {
    const hit = gradCache.get(key);
    if (hit) return hit;
    const made = build();
    if (gradCache.size > 80) gradCache.clear();
    gradCache.set(key, made);
    return made;
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
    const nw = Math.max(0, Math.round(rect.width));
    const nh = Math.max(0, Math.round(rect.height));
    if (nw === w && nh === h && canvas.width === Math.round(nw * dpr)) return;
    w = nw;
    h = nh;
    canvas.width = Math.round(nw * dpr);
    canvas.height = Math.round(nh * dpr);
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    gradCache.clear();
    lightGrad = null;
    shadowGrad = null;
    glassGrad = null;
    streakGrad = null;
    stemGrad = null;
    if (reduced) draw();
  }

  /* ------------------------------ painting ------------------------------ */

  function draw() {
    if (!ctx || w < 24 || h < 24) return;
    const v = vaseOf(w, h);
    const { cx, rimY, baseY } = v;
    const t = phase;
    /* stem sway: two slow frequencies, a light current */
    const sway = reduced ? 0 : Math.sin(t * 0.5) * 1.7 + Math.sin(t * 0.83 + 1.3) * 0.8;
    const headX = cx + sway + w * 0.012;
    const headY = h * 0.2 - bloom * h * 0.014;
    const innerTop = rimY + h * 0.035;
    const innerBottom = baseY - h * 0.012;
    const surfaceY = innerBottom - level * (innerBottom - innerTop);
    const vase = vasePath(v, h);
    const pourAge = t - pourT0;
    const slosh = !reduced && pourAge >= 0 && pourAge < 1.3 ? 1 - pourAge / 1.3 : 0;

    ctx.clearRect(0, 0, w, h);

    /* warm light, top-left, over everything the light would touch */
    if (!lightGrad) {
      lightGrad = ctx.createRadialGradient(w * 0.2, h * 0.06, 4, w * 0.2, h * 0.06, w * 0.95);
      lightGrad.addColorStop(0, rgba(GOLD_BRIGHT, 0.13));
      lightGrad.addColorStop(1, rgba(GOLD_BRIGHT, 0));
    }
    ctx.fillStyle = lightGrad;
    ctx.fillRect(0, 0, w, h);

    /* the ground shadow the vase stands on */
    if (!shadowGrad) {
      shadowGrad = ctx.createRadialGradient(cx, baseY + 5, 2, cx, baseY + 5, v.wide * 1.25);
      shadowGrad.addColorStop(0, "rgba(0, 0, 0, 0.42)");
      shadowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
    }
    ctx.save();
    ctx.translate(cx, baseY + 5);
    ctx.scale(1, 0.16);
    ctx.translate(-cx, -(baseY + 5));
    ctx.fillStyle = shadowGrad;
    ctx.fillRect(cx - v.wide * 1.3, baseY - v.wide, v.wide * 2.6, v.wide * 2);
    ctx.restore();

    /* stem — one curve from the flower head to the vase floor; the
       water and glass painted over its lower run give it depth. The
       control point rides the sway at half strength, so the whole
       stem bends, not just the head. */
    const stemCtrl = { x: cx + w * 0.055 + sway * 0.45, y: h * 0.52 };
    const stemBase = { x: cx, y: baseY - h * 0.02 };
    if (!stemGrad) {
      stemGrad = ctx.createLinearGradient(0, headY, 0, baseY);
      stemGrad.addColorStop(0, rgba(SAGE, 0.95));
      stemGrad.addColorStop(1, rgba(SAGE_DEEP, 0.95));
    }
    ctx.strokeStyle = stemGrad;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(headX, headY);
    ctx.quadraticCurveTo(stemCtrl.x, stemCtrl.y, stemBase.x, stemBase.y);
    ctx.stroke();

    /* leaves on the above-rim run of the stem */
    const stemPoint = (tt: number) => ({
      x:
        (1 - tt) * (1 - tt) * headX +
        2 * (1 - tt) * tt * stemCtrl.x +
        tt * tt * stemBase.x,
      y:
        (1 - tt) * (1 - tt) * headY +
        2 * (1 - tt) * tt * stemCtrl.y +
        tt * tt * stemBase.y,
    });
    drawLeaf(stemPoint(0.2), -Math.PI * 0.16, w * 0.145 * (0.82 + 0.25 * bloom));
    drawLeaf(stemPoint(0.33), Math.PI * 1.06, w * 0.125 * (0.82 + 0.25 * bloom));

    /* water — clipped to the vessel, flowing at the surface */
    if (level > 0.008) {
      ctx.save();
      ctx.clip(vase);
      /* three travelling layers: opposing directions, different
         wavelengths and speeds — the surface flows. The pour's
         slosh swells the amplitude, then it settles. */
      const amp = 1 + slosh * 1.7;
      const wave = (x: number) => {
        let y =
          surfaceY +
          (Math.sin(x * 0.045 - t * 1.9) * 1.15 +
            Math.sin(x * 0.021 + t * 1.15) * 0.85 +
            (quality < 3 ? Math.sin(x * 0.093 - t * 2.6) * 0.4 : 0)) *
            amp;
        if (slosh > 0) {
          const dxn = (x - cx) / 22;
          y += slosh * 1.8 * Math.exp(-dxn * dxn) * Math.cos(pourAge * 10);
        }
        return y;
      };
      const waterGrad = cachedGrad(`water:${Math.round(surfaceY)}:${Math.round(baseY)}`, () => {
        const g = ctx.createLinearGradient(0, surfaceY, 0, baseY);
        g.addColorStop(0, rgba(WATER_TOP, 0.92));
        g.addColorStop(0.35, rgba(WATER_MID, 0.94));
        g.addColorStop(1, rgba(WATER_DEEP, 0.97));
        return g;
      });
      ctx.beginPath();
      ctx.moveTo(cx - v.wide - 14, baseY + 2);
      ctx.lineTo(cx - v.wide - 14, wave(cx - v.wide - 14));
      for (let x = cx - v.wide - 14; x <= cx + v.wide + 14; x += 6) ctx.lineTo(x, wave(x));
      ctx.lineTo(cx + v.wide + 14, baseY + 2);
      ctx.closePath();
      ctx.fillStyle = waterGrad;
      ctx.fill();

      /* caustics: soft light drifting through the water body, and a
         shimmer riding the surface — sprites, not shadowBlur. The
         first thing adaptive quality sheds after bubbles. */
      const sprite = lightSprite();
      if (sprite && quality < 2 && !reduced) {
        const column = innerBottom - surfaceY;
        ctx.globalAlpha = 0.07;
        const c1x = cx + Math.sin(t * 0.13) * v.wide * 0.66;
        const c1y = surfaceY + column * (0.35 + 0.1 * Math.sin(t * 0.09 + 2));
        ctx.drawImage(sprite, c1x - v.wide * 0.75, c1y - h * 0.08, v.wide * 1.5, h * 0.16);
        ctx.globalAlpha = 0.05;
        const c2x = cx + Math.sin(t * 0.09 + 4) * v.wide * 0.8;
        const c2y = surfaceY + column * (0.62 + 0.08 * Math.cos(t * 0.11));
        ctx.drawImage(sprite, c2x - v.wide * 0.6, c2y - h * 0.06, v.wide * 1.2, h * 0.12);
        ctx.globalAlpha = 1;
      }

      /* refraction band: the light bending where water meets glass,
         breathing gently with the surface */
      const band = cachedGrad(`band:${Math.round(surfaceY)}`, () => {
        const g = ctx.createLinearGradient(0, surfaceY, 0, surfaceY + h * 0.05);
        g.addColorStop(0, rgba(GOLD_BRIGHT, 0.13));
        g.addColorStop(1, rgba(GOLD_BRIGHT, 0));
        return g;
      });
      ctx.globalAlpha = reduced ? 1 : 0.85 + 0.15 * Math.sin(t * 2.2);
      ctx.fillStyle = band;
      ctx.fillRect(cx - v.wide - 14, surfaceY, v.wide * 2 + 28, h * 0.05);
      ctx.globalAlpha = 1;

      /* the bright skin of the surface itself */
      ctx.beginPath();
      for (let x = cx - v.wide - 14; x <= cx + v.wide + 14; x += 6) {
        const y = wave(x);
        if (x === cx - v.wide - 14) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = rgba(CREAM, 0.4);
      ctx.lineWidth = 1.1;
      ctx.stroke();

      /* surface shimmer: one soft highlight travelling the skin */
      if (sprite && quality < 3 && !reduced) {
        const shx = cx + Math.sin(t * 0.21) * v.wide * 0.45;
        ctx.globalAlpha = 0.1 + 0.04 * Math.sin(t * 1.3);
        ctx.drawImage(sprite, shx - v.wide * 0.45, surfaceY - 3, v.wide * 0.9, 6);
        ctx.globalAlpha = 1;
      }

      /* bubbles from the pool: rising, wobbling, varied */
      const activeBubbles = BUBBLE_COUNTS[quality] ?? MAX_BUBBLES;
      ctx.fillStyle = rgba(CREAM, 0.28);
      for (let i = 0; i < activeBubbles; i += 1) {
        const b = bubbles[i]!;
        const by = surfaceY + 4 + b.depth * (innerBottom - surfaceY - 8);
        if (by < surfaceY + 4 || by > innerBottom - 2) continue;
        const bx = cx + b.fx * v.wide * 0.82 + Math.sin(t * b.wobFreq + b.wobPhase) * 2;
        ctx.beginPath();
        ctx.arc(bx, by, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(bx - b.r * 0.3, by - b.r * 0.3, b.r * 0.38, 0, Math.PI * 2);
        ctx.fillStyle = rgba(CREAM, 0.5);
        ctx.fill();
        ctx.fillStyle = rgba(CREAM, 0.28);
      }

      /* pour ripples on the surface, expanding and fading */
      for (const r of ripples) {
        if (!r.active) continue;
        const rt = (t - r.t0) / RIPPLE_LIFE_S;
        if (rt < 0 || rt > 1) continue;
        const rx = 5 + easeOut(rt) * v.wide * 0.85;
        ctx.beginPath();
        ctx.ellipse(cx, wave(cx), rx, rx * 0.17, 0, 0, Math.PI * 2);
        ctx.strokeStyle = rgba(CREAM, (1 - rt) * 0.45);
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      ctx.restore();
    }

    /* the pour itself — a thin falling stream that tapers in and
       out, splash droplets on pooled ballistic arcs */
    if (!reduced && pourAge >= 0 && pourAge < STREAM_LIFE_S) {
      const pt = pourAge / STREAM_LIFE_S;
      const envelope = Math.sin(Math.min(1, pt) * Math.PI);
      const streamTop = rimY - h * 0.17;
      const streamX = cx + Math.sin(t * 20) * 0.8;
      const streamGrad = cachedGrad(`stream:${Math.round(surfaceY)}:${Math.round(pt * 12)}`, () => {
        const g = ctx.createLinearGradient(0, streamTop, 0, surfaceY);
        g.addColorStop(0, rgba(WATER_TOP, 0));
        g.addColorStop(0.45, rgba(WATER_TOP, 0.75));
        g.addColorStop(1, rgba(WATER_TOP, 0.9));
        return g;
      });
      ctx.globalAlpha = envelope;
      ctx.strokeStyle = streamGrad;
      ctx.lineCap = "round";
      ctx.lineWidth = 2.3;
      ctx.beginPath();
      ctx.moveTo(streamX, streamTop);
      ctx.lineTo(streamX, surfaceY - 1);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(streamX + 1.6, streamTop + 6);
      ctx.lineTo(streamX + 1.6, surfaceY - 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (!reduced) {
      for (const d of droplets) {
        if (!d.active) continue;
        const dt = t - d.t0;
        if (dt < 0 || dt > DROPLET_LIFE_S) continue;
        const dx = cx + d.vx * dt;
        const dy = surfaceY - 2 + d.vy * dt + 170 * dt * dt;
        ctx.beginPath();
        ctx.arc(dx, dy, 1.6, 0, Math.PI * 2);
        ctx.fillStyle = rgba(WATER_TOP, (1 - dt / DROPLET_LIFE_S) * 0.75);
        ctx.fill();
      }
    }

    /* glass over the water: body sheen, edge, the lit left streak, rim */
    if (!glassGrad) {
      glassGrad = ctx.createLinearGradient(0, rimY, 0, baseY);
      glassGrad.addColorStop(0, rgba(CREAM, 0.075));
      glassGrad.addColorStop(0.5, rgba(CREAM, 0.028));
      glassGrad.addColorStop(1, rgba(CREAM, 0.05));
    }
    ctx.fillStyle = glassGrad;
    ctx.fill(vase);
    ctx.strokeStyle = rgba(CREAM, 0.34);
    ctx.lineWidth = 1.3;
    ctx.stroke(vase);

    ctx.save();
    ctx.clip(vase);
    if (!streakGrad) {
      streakGrad = ctx.createLinearGradient(cx - v.wide, 0, cx - v.wide * 0.45, 0);
      streakGrad.addColorStop(0, rgba(WHITE, 0));
      streakGrad.addColorStop(0.5, rgba(WHITE, 0.1));
      streakGrad.addColorStop(1, rgba(WHITE, 0));
    }
    ctx.fillStyle = streakGrad;
    /* the streak drifts a breath as the surface moves — the glass
       seems to refract the travelling water */
    const streakShift = reduced ? 0 : Math.sin(t * 0.9) * 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - v.wide * 0.82 + streakShift, rimY + h * 0.06);
    ctx.quadraticCurveTo(cx - v.wide * 0.66 + streakShift, (rimY + baseY) / 2, cx - v.wide * 0.8 + streakShift, baseY - h * 0.03);
    ctx.lineTo(cx - v.wide * 0.58 + streakShift, baseY - h * 0.03);
    ctx.quadraticCurveTo(cx - v.wide * 0.44 + streakShift, (rimY + baseY) / 2, cx - v.wide * 0.6 + streakShift, rimY + h * 0.06);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    ctx.ellipse(cx, rimY, v.neck, v.neck * 0.27, 0, 0, Math.PI * 2);
    ctx.strokeStyle = rgba(GOLD_BRIGHT, 0.5);
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(cx, rimY, v.neck, v.neck * 0.27, 0, Math.PI * 1.08, Math.PI * 1.62);
    ctx.strokeStyle = rgba(WHITE, 0.65);
    ctx.lineWidth = 1.6;
    ctx.stroke();

    /* the flower head — eight petals, painted one by one. The bloom
       opens continuously with progress; a stage advance adds a soft
       bloom-in swell on top. */
    const pulseAge = t - pulseT0;
    const pulse =
      !reduced && pulseAge >= 0 && pulseAge < BLOOM_IN_S
        ? Math.sin((pulseAge / BLOOM_IN_S) * Math.PI)
        : 0;
    const openRaw = clamp01(bloom + pulse * 0.055);
    const glowR = w * 0.3;
    const glow = cachedGrad(
      `glow:${Math.round(headX)}:${Math.round(headY)}:${Math.round(openRaw * 24)}`,
      () => {
        const g = ctx.createRadialGradient(headX, headY, 2, headX, headY, glowR);
        g.addColorStop(0, rgba(GOLD, 0.08 + 0.13 * bloom + pulse * 0.1));
        g.addColorStop(1, rgba(GOLD, 0));
        return g;
      },
    );
    ctx.fillStyle = glow;
    ctx.fillRect(headX - glowR, headY - glowR, glowR * 2, glowR * 2);

    /* the petals' soft shadow — a pre-rendered dark sprite under the
       head, never shadowBlur */
    const dark = darkSprite();
    const baseLen = w * (0.095 + 0.088 * easeOut(openRaw));
    if (dark) {
      ctx.globalAlpha = 0.32;
      ctx.drawImage(
        dark,
        headX - baseLen * 1.15,
        headY - baseLen * 0.55 + 6,
        baseLen * 2.3,
        baseLen * 2.3,
      );
      ctx.globalAlpha = 1;
    }

    const warmth = clamp01((bloom - 0.85) / 0.15);
    for (let i = 0; i < 8; i += 1) {
      const openI = easeOut(clamp01(openRaw * 1.15 - (PETAL_STAGGER[i] ?? 0)));
      const petalLen = w * (0.095 + 0.088 * openI);
      const petalWid = w * (0.042 + 0.04 * openI);
      const radial = -Math.PI / 2 + (i * Math.PI) / 4;
      const closed = radial + (-Math.PI / 2 - radial) * (1 - openI) * 0.82;
      ctx.save();
      ctx.translate(headX, headY);
      ctx.rotate(closed + (reduced ? 0 : Math.sin(t * 0.6 + i * 0.7) * 0.008));
      /* petal light shimmers faintly as it moves — the gradient's
         warm stop breathes with the scene clock, per petal */
      const shimmer = reduced ? 0 : 0.5 + 0.5 * Math.sin(t * 0.7 + i * 1.3);
      const g = cachedGrad(
        `petal:${Math.round(petalLen * 2)}:${Math.round(warmth * 20)}:${Math.round(shimmer * 4)}`,
        () => {
          const grad = ctx.createRadialGradient(0, -petalLen * 0.1, 1, 0, -petalLen * 0.45, petalLen * 1.05);
          grad.addColorStop(0, rgba(CREAM, 1));
          grad.addColorStop(0.45, rgba(mix(GOLD_SOFT, GOLD_BRIGHT, clamp01(warmth + shimmer * 0.25)), 1));
          grad.addColorStop(0.8, rgba(GOLD, 1));
          grad.addColorStop(1, rgba(GOLD_EDGE, 1));
          return grad;
        },
      );
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-petalWid, -petalLen * 0.34, -petalWid * 0.7, -petalLen * 0.8, 0, -petalLen);
      ctx.bezierCurveTo(petalWid * 0.7, -petalLen * 0.8, petalWid, -petalLen * 0.34, 0, 0);
      ctx.fill();
      ctx.restore();
    }

    /* the heart of the flower */
    const coreR = w * (0.026 + 0.009 * easeOut(openRaw));
    const core = cachedGrad(`core:${Math.round(coreR * 2)}:${Math.round(headX)}:${Math.round(headY)}`, () => {
      const g = ctx.createRadialGradient(headX - coreR * 0.3, headY - coreR * 0.3, 0.5, headX, headY, coreR);
      g.addColorStop(0, rgba(GOLD_BRIGHT, 1));
      g.addColorStop(0.7, rgba(GOLD, 1));
      g.addColorStop(1, rgba(GOLD_EDGE, 1));
      return g;
    });
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(headX, headY, coreR, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawLeaf(at: { x: number; y: number }, angle: number, len: number) {
    if (!ctx) return;
    const wid = len * 0.34;
    ctx.save();
    ctx.translate(at.x, at.y);
    ctx.rotate(angle);
    const g = ctx.createLinearGradient(0, 0, len, 0);
    g.addColorStop(0, rgba(SAGE, 0.95));
    g.addColorStop(1, rgba(SAGE_DEEP, 0.95));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(len * 0.5, -wid, len, 0);
    ctx.quadraticCurveTo(len * 0.5, wid, 0, 0);
    ctx.fill();
    ctx.strokeStyle = rgba(CREAM, 0.22);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(2, 0);
    ctx.lineTo(len - 3, 0);
    ctx.stroke();
    ctx.restore();
  }

  /* ------------------------------ the loop ------------------------------ */

  function trackFrame(ms: number) {
    frameSum += ms;
    frameCount += 1;
    if (frameCount < FRAME_WINDOW) return;
    const avg = frameSum / frameCount;
    frameSum = 0;
    frameCount = 0;
    const next = qualityForFrameTime(quality, avg);
    if (next > quality) {
      quality = next;
      goodWindows = 0;
    } else if (next < quality) {
      goodWindows += 1;
      if (goodWindows >= 2) {
        quality = next;
        goodWindows = 0;
      }
    } else {
      goodWindows = 0;
    }
  }

  function frame(now: number) {
    if (!running) return;
    if (last) trackFrame(Math.min(100, now - last));
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;
    phase += dt;
    /* the level settles in about a breath; the bloom grows after it */
    level += (target - level) * Math.min(1, dt * 3.4);
    bloom += (target - bloom) * Math.min(1, dt * 1.7);
    if (Math.abs(target - level) < 0.0005) level = target;
    if (Math.abs(target - bloom) < 0.0005) bloom = target;
    /* a stage advance blooms in, softly, over ~2 s */
    const idx = STAGE_INDEX[bloomStageOf(bloom)];
    if (idx > stageIdx) pulseT0 = phase;
    stageIdx = idx;
    const activeBubbles = BUBBLE_COUNTS[quality] ?? MAX_BUBBLES;
    for (let i = 0; i < activeBubbles; i += 1) {
      const b = bubbles[i]!;
      b.depth -= b.rise * dt;
      if (b.depth < 0) {
        b.depth = 1;
        b.fx = -0.8 + rnd() * 1.6;
      }
    }
    draw();
    raf = window.requestAnimationFrame(frame);
  }

  function start() {
    if (reduced || running || destroyed) return;
    running = true;
    last = 0;
    raf = window.requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    if (raf) window.cancelAnimationFrame(raf);
    raf = 0;
  }

  function syncLoop() {
    if (!reduced && inView && !document.hidden) start();
    else stop();
  }

  const onVisibility = () => syncLoop();
  document.addEventListener("visibilitychange", onVisibility);

  let io: IntersectionObserver | null = null;
  if (typeof IntersectionObserver !== "undefined") {
    io = new IntersectionObserver(
      (entries) => {
        inView = entries[0]?.isIntersecting ?? true;
        syncLoop();
      },
      { threshold: 0.05 },
    );
    io.observe(canvas);
  }

  let ro: ResizeObserver | null = null;
  if (typeof ResizeObserver !== "undefined") {
    ro = new ResizeObserver(() => resize());
    ro.observe(canvas);
  }
  resize();
  if (reduced) {
    level = target;
    bloom = target;
    draw();
  } else {
    syncLoop();
  }

  return {
    setProgress(p: number) {
      const next = clamp01(p);
      const rose = next > target + 0.002;
      target = next;
      if (reduced) {
        level = next;
        bloom = next;
        draw();
        return;
      }
      /* The first value is the day as it already stands — the level
         rises to meet it, but nothing pours; a pour is for a log. */
      if (rose && running && seenFirst) {
        pourT0 = phase;
        for (let i = 0; i < ripples.length; i += 1) {
          ripples[i]!.t0 = phase + (RIPPLE_DELAYS[i] ?? 0);
          ripples[i]!.active = true;
        }
        for (let i = 0; i < droplets.length; i += 1) {
          const d = droplets[i]!;
          d.t0 = phase + i * 0.045;
          d.vx = -18 + (i % 5) * 9 + (i > 5 ? 4 : 0);
          d.vy = -52 - (i % 4) * 11;
          d.active = true;
        }
      }
      seenFirst = true;
    },
    destroy() {
      destroyed = true;
      stop();
      io?.disconnect();
      ro?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    },
  };
}
