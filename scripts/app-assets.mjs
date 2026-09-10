/**
 * Bloom — native icon + splash generator (no @capacitor/assets needed).
 *
 * Overwrites every Capacitor placeholder with Bloom art, reading each target's
 * own dimensions so densities stay exact:
 *
 *   Android  mipmap-xxx/ic_launcher.png (+ _round)  full-bleed padded icon
 *            mipmap-xxx/ic_launcher_foreground.png  adaptive foreground
 *              (60% art, always inside the safe zone)
 *            drawable-xxx/splash.png  launch splash (36% art)
 *            ic_launcher_background color       #14151F (was white)
 *            legacy vector drawables            solid dark bg + gradient arc
 *                                               (replaces the teal Capacitor logo)
 *   iOS      AppIcon.appiconset                 1024² store icon
 *            Splash.imageset                    launch splash
 *
 * Sources: resources/icon.png + the raw icon-1024 (see app-icon-source.mjs).
 * Run:  npm run app:assets   (after `npx cap add`, or whenever the icon changes)
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodePng, encodePng, solidCanvas } from "./png.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BG = [0x14, 0x15, 0x1f];
const DARK = "#14151F";

const paddedIcon = decodePng(readFileSync(join(root, "resources/icon.png")));
const rawIcon = decodePng(readFileSync(join(root, "public/bloom/icons/icon-1024.png")));

/** Area-average downscale (RGBA), so 48px launchers don't shimmer. */
function scaleBox(src, dw, dh) {
  const out = Buffer.alloc(dw * dh * 4);
  const sx = src.w / dw;
  const sy = src.h / dh;
  for (let y = 0; y < dh; y++) {
    for (let x = 0; x < dw; x++) {
      const x0 = Math.floor(x * sx);
      const x1 = Math.min(src.w, Math.ceil((x + 1) * sx));
      const y0 = Math.floor(y * sy);
      const y1 = Math.min(src.h, Math.ceil((y + 1) * sy));
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let n = 0;
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          const p = (yy * src.w + xx) * src.ch;
          r += src.px[p];
          g += src.px[p + 1];
          b += src.px[p + 2];
          a += src.ch === 4 ? src.px[p + 3] : 255;
          n++;
        }
      }
      const o = (y * dw + x) * 4;
      out[o] = Math.round(r / n);
      out[o + 1] = Math.round(g / n);
      out[o + 2] = Math.round(b / n);
      out[o + 3] = Math.round(a / n);
    }
  }
  return { w: dw, h: dh, ch: 4, px: out };
}

/** Dark canvas + `art` centered at `frac` of the short edge. */
function compose(w, h, art, frac) {
  const canvas = solidCanvas(w, h, BG);
  const size = Math.round(Math.min(w, h) * frac);
  const small = scaleBox(art, size, size);
  const dx = Math.round((w - size) / 2);
  const dy = Math.round((h - size) / 2);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sp = (y * size + x) * 4;
      const dp = ((dy + y) * w + (dx + x)) * 4;
      const a = small.px[sp + 3] / 255;
      canvas[dp] = Math.round(small.px[sp] * a + canvas[dp] * (1 - a));
      canvas[dp + 1] = Math.round(small.px[sp + 1] * a + canvas[dp + 1] * (1 - a));
      canvas[dp + 2] = Math.round(small.px[sp + 2] * a + canvas[dp + 2] * (1 - a));
    }
  }
  return encodePng(w, h, canvas);
}

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

let n = 0;
const put = (file, buf) => {
  writeFileSync(file, buf);
  n++;
};

// --- Android launchers: full-bleed padded icon at each density's own size ---
for (const f of walk(join(root, "android/app/src/main/res"))) {
  if (!/mipmap-.*\/ic_launcher(_round)?\.png$/.test(f)) continue;
  const t = decodePng(readFileSync(f));
  put(f, encodePng(t.w, t.h, scaleBox(paddedIcon, t.w, t.h).px));
}
// --- Android adaptive foregrounds: 60% art, always inside the safe zone ---
for (const f of walk(join(root, "android/app/src/main/res"))) {
  if (!/mipmap-.*\/ic_launcher_foreground\.png$/.test(f)) continue;
  const t = decodePng(readFileSync(f));
  put(f, compose(t.w, t.h, rawIcon, 0.6));
}
// --- Android + iOS splashes: 36% art, centered (bg is solid, aspect-free) ---
for (const f of [
  ...walk(join(root, "android/app/src/main/res")),
  ...walk(join(root, "ios/App/App/Assets.xcassets/Splash.imageset")),
]) {
  if (!/splash[^/]*\.png$/.test(f)) continue;
  const t = decodePng(readFileSync(f));
  put(f, compose(t.w, t.h, rawIcon, 0.36));
}
// --- iOS store icon ---
put(
  join(root, "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png"),
  readFileSync(join(root, "resources/icon.png")),
);

// --- Android theme colors: kill the white bg + teal placeholder vectors ---
{
  const bgColor = join(root, "android/app/src/main/res/values/ic_launcher_background.xml");
  writeFileSync(
    bgColor,
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#FF${DARK.slice(1)}</color>\n</resources>\n`,
  );
  n++;
  writeFileSync(
    join(root, "android/app/src/main/res/drawable/ic_launcher_background.xml"),
    `<?xml version="1.0" encoding="utf-8"?>\n<vector xmlns:android="http://schemas.android.com/apk/res/android"\n    android:width="108dp"\n    android:height="108dp"\n    android:viewportHeight="108"\n    android:viewportWidth="108">\n    <path android:fillColor="${DARK}" android:pathData="M0,0h108v108h-108z" />\n</vector>\n`,
  );
  n++;
  // Legacy (API 24–25) foreground: the Bloom arc as a stroked gradient path.
  writeFileSync(
    join(root, "android/app/src/main/res/drawable-v24/ic_launcher_foreground.xml"),
    `<?xml version="1.0" encoding="utf-8"?>\n<vector xmlns:android="http://schemas.android.com/apk/res/android"\n    xmlns:aapt="http://schemas.android.com/aapt"\n    android:width="108dp"\n    android:height="108dp"\n    android:viewportHeight="108"\n    android:viewportWidth="108">\n    <path\n        android:fillColor="#00000000"\n        android:pathData="M22,78 Q54,18 86,78"\n        android:strokeColor="#FFFFFF"\n        android:strokeLineCap="round"\n        android:strokeWidth="9">\n        <aapt:attr name="android:strokeColor">\n            <gradient\n                android:startColor="#7FB69E"\n                android:endColor="#D9A95C"\n                android:type="linear"\n                android:startX="22"\n                android:startY="78"\n                android:endX="86"\n                android:endY="78" />\n        </aapt:attr>\n    </path>\n</vector>\n`,
  );
  n++;
}

console.log(`app-assets: branded ${n} native files — no placeholders left.`);
