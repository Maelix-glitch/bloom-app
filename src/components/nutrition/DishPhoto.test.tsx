// @vitest-environment jsdom
/**
 * Nutrition — the DishPhoto contract against the REAL dish-photo
 * manifest (D3 landed): a dish with no photograph renders nothing at
 * all — no box, no placeholder, no broken-image chrome — exactly as a
 * photo-less food does; a photographed dish renders its thumbnail as
 * its own button, which opens the credited lightbox. (This file began
 * as the D4 empty-manifest contract test and was rewritten when the
 * manifest arrived — same component, same honesty rule.)
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { DISH_LIBRARY, dishPhotoFor } from "@/lib/nutrition";
import { DishPhoto } from "./DishPhoto";

afterEach(cleanup);

beforeEach(() => {
  window.matchMedia =
    window.matchMedia ??
    ((query: string) =>
      ({
        matches: false,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        onchange: null,
      }) as unknown as MediaQueryList);
});

describe("DishPhoto", () => {
  it("renders nothing for a photo-less library dish", () => {
    const dish = DISH_LIBRARY.find((d) => dishPhotoFor(d.id) === null)!;
    expect(dish).toBeTruthy();
    const { container } = render(<DishPhoto dishId={dish.id} name={dish.name.en} />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.innerHTML).toBe("");
  });

  it("renders the photograph as its own button for a photographed dish", () => {
    const dish = DISH_LIBRARY.find((d) => dishPhotoFor(d.id) !== null)!;
    expect(dish).toBeTruthy();
    render(<DishPhoto dishId={dish.id} name={dish.name.en} />);
    const img = screen.getByAltText(dish.name.en);
    expect(img).toBeTruthy();
    expect(
      screen.getByRole("button", { name: `View photo of ${dish.name.en}` }),
    ).toBeTruthy();
  });

  it("renders nothing for an unknown dish, at either size", () => {
    const { container } = render(
      <>
        <DishPhoto dishId="dish-nope" name="Nope" />
        <DishPhoto dishId="dish-nope" name="Nope" size="large" />
      </>,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(container.innerHTML).toBe("");
  });
});
