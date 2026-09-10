/**
 * Bloom — PWA splash screens (apple-touch-startup-image).
 *
 * iOS shows a splash image when a home-screen PWA launches. Without one you
 * get a white flash, which is the single biggest "this is a website" tell.
 *
 * Zero dependencies: decodes public/bloom/icons/icon-512.png, centers it on
 * the app background (#14151f), and writes one PNG per Apple screen size into
 * public/bloom/splash/.
 *
 * Run:  node scripts/pwa-splash.mjs  (or: npm run splash)
 * Re-run whenever the icon or theme background changes.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodePng, encodePng, solidCanvas, blendCentered } from "./png.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ICON = join(root, "public/bloom/icons/icon-512.png");
const OUT = join(root, "public/bloom/splash");
const BG = [0x14, 0x15, 0x1f]; // #14151f — must match theme-color in __root.tsx

/** Physical pixels + the CSS size/ratio iOS matches in the media query. */
const SCREENS = [
  { file: "splash-640x1136.png", w: 640, h: 1136, css: [320, 568, 2] },
  { file: "splash-750x1334.png", w: 750, h: 1334, css: [375, 667, 2] },
  { file: "splash-1125x2436.png", w: 1125, h: 2436, css: [375, 812, 3] },
  { file: "splash-1170x2532.png", w: 1170, h: 2532, css: [390, 844, 3] },
  { file: "splash-1179x2556.png", w: 1179, h: 2556, css: [393, 852, 3] },
  { file: "splash-1242x2688.png", w: 1242, h: 2688, css: [414, 896, 3] },
  { file: "splash-1284x2778.png", w: 1284, h: 2778, css: [428, 926, 3] },
  { file: "splash-1290x2796.png", w: 1290, h: 2796, css: [430, 932, 3] },
  { file: "splash-1488x2266.png", w: 1488, h: 2266, css: [744, 1133, 2] },
  { file: "splash-1536x2048.png", w: 1536, h: 2048, css: [768, 1024, 2] },
  { file: "splash-1668x2388.png", w: 1668, h: 2388, css: [834, 1194, 2] },
  { file: "splash-2048x2732.png", w: 2048, h: 2732, css: [1024, 1366, 2] },
];

const icon = decodePng(readFileSync(ICON));
mkdirSync(OUT, { recursive: true });

for (const s of SCREENS) {
  const out = solidCanvas(s.w, s.h, BG);
  // Logo ≈ 30% of the short edge, optically centered (a touch above middle).
  const size = Math.round(Math.min(s.w, s.h) * 0.3);
  const dx = Math.round((s.w - size) / 2);
  const dy = Math.round(s.h * 0.46 - size / 2);
  blendCentered(out, s.w, icon, size, dx, dy);
  writeFileSync(join(OUT, s.file), encodePng(s.w, s.h, out));
  console.log("wrote", s.file, `${s.w}x${s.h}`);
}
console.log("\nDone — the <link> tags already live in src/routes/__root.tsx.");
