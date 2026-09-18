/**
 * Shared authoring helpers for the curated collection.
 *
 * Fifty templates that each spelled out their own gradient stops and colour
 * literals would be fifty chances to drift off-palette. Everything here exists
 * so a template definition reads as *composition* — where the photo sits, what
 * the caption says, how much air is around it — rather than as a pile of hex
 * codes.
 *
 * The palette is Bloom's own (see BLOOM_PALETTE). Nothing in the collection
 * reaches outside it, which is what keeps 50 different compositions feeling
 * like one library.
 */

import type { Paint, PaintStop } from "@/lib/stories/canvas/paint";
import type { StoryBackgroundState } from "@/lib/stories/canvas/backgrounds";
import { gradient, solid, type StoryTemplateDef } from "../dsl";

/* --------------------------------- colour -------------------------------- */
/* Bloom's palette, named. Referencing these rather than raw hex is what stops
   one template drifting a shade off from the rest. */
export const C = {
  ivory: "#F7F1E3",
  champagne: "#EED9A4",
  rose: "#E0A3B8",
  lavender: "#B7A6E8",
  sage: "#9DB89A",
  mist: "#AEBFD2",
  midnight: "#221D33",
  forest: "#1D2B22",
  obsidian: "#14111D",
  blue: "#9FB6CF",
  beige: "#D3B795",
  terracotta: "#C07A5E",
  peach: "#F0C6A8",
  plum: "#4A2B45",
  cloud: "#E8ECF4",
  grey: "#C9C7D4",
  butter: "#F4E3B2",
  clay: "#B98A72",
  ink: "#2B3348",
  moss: "#6E8463",
  charcoal: "#22201B",
} as const;

/** Ink for light grounds and dark grounds. */
export const INK_DARK = "#22201B";
export const INK_LIGHT = "#F7F1E3";

/* --------------------------------- paint --------------------------------- */

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

/* ------------------------------ backgrounds ------------------------------ */

/**
 * A gradient ground.
 *
 * `ink` is the text colour that reads against it — passing it explicitly keeps
 * every template honest about contrast instead of inheriting something that
 * happens to work on the template above it.
 */
export function ground(paint: Paint, ink: string): StoryBackgroundState {
  return gradient(paint, ink);
}

/** A flat ground, for the templates whose whole point is restraint. */
export function flat(color: string, ink: string): StoryBackgroundState {
  return solid(color, ink);
}

/* ------------------------------ safe areas ------------------------------- */
/* The viewer draws a header down the top and a reply bar along the bottom.
   Anything meant to be read has to sit between them. These are the vertical
   bounds every composition in the collection respects. */
export const SAFE_TOP = 0.11;
export const SAFE_BOTTOM = 0.88;

export type TemplateDef = StoryTemplateDef;
