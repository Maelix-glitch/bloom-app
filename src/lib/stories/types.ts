/**
 * Bloom Story Platform — domain types.
 * Type-only imports keep this module free of runtime dependencies, so
 * `@/lib/profile/types` can import from here without pulling in the canvas.
 */

import type { PhotoFrame, PhotoMask } from "./canvas/masks";
import type { ShapeKind } from "./canvas/shapes";
import type { TextAlign, TextBackdrop, TextStyle, TypePresetId } from "./canvas/typography";
import type { StoryBackgroundState } from "./canvas/backgrounds";

/**
 * What a published story carries in `stories.canvas`: the composed background
 * (paint, photo, texture, overlay, ink). Type-only alias so the profile types
 * can name it without pulling the canvas runtime into the domain layer.
 */
export type StoryCanvasSnapshot = StoryBackgroundState;

/** Where a story's audience ends. `close` = close friends only. */
export type StoryAudience = "all" | "close";

/** What the story's base layer is. */
export type StoryMediaType = "none" | "image" | "video";

/** Every placeable element on the story canvas. */
export type StoryElementKind =
  | "text"
  | "sticker"
  | "drawing"
  | "poll"
  | "question"
  | "slider"
  | "countdown"
  | "mention"
  | "date"
  | "music"
  | "gif"
  | "photo"
  | "shape"
  | "data";

/** Placement shared by every canvas element. Coordinates are canvas-relative (0–1). */
export interface StoryElementBase {
  /** Stable client id (uuid). Server votes key off this. */
  id: string;
  kind: StoryElementKind;
  /** Center position, 0–1 across the canvas. */
  x: number;
  y: number;
  /** Scale multiplier. */
  scale: number;
  /** Rotation in degrees. */
  rotation: number;
  /** Stack order. */
  z: number;
  /**
   * Box size as a fraction of the canvas, for the kinds that own a box
   * (photo, shape, data). Absent on the free-floating kinds, which size
   * themselves from their content.
   */
  w?: number | undefined;
  h?: number | undefined;
  /** 0–100. Absent = fully opaque. */
  opacity?: number | undefined;
  /** Hidden layers stay in the document and out of the render. */
  visible?: boolean | undefined;
  /** Locked layers ignore gestures; the layer panel still reaches them. */
  locked?: boolean | undefined;
  /** Human label shown in the layer panel. */
  name?: string | undefined;
  /** CSS blend mode, for light leaks and veils. */
  blend?: string | undefined;
}

/* ------------------------------ photo layers ----------------------------- */

export type { PhotoFrame, PhotoMask, ShapeKind };

export interface StoryPhotoElement extends StoryElementBase {
  kind: "photo";
  /** Template slot this photo fills, when it came from a template. */
  slot?: string | undefined;
  /** data: URL while editing, storage path once published. "" = empty slot. */
  src: string;
  naturalWidth: number;
  naturalHeight: number;
  w: number;
  h: number;
  mask: PhotoMask;
  frame: PhotoFrame;
  frameColor: string;
  /** ≥ 1. How far the photo is pushed into its mask. */
  zoom: number;
  /** −0.5..0.5 of the overflow on each axis. */
  panX: number;
  panY: number;
  fit: "cover" | "contain";
  flipX: boolean;
  flipY: boolean;
  filterId: string;
  border: { color: string; width: number } | null;
  shadow: boolean;
  /** Fill the letterbox with a blurred copy of the same photo. */
  blurFill: boolean;
  /** Flat letterbox color when `blurFill` is off and `fit` is contain. */
  letterbox: string | null;
  alt: string;
}

/* ------------------------------ shape layers ----------------------------- */

export interface StoryShapeElement extends StoryElementBase {
  kind: "shape";
  shape: ShapeKind;
  w: number;
  h: number;
  fill: string | null;
  stroke: string | null;
  strokeWidth: number;
  /** Soft blur in canvas px at export scale. */
  blur: number;
  invert: boolean;
}

/* ------------------------------- data layers ----------------------------- */

/** Real Bloom signals a data layer can surface. Never invented. */
export type StoryDataMetric =
  | "mood"
  | "sleep"
  | "water"
  | "movement"
  | "study"
  | "energy"
  | "habits"
  | "streak"
  | "points"
  | "cycle"
  | "today";

export type StoryDataVariant = "card" | "inline" | "ring" | "bars" | "list" | "phase";

export interface StoryDataElement extends StoryElementBase {
  kind: "data";
  metric: StoryDataMetric;
  variant: StoryDataVariant;
  label: string;
  accent: string;
  w: number;
  h: number;
  /** When there is nothing logged, hide rather than show an empty widget. */
  hideWhenEmpty: boolean;
  /** The user's own words, used when Bloom has no reading for this metric. */
  manualValue: string | null;
}

/** Bloom's type range — see `canvas/typography` for the presets themselves. */
export type StoryTextPreset = TypePresetId;

export type StoryTextAlign = TextAlign;

/** Legacy backdrop names still stored on older stories. */
export type StoryTextBackground = TextBackdrop | "none";

export interface StoryTextElement extends StoryElementBase {
  kind: "text";
  text: string;
  preset: StoryTextPreset;
  align: StoryTextAlign;
  color: string;
  background: StoryTextBackground;
  backgroundColor?: string | undefined;
  /** 0–100 */
  opacity: number;
  animation?: "none" | "fade" | "rise" | "type" | "float" | "pulse" | undefined;
  /**
   * User overrides on top of the preset. Absent on older stories, which then
   * render exactly as their preset describes.
   */
  style?: Partial<TextStyle> | undefined;
}

export interface StoryStickerElement extends StoryElementBase {
  kind: "sticker";
  /** Catalog id (GIPHY `giphy:…`, or a legacy Bloom library id). */
  stickerId: string;
  /** Direct playable URL from GIPHY. Absent on legacy Bloom stickers. */
  src?: string | undefined;
  /** Still preview for reduced-motion. */
  still?: string | undefined;
  width?: number | undefined;
  height?: number | undefined;
  /** Optional tint override (oklch/hex) — Bloom library only. */
  tint?: string | undefined;
  animated?: boolean | undefined;
}

export interface StoryDrawingElement extends StoryElementBase {
  kind: "drawing";
  /** data: URL (PNG) of the flattened drawing layer, or storage path after publish. */
  src: string;
  /** Intrinsic pixel size the src was rendered at. */
  width: number;
  height: number;
}

export interface StoryPollElement extends StoryElementBase {
  kind: "poll";
  question: string;
  options: [string, string] | [string, string, string] | [string, string, string, string];
  /** Accent used for the poll card. */
  color?: string | undefined;
}

export interface StoryQuestionElement extends StoryElementBase {
  kind: "question";
  prompt: string;
  placeholder?: string | undefined;
}

export interface StorySliderElement extends StoryElementBase {
  kind: "slider";
  prompt: string;
  /** Emoji grapheme shown on the knob. */
  emoji: string;
  color?: string | undefined;
}

export interface StoryCountdownElement extends StoryElementBase {
  kind: "countdown";
  title: string;
  /** ISO timestamp being counted to. */
  targetAt: string;
  color?: string | undefined;
}

export interface StoryMentionElement extends StoryElementBase {
  kind: "mention";
  /** @handle without the @. */
  handle: string;
  displayName?: string | undefined;
}

export interface StoryDateElement extends StoryElementBase {
  kind: "date";
  /** ISO date shown; defaults to the story's creation day. */
  at?: string | undefined;
  style?: "soft" | "mono" | "display" | undefined;
}

export interface StoryMusicElement extends StoryElementBase {
  kind: "music";
  trackId: string;
  title: string;
  artist: string;
  /** Where playback starts, ms. */
  startMs: number;
  /** Clip length, ms. */
  durationMs: number;
  /** Resolved at publish/view time; never a copyrighted embed without rights. */
  src?: string | undefined;
  style?: "pill" | "card" | "lyric" | undefined;
}

export interface StoryGifElement extends StoryElementBase {
  kind: "gif";
  gifId: string;
  /** Direct playable URL (provider-approved source only). */
  src: string;
  /** Still preview for low-bandwidth mode. */
  still?: string | undefined;
  width: number;
  height: number;
}

export type StoryElement =
  | StoryTextElement
  | StoryStickerElement
  | StoryDrawingElement
  | StoryPollElement
  | StoryQuestionElement
  | StorySliderElement
  | StoryCountdownElement
  | StoryMentionElement
  | StoryDateElement
  | StoryMusicElement
  | StoryGifElement
  | StoryPhotoElement
  | StoryShapeElement
  | StoryDataElement;

/* --------------------------- real Bloom signals -------------------------- */

/**
 * What Bloom actually knows today, handed to the canvas so data layers can
 * show real numbers. `null` everywhere means "nothing logged" — the canvas
 * hides those layers rather than inventing a figure.
 */
export interface BloomStoryData {
  mood: { value: number; label: string; emotion: string; note: string | null; at: string } | null;
  sleep: {
    minutes: number;
    goal: number;
    quality: number | null;
    bed: string | null;
    wake: string | null;
  } | null;
  water: { ml: number; goal: number } | null;
  movement: { minutes: number; goal: number } | null;
  study: { minutes: number; goal: number; sessions: number } | null;
  energy: { level: number; goal: number } | null;
  habits: { done: number; due: number; names: string[] } | null;
  streak: { days: number; label: string } | null;
  points: { total: number; label: string } | null;
  cycle: { day: number; phase: string; length: number; estimated: boolean } | null;
  /** The best habit streak on record, for "streak" layers. */
  today: { date: string; label: string } | null;
}

export const EMPTY_BLOOM_DATA: BloomStoryData = {
  mood: null,
  sleep: null,
  water: null,
  movement: null,
  study: null,
  energy: null,
  habits: null,
  streak: null,
  points: null,
  cycle: null,
  today: null,
};

/** Non-destructive color adjustments applied over the base media. */
export interface StoryAdjustments {
  brightness: number; // -100..100
  contrast: number; // -100..100
  saturation: number; // -100..100
  warmth: number; // -100..100
  fade: number; // 0..100
}

export interface StoryMusicMeta {
  trackId: string;
  title: string;
  artist: string;
  startMs: number;
  durationMs: number;
  src?: string | undefined;
}

/**
 * One composition inside a story.
 *
 * Every field here is something that used to live directly on the `Story`
 * record; multi-slide moves them per-slide and leaves the top-level copies in
 * place as slide one for older rows.
 *
 * Music is deliberately *not* per-slide: a track is attached to the whole
 * story and keeps playing across slides, which is also how existing
 * single-slide stories behave.
 *
 * The runtime helpers that build, clamp and validate these live in
 * `./slides` — this module stays type-only by design.
 */
export interface StorySlide {
  /** Stable within a story; used for React keys and reordering. */
  id: string;
  /** Base layer kind. `none` for text/background-only slides. */
  mediaType: StoryMediaType;
  /** Where the media lives. Null for background-only slides. */
  mediaPath: string | null;
  mediaWidth: number | null;
  mediaHeight: number | null;
  /** Video clip length in ms; null for images and text. */
  durationMs: number | null;
  /** Canvas elements, z-ordered. */
  elements: StoryElement[];
  /** Photo filter id, if any. */
  filterId: string | null;
  /** Manual adjustments layered over the filter. */
  adjustments: StoryAdjustments | null;
  /** Curated background id for text-first slides. */
  backgroundId: string | null;
  /** Composed canvas — paint, photo, texture, overlay. */
  canvas: StoryCanvasSnapshot | null;
  /** Author-written description for screen readers. */
  altText: string | null;
}

/** Reactions the platform understands. Fixed set — no spam surface. */
export type StoryReactionKind = "heart" | "bloom" | "sparkle" | "smile" | "cheer" | "moon";

export const STORY_REACTIONS: readonly StoryReactionKind[] = [
  "heart",
  "bloom",
  "sparkle",
  "smile",
  "cheer",
  "moon",
];

export function normalizeReaction(value: unknown): StoryReactionKind | null {
  return typeof value === "string" && (STORY_REACTIONS as readonly string[]).includes(value)
    ? (value as StoryReactionKind)
    : null;
}

/** Free expressive gifts. Never money, never inventory. */
export type StoryGiftKind =
  "bloom" | "petal" | "star" | "heart" | "candle" | "moon" | "ribbon" | "spark";

export const STORY_GIFTS: readonly StoryGiftKind[] = [
  "bloom",
  "petal",
  "star",
  "heart",
  "candle",
  "moon",
  "ribbon",
  "spark",
];

export function normalizeGift(value: unknown): StoryGiftKind | null {
  return typeof value === "string" && (STORY_GIFTS as readonly string[]).includes(value)
    ? (value as StoryGiftKind)
    : null;
}

export interface StoryViewRecord {
  storyId: string;
  viewerId: string;
  viewedAt: string;
}

export interface StoryReplyRecord {
  id: string;
  storyId: string;
  userId: string;
  body: string;
  createdAt: string;
  /** Resolved display name when the viewer is allowed to see it. */
  authorName?: string | undefined;
  authorAvatarPath?: string | null | undefined;
}

export interface StoryGiftRecord {
  id: string;
  storyId: string;
  senderId: string;
  gift: StoryGiftKind;
  createdAt: string;
  senderName?: string | undefined;
}

export interface StoryPollTally {
  elementId: string;
  /** Votes per option index. */
  counts: number[];
  total: number;
  /** The current viewer's choice, if any. */
  mine: number | null;
}

export interface StorySettings {
  allowReplies: boolean;
  allowReactions: boolean;
  allowGifts: boolean;
  autoArchive: boolean;
  defaultAudience: StoryAudience;
}

export const DEFAULT_STORY_SETTINGS: StorySettings = {
  allowReplies: true,
  allowReactions: true,
  allowGifts: true,
  autoArchive: true,
  defaultAudience: "all",
};

/** A person in the story rail — own or someone else's active stories. */
export interface StoryRailPerson {
  userId: string;
  displayName: string;
  avatarPath: string | null;
  accent: string;
  storyIds: string[];
  unseenCount: number;
  closeFriends: boolean;
  updatedAt: string;
}
