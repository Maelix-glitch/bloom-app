/**
 * Bloom — media processing for avatars and story photos.
 * All cropping happens locally on a canvas; exactly one optimized file per
 * save is uploaded to the `profile-media` bucket (namespaced by user id).
 */

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const AVATAR_OUTPUT = 512;

const DECORATIVE_QUALITY = 0.86;

export class MediaError extends Error {}

/** Validate the raw file before we read anything from it. */
export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return "That file isn't an image we can use. Try a JPG, PNG, or WEBP.";
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return "That image is too large. Pick one under 10 MB.";
  }
  if (file.size < 100) {
    return "That image looks empty. Try a different file.";
  }
  return null;
}

export function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new MediaError("Could not read that image."));
    };
    reader.onerror = () => reject(new MediaError("Could not read that image."));
    reader.readAsDataURL(file);
  });
}

export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new MediaError("That image could not be opened."));
    img.src = src;
  });
}

export interface CropRect {
  /** Top-left offset of the crop window, in source pixels. */
  offsetX: number;
  offsetY: number;
  /** Size of the square crop window, in source pixels. */
  size: number;
}

function drawSquare(img: HTMLImageElement, crop: CropRect, output: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = output;
  canvas.height = output;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new MediaError("Could not prepare your image.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, crop.offsetX, crop.offsetY, crop.size, crop.size, 0, 0, output, output);
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new MediaError("Could not save your image."))),
      "image/jpeg",
      DECORATIVE_QUALITY,
    );
  });
}

/** Produce the final square avatar from a raw image + a crop window. */
export async function exportAvatar(
  img: HTMLImageElement,
  crop: CropRect,
): Promise<{ blob: Blob; dataUrl: string; width: number; height: number }> {
  const canvas = drawSquare(img, crop, AVATAR_OUTPUT);
  const blob = await canvasToBlob(canvas);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
  return { blob, dataUrl, width: AVATAR_OUTPUT, height: AVATAR_OUTPUT };
}

/**
 * Story photos keep their composition: portrait/landscape/square render
 * fully inside the viewer, so we only re-encode (no crop) and cap the long
 * edge at 1280px.
 */
export async function processStoryPhoto(
  file: File,
  maxEdge = 1280,
): Promise<{ blob: Blob; dataUrl: string; width: number; height: number }> {
  const dataUrl = await readAsDataUrl(file);
  const img = await loadImageElement(dataUrl);
  const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new MediaError("Could not prepare your image.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, width, height);
  const blob = await canvasToBlob(canvas);
  return { blob, dataUrl, width, height };
}

export function storagePathFor(userId: string, suffix: string): string {
  return `${userId}/${suffix}`;
}
