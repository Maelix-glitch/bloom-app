/**
 * Bloom Story Platform — canvas element engine.
 * Factories, validation, safe deserialization, and complexity limits.
 * Everything stored in `stories.elements` passes through here on both ends.
 */

import type {
  BloomStoryData,
  StoryAdjustments,
  StoryDataMetric,
  StoryDataVariant,
  StoryElement,
  StoryElementKind,
  StoryTextPreset,
} from "./types";
import { stickerById } from "./stickers";
import { FRAMES, MASKS, type PhotoFrame, type PhotoMask } from "./canvas/masks";
import { SHAPES, type ShapeKind } from "./canvas/shapes";
import { isTypePresetId } from "./canvas/typography";
import { DEFAULT_TEXT_STYLE, type TextBackdrop, type TextStyle } from "./canvas/typography";

function isTextPreset(value: unknown): value is StoryTextPreset {
  return isTypePresetId(value);
}

/* --------------------------------- limits -------------------------------- */

export const ELEMENT_LIMITS = {
  /** Hard cap on canvas objects per story. */
  maxElements: 48,
  /** Hard cap on photo layers, so payloads stay shippable. */
  maxPhotos: 9,
  /** Longest edge a slot photo is re-encoded to. */
  photoMaxEdge: 1400,
  /** Per-photo data-URL budget (characters). */
  maxPhotoChars: 900_000,
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

const frac = (v: unknown, fallback: number, min = 0.01, max = 2) =>
  clamp(Number(v), min, max) || fallback;

function isPhotoMask(value: unknown): value is PhotoMask {
  return typeof value === "string" && MASKS.some((m) => m.id === value);
}

function isPhotoFrame(value: unknown): value is PhotoFrame {
  return typeof value === "string" && FRAMES.some((f) => f.id === value);
}

function isShapeKind(value: unknown): value is ShapeKind {
  return typeof value === "string" && SHAPES.some((s) => s.id === value);
}

const DATA_METRICS: readonly StoryDataMetric[] = [
  "mood",
  "sleep",
  "water",
  "movement",
  "study",
  "energy",
  "habits",
  "streak",
  "points",
  "cycle",
  "today",
];

const DATA_VARIANTS: readonly StoryDataVariant[] = [
  "card",
  "inline",
  "ring",
  "bars",
  "list",
  "phase",
];

const BLEND_MODES: readonly string[] = [
  "normal",
  "multiply",
  "screen",
  "overlay",
  "soft-light",
  "hard-light",
  "color-dodge",
  "color-burn",
  "difference",
  "exclusion",
  "luminosity",
];

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
  opts: {
    x?: number | undefined;
    y?: number | undefined;
    z?: number | undefined;
    scale?: number | undefined;
    src?: string | undefined;
    still?: string | undefined;
    width?: number | undefined;
    height?: number | undefined;
  } = {},
): Extract<StoryElement, { kind: "sticker" }> | null {
  const src =
    opts.src && isSafeHttpUrl(opts.src) ? opts.src.slice(0, ELEMENT_LIMITS.maxUrlChars) : undefined;
  if (!src && !stickerById(stickerId)) return null;
  return {
    ...placement(opts.x, opts.y, opts.z),
    kind: "sticker",
    stickerId: stickerId.slice(0, 120),
    scale: opts.scale ?? 1,
    ...(src
      ? {
          src,
          still:
            opts.still && isSafeHttpUrl(opts.still)
              ? opts.still.slice(0, ELEMENT_LIMITS.maxUrlChars)
              : undefined,
          width: clamp(Math.round(opts.width ?? 200) || 200, 16, 1200),
          height: clamp(Math.round(opts.height ?? 200) || 200, 16, 1200),
        }
      : {}),
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

/* --------------------------- photo / shape / data ------------------------- */

export function makePhotoElement(
  opts: {
    slot?: string;
    src?: string;
    naturalWidth?: number;
    naturalHeight?: number;
    x?: number;
    y?: number;
    z?: number;
    w?: number;
    h?: number;
    mask?: PhotoMask | undefined;
    frame?: PhotoFrame | undefined;
    frameColor?: string | undefined;
    zoom?: number | undefined;
    rotation?: number | undefined;
    radius?: number | undefined;
    border?: { color: string; width: number } | null | undefined;
    shadow?: boolean | undefined;
    fit?: "cover" | "contain" | undefined;
    filterId?: string | undefined;
    opacity?: number | undefined;
    name?: string | undefined;
    alt?: string | undefined;
  } = {},
): Extract<StoryElement, { kind: "photo" }> {
  const base = placement(opts.x, opts.y, opts.z);
  return {
    ...base,
    kind: "photo",
    ...(opts.slot ? { slot: opts.slot.slice(0, 40) } : {}),
    src: opts.src ?? "",
    naturalWidth: clamp(Math.round(opts.naturalWidth ?? 0), 0, 20000),
    naturalHeight: clamp(Math.round(opts.naturalHeight ?? 0), 0, 20000),
    w: frac(opts.w, 0.62, 0.05, 1.4),
    h: frac(opts.h, 0.34, 0.05, 1.4),
    mask: opts.mask ?? "rect",
    frame: opts.frame ?? "none",
    frameColor: opts.frameColor ?? "#FBF8F1",
    zoom: clamp(opts.zoom ?? 1, 1, 6),
    panX: 0,
    panY: 0,
    fit: opts.fit === "contain" ? "contain" : "cover",
    flipX: false,
    flipY: false,
    filterId: opts.filterId ?? "none",
    border: opts.border ?? null,
    shadow: opts.shadow ?? false,
    blurFill: false,
    letterbox: null,
    alt: (opts.alt ?? "").slice(0, 300),
    rotation: opts.rotation ?? 0,
    ...(opts.opacity !== undefined ? { opacity: clamp(opts.opacity, 5, 100) } : {}),
    ...(opts.name ? { name: opts.name.slice(0, 40) } : {}),
  };
}

export function makeShapeElement(
  shape: ShapeKind,
  opts: {
    x?: number;
    y?: number;
    z?: number;
    w?: number;
    h?: number;
    fill?: string | null | undefined;
    stroke?: string | null | undefined;
    strokeWidth?: number | undefined;
    rotation?: number | undefined;
    opacity?: number | undefined;
    blur?: number | undefined;
    blend?: string | undefined;
    name?: string | undefined;
  } = {},
): Extract<StoryElement, { kind: "shape" }> | null {
  if (!isShapeKind(shape)) return null;
  const def = SHAPES.find((d) => d.id === shape)!;
  const w = frac(opts.w, 0.3, 0.01, 2);
  const h = frac(opts.h, w / Math.max(0.05, def.aspect), 0.002, 2);
  return {
    ...placement(opts.x, opts.y, opts.z),
    kind: "shape",
    shape,
    w,
    h,
    fill: opts.fill === undefined ? "#F4EFE4" : opts.fill,
    stroke: opts.stroke ?? null,
    strokeWidth: clamp(opts.strokeWidth ?? 2, 0.5, 40),
    blur: clamp(opts.blur ?? 0, 0, 80),
    invert: false,
    rotation: opts.rotation ?? 0,
    ...(opts.opacity !== undefined ? { opacity: clamp(opts.opacity, 3, 100) } : {}),
    ...(opts.blend && BLEND_MODES.includes(opts.blend) ? { blend: opts.blend } : {}),
    ...(opts.name ? { name: opts.name.slice(0, 40) } : {}),
  };
}

export function makeDataElement(
  metric: StoryDataMetric,
  opts: {
    x?: number;
    y?: number;
    z?: number;
    w?: number | undefined;
    h?: number | undefined;
    variant?: StoryDataVariant | undefined;
    label?: string | undefined;
    accent?: string | undefined;
    hideWhenEmpty?: boolean | undefined;
  } = {},
): Extract<StoryElement, { kind: "data" }> | null {
  if (!DATA_METRICS.includes(metric)) return null;
  const w = frac(opts.w, 0.62, 0.1, 1.2);
  const h = frac(opts.h, 0.16, 0.03, 1.2);
  return {
    ...placement(opts.x, opts.y, opts.z),
    kind: "data",
    metric,
    variant: opts.variant && DATA_VARIANTS.includes(opts.variant) ? opts.variant : "card",
    label: (opts.label ?? "").slice(0, 60),
    accent: opts.accent ?? "#EED9A4",
    w,
    h,
    hideWhenEmpty: opts.hideWhenEmpty ?? true,
    manualValue: null,
  };
}

export function countPhotos(elements: StoryElement[]): number {
  return elements.filter((e) => e.kind === "photo").length;
}

/** True when Bloom has a real reading for this metric — never guess. */
export function hasMetricData(data: BloomStoryData | null, metric: StoryDataMetric): boolean {
  if (!data) return false;
  switch (metric) {
    case "mood":
      return data.mood !== null;
    case "sleep":
      return data.sleep !== null;
    case "water":
      return data.water !== null;
    case "movement":
      return data.movement !== null;
    case "study":
      return data.study !== null;
    case "energy":
      return data.energy !== null;
    case "habits":
      return data.habits !== null;
    case "streak":
      return data.streak !== null;
    case "points":
      return data.points !== null;
    case "cycle":
      return data.cycle !== null;
    case "today":
      return data.today !== null;
  }
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
  "photo",
  "shape",
  "data",
];

function sanitizeBase(raw: Record<string, unknown>, fallbackZ: number) {
  const out: Record<string, unknown> = {
    id: typeof raw["id"] === "string" && raw["id"].length <= 64 ? raw["id"] : newElementId(),
    x: clamp(Number(raw["x"] ?? 0.5), 0.02, 0.98),
    y: clamp(Number(raw["y"] ?? 0.42), 0.02, 0.98),
    scale: clamp(Number(raw["scale"] ?? 1), ELEMENT_LIMITS.minScale, ELEMENT_LIMITS.maxScale),
    rotation: clamp(Number(raw["rotation"] ?? 0), -180, 180),
    z: Number.isFinite(Number(raw["z"])) ? Math.round(Number(raw["z"])) : fallbackZ,
  };
  if (typeof raw["w"] === "number" && Number.isFinite(raw["w"]))
    out["w"] = clamp(raw["w"], 0.002, 2);
  if (typeof raw["h"] === "number" && Number.isFinite(raw["h"]))
    out["h"] = clamp(raw["h"], 0.002, 2);
  if (typeof raw["opacity"] === "number" && Number.isFinite(raw["opacity"]))
    out["opacity"] = clamp(raw["opacity"], 3, 100);
  if (typeof raw["visible"] === "boolean") out["visible"] = raw["visible"];
  if (typeof raw["locked"] === "boolean") out["locked"] = raw["locked"];
  if (typeof raw["name"] === "string") out["name"] = raw["name"].slice(0, 40);
  if (typeof raw["blend"] === "string" && BLEND_MODES.includes(raw["blend"]))
    out["blend"] = raw["blend"];
  return out as ReturnType<typeof baseShape>;
}

/** Shape helper so `sanitizeBase` keeps a precise return type. */
function baseShape() {
  return {
    id: "",
    x: 0.5,
    y: 0.42,
    scale: 1,
    rotation: 0,
    z: 0,
    w: undefined as number | undefined,
    h: undefined as number | undefined,
    opacity: undefined as number | undefined,
    visible: undefined as boolean | undefined,
    locked: undefined as boolean | undefined,
    name: undefined as string | undefined,
    blend: undefined as string | undefined,
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

const BACKDROPS: readonly TextBackdrop[] = ["none", "pill", "highlight", "veil", "outline", "card"];

function sanitizeTextStyle(value: unknown): Partial<TextStyle> | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  const out: Partial<TextStyle> = {};
  if (typeof raw["size"] === "number" && Number.isFinite(raw["size"]))
    out.size = clamp(raw["size"], 0.35, 3.2);
  if (typeof raw["weight"] === "number" && Number.isFinite(raw["weight"]))
    out.weight = clamp(Math.round(raw["weight"] / 100) * 100, 100, 900);
  if (typeof raw["tracking"] === "number" && Number.isFinite(raw["tracking"]))
    out.tracking = clamp(raw["tracking"], -0.06, 0.6);
  if (typeof raw["leading"] === "number" && Number.isFinite(raw["leading"]))
    out.leading = clamp(raw["leading"], 0.85, 2.4);
  if (
    raw["transform"] === "none" ||
    raw["transform"] === "uppercase" ||
    raw["transform"] === "lowercase" ||
    raw["transform"] === "capitalize"
  )
    out.transform = raw["transform"];
  if (
    typeof raw["backdrop"] === "string" &&
    (BACKDROPS as readonly string[]).includes(raw["backdrop"])
  )
    out.backdrop = raw["backdrop"] as TextBackdrop;
  if (isSafeColor(raw["backdropColor"])) out.backdropColor = raw["backdropColor"] as string;
  if (typeof raw["outline"] === "number" && Number.isFinite(raw["outline"]))
    out.outline = clamp(raw["outline"], 0, 12);
  if (isSafeColor(raw["outlineColor"])) out.outlineColor = raw["outlineColor"] as string;
  if (typeof raw["shadow"] === "boolean") out.shadow = raw["shadow"];
  if (typeof raw["maxWidth"] === "number" && Number.isFinite(raw["maxWidth"]))
    out.maxWidth = clamp(Math.round(raw["maxWidth"]), 60, 700);
  return Object.keys(out).length > 0 ? out : undefined;
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
          raw["animation"] === "fade" ||
          raw["animation"] === "rise" ||
          raw["animation"] === "type" ||
          raw["animation"] === "float" ||
          raw["animation"] === "pulse"
            ? raw["animation"]
            : "none",
        style: sanitizeTextStyle(raw["style"]),
      };
    }
    case "sticker": {
      const stickerId = text(raw["stickerId"], 120);
      const src =
        typeof raw["src"] === "string" && isSafeHttpUrl(raw["src"]) ? raw["src"] : undefined;
      if (!src && !stickerById(stickerId)) return null;
      return {
        ...base,
        kind,
        stickerId: stickerId || "sticker",
        ...(src
          ? {
              src,
              still:
                typeof raw["still"] === "string" && isSafeHttpUrl(raw["still"])
                  ? raw["still"]
                  : undefined,
              width: clamp(Math.round(Number(raw["width"]) || 200), 16, 1200),
              height: clamp(Math.round(Number(raw["height"]) || 200), 16, 1200),
            }
          : {}),
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
    case "photo": {
      const src = typeof raw["src"] === "string" ? raw["src"] : "";
      const okSrc =
        src === "" ||
        (src.startsWith("data:image/") && src.length <= ELEMENT_LIMITS.maxPhotoChars) ||
        isSafeHttpUrl(src);
      if (!okSrc) return null;
      const border =
        raw["border"] && typeof raw["border"] === "object"
          ? (() => {
              const b = raw["border"] as Record<string, unknown>;
              return isSafeColor(b["color"])
                ? { color: b["color"] as string, width: clamp(Number(b["width"]) || 2, 0, 40) }
                : null;
            })()
          : null;
      return {
        ...base,
        kind,
        ...(typeof raw["slot"] === "string" ? { slot: raw["slot"].slice(0, 40) } : {}),
        src,
        naturalWidth: clamp(Math.round(Number(raw["naturalWidth"]) || 0), 0, 20000),
        naturalHeight: clamp(Math.round(Number(raw["naturalHeight"]) || 0), 0, 20000),
        w: clamp(Number(raw["w"]) || 0.6, 0.05, 1.4),
        h: clamp(Number(raw["h"]) || 0.34, 0.05, 1.4),
        mask: isPhotoMask(raw["mask"]) ? raw["mask"] : "rect",
        frame: isPhotoFrame(raw["frame"]) ? raw["frame"] : "none",
        frameColor: isSafeColor(raw["frameColor"]) ? (raw["frameColor"] as string) : "#FBF8F1",
        zoom: clamp(Number(raw["zoom"]) || 1, 1, 6),
        panX: clamp(Number(raw["panX"]) || 0, -0.5, 0.5),
        panY: clamp(Number(raw["panY"]) || 0, -0.5, 0.5),
        fit: raw["fit"] === "contain" ? "contain" : "cover",
        flipX: raw["flipX"] === true,
        flipY: raw["flipY"] === true,
        filterId: text(raw["filterId"], 40, "none"),
        border,
        shadow: raw["shadow"] === true,
        blurFill: raw["blurFill"] === true,
        letterbox: isSafeColor(raw["letterbox"]) ? (raw["letterbox"] as string) : null,
        alt: text(raw["alt"], 300),
      };
    }
    case "shape": {
      if (!isShapeKind(raw["shape"])) return null;
      return {
        ...base,
        kind,
        shape: raw["shape"],
        w: clamp(Number(raw["w"]) || 0.3, 0.002, 2),
        h: clamp(Number(raw["h"]) || 0.1, 0.002, 2),
        fill: isSafeColor(raw["fill"]) ? (raw["fill"] as string) : null,
        stroke: isSafeColor(raw["stroke"]) ? (raw["stroke"] as string) : null,
        strokeWidth: clamp(Number(raw["strokeWidth"]) || 2, 0.5, 40),
        blur: clamp(Number(raw["blur"]) || 0, 0, 80),
        invert: raw["invert"] === true,
      };
    }
    case "data": {
      const metric = raw["metric"] as StoryDataMetric;
      if (!DATA_METRICS.includes(metric)) return null;
      const variant = raw["variant"] as StoryDataVariant;
      return {
        ...base,
        kind,
        metric,
        variant: DATA_VARIANTS.includes(variant) ? variant : "card",
        label: text(raw["label"], 60),
        accent: isSafeColor(raw["accent"]) ? (raw["accent"] as string) : "#EED9A4",
        w: clamp(Number(raw["w"]) || 0.6, 0.1, 1.2),
        h: clamp(Number(raw["h"]) || 0.16, 0.03, 1.2),
        hideWhenEmpty: raw["hideWhenEmpty"] !== false,
        manualValue:
          typeof raw["manualValue"] === "string" ? raw["manualValue"].slice(0, 120) : null,
      };
    }
  }
}

/**
 * Serialize for storage: sanitized clone, drawings kept under the cap, and
 * never more photos than the payload budget allows. Empty photo slots are
 * template scaffolding — they are dropped on the way out and re-added when a
 * template is instantiated.
 */
export function serializeElements(elements: StoryElement[]): StoryElement[] {
  const clean = sanitizeElements(JSON.parse(JSON.stringify(elements)) as unknown);
  let photos = 0;
  return clean.filter((el) => {
    if (el.kind !== "photo") return true;
    if (!el.src) return false;
    photos += 1;
    return photos <= ELEMENT_LIMITS.maxPhotos;
  });
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
