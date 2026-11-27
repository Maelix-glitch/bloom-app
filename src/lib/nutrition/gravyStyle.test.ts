import { describe, expect, it } from "vitest";

import { DISH_LIBRARY } from "./data/dishLibrary";
import type { Dish } from "./dishes";
import { dishIsGravyStyle } from "./gravyStyle";

/**
 * Method 14 (M-160) — the gravy derivation's pins. The library
 * carries no "gravy" field and no sauce tag, so dishIsGravyStyle
 * derives the answer from each dish's own recipe structure:
 * its ingredient lines and its method text, never its name.
 * These pins hold the derivation to that contract — a census
 * over the shipped library, the named verdicts the owner can
 * check against his own plan, and one synthetic dish per cue
 * and per veto, so a future library edit that flips a verdict
 * fails here by name rather than silently changing what the
 * plan serves.
 */

const BY_ID = new Map(DISH_LIBRARY.map((d) => [d.id, d]));

/** A synthetic main dish: chicken in a plain method, one serving,
 *  no sauce-base lines — gravy only when a test adds a cue. */
function synthetic(over: Partial<Dish>): Dish {
  return {
    id: "dish-synthetic",
    name: { en: "Synthetic", hindi: "" },
    category: "main",
    servings: 1,
    lines: [{ foodId: "usda-171077", grams: 150 }],
    method: ["Cook the chicken through."],
    timeMinutes: 20,
    budgetTier: 1,
    enriched: false,
    ...over,
  };
}

describe("gravy-style derivation · the shipped census", () => {
  it("exactly 436 of the 994 shipped mains are gravy-style", () => {
    /* 354 of 755 before the Bulgarian wave (2026-11-26) added 29
       mains, 10 of them gravy-style (its soups, kavarma, musaka,
       frikase and bean yahniya). The Bulgarian wave 2 (2026-11-26)
       added 40 mains, 17 of them gravy-style (its seven soups, the
       four kavarma, the Chirpanski meatballs, the bean and cabbage
       pot, the two musaka and the two yahniya). Protein wave A
       (2026-11-26) added 60 mains, 21 of them gravy-style (its
       curries, dals and chillis, the coconut fish curries, and the
       wet-simmer soft edges the derivation's header owns: the
       lentil shepherd's pie, the meatloaf bake, the chowder, the
       bean soup and the broad bean barley stew that replaced the
       wave's draft mujadara). Protein wave B (2026-11-26) added
       58 mains, 19 of them gravy-style (the two rendang, the
       sinigang, the cod and chickpea stew, the pasta bakes in
       sauce, murgh cholay, the lentil and bean stews, the moringa
       dal and the blended soups). Protein wave C (2026-11-26)
       added 52 mains, 15 of them gravy-style (the cassoulet, the
       cocido, the birria, ghormeh sabzi, the étouffée and
       cioppino, the two bean stews and the wet curries). */
    const mains = DISH_LIBRARY.filter((d) => d.category === "main");
    expect(mains.length).toBe(994);
    expect(mains.filter(dishIsGravyStyle).length).toBe(436);
  });

  it("no non-main dish is ever gravy-style", () => {
    for (const dish of DISH_LIBRARY) {
      if (dish.category !== "main") expect(dishIsGravyStyle(dish), dish.id).toBe(false);
    }
  });

  it("the plain Steamed Rice base is not itself gravy-style", () => {
    expect(dishIsGravyStyle(BY_ID.get("dish-steamed-rice")!)).toBe(false);
  });
});

describe("gravy-style derivation · the named verdicts", () => {
  const GRAVY = [
    "dish-chicken-rezala", // the owner's own lunch: white gravy
    "dish-chicken-do-pyaza", // two-onion simmered masala
    "dish-chicken-tikka-masala", // grilled pieces, masala finish
    "dish-moru-curry", // simmered spiced yogurt
    "dish-gushtaba", // yogurt gravy, named in its method
    "dish-paneer-butter-masala", // tomato-makhani simmer
    "dish-salmon-masala-curry", // tomato-coconut simmer
    "dish-bhindi-masala", // tomato-onion masala medium
  ];
  const NOT_GRAVY = [
    "dish-kozhi-pepper-fry", // the masala is dried off in the pan
    "dish-mathi-pepper-fry", // pepper fry, no sauce at all
    "dish-paneer-tikka", // skewered and grilled dry
    "dish-intl-chicken-caesar-salad", // a dressed salad, not a gravy
    "dish-us-yogurt-tuna-salad", // a cold filling
    "dish-mushroom-masala", // its own method dries the masala off
    "dish-chicken-biryani", // rice category: the grain is in the pot
  ];
  for (const id of GRAVY) {
    it(`${id} is gravy-style`, () => {
      expect(dishIsGravyStyle(BY_ID.get(id)!), id).toBe(true);
    });
  }
  for (const id of NOT_GRAVY) {
    it(`${id} is not gravy-style`, () => {
      expect(dishIsGravyStyle(BY_ID.get(id)!), id).toBe(false);
    });
  }
});

describe("gravy-style derivation · one synthetic dish per rule", () => {
  it("the gravy word alone is a cue", () => {
    const dish = synthetic({ method: ["Rest the pieces in the gravy."] });
    expect(dishIsGravyStyle(dish)).toBe(true);
  });

  it("a masala-medium finish is a cue", () => {
    const dish = synthetic({ method: ["Fold the pieces into a thick masala."] });
    expect(dishIsGravyStyle(dish)).toBe(true);
  });

  it("a wet simmer over a sauce base is a cue", () => {
    const dish = synthetic({
      lines: [
        { foodId: "usda-171077", grams: 150 },
        { foodId: "usda-170457", grams: 100 }, // tomato, well over the floor
      ],
      method: ["Simmer everything together for 15 minutes."],
    });
    expect(dishIsGravyStyle(dish)).toBe(true);
  });

  it("a simmer in plain water is not a cue", () => {
    const dish = synthetic({
      lines: [
        { foodId: "usda-171077", grams: 150 },
        { foodId: "usda-170457", grams: 100 },
      ],
      method: ["Simmer in water until tender."],
    });
    expect(dishIsGravyStyle(dish)).toBe(false);
  });

  it("a simmer under the sauce-base floor is not a cue", () => {
    const dish = synthetic({
      lines: [
        { foodId: "usda-171077", grams: 150 },
        { foodId: "usda-170457", grams: 10 }, // a garnish's worth of tomato
      ],
      method: ["Simmer everything together for 15 minutes."],
    });
    expect(dishIsGravyStyle(dish)).toBe(false);
  });

  it("a dry finish vetoes even a gravy word elsewhere in the method", () => {
    const dish = synthetic({
      method: ["Make the gravy.", "Cook until the masala clings dry to the pieces."],
    });
    expect(dishIsGravyStyle(dish)).toBe(false);
  });

  it("the dry-cook veto beats a bare simmer cue", () => {
    const dish = synthetic({
      lines: [
        { foodId: "usda-171077", grams: 150 },
        { foodId: "usda-170457", grams: 100 },
      ],
      method: ["Thread onto skewers and simmer briefly before grilling."],
    });
    expect(dishIsGravyStyle(dish)).toBe(false);
  });

  it("a gravy-word finish yields the dry-cook veto (tikka masala's shape)", () => {
    const dish = synthetic({
      method: ["Grill the skewers.", "Fold the pieces into the gravy."],
    });
    expect(dishIsGravyStyle(dish)).toBe(true);
  });

  it("a dish that already carries its grain is never gravy-style", () => {
    const dish = synthetic({
      lines: [
        { foodId: "usda-171077", grams: 150 },
        { foodId: "usda-2512381", grams: 100 }, // rice, well over the grain floor
      ],
      method: ["Fold everything into the gravy."],
    });
    expect(dishIsGravyStyle(dish)).toBe(false);
  });

  it("a non-main category is never gravy-style, however wet", () => {
    const dish = synthetic({
      category: "side",
      method: ["Simmer in the gravy."],
    });
    expect(dishIsGravyStyle(dish)).toBe(false);
  });
});
