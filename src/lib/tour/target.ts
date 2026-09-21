/**
 * Reading the thing a tour step points at.
 *
 * Kept out of the component so the overlay's frame loop stays legible, and so
 * the two costs here are visible: a `getBoundingClientRect()` (one forced
 * layout read per frame, unavoidable) and a `getComputedStyle()` (much more
 * expensive — so it is cached per element and only re-read when the element
 * changes size).
 */

import type { Box } from "./placement";

/** Air between the target and the edge of the highlight. */
export const HOLE_PAD = 10;

export function readTarget(name: string): HTMLElement | null {
  if (typeof document === "undefined" || !name) return null;
  let selector: string;
  try {
    selector = `[data-tour="${CSS.escape(name)}"]`;
  } catch {
    selector = `[data-tour="${name}"]`;
  }
  const el = document.querySelector<HTMLElement>(selector);
  // A detached node has no geometry; treat it as "not here yet".
  return el && el.isConnected ? el : null;
}

interface RadiusCacheEntry {
  radius: number;
  width: number;
  height: number;
}

const radiusCache = new WeakMap<HTMLElement, RadiusCacheEntry>();

/**
 * The corner radius the highlight should wear: the target's own, plus the pad,
 * so a pill button gets a pill hole and a card gets a card hole. Percentages
 * (`rounded-full` → `9999px` clamped by the browser to half the box) are read
 * back as pixels, which is exactly what we want.
 */
export function holeRadius(el: HTMLElement, pad: number = HOLE_PAD): number {
  const rect = el.getBoundingClientRect();
  const cached = radiusCache.get(el);
  if (
    cached &&
    Math.abs(cached.width - rect.width) < 0.5 &&
    Math.abs(cached.height - rect.height) < 0.5
  ) {
    return cached.radius + pad;
  }
  let radius = 14;
  try {
    const raw = window.getComputedStyle(el).borderTopLeftRadius;
    const px = Number.parseFloat(raw);
    if (Number.isFinite(px)) radius = px;
    else if (raw.includes("%")) radius = Math.min(rect.width, rect.height) / 2;
  } catch {
    /* keep the default */
  }
  // Never round past a pill, whatever the target claims.
  radius = Math.min(radius, Math.max(0, Math.min(rect.width, rect.height) / 2));
  radiusCache.set(el, { radius, width: rect.width, height: rect.height });
  return radius + pad;
}

/** The highlight hole: a target's rect, padded, wearing the target's radius. */
export interface Hole extends Box {
  radius: number;
}

export function holeFor(rect: DOMRect, radius: number, pad: number = HOLE_PAD): Hole {
  return {
    x: rect.left - pad,
    y: rect.top - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
    radius,
  };
}

/**
 * How much of the bottom of the screen the phone tab bar owns (it already
 * includes the home-indicator inset). The card must clear it — a tour card
 * sitting on top of the nav is both unreadable and untappable, and the nav is
 * usually what the step is pointing at.
 */
export function bottomInset(): number {
  if (typeof window === "undefined" || typeof document === "undefined") return 0;
  const bar = document.querySelector<HTMLElement>("nav.app-mobile-nav");
  if (!bar) return 0;
  const rect = bar.getBoundingClientRect();
  // Only count it when it is actually pinned to the bottom edge right now.
  return rect.height > 0 && rect.bottom >= window.innerHeight - 1 ? rect.height : 0;
}

/**
 * Scroll a step's control into view — guarded, because `scrollIntoView` is one
 * of the handful of DOM methods that a test environment (jsdom) simply doesn't
 * implement, and a tutorial must never throw from inside its frame loop.
 */
export function reveal(el: HTMLElement, behaviour: ScrollBehavior): void {
  try {
    el.scrollIntoView({ block: "center", inline: "center", behavior: behaviour });
  } catch {
    /* nothing to scroll, or nothing to scroll with */
  }
}
