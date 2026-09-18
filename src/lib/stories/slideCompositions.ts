/**
 * Editor slide state — saving and restoring a composition as you move between
 * slides.
 *
 * The editor holds one composition in React state at a time (elements,
 * background, filter, adjustments, strokes). Slides are just that same shape in
 * a list, so switching slides is "write the current state into slot N, read
 * slot M back out". Keeping that in one place means the round-trip can be
 * tested without mounting the editor, which is where this kind of code usually
 * loses data.
 */

import type { StoryAdjustments, StoryElement } from "@/lib/stories/types";
import type { StoryBackgroundState } from "@/lib/stories/canvas/backgrounds";
import { emptySlide, newSlideId, toSlide, type StorySlide } from "@/lib/stories/slides";

/**
 * Everything the editor owns for one slide.
 *
 * Generic over the stroke type: drawing strokes are owned by `DrawLayer`, and
 * re-declaring them here produced two nominally different `DrawStroke` types
 * that would not assign to each other. The editor passes its own type in, so
 * this module never has to agree with a component about a shape it does not
 * own.
 */
export interface SlideComposition<S = unknown> {
  id: string;
  elements: StoryElement[];
  background: StoryBackgroundState;
  backgroundId: string;
  filterId: string;
  adjustments: StoryAdjustments;
  strokes: S[];
}

/** The editor state a slide is built from, before it has an id. */
export type SlideCompositionInput<S = unknown> = Omit<SlideComposition<S>, "id">;

export const MAX_EDITOR_SLIDES = 10;

/**
 * A blank slide that matches the editor's defaults, so "add slide" produces
 * something the editor can render immediately rather than a null it has to
 * guard against everywhere.
 */
export function blankComposition<S = unknown>(
  background: StoryBackgroundState,
  backgroundId: string,
  adjustments: StoryAdjustments,
): SlideComposition<S> {
  return {
    id: newSlideId(),
    elements: [],
    background,
    backgroundId,
    filterId: "none",
    adjustments,
    strokes: [] as S[],
  };
}

/** Capture the editor's current state into a slide, keeping its id. */
export function writeComposition<S = unknown>(
  slides: readonly SlideComposition<S>[],
  index: number,
  state: SlideCompositionInput<S>,
): SlideComposition<S>[] {
  if (index < 0 || index >= slides.length) return [...slides];
  const next = [...slides];
  next[index] = { ...state, id: slides[index]!.id };
  return next;
}

/** Append a slide. Returns null at the cap, so the caller can say why. */
export function appendComposition<S = unknown>(
  slides: readonly SlideComposition<S>[],
  composition: SlideCompositionInput<S>,
): SlideComposition<S>[] | null {
  if (slides.length >= MAX_EDITOR_SLIDES) return null;
  return [...slides, { ...composition, id: newSlideId() }];
}

/** Remove a slide. Refuses to remove the last one. */
export function removeComposition<S = unknown>(
  slides: readonly SlideComposition<S>[],
  index: number,
): { slides: SlideComposition<S>[]; index: number } | null {
  if (slides.length <= 1 || index < 0 || index >= slides.length) return null;
  const next = slides.filter((_, i) => i !== index);
  return { slides: next, index: Math.min(index, next.length - 1) };
}

/** Duplicate a slide, inserted after it. */
export function duplicateComposition<S = unknown>(
  slides: readonly SlideComposition<S>[],
  index: number,
): { slides: SlideComposition<S>[]; index: number } | null {
  const src = slides[index];
  if (!src || slides.length >= MAX_EDITOR_SLIDES) return null;
  const next = [...slides];
  next.splice(index + 1, 0, { ...src, id: newSlideId() });
  return { slides: next, index: index + 1 };
}

/** Move a slide. Out-of-range targets clamp. */
export function moveComposition<S = unknown>(
  slides: readonly SlideComposition<S>[],
  from: number,
  to: number,
): SlideComposition<S>[] | null {
  if (from < 0 || from >= slides.length) return null;
  const target = Math.min(slides.length - 1, Math.max(0, to));
  if (target === from) return null;
  const next = [...slides];
  const [moved] = next.splice(from, 1);
  next.splice(target, 0, moved!);
  return next;
}

/**
 * Flatten editor slides into the wire format.
 *
 * The whole list goes in, first slide included. That matters: `storySlides()`
 * returns `story.slides` *instead of* synthesising a slide from the top-level
 * columns when the array is present, so a list holding only slides 2..n would
 * make the viewer skip the first slide entirely.
 *
 * Yes, this means slide one is stored twice — once in the top-level columns,
 * once in this array. That redundancy is deliberate and safe: the top-level
 * copy is the fallback for readers that predate multi-slide, and both are
 * written from the same editor state in the same publish, so they cannot
 * disagree. The alternative (storing extras only) would need a second reader
 * convention in `storySlides()`, which is more fragile than one redundant copy.
 *
 * Returns null for a single-slide story — the common case, and the signal that
 * this is an ordinary story whose composition lives in the top-level columns.
 */
export function compositionsToSlides<S = unknown>(
  slides: readonly SlideComposition<S>[],
): StorySlide[] | null {
  if (slides.length < 2) return null;
  return slides.map((s) =>
    toSlide({
      id: s.id,
      mediaType: "none",
      mediaPath: null,
      mediaWidth: null,
      mediaHeight: null,
      durationMs: null,
      elements: s.elements,
      filterId: s.filterId === "none" ? null : s.filterId,
      adjustments: s.adjustments,
      backgroundId: s.backgroundId,
      canvas: s.background,
      altText: null,
    }),
  );
}

/**
 * Rebuild editor slides from a story's `slides` column. The inverse of
 * `compositionsToSlides`: a null or empty array means single-slide, and the
 * caller's own live composition is used.
 */
export function compositionsFromSlides<S = unknown>(
  first: SlideComposition<S>,
  stored: readonly StorySlide[] | null | undefined,
): SlideComposition<S>[] {
  if (!stored || stored.length === 0) return [first];
  return stored.map((s) => {
    const slide = toSlide(s);
    return {
      id: slide.id,
      elements: slide.elements,
      background: slide.canvas ?? first.background,
      backgroundId: slide.backgroundId ?? first.backgroundId,
      filterId: slide.filterId ?? "none",
      adjustments: slide.adjustments ?? first.adjustments,
      strokes: [] as S[],
    };
  });
}

export { emptySlide };
