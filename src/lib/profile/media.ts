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

/* ------------------------------ story video ----------------------------- */

export const MAX_VIDEO_BYTES = 60 * 1024 * 1024;
export const MAX_VIDEO_MS = 60_000;
export const ACCEPTED_VIDEO = ["video/mp4", "video/webm", "video/quicktime"];

export function validateVideoFile(file: File): string | null {
  if (!ACCEPTED_VIDEO.includes(file.type)) {
    return "That video won't play here. Try an MP4.";
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return "That video is too large. Keep it under 60 MB.";
  }
  if (file.size < 1024) {
    return "That video looks empty. Try a different file.";
  }
  return null;
}

export interface VideoProbe {
  width: number;
  height: number;
  durationMs: number;
  thumbnail: string | null;
}

/**
 * Probe a local video file: dimensions, duration, and a poster frame.
 * Revokes every object URL it creates; callers own `file` only.
 */
export function probeVideoFile(file: File): Promise<VideoProbe> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    const cleanup = () => URL.revokeObjectURL(url);
    video.onerror = () => {
      cleanup();
      reject(new MediaError("That video could not be opened."));
    };
    video.onloadedmetadata = () => {
      const width = video.videoWidth || 0;
      const height = video.videoHeight || 0;
      const durationMs = Math.round((video.duration || 0) * 1000);
      if (!width || !height || !Number.isFinite(durationMs) || durationMs < 500) {
        cleanup();
        reject(new MediaError("That video looks empty. Try a different file."));
        return;
      }
      if (durationMs > MAX_VIDEO_MS + 1500) {
        cleanup();
        reject(new MediaError("Keep videos under a minute for stories."));
        return;
      }
      // Grab a poster frame a beat into the clip.
      const captureAt = Math.min(1.2, Math.max(0.1, video.duration / 4));
      const onSeeked = () => {
        video.removeEventListener("seeked", onSeeked);
        try {
          const scale = Math.min(1, 480 / Math.max(width, height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(2, Math.round(width * scale));
          canvas.height = Math.max(2, Math.round(height * scale));
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new MediaError("Could not prepare that video.");
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbnail = canvas.toDataURL("image/jpeg", 0.7);
          cleanup();
          resolve({ width, height, durationMs, thumbnail });
        } catch (error) {
          cleanup();
          reject(error instanceof Error ? error : new MediaError("Could not prepare that video."));
        }
      };
      video.addEventListener("seeked", onSeeked);
      try {
        video.currentTime = captureAt;
      } catch {
        cleanup();
        resolve({ width, height, durationMs, thumbnail: null });
      }
      // If seeking stalls (odd codec), resolve without a thumbnail.
      window.setTimeout(() => {
        video.removeEventListener("seeked", onSeeked);
      }, 2500);
    };
    video.src = url;
  });
}

/** Duration of a local audio file, ms. Resolves 0 when unreadable. */
export function probeAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    const done = (ms: number) => {
      URL.revokeObjectURL(url);
      resolve(ms);
    };
    audio.onerror = () => done(0);
    audio.onloadedmetadata = () => {
      const ms = Math.round((audio.duration || 0) * 1000);
      done(Number.isFinite(ms) ? ms : 0);
    };
    audio.src = url;
    window.setTimeout(() => done(0), 4000);
  });
}
