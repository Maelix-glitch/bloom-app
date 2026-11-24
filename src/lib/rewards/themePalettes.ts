/**
 * Bloom Rewards — per-theme palette values (M-238).
 *
 * The Atelier's Themes gallery shows each theme's colours before anyone
 * equips it. Those swatches must be the theme's real token values, not an
 * artist's impression, so this module mirrors the seven tokens every
 * theme block declares in src/styles.css, value for value. The themes
 * guard (themes.guard.test.ts) parses the stylesheet and fails if the
 * two ever drift apart, so what the gallery shows is what equipping
 * applies.
 */

export interface ThemePaletteEntry {
  /** The CSS custom property the theme restyles. */
  token: string;
  /** Plain label for the detail view. */
  label: string;
  /** The exact value from the theme's block in styles.css. */
  value: string;
}

const LABELS: Record<string, string> = {
  "--background": "Background",
  "--surface": "Surface",
  "--surface-2": "Raised surface",
  "--surface-3": "Highest surface",
  "--border": "Border",
  "--border-strong": "Strong border",
  "--accent-secondary": "Accent",
};

/** Token order used everywhere the palette is presented. */
export const THEME_TOKEN_ORDER = [
  "--background",
  "--surface",
  "--surface-2",
  "--surface-3",
  "--border",
  "--border-strong",
  "--accent-secondary",
] as const;

const RAW: Record<string, Record<string, string>> = {
  "th-velvet-night": {
    "--background": "oklch(0.155 0.007 85)",
    "--surface": "oklch(0.19 0.007 85)",
    "--surface-2": "oklch(0.225 0.007 85)",
    "--surface-3": "oklch(0.26 0.007 85)",
    "--border": "oklch(0.305 0.008 85)",
    "--border-strong": "oklch(0.38 0.008 85)",
    "--accent-secondary": "oklch(0.82 0.09 85)",
  },
  "th-honey-hour": {
    "--background": "oklch(0.17 0.025 55)",
    "--surface": "oklch(0.205 0.026 55)",
    "--surface-2": "oklch(0.24 0.027 55)",
    "--surface-3": "oklch(0.275 0.027 55)",
    "--border": "oklch(0.315 0.028 55)",
    "--border-strong": "oklch(0.39 0.028 55)",
    "--accent-secondary": "oklch(0.83 0.11 75)",
  },
  "th-moss-rest": {
    "--background": "oklch(0.165 0.022 165)",
    "--surface": "oklch(0.2 0.023 165)",
    "--surface-2": "oklch(0.235 0.024 165)",
    "--surface-3": "oklch(0.27 0.024 165)",
    "--border": "oklch(0.31 0.025 165)",
    "--border-strong": "oklch(0.385 0.025 165)",
    "--accent-secondary": "oklch(0.78 0.07 155)",
  },
  "th-dusk-rose": {
    "--background": "oklch(0.165 0.027 20)",
    "--surface": "oklch(0.2 0.028 20)",
    "--surface-2": "oklch(0.235 0.029 20)",
    "--surface-3": "oklch(0.27 0.029 20)",
    "--border": "oklch(0.305 0.028 20)",
    "--border-strong": "oklch(0.38 0.028 20)",
    "--accent-secondary": "oklch(0.78 0.09 10)",
  },
  "th-midnight-tide": {
    "--background": "oklch(0.165 0.005 160)",
    "--surface": "oklch(0.195 0.005 160)",
    "--surface-2": "oklch(0.22 0.005 160)",
    "--surface-3": "oklch(0.245 0.005 160)",
    "--border": "oklch(0.34 0.006 160)",
    "--border-strong": "oklch(0.4 0.006 160)",
    "--accent-secondary": "oklch(0.86 0.012 160)",
  },
  "th-ink-serenity": {
    "--background": "oklch(0.225 0.006 85)",
    "--surface": "oklch(0.26 0.006 85)",
    "--surface-2": "oklch(0.295 0.006 85)",
    "--surface-3": "oklch(0.33 0.006 85)",
    "--border": "oklch(0.35 0.007 85)",
    "--border-strong": "oklch(0.425 0.007 85)",
    "--accent-secondary": "oklch(0.87 0.02 85)",
  },
  "th-clay-court": {
    "--background": "oklch(0.17 0.028 38)",
    "--surface": "oklch(0.205 0.029 38)",
    "--surface-2": "oklch(0.24 0.03 38)",
    "--surface-3": "oklch(0.275 0.03 38)",
    "--border": "oklch(0.32 0.03 38)",
    "--border-strong": "oklch(0.395 0.03 38)",
    "--accent-secondary": "oklch(0.8 0.06 50)",
  },
  "th-brass-lamp": {
    "--background": "oklch(0.14 0.008 85)",
    "--surface": "oklch(0.175 0.008 85)",
    "--surface-2": "oklch(0.21 0.008 85)",
    "--surface-3": "oklch(0.245 0.008 85)",
    "--border": "oklch(0.33 0.01 85)",
    "--border-strong": "oklch(0.405 0.01 85)",
    "--accent-secondary": "oklch(0.79 0.11 78)",
  },
  "th-rain-leaf": {
    "--background": "oklch(0.165 0.038 145)",
    "--surface": "oklch(0.2 0.039 145)",
    "--surface-2": "oklch(0.235 0.04 145)",
    "--surface-3": "oklch(0.27 0.04 145)",
    "--border": "oklch(0.315 0.04 145)",
    "--border-strong": "oklch(0.39 0.04 145)",
    "--accent-secondary": "oklch(0.82 0.11 145)",
  },
  "th-cedar-shelf": {
    "--background": "oklch(0.175 0.024 45)",
    "--surface": "oklch(0.21 0.025 45)",
    "--surface-2": "oklch(0.245 0.026 45)",
    "--surface-3": "oklch(0.28 0.026 45)",
    "--border": "oklch(0.325 0.026 45)",
    "--border-strong": "oklch(0.4 0.026 45)",
    "--accent-secondary": "oklch(0.83 0.07 85)",
  },
  "th-rosewood": {
    "--background": "oklch(0.16 0.04 15)",
    "--surface": "oklch(0.195 0.041 15)",
    "--surface-2": "oklch(0.23 0.042 15)",
    "--surface-3": "oklch(0.265 0.042 15)",
    "--border": "oklch(0.325 0.04 15)",
    "--border-strong": "oklch(0.4 0.04 15)",
    "--accent-secondary": "oklch(0.72 0.13 12)",
  },
  "th-ember": {
    "--background": "oklch(0.125 0.001 40)",
    "--surface": "oklch(0.155 0.001 40)",
    "--surface-2": "oklch(0.185 0.001 40)",
    "--surface-3": "oklch(0.22 0.001 40)",
    "--border": "oklch(0.25 0.001 40)",
    "--border-strong": "oklch(0.325 0.001 40)",
    "--accent-secondary": "oklch(0.68 0.16 45)",
  },
};

/** The full palette of one theme, in presentation order. */
export function themePalette(themeId: string): ThemePaletteEntry[] {
  const raw = RAW[themeId];
  if (!raw) return [];
  return THEME_TOKEN_ORDER.map((token) => ({
    token,
    label: LABELS[token] ?? token,
    value: raw[token] ?? "",
  }));
}

/** Every theme id this module carries a palette for. */
export const THEME_PALETTE_IDS = Object.keys(RAW);
