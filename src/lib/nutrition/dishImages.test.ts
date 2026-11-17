/**
 * Nutrition D3 — the dish-photograph manifest, held to its rules.
 *
 * The manifest is generated (scripts/nutrition-dish-images.mjs) from
 * pinned Wikimedia Commons files, and these tests are the gate that
 * keeps it honest in the tree: every library dish is accounted for
 * exactly once — photographed or explicitly photo-less; every licence
 * is on the free-licence allowlist; every attribution is present and
 * points at a real Commons file page; every pinned asset is actually
 * in the tree at a sane size. A hand-edit that drops an asset, invents
 * an author or smuggles in a non-free licence fails here.
 */
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  DISH_PHOTOS,
  DISH_PHOTO_CREDITS,
  PHOTOLESS_DISHES,
  dishPhotoFor,
  dishPhotoCredit,
} from "./dishImages";
import { DISH_LIBRARY } from "./data/dishLibrary";

/** The free licences Bloom may ship: CC0, public domain, CC BY and
 *  CC BY-SA (any version, incl. ported jurisdictions like "3.0 us"). */
const ALLOWED_LICENCE = /^(CC0|Public domain|CC BY( \d\.\d( [a-z]{2})?)?|CC BY-SA( \d\.\d( [a-z]{2})?)?)$/;

const ASSETS_DIR = join(process.cwd(), "src", "assets", "dishes");

describe("dish photograph manifest", () => {
  it("accounts for every library dish exactly once", () => {
    const photographed = DISH_PHOTOS.map((p) => p.dishId);
    const photoless = PHOTOLESS_DISHES.map((p) => p.dishId);
    expect(new Set(photographed).size).toBe(photographed.length);
    expect(new Set(photoless).size).toBe(photoless.length);
    /* Disjoint: no dish is both photographed and listed photo-less. */
    expect(photographed.filter((id) => photoless.includes(id))).toEqual([]);
    /* Complete: together they are exactly the dish library. */
    const all = [...photographed, ...photoless].sort();
    expect(all).toEqual(DISH_LIBRARY.map((d) => d.id).sort());
  });

  it("carries only free licences, with the attribution Commons recorded", () => {
    for (const photo of DISH_PHOTOS) {
      expect(ALLOWED_LICENCE.test(photo.license), `${photo.dishId}: ${photo.license}`).toBe(true);
      expect(photo.author.trim().length, `${photo.dishId} author`).toBeGreaterThan(0);
      expect(photo.commonsTitle.startsWith("File:"), photo.dishId).toBe(true);
      expect(photo.pageUrl).toBe(
        `https://commons.wikimedia.org/wiki/${photo.commonsTitle.replace(/ /g, "_")}`,
      );
      expect(photo.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("has every pinned asset in the tree, at a sane size", () => {
    for (const photo of DISH_PHOTOS) {
      const path = join(ASSETS_DIR, `${photo.slug}.webp`);
      expect(existsSync(path), `${photo.dishId}: ${path}`).toBe(true);
      const { size } = statSync(path);
      expect(size, `${photo.slug} too small to be a real photograph`).toBeGreaterThan(4096);
      expect(size, `${photo.slug} too heavy for a dish photograph`).toBeLessThan(512000);
      expect(typeof photo.src).toBe("string");
      expect(photo.src.length).toBeGreaterThan(0);
    }
  });

  it("shares a Commons file only where the sharing is recorded here", () => {
    /* A file may serve more than one dish — an enriched variant of a
       photographed base dish, the same dish carried in two library
       categories, a visually identical sibling — but ONLY the groups
       listed here. The generator enforces the same list on its side
       (SHARED_FILES); a new share must be added to both, deliberately. */
    const EXPECTED_SHARES: readonly (readonly string[])[] = [
      ["dish-ar-pollo-crema", "dish-chicken-fricassee"],
      ["dish-chicken-souvlaki", "dish-intl-greek-chicken-souvlaki"],
      ["dish-garbanzos-espinacas", "dish-intl-chickpea-spinach-stew"],
      ["dish-intl-black-eyed-pea-stew", "dish-mavromatika-fasolia"],
      ["dish-chole-masala", "dish-chole-enriched"],
      ["dish-rajma-masala", "dish-rajma-enriched"],
      ["dish-matar-paneer", "dish-matar-paneer-enriched"],
      ["dish-palak-paneer", "dish-palak-paneer-enriched"],
      ["dish-egg-curry", "dish-egg-curry-enriched"],
      ["dish-chicken-curry", "dish-chicken-curry-enriched"],
      ["dish-dal-makhani", "dish-dal-makhani-enriched"],
      ["dish-baingan-bharta", "dish-baingan-bharta-enriched"],
      ["dish-goan-fish-curry", "dish-goan-fish-curry-enriched"],
      ["dish-veg-biryani", "dish-enriched-veg-biryani"],
      ["dish-fruit-curd-bowl", "dish-enriched-fruit-curd-bowl"],
      ["dish-khichdi-enriched", "dish-masala-khichdi"],
      ["dish-coconut-chutney", "dish-shahi-coconut-chutney"],
      ["dish-kadala-curry", "dish-kadala-curry-enriched"],
      ["dish-shake-cottage-cheese-banana", "dish-shake-greek-yogurt-banana", "dish-shake-ricotta-banana"],
      ["dish-shake-double-dairy-banana", "dish-shake-whey-cottage-cheese-banana", "dish-shake-whey-oat-banana"],
      ["dish-shake-coconut-banana-greek-yogurt", "dish-shake-mixed-seed-banana", "dish-shake-walnut-banana-greek-yogurt"],
      ["dish-shake-cottage-cheese-oats-banana", "dish-shake-oat-peanut-banana", "dish-shake-soy-powder-banana-oat-peanut"],
      ["dish-shake-peanut-banana-greek-yogurt", "dish-shake-whey-peanut-banana"],
      ["dish-shake-cottage-cheese-mango", "dish-shake-soy-powder-mango-coconut"],
      ["dish-shake-cottage-cheese-strawberry", "dish-shake-ricotta-strawberry"],
      ["dish-shake-greek-yogurt-strawberry", "dish-shake-whey-strawberry-greek-yogurt"],
      ["dish-shake-soy-powder-strawberry-almond", "dish-shake-sunflower-strawberry"],
      ["dish-shake-cottage-cheese-orange", "dish-shake-greek-yogurt-orange-cardamom"],
      ["dish-mango-lassi", "dish-shake-pumpkin-seed-mango"],
      ["dish-badam-doodh", "dish-shake-almond-cardamom"],
      ["dish-intl-overnight-oats", "dish-shake-overnight-oat-banana"],
    ];
    const slugs = DISH_PHOTOS.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const byTitle = new Map<string, string[]>();
    for (const photo of DISH_PHOTOS) {
      const list = byTitle.get(photo.commonsTitle) ?? [];
      list.push(photo.dishId);
      byTitle.set(photo.commonsTitle, list);
    }
    const actual = [...byTitle.values()]
      .filter((ids) => ids.length > 1)
      .map((ids) => [...ids].sort().join("|"))
      .sort();
    const expected = EXPECTED_SHARES.map((ids) => [...ids].sort().join("|")).sort();
    expect(actual).toEqual(expected);
  });

  it("resolves photographs only for photographed library dishes", () => {
    for (const photo of DISH_PHOTOS) {
      expect(dishPhotoFor(photo.dishId)?.commonsTitle).toBe(photo.commonsTitle);
      const credit = dishPhotoCredit(photo.dishId);
      expect(credit).toContain(photo.author);
      expect(credit).toContain(photo.license);
      expect(credit).toContain("Wikimedia Commons");
    }
    for (const entry of PHOTOLESS_DISHES) {
      expect(dishPhotoFor(entry.dishId)).toBeNull();
      expect(dishPhotoCredit(entry.dishId)).toBeNull();
      expect(entry.reason.trim().length).toBeGreaterThan(0);
    }
    /* An id that is not a library dish never resolves. */
    expect(dishPhotoFor("dish-not-a-dish")).toBeNull();
    expect(dishPhotoFor("usda-1234")).toBeNull();
  });

  it("credits exactly the photographs it ships", () => {
    expect(DISH_PHOTO_CREDITS.length).toBe(DISH_PHOTOS.length);
    expect(DISH_PHOTO_CREDITS.map((c) => c.dishId).sort()).toEqual(
      DISH_PHOTOS.map((p) => p.dishId).sort(),
    );
  });
});
