/**
 * The floating "Reflect & log today" dock's manners.
 *
 * The dock is a fixed overlay, so while the page scrolls it would otherwise
 * ride over card captions, the route chart's fine print and the field grid.
 * It steps aside instead: hidden while the scroll is moving down, back the
 * moment the scroll turns up (that usually means "take me back to the
 * button"), and back for good once the scroll has rested a beat.
 *
 * The decision itself is this pure function — one scroll delta in, the next
 * hidden state out — so the rule is testable without a window.
 */

/** How long the scroll must rest before the dock returns on its own. */
export const DOCK_RETURN_MS = 700;

/**
 * Should the dock be hidden after a scroll move of `deltaY` px (positive =
 * scrolling down the page)? Scrolling up always brings it back at once; a
 * zero move holds whatever state it was in.
 */
export function dockHiddenAfterScroll(currentlyHidden: boolean, deltaY: number): boolean {
  if (deltaY < 0) return false;
  if (deltaY > 0) return true;
  return currentlyHidden;
}
