/**
 * Bell glyph QA — pixel renders of the notification bell without a browser.
 *
 * Reproduces src/styles/bell.css + the NotificationBell SVG 1:1 (same path
 * data, same hex stops, same geometry at 4x) and rasterizes each state with
 * @resvg/resvg-js. Output lands in snapshots/bell-qa/ (gitignored).
 *
 * Usage: node scripts/bell-glyph-qa.mjs
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, "..", "snapshots", "bell-qa");
mkdirSync(OUT, { recursive: true });

/* ------------------------------------------------------------------ */
/* The exact geometry from NotificationCenter.tsx — keep in sync.        */
/* ------------------------------------------------------------------ */
const SHELL_D =
  "M12 5.1c-3.6 0-5.9 2.5-5.9 6.1 0 3.3-1.15 5-2.05 6-.32.36-.02.9.45.9h15c.47 0 " +
  ".77-.54.45-.9-.9-1-2.05-2.7-2.05-6 0-3.6-2.3-6.1-5.9-6.1Z";
const KNOB = { cx: 12, cy: 4, r: 1.1 };
const BALL = { cx: 12, cy: 20.4, r: 1.4 };

const S = 4; // scale: 1 CSS px = 4 SVG units
const px = (n) => n * S;

function bellGlyph({ unread, ring = null }) {
  const gold = "goldgrad";
  const shellFill = unread ? `url(#${gold})` : "rgba(155,156,172,0.09)";
  const line = unread ? "#F7DC9A" : "#9B9CAC";
  const shellStroke = unread ? "#FFEDBD" : line;
  const shellStrokeOp = unread ? 0.65 : 1;
  const domeTf = ring ? ` transform="rotate(${ring.dome} 12 4)"` : "";
  const clapTf = ring ? ` transform="rotate(${ring.clapper} 12 18.4)"` : "";
  return `
    <defs>
      <linearGradient id="${gold}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#F8E0A4"/>
        <stop offset="0.45" stop-color="#EFBE60"/>
        <stop offset="1" stop-color="#D6932B"/>
      </linearGradient>
    </defs>
    <g${domeTf}>
      <circle cx="${KNOB.cx}" cy="${KNOB.cy}" r="${KNOB.r}" fill="${line}"/>
      <path d="${SHELL_D}" fill="${shellFill}" stroke="${shellStroke}"
        stroke-opacity="${shellStrokeOp}" stroke-width="1.7" stroke-linejoin="round"/>
    </g>
    <g${clapTf}>
      <path d="M12 18.1v.9" stroke="${line}" stroke-width="1.7" stroke-linecap="round" fill="none"/>
      <circle cx="${BALL.cx}" cy="${BALL.cy}" r="${BALL.r}" fill="${line}"/>
    </g>`;
}

function badge(text, cx, cy) {
  // 19px tall pill; width grows with the label (10.5px bold + 5.5px padding)
  const fs = 10.5;
  const w = Math.max(19, text.length * fs * 0.62 + 11);
  const h = 19;
  const x = cx - (w * S) / 2;
  const y = cy - (h * S) / 2;
  const r = (h * S) / 2;
  return `
    <g>
      <rect x="${x}" y="${y}" width="${w * S}" height="${h * S}" rx="${r}"
        fill="url(#badgegold)" stroke="#1B1C26" stroke-width="${2 * S}"/>
      <rect x="${x}" y="${y}" width="${w * S}" height="${h * S}" rx="${r}" fill="url(#badgegloss)"/>
      <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central"
        font-family="DejaVu Sans, sans-serif" font-weight="700" font-size="${fs * S}"
        fill="#2A1B05" letter-spacing="${-0.4 * S}">${text}</text>
    </g>`;
}

function scene({ unread, label, ring = null }) {
  const C = 240; // disc center on a 480 canvas
  const R = px(40) / 2; // 40px disc
  const border = unread ? "#7A6335" : "#4A4D60";
  const wash = unread ? `<circle cx="${C}" cy="${C}" r="${R - 2}" fill="url(#goldwash)"/>` : "";
  // badge center: wrap is 40px; badge top:-5 right:-5, 19px tall
  const bcx = C + R - px(5 + 9.5) + px(0);
  const bcy = C - R + px(-5 + 9.5);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480" viewBox="0 0 480 480">
  <defs>
    <radialGradient id="bg" cx="0.5" cy="0.42" r="0.75">
      <stop offset="0" stop-color="#232533"/>
      <stop offset="1" stop-color="#14151F"/>
    </radialGradient>
    <radialGradient id="halo" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#E3B85C" stop-opacity="0.32"/>
      <stop offset="0.68" stop-color="#E3B85C" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="disc" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#313447"/>
      <stop offset="1" stop-color="#232532"/>
    </linearGradient>
    <linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.07"/>
      <stop offset="0.55" stop-color="#FFFFFF" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="goldwash" cx="0.5" cy="0" r="1.1">
      <stop offset="0" stop-color="#E3B85C" stop-opacity="0.17"/>
      <stop offset="0.62" stop-color="#E3B85C" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.13"/>
      <stop offset="0.42" stop-color="#FFFFFF" stop-opacity="0.03"/>
      <stop offset="0.58" stop-color="#FFFFFF" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="badgegold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#F8E0A4"/>
      <stop offset="0.42" stop-color="#EFBE60"/>
      <stop offset="0.78" stop-color="#D99B34"/>
      <stop offset="1" stop-color="#C07F22"/>
    </linearGradient>
    <linearGradient id="badgegloss" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.55"/>
      <stop offset="0.5" stop-color="#FFFFFF" stop-opacity="0"/>
    </linearGradient>
    <filter id="discshadow" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="${1.5 * S}" stdDeviation="${2.5 * S}"
        flood-color="#000000" flood-opacity="0.55"/>
    </filter>
    <filter id="bellglow" x="-60%" y="-60%" width="220%" height="220%">
      <feDropShadow dx="0" dy="0" stdDeviation="${1.4 * S}"
        flood-color="#EDBE62" flood-opacity="0.55"/>
    </filter>
    <filter id="badgeshadow" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="${1 * S}" stdDeviation="${2 * S}"
        flood-color="#D99B34" flood-opacity="0.6"/>
    </filter>
    <clipPath id="discclip"><circle cx="${C}" cy="${C}" r="${R - 2}"/></clipPath>
  </defs>

  <rect width="480" height="480" fill="url(#bg)"/>
  ${unread ? `<circle cx="${C}" cy="${C}" r="${R + 40}" fill="url(#halo)"/>` : ""}

  <g filter="url(#discshadow)">
    <circle cx="${C}" cy="${C}" r="${R}" fill="url(#disc)" stroke="${border}" stroke-width="${S}"/>
  </g>
  <g clip-path="url(#discclip)">
    <circle cx="${C}" cy="${C}" r="${R}" fill="url(#sheen)"/>
    ${wash}
    <circle cx="${C}" cy="${C}" r="${R}" fill="url(#gloss)"/>
    <path d="M ${C - R + 14} ${C - R + 10} A ${R - 6} ${R - 6} 0 0 1 ${C + R - 14} ${C - R + 10}"
      stroke="#FFFFFF" stroke-opacity="0.16" stroke-width="${S}" fill="none" stroke-linecap="round"/>
  </g>

  <g transform="translate(${C - px(20) / 2}, ${C - px(20) / 2}) scale(${px(20) / 24})"
     ${unread ? `filter="url(#bellglow)"` : ""}>
    ${bellGlyph({ unread, ring })}
  </g>

  ${unread ? `<g filter="url(#badgeshadow)">${badge(label, bcx, bcy)}</g>` : ""}
</svg>`;
}

const FONTS = [
  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
];

async function render(name, svg) {
  const resvg = new Resvg(svg, {
    font: { loadSystemFonts: false, fontFiles: FONTS },
    background: "#14151F",
  });
  const png = resvg.render().asPng();
  writeFileSync(join(OUT, name), png);
  console.log("wrote", name);
}

await render("render-read.png", scene({ unread: false }));
await render("render-3unread.png", scene({ unread: true, label: "3" }));
await render("render-12unread.png", scene({ unread: true, label: "12" }));
await render("render-99plus.png", scene({ unread: true, label: "99+" }));
await render(
  "render-midring.png",
  scene({ unread: true, label: "4", ring: { dome: -17, clapper: 24 } }),
);
console.log(`glyph-qa done → ${OUT}`);
