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
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

import { DISH_LIBRARY, dishPhotoFor } from "@/lib/nutrition";
import { DishPhoto } from "./DishPhoto";
import { DishDetailSheet } from "./DishDetailSheet";

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

  it("the detail sheet's photo lightbox stacks above the detail sheet", () => {
    /* The dish lightbox is a BloomSheet opened from inside another
       BloomSheet (the detail sheet). Both panels share the sheet
       z-index, so the later portal in document order is the one that
       paints on top — pin that the lightbox is that later panel, with
       the photograph and its credit inside it. */
    const dish = DISH_LIBRARY.find((d) => dishPhotoFor(d.id) !== null)!;
    const photo = dishPhotoFor(dish.id)!;
    render(
      <DishDetailSheet
        dish={dish}
        day="2026-11-16"
        onClose={() => {}}
        onLog={() => true}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: `View photo of ${dish.name.en}` }),
    );
    const panels = [...document.querySelectorAll<HTMLElement>(".bsheet")];
    expect(panels).toHaveLength(2);
    const [detailPanel, lightboxPanel] = panels;
    expect(detailPanel!.querySelector("img.nut-lightbox-img")).toBeNull();
    const big = lightboxPanel!.querySelector("img.nut-lightbox-img");
    expect(big).not.toBeNull();
    expect(big?.getAttribute("src")).toBe(photo.src);
    expect(
      within(lightboxPanel!).getByText(
        `Photo by ${photo.author} · ${photo.license}`,
      ),
    ).toBeTruthy();
  });
});
