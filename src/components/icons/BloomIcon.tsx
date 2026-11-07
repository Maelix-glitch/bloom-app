/**
 * BloomIcon — the bespoke icon registry (UI update U4, plan §3).
 *
 * One hand-drawn glyph family for the whole product, drawn to the §3.2
 * spec: a 24×24 grid, stroke 1.6 at 24px (1.8 at small optical sizes),
 * round linecaps and joins, `currentColor` only — colour always comes
 * from tokens and context, never from the artwork. Each glyph carries
 * exactly one quiet botanical gesture from the sidebar's fern imagery —
 * a stem that arcs instead of running straight, a leaf-vein centre line,
 * a bud where a stock set would put a dot or a flame — so the set reads
 * as Bloom's rather than a re-skinned library.
 *
 * Modelled on the two precedents already in the codebase:
 * `HIGHLIGHT_ICON_COMPONENTS` (a name → component registry) and
 * `src/components/tk/icons.tsx` (hand-drawn tracker marks at this exact
 * spec — its sleep and water paths live on here as registry glyphs).
 * No icon font, no external requests: safe inside the Capacitor shell.
 *
 * Long-tail Lucide (≈100 icons in admin, settings and stories tooling)
 * stays in place during the transition and is swapped glyph-by-glyph in
 * later passes; this registry is what makes that safe.
 */

import type { ReactElement } from "react";

/** Petals around a centre — the shared bloom construction. */
function petals(count: number, cx: number, cy: number, rx: number, ry: number, topY: number) {
  return Array.from({ length: count }, (_, i) => (
    <ellipse
      key={i}
      cx={cx}
      cy={topY}
      rx={rx}
      ry={ry}
      transform={`rotate(${(360 / count) * i} ${cx} ${cy})`}
    />
  ));
}

const GLYPHS = {
  /* ------------------------------ navigation ------------------------------ */

  /** Today — a calendar whose page holds a young sprout. */
  today: (
    <>
      <rect x="3.5" y="5" width="17" height="16" rx="3" />
      <path d="M3.5 9.8h17" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
      <path d="M12 18.6c-.1-1.9.2-3.5 1-4.9" />
      <path d="M12.3 14.9c-1.9.2-3.4-.8-4.1-2.9 2.2.1 3.8 1.1 4.1 2.9Z" />
      <path d="M13 13.6c.2-1.9 1.4-3.1 3.4-3.4-.1 2-1.3 3.2-3.4 3.4Z" />
    </>
  ),
  /** Trackers — an arc gauge whose needle is a leaf. */
  trackers: (
    <>
      <path d="M4 19a9.5 9.5 0 1 1 16 0" />
      <path d="M12 14.6 15.4 8.7" />
      <path d="M15.4 8.7c1.8-.4 3.4.4 4.4 2.1-1.8.4-3.4-.4-4.4-2.1Z" />
      <circle cx="12" cy="14.6" r="1.2" />
    </>
  ),
  /** Cycle — a droplet with a leaf-vein running through it. */
  cycle: (
    <>
      <path d="M12 3c3.4 4.1 6 7.5 6 10.4a6 6 0 1 1-12 0C6 10.5 8.6 7.1 12 3Z" />
      <path d="M12 19.2c-.3-3 .3-5.9 1.9-8.4" />
      <path d="M13 14.6c1.1-.5 2-.5 3 .1" opacity="0.7" />
    </>
  ),
  /** Mood — a face whose eyes are two leaves. */
  mood: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M7 10.6c.8-1.7 2.2-2.6 4.1-2.5-.4 1.9-1.9 2.8-4.1 2.5Z" />
      <path d="M17 10.6c-.8-1.7-2.2-2.6-4.1-2.5.4 1.9 1.9 2.8 4.1 2.5Z" />
      <path d="M8.6 14.6c1.1 1.2 2.2 1.8 3.4 1.8s2.3-.6 3.4-1.8" />
    </>
  ),
  /** Rewards — the bloom mark itself, a five-petal flower head. */
  rewards: (
    <>
      {petals(5, 12, 11, 2.7, 3.9, 7.1)}
      <circle cx="12" cy="11" r="1.7" />
      <path d="M12 15.2c-.2 2.2-1 4-2.4 5.5" />
      <path d="M10.4 18.4c-1.8.1-3.2-.7-4.1-2.3 1.8-.1 3.2.7 4.1 2.3Z" />
    </>
  ),
  /** Coach — a speech arc with a sprout growing inside it. */
  coach: (
    <>
      <path d="M12 3.5h7A2.5 2.5 0 0 1 21.5 6v7a2.5 2.5 0 0 1-2.5 2.5h-6.2L8 19.6v-4.1H5A2.5 2.5 0 0 1 2.5 13V6A2.5 2.5 0 0 1 5 3.5h7Z" />
      <path d="M12.2 13.6c-.1-1.5.1-2.8.8-3.9" />
      <path d="M12.4 11.1c-1.5.1-2.7-.7-3.3-2.3 1.8.1 3 .9 3.3 2.3Z" />
      <path d="M13 9.7c.2-1.5 1.1-2.5 2.7-2.7-.1 1.6-1.1 2.5-2.7 2.7Z" />
    </>
  ),

  /* ------------------------------- trackers ------------------------------- */

  /** Sleep — a bed with a z drifting off it (from tk/icons.tsx, to spec). */
  sleep: (
    <>
      <path d="M3 6v14" />
      <path d="M3 12h13a4 4 0 0 1 4 4v4" />
      <path d="M3 20h18" />
      <path d="M7 12v-2.5A1.5 1.5 0 0 1 8.5 8H13" />
      <path d="M17 3h3.5L17 7.5h3.5" />
    </>
  ),
  /** Water — a bottle with water in it (from tk/icons.tsx, to spec). */
  water: (
    <>
      <rect x="9.5" y="2" width="5" height="2.8" rx="1" />
      <path d="M10 4.8v2.4" />
      <path d="M8 7.2h8a2.2 2.2 0 0 1 2.2 2.2v9.4A2.2 2.2 0 0 1 16 21H8a2.2 2.2 0 0 1-2.2-2.2V9.4A2.2 2.2 0 0 1 8 7.2Z" />
      <path d="M5.8 13.5h12.4" />
    </>
  ),
  /** Study — an open book with a leaf growing from its spine. */
  study: (
    <>
      <path d="M12 7C10.1 5.4 7.2 4.9 4.2 5.4v13c3-.5 5.9 0 7.8 1.6 1.9-1.6 4.8-2.1 7.8-1.6v-13C16.8 4.9 13.9 5.4 12 7Z" />
      <path d="M12 7v13.2" />
      <path d="M12 7c.1-1.6.6-2.9 1.6-4" />
      <path d="M13.6 3.1c1.7.1 2.9 1 3.5 2.6-1.7-.1-2.9-1-3.5-2.6Z" />
    </>
  ),
  /** Movement — a footpath arcing away, one print already on it. */
  movement: (
    <>
      <path d="M4.5 19.5c5.5.3 5.8-4.6 8.7-7.4 2-1.9 4.3-2.4 6.8-2.6" strokeDasharray="0.2 3.4" />
      <ellipse cx="7.6" cy="14.8" rx="1.8" ry="2.7" transform="rotate(-24 7.6 14.8)" />
      <path d="M5.9 10.9c.4.7 1 1.1 1.8 1.2" />
    </>
  ),
  /** Energy — a bud on an arcing stem (the flame, grown up). */
  energy: (
    <>
      <path d="M12 13.8C9.3 13.1 7.5 10.9 7.4 7.9c1.9.3 3.5 1.4 4.6 3.2 1.1-1.8 2.7-2.9 4.6-3.2-.1 3-1.9 5.2-4.6 5.9Z" />
      <path d="M12 8.2v2.9" opacity="0.7" />
      <path d="M12 13.8c.1 2.9-.4 5.3-1.5 7.4" />
      <path d="M11 17.6c-1.9.2-3.5-.6-4.5-2.3 1.9-.2 3.5.6 4.5 2.3Z" />
    </>
  ),
  /** Screen — a quiet slab with a dimming arc inside it. */
  screen: (
    <>
      <rect x="5" y="2.8" width="14" height="18.4" rx="2.8" />
      <path d="M8 15.2a4.6 4.6 0 0 1 8 0" />
      <path d="M12 8.2v.4" />
      <path d="M7.4 18h9.2" opacity="0.7" />
    </>
  ),

  /* -------------------------------- habits -------------------------------- */

  /** ⭐ — a star whose points soften into petals around a bloom centre. */
  "star-bloom": (
    <>
      <path d="M12 3.4l2.5 5.2 5.7.7-4.2 3.9 1.1 5.7L12 16.2l-5.1 2.7 1.1-5.7-4.2-3.9 5.7-.7Z" />
      <circle cx="12" cy="11.2" r="1.3" />
    </>
  ),
  /** 🌱 — a sprout: two leaves on an arcing stem over a ground line. */
  sprout: (
    <>
      <path d="M12 21v-7.6" />
      <path d="M12 13.4C8.9 13.7 6.2 12 5.2 8c3.9.1 6.5 2 6.8 5.4Z" />
      <path d="M12 10.8c.3-3.4 2.5-5.6 6.1-6-.2 3.6-2.4 5.8-6.1 6Z" />
      <path d="M5 21h14" opacity="0.55" />
    </>
  ),
  /** 📚 — a closed book with a leaf pressed on its cover. */
  book: (
    <>
      <path d="M5.5 4.5A1.5 1.5 0 0 1 7 3h13v15H7a1.5 1.5 0 0 0-1.5 1.5Z" />
      <path d="M5.5 19.5A1.5 1.5 0 0 1 7 18h13v3H7a1.5 1.5 0 0 1-1.5-1.5Z" />
      <path d="M12.8 13.6c-.1-1.9.5-3.5 1.8-4.8" />
      <path d="M13.2 10.6c-1.7-.3-2.9-1.4-3.4-3.2 1.8.2 3 1.3 3.4 3.2Z" />
    </>
  ),
  /** 💧 — a single droplet, lit from inside. */
  droplet: (
    <>
      <path d="M12 3c3.4 4.1 6 7.5 6 10.4a6 6 0 1 1-12 0C6 10.5 8.6 7.1 12 3Z" />
      <path d="M9.3 13.6a3 3 0 0 0 2.1 3.5" />
    </>
  ),
  /** 🧘 — a lotus: three petals over still water. */
  lotus: (
    <>
      <path d="M12 15.3c-2-1.7-2.7-4.2-2-7 2 1 3.2 2.6 2 4.4.8-1.8 2-3.4 2-4.4.7 2.8 0 5.3-2 7Z" />
      <path d="M10.3 15.7C7.4 15.4 5.1 13.5 4.4 10.6c2.8.2 5 1.8 6.3 4.3" />
      <path d="M13.7 15.7c2.9-.3 5.2-2.2 5.9-5.1-2.8.2-5 1.8-6.3 4.3" />
      <path d="M4 19c2.6 1 5.3 1.5 8 1.5s5.4-.5 8-1.5" />
    </>
  ),
  /** 🏃 — a runner mid-stride. */
  runner: (
    <>
      <circle cx="15.2" cy="4.3" r="1.8" />
      <path d="M13.6 7.8 10.4 11l2.6 2.8-1 5.4" />
      <path d="M10.4 11l-3.8 1.3" />
      <path d="M13 13.8l3.4 1.4 1.1 3.6" />
      <path d="M13.6 7.8l3 1.4 2.6-.4" />
    </>
  ),
  /** ✍️ — a pen nib drawn as a leaf, vein for a slit. */
  pen: (
    <>
      <path d="M12 2.8c2.6 3.1 4.1 6.7 4.1 10.3L12 20.4l-4.1-7.3c0-3.6 1.5-7.2 4.1-10.3Z" />
      <path d="M12 8v7.4" />
      <circle cx="12" cy="13" r="1.1" />
    </>
  ),
  /** 🍎 — an apple with its leaf still on. */
  apple: (
    <>
      <path d="M12 7.6c-1.2-1.3-3-2-4.7-1.4C4.9 7.4 4.5 11.1 6 14.6c1.3 3 3.4 5.5 5.2 5.5 1-.1 1.6-.1 2.6 0 1.8 0 3.9-2.5 5.2-5.5 1.5-3.5 1.1-7.2-1.3-9.4-1.7-.6-3.5.1-4.7 1.4Z" />
      <path d="M12 7.6c0-2 .7-3.4 2.1-4.5" />
      <path d="M14.1 3.2c1.7-.3 3.1.4 4 1.9-1.6.3-3-.4-4-1.9Z" />
    </>
  ),
  /** 😴 — a crescent moon with a z drifting off it. */
  "moon-bed": (
    <>
      <path d="M19.3 15.7A8.2 8.2 0 1 1 8.3 4.7a6.6 6.6 0 0 0 11 11Z" />
      <path d="M17.2 3.4h3l-3 3.4h3" />
    </>
  ),
  /** 🎯 — a target whose centre is a bloom. */
  "target-bloom": (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <circle cx="12" cy="12" r="4.7" />
      {petals(4, 12, 12, 0.9, 1.7, 10.3)}
    </>
  ),
  /** 🎨 — a palette with petal wells. */
  "palette-petal": (
    <>
      <path d="M12 3.6a8.4 8.4 0 1 0 0 16.8c1.1 0 1.8-.8 1.8-1.7 0-.7-.3-1.2-.3-1.9 0-.8.6-1.4 1.5-1.4h1.7a3.6 3.6 0 0 0 3.6-3.6c0-4-3.6-7.2-8.3-7.2Z" />
      <path d="M7.9 10.1c.9-1.1 2.2-1.6 3.7-1.4-.6 1.5-1.9 2.3-3.7 2.3" />
      <circle cx="13.4" cy="8.2" r="0.6" />
      <circle cx="8.6" cy="15.4" r="0.6" />
    </>
  ),
  /** 💪 — strength as an arm's arc, ending in a fist-bud. */
  strength: (
    <>
      <path d="M4.8 20.5C5.3 13.2 9.3 7.7 15.8 5.6" />
      <path d="M8.6 20.5c.4-4.9 2.8-9 6.9-11.2" />
      <circle cx="17.6" cy="5.4" r="2.4" />
    </>
  ),
  /** 🧹 — a broom: one long handle, a fan of bristles bound with a leaf. */
  broom: (
    <>
      <path d="M15.2 3.2 9.6 12.6" />
      <path d="M9.6 12.6c-2.4 1.6-3.9 4.1-4.3 7.4 3.3-.4 5.8-1.9 7.4-4.3" />
      <path d="M8.1 14.1c-1 1.7-1.6 3.5-1.8 5.4" opacity="0.7" />
      <path d="M11.3 15.7c-1.4 1.1-2.6 2.5-3.5 4.2" opacity="0.7" />
      <path d="M7.8 11.4l3.9 3.9" />
    </>
  ),
  /** 💊 — a capsule, halved along its seam. */
  capsule: (
    <>
      <rect x="3.6" y="8.7" width="16.8" height="6.6" rx="3.3" transform="rotate(-45 12 12)" />
      <path d="M8.8 15.2 15.2 8.8" />
      <path d="M13.4 5.9c1.4-.4 2.8-.1 4 .8" opacity="0.7" />
    </>
  ),
  /** 🚶 — a walker, unhurried. */
  walker: (
    <>
      <circle cx="13" cy="4.3" r="1.8" />
      <path d="M12.4 7.2 11.2 12l2.6 3.4.7 4.8" />
      <path d="M11.2 12l-3.1 3-1 4.6" />
      <path d="M12.1 9.4 9.2 12.6" />
      <path d="M12.7 9.2l2.9 2" />
    </>
  ),
  /** ☀️ — sunrise: a sun lifting over the garden line. */
  sunrise: (
    <>
      <path d="M6.2 17.2a5.8 5.8 0 0 1 11.6 0" />
      <path d="M12 7.6V5" />
      <path d="M5.9 10.2 4.4 8.7" />
      <path d="M18.1 10.2l1.5-1.5" />
      <path d="M2.8 20.6h18.4" />
      <path d="M5.5 17.4h13" opacity="0.55" />
    </>
  ),
  /** 🌙 — a crescent moon with a small leaf at its tip (§3.2's example). */
  moon: (
    <>
      <path d="M20 15.8A8.5 8.5 0 1 1 8.2 4a7 7 0 0 0 11.8 11.8Z" />
      <path d="M17.6 7.4c-1.1-1.5-1.4-3.2-.9-5.2 1.8.7 2.9 2.2 2.9 4.3-.9.3-1.6.1-2-.9Z" />
    </>
  ),
  /** 💰 — a purse with a leaf for a clasp. */
  purse: (
    <>
      <path d="M6.2 8.2h11.6l.9 11a2 2 0 0 1-2 2.2H7.3a2 2 0 0 1-2-2.2Z" />
      <path d="M9.2 8.2c0-2.3 1.2-3.7 2.8-3.7s2.8 1.4 2.8 3.7" />
      <path d="M12 16.8c-.1-1.7.3-3.1 1.3-4.3" />
      <path d="M12.3 13.9c-1.5.1-2.7-.6-3.4-2 1.7.1 2.9.8 3.4 2Z" />
    </>
  ),
  /** 📵 — a phone at rest, crossed by a quiet slash. */
  "phone-off": (
    <>
      <rect x="7" y="2.5" width="10" height="19" rx="2.6" />
      <path d="M10.8 18.6h2.4" />
      <path d="M4.6 4.6l14.8 14.8" />
    </>
  ),
  /** 🧠 — a head in profile-less calm: a mind with a sprout growing from it. */
  mind: (
    <>
      <circle cx="12" cy="13.6" r="7.2" />
      <path d="M12 6.4c.1-1.7.6-3 1.6-4.1" />
      <path d="M13.6 2.5c1.6.2 2.7 1.1 3.3 2.7-1.6-.1-2.8-1-3.3-2.7Z" />
      <path d="M9.4 13.2c1.7-.9 3.5-.9 5.2 0" opacity="0.65" />
    </>
  ),
  /** 🎧 — headphones: a band like a stem's arc, two quiet pads. */
  headphones: (
    <>
      <path d="M4 17.5v-2.7a8 8 0 0 1 16 0v2.7" />
      <rect x="2.8" y="14.6" width="4.6" height="6.2" rx="2.1" />
      <rect x="16.6" y="14.6" width="4.6" height="6.2" rx="2.1" />
      <path d="M12 6.2c.3-1.4 1.2-2.4 2.6-2.9" opacity="0.7" />
    </>
  ),
  /** 🧴 — a pump bottle with a single droplet inside. */
  skincare: (
    <>
      <path d="M9 2.8h7.5" />
      <path d="M12 2.8v2.7" />
      <path d="M9.6 5.5h4.8v2.6H9.6Z" />
      <path d="M8 8.1h8l.7 2v9a2 2 0 0 1-2 2H9.3a2 2 0 0 1-2-2v-9Z" />
      <path d="M12 12.2c1 1.2 1.6 2.1 1.6 2.9a1.6 1.6 0 1 1-3.2 0c0-.8.6-1.7 1.6-2.9Z" />
    </>
  ),
  /** 🦷 — a tooth, drawn kindly. */
  tooth: (
    <>
      <path d="M12 5.6c-1.5-1.2-3.2-1.8-5-1.5-2.4.3-3.5 2-3.2 4.3.2 1.9 1.1 3.4 1.7 5.2.5 1.7.8 3.7 1.2 5.5.2 1 1.6 1.1 2.1.2.4-.7.8-2.3 2.2-2.3s1.8 1.6 2.2 2.3c.5.9 1.9.8 2.1-.2.4-1.8.7-3.8 1.2-5.5.6-1.8 1.5-3.3 1.7-5.2.3-2.3-.8-4-3.2-4.3-1.8-.3-3.5.3-5 1.5Z" />
    </>
  ),
  /** 📞 — a handset with one soft signal arc, like a leaf lifting. */
  "call-bloom": (
    <>
      <path d="M5 3.8h3.8l1.4 4.3-2.3 1.7a12.5 12.5 0 0 0 6.3 6.3l1.7-2.3 4.3 1.4v3.8a2 2 0 0 1-2.1 2A16.8 16.8 0 0 1 3 5.9a2 2 0 0 1 2-2.1Z" />
      <path d="M14.2 4.6a6.4 6.4 0 0 1 5.2 5.2" />
    </>
  ),
  /** 🌿 — a fern frond: one arcing stem, leaflets in pairs. */
  fern: (
    <>
      <path d="M11 21.5C11 14.5 12.3 8.3 16.2 3.6" />
      <path d="M11.4 16.8c-2.7.1-4.9-1-6.4-3.2 2.7-.1 4.9 1 6.4 3.2Z" />
      <path d="M11.9 12.6c-2.4.1-4.4-.9-5.8-2.9 2.4-.1 4.4.9 5.8 2.9Z" />
      <path d="M12.9 8.9c-2 .1-3.7-.7-4.9-2.4 2-.1 3.7.7 4.9 2.4Z" />
      <path d="M12.2 15.4c1.9.9 3.3 2.4 4 4.5" opacity="0.75" />
      <path d="M13.1 11.2c1.7.8 2.9 2.1 3.5 3.9" opacity="0.75" />
    </>
  ),
  /** 🍵 — a teacup, steam curling like two small leaves. */
  teacup: (
    <>
      <path d="M4 10.2h13v4.3a5.5 5.5 0 0 1-5.5 5.5h-2A5.5 5.5 0 0 1 4 14.5Z" />
      <path d="M17 11.2h1a3.1 3.1 0 0 1 0 6.2h-1.2" />
      <path d="M8.3 6.8c-.9-1.1.9-1.9 0-3.2" />
      <path d="M12.3 6.8c-.9-1.1.9-1.9 0-3.2" />
    </>
  ),
  /** 🚴 — a bicycle, wheels like two moons. */
  bicycle: (
    <>
      <circle cx="6" cy="16.8" r="3.6" />
      <circle cx="18" cy="16.8" r="3.6" />
      <path d="M6 16.8 9.8 9.2h4.9L18 16.8" />
      <path d="M9.8 9.2 13 16.8" />
      <path d="M8.6 6.8h3" />
      <path d="M14.7 9.2 16 6.6h2.4" />
    </>
  ),
  /** 🧺 — a laundry basket with the day's soft mound on top. */
  basket: (
    <>
      <path d="M4.6 10.2h14.8l-1.7 9.3a2 2 0 0 1-2 1.6H8.3a2 2 0 0 1-2-1.6Z" />
      <path d="M3.4 10.2h17.2" />
      <path d="M8.2 10.2c.5-2.4 2-3.7 3.8-3.7s3.3 1.3 3.8 3.7" />
      <path d="M7.2 14.6h9.6" opacity="0.7" />
      <path d="M8 18h8" opacity="0.7" />
    </>
  ),

  /* ---------------------------- rewards & ranks ---------------------------- */

  /** Seedling — a seed waking in the soil, first crack open. */
  seedling: (
    <>
      <path d="M12 13.6c-2.9 0-4.9-2-4.9-4.7 0-2.4 2-4.2 4.9-4.2s4.9 1.8 4.9 4.2c0 2.7-2 4.7-4.9 4.7Z" />
      <path d="M12 4.7c.3-1.5 1.1-2.6 2.5-3.4" />
      <path d="M9.6 9.4c1.4 1 3.2 1 4.7 0" opacity="0.6" />
      <path d="M4.8 17.6c2.4.8 4.8 1.2 7.2 1.2s4.8-.4 7.2-1.2" />
      <path d="M7.4 21c1.5.4 3 .6 4.6.6s3.1-.2 4.6-.6" opacity="0.6" />
    </>
  ),
  /** First Bloom — the first full flower, on its stem, leaf attached. */
  "first-bloom": (
    <>
      {petals(5, 12, 9.4, 2.2, 3.3, 6.1)}
      <circle cx="12" cy="9.4" r="1.5" />
      <path d="M12 13.2c.1 2.9-.5 5.3-1.9 7.4" />
      <path d="M10.8 17.3c-1.9.1-3.4-.7-4.4-2.4 1.9-.1 3.4.7 4.4 2.4Z" />
    </>
  ),
  /** Keeper — a shield grown around a leaf. */
  keeper: (
    <>
      <path d="M12 2.8 19 5.3v6.1c0 4.7-2.9 7.9-7 9.8-4.1-1.9-7-5.1-7-9.8V5.3Z" />
      <path d="M12 17.4c-.2-2.8.3-5.3 1.6-7.6" />
      <path d="M12.3 12.4C10.5 12.6 9 11.7 8.1 9.9c2-.1 3.5.8 4.2 2.5Z" />
      <path d="M13.5 10.2c.3-1.8 1.4-3 3.2-3.4-.2 1.9-1.3 3.1-3.2 3.4Z" />
    </>
  ),
  /** Streak — a bud rising, motion arcs lifting beside it. */
  "streak-bud": (
    <>
      <path d="M12 12.6c-2.5-1.7-3.5-4.4-2.9-7.6 1 .4 2 1.1 2.9 2.1.9-1 1.9-1.7 2.9-2.1.6 3.2-.4 5.9-2.9 7.6Z" />
      <path d="M12 12.6v6.8" />
      <path d="M4.6 19.6a10.5 10.5 0 0 1 1.8-5" />
      <path d="M19.4 19.6a10.5 10.5 0 0 0-1.8-5" />
      <path d="M7.6 21.2c1.4.5 2.9.8 4.4.8s3-.3 4.4-.8" opacity="0.6" />
    </>
  ),
  /** Century — a hundred days as a ring of petals. */
  century: (
    <>
      {petals(8, 12, 12, 2, 3.4, 8.6)}
      <circle cx="12" cy="12" r="2.1" />
    </>
  ),
  /** Year — the full fern, a whole year of fronds. */
  year: (
    <>
      <path d="M12 22C12 15 12.8 8.6 16 3.8" />
      <path d="M12.2 18.2C9.3 18.4 6.9 17.2 5.2 14.8c2.9-.2 5.3 1 7 3.4Z" />
      <path d="M12.4 13.9c-2.7.2-4.9-.9-6.5-3.1 2.7-.2 4.9.9 6.5 3.1Z" />
      <path d="M13 10c-2.3.1-4.2-.8-5.6-2.7 2.3-.1 4.2.8 5.6 2.7Z" />
      <path d="M13.8 6.6c-1.8.1-3.3-.6-4.4-2.1 1.8-.1 3.3.6 4.4 2.1Z" />
      <path d="M12.6 16.4c2 1 3.4 2.7 4.1 5" opacity="0.75" />
      <path d="M13 12.2c1.8.9 3 2.4 3.6 4.4" opacity="0.75" />
      <path d="M5 22h14" opacity="0.5" />
    </>
  ),
  /** Consistent mind — a spiral leaf, turning calmly inward. */
  "consistent-mind": (
    <>
      <path d="M12.2 12.2c0-1.8 1.4-3.2 3.2-3.2a3.6 3.6 0 0 1 3.6 3.6c0 3-2.5 5.3-5.6 5.3A6.8 6.8 0 0 1 6.6 11c.3-3.3 3-5.8 6.5-5.8 1.5 0 2.9.5 4 1.4" />
      <path d="M17.1 5.3c1.2 1.1 1.8 2.5 1.7 4.2-1.6-.5-2.7-1.7-3.1-3.4" opacity="0.8" />
    </>
  ),
  /** Milestone — a flag grown as a petal on its pole. */
  milestone: (
    <>
      <path d="M6 21.5V2.8" />
      <path d="M6 3.4c3.2-1.9 6.3-1.9 9.5 0-1.3 2.2-1.3 4.1 0 6.3-3.2-1.9-6.3-1.9-9.5 0Z" />
      <path d="M6 6.7c3.2-1.7 6.3-1.8 9.5-.3" opacity="0.6" />
      <path d="M3.4 21.5h5.6" />
    </>
  ),

  /* --------------------------------- coach --------------------------------- */

  /** Ask — a compass whose needle is a leaf. */
  ask: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M15.8 8.2 13.2 13.2l-5 2.6 2.6-5Z" />
      <circle cx="12" cy="12" r="0.9" />
    </>
  ),
  /** Reflect — still water held in a ring, one leaf afloat. */
  reflect: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M7.3 12.4h9.4" />
      <path d="M8.6 15.7h6.8" opacity="0.65" />
      <path d="M12 9.6c-1.3-.7-2-1.8-2.1-3.3 1.5.5 2.4 1.6 2.6 3.2" />
      <path d="M12 9.6c.9-1.1 2-1.7 3.4-1.7-.4 1.5-1.4 2.5-2.9 2.9" opacity="0.8" />
    </>
  ),
  /** Plan — a path with steps, ending in a bud. */
  plan: (
    <>
      <path d="M4.8 19.2c5 .2 5.4-4.4 8.2-7.1 1.6-1.6 3.4-2.3 5.5-2.6" strokeDasharray="0.2 3.2" />
      <circle cx="4.8" cy="19.2" r="1.4" />
      <path d="M18.6 9.8c-1.7-1.2-2.4-3-2-5.1.9.3 1.7.9 2.4 1.7.7-.8 1.5-1.4 2.4-1.7.4 2.1-.3 3.9-2 5.1Z" />
    </>
  ),
  /** Context — leaves stacked like pages of the record. */
  context: (
    <>
      <path d="M12 3.4c2.9 2.2 4.5 4.9 4.8 8.1-3.2.3-6-.6-8.3-2.7" opacity="0.55" />
      <path d="M7.2 11.5c3.2-.3 6 .6 8.3 2.7-.3 3.2-1.9 5.9-4.8 8.1" opacity="0.55" />
      <path d="M12 6.2c2.3 1.9 3.6 4.2 3.9 7-2.7.2-5.1-.6-7.1-2.4" />
      <path d="M8.1 13.2c2.7-.2 5.1.6 7.1 2.4-.3 2.7-1.6 5-3.9 6.9" />
    </>
  ),
  /** Memory — a ring with a vein running through it, like a leaf kept. */
  memory: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 20.2c-2.1-4.9-2.1-10.3 0-15.4 2.1 5.1 2.1 10.5 0 15.4Z" />
      <path d="M12 5.4v13.4" opacity="0.65" />
    </>
  ),

  /* ----------------------------- system / states ---------------------------- */

  /** Empty garden — a sprout over a ground arc (the §5.5 mark). */
  "empty-garden": (
    <>
      <path d="M12 20.5c-.2-4.5.2-9 1.5-12.7" />
      <path d="M12.4 10.6c-2.9.3-5.6-1.3-6.6-5 3.6.1 6.2 1.8 6.6 5Z" />
      <path d="M13.4 8.1c.3-3.1 2.3-5.2 5.6-5.6-.2 3.4-2.3 5.4-5.6 5.6Z" />
      <path d="M4.5 20.9c2.5.7 5 1.1 7.5 1.1s5-.4 7.5-1.1" />
    </>
  ),
  /** No results — a lens with a leaf resting inside it. */
  "no-results": (
    <>
      <circle cx="10.6" cy="10.6" r="6.4" />
      <path d="M15.3 15.3 20.4 20.4" />
      <path d="M10.7 13.4c-1.6-.5-2.6-1.7-2.9-3.4 1.7.4 2.8 1.5 3.2 3.2" />
      <path d="M10.7 13.4c.5-1.3 1.4-2.2 2.8-2.6-.2 1.5-1 2.5-2.3 3" opacity="0.8" />
    </>
  ),
  /** Offline — a cloud with a leaf sheltered inside it. */
  offline: (
    <>
      <path d="M7.2 18.6a4.4 4.4 0 0 1-.4-8.8 6 6 0 0 1 11.5 1.4 3.9 3.9 0 0 1-.6 7.4Z" />
      <path d="M12 16.6c-.1-1.5.3-2.8 1.2-3.9" />
      <path d="M12.2 14.2c-1.4.1-2.5-.5-3.2-1.8 1.5.1 2.6.7 3.2 1.8Z" />
    </>
  ),
  /** Error — a stem broken mid-rise, its leaf wilting. */
  error: (
    <>
      <path d="M12 21.5c0-2.9.3-5.4 1-7.9" />
      <path d="M10.2 11.4l3.8-1.7" />
      <path d="M14.6 9.9c.7-2.2 1.9-4 3.7-5.4" />
      <path d="M18.3 4.5c.3 2-.4 3.7-2 4.9-.5-1.9.2-3.6 2-4.9Z" opacity="0.8" />
      <path d="M9.8 17.2c-1.8.1-3.2-.6-4.2-2.1 1.8-.2 3.3.5 4.2 2.1Z" opacity="0.7" />
    </>
  ),
  /** Check — a tick whose long arm ends in a leaf. */
  "check-bloom": (
    <>
      <path d="M4.4 12.9 9.7 18.2 18.9 7.1" />
      <path d="M18.9 7.1c1.4-.3 2.4-1.2 2.9-2.6-1.5 0-2.7.7-3.4 2.1" />
    </>
  ),
  /** Chevron — one stroke of a leaf, pointing the way. */
  "chevron-leaf": (
    <>
      <path d="M9.2 5.4 15.4 12 9.2 18.6" />
      <path d="M11.4 12h4" opacity="0.55" />
    </>
  ),
  /** Plus — two strokes, the vertical one a young stem. */
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
      <path d="M12 5c.9-.9 2-1.4 3.3-1.4-.4 1.3-1.3 2.3-2.7 2.8" opacity="0.75" />
    </>
  ),
  /** Close — two stems crossed. */
  close: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </>
  ),
  /** Back — an arrow that arcs, like a stem bending home. */
  back: (
    <>
      <path d="M9.6 5.4 5 10l4.6 4.6" />
      <path d="M5 10h9.2a5 5 0 0 1 0 10h-3" />
    </>
  ),
  /** Calendar — a calendar page with a small bloom at its heart. */
  "calendar-bloom": (
    <>
      <rect x="3.5" y="5" width="17" height="16" rx="3" />
      <path d="M3.5 9.8h17" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
      {petals(4, 12, 15.2, 1.1, 2, 13.2)}
      <circle cx="12" cy="15.2" r="0.9" />
    </>
  ),
  /** Image — a framed view: two hills and a small sun-leaf. */
  image: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.6" />
      <circle cx="9" cy="9.6" r="1.4" />
      <path d="M4 17.8 10 12l3.4 3 2.8-2.4 3.8 3.6" />
    </>
  ),
} as const;

export type BloomIconName = keyof typeof GLYPHS;

export const BLOOM_ICON_NAMES = Object.keys(GLYPHS) as BloomIconName[];

/** True when `value` names a registry glyph (stored bloom ids, untrusted input). */
export function isBloomIconName(value: unknown): value is BloomIconName {
  return typeof value === "string" && value in GLYPHS;
}

export interface BloomIconProps {
  name: BloomIconName;
  /** Rendered size in px (square). Default 24, the grid size. */
  size?: number;
  /**
   * Stroke weight. Defaults to the §3.2 optical rule: 1.8 at small
   * sizes (≤18px), 1.6 at 20px and up.
   */
  strokeWidth?: number;
  className?: string;
}

/**
 * One registry glyph. Colour is always `currentColor`; size and stroke
 * follow the optical scale unless a caller overrides them (the sidebar's
 * active state, for instance, thickens the stroke rather than changing
 * the drawing).
 */
export function BloomIcon({ name, size = 24, strokeWidth, className }: BloomIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth ?? (size <= 18 ? 1.8 : 1.6)}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {GLYPHS[name] as ReactElement}
    </svg>
  );
}

export default BloomIcon;
