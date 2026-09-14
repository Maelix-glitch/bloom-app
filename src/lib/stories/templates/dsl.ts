/**
 * Bloom Story Templates — the authoring DSL.
 *
 * A template is data: a background plus a list of seeds. Nothing here is a
 * component, so the library can grow to hundreds of designs without adding a
 * single screen. `instantiate` turns a template into real canvas elements —
 * photo seeds become *empty* slots, because the template never ships a
 * photograph the user did not choose.
 */

import type { StoryDataMetric, StoryDataVariant, StoryElement } from "@/lib/stories/types";
import type { StoryKind } from "@/lib/profile/types";
import {
  makeDataElement,
  makePhotoElement,
  makeShapeElement,
  makeStickerElement,
  makeTextElement,
} from "@/lib/stories/elements";
import type { PhotoFrame, PhotoMask } from "@/lib/stories/canvas/masks";
import type { ShapeKind } from "@/lib/stories/canvas/shapes";
import type { TextBackdrop, TextTransform, TypePresetId } from "@/lib/stories/canvas/typography";
import {
  gradientBackground,
  photoBackground,
  presetBackground,
  solidBackground,
  type StoryBackgroundState,
} from "@/lib/stories/canvas/backgrounds";
import type { Paint } from "@/lib/stories/canvas/paint";

export type TemplateCategoryId =
  | "morning"
  | "night"
  | "mood"
  | "selfcare"
  | "wellness"
  | "fitness"
  | "hydration"
  | "sleep"
  | "cycle"
  | "habits"
  | "goals"
  | "wins"
  | "study"
  | "food"
  | "travel"
  | "memories"
  | "gratitude"
  | "love"
  | "nature"
  | "quotes"
  | "scrapbook"
  | "cinematic"
  | "minimal"
  | "playful"
  | "seasonal"
  | "data";

export const TEMPLATE_CATEGORIES: { id: TemplateCategoryId; label: string }[] = [
  { id: "morning", label: "Morning" },
  { id: "night", label: "Night" },
  { id: "mood", label: "Mood" },
  { id: "selfcare", label: "Self-care" },
  { id: "wellness", label: "Wellness" },
  { id: "fitness", label: "Movement" },
  { id: "hydration", label: "Hydration" },
  { id: "sleep", label: "Sleep" },
  { id: "cycle", label: "Cycle" },
  { id: "habits", label: "Habits" },
  { id: "goals", label: "Goals" },
  { id: "wins", label: "Small wins" },
  { id: "study", label: "Focus" },
  { id: "food", label: "Food" },
  { id: "travel", label: "Travel" },
  { id: "memories", label: "Memories" },
  { id: "gratitude", label: "Gratitude" },
  { id: "love", label: "Love" },
  { id: "nature", label: "Nature" },
  { id: "quotes", label: "Quotes" },
  { id: "scrapbook", label: "Scrapbook" },
  { id: "cinematic", label: "Cinematic" },
  { id: "minimal", label: "Minimal" },
  { id: "playful", label: "Playful" },
  { id: "seasonal", label: "Seasonal" },
  { id: "data", label: "Your data" },
];

/* --------------------------------- seeds --------------------------------- */

interface SeedBase {
  x: number;
  y: number;
  z: number;
  rotation?: number;
  opacity?: number;
  name?: string;
}

export interface TextSeed extends SeedBase {
  kind: "text";
  text: string;
  preset: TypePresetId;
  color: string;
  align?: "left" | "center" | "right";
  size?: number;
  weight?: number;
  tracking?: number;
  leading?: number;
  transform?: TextTransform;
  backdrop?: TextBackdrop;
  backdropColor?: string;
  maxWidth?: number;
  outline?: number;
  outlineColor?: string;
  shadow?: boolean;
}

export interface PhotoSeed extends SeedBase {
  kind: "photo";
  slot: string;
  w: number;
  h: number;
  mask?: PhotoMask;
  frame?: PhotoFrame;
  frameColor?: string;
  zoom?: number;
  fit?: "cover" | "contain";
  shadow?: boolean;
  border?: { color: string; width: number } | null;
  filterId?: string;
}

export interface ShapeSeed extends SeedBase {
  kind: "shape";
  shape: ShapeKind;
  w: number;
  h: number;
  fill?: string | null;
  stroke?: string | null;
  strokeWidth?: number;
  blur?: number;
  blend?: string;
}

export interface StickerSeed extends SeedBase {
  kind: "sticker";
  stickerId: string;
  scale?: number;
  tint?: string;
}

export interface DataSeed extends SeedBase {
  kind: "data";
  metric: StoryDataMetric;
  variant?: StoryDataVariant;
  label?: string;
  accent?: string;
  w?: number;
  h?: number;
}

export type TemplateSeed = TextSeed | PhotoSeed | ShapeSeed | StickerSeed | DataSeed;

export interface StoryTemplateDef {
  id: string;
  name: string;
  hint: string;
  category: TemplateCategoryId;
  tags: string[];
  tone: "light" | "dark";
  background: StoryBackgroundState;
  seeds: TemplateSeed[];
  storyKind?: StoryKind;
  /**
   * Optional static preview image (e.g. an exact crop of a reference board
   * card). When set, the browser's button shows this image instead of the
   * live-canvas render. The editable composition is unchanged.
   */
  previewSrc?: string;
}

/* ------------------------------ constructors ----------------------------- */

let slotCounter = 0;
const nextSlot = () => `PHOTO_SLOT_${(slotCounter += 1)}`;

export const text = (
  value: string,
  x: number,
  y: number,
  o: Omit<TextSeed, "kind" | "text" | "x" | "y">,
): TextSeed => ({ kind: "text", text: value, x, y, ...o });

export const photo = (
  x: number,
  y: number,
  w: number,
  h: number,
  o: Omit<PhotoSeed, "kind" | "slot" | "x" | "y" | "w" | "h"> & { slot?: string },
): PhotoSeed => ({ kind: "photo", slot: o.slot ?? nextSlot(), x, y, w, h, ...o });

export const shape = (
  kind: ShapeKind,
  x: number,
  y: number,
  w: number,
  h: number,
  o: Omit<ShapeSeed, "kind" | "shape" | "x" | "y" | "w" | "h">,
): ShapeSeed => ({ kind: "shape", shape: kind, x, y, w, h, ...o });

export const sticker = (
  stickerId: string,
  x: number,
  y: number,
  o: Omit<StickerSeed, "kind" | "stickerId" | "x" | "y">,
): StickerSeed => ({ kind: "sticker", stickerId, x, y, ...o });

export const data = (
  metric: StoryDataMetric,
  x: number,
  y: number,
  o: Omit<DataSeed, "kind" | "metric" | "x" | "y">,
): DataSeed => ({ kind: "data", metric, x, y, ...o });

/** Preset background shorthand. */
export const preset = (id: string): StoryBackgroundState => presetBackground(id);

/** Shipped photographic backdrop (a design asset, not a user photo). */
export const photoBg = (src: string, ink: string, base?: string): StoryBackgroundState =>
  photoBackground(src, ink, base);
/** Solid background shorthand. */
export const solid = (color: string, ink?: string): StoryBackgroundState =>
  solidBackground(color, ink);
/** Custom gradient shorthand. */
export const gradient = (paint: Paint, ink: string, id: string | null = null) =>
  gradientBackground(paint, id, ink);

/** Template record constructor — keeps every definition to one call. */
export const tpl = (def: StoryTemplateDef): StoryTemplateDef => def;

/* ----------------------------- instantiation ----------------------------- */

export interface InstantiatedTemplate {
  background: StoryBackgroundState;
  elements: StoryElement[];
}

/**
 * Build a live composition from a template. Photo seeds arrive as empty
 * slots: the canvas shows an "Add photo" affordance there until the user
 * picks their own.
 */
export function instantiate(def: StoryTemplateDef): InstantiatedTemplate {
  const elements: StoryElement[] = [];
  for (const seed of def.seeds) {
    switch (seed.kind) {
      case "text": {
        elements.push(
          makeTextElement(seed.text, {
            preset: seed.preset,
            color: seed.color,
            align: seed.align ?? "center",
            x: seed.x,
            y: seed.y,
            z: seed.z,
            rotation: seed.rotation ?? 0,
            opacity: seed.opacity ?? 100,
            ...(seed.name ? { name: seed.name } : {}),
            style: {
              ...(seed.size !== undefined ? { size: seed.size } : {}),
              ...(seed.weight !== undefined ? { weight: seed.weight } : {}),
              ...(seed.tracking !== undefined ? { tracking: seed.tracking } : {}),
              ...(seed.leading !== undefined ? { leading: seed.leading } : {}),
              ...(seed.transform !== undefined ? { transform: seed.transform } : {}),
              ...(seed.backdrop !== undefined ? { backdrop: seed.backdrop } : {}),
              ...(seed.backdropColor !== undefined ? { backdropColor: seed.backdropColor } : {}),
              ...(seed.maxWidth !== undefined ? { maxWidth: seed.maxWidth } : {}),
              ...(seed.outline !== undefined ? { outline: seed.outline } : {}),
              ...(seed.outlineColor !== undefined ? { outlineColor: seed.outlineColor } : {}),
              ...(seed.shadow !== undefined ? { shadow: seed.shadow } : {}),
            },
          }),
        );
        break;
      }
      case "photo": {
        elements.push(
          makePhotoElement({
            slot: seed.slot,
            x: seed.x,
            y: seed.y,
            z: seed.z,
            w: seed.w,
            h: seed.h,
            mask: seed.mask ?? "rect",
            frame: seed.frame ?? "none",
            frameColor: seed.frameColor,
            zoom: seed.zoom,
            fit: seed.fit,
            shadow: seed.shadow,
            border: seed.border,
            rotation: seed.rotation,
            opacity: seed.opacity,
            filterId: seed.filterId,
            name: seed.name ?? "Photo",
          }),
        );
        break;
      }
      case "shape": {
        const el = makeShapeElement(seed.shape, {
          x: seed.x,
          y: seed.y,
          z: seed.z,
          w: seed.w,
          h: seed.h,
          fill: seed.fill,
          stroke: seed.stroke,
          strokeWidth: seed.strokeWidth,
          rotation: seed.rotation,
          opacity: seed.opacity,
          blur: seed.blur,
          blend: seed.blend,
          name: seed.name,
        });
        if (el) elements.push(el);
        break;
      }
      case "sticker": {
        const el = makeStickerElement(seed.stickerId, {
          x: seed.x,
          y: seed.y,
          z: seed.z,
          scale: seed.scale,
        });
        if (el) {
          elements.push({
            ...el,
            rotation: seed.rotation ?? 0,
            ...(seed.tint ? { tint: seed.tint } : {}),
            ...(seed.opacity !== undefined ? { opacity: seed.opacity } : {}),
            ...(seed.name ? { name: seed.name } : {}),
          });
        }
        break;
      }
      case "data": {
        const el = makeDataElement(seed.metric, {
          x: seed.x,
          y: seed.y,
          z: seed.z,
          w: seed.w,
          h: seed.h,
          variant: seed.variant,
          label: seed.label,
          accent: seed.accent,
        });
        if (el) {
          elements.push({
            ...el,
            rotation: seed.rotation ?? 0,
            ...(seed.opacity !== undefined ? { opacity: seed.opacity } : {}),
            ...(seed.name ? { name: seed.name } : {}),
          });
        }
        break;
      }
    }
  }
  return { background: def.background, elements };
}

/** How many photo slots a template offers — used by search and the browser. */
export function templatePhotoCount(def: StoryTemplateDef): number {
  return def.seeds.filter((s) => s.kind === "photo").length;
}

/** Which real Bloom signals a template can surface. */
export function templateMetrics(def: StoryTemplateDef): StoryDataMetric[] {
  return [
    ...new Set(def.seeds.filter((s): s is DataSeed => s.kind === "data").map((s) => s.metric)),
  ];
}

/** Reset the slot counter between template groups — ids only need local sense. */
export function resetSlotCounter(): void {
  slotCounter = 0;
}
