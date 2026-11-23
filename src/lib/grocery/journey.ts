/**
 * The Grocery Journey's words and marks (M-201) — the pure copy the
 * section renders, kept in the lib so the bands are pinned by unit
 * tests rather than by reading a rendered page.
 *
 * The words are the owner-approved concept preview's, verbatim: the
 * milestone line that names the journey's stage, and the shorter
 * personality line under it. Two separate lines, two separate
 * bandings — the preview keeps them apart and so does this module.
 * Nothing here invents a fact: both lines are functions of the
 * bought count and the percentage alone.
 */

import { Drumstick, LeafyGreen, Milk, Package, Sprout, type LucideIcon } from "lucide-react";

import type { GroceryCategory } from "./groceryList";

/**
 * The milestone line, banded by percentage (the preview's bands):
 * the basket waits, then the journey is named at each quarter.
 */
export function groceryMilestoneFor(pct: number): string {
  if (pct >= 100) return "Shopping complete!";
  if (pct >= 75) return "Almost done";
  if (pct >= 50) return "Halfway there";
  if (pct >= 25) return "Getting started";
  return "Your basket is waiting";
}

/** The milestone step a percentage has reached (0/25/50/75/100) —
 *  the section pulses once when the step RISES, never on the way
 *  down and never on first paint. */
export function groceryMilestoneStep(pct: number): number {
  if (pct >= 100) return 100;
  if (pct >= 75) return 75;
  if (pct >= 50) return 50;
  if (pct >= 25) return 25;
  return 0;
}

/**
 * The personality line, banded by count first (the preview's order:
 * an empty basket and a first tick have their own lines whatever
 * the percentage says), then by percentage.
 */
export function groceryMessageFor(boughtCount: number, pct: number): string {
  if (boughtCount === 0) return "Your basket is looking a little lonely.";
  if (boughtCount === 1) return "Nice. One down!";
  if (pct >= 100) return "Everything’s in the basket. You’re all set!";
  if (pct >= 75) return "Just a few more things.";
  if (pct >= 50) return "You’re making good progress.";
  return "Getting started — one aisle at a time.";
}

/**
 * The categories' small glyphs — drawn Lucide marks (M-225: the raw
 * emoji these replaced were the app's last emoji-as-icon surface),
 * keyed by the lib's own category ids. A category outside the five
 * (the lib's honest "other" bucket) gets NO glyph rather than an
 * invented one.
 */
export const GROCERY_CATEGORY_ICONS: Partial<Record<GroceryCategory, LucideIcon>> = {
  produce: LeafyGreen,
  protein: Drumstick,
  dairy: Milk,
  pantry: Package,
  spices: Sprout,
};
