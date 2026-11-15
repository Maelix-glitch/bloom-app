/**
 * Nutrition P3-R — the food-photograph manifest, held to its rules.
 *
 * The manifest is generated (scripts/nutrition-food-images.mjs) from
 * pinned Wikimedia Commons files, and these tests are the gate that
 * keeps it honest in the tree: every reference food is accounted for
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
  FOOD_PHOTOS,
  FOOD_PHOTO_CREDITS,
  PHOTOLESS_REFERENCE_FOODS,
  foodPhotoFor,
} from "./foodImages";
import { USDA_REFERENCE_FOODS } from "./usdaReference";

/** The free licences Bloom may ship: CC0, public domain, CC BY and
 *  CC BY-SA (any version, incl. ported jurisdictions like "3.0 us"). */
const ALLOWED_LICENCE = /^(CC0|Public domain|CC BY( \d\.\d( [a-z]{2})?)?|CC BY-SA( \d\.\d( [a-z]{2})?)?)$/;

const ASSETS_DIR = join(process.cwd(), "src", "assets", "foods");

describe("food photograph manifest", () => {
  it("accounts for every reference food exactly once", () => {
    const photographed = FOOD_PHOTOS.map((p) => p.foodId);
    const photoless = PHOTOLESS_REFERENCE_FOODS.map((p) => p.foodId);
    expect(new Set(photographed).size).toBe(photographed.length);
    expect(new Set(photoless).size).toBe(photoless.length);
    /* Disjoint: no food is both photographed and listed photo-less. */
    expect(photographed.filter((id) => photoless.includes(id))).toEqual([]);
    /* Complete: together they are exactly the reference set. */
    const all = [...photographed, ...photoless].sort();
    expect(all).toEqual(USDA_REFERENCE_FOODS.map((f) => f.id).sort());
  });

  it("carries only free licences, with the attribution Commons recorded", () => {
    for (const photo of FOOD_PHOTOS) {
      expect(ALLOWED_LICENCE.test(photo.license), `${photo.foodId}: ${photo.license}`).toBe(true);
      expect(photo.author.trim().length, `${photo.foodId} author`).toBeGreaterThan(0);
      expect(photo.commonsTitle.startsWith("File:"), photo.foodId).toBe(true);
      expect(photo.pageUrl).toBe(
        `https://commons.wikimedia.org/wiki/${photo.commonsTitle.replace(/ /g, "_")}`,
      );
      expect(photo.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("has every pinned asset in the tree, at a sane size", () => {
    for (const photo of FOOD_PHOTOS) {
      const path = join(ASSETS_DIR, `${photo.slug}.webp`);
      expect(existsSync(path), `${photo.foodId}: ${path}`).toBe(true);
      const { size } = statSync(path);
      expect(size, `${photo.slug} too small to be a real photograph`).toBeGreaterThan(2048);
      expect(size, `${photo.slug} too heavy for a 48px thumbnail`).toBeLessThan(153600);
      expect(typeof photo.src).toBe("string");
      expect(photo.src.length).toBeGreaterThan(0);
    }
  });

  it("resolves photographs only for photographed reference foods", () => {
    for (const photo of FOOD_PHOTOS) {
      expect(foodPhotoFor(photo.foodId)?.commonsTitle).toBe(photo.commonsTitle);
    }
    for (const entry of PHOTOLESS_REFERENCE_FOODS) {
      expect(foodPhotoFor(entry.foodId)).toBeNull();
      expect(entry.reason.trim().length).toBeGreaterThan(0);
    }
    /* A user's own food is not a reference food: no photograph, ever. */
    expect(foodPhotoFor("custom-123")).toBeNull();
    expect(foodPhotoFor("usda-999999999")).toBeNull();
  });

  it("credits exactly the photographs it ships", () => {
    expect(FOOD_PHOTO_CREDITS.length).toBe(FOOD_PHOTOS.length);
    expect(FOOD_PHOTO_CREDITS.map((c) => c.foodId).sort()).toEqual(
      FOOD_PHOTOS.map((p) => p.foodId).sort(),
    );
  });
});
