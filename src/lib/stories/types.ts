/**
 * Bloom Story Platform — domain types.
 * This module is dependency-free on purpose: `@/lib/profile/types`
 * imports from here, never the reverse.
 */

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
  | "gif";

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
}

export type StoryTextPreset =
  | "classic"
  | "editorial"
  | "soft"
  | "bold"
  | "handwritten"
  | "typewriter"
  | "elegant"
  | "minimal"
  | "poster"
  | "whisper";

export type StoryTextAlign = "left" | "center" | "right";

export type StoryTextBackground = "none" | "pill" | "highlight" | "outline" | "veil";

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
}

export interface StoryStickerElement extends StoryElementBase {
  kind: "sticker";
  /** Stable sticker id from the Bloom library (e.g. "bloom.petal-3"). */
  stickerId: string;
  /** Optional tint override (oklch/hex). */
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
  | StoryGifElement;

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

/** Instagram-exact gifts — real gifts like Instagram Live/Reels gifts with star values */
export type StoryGiftKind =
  | "bloom"
  | "petal"
  | "star"
  | "heart"
  | "candle"
  | "moon"
  | "ribbon"
  | "spark"
  | "rose"
  | "crown"
  | "diamond"
  | "rocket"
  | "butterfly"
  | "rainbow"
  | "gift"
  | "party";

export const STORY_GIFTS: readonly StoryGiftKind[] = [
  "bloom",
  "petal",
  "star",
  "heart",
  "candle",
  "moon",
  "ribbon",
  "spark",
  "rose",
  "crown",
  "diamond",
  "rocket",
  "butterfly",
  "rainbow",
  "gift",
  "party",
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
