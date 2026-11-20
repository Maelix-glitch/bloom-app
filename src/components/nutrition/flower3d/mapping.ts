/**
 * Water the Bloom, in 3D — the pure mapping core.
 *
 * Every number that turns the day's progress into the scene's state
 * lives here, free of three.js and the DOM, so the mapping can be
 * pinned in unit tests without loading WebGL:
 *
 *   progress (drunk ÷ target, the panel's one number)
 *     → bloom openness — the identity, spring-smoothed by the scene;
 *       the flower's own petal layers stagger across it, so the same
 *       thresholds the 2D scene's stage words name (bud < 0.25,
 *       opening < 0.6, half < 0.9, full) read the same way here.
 *     → water level in the vase — a fixed span of the vessel, the
 *       same at empty and at target, so the level is honest: it is
 *       the day's fraction, drawn inside the glass.
 *     → a pour — a rise after the first value is a log; the droplet
 *       count follows the size of the rise, as a pour is sized by
 *       the glass.
 *
 * The mapping contract is Bloom's own, written for the 3D flower
 * (M-163) and shared by both of the panel's scenes.
 */

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export const smooth01 = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};

/* --------------------------- the bloom's rings --------------------------- */

/** One ring's openness at a given bloom: the ring starts opening at
 *  `start` and is fully open at `start + span`, smoothstepped between.
 *  The flower's rings are staggered outer-first, heart last, across
 *  the one bloom value — so openness is continuous in progress, and
 *  the day's stages (bud → opening → half → full) keep their meaning. */
export function ringOpenFor(bloom: number, start: number, span: number): number {
  return smooth01((clamp01(bloom) - start) / span);
}

/* ------------------------- water level in the vase ------------------------ */

/** The vessel's water span, in scene units (the vessel profile in
 *  scene.ts is built around it): the level at an empty day and at
 *  a full one. */
export const WATER_LEVEL_MIN = 0.22;
export const WATER_LEVEL_MAX = 0.96;

/** The water level a progress value stands at. */
export function levelForProgress(p: number): number {
  return WATER_LEVEL_MIN + (WATER_LEVEL_MAX - WATER_LEVEL_MIN) * clamp01(p);
}

/* --------------------------------- pouring -------------------------------- */

/** A rise larger than this (in progress) after the first value is a
 *  log and pours — the same epsilon the 2D scene's setProgress uses,
 *  so both scenes agree on what counts as a pour. */
export const POUR_EPSILON = 0.002;

/** The pour a progress change calls for: the rise, or null when the
 *  change is a fall, a hold, or too small to be a log. */
export function pourDeltaFor(prev: number, next: number): number | null {
  const delta = clamp01(next) - clamp01(prev);
  return delta > POUR_EPSILON ? delta : null;
}

/** Droplets in a pour: a small glass is a few drops, a large one the
 *  full pool — scaled from the rise, as the demo scaled from ml. */
export const MAX_DROPS = 12;
export function dropletCountForDelta(delta: number): number {
  return Math.max(3, Math.min(MAX_DROPS, Math.round(clamp01(delta) * 55)));
}

/* ----------------------------- adaptive quality ---------------------------- */

/** devicePixelRatio caps per adaptive-quality level (0 full → 3
 *  lightest). Level 0 is the house cap of 2 — beyond it the extra
 *  pixels cost fill-rate and buy nothing at this panel's size; the
 *  steps down mirror the 2D scene's shedding idea, in the currency a
 *  WebGL renderer spends: resolution first, then shadows. */
export const DPR_CAPS: readonly number[] = [2, 1.5, 1.25, 1];

/** The pixel ratio a quality level renders at on this device. */
export function pixelRatioForQuality(quality: number, devicePixelRatio: number): number {
  const cap = DPR_CAPS[Math.min(quality, DPR_CAPS.length - 1)] ?? 1;
  return Math.min(devicePixelRatio || 1, cap);
}
