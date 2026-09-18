/**
 * Bloom Story Exporter — one composition, painted twice.
 *
 * The live canvas is DOM; the export is a real 1080×1920 canvas2d render built
 * from the same element list, the same paint primitives and the same type
 * resolver. That is deliberate: screenshotting the DOM would give a blurry
 * bitmap, and `foreignObject` cannot carry `oklch()` colours or a GIPHY URL
 * without tainting the canvas. Painting it means sharp type at any size and a
 * transparent background when the story has no photo behind it.
 *
 * Every layer is painted inside its own save/restore, and a photo that fails
 * to load is skipped rather than aborting the file.
 */

import { paintBackground, type StoryBackgroundState } from "./canvas/backgrounds";
import { coverGeometry } from "./canvas/photogeom";
import { frameById, maskById } from "./canvas/masks";
import { drawShape, shapeById } from "./canvas/shapes";
import { canvasFont, drawText, resolveText } from "./canvas/typography";
import { filterById } from "./catalogs";
import { METRIC_LABELS, metricReading } from "./data/metrics";
import type { BloomStoryData, StoryElement, StoryPhotoElement } from "./types";

export const EXPORT_WIDTH = 1080;
export const EXPORT_HEIGHT = 1920;

/** The canvas scale the type presets are written against. */
const BASE_WIDTH = 390;

export interface ExportOptions {
  elements: readonly StoryElement[];
  background: StoryBackgroundState | null;
  /** Legacy preset id, used when `background` is absent. */
  backgroundId?: string | null | undefined;
  /** Base photo/video poster, when the story has one. */
  media?: { src: string | null; type: "image" | "video" | "none" } | undefined;
  filterId?: string | null | undefined;
  data?: BloomStoryData | null | undefined;
  createdAt?: string | undefined;
  /** JPEG keeps the file small; PNG keeps the edges honest. */
  format?: "jpeg" | "png" | undefined;
  quality?: number | undefined;
  /** Override the image loader — tests and SSR pass their own. */
  loadImage?: ((src: string) => Promise<HTMLImageElement>) | undefined;
  width?: number | undefined;
  height?: number | undefined;
}

export interface ExportResult {
  blob: Blob;
  url: string;
  width: number;
  height: number;
}

const imageCache = new Map<string, HTMLImageElement | null>();

function defaultLoadImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached) return Promise.resolve(cached);
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = () => {
      imageCache.set(src, null);
      reject(new Error("image failed"));
    };
    img.src = src;
  });
}

/* -------------------------------- helpers -------------------------------- */

function withRotation<T>(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  deg: number,
  scale: number,
  draw: () => T,
): T {
  ctx.save();
  ctx.translate(cx, cy);
  if (deg) ctx.rotate((deg * Math.PI) / 180);
  if (scale !== 1) ctx.scale(scale, scale);
  ctx.translate(-cx, -cy);
  const out = draw();
  ctx.restore();
  return out;
}

/**
 * Same, for layers that await (photos have to fetch first). `withRotation`
 * cannot be reused here: it would `restore()` while the callback is still
 * suspended, and the image would land on the canvas untransformed.
 */
async function withRotationAsync(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  deg: number,
  scale: number,
  draw: () => Promise<void>,
): Promise<void> {
  ctx.save();
  ctx.translate(cx, cy);
  if (deg) ctx.rotate((deg * Math.PI) / 180);
  if (scale !== 1) ctx.scale(scale, scale);
  ctx.translate(-cx, -cy);
  try {
    await draw();
  } finally {
    ctx.restore();
  }
}

/** Clip to a photo's mask, in the box's own coordinate space. */
function clipMask(
  ctx: CanvasRenderingContext2D,
  maskId: string,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const def = maskById(maskId);
  if (!def.d) {
    const radius = def.radius ?? "0px";
    const pct = Number.parseFloat(radius);
    if (Number.isFinite(pct) && pct > 0) {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, Math.min(w, h) * (pct / 100));
      ctx.clip();
    } else {
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
    }
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(w, h);
  ctx.beginPath();
  // The normalized path is in 0–1 space, so the scale above maps it exactly.
  ctx.clip(new Path2D(def.d));
  ctx.restore();
}

/** Cover-crop one image into a box, honouring zoom / pan / flip. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  box: { x: number; y: number; w: number; h: number },
  el: {
    zoom: number;
    panX: number;
    panY: number;
    flipX: boolean;
    flipY: boolean;
    fit: "cover" | "contain";
  },
): void {
  const iw = img.naturalWidth || img.width || 1;
  const ih = img.naturalHeight || img.height || 1;
  const cover = Math.max(box.w / iw, box.h / ih);
  const contain = Math.min(box.w / iw, box.h / ih);
  const scale = (el.fit === "contain" ? contain : cover) * Math.max(1, el.zoom);
  const dw = iw * scale;
  const dh = ih * scale;
  const overflowX = Math.max(0, dw - box.w);
  const overflowY = Math.max(0, dh - box.h);
  const dx = box.x + (box.w - dw) / 2 - el.panX * overflowX;
  const dy = box.y + (box.h - dh) / 2 - el.panY * overflowY;
  ctx.save();
  if (el.flipX || el.flipY) {
    ctx.translate(box.x + box.w / 2, box.y + box.h / 2);
    ctx.scale(el.flipX ? -1 : 1, el.flipY ? -1 : 1);
    ctx.translate(-(box.x + box.w / 2), -(box.y + box.h / 2));
  }
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

/* --------------------------------- photo --------------------------------- */

async function paintPhoto(
  ctx: CanvasRenderingContext2D,
  el: StoryPhotoElement,
  k: number,
  load: (src: string) => Promise<HTMLImageElement>,
): Promise<void> {
  const img = el.src ? await load(el.src).catch(() => null) : null;
  const frame = frameById(el.frame);
  const pad = frame.id === "none" || frame.id === "tape" ? 0 : frame.pad;
  const padBottom = frame.id === "none" || frame.id === "tape" ? 0 : (frame.padBottom ?? frame.pad);

  const boxW = (el.w ?? 0) * EXPORT_WIDTH;
  const boxH = (el.h ?? 0) * EXPORT_HEIGHT;
  const cx = el.x * EXPORT_WIDTH;
  const cy = el.y * EXPORT_HEIGHT;
  const x = cx - boxW / 2;
  const y = cy - boxH / 2;

  await withRotationAsync(ctx, cx, cy, el.rotation, el.scale, async () => {
    // frame chrome
    if (frame.id !== "none" && frame.id !== "tape") {
      ctx.save();
      ctx.fillStyle = el.frameColor;
      ctx.beginPath();
      if (el.mask === "circle") ctx.ellipse(cx, cy, boxW / 2, boxH / 2, 0, 0, Math.PI * 2);
      else ctx.roundRect(x, y, boxW, boxH, Math.min(boxW, boxH) * 0.03);
      ctx.fill();
      ctx.restore();
    }

    if (frame.shadow) {
      ctx.save();
      ctx.shadowColor = "rgba(8,6,16,0.38)";
      ctx.shadowBlur = 34 * k;
      ctx.shadowOffsetY = 18 * k;
      ctx.fillStyle = "rgba(0,0,0,0)";
      ctx.fillRect(x, y, boxW, boxH);
      ctx.restore();
    }

    const innerX = x + pad * boxW;
    const innerY = y + pad * boxH;
    const innerW = boxW - pad * boxW * 2;
    const innerH = boxH - pad * boxH - padBottom * boxH;
    if (innerW <= 0 || innerH <= 0) return;

    ctx.save();
    clipMask(ctx, el.mask, innerX, innerY, innerW, innerH);

    if (!img) {
      ctx.fillStyle = "rgba(148,142,168,0.16)";
      ctx.fillRect(innerX, innerY, innerW, innerH);
    } else {
      const filter = filterById(el.filterId);
      if (filter.css && filter.css !== "none") ctx.filter = filter.css;
      if (el.blurFill && el.fit === "contain") {
        ctx.save();
        ctx.filter = `blur(${28 * k}px) brightness(0.86)`;
        ctx.drawImage(
          img,
          innerX - innerW * 0.12,
          innerY - innerH * 0.12,
          innerW * 1.24,
          innerH * 1.24,
        );
        ctx.restore();
      }
      drawCover(ctx, img, { x: innerX, y: innerY, w: innerW, h: innerH }, el);
      ctx.filter = "none";

      if (filter.wash) {
        ctx.save();
        ctx.globalAlpha = filter.wash[2];
        ctx.globalCompositeOperation = filter.wash[1] as GlobalCompositeOperation;
        ctx.fillStyle = filter.wash[0];
        ctx.fillRect(innerX, innerY, innerW, innerH);
        ctx.restore();
      }
    }

    if (el.border) {
      ctx.lineWidth = el.border.width * k;
      ctx.strokeStyle = el.border.color;
      ctx.strokeRect(innerX, innerY, innerW, innerH);
    }
    ctx.restore();

    if (frame.id === "tape") {
      ctx.save();
      ctx.fillStyle = "rgba(244,239,228,0.42)";
      const tw = boxW * 0.26;
      const th = Math.max(12, boxH * 0.07);
      ctx.translate(x + boxW * 0.08 + tw / 2, y - th / 2);
      ctx.rotate((-14 * Math.PI) / 180);
      ctx.fillRect(-tw / 2, -th / 2, tw, th);
      ctx.restore();
      ctx.save();
      ctx.fillStyle = "rgba(244,239,228,0.42)";
      ctx.translate(x + boxW * 0.92 - boxW * 0.13, y + boxH + th / 2);
      ctx.rotate((-12 * Math.PI) / 180);
      ctx.fillRect(0, -th / 2, boxW * 0.26, Math.max(12, boxH * 0.07));
      ctx.restore();
    }
  });
}

/* ---------------------------------- data --------------------------------- */

function paintData(
  ctx: CanvasRenderingContext2D,
  el: Extract<StoryElement, { kind: "data" }>,
  data: BloomStoryData | null,
  k: number,
): void {
  const reading = metricReading(data, el.metric);
  const shown =
    reading ??
    (el.manualValue
      ? { value: el.manualValue, sub: METRIC_LABELS[el.metric], progress: null }
      : null);

  const boxW = (el.w ?? 0.56) * EXPORT_WIDTH;
  const boxH = (el.h ?? 0.13) * EXPORT_HEIGHT;
  const cx = el.x * EXPORT_WIDTH;
  const cy = el.y * EXPORT_HEIGHT;

  if (!shown) {
    if (el.hideWhenEmpty) return;
    ctx.save();
    ctx.strokeStyle = "rgba(244,239,228,0.28)";
    ctx.setLineDash([6 * k, 6 * k]);
    ctx.lineWidth = 1.5 * k;
    ctx.strokeRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH);
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(244,239,228,0.55)";
    ctx.font = `${12 * k}px Inter, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Nothing logged yet", cx, cy);
    ctx.restore();
    return;
  }

  const label = el.label || METRIC_LABELS[el.metric];

  withRotation(ctx, cx, cy, el.rotation, el.scale, () => {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (el.variant === "ring") {
      const r = Math.min(boxW, boxH) / 2 - 6 * k;
      const pct = shown.progress === null ? 0 : shown.progress;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.lineWidth = 6 * k;
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
      ctx.lineCap = "round";
      ctx.strokeStyle = el.accent;
      ctx.stroke();
      ctx.fillStyle = el.accent;
      ctx.font = `700 ${19 * k}px Inter, system-ui, sans-serif`;
      ctx.fillText(shown.value, cx, cy - 5 * k);
      ctx.fillStyle = "rgba(244,239,228,0.6)";
      ctx.font = `600 ${10 * k}px Inter, system-ui, sans-serif`;
      ctx.fillText(label.toUpperCase(), cx, cy + 13 * k);
      ctx.restore();
      return;
    }

    if (el.variant === "inline") {
      ctx.font = `600 ${11 * k}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = "rgba(244,239,228,0.62)";
      const prefix = el.metric !== "today" ? `${label.toUpperCase()}  ` : "";
      ctx.font = `700 ${13 * k}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = el.accent;
      ctx.fillText(`${prefix}${shown.value}`, cx, cy);
      ctx.restore();
      return;
    }

    // card / bars / list / phase share a translucent panel
    const panelX = cx - boxW / 2;
    const panelY = cy - boxH / 2;
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, boxW, boxH, 18 * k);
    ctx.fillStyle = "rgba(14,11,22,0.4)";
    ctx.fill();
    ctx.lineWidth = 1 * k;
    ctx.strokeStyle = "rgba(244,239,228,0.14)";
    ctx.stroke();

    let cursorY = panelY + 22 * k;
    ctx.font = `600 ${10 * k}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = "rgba(244,239,228,0.62)";
    ctx.fillText(label.toUpperCase(), cx, cursorY);
    cursorY += 24 * k;

    ctx.font = `700 ${(el.variant === "phase" ? 22 : 20) * k}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = el.accent;
    ctx.fillText(shown.value, cx, cursorY);
    cursorY += 20 * k;

    if (shown.sub) {
      ctx.font = `400 ${11 * k}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = "rgba(244,239,228,0.58)";
      ctx.fillText(shown.sub, cx, cursorY);
      cursorY += 18 * k;
    }

    if (shown.progress !== null) {
      const barW = boxW * 0.72;
      const barH = 5 * k;
      ctx.beginPath();
      ctx.roundRect(cx - barW / 2, cursorY, barW, barH, barH / 2);
      ctx.fillStyle = "rgba(244,239,228,0.16)";
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(
        cx - barW / 2,
        cursorY,
        Math.max(barH, barW * Math.max(0, Math.min(1, shown.progress))),
        barH,
        barH / 2,
      );
      ctx.fillStyle = el.accent;
      ctx.fill();
    }
    ctx.restore();
  });
}

/* --------------------------------- export -------------------------------- */

export async function exportStory(options: ExportOptions): Promise<ExportResult> {
  const width = options.width ?? EXPORT_WIDTH;
  const height = options.height ?? EXPORT_HEIGHT;
  const k = width / BASE_WIDTH;
  const load = options.loadImage ?? defaultLoadImage;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) throw new Error("Canvas is unavailable in this browser.");

  if (options.background) {
    await paintBackground(ctx, options.background, width, height, load);
  } else {
    ctx.fillStyle = "#0c0a14";
    ctx.fillRect(0, 0, width, height);
  }

  if (options.media?.src && options.media.type !== "none") {
    const img = await load(options.media.src).catch(() => null);
    if (img) {
      const filter = filterById(options.filterId);
      ctx.save();
      if (filter.css && filter.css !== "none") ctx.filter = filter.css;
      drawCover(
        ctx,
        img,
        { x: 0, y: 0, w: width, h: height },
        {
          zoom: 1,
          panX: 0,
          panY: 0,
          flipX: false,
          flipY: false,
          fit: "cover",
        },
      );
      ctx.filter = "none";
      if (filter.wash) {
        ctx.globalAlpha = filter.wash[2];
        ctx.globalCompositeOperation = filter.wash[1] as GlobalCompositeOperation;
        ctx.fillStyle = filter.wash[0];
        ctx.fillRect(0, 0, width, height);
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }
  }

  const ordered = [...options.elements]
    .filter((e) => e.visible !== false)
    .sort((a, b) => a.z - b.z);

  for (const el of ordered) {
    try {
      await paintElement(ctx, el, k, load, options.data ?? null, options.createdAt);
    } catch {
      /* one broken layer never costs the whole file */
    }
  }

  const format = options.format ?? "jpeg";
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(
      resolve,
      `image/${format}`,
      format === "jpeg" ? (options.quality ?? 0.94) : undefined,
    ),
  );
  if (!blob) throw new Error("The story couldn't be rendered to an image.");

  return { blob, url: URL.createObjectURL(blob), width, height };
}

async function paintElement(
  ctx: CanvasRenderingContext2D,
  el: StoryElement,
  k: number,
  load: (src: string) => Promise<HTMLImageElement>,
  data: BloomStoryData | null,
  createdAt: string | undefined,
): Promise<void> {
  const opacity = typeof el.opacity === "number" ? el.opacity / 100 : 1;

  switch (el.kind) {
    case "drawing": {
      const img = await load(el.src).catch(() => null);
      if (img) {
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.drawImage(img, 0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);
        ctx.restore();
      }
      return;
    }

    case "photo": {
      ctx.save();
      ctx.globalAlpha = opacity;
      if (el.blend) ctx.globalCompositeOperation = el.blend as GlobalCompositeOperation;
      await paintPhoto(ctx, el, k, load);
      ctx.restore();
      return;
    }

    case "shape": {
      const def = shapeById(el.shape);
      if (!def) return;
      const w = (el.w ?? 0) * EXPORT_WIDTH;
      const h = (el.h ?? 0) * EXPORT_HEIGHT;
      withRotation(ctx, el.x * EXPORT_WIDTH, el.y * EXPORT_HEIGHT, el.rotation, el.scale, () => {
        ctx.save();
        ctx.globalAlpha = opacity;
        if (el.blend) ctx.globalCompositeOperation = el.blend as GlobalCompositeOperation;
        drawShape(
          ctx,
          def,
          { x: el.x * EXPORT_WIDTH - w / 2, y: el.y * EXPORT_HEIGHT - h / 2, w, h },
          {
            fill: el.fill,
            stroke: el.stroke,
            strokeWidth: el.strokeWidth * k,
            blur: el.blur * k,
          },
        );
        ctx.restore();
      });
      return;
    }

    case "data": {
      ctx.save();
      ctx.globalAlpha = opacity;
      paintData(ctx, el, data, k);
      ctx.restore();
      return;
    }

    case "text": {
      const r = resolveText(el.preset, el.style ?? {}, k);
      withRotation(ctx, el.x * EXPORT_WIDTH, el.y * EXPORT_HEIGHT, el.rotation, el.scale, () => {
        ctx.save();
        if (el.blend) ctx.globalCompositeOperation = el.blend as GlobalCompositeOperation;
        drawText(
          ctx,
          el.text,
          r,
          { x: el.x * EXPORT_WIDTH, y: el.y * EXPORT_HEIGHT, w: r.maxWidth },
          el.align,
          el.color,
          opacity * (typeof el.opacity === "number" ? 1 : 1),
        );
        ctx.restore();
      });
      return;
    }

    case "sticker":
    case "gif": {
      const src = el.kind === "gif" ? el.src : (el.src ?? null);
      const img = src ? await load(src).catch(() => null) : null;
      if (!img) return;
      const iw = img.naturalWidth || 200;
      const ih = img.naturalHeight || 200;
      const target = el.kind === "gif" ? 200 * k : 140 * k;
      const w = Math.min(iw * k, (iw / ih) * target);
      const h = (w * ih) / iw;
      withRotation(ctx, el.x * EXPORT_WIDTH, el.y * EXPORT_HEIGHT, el.rotation, el.scale, () => {
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.drawImage(img, el.x * EXPORT_WIDTH - w / 2, el.y * EXPORT_HEIGHT - h / 2, w, h);
        ctx.restore();
      });
      return;
    }

    case "date": {
      const at = el.at ?? createdAt ?? new Date().toISOString();
      const d = new Date(at);
      const label = Number.isFinite(d.getTime())
        ? d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })
        : "";
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.font = `${canvasFont(resolveText("soft", {}, k))}`;
      ctx.fillStyle = "#f4efe4";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, el.x * EXPORT_WIDTH, el.y * EXPORT_HEIGHT);
      ctx.restore();
      return;
    }

    case "mention": {
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.font = `600 ${13 * k}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = "#EED9A4";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`@${el.handle}`, el.x * EXPORT_WIDTH, el.y * EXPORT_HEIGHT);
      ctx.restore();
      return;
    }

    default:
      // Polls, questions, sliders, countdowns and music are live-only; the
      // exported file shows the composition they sat on, not their chrome.
      return;
  }
}

/** Drop every cached image — call on sign-out or when memory is tight. */
export function clearExportCache(): void {
  imageCache.clear();
}
