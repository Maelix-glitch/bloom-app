/**
 * Notification Center design mock — taste QA without a browser.
 *
 * Lays out the redesigned sheet (src/styles/center.css) as a static SVG at
 * 2x: the real candle art, the real bell path data, the real copy and type
 * scale, with tokens approximated to hex. It validates composition, rhythm
 * and harmony — not the implementation (that's the vitest suite's job).
 *
 * Usage: node scripts/center-mock-qa.mjs  →  snapshots/bell-qa/center-mock.png
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, "..", "snapshots", "bell-qa");
mkdirSync(OUT, { recursive: true });

const W = 430;
const H = 1180;
const S = 2; // render scale

const candle = `data:image/jpeg;base64,${readFileSync(join(here, "../src/assets/mood/candle.jpg")).toString("base64")}`;

const INK = "#EDEBE4";
const MUT = "#9B9CAC";
const FNT = "#6E6F80";
const TINT = {
  gold: "#E3B85C",
  violet: "#C8A7EE",
  sage: "#9BC7A4",
  rose: "#E9B3C3",
  amber: "#E0B36B",
  sky: "#9FD6ED",
};

const SHELL_D =
  "M12 5.1c-3.6 0-5.9 2.5-5.9 6.1 0 3.3-1.15 5-2.05 6-.32.36-.02.9.45.9h15c.47 0 " +
  ".77-.54.45-.9-.9-1-2.05-2.7-2.05-6 0-3.6-2.3-6.1-5.9-6.1Z";

const ICON = {
  bell: (c) => `
    <circle cx="12" cy="4" r="1.1" fill="${c}"/>
    <path d="${SHELL_D}" fill="url(#mockgold)" stroke="#FFEDBD" stroke-opacity="0.65" stroke-width="1.7" stroke-linejoin="round"/>
    <path d="M12 18.1v.9" stroke="${c}" stroke-width="1.7" stroke-linecap="round"/>
    <circle cx="12" cy="20.4" r="1.4" fill="${c}"/>`,
  alarm: (c) => `
    <circle cx="12" cy="13" r="7" fill="none" stroke="${c}" stroke-width="1.8"/>
    <path d="M12 9.5V13l2.5 1.6 M5.5 4.5 3.8 6.2 M18.5 4.5l1.7 1.7" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round"/>`,
  sprout: (c) => `
    <path d="M12 21v-8 M12 13c0-4 3-7 8-7 0 4-3 7-8 7Z M12 13c0-3-2.5-5.5-6.5-5.5C5.5 11 8 13 12 13Z" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`,
  moon: (c) => `
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 7 7 0 1 0 20 14.5Z" fill="none" stroke="${c}" stroke-width="1.8" stroke-linejoin="round"/>`,
  spark: (c) => `
    <path d="M12 4l1.7 4.8L18.5 10.5l-4.8 1.7L12 17l-1.7-4.8L5.5 10.5l4.8-1.7Z M19 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8Z" fill="none" stroke="${c}" stroke-width="1.6" stroke-linejoin="round"/>`,
  drop: (c) => `
    <path d="M12 3.5c2.8 3.8 5.5 6.8 5.5 9.7a5.5 5.5 0 1 1-11 0C6.5 10.3 9.2 7.3 12 3.5Z" fill="none" stroke="${c}" stroke-width="1.8" stroke-linejoin="round"/>`,
  check: (c) =>
    `<path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
  chev: (c) =>
    `<path d="M9.5 6l6 6-6 6" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`,
  bellOutline: (c) => `
    <circle cx="12" cy="4" r="1.1" fill="${c}"/>
    <path d="${SHELL_D}" fill="none" stroke="${c}" stroke-width="1.7" stroke-linejoin="round"/>
    <path d="M12 18.1v.9" stroke="${c}" stroke-width="1.7" stroke-linecap="round"/>
    <circle cx="12" cy="20.4" r="1.4" fill="${c}"/>`,
  x: (c) =>
    `<path d="M6 6l12 12M18 6L6 18" stroke="${c}" stroke-width="1.8" stroke-linecap="round"/>`,
  trash: (c) =>
    `<path d="M4 7h16 M9 7V5h6v2 M6.5 7l1 13h9l1-13" fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`,
};

function glyph(icon, c, x, y, size) {
  const k = size / 24;
  return `<g transform="translate(${x},${y}) scale(${k})">${ICON[icon](c)}</g>`;
}

function orb(cx, cy, r, tint, icon, isize, shape = "circle") {
  const t = TINT[tint];
  const open =
    shape === "circle"
      ? `<circle cx="${cx}" cy="${cy}" r="${r}"`
      : `<rect x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" rx="12"`;
  return `
    ${open} fill="${t}24" stroke="${t}5C" stroke-width="1"/>
    ${open} fill="url(#gloss)" stroke="none"/>
    ${glyph(icon, t, cx - isize / 2, cy - isize / 2, isize)}`;
}

function row({ y, tint, icon, title, body, aside, unread = false, why = null }) {
  const h = why && !body ? 62 : why ? 78 : 62;
  const oy = y + h / 2;
  return `
    <g>
      <rect x="40" y="${y}" width="350" height="${h}" rx="15" fill="#1B1C2700" stroke="#FFFFFF0A"/>
      ${orb(69, oy, 19, tint, icon, 17)}
      ${unread ? `<circle cx="82" cy="${oy - 16}" r="4.5" fill="url(#badgegold)" stroke="#1B1C26" stroke-width="2"/>` : ""}
      <text x="102" y="${y + 26}" font-family="DejaVu Sans" font-size="14" font-weight="${unread ? 700 : 500}" fill="${INK}">${title}</text>
      ${body ? `<text x="102" y="${y + 44}" font-family="DejaVu Sans" font-size="12.5" fill="${MUT}">${body}</text>` : ""}
      ${why ? `<text x="102" y="${y + (body ? 60 : 44)}" font-family="DejaVu Sans" font-size="11" fill="${FNT}">${why}</text>` : ""}
      <text x="378" y="${y + 26}" text-anchor="end" font-family="DejaVu Sans Mono" font-size="10.5" fill="${unread ? "#EFD9A7" : FNT}">${aside}</text>
      ${glyph("chev", "#6E6F80", 372, y + h / 2 - 7.5, 15)}
    </g>`;
}

function head(y, tint, icon, title, count, action = null) {
  return `
    <g>
      ${orb(20 + 4 + 17, y + 17, 17, tint, icon, 16, "round")}
      <text x="80" y="${y + 22}" font-family="DejaVu Serif" font-size="19" fill="${INK}">${title}</text>
      ${count ? `<rect x="${80 + title.length * 10.4 + 8}" y="${y + 6}" width="26" height="18" rx="9" fill="#1B1C26" stroke="#FFFFFF24"/><text x="${80 + title.length * 10.4 + 21}" y="${y + 19.5}" text-anchor="middle" font-family="DejaVu Sans Mono" font-size="10.5" fill="${MUT}">${count}</text>` : ""}
      ${action ? `<g><rect x="296" y="${y + 1}" width="94" height="32" rx="16" fill="#1B1C264D" stroke="#FFFFFF24"/><text x="333" y="${y + 21.5}" text-anchor="middle" font-family="DejaVu Sans" font-size="12" fill="${MUT}">Clear</text>${glyph("trash", MUT, 306, y + 9, 14)}</g>` : ""}
    </g>`;
}

function group(y, h) {
  return `<rect x="34" y="${y}" width="362" height="${h}" rx="20" fill="#343748" stroke="#FFFFFF26"/>`;
}

function day(y, label) {
  return `
    <text x="44" y="${y}" font-family="DejaVu Sans Mono" font-size="10" letter-spacing="1.8" fill="${FNT}">${label.toUpperCase()}</text>
    <line x1="${44 + label.length * 8.2 + 10}" y1="${y - 3.5}" x2="386" y2="${y - 3.5}" stroke="#FFFFFF29"/>`;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W * S}" height="${H * S}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="panel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2B2E3F"/><stop offset="1" stop-color="#1D1E29"/>
    </linearGradient>
    <linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.09"/><stop offset="0.55" stop-color="#FFFFFF" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="mockgold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#F8E0A4"/><stop offset="0.45" stop-color="#EFBE60"/><stop offset="1" stop-color="#D6932B"/>
    </linearGradient>
    <linearGradient id="badgegold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#F8E0A4"/><stop offset="0.42" stop-color="#EFBE60"/><stop offset="0.78" stop-color="#D99B34"/><stop offset="1" stop-color="#C07F22"/>
    </linearGradient>
    <linearGradient id="artfade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF"/><stop offset="0.55" stop-color="#8A8A8A"/><stop offset="1" stop-color="#000000"/>
    </linearGradient>
    <mask id="artmask"><rect x="9" y="9" width="412" height="260" rx="27" fill="url(#artfade)"/></mask>
    <clipPath id="panelclip"><rect x="8" y="8" width="414" height="1164" rx="28"/></clipPath>
  </defs>

  <rect width="${W}" height="${H}" fill="#101018"/>
  <g clip-path="url(#panelclip)">
    <rect x="8" y="8" width="414" height="1164" rx="28" fill="url(#panel)" stroke="#FFFFFF2E"/>
    <rect x="8" y="8" width="414" height="1164" rx="28" fill="url(#gloss)"/>

    <g mask="url(#artmask)" opacity="0.55">
      <image href="${candle}" x="9" y="9" width="412" height="260" preserveAspectRatio="xMidYMid slice"/>
    </g>
    <rect x="9" y="9" width="412" height="260" fill="url(#panel)" opacity="0.45"/>

    <!-- hero -->
    <circle cx="47" cy="63" r="27" fill="#343748" stroke="#E3B85C6B"/>
    <circle cx="47" cy="63" r="27" fill="url(#gloss)"/>
    ${glyph("bell", "#F7DC9A", 47 - 13, 63 - 13, 26)}
    <circle cx="383" cy="55" r="19" fill="#1B1C2666" stroke="#FFFFFF24"/>
    ${glyph("x", MUT, 383 - 9, 55 - 9, 18)}
    <text x="28" y="128" font-family="DejaVu Sans Mono" font-size="10" letter-spacing="2.2" fill="${MUT}">SUN · SEPTEMBER 20</text>
    <text x="26" y="162" font-family="DejaVu Serif" font-size="31" fill="${INK}">Notifications</text>
    <text x="28" y="186" font-family="DejaVu Sans" font-size="13.5" fill="#EFD9A7">2 waiting for you.</text>

    <!-- due -->
    ${head(210, "gold", "alarm", "Due now", "2")}
    ${group(254, 142)}
    ${row({ y: 260, tint: "sage", icon: "sprout", title: "Morning pages", body: "Three lines before the day starts.", aside: "8:00 AM" })}
    ${row({ y: 322, tint: "sky", icon: "moon", title: "Wind down", body: "Screens off, lights low.", aside: "9:30 PM" })}

    <!-- insights -->
    ${head(420, "violet", "spark", "Insights", "1")}
    ${group(464, 74)}
    ${row({ y: 470, tint: "violet", icon: "spark", title: "Your rhythm is settling", body: "", aside: "", why: "Read from your last three cycles." })}

    <!-- history -->
    ${head(562, "sky", "bellOutline", "History", "3", true)}
    ${day(610, "Today")}
    ${group(620, 142)}
    ${row({ y: 626, tint: "sage", icon: "sprout", title: "Habit complete", body: "Morning pages logged for today.", aside: "just now", unread: true })}
    ${row({ y: 688, tint: "amber", icon: "drop", title: "Fertile window", body: "Day 2 of about 5 — be gentle.", aside: "2h ago", unread: true })}
    ${day(786, "Yesterday")}
    ${group(796, 74)}
    ${row({ y: 802, tint: "rose", icon: "drop", title: "Period due soon", body: "Likely within 2 days.", aside: "yesterday" })}

    <!-- footer -->
    <text x="215" y="918" text-anchor="middle" font-family="DejaVu Sans" font-size="11.5" fill="${FNT}">Delivered on this device · a missed nudge waits here, never lost.</text>
  </g>
</svg>`;

const resvg = new Resvg(svg, {
  font: {
    loadSystemFonts: false,
    fontFiles: [
      "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
      "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
      "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
      "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
    ],
  },
  background: "#101018",
});
writeFileSync(join(OUT, "center-mock.png"), resvg.render().asPng());
console.log(`center mock → ${OUT}/center-mock.png (${W * S}x${H * S})`);
