/**
 * Bloom Story Platform — canvas element engine.
 * Factories, validation, safe deserialization, and complexity limits.
 * Everything stored in `stories.elements` passes through here on both ends.
 */

import type { StoryAdjustments, StoryElement, StoryElementKind, StoryTextPreset } from "./types";
import { stickerById } from "./stickers";

const TEXT_PRESETS: readonly StoryTextPreset[] = [
  "classic",
  "editorial",
  "soft",
  "bold",
  "handwritten",
  "typewriter",
  "elegant",
  "minimal",
  "poster",
  "whisper",
];

function isTextPreset(value: unknown): value is StoryTextPreset {
  return typeof value === "string" && (TEXT_PRESETS as readonly string[]).includes(value);
}

/* --------------------------------- limits -------------------------------- */

export const ELEMENT_LIMITS = {
  /** Hard cap on canvas objects per story. */
  maxElements: 24,
  /** Text length per text element. */
  maxTextLength: 280,
  /** Poll question / options. */
  maxPollQuestion: 80,
  maxPollOption: 28,
  maxPollOptions: 4,
  minPollOptions: 2,
  /** Question sticker. */
  maxQuestionPrompt: 120,
  /** Slider prompt. */
  maxSliderPrompt: 80,
  /** Countdown title. */
  maxCountdownTitle: 60,
  /** Mention handle. */
  maxHandle: 30,
  /** Drawing source payload (data URL chars). */
  maxDrawingChars: 1_200_000,
  /** GIF source URL. */
  maxUrlChars: 2048,
  /** Scale bounds. */
  minScale: 0.25,
  maxScale: 4,
} as const;

export const MEDIA_LIMITS = {
  maxImageBytes: 10 * 1024 * 1024,
  maxVideoBytes: 60 * 1024 * 1024,
  /** 60 seconds of video per story. */
  maxVideoMs: 60_000,
  minVideoMs: 500,
  acceptedImages: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  acceptedVideo: ["video/mp4", "video/webm", "video/quicktime"],
} as const;

export function newElementId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `el-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const clamp = (v: number, min: number, max: number) =>
  Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : min;

function placement(x = 0.5, y = 0.42, z = 0) {
  return {
    id: newElementId(),
    x: clamp(x, 0.02, 0.98),
    y: clamp(y, 0.02, 0.98),
    scale: 1,
    rotation: 0,
    z,
  };
}

/* -------------------------------- factories ------------------------------- */

export function makeTextElement(
  text: string,
  opts: Partial<Extract<StoryElement, { kind: "text" }>> & {
    x?: number;
    y?: number;
    z?: number;
  } = {},
): Extract<StoryElement, { kind: "text" }> {
  const { x, y, z, ...rest } = opts;
  return {
    ...placement(x, y, z),
    kind: "text",
    text: text.slice(0, ELEMENT_LIMITS.maxTextLength),
    preset: "classic",
    align: "center",
    color: "#f4efe4",
    background: "none",
    opacity: 100,
    animation: "none",
    ...rest,
  };
}

export function makeStickerElement(
  stickerId: string,
  opts: { x?: number; y?: number; z?: number; scale?: number } = {},
): Extract<StoryElement, { kind: "sticker" }> | null {
  if (!stickerById(stickerId)) return null;
  return {
    ...placement(opts.x, opts.y, opts.z),
    kind: "sticker",
    stickerId,
    scale: opts.scale ?? 1,
  };
}

export function makePollElement(
  question: string,
  options: string[],
  opts: { x?: number; y?: number; z?: number; color?: string } = {},
): Extract<StoryElement, { kind: "poll" }> {
  const clean = options.map((o) => o.trim().slice(0, ELEMENT_LIMITS.maxPollOption)).filter(Boolean);
  while (clean.length < 2) clean.push(clean.length === 0 ? "Yes" : "No");
  return {
    ...placement(opts.x, opts.y, opts.z),
    kind: "poll",
    question: question.trim().slice(0, ELEMENT_LIMITS.maxPollQuestion) || "Pick one",
    options: clean.slice(0, 4) as [string, string],
    color: opts.color,
  };
}

export function makeQuestionElement(
  prompt: string,
  opts: { x?: number; y?: number; z?: number } = {},
): Extract<StoryElement, { kind: "question" }> {
  return {
    ...placement(opts.x, opts.y, opts.z),
    kind: "question",
    prompt: prompt.trim().slice(0, ELEMENT_LIMITS.maxQuestionPrompt) || "Ask me anything",
  };
}

export function makeSliderElement(
  prompt: string,
  emoji = "🌸",
  opts: { x?: number; y?: number; z?: number; color?: string } = {},
): Extract<StoryElement, { kind: "slider" }> {
  return {
    ...placement(opts.x, opts.y, opts.z),
    kind: "slider",
    prompt: prompt.trim().slice(0, ELEMENT_LIMITS.maxSliderPrompt) || "How was your day?",
    emoji: [...emoji].slice(0, 2).join("") || "🌸",
    color: opts.color,
  };
}

export function makeCountdownElement(
  title: string,
  targetAt: string,
  opts: { x?: number; y?: number; z?: number; color?: string } = {},
): Extract<StoryElement, { kind: "countdown" }> {
  const when = new Date(targetAt).getTime();
  return {
    ...placement(opts.x, opts.y, opts.z),
    kind: "countdown",
    title: title.trim().slice(0, ELEMENT_LIMITS.maxCountdownTitle) || "Counting down",
    targetAt: Number.isFinite(when)
      ? new Date(when).toISOString()
      : new Date(Date.now() + 86400000).toISOString(),
    color: opts.color,
  };
}

export function makeMentionElement(
  handle: string,
  opts: { x?: number; y?: number; z?: number; displayName?: string } = {},
): Extract<StoryElement, { kind: "mention" }> {
  return {
    ...placement(opts.x, opts.y, opts.z),
    kind: "mention",
    handle: handle.replace(/^@/, "").trim().slice(0, ELEMENT_LIMITS.maxHandle),
    displayName: opts.displayName,
  };
}

export function makeDateElement(
  opts: {
    x?: number;
    y?: number;
    z?: number;
    at?: string;
    style?: "soft" | "mono" | "display";
  } = {},
): Extract<StoryElement, { kind: "date" }> {
  return {
    ...placement(opts.x, opts.y, opts.z),
    kind: "date",
    at: opts.at,
    style: opts.style ?? "soft",
  };
}

export function makeMusicElement(
  track: {
    trackId: string;
    title: string;
    artist: string;
    startMs?: number;
    durationMs?: number;
    src?: string;
  },
  opts: { x?: number; y?: number; z?: number; style?: "pill" | "card" | "lyric" } = {},
): Extract<StoryElement, { kind: "music" }> {
  return {
    ...placement(opts.x ?? 0.5, opts.y ?? 0.16, opts.z),
    kind: "music",
    trackId: track.trackId,
    title: track.title.slice(0, 120),
    artist: track.artist.slice(0, 120),
    startMs: Math.max(0, track.startMs ?? 0),
    durationMs: clamp(track.durationMs ?? 15000, 1000, 60000),
    src: track.src,
    style: opts.style ?? "pill",
  };
}

export function makeGifElement(
  gif: { gifId: string; src: string; still?: string; width: number; height: number },
  opts: { x?: number; y?: number; z?: number } = {},
): Extract<StoryElement, { kind: "gif" }> | null {
  if (!isSafeHttpUrl(gif.src)) return null;
  return {
    ...placement(opts.x, opts.y, opts.z),
    kind: "gif",
    gifId: gif.gifId.slice(0, 120),
    src: gif.src.slice(0, ELEMENT_LIMITS.maxUrlChars),
    still:
      gif.still && isSafeHttpUrl(gif.still)
        ? gif.still.slice(0, ELEMENT_LIMITS.maxUrlChars)
        : undefined,
    width: clamp(Math.round(gif.width) || 200, 16, 1200),
    height: clamp(Math.round(gif.height) || 200, 16, 1200),
  };
}

/* ------------------------------- validation ------------------------------ */

export function isSafeHttpUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (value.length > ELEMENT_LIMITS.maxUrlChars) return false;
  try {
    const url = new URL(value, "https://bloom.invalid");
    // Relative paths are allowed only when they stay inside storage namespaces.
    if (value.startsWith("/") && !value.startsWith("//")) return !value.includes("..");
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isSafeColor(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (value.length > 64) return false;
  return (
    /^#[0-9a-fA-F]{3,8}$/.test(value) ||
    /^rgba?\([\d\s.,/%]+\)$/.test(value) ||
    /^hsla?\([\d\s.,/%]+\)$/.test(value) ||
    /^(oklch|oklab|color-mix)\([\w\s.,/%-]+\)$/.test(value) ||
    /^var\(--[\w-]+\)$/.test(value)
  );
}

const KINDS: StoryElementKind[] = [
  "text",
  "sticker",
  "drawing",
  "poll",
  "question",
  "slider",
  "countdown",
  "mention",
  "date",
  "music",
  "gif",
];

function sanitizeBase(raw: Record<string, unknown>, fallbackZ: number) {
  return {
    id: typeof raw["id"] === "string" && raw["id"].length <= 64 ? raw["id"] : newElementId(),
    x: clamp(Number(raw["x"] ?? 0.5), 0.02, 0.98),
    y: clamp(Number(raw["y"] ?? 0.42), 0.02, 0.98),
    scale: clamp(Number(raw["scale"] ?? 1), ELEMENT_LIMITS.minScale, ELEMENT_LIMITS.maxScale),
    rotation: clamp(Number(raw["rotation"] ?? 0), -180, 180),
    z: Number.isFinite(Number(raw["z"])) ? Math.round(Number(raw["z"])) : fallbackZ,
  };
}

/**
 * Defensive deserialization: unknown/malformed entries are dropped, never crash.
 * Used for server rows, drafts, and deep links alike.
 */
export function sanitizeElements(value: unknown): StoryElement[] {
  if (!Array.isArray(value)) return [];
  const out: StoryElement[] = [];
  for (const [index, item] of value.entries()) {
    if (out.length >= ELEMENT_LIMITS.maxElements) break;
    if (!item || typeof item !== "object") continue;
    const raw = item as Record<string, unknown>;
    if (!KINDS.includes(raw["kind"] as StoryElementKind)) continue;
    const base = sanitizeBase(raw, index);
    try {
      const el = sanitizeOne(raw["kind"] as StoryElementKind, raw, base);
      if (el) out.push(el);
    } catch {
      /* drop a single bad element; the story survives */
    }
  }
  return out;
}

function text(value: unknown, max: number, fallback = ""): string {
  if (typeof value !== "string") return fallback;
  return value.slice(0, max);
}

function sanitizeOne(
  kind: StoryElementKind,
  raw: Record<string, unknown>,
  base: ReturnType<typeof sanitizeBase>,
): StoryElement | null {
  switch (kind) {
    case "text": {
      const body = text(raw["text"], ELEMENT_LIMITS.maxTextLength);
      if (!body.trim()) return null;
      const align = raw["align"] === "left" || raw["align"] === "right" ? raw["align"] : "center";
      const background =
        raw["background"] === "pill" ||
        raw["background"] === "highlight" ||
        raw["background"] === "outline" ||
        raw["background"] === "veil"
          ? raw["background"]
          : "none";
      return {
        ...base,
        kind,
        text: body,
        preset: isTextPreset(raw["preset"]) ? raw["preset"] : "classic",
        align,
        color: isSafeColor(raw["color"]) ? raw["color"] : "#f4efe4",
        background,
        backgroundColor: isSafeColor(raw["backgroundColor"]) ? raw["backgroundColor"] : undefined,
        opacity: clamp(Number(raw["opacity"] ?? 100), 10, 100),
        animation:
          raw["animation"] === "fade" || raw["animation"] === "rise" || raw["animation"] === "type"
            ? raw["animation"]
            : "none",
      };
    }
    case "sticker": {
      if (!stickerById(typeof raw["stickerId"] === "string" ? raw["stickerId"] : "")) return null;
      return {
        ...base,
        kind,
        stickerId: raw["stickerId"] as string,
        tint: isSafeColor(raw["tint"]) ? (raw["tint"] as string) : undefined,
        animated: raw["animated"] === true,
      };
    }
    case "drawing": {
      const src = typeof raw["src"] === "string" ? raw["src"] : "";
      const okSrc =
        (src.startsWith("data:image/png;base64,") &&
          src.length <= ELEMENT_LIMITS.maxDrawingChars) ||
        isSafeHttpUrl(src);
      if (!okSrc) return null;
      return {
        ...base,
        kind,
        src,
        width: clamp(Math.round(Number(raw["width"]) || 390), 16, 1600),
        height: clamp(Math.round(Number(raw["height"]) || 690), 16, 2400),
      };
    }
    case "poll": {
      const options = Array.isArray(raw["options"])
        ? raw["options"]
            .filter((o): o is string => typeof o === "string" && o.trim().length > 0)
            .map((o) => o.slice(0, ELEMENT_LIMITS.maxPollOption))
        : [];
      if (options.length < 2) return null;
      return {
        ...base,
        kind,
        question: text(raw["question"], ELEMENT_LIMITS.maxPollQuestion, "Pick one"),
        options: options.slice(0, 4) as [string, string],
        color: isSafeColor(raw["color"]) ? (raw["color"] as string) : undefined,
      };
    }
    case "question":
      return {
        ...base,
        kind,
        prompt: text(raw["prompt"], ELEMENT_LIMITS.maxQuestionPrompt, "Ask me anything"),
        placeholder:
          typeof raw["placeholder"] === "string" ? raw["placeholder"].slice(0, 80) : undefined,
      };
    case "slider": {
      const emoji =
        typeof raw["emoji"] === "string" ? [...raw["emoji"]].slice(0, 2).join("") : "🌸";
      return {
        ...base,
        kind,
        prompt: text(raw["prompt"], ELEMENT_LIMITS.maxSliderPrompt, "How was your day?"),
        emoji: emoji || "🌸",
        color: isSafeColor(raw["color"]) ? (raw["color"] as string) : undefined,
      };
    }
    case "countdown": {
      const when = new Date(typeof raw["targetAt"] === "string" ? raw["targetAt"] : "").getTime();
      return {
        ...base,
        kind,
        title: text(raw["title"], ELEMENT_LIMITS.maxCountdownTitle, "Counting down"),
        targetAt: Number.isFinite(when)
          ? new Date(when).toISOString()
          : new Date(Date.now() + 86400000).toISOString(),
        color: isSafeColor(raw["color"]) ? (raw["color"] as string) : undefined,
      };
    }
    case "mention": {
      const handle = text(raw["handle"], ELEMENT_LIMITS.maxHandle).replace(/^@/, "").trim();
      if (!handle) return null;
      return {
        ...base,
        kind,
        handle,
        displayName:
          typeof raw["displayName"] === "string" ? raw["displayName"].slice(0, 48) : undefined,
      };
    }
    case "date":
      return {
        ...base,
        kind,
        at: typeof raw["at"] === "string" ? raw["at"].slice(0, 32) : undefined,
        style: raw["style"] === "mono" || raw["style"] === "display" ? raw["style"] : "soft",
      };
    case "music":
      return {
        ...base,
        kind,
        trackId: text(raw["trackId"], 120, "local"),
        title: text(raw["title"], 120, "Untitled"),
        artist: text(raw["artist"], 120, "Unknown artist"),
        startMs: Math.max(0, Number(raw["startMs"]) || 0),
        durationMs: clamp(Number(raw["durationMs"]) || 15000, 1000, 60000),
        src: typeof raw["src"] === "string" && isSafeHttpUrl(raw["src"]) ? raw["src"] : undefined,
        style: raw["style"] === "card" || raw["style"] === "lyric" ? raw["style"] : "pill",
      };
    case "gif": {
      const src = typeof raw["src"] === "string" ? raw["src"] : "";
      if (!isSafeHttpUrl(src)) return null;
      return {
        ...base,
        kind,
        gifId: text(raw["gifId"], 120, "gif"),
        src,
        still:
          typeof raw["still"] === "string" && isSafeHttpUrl(raw["still"])
            ? raw["still"]
            : undefined,
        width: clamp(Math.round(Number(raw["width"]) || 200), 16, 1200),
        height: clamp(Math.round(Number(raw["height"]) || 200), 16, 1200),
      };
    }
  }
}

/** Serialize for storage: sanitized clone, drawings kept under the cap. */
export function serializeElements(elements: StoryElement[]): StoryElement[] {
  return sanitizeElements(JSON.parse(JSON.stringify(elements)) as unknown);
}

export function countInteractive(elements: StoryElement[]): number {
  return elements.filter((e) => ["poll", "question", "slider", "countdown"].includes(e.kind))
    .length;
}

export function sanitizeAdjustments(value: unknown): StoryAdjustments | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, number>;
  const num = (k: string) =>
    Number.isFinite(Number(v[k])) ? clamp(Math.round(Number(v[k])), -100, 100) : 0;
  return {
    brightness: num("brightness"),
    contrast: num("contrast"),
    saturation: num("saturation"),
    warmth: num("warmth"),
    fade: clamp(Number.isFinite(Number(v["fade"])) ? Math.round(Number(v["fade"])) : 0, 0, 100),
  };
}
