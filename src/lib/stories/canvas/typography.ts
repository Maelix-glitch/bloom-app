/**
 * Bloom Story Canvas — typography.
 *
 * Bloom-owned type presets built only from fonts the app already ships
 * (Fraunces, Inter, IBM Plex Mono, Cormorant, Caveat, Oswald — all SIL Open
 * Font License) plus system fallbacks. A preset is the starting voice; every
 * axis of it (size, weight, tracking, leading, case, color, background,
 * shadow, outline) is user-editable afterwards.
 */

export type TypePresetId =
  /* legacy ids kept so stored stories keep their voice */
  | "classic"
  | "editorial"
  | "soft"
  | "bold"
  | "handwritten"
  | "typewriter"
  | "elegant"
  | "minimal"
  | "poster"
  | "whisper"
  /* new range */
  | "modern"
  | "romantic"
  | "journal"
  | "cinematic"
  | "playful"
  | "display"
  | "condensed"
  | "note";

export type TextTransform = "none" | "uppercase" | "lowercase" | "capitalize";
export type TextAlign = "left" | "center" | "right";
export type TextBackdrop = "none" | "pill" | "highlight" | "veil" | "outline" | "card";

export interface TypePreset {
  id: TypePresetId;
  name: string;
  hint: string;
  group: "Editorial" | "Soft" | "Bold" | "Script" | "Minimal" | "Poster";
  family: string;
  /** First family only — what canvas can actually resolve. */
  canvasFamily: string;
  weight: number;
  italic: boolean;
  /** Tracking in em. */
  tracking: number;
  leading: number;
  transform: TextTransform;
  /** Base px on a 390-wide canvas at scale 1. */
  baseSize: number;
  shadow: string;
}

const SANS = "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif";
const SERIF = "Fraunces, ui-serif, Georgia, 'Times New Roman', serif";
const ROMANTIC = "'Cormorant Garamond', Fraunces, ui-serif, Georgia, serif";
const SCRIPT = "Caveat, 'Segoe Script', 'Bradley Hand', 'Snell Roundhand', cursive";
const MONO = "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace";
const POSTER = "Oswald, 'Arial Narrow', 'Helvetica Neue', Impact, sans-serif";
const ROUNDED = "ui-rounded, 'SF Pro Rounded', Inter, system-ui, sans-serif";

export const TYPE_PRESETS: TypePreset[] = [
  {
    id: "editorial",
    name: "Editorial",
    hint: "Serif headlines",
    group: "Editorial",
    family: SERIF,
    canvasFamily: "Fraunces, Georgia, serif",
    weight: 560,
    italic: false,
    tracking: -0.015,
    leading: 1.12,
    transform: "none",
    baseSize: 44,
    shadow: "0 2px 22px rgba(10,8,20,0.4)",
  },
  {
    id: "display",
    name: "Display",
    hint: "Large and confident",
    group: "Editorial",
    family: SERIF,
    canvasFamily: "Fraunces, Georgia, serif",
    weight: 700,
    italic: false,
    tracking: -0.03,
    leading: 1.02,
    transform: "none",
    baseSize: 54,
    shadow: "0 3px 26px rgba(10,8,20,0.45)",
  },
  {
    id: "elegant",
    name: "Elegant",
    hint: "Italic serif",
    group: "Editorial",
    family: SERIF,
    canvasFamily: "Fraunces, Georgia, serif",
    weight: 480,
    italic: true,
    tracking: 0,
    leading: 1.2,
    transform: "none",
    baseSize: 38,
    shadow: "0 2px 20px rgba(10,8,20,0.4)",
  },
  {
    id: "romantic",
    name: "Romantic",
    hint: "Fine serif, generous",
    group: "Editorial",
    family: ROMANTIC,
    canvasFamily: "'Cormorant Garamond', Georgia, serif",
    weight: 500,
    italic: false,
    tracking: 0.01,
    leading: 1.24,
    transform: "none",
    baseSize: 42,
    shadow: "0 2px 18px rgba(10,8,20,0.38)",
  },
  {
    id: "classic",
    name: "Classic",
    hint: "Clean and calm",
    group: "Soft",
    family: SANS,
    canvasFamily: "Inter, system-ui, sans-serif",
    weight: 500,
    italic: false,
    tracking: -0.01,
    leading: 1.25,
    transform: "none",
    baseSize: 34,
    shadow: "0 2px 18px rgba(10,8,20,0.45)",
  },
  {
    id: "soft",
    name: "Soft",
    hint: "Rounded and kind",
    group: "Soft",
    family: ROUNDED,
    canvasFamily: "Inter, system-ui, sans-serif",
    weight: 500,
    italic: false,
    tracking: 0,
    leading: 1.3,
    transform: "none",
    baseSize: 33,
    shadow: "0 2px 16px rgba(10,8,20,0.4)",
  },
  {
    id: "whisper",
    name: "Whisper",
    hint: "Light and low",
    group: "Soft",
    family: SANS,
    canvasFamily: "Inter, system-ui, sans-serif",
    weight: 300,
    italic: false,
    tracking: 0.04,
    leading: 1.5,
    transform: "none",
    baseSize: 27,
    shadow: "0 1px 12px rgba(10,8,20,0.35)",
  },
  {
    id: "handwritten",
    name: "Handwritten",
    hint: "Like a margin note",
    group: "Script",
    family: SCRIPT,
    canvasFamily: "Caveat, cursive",
    weight: 500,
    italic: false,
    tracking: 0,
    leading: 1.3,
    transform: "none",
    baseSize: 40,
    shadow: "0 2px 14px rgba(10,8,20,0.35)",
  },
  {
    id: "note",
    name: "Margin note",
    hint: "Small and personal",
    group: "Script",
    family: SCRIPT,
    canvasFamily: "Caveat, cursive",
    weight: 400,
    italic: false,
    tracking: 0.01,
    leading: 1.35,
    transform: "none",
    baseSize: 28,
    shadow: "0 2px 12px rgba(10,8,20,0.3)",
  },
  {
    id: "journal",
    name: "Journal",
    hint: "Diary entry",
    group: "Script",
    family: `${SCRIPT}`,
    canvasFamily: "Caveat, cursive",
    weight: 600,
    italic: true,
    tracking: 0,
    leading: 1.4,
    transform: "none",
    baseSize: 32,
    shadow: "0 2px 14px rgba(10,8,20,0.32)",
  },
  {
    id: "bold",
    name: "Bold",
    hint: "Say it loud",
    group: "Bold",
    family: SANS,
    canvasFamily: "Inter, system-ui, sans-serif",
    weight: 800,
    italic: false,
    tracking: -0.02,
    leading: 1.05,
    transform: "uppercase",
    baseSize: 40,
    shadow: "0 3px 24px rgba(10,8,20,0.5)",
  },
  {
    id: "poster",
    name: "Poster",
    hint: "Condensed punch",
    group: "Poster",
    family: POSTER,
    canvasFamily: "Oswald, 'Arial Narrow', sans-serif",
    weight: 600,
    italic: false,
    tracking: 0.02,
    leading: 1.0,
    transform: "uppercase",
    baseSize: 48,
    shadow: "0 4px 26px rgba(10,8,20,0.55)",
  },
  {
    id: "condensed",
    name: "Condensed",
    hint: "Tight and tall",
    group: "Poster",
    family: POSTER,
    canvasFamily: "Oswald, 'Arial Narrow', sans-serif",
    weight: 400,
    italic: false,
    tracking: 0.06,
    leading: 1.1,
    transform: "uppercase",
    baseSize: 34,
    shadow: "0 3px 20px rgba(10,8,20,0.5)",
  },
  {
    id: "cinematic",
    name: "Cinematic",
    hint: "Title card",
    group: "Poster",
    family: POSTER,
    canvasFamily: "Oswald, 'Arial Narrow', sans-serif",
    weight: 300,
    italic: false,
    tracking: 0.34,
    leading: 1.3,
    transform: "uppercase",
    baseSize: 26,
    shadow: "0 2px 20px rgba(10,8,20,0.6)",
  },
  {
    id: "minimal",
    name: "Minimal",
    hint: "Small caps, spaced",
    group: "Minimal",
    family: SANS,
    canvasFamily: "Inter, system-ui, sans-serif",
    weight: 600,
    italic: false,
    tracking: 0.22,
    leading: 1.6,
    transform: "uppercase",
    baseSize: 20,
    shadow: "0 2px 12px rgba(10,8,20,0.4)",
  },
  {
    id: "modern",
    name: "Modern",
    hint: "Neutral and sharp",
    group: "Minimal",
    family: SANS,
    canvasFamily: "Inter, system-ui, sans-serif",
    weight: 600,
    italic: false,
    tracking: -0.005,
    leading: 1.2,
    transform: "none",
    baseSize: 30,
    shadow: "0 2px 14px rgba(10,8,20,0.4)",
  },
  {
    id: "typewriter",
    name: "Typewriter",
    hint: "Mono, deliberate",
    group: "Minimal",
    family: MONO,
    canvasFamily: "'IBM Plex Mono', monospace",
    weight: 500,
    italic: false,
    tracking: 0,
    leading: 1.45,
    transform: "none",
    baseSize: 26,
    shadow: "0 2px 14px rgba(10,8,20,0.4)",
  },
  {
    id: "playful",
    name: "Playful",
    hint: "Bouncy and bright",
    group: "Soft",
    family: ROUNDED,
    canvasFamily: "Inter, system-ui, sans-serif",
    weight: 700,
    italic: false,
    tracking: 0.01,
    leading: 1.22,
    transform: "none",
    baseSize: 36,
    shadow: "0 3px 0 rgba(10,8,20,0.16), 0 6px 18px rgba(10,8,20,0.3)",
  },
];

export const TYPE_GROUPS: TypePreset["group"][] = [
  "Editorial",
  "Soft",
  "Script",
  "Bold",
  "Poster",
  "Minimal",
];

const PRESET_BY_ID = new Map(TYPE_PRESETS.map((p) => [p.id, p]));

export function typePreset(id: string | null | undefined): TypePreset {
  return PRESET_BY_ID.get(id as TypePresetId) ?? TYPE_PRESETS[0]!;
}

export function isTypePresetId(value: unknown): value is TypePresetId {
  return typeof value === "string" && PRESET_BY_ID.has(value as TypePresetId);
}

/* ------------------------------- overrides ------------------------------- */

/** Everything a user can change about one text layer, on top of its preset. */
export interface TextStyle {
  /** Multiplier on the preset's base size. */
  size: number;
  weight: number | null;
  /** Tracking in em; null = preset. */
  tracking: number | null;
  leading: number | null;
  transform: TextTransform | null;
  backdrop: TextBackdrop;
  backdropColor: string;
  outline: number;
  outlineColor: string;
  shadow: boolean;
  maxWidth: number;
}

export const DEFAULT_TEXT_STYLE: TextStyle = {
  size: 1,
  weight: null,
  tracking: null,
  leading: null,
  transform: null,
  backdrop: "none",
  backdropColor: "rgba(20,17,29,0.62)",
  outline: 0,
  outlineColor: "#14111D",
  shadow: true,
  maxWidth: 340,
};

export interface ResolvedText {
  fontFamily: string;
  canvasFamily: string;
  fontWeight: number;
  fontStyle: "normal" | "italic";
  fontSize: number;
  letterSpacingPx: number;
  letterSpacingEm: number;
  lineHeight: number;
  textTransform: TextTransform;
  shadow: string;
  backdrop: TextBackdrop;
  backdropColor: string;
  outline: number;
  outlineColor: string;
  maxWidth: number;
}

/** Merge a preset with the user's overrides at a given canvas scale `k`. */
export function resolveText(presetId: string, style: Partial<TextStyle>, k: number): ResolvedText {
  const p = typePreset(presetId);
  const s: TextStyle = { ...DEFAULT_TEXT_STYLE, ...style };
  return {
    fontFamily: p.family,
    canvasFamily: p.canvasFamily,
    fontWeight: s.weight ?? p.weight,
    fontStyle: p.italic ? "italic" : "normal",
    fontSize: Math.max(9, p.baseSize * s.size * k),
    letterSpacingEm: s.tracking ?? p.tracking,
    letterSpacingPx: Math.max(9, p.baseSize * s.size * k) * (s.tracking ?? p.tracking),
    lineHeight: s.leading ?? p.leading,
    textTransform: s.transform ?? p.transform,
    shadow: s.shadow ? p.shadow : "none",
    backdrop: s.backdrop,
    backdropColor: s.backdropColor,
    outline: s.outline,
    outlineColor: s.outlineColor,
    maxWidth: Math.max(60, s.maxWidth * k),
  };
}

/** The CSS `font` shorthand canvas2d understands. */
export function canvasFont(r: ResolvedText): string {
  return `${r.fontStyle} ${r.fontWeight} ${r.fontSize.toFixed(1)}px ${r.canvasFamily}`;
}

/* ----------------------------- canvas layout ----------------------------- */

export interface TextLine {
  text: string;
  width: number;
}

const CASE = (value: string, transform: TextTransform): string => {
  switch (transform) {
    case "uppercase":
      return value.toUpperCase();
    case "lowercase":
      return value.toLowerCase();
    case "capitalize":
      return value.replace(/\b\p{L}/gu, (m) => m.toUpperCase());
    default:
      return value;
  }
};

/**
 * Word-wrap text for canvas, honouring explicit newlines and letter spacing.
 * Falls back to per-character measurement when `ctx.letterSpacing` is absent.
 */
export function layoutText(
  ctx: CanvasRenderingContext2D,
  value: string,
  r: ResolvedText,
): TextLine[] {
  const measure = (s: string) =>
    ctx.measureText(s).width + Math.max(0, s.length - 1) * r.letterSpacingPx;
  const out: TextLine[] = [];
  for (const paragraph of value.split("\n")) {
    const words = CASE(paragraph, r.textTransform).split(/(\s+)/);
    let line = "";
    for (const word of words) {
      if (word === "") continue;
      const candidate = line + word;
      if (line && measure(candidate.trimEnd()) > r.maxWidth && word.trim() !== "") {
        out.push({ text: line.trimEnd(), width: measure(line.trimEnd()) });
        line = word.trimStart();
      } else {
        line = candidate;
      }
    }
    const trimmed = line.trimEnd();
    if (trimmed) out.push({ text: trimmed, width: measure(trimmed) });
  }
  return out.length > 0 ? out : [{ text: "", width: 0 }];
}

/** Paint wrapped text; returns the block height so callers can offset. */
export function drawText(
  ctx: CanvasRenderingContext2D,
  value: string,
  r: ResolvedText,
  box: { x: number; y: number; w: number },
  align: TextAlign,
  color: string,
  opacity: number,
): number {
  const lines = layoutText(ctx, value, r);
  const lineH = r.fontSize * r.lineHeight;
  const total = lines.length * lineH;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.font = canvasFont(r);
  ctx.textBaseline = "middle";
  ctx.textAlign = align === "left" ? "left" : align === "right" ? "right" : "center";
  if ("letterSpacing" in ctx) {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
      `${r.letterSpacingPx.toFixed(2)}px`;
  }

  const anchorX =
    align === "left" ? box.x - box.w / 2 : align === "right" ? box.x + box.w / 2 : box.x;

  if (r.backdrop !== "none" && r.backdrop !== "outline") {
    const widest = Math.min(
      box.w,
      lines.reduce((m, l) => Math.max(m, l.width), 0),
    );
    const padX =
      r.backdrop === "pill" || r.backdrop === "card" ? r.fontSize * 0.55 : r.fontSize * 0.3;
    const padY = r.backdrop === "pill" || r.backdrop === "card" ? lineH * 0.34 : lineH * 0.14;
    const bw = widest + padX * 2;
    const bh = total + padY * 2;
    const bx =
      align === "left" ? anchorX - padX : align === "right" ? anchorX - bw + padX : box.x - bw / 2;
    const by = box.y - bh / 2;
    ctx.save();
    ctx.globalAlpha = opacity * (r.backdrop === "veil" ? 0.5 : 1);
    ctx.fillStyle = r.backdropColor;
    const radius =
      r.backdrop === "pill" ? bh / 2 : r.backdrop === "card" ? r.fontSize * 0.4 : r.fontSize * 0.18;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, radius);
    ctx.fill();
    ctx.restore();
  }

  lines.forEach((line, i) => {
    const y = box.y - total / 2 + lineH * (i + 0.5);
    if (r.shadow !== "none") applyShadow(ctx, r.shadow);
    if (r.outline > 0) {
      ctx.lineJoin = "round";
      ctx.lineWidth = r.outline * 2;
      ctx.strokeStyle = r.outlineColor;
      ctx.strokeText(line.text, anchorX, y);
    }
    ctx.fillStyle = color;
    ctx.fillText(line.text, anchorX, y);
    ctx.shadowColor = "rgba(0,0,0,0)";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  });

  ctx.restore();
  return total;
}

/** Translate a CSS `text-shadow` into canvas shadow state (single shadow only). */
function applyShadow(ctx: CanvasRenderingContext2D, shadow: string): void {
  const m = /(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px\s+(rgba?\([^)]*\)|#[0-9a-fA-F]{3,8})/.exec(
    shadow,
  );
  if (!m) return;
  ctx.shadowOffsetX = Number(m[1]);
  ctx.shadowOffsetY = Number(m[2]);
  ctx.shadowBlur = Number(m[3]);
  ctx.shadowColor = m[4]!;
}

export { CASE as applyCase };
