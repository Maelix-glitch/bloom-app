// @vitest-environment jsdom
/**
 * Nutrition P3-R — the FoodPhoto thumbnail: present with the food's
 * name as its alt text for a photographed reference food, and entirely
 * absent — no box, no placeholder, no broken-image chrome — for a
 * photo-less reference food and for a user's own food.
 */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";

import { FOOD_PHOTOS, PHOTOLESS_REFERENCE_FOODS } from "@/lib/nutrition";
import { FoodPhoto } from "./FoodPhoto";

afterEach(cleanup);

describe("FoodPhoto", () => {
  it("renders the photograph for a photographed reference food", () => {
    const photo = FOOD_PHOTOS[0]!;
    const { container } = render(<FoodPhoto foodId={photo.foodId} name={photo.foodName} />);
    const img = container.querySelector("img.nut-food-thumb");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("alt")).toBe(photo.foodName);
    expect(img?.getAttribute("loading")).toBe("lazy");
    expect(img?.getAttribute("width")).toBe("48");
    expect(img?.getAttribute("height")).toBe("48");
  });

  it("renders nothing for a photo-less reference food", () => {
    const photolessId = PHOTOLESS_REFERENCE_FOODS[0]?.foodId ?? "usda-000000000";
    const { container } = render(<FoodPhoto foodId={photolessId} name="No photo" />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing for a user's own food", () => {
    const { container } = render(<FoodPhoto foodId="custom-42" name="My own food" />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.innerHTML).toBe("");
  });
});
