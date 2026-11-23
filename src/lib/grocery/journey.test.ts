/**
 * The Grocery Journey's words — pinned at the bands: the milestone
 * line and the personality line are the approved preview's copy,
 * banded exactly as the preview bands them (milestone by
 * percentage; personality by count first, then percentage), and the
 * category glyphs are the owner's five — the lib's "other" bucket
 * carries none.
 */

import { Drumstick, LeafyGreen, Milk, Package, Sprout } from "lucide-react";
import { describe, expect, it } from "vitest";

import {
  GROCERY_CATEGORY_ICONS,
  groceryMessageFor,
  groceryMilestoneFor,
  groceryMilestoneStep,
} from "./journey";

describe("groceryMilestoneFor", () => {
  it("bands by percentage, the preview's edges", () => {
    expect(groceryMilestoneFor(0)).toBe("Your basket is waiting");
    expect(groceryMilestoneFor(24)).toBe("Your basket is waiting");
    expect(groceryMilestoneFor(25)).toBe("Getting started");
    expect(groceryMilestoneFor(49)).toBe("Getting started");
    expect(groceryMilestoneFor(50)).toBe("Halfway there");
    expect(groceryMilestoneFor(74)).toBe("Halfway there");
    expect(groceryMilestoneFor(75)).toBe("Almost done");
    expect(groceryMilestoneFor(99)).toBe("Almost done");
    expect(groceryMilestoneFor(100)).toBe("Shopping complete!");
  });
});

describe("groceryMilestoneStep", () => {
  it("is the quarter the percentage has reached", () => {
    expect(groceryMilestoneStep(0)).toBe(0);
    expect(groceryMilestoneStep(24)).toBe(0);
    expect(groceryMilestoneStep(25)).toBe(25);
    expect(groceryMilestoneStep(50)).toBe(50);
    expect(groceryMilestoneStep(75)).toBe(75);
    expect(groceryMilestoneStep(100)).toBe(100);
  });
});

describe("groceryMessageFor", () => {
  it("an empty basket and a first tick have their own lines, whatever the percentage", () => {
    expect(groceryMessageFor(0, 0)).toBe("Your basket is looking a little lonely.");
    expect(groceryMessageFor(1, 4)).toBe("Nice. One down!");
    /* A one-item list is 100% at its first tick — the count rule
       still wins, as it does in the preview. */
    expect(groceryMessageFor(1, 100)).toBe("Nice. One down!");
  });

  it("then bands by percentage", () => {
    expect(groceryMessageFor(2, 8)).toBe("Getting started — one aisle at a time.");
    expect(groceryMessageFor(11, 49)).toBe("Getting started — one aisle at a time.");
    expect(groceryMessageFor(12, 50)).toBe("You’re making good progress.");
    expect(groceryMessageFor(18, 75)).toBe("Just a few more things.");
    expect(groceryMessageFor(23, 100)).toBe("Everything’s in the basket. You’re all set!");
  });
});

describe("GROCERY_CATEGORY_ICONS", () => {
  it("carries exactly the owner's five categories, as drawn glyphs (M-225)", () => {
    expect(GROCERY_CATEGORY_ICONS).toEqual({
      produce: LeafyGreen,
      protein: Drumstick,
      dairy: Milk,
      pantry: Package,
      spices: Sprout,
    });
    expect(GROCERY_CATEGORY_ICONS.other).toBeUndefined();
  });
});
