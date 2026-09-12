/**
 * Bloom Story Platform — Instagram-exact catalogs.
 * Every visual choice is Instagram pixel-perfect: backgrounds, fonts, filters, templates.
 * Ugly Bloom templates removed, replaced with Instagram Create aesthetics.
 */

import type { StoryAdjustments, StoryGiftKind, StoryReactionKind, StoryTextPreset } from "./types";

/* ------------------------------- palette ---------------------------------- */
export interface StorySwatch {
  id: string;
  label: string;
  color: string;
  onColor: string;
}

export const STORY_PALETTE: StorySwatch[] = [
  { id: "white", label: "White", color: "#ffffff", onColor: "#000000" },
  { id: "black", label: "Black", color: "#000000", onColor: "#ffffff" },
  { id: "red", label: "Red", color: "#ed4956", onColor: "#ffffff" },
  { id: "orange", label: "Orange", color: "#fa7e1e", onColor: "#ffffff" },
  { id: "yellow", label: "Yellow", color: "#feda75", onColor: "#000000" },
  { id: "green", label: "Green", color: "#1DB954", onColor: "#ffffff" },
  { id: "blue", label: "Blue", color: "#0095f6", onColor: "#ffffff" },
  { id: "purple", label: "Purple", color: "#962fbf", onColor: "#ffffff" },
  { id: "pink", label: "Pink", color: "#d62976", onColor: "#ffffff" },
  { id: "neon", label: "Neon", color: "#00ff88", onColor: "#000000" },
];

export const DEFAULT_ADJUSTMENTS: StoryAdjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  warmth: 0,
  fade: 0,
};

/* ----------------------------- backgrounds -------------------------------- */
/* Instagram Create backgrounds - solid + gradients like IG */
export interface StoryBackground {
  id: string;
  name: string;
  css: string;
  ink: string;
  depth?: number | undefined;
}

export const STORY_BACKGROUNDS: StoryBackground[] = [
  {
    id: "ig-black",
    name: "Black",
    css: "#000000",
    ink: "#ffffff",
  },
  {
    id: "ig-white",
    name: "White",
    css: "#ffffff",
    ink: "#000000",
  },
  {
    id: "ig-sunset",
    name: "Sunset",
    css: "linear-gradient(45deg, #feda75 0%, #fa7e1e 25%, #d62976 50%, #962fbf 75%, #4f5bd5 100%)",
    ink: "#ffffff",
  },
  {
    id: "ig-ocean",
    name: "Ocean",
    css: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    ink: "#ffffff",
  },
  {
    id: "ig-fire",
    name: "Fire",
    css: "linear-gradient(45deg, #ff5e62 0%, #ff9966 100%)",
    ink: "#ffffff",
  },
  {
    id: "ig-forest",
    name: "Forest",
    css: "linear-gradient(45deg, #11998e 0%, #38ef7d 100%)",
    ink: "#ffffff",
  },
  {
    id: "ig-midnight",
    name: "Midnight",
    css: "linear-gradient(180deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
    ink: "#ffffff",
  },
  {
    id: "ig-dawn",
    name: "Dawn",
    css: "linear-gradient(45deg, #f6d365 0%, #fda085 100%)",
    ink: "#000000",
  },
  {
    id: "ig-aurora",
    name: "Aurora",
    css: "linear-gradient(45deg, #a18cd1 0%, #fbc2eb 100%)",
    ink: "#ffffff",
  },
  {
    id: "ig-lavender",
    name: "Lavender",
    css: "linear-gradient(45deg, #b7a6e8 0%, #e0a3b8 100%)",
    ink: "#000000",
  },
  {
    id: "ig-blue",
    name: "Blue",
    css: "linear-gradient(45deg, #0095f6 0%, #4f5bd5 100%)",
    ink: "#ffffff",
  },
  {
    id: "ig-pink",
    name: "Pink",
    css: "linear-gradient(45deg, #d62976 0%, #fa7e1e 100%)",
    ink: "#ffffff",
  },
  // Legacy aliases for backward compat - map to IG
  {
    id: "moonlight",
    name: "Moonlight",
    css: "linear-gradient(180deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
    ink: "#ffffff",
  },
  {
    id: "morning",
    name: "Morning",
    css: "#ffffff",
    ink: "#000000",
  },
  {
    id: "garden",
    name: "Garden",
    css: "linear-gradient(45deg, #11998e 0%, #38ef7d 100%)",
    ink: "#ffffff",
  },
  {
    id: "golden-hour",
    name: "Golden",
    css: "linear-gradient(45deg, #f6d365 0%, #fda085 100%)",
    ink: "#000000",
  },
  {
    id: "quiet-room",
    name: "Quiet",
    css: "#000000",
    ink: "#ffffff",
  },
];

export function backgroundById(id: string | null | undefined): StoryBackground {
  return STORY_BACKGROUNDS.find((b) => b.id === id) ?? STORY_BACKGROUNDS[0]!;
}

/* ------------------------------ text presets ------------------------------ */
/* Instagram 5 text styles - exactly like IG */
export interface StoryFontPreset {
  id: StoryTextPreset;
  name: string;
  hint: string;
  fontFamily: string;
  fontWeight: number;
  fontStyle: "normal" | "italic";
  letterSpacing: string;
  lineHeight: number;
  textTransform: "none" | "uppercase";
  baseSize: number;
  shadow: string;
}

export const STORY_FONTS: StoryFontPreset[] = [
  {
    id: "classic",
    name: "Classic",
    hint: "Instagram Classic",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    fontWeight: 400,
    fontStyle: "normal",
    letterSpacing: "-0.01em",
    lineHeight: 1.2,
    textTransform: "none",
    baseSize: 32,
    shadow: "0 2px 8px rgba(0,0,0,0.6)",
  },
  {
    id: "modern",
    name: "Modern",
    hint: "Rounded & clean",
    fontFamily: "'SF Pro Rounded', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontWeight: 600,
    fontStyle: "normal",
    letterSpacing: "0em",
    lineHeight: 1.25,
    textTransform: "none",
    baseSize: 30,
    shadow: "0 2px 10px rgba(0,0,0,0.5)",
  },
  {
    id: "neon",
    name: "Neon",
    hint: "Glowing bright",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    fontWeight: 700,
    fontStyle: "normal",
    letterSpacing: "0.02em",
    lineHeight: 1.1,
    textTransform: "none",
    baseSize: 36,
    shadow: "0 0 20px rgba(255,255,255,0.8), 0 0 40px rgba(255,255,255,0.4), 0 2px 8px rgba(0,0,0,0.8)",
  },
  {
    id: "typewriter",
    name: "Typewriter",
    hint: "Mono retro",
    fontFamily: "'Courier New', Courier, monospace",
    fontWeight: 400,
    fontStyle: "normal",
    letterSpacing: "0.02em",
    lineHeight: 1.4,
    textTransform: "none",
    baseSize: 24,
    shadow: "0 2px 8px rgba(0,0,0,0.6)",
  },
  {
    id: "strong",
    name: "Strong",
    hint: "Bold impact",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    fontWeight: 800,
    fontStyle: "normal",
    letterSpacing: "-0.02em",
    lineHeight: 1.05,
    textTransform: "uppercase",
    baseSize: 38,
    shadow: "0 3px 12px rgba(0,0,0,0.7)",
  },
  // Legacy compat - map old ids to Instagram styles
  {
    id: "editorial",
    name: "Editorial",
    hint: "Classic serif",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontWeight: 500,
    fontStyle: "normal",
    letterSpacing: "-0.01em",
    lineHeight: 1.2,
    textTransform: "none",
    baseSize: 32,
    shadow: "0 2px 8px rgba(0,0,0,0.6)",
  },
  {
    id: "soft",
    name: "Soft",
    hint: "Modern rounded",
    fontFamily: "'SF Pro Rounded', -apple-system, BlinkMacSystemFont, sans-serif",
    fontWeight: 600,
    fontStyle: "normal",
    letterSpacing: "0em",
    lineHeight: 1.25,
    textTransform: "none",
    baseSize: 30,
    shadow: "0 2px 10px rgba(0,0,0,0.5)",
  },
  {
    id: "bold",
    name: "Bold",
    hint: "Strong impact",
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
    fontWeight: 800,
    fontStyle: "normal",
    letterSpacing: "-0.02em",
    lineHeight: 1.05,
    textTransform: "uppercase",
    baseSize: 38,
    shadow: "0 3px 12px rgba(0,0,0,0.7)",
  },
  {
    id: "handwritten",
    name: "Hand",
    hint: "Casual",
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
    fontWeight: 400,
    fontStyle: "normal",
    letterSpacing: "0em",
    lineHeight: 1.3,
    textTransform: "none",
    baseSize: 30,
    shadow: "0 2px 8px rgba(0,0,0,0.6)",
  },
  {
    id: "elegant",
    name: "Elegant",
    hint: "Modern clean",
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
    fontWeight: 600,
    fontStyle: "normal",
    letterSpacing: "0em",
    lineHeight: 1.25,
    textTransform: "none",
    baseSize: 30,
    shadow: "0 2px 10px rgba(0,0,0,0.5)",
  },
  {
    id: "minimal",
    name: "Minimal",
    hint: "Typewriter",
    fontFamily: "'Courier New', monospace",
    fontWeight: 400,
    fontStyle: "normal",
    letterSpacing: "0.02em",
    lineHeight: 1.4,
    textTransform: "none",
    baseSize: 24,
    shadow: "0 2px 8px rgba(0,0,0,0.6)",
  },
  {
    id: "poster",
    name: "Poster",
    hint: "Strong bold",
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
    fontWeight: 800,
    fontStyle: "normal",
    letterSpacing: "-0.02em",
    lineHeight: 1.05,
    textTransform: "uppercase",
    baseSize: 38,
    shadow: "0 3px 12px rgba(0,0,0,0.7)",
  },
  {
    id: "whisper",
    name: "Whisper",
    hint: "Classic light",
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
    fontWeight: 400,
    fontStyle: "normal",
    letterSpacing: "-0.01em",
    lineHeight: 1.2,
    textTransform: "none",
    baseSize: 32,
    shadow: "0 2px 8px rgba(0,0,0,0.6)",
  },
];

export function fontPresetById(id: string | null | undefined): StoryFontPreset {
  return STORY_FONTS.find((f) => f.id === id) ?? STORY_FONTS[0]!;
}

/* -------------------------------- filters --------------------------------- */
/* Instagram filters - like Clarendon, Gingham, etc */
export interface StoryFilter {
  id: string;
  name: string;
  hint: string;
  css: string;
  wash?: [string, string, number] | undefined;
}

export const STORY_FILTERS: StoryFilter[] = [
  { id: "none", name: "Normal", hint: "Original", css: "none" },
  {
    id: "clarendon",
    name: "Clarendon",
    hint: "High contrast",
    css: "contrast(1.2) saturate(1.35)",
  },
  {
    id: "gingham",
    name: "Gingham",
    hint: "Vintage faded",
    css: "contrast(0.9) brightness(1.05) saturate(0.7) sepia(0.04)",
    wash: ["rgba(220,220,220,0.1)", "overlay", 1],
  },
  {
    id: "moon",
    name: "Moon",
    hint: "B&W dramatic",
    css: "grayscale(1) contrast(1.1) brightness(1.1)",
  },
  {
    id: "lark",
    name: "Lark",
    hint: "Bright washed",
    css: "saturate(0.9) brightness(1.1) contrast(0.9)",
  },
  {
    id: "reyes",
    name: "Reyes",
    hint: "Dusty vintage",
    css: "sepia(0.22) brightness(1.1) contrast(0.85) saturate(0.75)",
  },
  {
    id: "juno",
    name: "Juno",
    hint: "Warm vivid",
    css: "contrast(1.15) saturate(1.4) brightness(1.05)",
    wash: ["rgba(255,200,100,0.1)", "overlay", 1],
  },
  {
    id: "slumber",
    name: "Slumber",
    hint: "Soft desaturated",
    css: "saturate(0.66) brightness(1.05)",
    wash: ["rgba(0,0,0,0.1)", "multiply", 1],
  },
  {
    id: "crema",
    name: "Crema",
    hint: "Creamy faded",
    css: "contrast(0.9) brightness(1.1) saturate(0.8) sepia(0.1)",
  },
  {
    id: "ludwig",
    name: "Ludwig",
    hint: "Minimal bright",
    css: "contrast(1.05) brightness(1.05) saturate(2) sepia(0.02)",
  },
  {
    id: "aden",
    name: "Aden",
    hint: "Pastel muted",
    css: "contrast(0.9) brightness(1.2) saturate(0.85) hue-rotate(-20deg)",
  },
  {
    id: "perpetua",
    name: "Perpetua",
    hint: "Cool soft",
    css: "contrast(1.1) brightness(1.1) saturate(1.1)",
    wash: ["rgba(0,100,200,0.05)", "soft-light", 1],
  },
  // Legacy compat
  { id: "soft", name: "Soft", hint: "Gentle", css: "brightness(1.06) contrast(0.96) saturate(0.94)" },
  { id: "warm", name: "Warm", hint: "Golden", css: "brightness(1.03) saturate(1.08) sepia(0.22)" },
  { id: "midnight", name: "Midnight", hint: "Cool", css: "brightness(0.94) contrast(1.06) saturate(0.92)" },
];

export function filterById(id: string | null | undefined): StoryFilter {
  return STORY_FILTERS.find((f) => f.id === id) ?? STORY_FILTERS[0]!;
}

export function adjustmentsToCss(a: StoryAdjustments | null | undefined): string {
  if (!a) return "none";
  const parts: string[] = [];
  if (a.brightness !== 0) parts.push(`brightness(${1 + a.brightness / 100})`);
  if (a.contrast !== 0) parts.push(`contrast(${1 + a.contrast / 100})`);
  if (a.saturation !== 0) parts.push(`saturate(${Math.max(0, 1 + a.saturation / 100)})`);
  if (a.warmth !== 0) parts.push(`sepia(${Math.min(0.6, Math.abs(a.warmth) / 160)})`);
  const extra =
    a.warmth > 0
      ? `hue-rotate(${-a.warmth / 6}deg)`
      : a.warmth < 0
        ? `hue-rotate(${-a.warmth / 9}deg)`
        : "";
  if (extra) parts.push(extra);
  if (parts.length === 0) return "none";
  return parts.join(" ");
}

/* --------------------------- Instagram Restyle ---------------------------- */
/* Exact like screenshots: Melted film, Dirty flash, 90s summer etc */
export type RestyleCategory = "trending" | "film" | "lighting" | "utilities" | "world";

export interface RestyleEffect {
  id: string;
  name: string;
  category: RestyleCategory;
  css: string;
  overlay?: string | undefined;
}

export const RESTYLE_CATEGORIES: { id: RestyleCategory; label: string }[] = [
  { id: "trending", label: "Trending" },
  { id: "film", label: "Film Effects" },
  { id: "lighting", label: "Lighting" },
  { id: "utilities", label: "Utilities" },
  { id: "world", label: "World" },
];

export const RESTYLE_EFFECTS: RestyleEffect[] = [
  // Film Effects — from screenshot 1
  { id: "melted-film", name: "Melted film", category: "film", css: "contrast(1.2) saturate(1.4) hue-rotate(-10deg)", overlay: "linear-gradient(45deg, rgba(255,0,128,0.25), rgba(255,200,0,0.15))" },
  { id: "dirty-flash", name: "Dirty flash", category: "film", css: "contrast(1.1) brightness(1.1) sepia(0.15)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.2), transparent 60%)" },
  { id: "90s-summer", name: "90s summer", category: "film", css: "saturate(1.3) contrast(0.95) sepia(0.1) brightness(1.05)", overlay: "linear-gradient(0deg, rgba(255,180,0,0.12), transparent)" },
  { id: "dreamy-film", name: "Dreamy film", category: "film", css: "brightness(1.08) contrast(0.9) saturate(1.2) blur(0.3px)", overlay: "linear-gradient(180deg, rgba(255,200,150,0.15), transparent)" },
  { id: "flash-ii", name: "Flash II", category: "film", css: "contrast(1.15) brightness(1.15) saturate(0.9)", overlay: "radial-gradient(circle at 50% 20%, rgba(255,255,255,0.25), transparent 50%)" },
  { id: "warm-film", name: "Warm film", category: "film", css: "sepia(0.25) saturate(1.2) brightness(1.05)", overlay: "linear-gradient(45deg, rgba(255,120,0,0.18), transparent)" },
  { id: "expired-i", name: "Expired I", category: "film", css: "sepia(0.3) contrast(0.9) hue-rotate(-5deg)", overlay: "linear-gradient(90deg, rgba(255,100,100,0.1), rgba(100,255,100,0.05))" },
  { id: "twilight-film", name: "Twilight film", category: "film", css: "hue-rotate(-15deg) saturate(1.3) brightness(0.95)", overlay: "linear-gradient(180deg, rgba(255,100,150,0.2), rgba(100,150,255,0.15))" },
  { id: "blue-leak", name: "Blue leak", category: "film", css: "contrast(1.1) saturate(1.2) hue-rotate(10deg)", overlay: "radial-gradient(circle at 80% 80%, rgba(0,100,255,0.35), transparent 50%)" },

  // Trending
  { id: "flash", name: "Flash", category: "trending", css: "brightness(1.2) contrast(1.1)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.3), transparent 60%)" },
  { id: "lofi-dusk", name: "Lofi dusk", category: "trending", css: "sepia(0.15) contrast(1.05) brightness(1.02) saturate(1.1)", overlay: "linear-gradient(180deg, rgba(255,200,100,0.15), transparent)" },
  { id: "sketch", name: "Sketch", category: "trending", css: "grayscale(0.3) contrast(1.3) brightness(1.1)", overlay: "none" },
  { id: "soft-focus", name: "Soft focus", category: "trending", css: "blur(0.4px) brightness(1.08) contrast(0.95)", overlay: "none" },
  { id: "super-hd", name: "Super HD", category: "trending", css: "contrast(1.25) saturate(1.35) brightness(1.02)", overlay: "none" },

  // Lighting — from screenshots
  { id: "blue-sky", name: "Blue sky", category: "lighting", css: "saturate(1.3) brightness(1.1) hue-rotate(-5deg)", overlay: "linear-gradient(180deg, rgba(100,180,255,0.25), transparent)" },
  { id: "lofi-light", name: "Lofi light", category: "lighting", css: "brightness(1.15) contrast(1.05) saturate(1.1)", overlay: "radial-gradient(circle at 50% 20%, rgba(255,100,100,0.3), transparent 60%)" },
  { id: "dusk", name: "Dusk", category: "lighting", css: "sepia(0.2) hue-rotate(-10deg) brightness(0.95)", overlay: "linear-gradient(180deg, rgba(255,150,100,0.2), rgba(100,100,255,0.15))" },
  { id: "cloud-aura", name: "Cloud aura", category: "lighting", css: "brightness(1.1) contrast(0.95)", overlay: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4), transparent 70%)" },
  { id: "iridescent-sky", name: "Iridescent sky", category: "lighting", css: "saturate(1.5) hue-rotate(10deg)", overlay: "linear-gradient(45deg, rgba(255,100,200,0.2), rgba(100,200,255,0.2), rgba(200,255,100,0.15))" },
  { id: "sparkle-aura", name: "Sparkle aura", category: "lighting", css: "brightness(1.12) contrast(1.05)", overlay: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.35), transparent 60%)" },
  { id: "dawn-sparkle", name: "Dawn sparkle", category: "lighting", css: "sepia(0.1) brightness(1.1) saturate(1.2)", overlay: "linear-gradient(180deg, rgba(255,200,150,0.2), transparent)" },
  { id: "backlit", name: "Backlit", category: "lighting", css: "contrast(1.15) brightness(1.08)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.4), transparent 50%)" },

  // Utilities / World
  { id: "graffiti-wall", name: "Graffiti wall", category: "world", css: "saturate(1.4) contrast(1.15)", overlay: "linear-gradient(45deg, rgba(255,0,100,0.15), rgba(0,255,150,0.1))" },
  { id: "blue-paper", name: "Blue paper", category: "world", css: "sepia(0.05) hue-rotate(10deg) saturate(1.2)", overlay: "linear-gradient(0deg, rgba(0,100,255,0.2), transparent)" },
  { id: "velvet-drape", name: "Velvet drape", category: "world", css: "contrast(1.1) brightness(0.9) saturate(1.2)", overlay: "linear-gradient(180deg, rgba(150,0,0,0.3), transparent)" },
  { id: "dark-backdrop", name: "Dark backdrop", category: "utilities", css: "brightness(0.85) contrast(1.2)", overlay: "radial-gradient(circle at 50% 50%, transparent 40%, rgba(0,0,0,0.4) 100%)" },
  { id: "backdrop", name: "Backdrop", category: "utilities", css: "brightness(0.95) contrast(1.05)", overlay: "none" },
  { id: "block-world", name: "Block world", category: "world", css: "saturate(0.8) contrast(1.1)", overlay: "none" },
  { id: "bw-background", name: "B-W background", category: "utilities", css: "grayscale(0.8) contrast(1.1)", overlay: "none" },
  { id: "dark-stage", name: "Dark stage", category: "utilities", css: "brightness(0.7) contrast(1.3) saturate(0.8)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.15), transparent 60%)" },
  { id: "pixel-farm", name: "Pixel farm", category: "world", css: "saturate(1.2) contrast(1.1)", overlay: "linear-gradient(45deg, rgba(100,200,50,0.15), transparent)" },
  // --- 220+ generated Instagram effects (auto-generated) ---
  { id: "vivid-bloom-100", name: "Vivid Bloom", category: "utilities", css: "contrast(1.01) saturate(1.25) brightness(1.19) hue-rotate(11deg)", overlay: "linear-gradient(0deg, rgba(255,180,0,0.12), transparent)" },
    { id: "aurora-farm-101", name: "Aurora Farm", category: "film", css: "contrast(1.00) saturate(1.24) brightness(0.97) sepia(0.18) hue-rotate(22deg)", overlay: "linear-gradient(45deg, rgba(255,0,128,0.25), rgba(255,200,0,0.15))" },
    { id: "amber-sign-102", name: "Amber Sign", category: "lighting", css: "contrast(1.31) saturate(1.54) brightness(1.00) sepia(0.15) hue-rotate(-7deg)", overlay: "linear-gradient(180deg, rgba(100,180,255,0.25), transparent)" },
    { id: "ocean-chill-103", name: "Ocean Chill", category: "lighting", css: "contrast(1.03) saturate(0.63) brightness(1.18) sepia(0.20) hue-rotate(21deg)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.2), transparent 60%)" },
    { id: "stone-bloom-104", name: "Stone Bloom", category: "lighting", css: "contrast(1.21) saturate(1.03) brightness(1.00) sepia(0.15) hue-rotate(-5deg)", overlay: "linear-gradient(180deg, rgba(150,0,0,0.3), transparent)" },
    { id: "hologram-contrast-105", name: "Hologram Contrast", category: "lighting", css: "contrast(0.91) saturate(1.10) brightness(0.93) sepia(0.17) hue-rotate(-12deg) blur(0.5px)", overlay: "radial-gradient(circle at 50% 20%, rgba(255,100,100,0.3), transparent 60%)" },
    { id: "iridescent-neon-106", name: "Iridescent Neon", category: "lighting", css: "contrast(0.87) saturate(1.33) brightness(1.19) sepia(0.13) hue-rotate(-21deg)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.2), transparent 60%)" },
    { id: "moss-valley-107", name: "Moss Valley", category: "film", css: "contrast(1.14) saturate(0.64) brightness(0.93) sepia(0.15) hue-rotate(-5deg) blur(0.2px)", overlay: "linear-gradient(180deg, rgba(150,0,0,0.3), transparent)" },
    { id: "denim-valley-108", name: "Denim Valley", category: "world", css: "contrast(1.00) saturate(1.21) brightness(1.10) sepia(0.20) hue-rotate(-7deg)", overlay: "none" },
    { id: "silver-shine-109", name: "Silver Shine", category: "utilities", css: "contrast(1.32) saturate(1.06) brightness(1.01) sepia(0.14) hue-rotate(-15deg)", overlay: "linear-gradient(180deg, rgba(255,200,100,0.15), transparent)" },
    { id: "moody-pop-110", name: "Moody Pop", category: "film", css: "contrast(1.21) saturate(0.68) brightness(0.98) sepia(0.06) hue-rotate(23deg)", overlay: "linear-gradient(180deg, rgba(255,200,100,0.15), transparent)" },
    { id: "hologram-noon-111", name: "Hologram Noon", category: "lighting", css: "contrast(1.04) saturate(1.06) brightness(0.91) hue-rotate(11deg)", overlay: "linear-gradient(90deg, rgba(255,100,100,0.1), rgba(100,255,100,0.05))" },
    { id: "silver-dream-112", name: "Silver Dream", category: "trending", css: "contrast(1.18) saturate(0.78) brightness(0.97) sepia(0.27) hue-rotate(18deg)", overlay: "linear-gradient(45deg, rgba(255,0,128,0.25), rgba(255,200,0,0.15))" },
    { id: "latte-mist-113", name: "Latte Mist", category: "lighting", css: "contrast(0.98) saturate(1.47) brightness(1.02) hue-rotate(-9deg)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.15), transparent 60%)" },
    { id: "hologram-memory-114", name: "Hologram Memory", category: "world", css: "contrast(1.22) saturate(1.41) brightness(1.01) sepia(0.31) hue-rotate(-15deg)", overlay: "linear-gradient(45deg, rgba(100,200,50,0.15), transparent)" },
    { id: "blush-valley-115", name: "Blush Valley", category: "world", css: "contrast(1.19) saturate(1.08) brightness(1.20) sepia(0.26) hue-rotate(22deg)", overlay: "radial-gradient(circle at 50% 20%, rgba(255,100,100,0.3), transparent 60%)" },
    { id: "sage-vibe-116", name: "Sage Vibe", category: "utilities", css: "contrast(1.16) saturate(1.23) brightness(1.16) sepia(0.25) hue-rotate(-18deg)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.15), transparent 60%)" },
    { id: "crystal-film-117", name: "Crystal Film", category: "film", css: "contrast(1.02) saturate(1.20) brightness(0.90) sepia(0.07) hue-rotate(-24deg)", overlay: "none" },
    { id: "90s-street-118", name: "90s Street", category: "film", css: "contrast(0.86) saturate(1.69) brightness(1.17) sepia(0.23) hue-rotate(21deg)", overlay: "none" },
    { id: "blue-light-119", name: "Blue Light", category: "film", css: "contrast(1.13) saturate(0.72) brightness(0.96) sepia(0.09) hue-rotate(21deg)", overlay: "linear-gradient(45deg, rgba(100,200,50,0.15), transparent)" },
    { id: "amber-leak-120", name: "Amber Leak", category: "film", css: "contrast(1.02) saturate(1.05) brightness(0.85)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.3), transparent 60%)" },
    { id: "sparkle-pearl-121", name: "Sparkle Pearl", category: "trending", css: "contrast(1.13) saturate(1.76) brightness(0.88)", overlay: "none" },
    { id: "copper-filter-122", name: "Copper Filter", category: "lighting", css: "contrast(0.92) saturate(1.10) brightness(0.87) sepia(0.33) hue-rotate(7deg)", overlay: "linear-gradient(0deg, rgba(255,180,0,0.12), transparent)" },
    { id: "graffiti-depth-123", name: "Graffiti Depth", category: "utilities", css: "contrast(0.96) saturate(1.80) brightness(1.14) sepia(0.26) hue-rotate(-15deg)", overlay: "radial-gradient(circle at 50% 20%, rgba(255,100,100,0.3), transparent 60%)" },
    { id: "matte-lamp-124", name: "Matte Lamp", category: "world", css: "contrast(0.90) saturate(1.37) brightness(1.01) sepia(0.14) hue-rotate(-24deg)", overlay: "linear-gradient(90deg, rgba(255,100,100,0.1), rgba(100,255,100,0.05))" },
    { id: "deep-ice-125", name: "Deep Ice", category: "world", css: "contrast(1.05) saturate(1.49) brightness(1.04) hue-rotate(6deg)", overlay: "none" },
    { id: "flash-pop-126", name: "Flash Pop", category: "film", css: "contrast(1.01) saturate(1.14) brightness(1.18)", overlay: "none" },
    { id: "heavy-candle-127", name: "Heavy Candle", category: "trending", css: "contrast(0.86) saturate(1.37) brightness(0.99) sepia(0.32) hue-rotate(-6deg)", overlay: "linear-gradient(180deg, rgba(255,200,150,0.2), transparent)" },
    { id: "sand-summer-128", name: "Sand Summer", category: "utilities", css: "contrast(1.25) saturate(1.01) brightness(0.99) sepia(0.35) hue-rotate(5deg)", overlay: "linear-gradient(0deg, rgba(255,180,0,0.12), transparent)" },
    { id: "vivid-rain-129", name: "Vivid Rain", category: "lighting", css: "contrast(1.27) saturate(1.58) brightness(0.99) sepia(0.29) hue-rotate(12deg)", overlay: "radial-gradient(circle at 50% 50%, transparent 40%, rgba(0,0,0,0.4) 100%)" },
    { id: "silk-fade-130", name: "Silk Fade", category: "world", css: "contrast(0.88) saturate(0.86) brightness(1.18) sepia(0.15) hue-rotate(-11deg)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.4), transparent 50%)" },
    { id: "velvet-silk-131", name: "Velvet Silk", category: "lighting", css: "contrast(1.01) saturate(0.93) brightness(0.89) sepia(0.17) hue-rotate(22deg)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.4), transparent 50%)" },
    { id: "matte-flash-132", name: "Matte Flash", category: "utilities", css: "contrast(0.86) saturate(1.33) brightness(1.18) sepia(0.32) hue-rotate(9deg)", overlay: "none" },
    { id: "dusty-city-133", name: "Dusty City", category: "utilities", css: "contrast(1.25) saturate(0.79) brightness(1.19) sepia(0.28) hue-rotate(8deg)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.2), transparent 60%)" },
    { id: "prism-mist-134", name: "Prism Mist", category: "world", css: "contrast(1.13) saturate(1.58) brightness(1.10) sepia(0.15)", overlay: "none" },
    { id: "creamy-silver-135", name: "Creamy Silver", category: "lighting", css: "contrast(0.97) saturate(1.51) brightness(1.00) sepia(0.14) blur(0.1px)", overlay: "linear-gradient(45deg, rgba(255,100,200,0.2), rgba(100,200,255,0.2), rgba(200,255,100,0.15))" },
    { id: "crisp-spark-136", name: "Crisp Spark", category: "world", css: "contrast(0.95) saturate(0.68) brightness(1.15) blur(0.5px)", overlay: "linear-gradient(45deg, rgba(255,120,0,0.18), transparent)" },
    { id: "sage-highlight-137", name: "Sage Highlight", category: "utilities", css: "contrast(1.17) saturate(0.76) brightness(0.90) sepia(0.21) hue-rotate(14deg)", overlay: "linear-gradient(180deg, rgba(255,150,100,0.2), rgba(100,100,255,0.15))" },
    { id: "moss-mood-138", name: "Moss Mood", category: "utilities", css: "contrast(1.34) saturate(1.46) brightness(0.91) sepia(0.22) hue-rotate(13deg)", overlay: "none" },
    { id: "blush-heat-139", name: "Blush Heat", category: "lighting", css: "contrast(0.90) saturate(1.47) brightness(0.90)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.3), transparent 60%)" },
    { id: "neon-mountain-140", name: "Neon Mountain", category: "world", css: "contrast(1.13) saturate(0.98) brightness(0.85) sepia(0.17) hue-rotate(-24deg)", overlay: "none" },
    { id: "olive-crystal-141", name: "Olive Crystal", category: "trending", css: "contrast(1.03) saturate(0.71) brightness(1.10) sepia(0.31) hue-rotate(-16deg)", overlay: "linear-gradient(45deg, rgba(255,0,100,0.15), rgba(0,255,150,0.1))" },
    { id: "latte-street-142", name: "Latte Street", category: "trending", css: "contrast(0.95) saturate(1.29) brightness(1.02) sepia(0.26) hue-rotate(10deg)", overlay: "linear-gradient(180deg, rgba(255,200,150,0.15), transparent)" },
    { id: "electric-world-143", name: "Electric World", category: "film", css: "contrast(1.33) saturate(0.66) brightness(1.09) hue-rotate(-20deg) blur(0.5px)", overlay: "none" },
    { id: "midnight-beacon-144", name: "Midnight Beacon", category: "trending", css: "contrast(1.12) saturate(1.39) brightness(1.04) sepia(0.32) hue-rotate(-20deg) blur(0.3px)", overlay: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4), transparent 70%)" },
    { id: "cashmere-smoke-145", name: "Cashmere Smoke", category: "utilities", css: "contrast(1.29) saturate(0.62) brightness(1.05) hue-rotate(13deg)", overlay: "linear-gradient(0deg, rgba(255,180,0,0.12), transparent)" },
    { id: "mint-summer-146", name: "Mint Summer", category: "trending", css: "contrast(1.13) saturate(1.17) brightness(1.03) sepia(0.08) hue-rotate(-18deg)", overlay: "none" },
    { id: "denim-shimmer-147", name: "Denim Shimmer", category: "world", css: "contrast(1.00) saturate(1.28) brightness(1.12) sepia(0.15) hue-rotate(25deg)", overlay: "linear-gradient(45deg, rgba(255,100,200,0.2), rgba(100,200,255,0.2), rgba(200,255,100,0.15))" },
    { id: "creamy-blur-148", name: "Creamy Blur", category: "utilities", css: "contrast(1.22) saturate(0.83) brightness(1.00) sepia(0.22) blur(0.5px)", overlay: "radial-gradient(circle at 50% 20%, rgba(255,100,100,0.3), transparent 60%)" },
    { id: "crystal-drape-149", name: "Crystal Drape", category: "utilities", css: "contrast(1.12) saturate(1.23) brightness(0.99) sepia(0.34) hue-rotate(-24deg)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.15), transparent 60%)" },
    { id: "retro-current-150", name: "Retro Current", category: "utilities", css: "contrast(1.32) saturate(1.65) brightness(0.98) sepia(0.16) hue-rotate(-7deg)", overlay: "linear-gradient(90deg, rgba(255,100,100,0.1), rgba(100,255,100,0.05))" },
    { id: "glow-forest-151", name: "Glow Forest", category: "lighting", css: "contrast(1.12) saturate(0.69) brightness(0.92) sepia(0.14) hue-rotate(13deg)", overlay: "linear-gradient(0deg, rgba(0,100,255,0.2), transparent)" },
    { id: "bright-fade-152", name: "Bright Fade", category: "world", css: "contrast(1.10) saturate(1.07) brightness(1.13) sepia(0.23)", overlay: "linear-gradient(180deg, rgba(255,200,100,0.15), transparent)" },
    { id: "moss-light-153", name: "Moss Light", category: "utilities", css: "contrast(1.21) saturate(1.10) brightness(1.05) sepia(0.06) hue-rotate(13deg)", overlay: "radial-gradient(circle at 50% 20%, rgba(255,255,255,0.25), transparent 50%)" },
    { id: "diamond-grain-154", name: "Diamond Grain", category: "lighting", css: "contrast(0.98) saturate(1.55) brightness(0.99) sepia(0.16) hue-rotate(6deg)", overlay: "radial-gradient(circle at 80% 80%, rgba(0,100,255,0.35), transparent 50%)" },
    { id: "neon-haze-155", name: "Neon Haze", category: "world", css: "contrast(1.06) saturate(1.48) brightness(1.16) hue-rotate(23deg)", overlay: "linear-gradient(0deg, rgba(255,180,0,0.12), transparent)" },
    { id: "velvet-glitter-156", name: "Velvet Glitter", category: "trending", css: "contrast(1.00) saturate(1.45) brightness(0.91) sepia(0.31) hue-rotate(22deg)", overlay: "radial-gradient(circle at 50% 20%, rgba(255,255,255,0.25), transparent 50%)" },
    { id: "pale-gold-157", name: "Pale Gold", category: "lighting", css: "contrast(0.90) saturate(0.74) brightness(0.89) sepia(0.25) hue-rotate(4deg)", overlay: "radial-gradient(circle at 80% 80%, rgba(0,100,255,0.35), transparent 50%)" },
    { id: "rust-ice-158", name: "Rust Ice", category: "trending", css: "contrast(1.35) saturate(0.89) brightness(0.98) sepia(0.22) hue-rotate(-20deg)", overlay: "linear-gradient(180deg, rgba(255,150,100,0.2), rgba(100,100,255,0.15))" },
    { id: "amber-sky-159", name: "Amber Sky", category: "world", css: "contrast(1.05) saturate(1.39) brightness(1.08) hue-rotate(3deg)", overlay: "linear-gradient(180deg, rgba(255,200,150,0.15), transparent)" },
    { id: "smooth-cool-160", name: "Smooth Cool", category: "trending", css: "contrast(1.27) saturate(0.94) brightness(0.88) sepia(0.35) hue-rotate(4deg)", overlay: "linear-gradient(180deg, rgba(150,0,0,0.3), transparent)" },
    { id: "light-ice-161", name: "Light Ice", category: "utilities", css: "contrast(1.22) saturate(1.07) brightness(0.90) sepia(0.09) hue-rotate(-18deg)", overlay: "linear-gradient(45deg, rgba(255,100,200,0.2), rgba(100,200,255,0.2), rgba(200,255,100,0.15))" },
    { id: "glow-haze-162", name: "Glow Haze", category: "world", css: "contrast(0.93) saturate(1.32) brightness(0.94) sepia(0.18) hue-rotate(12deg)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.3), transparent 60%)" },
    { id: "rust-crystal-163", name: "Rust Crystal", category: "world", css: "contrast(1.00) saturate(0.78) brightness(0.87) sepia(0.19) hue-rotate(-8deg)", overlay: "linear-gradient(45deg, rgba(255,0,128,0.25), rgba(255,200,0,0.15))" },
    { id: "sand-midnight-164", name: "Sand Midnight", category: "world", css: "contrast(1.28) saturate(1.18) brightness(1.00) sepia(0.16) hue-rotate(-5deg)", overlay: "none" },
    { id: "suede-desert-165", name: "Suede Desert", category: "lighting", css: "contrast(0.88) saturate(0.99) brightness(1.12) sepia(0.14) hue-rotate(-24deg) blur(0.6px)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.2), transparent 60%)" },
    { id: "deep-forest-166", name: "Deep Forest", category: "utilities", css: "contrast(1.01) saturate(1.74) brightness(1.02) sepia(0.32) hue-rotate(-23deg)", overlay: "linear-gradient(45deg, rgba(255,0,128,0.25), rgba(255,200,0,0.15))" },
    { id: "coral-torch-167", name: "Coral Torch", category: "lighting", css: "contrast(0.98) saturate(1.74) brightness(0.92) sepia(0.26) hue-rotate(10deg)", overlay: "none" },
    { id: "muted-snow-168", name: "Muted Snow", category: "film", css: "contrast(1.07) saturate(0.99) brightness(0.93) sepia(0.25) hue-rotate(24deg)", overlay: "linear-gradient(45deg, rgba(255,0,128,0.25), rgba(255,200,0,0.15))" },
    { id: "copper-velvet-169", name: "Copper Velvet", category: "trending", css: "contrast(1.05) saturate(0.74) brightness(0.89) hue-rotate(-10deg)", overlay: "linear-gradient(45deg, rgba(255,0,100,0.15), rgba(0,255,150,0.1))" },
    { id: "electric-flash-170", name: "Electric Flash", category: "film", css: "contrast(0.86) saturate(1.11) brightness(1.19) sepia(0.06) hue-rotate(-13deg)", overlay: "linear-gradient(45deg, rgba(100,200,50,0.15), transparent)" },
    { id: "90s-film-171", name: "90s Film", category: "lighting", css: "contrast(0.96) saturate(1.22) brightness(1.01) hue-rotate(-4deg)", overlay: "none" },
    { id: "glossy-mountain-172", name: "Glossy Mountain", category: "world", css: "contrast(1.05) saturate(0.77) brightness(0.94) sepia(0.09) hue-rotate(-16deg)", overlay: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4), transparent 70%)" },
    { id: "fire-sky-173", name: "Fire Sky", category: "lighting", css: "contrast(1.34) saturate(0.92) brightness(1.08) sepia(0.16) hue-rotate(-17deg) blur(0.1px)", overlay: "linear-gradient(45deg, rgba(255,0,100,0.15), rgba(0,255,150,0.1))" },
    { id: "sage-chrome-174", name: "Sage Chrome", category: "lighting", css: "contrast(1.13) saturate(1.03) brightness(1.02) hue-rotate(13deg)", overlay: "none" },
    { id: "prism-valley-175", name: "Prism Valley", category: "trending", css: "contrast(1.11) saturate(1.59) brightness(0.94) hue-rotate(-9deg)", overlay: "none" },
    { id: "glossy-valley-176", name: "Glossy Valley", category: "film", css: "contrast(0.85) saturate(0.65) brightness(1.04) sepia(0.25) hue-rotate(13deg)", overlay: "radial-gradient(circle at 50% 50%, transparent 40%, rgba(0,0,0,0.4) 100%)" },
    { id: "laser-pop-177", name: "Laser Pop", category: "trending", css: "contrast(0.91) saturate(0.74) brightness(0.95) sepia(0.33) hue-rotate(10deg)", overlay: "none" },
    { id: "cosmic-mirror-178", name: "Cosmic Mirror", category: "trending", css: "contrast(1.13) saturate(1.33) brightness(0.87) sepia(0.23)", overlay: "radial-gradient(circle at 50% 50%, transparent 40%, rgba(0,0,0,0.4) 100%)" },
    { id: "caramel-flame-179", name: "Caramel Flame", category: "world", css: "contrast(1.02) saturate(1.75) brightness(0.93) sepia(0.32) hue-rotate(-10deg)", overlay: "linear-gradient(180deg, rgba(255,150,100,0.2), rgba(100,100,255,0.15))" },
    { id: "diamond-flash-180", name: "Diamond Flash", category: "film", css: "contrast(1.11) saturate(1.67) brightness(1.17) sepia(0.08) hue-rotate(-5deg)", overlay: "linear-gradient(180deg, rgba(255,200,100,0.15), transparent)" },
    { id: "expired-highlight-181", name: "Expired Highlight", category: "world", css: "contrast(1.34) saturate(1.10) brightness(1.17) sepia(0.26) hue-rotate(18deg)", overlay: "linear-gradient(45deg, rgba(255,120,0,0.18), transparent)" },
    { id: "moody-stage-182", name: "Moody Stage", category: "film", css: "contrast(1.29) saturate(1.13) brightness(1.02) sepia(0.34) hue-rotate(-9deg)", overlay: "linear-gradient(45deg, rgba(255,100,200,0.2), rgba(100,200,255,0.2), rgba(200,255,100,0.15))" },
    { id: "cashmere-pearl-183", name: "Cashmere Pearl", category: "utilities", css: "contrast(1.05) saturate(1.62) brightness(0.94) hue-rotate(-7deg) blur(0.2px)", overlay: "linear-gradient(180deg, rgba(255,200,150,0.15), transparent)" },
    { id: "neon-gold-184", name: "Neon Gold", category: "trending", css: "contrast(1.00) saturate(1.69) brightness(0.88) sepia(0.21) hue-rotate(5deg)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.3), transparent 60%)" },
    { id: "blue-sign-185", name: "Blue Sign", category: "trending", css: "contrast(0.99) saturate(0.75) brightness(1.17) sepia(0.23)", overlay: "linear-gradient(45deg, rgba(255,100,200,0.2), rgba(100,200,255,0.2), rgba(200,255,100,0.15))" },
    { id: "melted-dawn-186", name: "Melted Dawn", category: "utilities", css: "contrast(1.34) saturate(1.30) brightness(1.14) sepia(0.08)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.4), transparent 50%)" },
    { id: "cloud-noon-187", name: "Cloud Noon", category: "film", css: "contrast(0.99) saturate(1.04) brightness(0.88) sepia(0.11)", overlay: "linear-gradient(180deg, rgba(255,150,100,0.2), rgba(100,100,255,0.15))" },
    { id: "blush-velvet-188", name: "Blush Velvet", category: "utilities", css: "contrast(1.17) saturate(1.43) brightness(0.87) sepia(0.27) hue-rotate(3deg)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.15), transparent 60%)" },
    { id: "denim-blur-189", name: "Denim Blur", category: "utilities", css: "contrast(1.02) saturate(1.18) brightness(1.15) hue-rotate(-18deg)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.4), transparent 50%)" },
    { id: "olive-filter-190", name: "Olive Filter", category: "world", css: "contrast(1.33) saturate(1.54) brightness(1.11) sepia(0.29) hue-rotate(16deg)", overlay: "linear-gradient(180deg, rgba(255,200,100,0.15), transparent)" },
    { id: "deep-drape-191", name: "Deep Drape", category: "world", css: "contrast(1.04) saturate(1.14) brightness(1.11) sepia(0.27)", overlay: "linear-gradient(180deg, rgba(255,100,150,0.2), rgba(100,150,255,0.15))" },
    { id: "diamond-mood-192", name: "Diamond Mood", category: "film", css: "contrast(1.04) saturate(1.17) brightness(1.18) sepia(0.22) hue-rotate(-20deg) blur(0.4px)", overlay: "linear-gradient(180deg, rgba(150,0,0,0.3), transparent)" },
    { id: "soft-glare-193", name: "Soft Glare", category: "world", css: "contrast(1.18) saturate(0.71) brightness(0.86) sepia(0.06) hue-rotate(21deg)", overlay: "linear-gradient(180deg, rgba(255,200,100,0.15), transparent)" },
    { id: "sand-lamp-194", name: "Sand Lamp", category: "trending", css: "contrast(1.11) saturate(0.66) brightness(1.16) sepia(0.28) hue-rotate(-13deg)", overlay: "none" },
    { id: "moody-backdrop-195", name: "Moody Backdrop", category: "film", css: "contrast(0.90) saturate(1.09) brightness(0.97) blur(0.1px)", overlay: "linear-gradient(45deg, rgba(100,200,50,0.15), transparent)" },
    { id: "linen-haze-196", name: "Linen Haze", category: "world", css: "contrast(0.97) saturate(0.88) brightness(1.16) sepia(0.16) blur(0.4px)", overlay: "radial-gradient(circle at 50% 50%, transparent 40%, rgba(0,0,0,0.4) 100%)" },
    { id: "aurora-sky-197", name: "Aurora Sky", category: "lighting", css: "contrast(1.18) saturate(0.85) brightness(0.86) sepia(0.14) hue-rotate(-5deg)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.15), transparent 60%)" },
    { id: "diamond-spark-198", name: "Diamond Spark", category: "world", css: "contrast(1.31) saturate(0.85) brightness(1.20) sepia(0.28) hue-rotate(14deg)", overlay: "none" },
    { id: "iridescent-sunrise-199", name: "Iridescent Sunrise", category: "utilities", css: "contrast(0.97) saturate(1.44) brightness(1.12) hue-rotate(22deg)", overlay: "radial-gradient(circle at 50% 20%, rgba(255,100,100,0.3), transparent 60%)" },
    { id: "hazy-field-200", name: "Hazy Field", category: "utilities", css: "contrast(1.35) saturate(1.70) brightness(0.91) sepia(0.08) hue-rotate(11deg)", overlay: "radial-gradient(circle at 50% 20%, rgba(255,255,255,0.25), transparent 50%)" },
    { id: "cloud-dawn-201", name: "Cloud Dawn", category: "world", css: "contrast(1.18) saturate(0.96) brightness(1.06) sepia(0.31)", overlay: "linear-gradient(180deg, rgba(255,200,150,0.2), transparent)" },
    { id: "fire-velvet-202", name: "Fire Velvet", category: "lighting", css: "contrast(0.99) saturate(1.17) brightness(0.97) hue-rotate(5deg) blur(0.3px)", overlay: "linear-gradient(45deg, rgba(255,120,0,0.18), transparent)" },
    { id: "heavy-lamp-203", name: "Heavy Lamp", category: "utilities", css: "contrast(1.12) saturate(1.57) brightness(0.85) sepia(0.33) hue-rotate(23deg)", overlay: "none" },
    { id: "vintage-dusk-204", name: "Vintage Dusk", category: "world", css: "contrast(1.20) saturate(1.56) brightness(0.99) sepia(0.11) hue-rotate(24deg)", overlay: "linear-gradient(45deg, rgba(100,200,50,0.15), transparent)" },
    { id: "pastel-leak-205", name: "Pastel Leak", category: "world", css: "contrast(0.96) saturate(1.23) brightness(0.92) sepia(0.25) hue-rotate(-5deg)", overlay: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.35), transparent 60%)" },
    { id: "super-bulb-206", name: "Super Bulb", category: "utilities", css: "contrast(1.23) saturate(0.79) brightness(1.01) sepia(0.10) hue-rotate(23deg)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.3), transparent 60%)" },
    { id: "faded-aura-207", name: "Faded Aura", category: "film", css: "contrast(1.25) saturate(1.35) brightness(1.11) sepia(0.28)", overlay: "linear-gradient(0deg, rgba(255,180,0,0.12), transparent)" },
    { id: "fire-tone-208", name: "Fire Tone", category: "lighting", css: "contrast(0.96) saturate(1.49) brightness(1.07) hue-rotate(12deg)", overlay: "none" },
    { id: "velvet-drape-209", name: "Velvet Drape", category: "world", css: "contrast(0.96) saturate(1.02) brightness(1.03) sepia(0.22) blur(0.2px)", overlay: "linear-gradient(45deg, rgba(255,120,0,0.18), transparent)" },
    { id: "iridescent-mood-210", name: "Iridescent Mood", category: "trending", css: "contrast(1.24) saturate(1.71) brightness(1.02) sepia(0.17) hue-rotate(23deg)", overlay: "linear-gradient(90deg, rgba(255,100,100,0.1), rgba(100,255,100,0.05))" },
    { id: "vivid-flash-211", name: "Vivid Flash", category: "utilities", css: "contrast(1.14) saturate(0.61) brightness(0.96) sepia(0.30) hue-rotate(20deg)", overlay: "radial-gradient(circle at 50% 20%, rgba(255,255,255,0.25), transparent 50%)" },
    { id: "fire-sunset-212", name: "Fire Sunset", category: "lighting", css: "contrast(1.30) saturate(1.61) brightness(0.96) sepia(0.21) hue-rotate(4deg)", overlay: "linear-gradient(45deg, rgba(100,200,50,0.15), transparent)" },
    { id: "cashmere-stage-213", name: "Cashmere Stage", category: "utilities", css: "contrast(1.27) saturate(1.44) brightness(0.89) sepia(0.20) hue-rotate(23deg)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.3), transparent 60%)" },
    { id: "expired-fog-214", name: "Expired Fog", category: "utilities", css: "contrast(1.01) saturate(1.55) brightness(1.07) sepia(0.20) hue-rotate(-8deg)", overlay: "linear-gradient(45deg, rgba(255,100,200,0.2), rgba(100,200,255,0.2), rgba(200,255,100,0.15))" },
    { id: "blur-aura-215", name: "Blur Aura", category: "lighting", css: "contrast(1.10) saturate(1.73) brightness(1.10) sepia(0.20) hue-rotate(-6deg)", overlay: "linear-gradient(45deg, rgba(255,100,200,0.2), rgba(100,200,255,0.2), rgba(200,255,100,0.15))" },
    { id: "pearl-valley-216", name: "Pearl Valley", category: "world", css: "contrast(1.01) saturate(0.73) brightness(0.88) sepia(0.33) hue-rotate(-4deg) blur(0.5px)", overlay: "linear-gradient(90deg, rgba(255,100,100,0.1), rgba(100,255,100,0.05))" },
    { id: "velvet-midnight-217", name: "Velvet Midnight", category: "utilities", css: "contrast(1.07) saturate(1.48) brightness(0.97) sepia(0.08) hue-rotate(15deg)", overlay: "linear-gradient(180deg, rgba(255,150,100,0.2), rgba(100,100,255,0.15))" },
    { id: "electric-bulb-218", name: "Electric Bulb", category: "lighting", css: "contrast(1.20) saturate(1.28) brightness(1.00) sepia(0.33) hue-rotate(9deg)", overlay: "linear-gradient(45deg, rgba(255,100,200,0.2), rgba(100,200,255,0.2), rgba(200,255,100,0.15))" },
    { id: "retro-glare-219", name: "Retro Glare", category: "utilities", css: "contrast(1.03) saturate(0.93) brightness(0.86) sepia(0.08) hue-rotate(25deg)", overlay: "linear-gradient(0deg, rgba(255,180,0,0.12), transparent)" },
    { id: "golden-drape-220", name: "Golden Drape", category: "trending", css: "contrast(1.21) saturate(0.84) brightness(1.08) sepia(0.31) hue-rotate(9deg)", overlay: "linear-gradient(90deg, rgba(255,100,100,0.1), rgba(100,255,100,0.05))" },
    { id: "rust-midnight-221", name: "Rust Midnight", category: "world", css: "contrast(1.17) saturate(1.47) brightness(1.00) sepia(0.06) hue-rotate(20deg)", overlay: "linear-gradient(180deg, rgba(100,180,255,0.25), transparent)" },
    { id: "heavy-chrome-222", name: "Heavy Chrome", category: "film", css: "contrast(1.26) saturate(0.71) brightness(1.04)", overlay: "linear-gradient(90deg, rgba(255,100,100,0.1), rgba(100,255,100,0.05))" },
    { id: "amber-fog-223", name: "Amber Fog", category: "film", css: "contrast(1.21) saturate(1.36) brightness(0.98) sepia(0.20) hue-rotate(-22deg)", overlay: "none" },
    { id: "pixel-shadow-224", name: "Pixel Shadow", category: "trending", css: "contrast(0.88) saturate(1.67) brightness(1.04) sepia(0.29)", overlay: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4), transparent 70%)" },
    { id: "silver-field-225", name: "Silver Field", category: "film", css: "contrast(1.27) saturate(0.76) brightness(1.04) sepia(0.12) hue-rotate(21deg) blur(0.5px)", overlay: "linear-gradient(180deg, rgba(255,100,150,0.2), rgba(100,150,255,0.15))" },
    { id: "bright-storm-226", name: "Bright Storm", category: "film", css: "contrast(0.86) saturate(0.84) brightness(1.02) sepia(0.24) hue-rotate(-3deg)", overlay: "radial-gradient(circle at 50% 50%, transparent 40%, rgba(0,0,0,0.4) 100%)" },
    { id: "electric-ash-227", name: "Electric Ash", category: "film", css: "contrast(1.23) saturate(1.72) brightness(0.92) sepia(0.16) hue-rotate(19deg)", overlay: "none" },
    { id: "pastel-memory-228", name: "Pastel Memory", category: "world", css: "contrast(1.22) saturate(0.81) brightness(1.02) sepia(0.30) hue-rotate(23deg)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.2), transparent 60%)" },
    { id: "silk-city-229", name: "Silk City", category: "trending", css: "contrast(1.32) saturate(1.17) brightness(1.11) sepia(0.16) hue-rotate(20deg) blur(0.1px)", overlay: "linear-gradient(180deg, rgba(255,200,150,0.15), transparent)" },
    { id: "linen-glitter-230", name: "Linen Glitter", category: "film", css: "contrast(1.29) saturate(0.72) brightness(0.87) sepia(0.24) hue-rotate(4deg) blur(0.5px)", overlay: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.35), transparent 60%)" },
    { id: "forest-midnight-231", name: "Forest Midnight", category: "trending", css: "contrast(1.18) saturate(0.88) brightness(0.96) sepia(0.20) hue-rotate(-12deg)", overlay: "none" },
    { id: "clay-shimmer-232", name: "Clay Shimmer", category: "utilities", css: "contrast(1.18) saturate(1.15) brightness(1.04) sepia(0.29) hue-rotate(-22deg)", overlay: "linear-gradient(180deg, rgba(255,150,100,0.2), rgba(100,100,255,0.15))" },
    { id: "cosmic-forest-233", name: "Cosmic Forest", category: "world", css: "contrast(1.01) saturate(1.16) brightness(0.89) sepia(0.08) hue-rotate(-22deg)", overlay: "none" },
    { id: "cashmere-memory-234", name: "Cashmere Memory", category: "lighting", css: "contrast(1.21) saturate(1.58) brightness(0.90) sepia(0.09) hue-rotate(-25deg)", overlay: "linear-gradient(45deg, rgba(255,0,128,0.25), rgba(255,200,0,0.15))" },
    { id: "aurora-spark-235", name: "Aurora Spark", category: "film", css: "contrast(0.86) saturate(1.23) brightness(0.87) sepia(0.32) hue-rotate(5deg)", overlay: "none" },
    { id: "aurora-spark-236", name: "Aurora Spark", category: "utilities", css: "contrast(1.09) saturate(0.66) brightness(1.11) sepia(0.17) hue-rotate(19deg)", overlay: "linear-gradient(180deg, rgba(150,0,0,0.3), transparent)" },
    { id: "clay-aura-237", name: "Clay Aura", category: "utilities", css: "contrast(1.29) saturate(0.95) brightness(1.04) sepia(0.10) hue-rotate(20deg)", overlay: "linear-gradient(0deg, rgba(255,180,0,0.12), transparent)" },
    { id: "denim-dew-238", name: "Denim Dew", category: "world", css: "contrast(0.94) saturate(0.64) brightness(0.96) hue-rotate(10deg)", overlay: "linear-gradient(0deg, rgba(255,180,0,0.12), transparent)" },
    { id: "suede-leak-239", name: "Suede Leak", category: "utilities", css: "contrast(0.90) saturate(0.89) brightness(0.89) sepia(0.06) hue-rotate(-11deg)", overlay: "none" },
    { id: "wool-shadow-240", name: "Wool Shadow", category: "world", css: "contrast(1.23) saturate(1.09) brightness(1.17) sepia(0.18) hue-rotate(-4deg)", overlay: "linear-gradient(45deg, rgba(255,0,100,0.15), rgba(0,255,150,0.1))" },
    { id: "cosmic-light-241", name: "Cosmic Light", category: "trending", css: "contrast(1.32) saturate(0.62) brightness(0.87) sepia(0.29) hue-rotate(10deg)", overlay: "linear-gradient(180deg, rgba(255,200,150,0.15), transparent)" },
    { id: "suede-aura-242", name: "Suede Aura", category: "film", css: "contrast(1.22) saturate(0.84) brightness(0.99) hue-rotate(-12deg)", overlay: "linear-gradient(45deg, rgba(100,200,50,0.15), transparent)" },
    { id: "mocha-mountain-243", name: "Mocha Mountain", category: "utilities", css: "contrast(1.34) saturate(1.36) brightness(1.13) sepia(0.32) hue-rotate(-22deg) blur(0.5px)", overlay: "linear-gradient(45deg, rgba(100,200,50,0.15), transparent)" },
    { id: "faded-frost-244", name: "Faded Frost", category: "world", css: "contrast(1.13) saturate(1.13) brightness(1.03) sepia(0.06) hue-rotate(22deg)", overlay: "linear-gradient(180deg, rgba(100,180,255,0.25), transparent)" },
    { id: "blur-shine-245", name: "Blur Shine", category: "trending", css: "contrast(1.14) saturate(1.13) brightness(1.01) sepia(0.28) hue-rotate(11deg)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.3), transparent 60%)" },
    { id: "pale-farm-246", name: "Pale Farm", category: "utilities", css: "contrast(1.16) saturate(1.14) brightness(0.92) sepia(0.14) hue-rotate(10deg)", overlay: "linear-gradient(0deg, rgba(255,180,0,0.12), transparent)" },
    { id: "cashmere-haze-247", name: "Cashmere Haze", category: "trending", css: "contrast(1.30) saturate(1.69) brightness(1.13) sepia(0.18) hue-rotate(-24deg)", overlay: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.35), transparent 60%)" },
    { id: "pixel-forest-248", name: "Pixel Forest", category: "utilities", css: "contrast(0.88) saturate(0.77) brightness(1.02) sepia(0.21) hue-rotate(-18deg)", overlay: "none" },
    { id: "electric-lens-249", name: "Electric Lens", category: "film", css: "contrast(1.12) saturate(0.84) brightness(0.88)", overlay: "linear-gradient(45deg, rgba(255,0,128,0.25), rgba(255,200,0,0.15))" },
    { id: "midnight-lamp-250", name: "Midnight Lamp", category: "utilities", css: "contrast(0.86) saturate(0.90) brightness(1.02) hue-rotate(22deg)", overlay: "linear-gradient(180deg, rgba(100,180,255,0.25), transparent)" },
    { id: "smooth-diamond-251", name: "Smooth Diamond", category: "lighting", css: "contrast(0.90) saturate(0.87) brightness(1.02) sepia(0.34) hue-rotate(3deg)", overlay: "none" },
    { id: "dreamy-lens-252", name: "Dreamy Lens", category: "trending", css: "contrast(1.01) saturate(0.63) brightness(1.18) hue-rotate(-10deg)", overlay: "linear-gradient(180deg, rgba(255,200,150,0.15), transparent)" },
    { id: "blush-blur-253", name: "Blush Blur", category: "world", css: "contrast(1.13) saturate(0.71) brightness(0.93) sepia(0.17) hue-rotate(-13deg)", overlay: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4), transparent 70%)" },
    { id: "vivid-rain-254", name: "Vivid Rain", category: "world", css: "contrast(0.86) saturate(0.73) brightness(1.04) sepia(0.33) hue-rotate(-22deg)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.4), transparent 50%)" },
    { id: "stone-sign-255", name: "Stone Sign", category: "trending", css: "contrast(1.03) saturate(1.28) brightness(1.11) sepia(0.33) hue-rotate(22deg)", overlay: "none" },
    { id: "matte-dawn-256", name: "Matte Dawn", category: "film", css: "contrast(1.00) saturate(1.13) brightness(1.18) sepia(0.13) hue-rotate(10deg)", overlay: "linear-gradient(180deg, rgba(100,180,255,0.25), transparent)" },
    { id: "sage-breeze-257", name: "Sage Breeze", category: "world", css: "contrast(0.96) saturate(1.69) brightness(1.02) sepia(0.18) hue-rotate(-23deg)", overlay: "linear-gradient(0deg, rgba(0,100,255,0.2), transparent)" },
    { id: "muted-fade-258", name: "Muted Fade", category: "lighting", css: "contrast(1.33) saturate(0.67) brightness(1.14) sepia(0.28) hue-rotate(-14deg)", overlay: "linear-gradient(45deg, rgba(255,0,128,0.25), rgba(255,200,0,0.15))" },
    { id: "twilight-sky-259", name: "Twilight Sky", category: "film", css: "contrast(0.88) saturate(1.06) brightness(1.00) sepia(0.12) hue-rotate(-4deg) blur(0.1px)", overlay: "linear-gradient(180deg, rgba(255,200,150,0.2), transparent)" },
    { id: "stone-torch-260", name: "Stone Torch", category: "lighting", css: "contrast(1.08) saturate(1.11) brightness(1.17) sepia(0.34) hue-rotate(4deg) blur(0.3px)", overlay: "none" },
    { id: "lo-fi-tide-261", name: "Lo-Fi Tide", category: "utilities", css: "contrast(1.27) saturate(1.33) brightness(1.19) sepia(0.11) hue-rotate(25deg)", overlay: "none" },
    { id: "neon-drape-262", name: "Neon Drape", category: "film", css: "contrast(0.98) saturate(1.77) brightness(1.10) sepia(0.25) hue-rotate(16deg)", overlay: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.35), transparent 60%)" },
    { id: "denim-lamp-263", name: "Denim Lamp", category: "trending", css: "contrast(1.08) saturate(0.80) brightness(1.06) sepia(0.10) hue-rotate(16deg)", overlay: "linear-gradient(180deg, rgba(150,0,0,0.3), transparent)" },
    { id: "pale-blur-264", name: "Pale Blur", category: "utilities", css: "contrast(0.91) saturate(1.16) brightness(0.93) sepia(0.09) hue-rotate(-5deg)", overlay: "radial-gradient(circle at 50% 20%, rgba(255,255,255,0.25), transparent 50%)" },
    { id: "forest-pop-265", name: "Forest Pop", category: "trending", css: "contrast(1.20) saturate(1.76) brightness(0.98) hue-rotate(-4deg) blur(0.5px)", overlay: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4), transparent 70%)" },
    { id: "linen-wave-266", name: "Linen Wave", category: "trending", css: "contrast(0.91) saturate(1.60) brightness(1.09) sepia(0.28) hue-rotate(16deg) blur(0.2px)", overlay: "linear-gradient(180deg, rgba(255,200,150,0.15), transparent)" },
    { id: "golden-snow-267", name: "Golden Snow", category: "world", css: "contrast(1.12) saturate(0.81) brightness(1.01) sepia(0.07) hue-rotate(12deg) blur(0.6px)", overlay: "linear-gradient(180deg, rgba(255,150,100,0.2), rgba(100,100,255,0.15))" },
    { id: "laser-torch-268", name: "Laser Torch", category: "lighting", css: "contrast(1.13) saturate(0.63) brightness(0.97) sepia(0.19) hue-rotate(20deg)", overlay: "linear-gradient(180deg, rgba(255,200,100,0.15), transparent)" },
    { id: "lofi-sign-269", name: "Lofi Sign", category: "film", css: "contrast(1.15) saturate(1.17) brightness(1.11) sepia(0.12) hue-rotate(-23deg)", overlay: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.35), transparent 60%)" },
    { id: "glossy-shine-270", name: "Glossy Shine", category: "utilities", css: "contrast(1.28) saturate(1.44) brightness(1.06) sepia(0.09) hue-rotate(-24deg)", overlay: "linear-gradient(90deg, rgba(255,100,100,0.1), rgba(100,255,100,0.05))" },
    { id: "moss-lamp-271", name: "Moss Lamp", category: "trending", css: "contrast(1.08) saturate(0.93) brightness(0.94) sepia(0.14) hue-rotate(11deg)", overlay: "linear-gradient(180deg, rgba(255,200,150,0.15), transparent)" },
    { id: "vintage-glitter-272", name: "Vintage Glitter", category: "film", css: "contrast(1.15) saturate(0.69) brightness(0.87) sepia(0.33) hue-rotate(20deg)", overlay: "radial-gradient(circle at 80% 80%, rgba(0,100,255,0.35), transparent 50%)" },
    { id: "caramel-current-273", name: "Caramel Current", category: "utilities", css: "contrast(1.10) saturate(1.46) brightness(0.86) sepia(0.19) hue-rotate(8deg)", overlay: "linear-gradient(0deg, rgba(0,100,255,0.2), transparent)" },
    { id: "sand-haze-274", name: "Sand Haze", category: "utilities", css: "contrast(0.89) saturate(1.50) brightness(1.07) sepia(0.24) hue-rotate(12deg)", overlay: "linear-gradient(180deg, rgba(255,200,150,0.2), transparent)" },
    { id: "cloud-world-275", name: "Cloud World", category: "world", css: "contrast(0.85) saturate(0.99) brightness(1.02) sepia(0.29)", overlay: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4), transparent 70%)" },
    { id: "flash-frost-276", name: "Flash Frost", category: "film", css: "contrast(1.28) saturate(1.56) brightness(1.12) sepia(0.29) hue-rotate(-13deg)", overlay: "linear-gradient(180deg, rgba(255,150,100,0.2), rgba(100,100,255,0.15))" },
    { id: "laser-ice-277", name: "Laser Ice", category: "lighting", css: "contrast(1.00) saturate(1.65) brightness(0.93) hue-rotate(-8deg) blur(0.6px)", overlay: "linear-gradient(180deg, rgba(255,100,150,0.2), rgba(100,150,255,0.15))" },
    { id: "melted-dusk-278", name: "Melted Dusk", category: "world", css: "contrast(0.97) saturate(1.65) brightness(1.10) sepia(0.16) hue-rotate(-20deg) blur(0.4px)", overlay: "linear-gradient(45deg, rgba(255,0,100,0.15), rgba(0,255,150,0.1))" },
    { id: "warm-film-279", name: "Warm Film", category: "lighting", css: "contrast(0.92) saturate(1.12) brightness(1.12) sepia(0.22) hue-rotate(19deg) blur(0.6px)", overlay: "linear-gradient(180deg, rgba(255,150,100,0.2), rgba(100,100,255,0.15))" },
    { id: "sage-frost-280", name: "Sage Frost", category: "trending", css: "contrast(0.87) saturate(1.40) brightness(1.16) sepia(0.22) hue-rotate(-4deg)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.2), transparent 60%)" },
    { id: "leather-shine-281", name: "Leather Shine", category: "world", css: "contrast(1.15) saturate(1.25) brightness(0.92) sepia(0.31) hue-rotate(-6deg) blur(0.3px)", overlay: "linear-gradient(45deg, rgba(255,100,200,0.2), rgba(100,200,255,0.2), rgba(200,255,100,0.15))" },
    { id: "forest-field-282", name: "Forest Field", category: "trending", css: "contrast(0.89) saturate(1.75) brightness(1.09) sepia(0.24) hue-rotate(-19deg)", overlay: "linear-gradient(45deg, rgba(255,120,0,0.18), transparent)" },
    { id: "moody-leak-283", name: "Moody Leak", category: "utilities", css: "contrast(1.09) saturate(1.48) brightness(1.14) sepia(0.22)", overlay: "linear-gradient(45deg, rgba(255,0,128,0.25), rgba(255,200,0,0.15))" },
    { id: "denim-tide-284", name: "Denim Tide", category: "utilities", css: "contrast(1.03) saturate(1.64) brightness(1.14) sepia(0.15) hue-rotate(-22deg)", overlay: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4), transparent 70%)" },
    { id: "dusty-chrome-285", name: "Dusty Chrome", category: "world", css: "contrast(1.00) saturate(1.63) brightness(0.95) sepia(0.06) hue-rotate(22deg)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.4), transparent 50%)" },
    { id: "dirty-glow-286", name: "Dirty Glow", category: "film", css: "contrast(1.23) saturate(0.60) brightness(0.90) sepia(0.31) hue-rotate(-14deg)", overlay: "linear-gradient(180deg, rgba(255,200,100,0.15), transparent)" },
    { id: "glossy-noon-287", name: "Glossy Noon", category: "film", css: "contrast(1.25) saturate(0.78) brightness(1.11) sepia(0.19) hue-rotate(-8deg)", overlay: "linear-gradient(45deg, rgba(100,200,50,0.15), transparent)" },
    { id: "expired-dream-288", name: "Expired Dream", category: "lighting", css: "contrast(1.02) saturate(1.38) brightness(0.97)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.2), transparent 60%)" },
    { id: "silk-fog-289", name: "Silk Fog", category: "film", css: "contrast(1.30) saturate(0.82) brightness(1.06) sepia(0.32) hue-rotate(-7deg)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.2), transparent 60%)" },
    { id: "sharp-rose-290", name: "Sharp Rose", category: "trending", css: "contrast(0.88) saturate(1.44) brightness(1.18) sepia(0.13) hue-rotate(14deg) blur(0.3px)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.4), transparent 50%)" },
    { id: "blush-dream-291", name: "Blush Dream", category: "world", css: "contrast(1.26) saturate(1.22) brightness(1.09) sepia(0.24) hue-rotate(-15deg) blur(0.5px)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.4), transparent 50%)" },
    { id: "rust-steel-292", name: "Rust Steel", category: "world", css: "contrast(1.22) saturate(0.77) brightness(0.90) hue-rotate(-24deg) blur(0.3px)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.3), transparent 60%)" },
    { id: "heavy-rose-293", name: "Heavy Rose", category: "lighting", css: "contrast(1.03) saturate(0.66) brightness(0.99) sepia(0.34) hue-rotate(-11deg)", overlay: "none" },
    { id: "diamond-wind-294", name: "Diamond Wind", category: "utilities", css: "contrast(0.89) saturate(0.73) brightness(0.87) sepia(0.30) hue-rotate(-20deg)", overlay: "none" },
    { id: "vivid-prism-295", name: "Vivid Prism", category: "world", css: "contrast(0.94) saturate(1.45) brightness(1.13) sepia(0.26) blur(0.3px)", overlay: "radial-gradient(circle at 50% 20%, rgba(255,100,100,0.3), transparent 60%)" },
    { id: "creamy-filter-296", name: "Creamy Filter", category: "utilities", css: "contrast(0.97) saturate(0.82) brightness(1.04) sepia(0.21) hue-rotate(-25deg)", overlay: "none" },
    { id: "crystal-smoke-297", name: "Crystal Smoke", category: "lighting", css: "contrast(1.05) saturate(1.55) brightness(1.08) hue-rotate(-8deg)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.2), transparent 60%)" },
    { id: "moss-dawn-298", name: "Moss Dawn", category: "film", css: "contrast(1.09) saturate(1.20) brightness(1.14) sepia(0.19) hue-rotate(18deg)", overlay: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4), transparent 70%)" },
    { id: "sand-beacon-299", name: "Sand Beacon", category: "film", css: "contrast(0.89) saturate(1.33) brightness(1.18) sepia(0.18)", overlay: "linear-gradient(0deg, rgba(0,100,255,0.2), transparent)" },
    { id: "matte-backdrop-300", name: "Matte Backdrop", category: "world", css: "contrast(1.24) saturate(1.22) brightness(0.85) sepia(0.07) hue-rotate(-3deg)", overlay: "radial-gradient(circle at 50% 20%, rgba(255,255,255,0.25), transparent 50%)" },
    { id: "denim-blur-301", name: "Denim Blur", category: "trending", css: "contrast(1.31) saturate(1.45) brightness(0.87) sepia(0.32) hue-rotate(-19deg)", overlay: "linear-gradient(90deg, rgba(255,100,100,0.1), rgba(100,255,100,0.05))" },
    { id: "dusty-cloud-302", name: "Dusty Cloud", category: "trending", css: "contrast(1.00) saturate(0.93) brightness(0.86) blur(0.3px)", overlay: "radial-gradient(circle at 80% 80%, rgba(0,100,255,0.35), transparent 50%)" },
    { id: "twilight-sign-303", name: "Twilight Sign", category: "world", css: "contrast(1.04) saturate(1.03) brightness(0.95) sepia(0.20) hue-rotate(20deg)", overlay: "radial-gradient(circle at 50% 20%, rgba(255,100,100,0.3), transparent 60%)" },
    { id: "olive-wall-304", name: "Olive Wall", category: "world", css: "contrast(0.86) saturate(1.46) brightness(0.96) sepia(0.09) hue-rotate(-23deg) blur(0.1px)", overlay: "linear-gradient(180deg, rgba(150,0,0,0.3), transparent)" },
    { id: "iridescent-cloud-305", name: "Iridescent Cloud", category: "lighting", css: "contrast(1.25) saturate(1.00) brightness(0.87) sepia(0.29)", overlay: "linear-gradient(180deg, rgba(100,180,255,0.25), transparent)" },
    { id: "pale-highlight-306", name: "Pale Highlight", category: "film", css: "contrast(1.25) saturate(1.01) brightness(0.85) sepia(0.20) hue-rotate(-9deg)", overlay: "linear-gradient(45deg, rgba(255,120,0,0.18), transparent)" },
    { id: "lofi-world-307", name: "Lofi World", category: "trending", css: "contrast(1.03) saturate(1.57) brightness(1.10) hue-rotate(-19deg)", overlay: "linear-gradient(0deg, rgba(255,180,0,0.12), transparent)" },
    { id: "muted-saturation-308", name: "Muted Saturation", category: "world", css: "contrast(1.02) saturate(1.61) brightness(0.95) sepia(0.07) hue-rotate(5deg)", overlay: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4), transparent 70%)" },
    { id: "coral-ice-309", name: "Coral Ice", category: "utilities", css: "contrast(1.04) saturate(1.05) brightness(1.17) hue-rotate(14deg)", overlay: "radial-gradient(circle at 50% 20%, rgba(255,100,100,0.3), transparent 60%)" },
    { id: "expired-sunset-310", name: "Expired Sunset", category: "trending", css: "contrast(1.12) saturate(1.76) brightness(1.03) sepia(0.18) hue-rotate(15deg)", overlay: "linear-gradient(45deg, rgba(255,0,100,0.15), rgba(0,255,150,0.1))" },
    { id: "blush-gold-311", name: "Blush Gold", category: "lighting", css: "contrast(1.24) saturate(1.58) brightness(1.01) sepia(0.09) hue-rotate(11deg)", overlay: "linear-gradient(180deg, rgba(255,150,100,0.2), rgba(100,100,255,0.15))" },
    { id: "cashmere-rain-312", name: "Cashmere Rain", category: "film", css: "contrast(0.93) saturate(1.62) brightness(0.86) sepia(0.34) hue-rotate(18deg)", overlay: "radial-gradient(circle at 50% 20%, rgba(255,255,255,0.25), transparent 50%)" },
    { id: "forest-chrome-313", name: "Forest Chrome", category: "world", css: "contrast(1.05) saturate(1.22) brightness(1.00) sepia(0.14) hue-rotate(-10deg)", overlay: "linear-gradient(0deg, rgba(255,180,0,0.12), transparent)" },
    { id: "hologram-sign-314", name: "Hologram Sign", category: "world", css: "contrast(1.24) saturate(1.19) brightness(1.20) sepia(0.13) hue-rotate(25deg)", overlay: "radial-gradient(circle at 80% 80%, rgba(0,100,255,0.35), transparent 50%)" },
    { id: "grainy-glare-315", name: "Grainy Glare", category: "utilities", css: "contrast(0.98) saturate(1.20) brightness(0.96) sepia(0.06) hue-rotate(-17deg)", overlay: "none" },
    { id: "cashmere-noise-316", name: "Cashmere Noise", category: "trending", css: "contrast(0.88) saturate(0.78) brightness(1.10) sepia(0.29) hue-rotate(-9deg)", overlay: "linear-gradient(45deg, rgba(255,100,200,0.2), rgba(100,200,255,0.2), rgba(200,255,100,0.15))" },
    { id: "crystal-wind-317", name: "Crystal Wind", category: "utilities", css: "contrast(1.26) saturate(1.60) brightness(0.89) sepia(0.06) hue-rotate(4deg)", overlay: "linear-gradient(0deg, rgba(255,180,0,0.12), transparent)" },
    { id: "blush-mood-318", name: "Blush Mood", category: "lighting", css: "contrast(1.24) saturate(1.28) brightness(0.85) sepia(0.29) hue-rotate(-24deg) blur(0.1px)", overlay: "none" },
    { id: "creamy-grain-319", name: "Creamy Grain", category: "utilities", css: "contrast(0.87) saturate(1.37) brightness(1.13) sepia(0.18) hue-rotate(-24deg)", overlay: "linear-gradient(0deg, rgba(255,180,0,0.12), transparent)" },
];

/* ------------------------------- reactions -------------------------------- */
export interface ReactionMeta {
  id: StoryReactionKind;
  label: string;
  glyph: string;
}

export const REACTION_META: Record<StoryReactionKind, ReactionMeta> = {
  heart: { id: "heart", label: "Love", glyph: "❤️" },
  bloom: { id: "bloom", label: "Fire", glyph: "🔥" },
  sparkle: { id: "sparkle", label: "Clap", glyph: "👏" },
  smile: { id: "smile", label: "Laugh", glyph: "😂" },
  cheer: { id: "cheer", label: "Wow", glyph: "😮" },
  moon: { id: "moon", label: "Sad", glyph: "😢" },
};

/* ------------------------------ motion pack ------------------------------ */
/* Instagram quick reactions */
export interface MotionItem {
  id: string;
  emoji: string;
  animation: "float" | "pulse";
  label: string;
}

export const MOTION_PACK: MotionItem[] = [
  { id: "love", emoji: "❤️", animation: "pulse", label: "Love" },
  { id: "fire", emoji: "🔥", animation: "pulse", label: "Fire" },
  { id: "clap", emoji: "👏", animation: "pulse", label: "Clap" },
  { id: "laugh", emoji: "😂", animation: "pulse", label: "Laugh" },
  { id: "wow", emoji: "😮", animation: "pulse", label: "Wow" },
  { id: "cry", emoji: "😢", animation: "float", label: "Cry" },
  { id: "heart-eyes", emoji: "😍", animation: "pulse", label: "Heart Eyes" },
  { id: "100", emoji: "💯", animation: "pulse", label: "100" },
  { id: "party", emoji: "🎉", animation: "pulse", label: "Party" },
  { id: "star", emoji: "⭐", animation: "pulse", label: "Star" },
  { id: "sparkle", emoji: "✨", animation: "pulse", label: "Sparkle" },
  { id: "rainbow", emoji: "🌈", animation: "float", label: "Rainbow" },
  { id: "moon", emoji: "🌙", animation: "float", label: "Moon" },
  { id: "sun", emoji: "☀️", animation: "pulse", label: "Sun" },
  { id: "balloon", emoji: "🎈", animation: "float", label: "Balloon" },
  { id: "gift", emoji: "🎁", animation: "pulse", label: "Gift" },
  { id: "butterfly", emoji: "🦋", animation: "float", label: "Butterfly" },
  { id: "flower", emoji: "🌸", animation: "float", label: "Flower" },
];

/* --------------------------------- gifts ---------------------------------- */
/* Instagram-exact gifts — like real IG gifts with star values, 3D feel, gradients */
export interface GiftMeta {
  id: StoryGiftKind;
  name: string;
  hint: string;
  glyph: string;
  tint: string;
  stars: number;
  gradient: string;
  rarity: "common" | "rare" | "epic" | "legendary";
}

export const GIFT_META: Record<StoryGiftKind, GiftMeta> = {
  bloom: { id: "bloom", name: "Fire", hint: "You're on fire", glyph: "🔥", tint: "#fa7e1e", stars: 30, gradient: "linear-gradient(135deg, #ff6a00 0%, #ee0979 100%)", rarity: "rare" },
  petal: { id: "petal", name: "Rose", hint: "A rose for you", glyph: "🌹", tint: "#ed4956", stars: 10, gradient: "linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)", rarity: "common" },
  star: { id: "star", name: "Star", hint: "You're a star", glyph: "⭐", tint: "#feda75", stars: 40, gradient: "linear-gradient(135deg, #f7971e 0%, #ffd200 100%)", rarity: "rare" },
  heart: { id: "heart", name: "Love", hint: "Lots of love", glyph: "❤️", tint: "#ed4956", stars: 5, gradient: "linear-gradient(135deg, #ff0844 0%, #ffb199 100%)", rarity: "common" },
  candle: { id: "candle", name: "Wow", hint: "Amazing", glyph: "😮", tint: "#a8a8a8", stars: 15, gradient: "linear-gradient(135deg, #8e2de2 0%, #4a00e0 100%)", rarity: "common" },
  moon: { id: "moon", name: "Moon", hint: "Moon vibes", glyph: "🌙", tint: "#8e8e8e", stars: 20, gradient: "linear-gradient(135deg, #2c3e50 0%, #4ca1af 100%)", rarity: "common" },
  ribbon: { id: "ribbon", name: "Heart Eyes", hint: "Love it", glyph: "😍", tint: "#d62976", stars: 25, gradient: "linear-gradient(135deg, #fc5c7d 0%, #6a82fb 100%)", rarity: "rare" },
  spark: { id: "spark", name: "100", hint: "Perfect", glyph: "💯", tint: "#1DB954", stars: 30, gradient: "linear-gradient(135deg, #00b09b 0%, #96c93d 100%)", rarity: "rare" },
  rose: { id: "rose", name: "Rose Bouquet", hint: "Beautiful bouquet", glyph: "💐", tint: "#ff6b9d", stars: 50, gradient: "linear-gradient(135deg, #ff6b9d 0%, #c44569 100%)", rarity: "epic" },
  crown: { id: "crown", name: "Crown", hint: "You deserve a crown", glyph: "👑", tint: "#feca57", stars: 100, gradient: "linear-gradient(135deg, #f6d365 0%, #fda085 100%)", rarity: "epic" },
  diamond: { id: "diamond", name: "Diamond", hint: "You're precious", glyph: "💎", tint: "#48dbfb", stars: 200, gradient: "linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)", rarity: "legendary" },
  rocket: { id: "rocket", name: "Rocket", hint: "To the moon", glyph: "🚀", tint: "#a29bfe", stars: 300, gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", rarity: "legendary" },
  butterfly: { id: "butterfly", name: "Butterfly", hint: "Fly high", glyph: "🦋", tint: "#a8edea", stars: 60, gradient: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)", rarity: "epic" },
  rainbow: { id: "rainbow", name: "Rainbow", hint: "Colorful vibes", glyph: "🌈", tint: "#ff9ff3", stars: 80, gradient: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%)", rarity: "epic" },
  gift: { id: "gift", name: "Gift Box", hint: "Surprise gift", glyph: "🎁", tint: "#f368e0", stars: 45, gradient: "linear-gradient(135deg, #f857a6 0%, #ff5858 100%)", rarity: "rare" },
  party: { id: "party", name: "Party", hint: "Let's celebrate", glyph: "🎉", tint: "#ff9f43", stars: 35, gradient: "linear-gradient(135deg, #f6d365 0%, #fda085 100%)", rarity: "rare" },
};

/* -------------------------------- templates ------------------------------- */
/* Instagram-exact templates - beautiful, minimal, no ugly Bloom ones */
export interface StoryTemplate {
  id: string;
  name: string;
  hint: string;
  backgroundId: string;
  preset: StoryTextPreset;
  heading: string;
  placeholder: string;
  stickerIds: string[];
  ink: string;
}

export const STORY_TEMPLATES: StoryTemplate[] = [
  {
    id: "ig-bold",
    name: "Bold",
    hint: "Strong statement",
    backgroundId: "ig-sunset",
    preset: "strong",
    heading: "BOLD",
    placeholder: "Type something bold",
    stickerIds: [],
    ink: "#ffffff",
  },
  {
    id: "ig-minimal",
    name: "Minimal",
    hint: "Clean & simple",
    backgroundId: "ig-white",
    preset: "classic",
    heading: "Minimal",
    placeholder: "Keep it simple",
    stickerIds: [],
    ink: "#000000",
  },
  {
    id: "ig-neon",
    name: "Neon",
    hint: "Glow in dark",
    backgroundId: "ig-black",
    preset: "neon",
    heading: "NEON",
    placeholder: "Glow up",
    stickerIds: [],
    ink: "#ffffff",
  },
  {
    id: "ig-typewriter",
    name: "Typewriter",
    hint: "Retro mono",
    backgroundId: "ig-midnight",
    preset: "typewriter",
    heading: "Typewriter",
    placeholder: "Old school cool",
    stickerIds: [],
    ink: "#ffffff",
  },
  {
    id: "ig-fire",
    name: "Fire",
    hint: "Hot & fierce",
    backgroundId: "ig-fire",
    preset: "strong",
    heading: "FIRE",
    placeholder: "Bring the heat",
    stickerIds: [],
    ink: "#ffffff",
  },
  {
    id: "ig-ocean",
    name: "Ocean",
    hint: "Deep blue",
    backgroundId: "ig-ocean",
    preset: "modern",
    heading: "Ocean",
    placeholder: "Dive deep",
    stickerIds: [],
    ink: "#ffffff",
  },
  {
    id: "ig-forest",
    name: "Forest",
    hint: "Natural green",
    backgroundId: "ig-forest",
    preset: "classic",
    heading: "Forest",
    placeholder: "Stay wild",
    stickerIds: [],
    ink: "#ffffff",
  },
  {
    id: "ig-dawn",
    name: "Dawn",
    hint: "Warm sunrise",
    backgroundId: "ig-dawn",
    preset: "modern",
    heading: "Dawn",
    placeholder: "New beginnings",
    stickerIds: [],
    ink: "#000000",
  },
  {
    id: "ig-aurora",
    name: "Aurora",
    hint: "Dreamy pastel",
    backgroundId: "ig-aurora",
    preset: "classic",
    heading: "Dream",
    placeholder: "Chase dreams",
    stickerIds: [],
    ink: "#ffffff",
  },
  {
    id: "ig-love",
    name: "Love",
    hint: "Heart vibes",
    backgroundId: "ig-pink",
    preset: "strong",
    heading: "LOVE",
    placeholder: "All you need",
    stickerIds: [],
    ink: "#ffffff",
  },
  // --- 15+ new IG aesthetic templates ---
  {
    id: "ig-happy",
    name: "Happy",
    hint: "Good vibes only",
    backgroundId: "ig-dawn",
    preset: "modern",
    heading: "HAPPY",
    placeholder: "Good vibes only",
    stickerIds: [],
    ink: "#000000",
  },
  {
    id: "ig-mood",
    name: "Mood",
    hint: "Current mood",
    backgroundId: "ig-black",
    preset: "classic",
    heading: "mood",
    placeholder: "Current mood",
    stickerIds: [],
    ink: "#ffffff",
  },
  {
    id: "ig-vibes",
    name: "Vibes",
    hint: "On a vibe",
    backgroundId: "ig-aurora",
    preset: "neon",
    heading: "VIBES",
    placeholder: "On a vibe",
    stickerIds: [],
    ink: "#ffffff",
  },
  {
    id: "ig-golden",
    name: "Golden",
    hint: "Golden hour",
    backgroundId: "ig-sunset",
    preset: "classic",
    heading: "Golden hour",
    placeholder: "Chasing light",
    stickerIds: [],
    ink: "#ffffff",
  },
  {
    id: "ig-late",
    name: "Late Night",
    hint: "2 AM thoughts",
    backgroundId: "ig-midnight",
    preset: "typewriter",
    heading: "2 AM thoughts",
    placeholder: "Late night thoughts",
    stickerIds: [],
    ink: "#ffffff",
  },
  {
    id: "ig-selflove",
    name: "Self Love",
    hint: "Be kind to you",
    backgroundId: "ig-lavender",
    preset: "modern",
    heading: "Self love",
    placeholder: "Be kind to you",
    stickerIds: [],
    ink: "#000000",
  },
  {
    id: "ig-grateful",
    name: "Grateful",
    hint: "Thankful heart",
    backgroundId: "ig-white",
    preset: "modern",
    heading: "Grateful",
    placeholder: "Thankful for...",
    stickerIds: [],
    ink: "#000000",
  },
  {
    id: "ig-weekend",
    name: "Weekend",
    hint: "Weekend mood",
    backgroundId: "ig-ocean",
    preset: "strong",
    heading: "WEEKEND",
    placeholder: "Weekend mood",
    stickerIds: [],
    ink: "#ffffff",
  },
  {
    id: "ig-focus",
    name: "Focus",
    hint: "Deep work",
    backgroundId: "ig-black",
    preset: "strong",
    heading: "FOCUS",
    placeholder: "Deep work mode",
    stickerIds: [],
    ink: "#ffffff",
  },
  {
    id: "ig-bloom",
    name: "Bloom",
    hint: "Grow slow",
    backgroundId: "ig-forest",
    preset: "classic",
    heading: "Grow slow",
    placeholder: "Bloom where you are",
    stickerIds: [],
    ink: "#ffffff",
  },
  {
    id: "ig-coffee",
    name: "Coffee",
    hint: "But first coffee",
    backgroundId: "ig-dawn",
    preset: "typewriter",
    heading: "But first, coffee",
    placeholder: "Coffee o'clock",
    stickerIds: [],
    ink: "#000000",
  },
  {
    id: "ig-monday",
    name: "Monday",
    hint: "New week",
    backgroundId: "ig-blue",
    preset: "strong",
    heading: "MONDAY",
    placeholder: "New week, new goals",
    stickerIds: [],
    ink: "#ffffff",
  },
  {
    id: "ig-chill",
    name: "Chill",
    hint: "Stay chill",
    backgroundId: "ig-ocean",
    preset: "modern",
    heading: "Stay chill",
    placeholder: "Just breathe",
    stickerIds: [],
    ink: "#ffffff",
  },
  {
    id: "ig-dream",
    name: "Dream",
    hint: "Dream big",
    backgroundId: "ig-midnight",
    preset: "neon",
    heading: "DREAM BIG",
    placeholder: "Dream big, work hard",
    stickerIds: [],
    ink: "#ffffff",
  },
  {
    id: "ig-energy",
    name: "Energy",
    hint: "High energy",
    backgroundId: "ig-fire",
    preset: "strong",
    heading: "ENERGY",
    placeholder: "High energy only",
    stickerIds: [],
    ink: "#ffffff",
  },
];
