/**
 * Viewer segments — flattening a story rail into what actually plays.
 *
 * A *segment* is one slide of one story. The viewer advances through segments
 * rather than stories, so a three-slide story is three progress bars and three
 * taps, and swiping past its last slide carries into the next story.
 *
 * The invariant that protects existing stories: a single-slide story produces
 * exactly one segment. Because `storySlides()` synthesises one slide for any
 * story published before multi-slide existed, legacy rails flatten to exactly
 * what they did before and play identically.
 *
 * This lives beside the viewer rather than inside it so the flattening rules
 * are testable without rendering the 700-line viewer.
 */

import { isStoryActive, type Story } from "@/lib/profile/types";
import { storySlides, type StorySlide } from "@/lib/stories/slides";

/** One slide of one story — the unit the viewer advances through. */
export interface Segment {
  /** Key: stable for the lifetime of the target. */
  key: string;
  story: Story;
  slide: StorySlide;
  /** Index of the story in the rail, for the "n of m" label. */
  storyIndex: number;
  /** Position within its story, 0-based. */
  slideIndex: number;
  slideCount: number;
}

/**
 * Flatten a rail into segments.
 *
 * Every story contributes at least one segment, even a malformed one, so the
 * viewer can never end up with nothing to show.
 */
export function buildSegments(stories: readonly Story[]): Segment[] {
  const segments: Segment[] = [];
  stories.forEach((story, storyIndex) => {
    const slides = storySlides(story);
    slides.forEach((slide, slideIndex) => {
      segments.push({
        key: `${story.id}#${slide.id}`,
        story,
        slide,
        storyIndex,
        slideIndex,
        slideCount: slides.length,
      });
    });
  });
  return segments;
}

/**
 * Where to start when the rail asks for `storyIndex`.
 *
 * Lands on that story's *first* slide, and skips forward past inactive stories
 * the way the old per-story navigation did. Returns -1 when nothing is
 * playable, which the caller treats as "close".
 */
export function segmentForStory(segments: readonly Segment[], storyIndex: number): number {
  for (let i = 0; i < segments.length; i += 1) {
    const seg = segments[i]!;
    if (seg.storyIndex === storyIndex && isStoryActive(seg.story)) return i;
  }
  for (let i = 0; i < segments.length; i += 1) {
    if (isStoryActive(segments[i]!.story)) return i;
  }
  return -1;
}

/** True when a slide has layers of its own and so needs the full canvas. */
export function isRichSlide(slide: StorySlide): boolean {
  return (
    slide.mediaType === "video" ||
    slide.mediaType === "image" ||
    slide.elements.length > 0 ||
    Boolean(slide.canvas) ||
    Boolean(slide.backgroundId)
  );
}
