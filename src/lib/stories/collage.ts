/**
 * Recent device photos for the story landing grid.
 * The web can't list the camera roll like a native app, so Bloom keeps a
 * small on-device cache (max 1080px, JPEG) of photos already used for
 * stories. Nothing leaves the device; clearing site data clears this.
 */

export interface RecentPhoto {
  id: string;
  src: string;
  addedAt: number;
}

const KEY = "bloom.story.recent-photos.v1";
const MAX_PHOTOS = 8;
const MAX_DIM = 1080;
/** Animated GIFs are kept as-is when small, otherwise skipped. */
const GIF_KEEP_BYTES = 700_000;

function read(): RecentPhoto[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentPhoto[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p) =>
        p &&
        typeof p.id === "string" &&
        typeof p.src === "string" &&
        p.src.startsWith("data:image/"),
    );
  } catch {
    return [];
  }
}

function write(list: RecentPhoto[]): boolean {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_PHOTOS)));
    return true;
  } catch {
    return false;
  }
}

function downscale(dataUrl: string, maxDim: number): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || 0;
      const h = img.naturalHeight || 0;
      if (!w || !h) {
        resolve(null);
        return;
      }
      const scale = Math.min(1, maxDim / Math.max(w, h));
      // Already small enough — keep the original bytes.
      if (scale >= 1 && dataUrl.length < 900_000) {
        resolve(dataUrl);
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(w * scale));
      canvas.height = Math.max(1, Math.round(h * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      try {
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

async function add(dataUrl: string): Promise<RecentPhoto[] | null> {
  if (typeof window === "undefined") return null;
  const current = read();
  let src: string | null = null;
  if (dataUrl.startsWith("data:image/gif")) {
    // Never re-encode animation; keep small GIFs, skip large ones.
    src = dataUrl.length < GIF_KEEP_BYTES ? dataUrl : null;
    if (!src) return current;
  } else {
    src = await downscale(dataUrl, MAX_DIM);
    if (!src) return null;
  }
  const entry: RecentPhoto = {
    id: `photo:${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`,
    src,
    addedAt: Date.now(),
  };
  const next = [entry, ...current].slice(0, MAX_PHOTOS);
  if (write(next)) return next;
  // Quota pressure: drop the oldest and retry once.
  const trimmed = [entry, ...current].slice(0, Math.max(1, MAX_PHOTOS - 2));
  return write(trimmed) ? trimmed : null;
}

function clear(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export const recentPhotosStore = {
  read,
  add,
  clear,
  MAX_PHOTOS,
};