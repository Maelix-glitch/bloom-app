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
export interface GiftMeta {
  id: StoryGiftKind;
  name: string;
  hint: string;
  glyph: string;
  tint: string;
}

export const GIFT_META: Record<StoryGiftKind, GiftMeta> = {
  bloom: { id: "bloom", name: "Fire", hint: "You're on fire", glyph: "🔥", tint: "#fa7e1e" },
  petal: { id: "petal", name: "Love", hint: "Lots of love", glyph: "❤️", tint: "#ed4956" },
  star: { id: "star", name: "Clap", hint: "Applause", glyph: "👏", tint: "#feda75" },
  heart: { id: "heart", name: "Laugh", hint: "So funny", glyph: "😂", tint: "#0095f6" },
  candle: { id: "candle", name: "Wow", hint: "Amazing", glyph: "😮", tint: "#a8a8a8" },
  moon: { id: "moon", name: "Sad", hint: "Feeling sad", glyph: "😢", tint: "#8e8e8e" },
  ribbon: { id: "ribbon", name: "Heart Eyes", hint: "Love it", glyph: "😍", tint: "#d62976" },
  spark: { id: "spark", name: "100", hint: "Perfect", glyph: "💯", tint: "#1DB954" },
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
