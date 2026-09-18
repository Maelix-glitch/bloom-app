/**
 * Photo crop geometry — the single source of truth for how a photo sits in
 * its slot.
 *
 * The live canvas (CSS) and the 1080×1920 exporter (canvas2d) both call
 * `coverGeometry`, so a crop you dial in with the zoom / pan controls is
 * pixel-identical in the editor and in the exported file. Two implementations
 * of "cover + zoom + pan" would drift; this is the one.
 *
 * The pan values are fractions of the *overflow* (the amount the drawn image
 * exceeds the box), so `pan = ±0.5` pushes the image exactly to its edge and
 * `pan = 0` centres it — which is the behaviour a person expects from a crop.
 */

export interface PhotoBox {
  /** Inner box size, any consistent unit (px at any scale). */
  w: number;
  h: number;
}

export interface PhotoCropInput {
  naturalWidth: number;
  naturalHeight: number;
  zoom: number;
  panX: number;
  panY: number;
  flipX: boolean;
  flipY: boolean;
  fit: "cover" | "contain";
}

export interface PhotoCropGeometry {
  /** Drawn image size, same unit as the box. */
  w: number;
  h: number;
  /** Offset of the drawn image's top-left from the box's top-left. */
  dx: number;
  dy: number;
}

/** Clamp a pan fraction to the sane −0.5..0.5 range. */
export const clampPan = (v: number): number => Math.min(0.5, Math.max(-0.5, v));

/**
 * Where does the image land inside the box?
 *
 * Pure and unit-agnostic: feed it the box in CSS pixels and you get CSS
 * pixels; feed it export pixels and you get export pixels.
 */
export function coverGeometry(box: PhotoBox, img: PhotoCropInput): PhotoCropGeometry {
  const iw = Math.max(1, img.naturalWidth);
  const ih = Math.max(1, img.naturalHeight);
  const cover = Math.max(box.w / iw, box.h / ih);
  const contain = Math.min(box.w / iw, box.h / ih);
  const scale = (img.fit === "contain" ? contain : cover) * Math.max(1, img.zoom);

  const dw = iw * scale;
  const dh = ih * scale;

  const overflowX = Math.max(0, dw - box.w);
  const overflowY = Math.max(0, dh - box.h);

  const dx = (box.w - dw) / 2 - clampPan(img.panX) * overflowX;
  const dy = (box.h - dh) / 2 - clampPan(img.panY) * overflowY;

  return { w: dw, h: dh, dx, dy };
}

/**
 * The same geometry as CSS percentages of the box, for absolute positioning.
 * The DOM renderer uses these directly so it cannot invent its own math.
 */
export function coverGeometryPercent(
  box: PhotoBox,
  img: PhotoCropInput,
): { left: number; top: number; width: number; height: number } {
  const g = coverGeometry(box, img);
  return {
    left: (g.dx / box.w) * 100,
    top: (g.dy / box.h) * 100,
    width: (g.w / box.w) * 100,
    height: (g.h / box.h) * 100,
  };
}
