/**
 * Multi-slide stories.
 *
 * A story started life as a single composition: one media layer, one element
 * stack, one filter, one duration. Multi-slide keeps that shape *as slide one*
 * and adds the rest beside it.
 *
 * The back-compat rule that keeps every existing story working is the single
 * most important line in this file:
 *
 *   `storySlides(story)` returns `story.slides` when present, otherwise it
 *   synthesises exactly one slide from the story's own top-level fields.
 *
 * So a story published before this column existed never needs a data
 * migration, never renders empty, and never loses its filter, canvas or
 * duration. Readers should always go through `storySlides()` rather than
 * touching `story.slides` directly — that way the legacy path has one
 * implementation instead of being re-derived at every call site.
 */

import type {
  StoryAdjustments,
  StoryCanvasSnapshot,
  StoryElement,
  StoryMediaType,
  StorySlide,
} from "./types";

export type { StorySlide };

/** Hard cap on slides per story, so a session stays watchable. */
export const MAX_SLIDES = 10;

/** Default dwell for a new slide, ms. */
export const SLIDE_DWELL_MS = 6000;

/** Per-slide bounds for image slides, ms. */
export const SLIDE_DURATION_BOUNDS = { min: 1000, max: 15000 } as const;

/**
 * The fields a slide owns. Kept as a const so the writer and the reader cannot
 * drift apart — `pickSlideFields` and `writeSlideFields` both use it.
 */
export const SLIDE_FIELDS = [
  "mediaType",
  "mediaPath",
  "mediaWidth",
  "mediaHeight",
  "durationMs",
  "elements",
  "filterId",
  "adjustments",
  "backgroundId",
  "canvas",
  "altText",
] as const;

let slideSeq = 0;

/** A fresh slide id. Prefixed and monotonic so keys never collide in a session. */
export function newSlideId(): string {
  slideSeq += 1;
  return `slide-${Date.now().toString(36)}-${slideSeq.toString(36)}`;
}

function finiteOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** Clamp a slide duration into range; falls back to the default when absent. */
export function clampSlideDuration(value: unknown): number {
  const ms = finiteOrNull(value);
  if (ms === null) return SLIDE_DWELL_MS;
  return Math.min(SLIDE_DURATION_BOUNDS.max, Math.max(SLIDE_DURATION_BOUNDS.min, Math.round(ms)));
}

/**
 * Build a slide from a partial/legacy shape.
 *
 * Tolerates missing or wrongly-typed fields because the input may be an old
 * database row, an untrusted public payload, or a half-built editor state.
 */
export function toSlide(
  input: Partial<Omit<StorySlide, "id">> & { id?: string | null | undefined },
): StorySlide {
  return {
    id: stringOrNull(input.id) ?? newSlideId(),
    mediaType:
      input.mediaType === "image" || input.mediaType === "video" ? input.mediaType : "none",
    mediaPath: stringOrNull(input.mediaPath),
    mediaWidth: finiteOrNull(input.mediaWidth),
    mediaHeight: finiteOrNull(input.mediaHeight),
    durationMs: input.mediaType === "video" ? clampSlideDuration(input.durationMs) : null,
    elements: Array.isArray(input.elements) ? input.elements : [],
    filterId: stringOrNull(input.filterId),
    adjustments:
      input.adjustments && typeof input.adjustments === "object" ? input.adjustments : null,
    backgroundId: stringOrNull(input.backgroundId),
    canvas: input.canvas && typeof input.canvas === "object" ? input.canvas : null,
    altText: stringOrNull(input.altText),
  };
}

/** An empty slide, ready to be filled. */
export function emptySlide(id?: string | null | undefined): StorySlide {
  return toSlide({ id });
}

/** A copy of `slide` with a fresh id, for "duplicate slide". */
export function cloneSlide(slide: StorySlide): StorySlide {
  return toSlide({ ...slide, id: newSlideId() });
}

/** The composition held directly on a `Story`, expressed as one slide. */
export function slideFromStory(story: {
  id?: string;
  mediaType?: StoryMediaType;
  mediaPath?: string | null;
  mediaWidth?: number | null;
  mediaHeight?: number | null;
  durationMs?: number | null;
  elements?: StoryElement[];
  filterId?: string | null;
  adjustments?: StoryAdjustments | null;
  backgroundId?: string | null;
  canvas?: StoryCanvasSnapshot | null;
  altText?: string | null;
}): StorySlide {
  return toSlide(story);
}

/**
 * The slides of a story, legacy rows included.
 *
 * Never returns an empty array: a story always has at least one slide, even if
 * that slide is blank. Callers can therefore index `[0]` without a guard.
 */
export function storySlides(story: {
  id?: string;
  slides?: readonly StorySlide[] | null;
  mediaType?: StoryMediaType;
  mediaPath?: string | null;
  mediaWidth?: number | null;
  mediaHeight?: number | null;
  durationMs?: number | null;
  elements?: StoryElement[];
  filterId?: string | null;
  adjustments?: StoryAdjustments | null;
  backgroundId?: string | null;
  canvas?: StoryCanvasSnapshot | null;
  altText?: string | null;
}): StorySlide[] {
  const raw = story.slides;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.slice(0, MAX_SLIDES).map((s) => toSlide(s ?? {}));
  }
  return [slideFromStory(story)];
}

/** True when a story carries more than one slide. */
export function isMultiSlide(story: { slides?: readonly StorySlide[] | null }): boolean {
  return Array.isArray(story.slides) && story.slides.length > 1;
}

/* --------------------------- list operations ---------------------------- */
/* All of these are pure: they take slides and return a new array, so the
   editor can keep them inside a single undoable state update. */

function withCap(slides: StorySlide[]): StorySlide[] {
  return slides.slice(0, MAX_SLIDES);
}

/** Append a slide, respecting the cap. Returns null when already full. */
export function addSlide(slides: readonly StorySlide[], slide?: StorySlide): StorySlide[] | null {
  if (slides.length >= MAX_SLIDES) return null;
  return [...slides, slide ?? emptySlide()];
}

/** Duplicate the slide at `index`, inserted right after it. */
export function duplicateSlide(slides: readonly StorySlide[], index: number): StorySlide[] | null {
  const src = slides[index];
  if (!src || slides.length >= MAX_SLIDES) return null;
  const next = [...slides];
  next.splice(index + 1, 0, cloneSlide(src));
  return withCap(next);
}

/** Remove a slide. Refuses to remove the last one — a story is never empty. */
export function removeSlide(slides: readonly StorySlide[], index: number): StorySlide[] | null {
  if (slides.length <= 1 || index < 0 || index >= slides.length) return null;
  return slides.filter((_, i) => i !== index);
}

/** Move a slide to `to`. Out-of-range targets are clamped, not rejected. */
export function moveSlide(
  slides: readonly StorySlide[],
  from: number,
  to: number,
): StorySlide[] | null {
  if (from < 0 || from >= slides.length) return null;
  const target = Math.min(slides.length - 1, Math.max(0, to));
  if (target === from) return null;
  const next = [...slides];
  const [moved] = next.splice(from, 1);
  next.splice(target, 0, moved!);
  return next;
}

/** Replace one slide in place. */
export function updateSlide(
  slides: readonly StorySlide[],
  index: number,
  patch: Partial<StorySlide>,
): StorySlide[] | null {
  const current = slides[index];
  if (!current) return null;
  const next = [...slides];
  next[index] = { ...current, ...patch, id: current.id };
  return next;
}

/* ------------------------------- timing --------------------------------- */

/** How long one slide is on screen, ms. */
export function slideDurationMs(slide: StorySlide, fallbackMs: number): number {
  if (slide.mediaType === "video") return clampSlideDuration(slide.durationMs);
  return fallbackMs;
}

/** Total watch time across a story, ms. */
export function totalDurationMs(slides: readonly StorySlide[], fallbackMs: number): number {
  return slides.reduce((sum, s) => sum + slideDurationMs(s, fallbackMs), 0);
}

/* ------------------------------ serialising ----------------------------- */

/**
 * Validate an untrusted `slides` payload — a public profile response, say.
 *
 * Returns null when the input is not a usable slide array, so the caller can
 * fall back to the legacy single-slide path instead of rendering garbage.
 */
export function sanitizeSlides(value: unknown): StorySlide[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const slides = value.slice(0, MAX_SLIDES).map((entry) => {
    if (!entry || typeof entry !== "object") return null;
    return toSlide(entry as Partial<StorySlide>);
  });
  if (slides.some((s) => s === null)) return null;
  return slides as StorySlide[];
}
