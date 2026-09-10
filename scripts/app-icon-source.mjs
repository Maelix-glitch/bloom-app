/**
 * Bloom — native icon + splash sources for @capacitor/assets.
 *
 * Composes from public/bloom/icons/icon-1024.png onto the theme background:
 *   resources/icon.png    1024² — artwork inset to 78% so Android's adaptive
 *                           masks (circle/squircle) never clip the arc, and the
 *                           baked transparency corners can't show a seam.
 *   resources/splash.png  2732² — launch splash, logo at ~36%.
 *
 * Run:  node scripts/app-icon-source.mjs && npx capacitor-assets generate
 * Or:   npm run app:assets
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodePng, encodePng, solidCanvas, blendCentered } from "./png.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BG = [0x14, 0x15, 0x1f]; // #14151f — matches theme-color

const icon = decodePng(readFileSync(join(root, "public/bloom/icons/icon-1024.png")));
const res = join(root, "resources");
mkdirSync(res, { recursive: true });

// Store icon: padded, full-bleed dark — safe under every OS mask.
{
  const S = 1024;
  const size = Math.round(S * 0.78);
  const canvas = solidCanvas(S, S, BG);
  const off = Math.round((S - size) / 2);
  blendCentered(canvas, S, icon, size, off, off);
  writeFileSync(join(res, "icon.png"), encodePng(S, S, canvas));
  console.log("wrote resources/icon.png");
}

// Launch splash: same stage, smaller mark.
{
  const S = 2732;
  const size = Math.round(S * 0.36);
  const canvas = solidCanvas(S, S, BG);
  const off = Math.round((S - size) / 2);
  blendCentered(canvas, S, icon, size, off, off);
  writeFileSync(join(res, "splash.png"), encodePng(S, S, canvas));
  console.log("wrote resources/splash.png");
}
