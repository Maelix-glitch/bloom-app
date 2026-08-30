/**
 * The five design directions for Cycle Intelligence. Themes are pure CSS
 * custom properties (see src/styles/cycle2.css) — this file only carries the
 * metadata the style gallery needs to show and compare them.
 */

export interface CycleTheme {
  id: string;
  name: string;
  tagline: string;
  description: string;
  /** Swatch row: ground, surface, ink, then the four phase hues. */
  palette: { label: string; hex: string }[];
  traits: string[];
  best: string;
}

export const CYCLE_THEMES: CycleTheme[] = [
  {
    id: "nocturne",
    name: "Nocturne",
    tagline: "Charcoal-teal ground, warm off-white ink",
    description:
      "The default. A deep teal-leaning charcoal with hairline-bordered cards, a berry bleed phase and gold ovulation. Calm, editorial, reads well at night — which is when most people check.",
    palette: [
      { label: "Ground", hex: "#0c1416" },
      { label: "Surface", hex: "#121c1f" },
      { label: "Ink", hex: "#f1ebe0" },
      { label: "Menstrual", hex: "#c4567f" },
      { label: "Follicular", hex: "#4fb3a0" },
      { label: "Ovulation", hex: "#e5b45e" },
      { label: "Luteal", hex: "#3f8f93" },
    ],
    traits: ["Hairline 1px cards", "14px radius", "Fraunces + Space Grotesk", "Quiet radial glow"],
    best: "The main direction — calm, legible, distinctive without being loud.",
  },
  {
    id: "orchid",
    name: "Orchid ink",
    tagline: "Plum-black ground, orchid and jade",
    description:
      "Warmer and more saturated than Nocturne. Charcoal-plum surfaces with a faint inner highlight, rounder 20px corners, and an orchid bleed phase against jade and brass.",
    palette: [
      { label: "Ground", hex: "#12101a" },
      { label: "Surface", hex: "#1a1626" },
      { label: "Ink", hex: "#f4edf4" },
      { label: "Menstrual", hex: "#d2608f" },
      { label: "Follicular", hex: "#52b69b" },
      { label: "Ovulation", hex: "#e3b55e" },
      { label: "Luteal", hex: "#3e8c90" },
    ],
    traits: ["Glassy raised panels", "20px radius", "Inner top highlight", "Deepest shadow"],
    best: "When you want the page to feel a little more luxurious and less clinical.",
  },
  {
    id: "tide",
    name: "Deep tide",
    tagline: "Slate-blue ground, crisp and technical",
    description:
      "The most instrument-like direction: slate-blue charcoal, tight 10px radii, no drop shadows, heavier rules between rows. Raspberry, aqua and saffron do the semantic work.",
    palette: [
      { label: "Ground", hex: "#0d1620" },
      { label: "Surface", hex: "#131f2a" },
      { label: "Ink", hex: "#edf1f5" },
      { label: "Menstrual", hex: "#c4557a" },
      { label: "Follicular", hex: "#3fb6c6" },
      { label: "Ovulation", hex: "#edbb5f" },
      { label: "Luteal", hex: "#2f8ca0" },
    ],
    traits: ["Flat, shadowless", "10px radius", "Stronger rules", "Cool neutral ink"],
    best: "When data density matters — the busiest cycles still read cleanly.",
  },
  {
    id: "fern",
    name: "Fern & fig",
    tagline: "Charcoal-green ground, shadow-built surfaces",
    description:
      "Drops borders almost entirely: cards are separated by depth alone, with a deep green-black ground, fig bleed phase, fern follicular and soft 18px geometry.",
    palette: [
      { label: "Ground", hex: "#0d1512" },
      { label: "Surface", hex: "#131e19" },
      { label: "Ink", hex: "#eef1e7" },
      { label: "Menstrual", hex: "#b4547c" },
      { label: "Follicular", hex: "#4fb38a" },
      { label: "Ovulation", hex: "#dfb35c" },
      { label: "Luteal", hex: "#2e8570" },
    ],
    traits: ["Border-free depth", "18px radius", "Softest contrast", "Green-leaning teal"],
    best: "A gentler, more organic read — good if Nocturne feels too cool.",
  },
  {
    id: "daybreak",
    name: "Daybreak",
    tagline: "The same page in daylight",
    description:
      "A light counterpart, included for contrast rather than as the main direction: warm paper, ink text, and the same four phase hues darkened to hold contrast. Useful for bright rooms and screenshots.",
    palette: [
      { label: "Paper", hex: "#f3efe6" },
      { label: "Surface", hex: "#fbf9f3" },
      { label: "Ink", hex: "#1b211e" },
      { label: "Menstrual", hex: "#a63e68" },
      { label: "Follicular", hex: "#1f7f74" },
      { label: "Ovulation", hex: "#a8781f" },
      { label: "Luteal", hex: "#16636f" },
    ],
    traits: ["Light scheme", "12px radius", "Paper + ink", "Muted accent wash"],
    best: "An alternate, not the brief — pick it if the app is mostly used in daylight.",
  },
];

export const DEFAULT_THEME_ID = "nocturne";

export function themeById(id: string | null | undefined): CycleTheme {
  return CYCLE_THEMES.find((t) => t.id === id) ?? CYCLE_THEMES[0]!;
}
