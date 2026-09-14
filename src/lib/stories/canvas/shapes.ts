/**
 * Bloom Story Canvas — shapes.
 *
 * Every decorative shape is one normalized SVG path (0–100 box). The same
 * path string renders live as inline SVG and exports through `Path2D`, so a
 * composition never differs between editor and file.
 */

import { blobPath, star } from "./paths";

export type ShapeKind =
  | "rect"
  | "rounded"
  | "pill"
  | "circle"
  | "oval"
  | "arch"
  | "arch-inverted"
  | "half-moon"
  | "quarter"
  | "diamond"
  | "hexagon"
  | "triangle"
  | "ring"
  | "arc"
  | "line"
  | "rule-fade"
  | "underline-hand"
  | "squiggle"
  | "arrow-hand"
  | "bracket"
  | "corner-mark"
  | "star-4"
  | "star-5"
  | "star-8"
  | "sparkle"
  | "heart"
  | "leaf"
  | "petal"
  | "cloud"
  | "sun"
  | "moon"
  | "blob"
  | "organic"
  | "tape"
  | "torn"
  | "brush"
  | "dots-row"
  | "dots-scatter"
  | "cross"
  | "glow"
  | "vignette";

export type ShapeRender =
  /** Normalized SVG path, stretched to the box. */
  | { mode: "path" }
  /** A rounded rectangle — radius is a fraction of the box, so it never distorts. */
  | { mode: "roundRect"; radius: number }
  /** A soft radial wash. */
  | { mode: "radial" };

export interface ShapeDef {
  id: ShapeKind;
  name: string;
  group: "frame" | "line" | "symbol" | "organic" | "texture";
  /** Normalized path in a 0–100 box (empty for non-path renders). */
  d: string;
  /** Natural aspect (w/h) used when the user drops it fresh. */
  aspect: number;
  /** Drawn as a stroke rather than a fill by default. */
  stroke?: boolean;
  render: ShapeRender;
}

const PATH: ShapeRender = { mode: "path" };

/** Shapes that cannot be stretched from a normalized path without distorting. */
const RENDER_OVERRIDES: Partial<Record<ShapeKind, ShapeRender>> = {
  rounded: { mode: "roundRect", radius: 0.12 },
  pill: { mode: "roundRect", radius: 0.5 },
  glow: { mode: "radial" },
  vignette: { mode: "radial" },
};

const sparklePath =
  "M50 4 C53 30 70 47 96 50 C70 53 53 70 50 96 C47 70 30 53 4 50 C30 47 47 30 50 4 Z";

/* -------------------------------- catalog -------------------------------- */

type ShapeSeed = Omit<ShapeDef, "render">;

const SHAPE_SEEDS: ShapeSeed[] = [
  {
    id: "rect",
    name: "Rectangle",
    group: "frame",
    aspect: 1,
    d: "M0 0 H100 V100 H0 Z",
  },
  {
    id: "rounded",
    name: "Rounded",
    group: "frame",
    aspect: 1,
    d: "M12 0 H88 A12 12 0 0 1 100 12 V88 A12 12 0 0 1 88 100 H12 A12 12 0 0 1 0 88 V12 A12 12 0 0 1 12 0 Z",
  },
  {
    id: "pill",
    name: "Pill",
    group: "frame",
    aspect: 3,
    d: "M50 0 A50 50 0 0 1 50 100 A50 50 0 0 1 50 0 Z",
  },
  { id: "circle", name: "Circle", group: "frame", aspect: 1, d: "M50 0 A50 50 0 1 1 49.9 0 Z" },
  {
    id: "oval",
    name: "Oval",
    group: "frame",
    aspect: 0.72,
    d: "M50 0 A50 50 0 1 1 49.9 0 Z",
  },
  {
    id: "arch",
    name: "Arch",
    group: "frame",
    aspect: 0.66,
    d: "M0 100 V50 A50 50 0 0 1 100 50 V100 Z",
  },
  {
    id: "arch-inverted",
    name: "Arch (down)",
    group: "frame",
    aspect: 0.66,
    d: "M0 0 V50 A50 50 0 0 0 100 50 V0 Z",
  },
  {
    id: "half-moon",
    name: "Half moon",
    group: "frame",
    aspect: 2,
    d: "M0 100 A50 50 0 0 1 100 100 Z",
  },
  {
    id: "quarter",
    name: "Quarter",
    group: "frame",
    aspect: 1,
    d: "M0 0 H100 V100 A100 100 0 0 0 0 0 Z",
  },
  { id: "diamond", name: "Diamond", group: "frame", aspect: 1, d: "M50 0 L100 50 L50 100 L0 50 Z" },
  {
    id: "hexagon",
    name: "Hexagon",
    group: "frame",
    aspect: 0.9,
    d: "M50 0 L100 25 L100 75 L50 100 L0 75 L0 25 Z",
  },
  { id: "triangle", name: "Triangle", group: "frame", aspect: 1, d: "M50 0 L100 100 L0 100 Z" },
  {
    id: "ring",
    name: "Ring",
    group: "line",
    aspect: 1,
    stroke: true,
    d: "M50 3 A47 47 0 1 1 49.9 3 Z",
  },
  {
    id: "arc",
    name: "Arc",
    group: "line",
    aspect: 2,
    stroke: true,
    d: "M2 96 A48 48 0 0 1 98 96",
  },
  { id: "line", name: "Line", group: "line", aspect: 40, d: "M0 48 H100 V52 H0 Z" },
  {
    id: "rule-fade",
    name: "Fading rule",
    group: "line",
    aspect: 20,
    d: "M0 49 L100 49 L100 51 L0 51 Z",
  },
  {
    id: "underline-hand",
    name: "Underline",
    group: "line",
    aspect: 12,
    stroke: true,
    d: "M2 62 C22 46 42 74 62 56 C76 44 88 60 98 52",
  },
  {
    id: "squiggle",
    name: "Squiggle",
    group: "line",
    aspect: 8,
    stroke: true,
    d: "M2 50 C12 20 22 80 32 50 C42 20 52 80 62 50 C72 20 82 80 98 50",
  },
  {
    id: "arrow-hand",
    name: "Hand arrow",
    group: "line",
    aspect: 6,
    stroke: true,
    d: "M4 52 C30 30 62 34 84 52 M66 38 L86 52 L64 66",
  },
  {
    id: "bracket",
    name: "Bracket",
    group: "line",
    aspect: 0.5,
    stroke: true,
    d: "M70 4 L20 4 L20 96 L70 96",
  },
  {
    id: "corner-mark",
    name: "Corner mark",
    group: "line",
    aspect: 1,
    stroke: true,
    d: "M4 34 L4 4 L34 4 M66 96 L96 96 L96 66",
  },
  { id: "star-4", name: "Four-point star", group: "symbol", aspect: 1, d: star(50, 50, 50, 12, 4) },
  { id: "star-5", name: "Star", group: "symbol", aspect: 1, d: star(50, 50, 50, 21, 5) },
  { id: "star-8", name: "Sunburst", group: "symbol", aspect: 1, d: star(50, 50, 50, 30, 8) },
  { id: "sparkle", name: "Sparkle", group: "symbol", aspect: 1, d: sparklePath },
  {
    id: "heart",
    name: "Heart",
    group: "symbol",
    aspect: 1,
    d: "M50 92 C14 66 4 46 12 28 C20 10 42 10 50 28 C58 10 80 10 88 28 C96 46 86 66 50 92 Z",
  },
  {
    id: "leaf",
    name: "Leaf",
    group: "organic",
    aspect: 1,
    d: "M50 4 C86 26 96 60 50 96 C4 60 14 26 50 4 Z",
  },
  {
    id: "petal",
    name: "Petal",
    group: "organic",
    aspect: 0.6,
    d: "M50 2 C78 28 82 66 50 98 C18 66 22 28 50 2 Z",
  },
  {
    id: "cloud",
    name: "Cloud",
    group: "organic",
    aspect: 1.8,
    d: "M22 78 C6 78 2 62 12 54 C4 40 16 26 30 30 C34 14 58 10 66 24 C84 18 98 32 92 48 C102 56 98 78 80 78 Z",
  },
  {
    id: "sun",
    name: "Sun",
    group: "symbol",
    aspect: 1,
    d: star(50, 50, 50, 26, 12),
  },
  {
    id: "moon",
    name: "Crescent",
    group: "symbol",
    aspect: 1,
    d: "M62 2 A48 48 0 1 0 62 98 A38 38 0 1 1 62 2 Z",
  },
  {
    id: "blob",
    name: "Blob",
    group: "organic",
    aspect: 1,
    d: blobPath([
      [52, 3],
      [86, 18],
      [97, 52],
      [78, 88],
      [42, 97],
      [12, 78],
      [4, 42],
      [22, 12],
    ]),
  },
  {
    id: "organic",
    name: "Organic",
    group: "organic",
    aspect: 1.1,
    d: blobPath(
      [
        [48, 2],
        [78, 10],
        [96, 38],
        [90, 70],
        [62, 96],
        [28, 92],
        [6, 66],
        [10, 30],
      ],
      0.42,
    ),
  },
  {
    id: "tape",
    name: "Tape",
    group: "texture",
    aspect: 2.6,
    d: "M2 30 L98 18 L96 74 L4 84 Z",
  },
  {
    id: "torn",
    name: "Torn edge",
    group: "texture",
    aspect: 1.4,
    d: "M2 6 L98 2 L96 88 L84 82 L72 92 L58 84 L44 94 L30 84 L16 92 L4 84 Z",
  },
  {
    id: "brush",
    name: "Brush stroke",
    group: "texture",
    aspect: 6,
    d: "M4 40 C28 22 62 26 96 44 C98 52 96 60 92 62 C60 48 28 48 6 60 C2 54 2 46 4 40 Z",
  },
  {
    id: "dots-row",
    name: "Dot row",
    group: "texture",
    aspect: 10,
    d: "M10 44 A6 6 0 1 1 9.9 44 Z M36 44 A6 6 0 1 1 35.9 44 Z M62 44 A6 6 0 1 1 61.9 44 Z M88 44 A6 6 0 1 1 87.9 44 Z",
  },
  {
    id: "dots-scatter",
    name: "Dot scatter",
    group: "texture",
    aspect: 1,
    d: "M18 20 A5 5 0 1 1 17.9 20 Z M62 12 A4 4 0 1 1 61.9 12 Z M86 40 A6 6 0 1 1 85.9 40 Z M34 54 A4 4 0 1 1 33.9 54 Z M72 74 A5 5 0 1 1 71.9 74 Z M22 84 A6 6 0 1 1 21.9 84 Z M50 92 A3 3 0 1 1 49.9 92 Z",
  },
  {
    id: "cross",
    name: "Cross",
    group: "symbol",
    aspect: 1,
    d: "M42 4 H58 V42 H96 V58 H58 V96 H42 V58 H4 V42 H42 Z",
  },
  {
    id: "glow",
    name: "Glow",
    group: "texture",
    aspect: 1,
    d: "M50 0 A50 50 0 1 1 49.9 0 Z",
  },
  {
    id: "vignette",
    name: "Vignette",
    group: "texture",
    aspect: 0.5625,
    d: "M0 0 H100 V100 H0 Z",
  },
];

export const SHAPES: ShapeDef[] = SHAPE_SEEDS.map((s) => ({
  ...s,
  render: RENDER_OVERRIDES[s.id] ?? PATH,
}));

const SHAPE_BY_ID = new Map(SHAPES.map((s) => [s.id, s]));

export function shapeById(id: string | null | undefined): ShapeDef | null {
  if (!id) return null;
  return SHAPE_BY_ID.get(id as ShapeKind) ?? null;
}

export function shapesByGroup(group: ShapeDef["group"]): ShapeDef[] {
  return SHAPES.filter((s) => s.group === group);
}

export const SHAPE_GROUPS: { id: ShapeDef["group"]; label: string }[] = [
  { id: "frame", label: "Frames" },
  { id: "line", label: "Lines" },
  { id: "symbol", label: "Symbols" },
  { id: "organic", label: "Organic" },
  { id: "texture", label: "Texture" },
];

/* --------------------------------- export -------------------------------- */

export interface ShapeBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Draw one shape into a canvas at absolute pixels — the export path. */
export function drawShape(
  ctx: CanvasRenderingContext2D,
  def: ShapeDef,
  box: ShapeBox,
  style: { fill?: string | null; stroke?: string | null; strokeWidth?: number; blur?: number },
): void {
  ctx.save();
  if (style.blur && style.blur > 0) ctx.filter = `blur(${style.blur}px)`;
  const r = Math.min(box.w, box.h);

  if (def.render.mode === "radial") {
    ctx.save();
    ctx.translate(box.x + box.w / 2, box.y + box.h / 2);
    ctx.scale(Math.max(1, box.w / 2), Math.max(1, box.h / 2));
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    const color = style.fill ?? "#ffffff";
    grad.addColorStop(0, color);
    grad.addColorStop(1, transparentOf(color));
    ctx.fillStyle = grad;
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
    ctx.restore();
    return;
  }

  if (def.render.mode === "roundRect") {
    const radius = Math.min(r * def.render.radius, Math.min(box.w, box.h) / 2);
    ctx.beginPath();
    ctx.roundRect(box.x, box.y, box.w, box.h, radius);
  } else {
    const path = new Path2D(def.d);
    ctx.save();
    ctx.translate(box.x, box.y);
    ctx.scale(box.w / 100, box.h / 100);
    if (style.fill) {
      ctx.fillStyle = style.fill;
      ctx.fill(path);
    }
    if (style.stroke) {
      ctx.strokeStyle = style.stroke;
      // Counter the box scale so hairlines stay the requested width.
      ctx.lineWidth = ((style.strokeWidth ?? 2) * 100) / Math.max(1, Math.min(box.w, box.h));
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke(path);
    }
    ctx.restore();
    ctx.restore();
    return;
  }

  if (style.fill) {
    ctx.fillStyle = style.fill;
    ctx.fill();
  }
  if (style.stroke) {
    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = style.strokeWidth ?? 2;
    ctx.stroke();
  }
  ctx.restore();
}

function transparentOf(color: string): string {
  if (color.startsWith("#")) {
    const hex = color.length >= 7 ? color.slice(1, 7) : color.slice(1).padEnd(6, "0");
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, 0)`;
  }
  return "rgba(255,255,255,0)";
}
