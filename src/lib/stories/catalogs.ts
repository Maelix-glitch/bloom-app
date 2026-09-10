/**
 * Bloom Story Platform — curated catalogs.
 * Every visual choice a story can make lives here as data: backgrounds,
 * type presets, filters, gifts, reactions, templates, palette. Components
 * render these; nothing hardcodes a look elsewhere.
 */

import type { StoryAdjustments, StoryGiftKind, StoryReactionKind, StoryTextPreset } from "./types";

/* ------------------------------- palette ---------------------------------- */

export interface StorySwatch {
  id: string;
  label: string;
  /** CSS color usable on canvas + in UI. */
  color: string;
  /** Best foreground for text drawn on this swatch. */
  onColor: string;
}

export const STORY_PALETTE: StorySwatch[] = [
  { id: "ivory", label: "Ivory", color: "#f4efe4", onColor: "#221d33" },
  { id: "midnight", label: "Midnight", color: "#221d33", onColor: "#f4efe4" },
  { id: "lavender", label: "Lavender", color: "#b7a6e8", onColor: "#221d33" },
  { id: "sage", label: "Sage", color: "#9db89a", onColor: "#221d33" },
  { id: "rose", label: "Rose", color: "#e0a3b8", onColor: "#2c2130" },
  { id: "champagne", label: "Champagne", color: "#eed9a4", onColor: "#2c2415" },
  { id: "mist", label: "Mist blue", color: "#9fb6cf", onColor: "#1f2433" },
  { id: "sand", label: "Warm sand", color: "#d3b795", onColor: "#2c2415" },
  { id: "ink", label: "Ink", color: "#14111d", onColor: "#f4efe4" },
  { id: "clay", label: "Clay", color: "#c07a5e", onColor: "#fbf3e6" },
];

export const DEFAULT_ADJUSTMENTS: StoryAdjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  warmth: 0,
  fade: 0,
};

/* ----------------------------- backgrounds -------------------------------- */

export interface StoryBackground {
  id: string;
  name: string;
  /** Full-bleed CSS background. */
  css: string;
  /** Default ink color for text placed on it. */
  ink: string;
  /** Subtle grain/vignette overlay opacity. */
  depth?: number | undefined;
}

export const STORY_BACKGROUNDS: StoryBackground[] = [
  {
    id: "moonlight",
    name: "Moonlight",
    css: "radial-gradient(130% 90% at 50% 0%, #3a3358 0%, #221d33 55%, #14111d 100%)",
    ink: "#f4efe4",
  },
  {
    id: "morning",
    name: "Morning",
    css: "linear-gradient(175deg, #f7f1e3 0%, #efe0c8 48%, #e3c9a6 100%)",
    ink: "#2c2415",
  },
  {
    id: "garden",
    name: "Garden",
    css: "radial-gradient(120% 100% at 20% 0%, #33473a 0%, #1d2b22 60%, #121a15 100%)",
    ink: "#eef2e4",
  },
  {
    id: "soft-rain",
    name: "Soft rain",
    css: "linear-gradient(180deg, #2b3348 0%, #232b3d 55%, #181d2b 100%)",
    ink: "#e8ecf4",
  },
  {
    id: "warm-linen",
    name: "Warm linen",
    css: "linear-gradient(170deg, #efe6d4 0%, #e2d2b6 60%, #cdb694 100%)",
    ink: "#2c2415",
  },
  {
    id: "golden-hour",
    name: "Golden hour",
    css: "radial-gradient(140% 90% at 50% 110%, #8a5a34 0%, #4a3040 45%, #221d33 100%)",
    ink: "#fbf0dd",
  },
  {
    id: "quiet-room",
    name: "Quiet room",
    css: "linear-gradient(180deg, #33304a 0%, #262338 60%, #1a1828 100%)",
    ink: "#ece7f7",
  },
  {
    id: "mist",
    name: "Mist",
    css: "linear-gradient(180deg, #aebfd2 0%, #8fa0b8 55%, #6e7f98 100%)",
    ink: "#1f2433",
  },
  {
    id: "night-bloom",
    name: "Night bloom",
    css: "radial-gradient(110% 70% at 80% 10%, #5b3a5e 0%, #2c2138 50%, #14111d 100%)",
    ink: "#f2e4ef",
  },
  {
    id: "paper",
    name: "Paper",
    css: "linear-gradient(180deg, #faf7ef 0%, #f1ebdb 100%)",
    ink: "#2c2415",
  },
];

export function backgroundById(id: string | null | undefined): StoryBackground {
  return STORY_BACKGROUNDS.find((b) => b.id === id) ?? STORY_BACKGROUNDS[0]!;
}

/* ------------------------------ text presets ------------------------------ */

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
  /** Base size at scale 1, in px on a 390-wide canvas. */
  baseSize: number;
  /** Soft shadow for legibility over imagery. */
  shadow: string;
}

/**
 * Bloom-owned expressive range built only from bundled/system type —
 * no proprietary font files, same expressive breadth.
 */
export const STORY_FONTS: StoryFontPreset[] = [
  {
    id: "classic",
    name: "Classic",
    hint: "Clean and calm",
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    fontWeight: 500,
    fontStyle: "normal",
    letterSpacing: "-0.01em",
    lineHeight: 1.25,
    textTransform: "none",
    baseSize: 34,
    shadow: "0 2px 18px rgba(10,8,20,0.45)",
  },
  {
    id: "editorial",
    name: "Editorial",
    hint: "Serif headlines",
    fontFamily: "Fraunces, ui-serif, Georgia, serif",
    fontWeight: 560,
    fontStyle: "normal",
    letterSpacing: "-0.015em",
    lineHeight: 1.12,
    textTransform: "none",
    baseSize: 44,
    shadow: "0 2px 22px rgba(10,8,20,0.4)",
  },
  {
    id: "soft",
    name: "Soft",
    hint: "Rounded and kind",
    fontFamily: "ui-rounded, 'SF Pro Rounded', Inter, system-ui, sans-serif",
    fontWeight: 500,
    fontStyle: "normal",
    letterSpacing: "0em",
    lineHeight: 1.3,
    textTransform: "none",
    baseSize: 33,
    shadow: "0 2px 16px rgba(10,8,20,0.4)",
  },
  {
    id: "bold",
    name: "Bold",
    hint: "Say it loud",
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    fontWeight: 800,
    fontStyle: "normal",
    letterSpacing: "-0.02em",
    lineHeight: 1.05,
    textTransform: "uppercase",
    baseSize: 40,
    shadow: "0 3px 24px rgba(10,8,20,0.5)",
  },
  {
    id: "handwritten",
    name: "Handwritten",
    hint: "Like a margin note",
    fontFamily: "'Segoe Script', 'Bradley Hand', 'Chalkboard SE', cursive",
    fontWeight: 500,
    fontStyle: "normal",
    letterSpacing: "0em",
    lineHeight: 1.35,
    textTransform: "none",
    baseSize: 34,
    shadow: "0 2px 14px rgba(10,8,20,0.35)",
  },
  {
    id: "typewriter",
    name: "Typewriter",
    hint: "Mono, deliberate",
    fontFamily: "'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace",
    fontWeight: 500,
    fontStyle: "normal",
    letterSpacing: "0em",
    lineHeight: 1.45,
    textTransform: "none",
    baseSize: 26,
    shadow: "0 2px 14px rgba(10,8,20,0.4)",
  },
  {
    id: "elegant",
    name: "Elegant",
    hint: "Italic serif",
    fontFamily: "Fraunces, ui-serif, Georgia, serif",
    fontWeight: 480,
    fontStyle: "italic",
    letterSpacing: "0em",
    lineHeight: 1.2,
    textTransform: "none",
    baseSize: 38,
    shadow: "0 2px 20px rgba(10,8,20,0.4)",
  },
  {
    id: "minimal",
    name: "Minimal",
    hint: "Small caps, spaced",
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    fontWeight: 600,
    fontStyle: "normal",
    letterSpacing: "0.22em",
    lineHeight: 1.6,
    textTransform: "uppercase",
    baseSize: 20,
    shadow: "0 2px 12px rgba(10,8,20,0.4)",
  },
  {
    id: "poster",
    name: "Poster",
    hint: "Condensed punch",
    fontFamily: "'Arial Narrow', 'Helvetica Neue Condensed', Impact, sans-serif",
    fontWeight: 700,
    fontStyle: "normal",
    letterSpacing: "0.02em",
    lineHeight: 1.0,
    textTransform: "uppercase",
    baseSize: 46,
    shadow: "0 4px 26px rgba(10,8,20,0.55)",
  },
  {
    id: "whisper",
    name: "Whisper",
    hint: "Light and low",
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    fontWeight: 300,
    fontStyle: "normal",
    letterSpacing: "0.04em",
    lineHeight: 1.5,
    textTransform: "none",
    baseSize: 27,
    shadow: "0 1px 12px rgba(10,8,20,0.35)",
  },
];

export function fontPresetById(id: string | null | undefined): StoryFontPreset {
  return STORY_FONTS.find((f) => f.id === id) ?? STORY_FONTS[0]!;
}

/* -------------------------------- filters --------------------------------- */

export interface StoryFilter {
  id: string;
  name: string;
  hint: string;
  /** CSS filter applied to base media (and thumbnails). */
  css: string;
  /** Optional color wash overlay: [css background, blend mode, opacity]. */
  wash?: [string, string, number] | undefined;
}

export const STORY_FILTERS: StoryFilter[] = [
  { id: "none", name: "Original", hint: "Untouched", css: "none" },
  {
    id: "soft",
    name: "Soft",
    hint: "Lifted and gentle",
    css: "brightness(1.06) contrast(0.96) saturate(0.94)",
  },
  {
    id: "midnight",
    name: "Midnight",
    hint: "Cool evening",
    css: "brightness(0.94) contrast(1.06) saturate(0.92) hue-rotate(-8deg)",
    wash: ["linear-gradient(180deg, rgba(70,80,160,0.16), rgba(20,16,40,0.22))", "overlay", 1],
  },
  {
    id: "warm",
    name: "Warm",
    hint: "Golden drift",
    css: "brightness(1.03) contrast(1.0) saturate(1.08) sepia(0.22)",
  },
  {
    id: "mist",
    name: "Mist",
    hint: "Faded film",
    css: "brightness(1.08) contrast(0.88) saturate(0.8)",
    wash: ["rgba(220,225,235,0.14)", "screen", 1],
  },
  {
    id: "lavender",
    name: "Lavender",
    hint: "Bloom's own tint",
    css: "brightness(1.02) contrast(1.0) saturate(1.05) hue-rotate(12deg)",
    wash: ["rgba(150,130,220,0.14)", "overlay", 1],
  },
  {
    id: "golden",
    name: "Golden",
    hint: "Late light",
    css: "brightness(1.05) contrast(1.04) saturate(1.12) sepia(0.3)",
  },
  {
    id: "film",
    name: "Film",
    hint: "Quiet grain",
    css: "brightness(0.98) contrast(1.08) saturate(0.86)",
    wash: ["rgba(30,24,40,0.18)", "multiply", 1],
  },
  {
    id: "mono",
    name: "Mono",
    hint: "One color",
    css: "grayscale(1) brightness(1.02) contrast(1.06)",
  },
];

export function filterById(id: string | null | undefined): StoryFilter {
  return STORY_FILTERS.find((f) => f.id === id) ?? STORY_FILTERS[0]!;
}

/** Compose adjustments into a single CSS filter string. */
export function adjustmentsToCss(a: StoryAdjustments | null | undefined): string {
  if (!a) return "none";
  const parts: string[] = [];
  if (a.brightness !== 0) parts.push(`brightness(${1 + a.brightness / 100})`);
  if (a.contrast !== 0) parts.push(`contrast(${1 + a.contrast / 100})`);
  if (a.saturation !== 0) parts.push(`saturate(${Math.max(0, 1 + a.saturation / 100)})`);
  if (a.warmth !== 0) parts.push(`sepia(${Math.min(0.6, Math.abs(a.warmth) / 160)})`);
  // warmth direction: positive warms via sepia+hue, negative cools via hue
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

/* ------------------------------- reactions -------------------------------- */

export interface ReactionMeta {
  id: StoryReactionKind;
  label: string;
  /** Emoji grapheme — system emoji, no custom assets needed. */
  glyph: string;
}

export const REACTION_META: Record<StoryReactionKind, ReactionMeta> = {
  heart: { id: "heart", label: "Love", glyph: "❤️" },
  bloom: { id: "bloom", label: "Bloom", glyph: "🌸" },
  sparkle: { id: "sparkle", label: "Sparkle", glyph: "✨" },
  smile: { id: "smile", label: "Warm smile", glyph: "😊" },
  cheer: { id: "cheer", label: "Cheering", glyph: "🎉" },
  moon: { id: "moon", label: "Quiet night", glyph: "🌙" },
};

/* ------------------------------ bloom motion ------------------------------ */
/* The always-available motion pack: looping emoji moments that need no
 * network, no key, and no rights — they place as animated text elements. */

export interface MotionItem {
  id: string;
  emoji: string;
  animation: "float" | "pulse";
  label: string;
}

export const MOTION_PACK: MotionItem[] = [
  { id: "love", emoji: "❤️", animation: "pulse", label: "Love" },
  { id: "bloom", emoji: "🌸", animation: "float", label: "Bloom" },
  { id: "sparkle", emoji: "✨", animation: "pulse", label: "Sparkle" },
  { id: "moon", emoji: "🌙", animation: "float", label: "Moon" },
  { id: "sun", emoji: "☀️", animation: "pulse", label: "Sun" },
  { id: "fire", emoji: "🔥", animation: "pulse", label: "Fire" },
  { id: "party", emoji: "🎉", animation: "pulse", label: "Party" },
  { id: "balloon", emoji: "🎈", animation: "float", label: "Balloon" },
  { id: "gift", emoji: "🎁", animation: "pulse", label: "Gift" },
  { id: "butterfly", emoji: "🦋", animation: "float", label: "Butterfly" },
  { id: "leaf", emoji: "🍃", animation: "float", label: "Leaf" },
  { id: "rainbow", emoji: "🌈", animation: "float", label: "Rainbow" },
  { id: "snow", emoji: "❄️", animation: "float", label: "Snow" },
  { id: "music", emoji: "🎵", animation: "float", label: "Music" },
  { id: "star", emoji: "⭐", animation: "pulse", label: "Star" },
  { id: "diamond", emoji: "💎", animation: "pulse", label: "Diamond" },
  { id: "bell", emoji: "🔔", animation: "pulse", label: "Bell" },
  { id: "wave", emoji: "🌊", animation: "float", label: "Wave" },
];

/* --------------------------------- gifts ---------------------------------- */

export interface GiftMeta {
  id: StoryGiftKind;
  name: string;
  hint: string;
  glyph: string;
  /** Petal burst tint used in the send animation. */
  tint: string;
}

export const GIFT_META: Record<StoryGiftKind, GiftMeta> = {
  bloom: {
    id: "bloom",
    name: "Bloom",
    hint: "A flower for your moment",
    glyph: "🌸",
    tint: "#e0a3b8",
  },
  petal: {
    id: "petal",
    name: "Petals",
    hint: "Soft petals drift up",
    glyph: "🌺",
    tint: "#e8b4c4",
  },
  star: { id: "star", name: "Star", hint: "For a bright one", glyph: "⭐", tint: "#eed9a4" },
  heart: { id: "heart", name: "Heart", hint: "Held close", glyph: "💜", tint: "#b7a6e8" },
  candle: { id: "candle", name: "Candle", hint: "A quiet light", glyph: "🕯️", tint: "#e8c98a" },
  moon: { id: "moon", name: "Moon", hint: "Rest well", glyph: "🌙", tint: "#9fb6cf" },
  ribbon: { id: "ribbon", name: "Ribbon", hint: "Tied with care", glyph: "🎀", tint: "#e0a3b8" },
  spark: { id: "spark", name: "Spark", hint: "A tiny celebration", glyph: "✨", tint: "#eed9a4" },
};

/* -------------------------------- templates ------------------------------- */

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
    id: "little-win",
    name: "Today's little win",
    hint: "Name one small thing",
    backgroundId: "golden-hour",
    preset: "editorial",
    heading: "Today's little win",
    placeholder: "What went right, even a little?",
    stickerIds: ["bloom.spark-2", "bloom.sprig-1"],
    ink: "#fbf0dd",
  },
  {
    id: "feeling",
    name: "Feeling today",
    hint: "One word for the day",
    backgroundId: "mist",
    preset: "soft",
    heading: "Today felt like",
    placeholder: "Calm, heavy, bright…",
    stickerIds: ["mood.calm"],
    ink: "#1f2433",
  },
  {
    id: "morning",
    name: "Morning",
    hint: "How the day begins",
    backgroundId: "morning",
    preset: "minimal",
    heading: "Morning",
    placeholder: "First thought of the day…",
    stickerIds: ["bloom.sun-1"],
    ink: "#2c2415",
  },
  {
    id: "night",
    name: "Night",
    hint: "Close the day softly",
    backgroundId: "moonlight",
    preset: "whisper",
    heading: "Night notes",
    placeholder: "What are you carrying to bed?",
    stickerIds: ["bloom.moon-1"],
    ink: "#f4efe4",
  },
  {
    id: "grateful",
    name: "Grateful for",
    hint: "Three small things",
    backgroundId: "garden",
    preset: "elegant",
    heading: "Grateful for",
    placeholder: "1. …\n2. …\n3. …",
    stickerIds: ["bloom.leaf-2"],
    ink: "#eef2e4",
  },
  {
    id: "progress",
    name: "Progress",
    hint: "Showing up counts",
    backgroundId: "quiet-room",
    preset: "bold",
    heading: "Kept showing up",
    placeholder: "What did you stay consistent with?",
    stickerIds: ["habit.streak-1"],
    ink: "#ece7f7",
  },
  {
    id: "memory",
    name: "Memory",
    hint: "Pair with a photo",
    backgroundId: "warm-linen",
    preset: "typewriter",
    heading: "Remember this",
    placeholder: "Where were you? Who was there?",
    stickerIds: ["bloom.frame-1"],
    ink: "#2c2415",
  },
  {
    id: "weekend",
    name: "Weekend",
    hint: "Slow days",
    backgroundId: "soft-rain",
    preset: "handwritten",
    heading: "Weekend",
    placeholder: "Slow morning plans…",
    stickerIds: ["bloom.cloud-1"],
    ink: "#e8ecf4",
  },
];
