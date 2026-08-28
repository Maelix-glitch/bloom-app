/**
 * useAvatarAmbient — reads one honest hint of color from the person's own
 * photo and offers it back as an almost-subliminal hero atmosphere
 * (max ~8% opacity). Cross-origin or decode failures fall back silently.
 */

import { useEffect, useState } from "react";

const cache = new Map<string, string | null>();

/** Returns an `rgb(r g b / 0.08)` css color, or null. */
export function sampleDominantTint(src: string): Promise<string | null> {
  if (cache.has(src)) return Promise.resolve(cache.get(src) ?? null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = 10;
        c.height = 10;
        const ctx = c.getContext("2d");
        if (!ctx) throw new Error("no ctx");
        ctx.drawImage(img, 0, 0, 10, 10);
        const data = ctx.getImageData(0, 0, 10, 10).data;
        let r = 0;
        let g = 0;
        let b = 0;
        let n = 0;
        for (let i = 0; i < data.length; i += 4) {
          // bias toward mid-tones: extremes say little about atmosphere
          const lum = data[i]! * 0.299 + data[i + 1]! * 0.587 + data[i + 2]! * 0.114;
          if (lum < 18 || lum > 238) continue;
          r += data[i]!;
          g += data[i + 1]!;
          b += data[i + 2]!;
          n++;
        }
        if (n < 6) throw new Error("too flat");
        // lift saturation a touch so the hint survives at 8%
        const avg = { r: r / n, g: g / n, b: b / n };
        const max = Math.max(avg.r, avg.g, avg.b);
        const min = Math.min(avg.r, avg.g, avg.b);
        const mid = (max + min) / 2;
        const boost = 1.35;
        const ch = (v: number) => Math.max(0, Math.min(255, Math.round(mid + (v - mid) * boost)));
        const value = `rgb(${ch(avg.r)} ${ch(avg.g)} ${ch(avg.b)} / 0.08)`;
        cache.set(src, value);
        resolve(value);
      } catch {
        cache.set(src, null);
        resolve(null);
      }
    };
    img.onerror = () => {
      cache.set(src, null);
      resolve(null);
    };
    img.src = src;
  });
}

export function useAvatarAmbient(src: string | null): string | null {
  const [tint, setTint] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    if (!src) {
      setTint(null);
      return;
    }
    void sampleDominantTint(src).then((value) => alive && setTint(value));
    return () => {
      alive = false;
    };
  }, [src]);
  return tint;
}
