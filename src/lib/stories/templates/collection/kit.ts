/**
 * Shared design kit for the v2 story template collection.
 *
 * v2 is built entirely in Bloom's official reskin palette — ink, panel,
 * gold, gold-soft, sage, rose, cream — plus shades derived from those same
 * hues for depth on dark grounds and legibility on light ones. No other hue
 * enters a template: the palette-conformance test pins every colour a
 * template uses to `STORY_V2_PALETTE`, so a stray colour fails the suite
 * rather than quietly shipping.
 *
 * Layout follows the DSL: x/y are centres in unit space, text sizes are
 * absolute points on the 390-wide reference canvas. Readable seeds (text,
 * sticker, data) stay inside the vertical safe band — clear of the viewer's
 * header and reply bar — which the collection test enforces.
 */

import type { Paint, PaintStop } from "@/lib/stories/canvas/paint";
import type { StoryBackgroundState } from "@/lib/stories/canvas/backgrounds";
import { gradient, solid, type StoryTemplateDef } from "../dsl";

/* ------------------------- the official palette ------------------------- */

export const C = {
  /* The seven official colours (reskin spec, 2026-11-14). */
  ink: "#0A0B0E",
  panel: "#111318",
  gold: "#DCC08F",
  goldSoft: "#F2E4C6",
  sage: "#8FC7A2",
  rose: "#E3919F",
  cream: "#ECE8E1",

  /* In-family derivations: the gold gradient's own ends, panel lifts, and
     deepened sage/rose grounds — same hues, darker or lighter stops. */
  goldPale: "#F6E9CD",
  goldDeep: "#C79D62",
  bronze: "#97743F" /* dark gold: the only legible gold on light grounds */,
  panelLift: "#171A21",
  night: "#12151D",
  fern: "#2F4A3A",
  fernDeep: "#1C2B21",
  sageDeep: "#476B52",
  roseDeep: "#5C323E",
  creamDim: "#B9B4A8",
} as const;

/** Every hex a v2 template may use. The conformance test reads this list. */
export const STORY_V2_PALETTE: readonly string[] = Object.values(C);

/** Ink on dark grounds. */
export const INK_LIGHT = C.cream;
/** Ink on light grounds. */
export const INK_DARK = C.ink;

/* ------------------------------- paints --------------------------------- */

export const lin = (angle: number, stops: PaintStop[]): Paint => ({
  type: "linear",
  angle,
  stops,
});

export const rad = (cx: number, cy: number, rx: number, ry: number, stops: PaintStop[]): Paint => ({
  type: "radial",
  cx,
  cy,
  rx,
  ry,
  stops,
});

/* ----------------------------- backgrounds ------------------------------ */

/** A gradient ground in the v2 language. `ink` is the text colour that reads against it. */
export function ground(paint: Paint, ink: string): StoryBackgroundState {
  return gradient(paint, ink);
}

/** A solid ground, for templates whose whole point is restraint. */
export function flat(color: string, ink: string): StoryBackgroundState {
  return solid(color, ink);
}

/** The same ground with a tactile finish — grain or paper, kept subtle. */
export function textured(
  bg: StoryBackgroundState,
  texture: "grain" | "paper",
  opacity = 0.14,
): StoryBackgroundState {
  return { ...bg, texture, textureOpacity: opacity };
}

/* ------------------------------ safe area ------------------------------- */

/** Readable seeds stay between these — clear of viewer chrome. */
export const SAFE_TOP = 0.11;
export const SAFE_BOTTOM = 0.88;

export type TemplateDef = StoryTemplateDef;
