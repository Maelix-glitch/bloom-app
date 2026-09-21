import { describe, expect, it } from "vitest";

import { isComfortable, placeCard } from "./placement";

/**
 * The tour card used to be placed by a guess (`spaceBottom > 300 || spaceBottom
 * > spaceTop`), which happily put the card on top of the control it was
 * explaining whenever that control sat low on the screen. These pin the four
 * cases that actually happen in Bloom: a phone, a desktop rail, a target pinned
 * to the bottom tab bar, and a target too tall to have a side at all.
 */

const PHONE = { width: 390, height: 844, safeBottom: 0 };
const PHONE_WITH_TAB_BAR = { width: 390, height: 844, safeBottom: 72 };
const DESKTOP = { width: 1440, height: 900, safeBottom: 0 };
const CARD = { width: 360, height: 260 };

const hole = (x: number, y: number, width: number, height: number, radius = 18) => ({
  x,
  y,
  width,
  height,
  radius,
});

describe("placeCard", () => {
  it("goes below a target near the top of a phone", () => {
    const result = placeCard({
      hole: hole(120, 96, 150, 44),
      card: CARD,
      viewport: PHONE,
      preferred: "auto",
    });
    expect(result.placement).toBe("bottom");
    expect(result.card.y).toBeGreaterThan(96 + 44);
    expect(result.card.x).toBeGreaterThanOrEqual(14);
    expect(result.card.x + result.card.width).toBeLessThanOrEqual(390 - 14);
  });

  it("goes above a target on the bottom tab bar, and clears the bar", () => {
    const result = placeCard({
      hole: hole(60, 760, 90, 60),
      card: CARD,
      viewport: PHONE_WITH_TAB_BAR,
      preferred: "bottom",
    });
    expect(result.placement).toBe("top");
    expect(result.card.y).toBeLessThan(760);
    expect(result.card.y + result.card.height).toBeLessThanOrEqual(844 - 72 - 14);
  });

  it("honours the step's preferred side when that side fits", () => {
    const result = placeCard({
      hole: hole(0, 300, 220, 520),
      card: CARD,
      viewport: DESKTOP,
      preferred: "right",
    });
    expect(result.placement).toBe("right");
    expect(result.card.x).toBeGreaterThan(220);
  });

  it("keeps the card off the highlight when a side fits but would overlap", () => {
    const target = hole(500, 200, 400, 500);
    const result = placeCard({ hole: target, card: CARD, viewport: DESKTOP, preferred: "auto" });
    const overlaps =
      result.card.x < target.x + target.width &&
      result.card.x + result.card.width > target.x &&
      result.card.y < target.y + target.height &&
      result.card.y + result.card.height > target.y;
    expect(overlaps).toBe(false);
  });

  it("falls back to a bottom sheet when the target fills the screen", () => {
    const result = placeCard({
      hole: hole(10, 40, 370, 780),
      card: CARD,
      viewport: PHONE,
      preferred: "auto",
    });
    expect(result.placement).toBe("sheet");
    expect(result.card.y + result.card.height).toBeLessThanOrEqual(844 - 14);
    expect(result.card.x).toBeGreaterThanOrEqual(14);
  });

  it("keeps the leader line inside the card, whatever the target's centre does", () => {
    /* Target centre far to the left of the card: the arrow must clamp, not
       point at nothing 40px outside the card's own edge. */
    const result = placeCard({
      hole: hole(-400, 100, 900, 44),
      card: CARD,
      viewport: DESKTOP,
      preferred: "bottom",
    });
    expect(result.arrow).toBeGreaterThanOrEqual(22);
    expect(result.arrow).toBeLessThanOrEqual(CARD.width - 22);
  });
});

describe("isComfortable", () => {
  it("is happy with a target that has a card's worth of room below it", () => {
    expect(isComfortable(hole(120, 96, 150, 44), PHONE, CARD)).toBe(true);
  });

  it("is unhappy with a target under a tab bar with no room anywhere", () => {
    const cramped = { width: 390, height: 420, safeBottom: 72 };
    expect(isComfortable(hole(20, 300, 350, 100), cramped, CARD)).toBe(false);
  });
});
