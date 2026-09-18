/**
 * Bloom Story Canvas — backgrounds.
 *
 * A background is data, never a hardcoded component: a preset id or a
 * user-composed state (solid / gradient / photo) plus texture, overlay and
 * blur. The template supplies the starting point; the user owns every part
 * of it afterwards, and the composition (type, slots, decoration) is left
 * untouched so a background swap never breaks a design.
 */

import { linear, paintCanvas, paintStyle, radial, solid, type Paint } from "./paint";

/* -------------------------------- palette -------------------------------- */

export interface PaletteSwatch {
  id: string;
  label: string;
  color: string;
  /** Readable ink on top of this swatch. */
  on: string;
}

/** Bloom's own named range — warm editorial, never neon. */
export const BLOOM_PALETTE: PaletteSwatch[] = [
  { id: "warm-ivory", label: "Warm Ivory", color: "#F7F1E3", on: "#2C2415" },
  { id: "champagne", label: "Champagne", color: "#EED9A4", on: "#2C2415" },
  { id: "dusty-rose", label: "Dusty Rose", color: "#E0A3B8", on: "#2C2130" },
  { id: "lavender", label: "Lavender", color: "#B7A6E8", on: "#221D33" },
  { id: "sage", label: "Sage", color: "#9DB89A", on: "#1D2B22" },
  { id: "mist", label: "Mist", color: "#AEBFD2", on: "#1F2433" },
  { id: "midnight", label: "Midnight", color: "#221D33", on: "#F4EFE4" },
  { id: "deep-forest", label: "Deep Forest", color: "#1D2B22", on: "#EEF2E4" },
  { id: "obsidian", label: "Obsidian", color: "#14111D", on: "#F4EFE4" },
  { id: "soft-blue", label: "Soft Blue", color: "#9FB6CF", on: "#1F2433" },
  { id: "warm-beige", label: "Warm Beige", color: "#D3B795", on: "#2C2415" },
  { id: "terracotta", label: "Terracotta", color: "#C07A5E", on: "#FBF3E6" },
  { id: "muted-peach", label: "Muted Peach", color: "#F0C6A8", on: "#2C2415" },
  { id: "deep-plum", label: "Deep Plum", color: "#4A2B45", on: "#F2E4EF" },
  { id: "cloud", label: "Cloud", color: "#E8ECF4", on: "#1F2433" },
  { id: "soft-grey", label: "Soft Grey", color: "#C9C7D4", on: "#221D33" },
  { id: "butter", label: "Butter", color: "#F4E3B2", on: "#2C2415" },
  { id: "clay", label: "Clay", color: "#B98A72", on: "#FBF3E6" },
  { id: "ink-blue", label: "Ink Blue", color: "#2B3348", on: "#E8ECF4" },
  { id: "moss", label: "Moss", color: "#6E8463", on: "#F1F5E9" },
];

export function paletteById(id: string | null | undefined): PaletteSwatch | null {
  if (!id) return null;
  return BLOOM_PALETTE.find((p) => p.id === id) ?? null;
}

/** Best ink for an arbitrary color, by relative luminance. */
export function readableInk(color: string, light = "#F7F1E3", dark = "#191526"): string {
  return luminance(color) > 0.52 ? dark : light;
}

export function luminance(color: string): number {
  const rgb = parseColor(color);
  if (!rgb) return 0.5;
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }) as [number, number, number];
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

function parseColor(value: string): [number, number, number] | null {
  const hex = /^#([0-9a-f]{3,8})$/i.exec(value.trim());
  if (hex) {
    const raw = hex[1]!;
    if (raw.length === 3) {
      return [
        parseInt(raw[0]! + raw[0], 16),
        parseInt(raw[1]! + raw[1], 16),
        parseInt(raw[2]! + raw[2], 16),
      ];
    }
    return [
      parseInt(raw.slice(0, 2), 16),
      parseInt(raw.slice(2, 4), 16),
      parseInt(raw.slice(4, 6), 16),
    ];
  }
  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(value.trim());
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  return null;
}

export function withAlpha(color: string, alpha: number): string {
  const rgb = parseColor(color);
  if (!rgb) return color;
  return `rgba(${Math.round(rgb[0]!)}, ${Math.round(rgb[1]!)}, ${Math.round(rgb[2]!)}, ${alpha})`;
}

export function isValidHex(value: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value.trim());
}

export function normalizeHex(value: string): string {
  const v = value.trim();
  if (/^#[0-9a-f]{3}$/i.test(v)) {
    const h = v.slice(1);
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`.toUpperCase();
  }
  return v.toUpperCase();
}

/* ------------------------------- textures -------------------------------- */

export type TextureId = "none" | "paper" | "grain" | "linen" | "dots" | "canvas-cloth";

export const TEXTURES: { id: TextureId; name: string }[] = [
  { id: "none", name: "None" },
  { id: "paper", name: "Paper" },
  { id: "grain", name: "Grain" },
  { id: "linen", name: "Linen" },
  { id: "dots", name: "Dots" },
  { id: "canvas-cloth", name: "Cloth" },
];

const noiseSvg = (base: number, opacity: number): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="${base}" numOctaves="4" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="180" height="180" filter="url(%23n)" opacity="${opacity}"/></svg>`;

const TEXTURE_CSS: Record<TextureId, string> = {
  none: "",
  paper: `url("data:image/svg+xml,${encodeURIComponent(noiseSvg(0.9, 0.5)).replace(/#/g, "%23")}")`,
  grain: `url("data:image/svg+xml,${encodeURIComponent(noiseSvg(0.55, 0.85)).replace(/#/g, "%23")}")`,
  linen:
    "repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 4px), repeating-linear-gradient(90deg, rgba(0,0,0,0.04) 0 1px, transparent 1px 4px)",
  dots: "radial-gradient(rgba(255,255,255,0.16) 1px, transparent 1.4px)",
  "canvas-cloth":
    "repeating-linear-gradient(45deg, rgba(255,255,255,0.045) 0 2px, transparent 2px 6px), repeating-linear-gradient(-45deg, rgba(0,0,0,0.035) 0 2px, transparent 2px 6px)",
};

export function textureCss(id: TextureId): string {
  return TEXTURE_CSS[id] ?? "";
}

export const TEXTURE_SIZE: Record<TextureId, string> = {
  none: "auto",
  paper: "180px 180px",
  grain: "180px 180px",
  linen: "auto",
  dots: "14px 14px",
  "canvas-cloth": "auto",
};

/* ------------------------------- gradients ------------------------------- */

export interface GradientPreset {
  id: string;
  name: string;
  paint: Paint;
  ink: string;
}

/** Bloom's gradient range — soft, editorial, photograph-friendly. */
export const GRADIENT_PRESETS: GradientPreset[] = [
  {
    id: "first-light",
    name: "First light",
    ink: "#2C2415",
    paint: linear(175, [
      [0, "#FBF4E6"],
      [48, "#F0DFC0"],
      [100, "#E3C9A6"],
    ]),
  },
  {
    id: "linen-dusk",
    name: "Linen dusk",
    ink: "#2C2415",
    paint: linear(170, [
      [0, "#EFE6D4"],
      [60, "#E2D2B6"],
      [100, "#CDB694"],
    ]),
  },
  {
    id: "moonlight",
    name: "Moonlight",
    ink: "#F4EFE4",
    paint: radial(0.5, 0, 1.3, 0.9, [
      [0, "#3A3358"],
      [55, "#221D33"],
      [100, "#14111D"],
    ]),
  },
  {
    id: "garden",
    name: "Garden",
    ink: "#EEF2E4",
    paint: radial(0.2, 0, 1.2, 1, [
      [0, "#33473A"],
      [60, "#1D2B22"],
      [100, "#121A15"],
    ]),
  },
  {
    id: "soft-rain",
    name: "Soft rain",
    ink: "#E8ECF4",
    paint: linear(180, [
      [0, "#2B3348"],
      [55, "#232B3D"],
      [100, "#181D2B"],
    ]),
  },
  {
    id: "golden-hour",
    name: "Golden hour",
    ink: "#FBF0DD",
    paint: radial(0.5, 1.1, 1.4, 0.9, [
      [0, "#8A5A34"],
      [45, "#4A3040"],
      [100, "#221D33"],
    ]),
  },
  {
    id: "quiet-room",
    name: "Quiet room",
    ink: "#ECE7F7",
    paint: linear(180, [
      [0, "#33304A"],
      [60, "#262338"],
      [100, "#1A1828"],
    ]),
  },
  {
    id: "mist",
    name: "Mist",
    ink: "#1F2433",
    paint: linear(180, [
      [0, "#AEBFD2"],
      [55, "#8FA0B8"],
      [100, "#6E7F98"],
    ]),
  },
  {
    id: "night-bloom",
    name: "Night bloom",
    ink: "#F2E4EF",
    paint: radial(0.8, 0.1, 1.1, 0.7, [
      [0, "#5B3A5E"],
      [50, "#2C2138"],
      [100, "#14111D"],
    ]),
  },
  {
    id: "paper",
    name: "Paper",
    ink: "#2C2415",
    paint: linear(180, [
      [0, "#FAF7EF"],
      [100, "#F1EBDB"],
    ]),
  },
  {
    id: "rose-water",
    name: "Rose water",
    ink: "#2C2130",
    paint: linear(160, [
      [0, "#FBEFF1"],
      [55, "#F1D4DD"],
      [100, "#E0A3B8"],
    ]),
  },
  {
    id: "lavender-field",
    name: "Lavender field",
    ink: "#221D33",
    paint: linear(165, [
      [0, "#EFE9FB"],
      [50, "#D6C9F2"],
      [100, "#B7A6E8"],
    ]),
  },
  {
    id: "sage-morning",
    name: "Sage morning",
    ink: "#1D2B22",
    paint: linear(170, [
      [0, "#EEF3E8"],
      [55, "#CFDCBE"],
      [100, "#9DB89A"],
    ]),
  },
  {
    id: "terracotta",
    name: "Terracotta",
    ink: "#FBF3E6",
    paint: linear(172, [
      [0, "#D89A7C"],
      [60, "#C07A5E"],
      [100, "#8E4F3C"],
    ]),
  },
  {
    id: "aurora-soft",
    name: "Aurora (soft)",
    ink: "#191526",
    paint: {
      type: "layers",
      layers: [
        linear(160, [
          [0, "#F6F1EA"],
          [100, "#EDE3E8"],
        ]),
        radial(0.15, 0.1, 0.75, 0.55, [
          [0, "rgba(183,166,232,0.55)"],
          [100, "rgba(183,166,232,0)"],
        ]),
        radial(0.9, 0.35, 0.7, 0.5, [
          [0, "rgba(224,163,184,0.5)"],
          [100, "rgba(224,163,184,0)"],
        ]),
        radial(0.4, 0.95, 0.8, 0.5, [
          [0, "rgba(157,184,154,0.45)"],
          [100, "rgba(157,184,154,0)"],
        ]),
      ],
    },
  },
  {
    id: "aurora-night",
    name: "Aurora (night)",
    ink: "#F4EFE4",
    paint: {
      type: "layers",
      layers: [
        linear(170, [
          [0, "#1B1730"],
          [100, "#100E1C"],
        ]),
        radial(0.2, 0.15, 0.8, 0.5, [
          [0, "rgba(120,100,200,0.5)"],
          [100, "rgba(120,100,200,0)"],
        ]),
        radial(0.85, 0.5, 0.7, 0.55, [
          [0, "rgba(90,140,180,0.35)"],
          [100, "rgba(90,140,180,0)"],
        ]),
      ],
    },
  },
  {
    id: "deep-plum",
    name: "Deep plum",
    ink: "#F2E4EF",
    paint: linear(168, [
      [0, "#5B3557"],
      [60, "#4A2B45"],
      [100, "#2C1A2B"],
    ]),
  },
  {
    id: "midnight-sea",
    name: "Midnight sea",
    ink: "#E8ECF4",
    paint: linear(185, [
      [0, "#1E2A3A"],
      [55, "#16202E"],
      [100, "#0D141D"],
    ]),
  },
  {
    id: "butter",
    name: "Butter",
    ink: "#2C2415",
    paint: linear(168, [
      [0, "#FBF2D8"],
      [100, "#F0DFA8"],
    ]),
  },
  {
    id: "clay-studio",
    name: "Clay studio",
    ink: "#2C2415",
    paint: linear(175, [
      [0, "#EBDCCB"],
      [55, "#D9BFA4"],
      [100, "#B98A72"],
    ]),
  },
  {
    id: "snowfall",
    name: "Snowfall",
    ink: "#22283A",
    paint: linear(180, [
      [0, "#F4F7FB"],
      [100, "#D9E2EE"],
    ]),
  },
  {
    id: "ember",
    name: "Ember",
    ink: "#FBEFDF",
    paint: radial(0.5, 0.95, 1.1, 0.8, [
      [0, "#8A4A32"],
      [50, "#4B2733"],
      [100, "#201522"],
    ]),
  },
  {
    id: "obsidian",
    name: "Obsidian",
    ink: "#F4EFE4",
    paint: linear(180, [
      [0, "#1B1826"],
      [100, "#0C0A14"],
    ]),
  },
  {
    id: "cloud",
    name: "Cloud",
    ink: "#1F2433",
    paint: linear(175, [
      [0, "#F2F5FA"],
      [100, "#DCE3EE"],
    ]),
  },
];

export function gradientPresetById(id: string | null | undefined): GradientPreset | null {
  if (!id) return null;
  return GRADIENT_PRESETS.find((g) => g.id === id) ?? null;
}

/* ------------------------------ background -------------------------------- */

export type BackgroundMode = "preset" | "solid" | "gradient" | "photo";

export interface BackgroundPhoto {
  src: string;
  /** `fill` covers the canvas; `fit` letterboxes it over the base paint. */
  fit: "fill" | "fit";
  blur: number;
  zoom: number;
  panX: number;
  panY: number;
  opacity: number;
}

export interface StoryBackgroundState {
  v: 1;
  mode: BackgroundMode;
  /** Gradient preset id, or a legacy catalog id ("moonlight"…). */
  presetId: string | null;
  color: string;
  paint: Paint;
  angle: number;
  photo: BackgroundPhoto | null;
  overlay: { color: string; opacity: number } | null;
  texture: TextureId;
  textureOpacity: number;
  /** Suggested ink for text placed on this background. */
  ink: string;
}

export function solidBackground(color: string, ink?: string): StoryBackgroundState {
  return {
    v: 1,
    mode: "solid",
    presetId: null,
    color,
    paint: solid(color),
    angle: 180,
    photo: null,
    overlay: null,
    texture: "none",
    textureOpacity: 0.25,
    ink: ink ?? readableInk(color),
  };
}

export function gradientBackground(
  paint: Paint,
  presetId: string | null,
  ink: string,
  angle = 180,
): StoryBackgroundState {
  return {
    v: 1,
    mode: presetId ? "preset" : "gradient",
    presetId,
    color: "#221D33",
    paint,
    angle,
    photo: null,
    overlay: null,
    texture: "none",
    textureOpacity: 0.25,
    ink,
  };
}

export function presetBackground(id: string): StoryBackgroundState {
  const preset = gradientPresetById(id);
  if (preset) return gradientBackground(preset.paint, preset.id, preset.ink);
  const legacy = LEGACY_BY_ID.get(id);
  if (legacy) return gradientBackground(legacy.paint, legacy.id, legacy.ink);
  return gradientBackground(
    GRADIENT_PRESETS[0]!.paint,
    GRADIENT_PRESETS[0]!.id,
    GRADIENT_PRESETS[0]!.ink,
  );
}

/**
 * A shipped design backdrop: a static, generated photograph that fills the
 * canvas behind the composition. Unlike a photo *seed* (which must stay an
 * empty slot), a background image is a design asset — the person can still
 * swap or remove it at any time.
 */
export function photoBackground(
  src: string,
  ink: string,
  base = "#14111d",
): StoryBackgroundState {
  return {
    v: 1,
    mode: "photo",
    presetId: null,
    color: base,
    paint: solid(base),
    angle: 180,
    photo: { src, fit: "fill", blur: 0, zoom: 1, panX: 0, panY: 0, opacity: 1 },
    overlay: null,
    texture: "none",
    textureOpacity: 0.25,
    ink,
  };
}

/** Legacy catalog ids keep working — mapped onto the new paint language. */
const LEGACY: { id: string; name: string; paint: Paint; ink: string }[] = [
  {
    id: "moonlight",
    name: "Moonlight",
    ink: "#f4efe4",
    paint: radial(0.5, 0, 1.3, 0.9, [
      [0, "#3a3358"],
      [55, "#221d33"],
      [100, "#14111d"],
    ]),
  },
  {
    id: "morning",
    name: "Morning",
    ink: "#2c2415",
    paint: linear(175, [
      [0, "#f7f1e3"],
      [48, "#efe0c8"],
      [100, "#e3c9a6"],
    ]),
  },
  {
    id: "garden",
    name: "Garden",
    ink: "#eef2e4",
    paint: radial(0.2, 0, 1.2, 1, [
      [0, "#33473a"],
      [60, "#1d2b22"],
      [100, "#121a15"],
    ]),
  },
  {
    id: "soft-rain",
    name: "Soft rain",
    ink: "#e8ecf4",
    paint: linear(180, [
      [0, "#2b3348"],
      [55, "#232b3d"],
      [100, "#181d2b"],
    ]),
  },
  {
    id: "warm-linen",
    name: "Warm linen",
    ink: "#2c2415",
    paint: linear(170, [
      [0, "#efe6d4"],
      [60, "#e2d2b6"],
      [100, "#cdb694"],
    ]),
  },
  {
    id: "golden-hour",
    name: "Golden hour",
    ink: "#fbf0dd",
    paint: radial(0.5, 1.1, 1.4, 0.9, [
      [0, "#8a5a34"],
      [45, "#4a3040"],
      [100, "#221d33"],
    ]),
  },
  {
    id: "quiet-room",
    name: "Quiet room",
    ink: "#ece7f7",
    paint: linear(180, [
      [0, "#33304a"],
      [60, "#262338"],
      [100, "#1a1828"],
    ]),
  },
  {
    id: "mist",
    name: "Mist",
    ink: "#1f2433",
    paint: linear(180, [
      [0, "#aebfd2"],
      [55, "#8fa0b8"],
      [100, "#6e7f98"],
    ]),
  },
  {
    id: "night-bloom",
    name: "Night bloom",
    ink: "#f2e4ef",
    paint: radial(0.8, 0.1, 1.1, 0.7, [
      [0, "#5b3a5e"],
      [50, "#2c2138"],
      [100, "#14111d"],
    ]),
  },
  {
    id: "paper",
    name: "Paper",
    ink: "#2c2415",
    paint: linear(180, [
      [0, "#faf7ef"],
      [100, "#f1ebdb"],
    ]),
  },
];

const LEGACY_BY_ID = new Map(LEGACY.map((l) => [l.id, l]));

export const LEGACY_BACKGROUNDS = LEGACY;

/** Default starting canvas for a blank story. */
export function defaultBackground(): StoryBackgroundState {
  return presetBackground("moonlight");
}

/* ------------------------------ sanitizing ------------------------------- */

function isColor(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 80 &&
    (/^#[0-9a-fA-F]{3,8}$/.test(value) || /^rgba?\([\d\s.,/%]+\)$/.test(value))
  );
}

const num = (v: unknown, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

function sanitizePaint(value: unknown): Paint | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const stops = Array.isArray(raw["stops"])
    ? (raw["stops"] as unknown[])
        .map((s) => {
          if (!Array.isArray(s) || s.length < 2) return null;
          const at = Number(s[0]);
          const color = s[1];
          if (!Number.isFinite(at) || !isColor(color)) return null;
          return [Math.min(100, Math.max(0, at)), color] as const;
        })
        .filter((s): s is readonly [number, string] => s !== null)
    : [];
  if (raw["type"] === "solid" && isColor(raw["color"])) return solid(raw["color"]);
  if (raw["type"] === "linear" && stops.length >= 2) {
    return linear(num(raw["angle"], 180), stops);
  }
  if (raw["type"] === "radial" && stops.length >= 2) {
    return radial(
      Math.min(2, Math.max(-1, num(raw["cx"], 0.5))),
      Math.min(2, Math.max(-1, num(raw["cy"], 0.5))),
      Math.min(3, Math.max(0.05, num(raw["rx"], 1))),
      Math.min(3, Math.max(0.05, num(raw["ry"], 1))),
      stops,
    );
  }
  return null;
}

/** Defensive: anything malformed falls back to the default, never crashes. */
export function sanitizeBackground(value: unknown): StoryBackgroundState {
  const fallback = defaultBackground();
  if (!value || typeof value !== "object") return fallback;
  const raw = value as Record<string, unknown>;
  const mode = raw["mode"];
  const presetId = typeof raw["presetId"] === "string" ? raw["presetId"].slice(0, 48) : null;
  const color = isColor(raw["color"]) ? raw["color"] : "#221D33";
  const angle = Math.min(360, Math.max(0, num(raw["angle"], 180)));
  const ink = isColor(raw["ink"]) ? raw["ink"] : readableInk(color);
  const texture =
    typeof raw["texture"] === "string" &&
    (TEXTURES as { id: string }[]).some((t) => t.id === raw["texture"])
      ? (raw["texture"] as TextureId)
      : "none";
  const textureOpacity = Math.min(1, Math.max(0, num(raw["textureOpacity"], 0.25)));
  const overlay =
    raw["overlay"] && typeof raw["overlay"] === "object"
      ? (() => {
          const o = raw["overlay"] as Record<string, unknown>;
          return isColor(o["color"])
            ? { color: o["color"], opacity: Math.min(1, Math.max(0, num(o["opacity"], 0.3))) }
            : null;
        })()
      : null;

  const rawPhoto = raw["photo"];
  const photo: BackgroundPhoto | null =
    rawPhoto && typeof rawPhoto === "object"
      ? (() => {
          const p = rawPhoto as Record<string, unknown>;
          const src = typeof p["src"] === "string" ? p["src"].slice(0, 4_000_000) : "";
          if (!src) return null;
          return {
            src,
            fit: p["fit"] === "fit" ? "fit" : "fill",
            blur: Math.min(60, Math.max(0, num(p["blur"], 0))),
            zoom: Math.min(4, Math.max(1, num(p["zoom"], 1))),
            panX: Math.min(0.5, Math.max(-0.5, num(p["panX"], 0))),
            panY: Math.min(0.5, Math.max(-0.5, num(p["panY"], 0))),
            opacity: Math.min(1, Math.max(0, num(p["opacity"], 1))),
          };
        })()
      : null;

  if (mode === "solid") {
    return {
      v: 1,
      mode: "solid",
      presetId: null,
      color,
      paint: solid(color),
      angle,
      photo,
      overlay,
      texture,
      textureOpacity,
      ink,
    };
  }
  if (mode === "photo" && photo) {
    const paint = sanitizePaint(raw["paint"]) ?? solid(color);
    return {
      v: 1,
      mode: "photo",
      presetId,
      color,
      paint,
      angle,
      photo,
      overlay,
      texture,
      textureOpacity,
      ink,
    };
  }
  const paint = sanitizePaint(raw["paint"]);
  if (paint) {
    return {
      v: 1,
      mode: mode === "gradient" ? "gradient" : presetId ? "preset" : "gradient",
      presetId,
      color,
      paint,
      angle,
      photo,
      overlay,
      texture,
      textureOpacity,
      ink,
    };
  }
  if (presetId) return { ...presetBackground(presetId), photo, overlay, texture, textureOpacity };
  return fallback;
}

/* -------------------------------- render --------------------------------- */

export interface BackgroundLayers {
  base: React.CSSProperties;
  photoStyle: React.CSSProperties | null;
  overlayStyle: React.CSSProperties | null;
  textureStyle: React.CSSProperties | null;
}

/** The DOM layers a background renders as, in paint order. */
export function backgroundLayers(bg: StoryBackgroundState): BackgroundLayers {
  const base: React.CSSProperties = { ...paintStyle(bg.paint) };
  const photoStyle: React.CSSProperties | null = bg.photo
    ? {
        backgroundImage: `url("${bg.photo.src}")`,
        backgroundSize: bg.photo.fit === "fit" ? "contain" : "cover",
        backgroundPosition: `${50 + bg.photo.panX * 100}% ${50 + bg.photo.panY * 100}%`,
        filter: bg.photo.blur > 0 ? `blur(${bg.photo.blur}px)` : undefined,
        transform: bg.photo.zoom !== 1 ? `scale(${bg.photo.zoom})` : undefined,
        opacity: bg.photo.opacity,
      }
    : null;
  const overlayStyle: React.CSSProperties | null = bg.overlay
    ? { background: bg.overlay.color, opacity: bg.overlay.opacity }
    : null;
  const textureCssValue = textureCss(bg.texture);
  const textureStyle: React.CSSProperties | null =
    bg.texture !== "none" && textureCssValue
      ? {
          backgroundImage: textureCssValue,
          backgroundSize: TEXTURE_SIZE[bg.texture],
          opacity: bg.textureOpacity,
          mixBlendMode: bg.texture === "grain" ? "overlay" : "soft-light",
        }
      : null;
  return { base, photoStyle, overlayStyle, textureStyle };
}

export { paintCanvas };

/** Paint a background into a canvas — the export path. */
export async function paintBackground(
  ctx: CanvasRenderingContext2D,
  bg: StoryBackgroundState,
  w: number,
  h: number,
  loadImage?: (src: string) => Promise<HTMLImageElement>,
): Promise<void> {
  paintCanvas(ctx, bg.paint, w, h);

  if (bg.photo?.src && loadImage) {
    try {
      const img = await loadImage(bg.photo.src);
      ctx.save();
      ctx.globalAlpha = bg.photo.opacity;
      if (bg.photo.blur > 0) ctx.filter = `blur(${bg.photo.blur * (w / 1080)}px)`;
      const zoom = bg.photo.zoom;
      const cover = Math.max(w / img.width, h / img.height);
      const contain = Math.min(w / img.width, h / img.height);
      const scale = (bg.photo.fit === "fit" ? contain : cover) * zoom;
      const dw = img.width * scale;
      const dh = img.height * scale;
      const dx = (w - dw) / 2 + bg.photo.panX * (dw - w);
      const dy = (h - dh) / 2 + bg.photo.panY * (dh - h);
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.restore();
      ctx.filter = "none";
    } catch {
      /* a missing photo keeps the gradient underneath — never a black hole */
    }
  }

  if (bg.overlay) {
    ctx.save();
    ctx.globalAlpha = bg.overlay.opacity;
    ctx.fillStyle = bg.overlay.color;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  if (bg.texture !== "none") {
    await paintTexture(ctx, bg.texture, bg.textureOpacity, w, h);
  }
}

const textureImageCache = new Map<TextureId, HTMLImageElement | null>();

async function paintTexture(
  ctx: CanvasRenderingContext2D,
  texture: TextureId,
  opacity: number,
  w: number,
  h: number,
): Promise<void> {
  const css = textureCss(texture);
  if (!css) return;
  const url = /^url\("(.*)"\)$/.exec(css)?.[1];
  if (!url) return;
  let img = textureImageCache.get(texture);
  if (img === undefined) {
    img = await new Promise<HTMLImageElement | null>((resolve) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => resolve(null);
      el.src = url;
    });
    textureImageCache.set(texture, img);
  }
  if (!img) return;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.globalCompositeOperation = texture === "grain" ? "overlay" : "soft-light";
  const pattern = ctx.createPattern(img, "repeat");
  if (pattern) {
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}

/* --------------------------- recents + saved ----------------------------- */

const RECENT_KEY = "bloom.story.backgrounds.recent.v1";
const SAVED_KEY = "bloom.story.backgrounds.saved.v1";

function readList(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? list.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function writeList(key: string, ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(ids.slice(0, 16)));
  } catch {
    /* best-effort */
  }
}

export function recentBackgrounds(): string[] {
  return readList(RECENT_KEY);
}

export function savedBackgrounds(): string[] {
  return readList(SAVED_KEY);
}

export function rememberBackground(id: string): void {
  if (!id) return;
  writeList(RECENT_KEY, [id, ...readList(RECENT_KEY).filter((x) => x !== id)]);
}

export function saveBackground(id: string): string[] {
  const list = readList(SAVED_KEY);
  const next = list.includes(id) ? list.filter((x) => x !== id) : [id, ...list];
  writeList(SAVED_KEY, next);
  return next;
}
