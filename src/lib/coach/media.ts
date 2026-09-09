/**
 * Turning a picked file into something a vision model can read.
 *
 * Photos are decoded and redrawn onto a canvas at a bounded width, then
 * encoded as JPEG — a meal photo at 1280px is usually well under 300 KB, so
 * the edge-function payload stays small. PDFs are passed through untouched
 * (only when they fit comfortably) because they cannot be re-encoded
 * client-side.
 */

import type { CoachMedia } from "./edge";

/** Longest edge a downscaled photo may have. */
export const PHOTO_MAX_DIMENSION = 1280;

/** Bigger than this and a PDF is not sent; the coach answers from text alone. */
export const PDF_MAX_BYTES = 4 * 1024 * 1024;

export function isVisionType(type: string): boolean {
  return type.startsWith("image/") || type === "application/pdf";
}

export const VISION_MIME: Record<string, string> = {
  "image/jpeg": "image/jpeg",
  "image/png": "image/png",
  "image/webp": "image/webp",
  "image/gif": "image/gif",
  "image/heic": "image/jpeg", // HEIC decodes in most browsers to a drawable bitmap
};

/**
 * Downscale an image file to a JPEG CoachMedia. Returns null when the file
 * cannot be decoded (then the coach simply answers from words).
 */
export async function fileToPhotoMedia(file: File): Promise<CoachMedia | null> {
  const source = await readAsBitmap(file).catch(() => null);
  if (!source) return null;

  try {
    const scale = Math.min(1, PHOTO_MAX_DIMENSION / Math.max(source.width, source.height));
    const width = Math.max(1, Math.round(source.width * scale));
    const height = Math.max(1, Math.round(source.height * scale));

    const canvas = window.document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(source, 0, 0, width, height);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
    const comma = dataUrl.indexOf(",");
    if (comma < 0) return null;
    return { mediaType: "image/jpeg", dataBase64: dataUrl.slice(comma + 1) };
  } finally {
    if (typeof (source as ImageBitmap).close === "function") {
      (source as ImageBitmap).close();
    }
  }
}

async function readAsBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof window === "undefined") throw new Error("no window");
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      /* fall through to <img> decoding */
    }
  }
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image decode failed"));
    };
    image.src = url;
  });
}

/** PDF → raw base64 media, or null when it is too large to send. */
export async function fileToPdfMedia(file: File): Promise<CoachMedia | null> {
  if (file.size > PDF_MAX_BYTES) return null;
  const dataUrl = await new Promise<string | null>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
  if (!dataUrl) return null;
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return null;
  return { mediaType: "application/pdf", dataBase64: dataUrl.slice(comma + 1) };
}

/** The right conversion for any attachment the coach can look at. */
export async function fileToCoachMedia(file: File): Promise<CoachMedia | null> {
  if (file.type.startsWith("image/")) return fileToPhotoMedia(file);
  if (file.type === "application/pdf") return fileToPdfMedia(file);
  return null;
}
