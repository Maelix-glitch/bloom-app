/**
 * Water the Bloom — the scene painter (Brief v7 WATER slice).
 *
 * A custom-painted canvas scene, drawn only for Bloom: a glass vase of
 * water on the plan page, and the Bloom flower opening as the day's
 * water rises toward its target. No SVG, no icon font, no stock widget
 * — every shape below is a bezier path painted for this one surface,
 * lit from the top-left in the house palette (cream, gold, sage on ink).
 *
 * The painter owns no data. The component hands it a progress (drunk ÷
 * target) and it animates the level, the bloom, and — when the progress
 * rises — a pour. Motion discipline: a single rAF loop, paused when
 * the scene is offscreen or the tab hidden; under prefers-reduced-
 * motion there is no loop and no pour, only a still frame per state.
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

/* --------------------------------- scene -------------------------------- */

interface Ripple {
  born: number;
  delay: number;
}
interface Droplet {
  born: number;
  vx: number;
  vy: number;
}
interface Bubble {
  fx: number;
  fy: number;
  r: number;
  sp: number;
}

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
  let phase = 0;
  let pourStart = -1;
  let ripples: Ripple[] = [];
  let droplets: Droplet[] = [];
  const bubbles: Bubble[] = Array.from({ length: 12 }, (_, i) => ({
    fx: -0.78 + (i % 6) * 0.31 + (i > 5 ? 0.12 : 0),
    fy: (i * 0.37) % 1,
    r: 0.8 + ((i * 7) % 10) / 7,
    sp: 0.018 + ((i * 13) % 10) / 420,
  }));

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2.5, window.devicePixelRatio || 1);
    const nw = Math.max(0, Math.round(rect.width));
    const nh = Math.max(0, Math.round(rect.height));
    if (nw === w && nh === h && canvas.width === Math.round(nw * dpr)) return;
    w = nw;
    h = nh;
    canvas.width = Math.round(nw * dpr);
    canvas.height = Math.round(nh * dpr);
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (reduced) draw(0);
  }

  /* ------------------------------ painting ------------------------------ */

  function draw(now: number) {
    if (!ctx || w < 24 || h < 24) return;
    const v = vaseOf(w, h);
    const { cx, rimY, baseY } = v;
    const t = now / 1000;
    const sway = reduced ? 0 : Math.sin(t * 0.55) * 2.1;
    const headX = cx + sway + w * 0.012;
    const headY = h * 0.2 - bloom * h * 0.014;
    const innerTop = rimY + h * 0.035;
    const innerBottom = baseY - h * 0.012;
    const surfaceY = innerBottom - level * (innerBottom - innerTop);
    const vase = vasePath(v, h);

    ctx.clearRect(0, 0, w, h);

    /* warm light, top-left, over everything the light would touch */
    const light = ctx.createRadialGradient(w * 0.2, h * 0.06, 4, w * 0.2, h * 0.06, w * 0.95);
    light.addColorStop(0, rgba(GOLD_BRIGHT, 0.13));
    light.addColorStop(1, rgba(GOLD_BRIGHT, 0));
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, w, h);

    /* the ground shadow the vase stands on */
    const shadow = ctx.createRadialGradient(cx, baseY + 5, 2, cx, baseY + 5, v.wide * 1.25);
    shadow.addColorStop(0, "rgba(0, 0, 0, 0.42)");
    shadow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.save();
    ctx.translate(cx, baseY + 5);
    ctx.scale(1, 0.16);
    ctx.translate(-cx, -(baseY + 5));
    ctx.fillStyle = shadow;
    ctx.fillRect(cx - v.wide * 1.3, baseY - v.wide, v.wide * 2.6, v.wide * 2);
    ctx.restore();

    /* stem — one curve from the flower head to the vase floor; the
       water and glass painted over its lower run give it depth. */
    const stemCtrl = { x: cx + w * 0.055, y: h * 0.52 };
    const stemBase = { x: cx, y: baseY - h * 0.02 };
    const stemGrad = ctx.createLinearGradient(0, headY, 0, baseY);
    stemGrad.addColorStop(0, rgba(SAGE, 0.95));
    stemGrad.addColorStop(1, rgba(SAGE_DEEP, 0.95));
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

    /* water — clipped to the vessel, wavy at the surface */
    if (level > 0.008) {
      ctx.save();
      ctx.clip(vase);
      const wave = (x: number) =>
        surfaceY +
        Math.sin(x * 0.045 + phase * 1.35) * 1.5 +
        Math.sin(x * 0.021 - phase * 0.8) * 1.1;
      const waterGrad = ctx.createLinearGradient(0, surfaceY, 0, baseY);
      waterGrad.addColorStop(0, rgba(WATER_TOP, 0.92));
      waterGrad.addColorStop(0.35, rgba(WATER_MID, 0.94));
      waterGrad.addColorStop(1, rgba(WATER_DEEP, 0.97));
      ctx.beginPath();
      ctx.moveTo(cx - v.wide - 14, baseY + 2);
      ctx.lineTo(cx - v.wide - 14, wave(cx - v.wide - 14));
      for (let x = cx - v.wide - 14; x <= cx + v.wide + 14; x += 6) ctx.lineTo(x, wave(x));
      ctx.lineTo(cx + v.wide + 14, baseY + 2);
      ctx.closePath();
      ctx.fillStyle = waterGrad;
      ctx.fill();

      /* refraction band: the light bending where water meets glass */
      const band = ctx.createLinearGradient(0, surfaceY, 0, surfaceY + h * 0.05);
      band.addColorStop(0, rgba(GOLD_BRIGHT, 0.13));
      band.addColorStop(1, rgba(GOLD_BRIGHT, 0));
      ctx.fillStyle = band;
      ctx.fillRect(cx - v.wide - 14, surfaceY, v.wide * 2 + 28, h * 0.05);

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

      /* micro-bubbles, rising through the depth */
      ctx.fillStyle = rgba(CREAM, 0.28);
      for (const b of bubbles) {
        const by = surfaceY + 6 + b.fy * (baseY - surfaceY - 12);
        if (by < surfaceY + 4 || by > baseY - 3) continue;
        const bx = cx + b.fx * v.wide * 0.82 + Math.sin(phase * 0.9 + b.fy * 9) * 1.6;
        ctx.beginPath();
        ctx.arc(bx, by, b.r, 0, Math.PI * 2);
        ctx.fill();
      }

      /* pour ripples on the surface */
      for (const r of ripples) {
        const rt = (now - r.born - r.delay) / 850;
        if (rt < 0 || rt > 1) continue;
        const rx = 5 + easeOut(rt) * v.wide * 0.85;
        ctx.beginPath();
        ctx.ellipse(cx, surfaceY + Math.sin(cx * 0.045 + phase * 1.35) * 1.5, rx, rx * 0.17, 0, 0, Math.PI * 2);
        ctx.strokeStyle = rgba(CREAM, (1 - rt) * 0.45);
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      ctx.restore();
    }

    /* the pour itself — a thin falling stream, splash droplets */
    if (!reduced && pourStart > 0 && now - pourStart < 780) {
      const pt = (now - pourStart) / 780;
      const streamTop = rimY - h * 0.17;
      const streamX = cx + Math.sin(now * 0.02) * 0.8;
      const streamGrad = ctx.createLinearGradient(0, streamTop, 0, surfaceY);
      streamGrad.addColorStop(0, rgba(WATER_TOP, 0));
      streamGrad.addColorStop(0.45, rgba(WATER_TOP, 0.75 * (1 - pt * 0.5)));
      streamGrad.addColorStop(1, rgba(WATER_TOP, 0.9 * (1 - pt * 0.5)));
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
      for (const d of droplets) {
        const dt = (now - d.born) / 1000;
        if (dt < 0 || dt > 0.55) continue;
        const dx = cx + d.vx * dt;
        const dy = surfaceY - 2 + d.vy * dt + 170 * dt * dt;
        ctx.beginPath();
        ctx.arc(dx, dy, 1.6, 0, Math.PI * 2);
        ctx.fillStyle = rgba(WATER_TOP, (1 - dt / 0.55) * 0.75);
        ctx.fill();
      }
    }

    /* glass over the water: body sheen, edge, the lit left streak, rim */
    const glass = ctx.createLinearGradient(0, rimY, 0, baseY);
    glass.addColorStop(0, rgba(CREAM, 0.075));
    glass.addColorStop(0.5, rgba(CREAM, 0.028));
    glass.addColorStop(1, rgba(CREAM, 0.05));
    ctx.fillStyle = glass;
    ctx.fill(vase);
    ctx.strokeStyle = rgba(CREAM, 0.34);
    ctx.lineWidth = 1.3;
    ctx.stroke(vase);

    ctx.save();
    ctx.clip(vase);
    const streak = ctx.createLinearGradient(cx - v.wide, 0, cx - v.wide * 0.45, 0);
    streak.addColorStop(0, rgba(WHITE, 0));
    streak.addColorStop(0.5, rgba(WHITE, 0.1));
    streak.addColorStop(1, rgba(WHITE, 0));
    ctx.fillStyle = streak;
    ctx.beginPath();
    ctx.moveTo(cx - v.wide * 0.82, rimY + h * 0.06);
    ctx.quadraticCurveTo(cx - v.wide * 0.66, (rimY + baseY) / 2, cx - v.wide * 0.8, baseY - h * 0.03);
    ctx.lineTo(cx - v.wide * 0.58, baseY - h * 0.03);
    ctx.quadraticCurveTo(cx - v.wide * 0.44, (rimY + baseY) / 2, cx - v.wide * 0.6, rimY + h * 0.06);
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

    /* the flower head — eight petals, painted one by one */
    const glowR = w * 0.3;
    const glow = ctx.createRadialGradient(headX, headY, 2, headX, headY, glowR);
    glow.addColorStop(0, rgba(GOLD, 0.08 + 0.13 * bloom));
    glow.addColorStop(1, rgba(GOLD, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(headX - glowR, headY - glowR, glowR * 2, glowR * 2);

    const open = easeOut(bloom);
    const warmth = clamp01((bloom - 0.85) / 0.15);
    const petalLen = w * (0.095 + 0.088 * open);
    const petalWid = w * (0.042 + 0.04 * open);
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
    ctx.shadowBlur = 13;
    ctx.shadowOffsetY = 5;
    for (let i = 0; i < 8; i += 1) {
      const radial = -Math.PI / 2 + (i * Math.PI) / 4;
      const closed = radial + (-Math.PI / 2 - radial) * (1 - open) * 0.82;
      ctx.save();
      ctx.translate(headX, headY);
      ctx.rotate(closed + (reduced ? 0 : Math.sin(t * 0.55) * 0.012));
      const g = ctx.createRadialGradient(0, -petalLen * 0.1, 1, 0, -petalLen * 0.45, petalLen * 1.05);
      g.addColorStop(0, rgba(CREAM, 1));
      g.addColorStop(0.45, rgba(mix(GOLD_SOFT, GOLD_BRIGHT, warmth), 1));
      g.addColorStop(0.8, rgba(GOLD, 1));
      g.addColorStop(1, rgba(GOLD_EDGE, 1));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-petalWid, -petalLen * 0.34, -petalWid * 0.7, -petalLen * 0.8, 0, -petalLen);
      ctx.bezierCurveTo(petalWid * 0.7, -petalLen * 0.8, petalWid, -petalLen * 0.34, 0, 0);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    /* the heart of the flower */
    const coreR = w * (0.026 + 0.009 * open);
    const core = ctx.createRadialGradient(headX - coreR * 0.3, headY - coreR * 0.3, 0.5, headX, headY, coreR);
    core.addColorStop(0, rgba(GOLD_BRIGHT, 1));
    core.addColorStop(0.7, rgba(GOLD, 1));
    core.addColorStop(1, rgba(GOLD_EDGE, 1));
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

  function frame(now: number) {
    if (!running) return;
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;
    phase += dt;
    /* the level settles in about a breath; the bloom grows after it */
    level += (target - level) * Math.min(1, dt * 3.4);
    bloom += (target - bloom) * Math.min(1, dt * 1.7);
    if (Math.abs(target - level) < 0.0005) level = target;
    if (Math.abs(target - bloom) < 0.0005) bloom = target;
    for (const b of bubbles) {
      b.fy -= b.sp * dt * 10;
      if (b.fy < 0) {
        b.fy = 1;
        b.fx = -0.8 + Math.random() * 1.6;
      }
    }
    draw(now);
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
    draw(0);
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
        draw(0);
        return;
      }
      /* The first value is the day as it already stands — the level
         rises to meet it, but nothing pours; a pour is for a log. */
      if (rose && running && seenFirst) {
        const now = performance.now();
        pourStart = now;
        ripples = [0, 130, 260].map((delay) => ({ born: now, delay }));
        droplets = [-16, 2, 17].map((vx, i) => ({
          born: now + i * 40,
          vx,
          vy: -52 - i * 9,
        }));
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
