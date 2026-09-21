/**
 * Where the tour card goes — pure geometry, no DOM, unit-tested.
 *
 * The old overlay guessed with `spaceBottom > 300 || spaceBottom > spaceTop`,
 * which put the card on top of the control it was explaining whenever that
 * control sat low on the page, and — because it never clamped across the axis
 * it wasn't placing on — rejected perfectly good sides on a phone, where a
 * 360px card can only be *centred* on a target that happens to be mid-screen.
 *
 * The rules here, in order:
 *   · the side the step asked for is tried first, if it fits;
 *   · the cross axis is clamped to the margins, so a phone card goes edge-ish
 *     to edge-ish above or below the target instead of giving up;
 *   · a side that fits but would cover the highlight loses to one that doesn't;
 *   · when no side has room, the card becomes a bottom sheet — the iOS way —
 *     and it still refuses to sit on the thing being pointed at.
 */

export type Placement = "top" | "bottom" | "left" | "right" | "sheet";

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Viewport {
  width: number;
  height: number;
  /** What the phone tab bar (and home indicator) owns at the bottom. */
  safeBottom?: number;
}

export interface PlaceCardInput {
  /** The highlight hole (already padded around the target). */
  hole: Box;
  /** The card's measured size. */
  card: { width: number; height: number };
  viewport: Viewport;
  /** What the step asked for; "auto" (or nothing) lets the space decide. */
  preferred?: Placement | "auto";
  margin?: number;
  /** Air between the hole and the card. */
  gap?: number;
}

export interface PlaceCardResult {
  placement: Placement;
  card: Box;
  /** Distance along the card's facing edge to the leader line. */
  arrow: number;
}

const DEFAULT_MARGIN = 14;
const DEFAULT_GAP = 18;

/** Keep the leader this far from a corner so it never meets the card's radius. */
const ARROW_INSET = 22;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/** Centre something on `centre`, but never let it leave the margins. */
function clampedCentre(centre: number, size: number, span: number, margin: number): number {
  return clamp(centre - size / 2, margin, Math.max(margin, span - size - margin));
}

function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function fits(box: Box, viewport: Viewport, margin: number, safeBottom: number): boolean {
  return (
    box.x >= margin - 0.5 &&
    box.y >= margin - 0.5 &&
    box.x + box.width <= viewport.width - margin + 0.5 &&
    box.y + box.height <= viewport.height - margin - safeBottom + 0.5
  );
}

function candidate(
  placement: Placement,
  hole: Box,
  card: { width: number; height: number },
  gap: number,
  viewport: Viewport,
  margin: number,
): Box {
  const centreX = hole.x + hole.width / 2;
  const centreY = hole.y + hole.height / 2;
  switch (placement) {
    case "top":
      return {
        x: clampedCentre(centreX, card.width, viewport.width, margin),
        y: hole.y - gap - card.height,
        width: card.width,
        height: card.height,
      };
    case "left":
      return {
        x: hole.x - gap - card.width,
        y: clampedCentre(centreY, card.height, viewport.height, margin),
        width: card.width,
        height: card.height,
      };
    case "right":
      return {
        x: hole.x + hole.width + gap,
        y: clampedCentre(centreY, card.height, viewport.height, margin),
        width: card.width,
        height: card.height,
      };
    case "sheet":
    case "bottom":
    default:
      return {
        x: clampedCentre(centreX, card.width, viewport.width, margin),
        y: hole.y + hole.height + gap,
        width: card.width,
        height: card.height,
      };
  }
}

/** Leader position along the facing edge, measured from the card's own edge. */
function arrowFor(placement: Placement, hole: Box, card: Box): number {
  if (placement === "left" || placement === "right") {
    return clamp(hole.y + hole.height / 2 - card.y, ARROW_INSET, card.height - ARROW_INSET);
  }
  return clamp(hole.x + hole.width / 2 - card.x, ARROW_INSET, card.width - ARROW_INSET);
}

/** Vertical sides read best next to a rail or a card, so they are tried first. */
const ORDER: Placement[] = ["bottom", "top", "right", "left"];

export function placeCard({
  hole,
  card: cardSize,
  viewport,
  preferred,
  margin = DEFAULT_MARGIN,
  gap = DEFAULT_GAP,
}: PlaceCardInput): PlaceCardResult {
  const safeBottom = viewport.safeBottom ?? 0;
  const tried =
    preferred && preferred !== "auto" && preferred !== "sheet"
      ? [preferred, ...ORDER.filter((side) => side !== preferred)]
      : ORDER;

  let coversHighlight: { placement: Placement; box: Box } | null = null;

  for (const placement of tried) {
    const box = candidate(placement, hole, cardSize, gap, viewport, margin);
    if (!fits(box, viewport, margin, safeBottom)) continue;
    /* A side that fits *and* leaves the highlight clear is the answer. */
    if (!overlaps(box, hole)) {
      return { placement, card: box, arrow: arrowFor(placement, hole, box) };
    }
    coversHighlight ??= { placement, box };
  }

  if (coversHighlight) {
    return {
      placement: coversHighlight.placement,
      card: coversHighlight.box,
      arrow: arrowFor(coversHighlight.placement, hole, coversHighlight.box),
    };
  }

  /* No side has room: pin the card to the bottom, out of the way. If the
     highlight lives down there too, sit above it instead — but only when above
     is actually clear; a highlight the size of the screen keeps the sheet at
     the bottom, where a thumb already is. */
  const sheetX = clampedCentre(hole.x + hole.width / 2, cardSize.width, viewport.width, margin);
  const atBottom = Math.max(margin, viewport.height - cardSize.height - margin - safeBottom);
  const aboveHole = Math.max(margin, hole.y - gap - cardSize.height);
  const sheet: Box = { x: sheetX, y: atBottom, width: cardSize.width, height: cardSize.height };
  if (overlaps(sheet, hole) && !overlaps({ ...sheet, y: aboveHole }, hole)) {
    sheet.y = aboveHole;
  }
  return { placement: "sheet", card: sheet, arrow: arrowFor("bottom", hole, sheet) };
}

/**
 * Is the target somewhere a card can be shown next to? Used to decide whether
 * to scroll before focusing — scrolling when it is already comfortable is what
 * made the old overlay lurch on every step.
 */
export function isComfortable(
  hole: Box,
  viewport: Viewport,
  card: { width: number; height: number },
  margin = DEFAULT_MARGIN,
  gap = DEFAULT_GAP,
): boolean {
  const safeBottom = viewport.safeBottom ?? 0;
  const needed = card.height + gap + margin * 2;
  const roomAbove = hole.y - margin;
  const roomBelow = viewport.height - safeBottom - margin - (hole.y + hole.height);
  const roomSide = Math.max(hole.x - margin, viewport.width - margin - (hole.x + hole.width));

  if (roomAbove >= needed || roomBelow >= needed) return true;
  if (roomSide >= card.width + gap + margin) return true;

  /* Last resort, and the one a phone actually uses: the card sits at the
     bottom, so all that matters is the highlight being clear of that band. */
  const sheetBand = Math.min(card.height, viewport.height * 0.42);
  return (
    hole.y >= margin && hole.y + hole.height <= viewport.height - safeBottom - margin - sheetBand
  );
}
