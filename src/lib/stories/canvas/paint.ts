/**
 * Bloom Story Canvas — paint primitives.
 *
 * One structured description of a gradient that can be rendered two ways
 * without drift: as a CSS string (live canvas, DOM) and as real canvas2d
 * paint (1080×1920 export). Templates, backgrounds and shapes all speak
 * this language, so a composition looks identical everywhere.
 */

export type PaintStop = readonly [number, string];

export type Paint =
  | { type: "solid"; color: string }
  | {
      type: "linear";
      /** CSS-style degrees: 0 = to top, 90 = to right. */
      angle: number;
      stops: readonly PaintStop[];
    }
  | {
      type: "radial";
      /** Center as a fraction of the box. */
      cx: number;
      cy: number;
      /** Radii as fractions of width / height. */
      rx: number;
      ry: number;
      stops: readonly PaintStop[];
    }
  | { type: "layers"; layers: readonly Paint[] };

/* --------------------------------- build -------------------------------- */

const solid = (color: string): Paint => ({ type: "solid", color });

const linear = (angle: number, stops: readonly PaintStop[]): Paint => ({
  type: "linear",
  angle,
  stops,
});

const radial = (
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  stops: readonly PaintStop[],
): Paint => ({ type: "radial", cx, cy, rx, ry, stops });

/**
 * A soft "aurora" field: two or three large radial washes over a base.
 * Used by Bloom's own preset backgrounds so nothing looks like a flat fill.
 */
const aurora = (
  base: string,
  washes: readonly { cx: number; cy: number; r: number; color: string; end?: string }[],
): Paint => ({
  type: "layers",
  layers: [
    solid(base),
    ...washes.map((w) =>
      radial(w.cx, w.cy, w.r, w.r, [
        [0, w.color],
        [100, w.end ?? "rgba(0,0,0,0)"],
      ]),
    ),
  ],
});

/* --------------------------------- to CSS -------------------------------- */

function stopCss(stops: readonly PaintStop[]): string {
  const sorted = [...stops].sort((a, b) => a[0] - b[0]);
  return sorted.map(([at, color]) => `${color} ${Math.round(at)}%`).join(", ");
}

/** The CSS `background-image` value for one paint node. */
export function paintCss(paint: Paint): string {
  switch (paint.type) {
    case "solid":
      return paint.color;
    case "linear":
      return `linear-gradient(${Math.round(paint.angle)}deg, ${stopCss(paint.stops)})`;
    case "radial": {
      const cx = Math.round(paint.cx * 100);
      const cy = Math.round(paint.cy * 100);
      return `radial-gradient(${Math.round(paint.rx * 100)}% ${Math.round(paint.ry * 100)}% at ${cx}% ${cy}%, ${stopCss(paint.stops)})`;
    }
    case "layers": {
      const images = paint.layers.filter((l) => l.type !== "solid").map(paintCss);
      const base = paint.layers.find((l) => l.type === "solid");
      if (base && base.type === "solid") return base.color;
      return images.length > 0 ? images[0]! : "transparent";
    }
  }
}

/**
 * The two colors at the ends of any paint — what a swatch row shows and what
 * the "build your own gradient" editor seeds from. Aurora layers collapse to
 * their first and last wash colors so the picker still has something to grab.
 */
export function paintEdges(paint: Paint): { from: string; to: string } {
  switch (paint.type) {
    case "solid":
      return { from: paint.color, to: paint.color };
    case "linear":
    case "radial": {
      const sorted = [...paint.stops].sort((a, b) => a[0] - b[0]);
      return {
        from: sorted[0]?.[1] ?? "#221D33",
        to: sorted[sorted.length - 1]?.[1] ?? "#14111D",
      };
    }
    case "layers": {
      const base = paint.layers.find((l) => l.type === "solid");
      const washes = paint.layers.filter((l) => l.type !== "solid");
      const first = washes[0] ? paintEdges(washes[0]).from : null;
      const last = washes.length > 0 ? paintEdges(washes[washes.length - 1]!).from : null;
      return {
        from: first ?? (base && base.type === "solid" ? base.color : "#221D33"),
        to: last ?? (base && base.type === "solid" ? base.color : "#14111D"),
      };
    }
  }
}

/** Everything needed to set a background in one style object. */
export function paintStyle(paint: Paint): { background: string; backgroundImage?: string } {
  if (paint.type === "layers") {
    const images = paint.layers.filter((l) => l.type !== "solid").map(paintCss);
    const base = paint.layers.find((l) => l.type === "solid");
    return {
      background: base && base.type === "solid" ? base.color : "#0c0a14",
      ...(images.length > 0 ? { backgroundImage: images.join(", ") } : {}),
    };
  }
  return { background: paintCss(paint) };
}

/* ------------------------------- to canvas ------------------------------- */

/**
 * Paint a node into a canvas2d context over the given box.
 * Radial gradients may be elliptical — handled with a temporary scale so the
 * exported image matches the CSS render.
 */
export function paintCanvas(
  ctx: CanvasRenderingContext2D,
  paint: Paint,
  w: number,
  h: number,
): void {
  switch (paint.type) {
    case "solid": {
      ctx.fillStyle = paint.color;
      ctx.fillRect(0, 0, w, h);
      return;
    }
    case "linear": {
      const rad = ((paint.angle - 90) * Math.PI) / 180;
      // Longest projection across the box keeps CSS and canvas lengths equal.
      const len = Math.abs(w * Math.cos(rad)) + Math.abs(h * Math.sin(rad));
      const cx = w / 2;
      const cy = h / 2;
      const dx = (Math.cos(rad) * len) / 2;
      const dy = (Math.sin(rad) * len) / 2;
      const grad = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
      for (const [at, color] of paint.stops) grad.addColorStop(clamp01(at / 100), color);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      return;
    }
    case "radial": {
      const cx = paint.cx * w;
      const cy = paint.cy * h;
      const rx = Math.max(1, paint.rx * w);
      const ry = Math.max(1, paint.ry * h);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(rx, ry);
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      for (const [at, color] of paint.stops) grad.addColorStop(clamp01(at / 100), color);
      ctx.fillStyle = grad;
      ctx.fillRect(-cx / rx - 1, -cy / ry - 1, w / rx + 2, h / ry + 2);
      ctx.restore();
      return;
    }
    case "layers": {
      for (const layer of paint.layers) paintCanvas(ctx, layer, w, h);
      return;
    }
  }
}

const clamp01 = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0);

export { solid, linear, radial, aurora };
