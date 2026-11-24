/**
 * Bloom — media processing for avatars and story photos.
 * All cropping happens locally on a canvas; exactly one optimized file per
 * save is uploaded to the `profile-media` bucket (namespaced by user id).
 */

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const AVATAR_OUTPUT = 512;
/** Decode bombs are the failure a byte cap cannot see: a small file can
 *  still claim enormous dimensions and exhaust a phone decoding it. */
export const MAX_IMAGE_EDGE = 8192;
export const MAX_IMAGE_PIXELS = 40_000_000;

const ACCEPTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

const DECORATIVE_QUALITY = 0.86;

export class MediaError extends Error {}

/** Validate the raw file before we read anything from it. */
export function validateImageFile(file: File): string | null {
  /* Some Android pickers hand back an empty MIME type for a perfectly good
     photo; the extension is the honest fallback, and the decode that follows
     is the real gate — a file that is not an image fails there, out loud. */
  const typeOk =
    ACCEPTED_TYPES.includes(file.type) ||
    (file.type === "" && ACCEPTED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext)));
  if (!typeOk) {
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

/** Validate decoded dimensions before any canvas work happens on them. */
export function validateImageDimensions(width: number, height: number): string | null {
  if (!width || !height) {
    return "That image could not be read, the file could not be opened. Try a different file.";
  }
  if (width > MAX_IMAGE_EDGE || height > MAX_IMAGE_EDGE || width * height > MAX_IMAGE_PIXELS) {
    return "That image is extremely large, enormous in pixel terms. Pick a smaller copy of it.";
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

/**
 * Decode a picked file through an object URL — never a base64 data URL.
 *
 * The old avatar path read the whole file with `readAsDataURL` first: a
 * 10 MB photo became a ~13 MB string held in memory alongside the decoded
 * bitmap, which is exactly the jank a low-end phone feels when the editor
 * opens. An object URL is a handle, not a copy. The caller owns `url` and
 * must revoke it (on replace, cancel, or unmount); the decoded `img` stays
 * usable for canvas work after revocation in every browser Bloom targets,
 * and the story editor already loads files this way.
 *
 * The preview data URLs that remain in this module are display-only, for
 * the duration of an edit session — they are never written to the database,
 * to prefs, or to local storage. That line is load-bearing: a base64 image
 * in a data column is the egress incident's shape, and it must stay
 * impossible here.
 */
export async function loadFileImage(file: File): Promise<{ img: HTMLImageElement; url: string }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImageElement(url);
    return { img, url };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
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

/** Pure sizing plan for a story photo: capped long edge, never upscaled. */
export function storyPhotoPlan(
  naturalWidth: number,
  naturalHeight: number,
  maxEdge = 1280,
): { width: number; height: number; pixels: number } {
  const pixels = Math.max(0, naturalWidth) * Math.max(0, naturalHeight);
  const scale = Math.min(1, maxEdge / Math.max(naturalWidth, naturalHeight, 1));
  return {
    width: Math.max(1, Math.round(naturalWidth * scale)),
    height: Math.max(1, Math.round(naturalHeight * scale)),
    pixels,
  };
}

/**
 * Story photos keep their composition: portrait/landscape/square render
 * fully inside the viewer, so we only re-encode (no crop) and cap the long
 * edge at 1280px.
 *
 * The returned `dataUrl` is the PROCESSED image — the same pixels as the
 * blob. It used to be the original file's data URL (up to ~13 MB of base64
 * for a 10 MB photo), and that original is what the editor stored and the
 * viewer decoded on every open.
 */
export async function processStoryPhoto(
  file: File,
  maxEdge = 1280,
): Promise<{ blob: Blob; dataUrl: string; width: number; height: number }> {
  let source: ImageBitmap | HTMLImageElement;
  let naturalWidth: number;
  let naturalHeight: number;
  if (typeof createImageBitmap === "function") {
    // Preferred decode: bitmap decoding happens off the main thread, where
    // an <img> element's decode blocks the composer's first paint.
    source = await createImageBitmap(file).catch(() => {
      throw new MediaError("That image could not be opened.");
    });
    naturalWidth = source.width;
    naturalHeight = source.height;
  } else {
    const originalUrl = await readAsDataUrl(file);
    source = await loadImageElement(originalUrl);
    naturalWidth = source.naturalWidth;
    naturalHeight = source.naturalHeight;
  }
  const dimensionError = validateImageDimensions(naturalWidth, naturalHeight);
  if (dimensionError) throw new MediaError(dimensionError);
  const { width, height } = storyPhotoPlan(naturalWidth, naturalHeight, maxEdge);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new MediaError("Could not prepare your image.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, width, height);
  if (typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap) source.close();
  const blob = await canvasToBlob(canvas);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
  return { blob, dataUrl, width, height };
}

export function storagePathFor(userId: string, suffix: string): string {
  return `${userId}/${suffix}`;
}

/**
 * The object path for one avatar upload: versioned by save, on purpose.
 *
 * The old path was stable (`uid/avatar.jpg`), so an upsert overwrote the
 * object behind a URL that never changed — and browsers and the storage CDN
 * happily kept serving the *previous* photo from cache at that URL, which
 * read as "I changed my picture and nothing happened" lag. A fresh path per
 * upload is a fresh URL: the new picture is simply the picture, everywhere,
 * immediately. The superseded object is removed by the caller once the new
 * path is saved, so versions never pile up.
 */
export function avatarObjectPath(userId: string, stamp: number): string {
  return storagePathFor(userId, `avatar-${stamp}.jpg`);
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
