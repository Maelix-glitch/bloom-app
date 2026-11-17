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
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

});

describe("DishPhoto lightbox", () => {
  const dish = DISH_LIBRARY.find((d) => dishPhotoFor(d.id) !== null)!;
  const photo = dishPhotoFor(dish.id)!;

  function openLightbox() {
    render(<DishPhoto dishId={dish.id} name={dish.name.en} size="large" />);
    fireEvent.click(
      screen.getByRole("button", { name: `View photo of ${dish.name.en}` }),
    );
    return screen.getByRole("dialog");
  }

  it("opens the full view with the dish's name and its manifest credit", () => {
    const dialog = openLightbox();
    expect(dialog.getAttribute("aria-label")).toBe(dish.name.en);
    const big = dialog.querySelector("img.nut-lightbox-img");
    expect(big).not.toBeNull();
    expect(big?.getAttribute("src")).toBe(photo.src);
    expect(big?.getAttribute("alt")).toBe(dish.name.en);
    expect(
      within(dialog).getByText(`Photo by ${photo.author} · ${photo.license}`),
    ).toBeTruthy();
    const link = within(dialog).getByRole("link", {
      name: /View on Wikimedia Commons/,
    });
    expect(link.getAttribute("href")).toBe(photo.pageUrl);
  });

  it("closes on a backdrop tap", () => {
    const dialog = openLightbox();
    fireEvent.click(dialog.parentElement!);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes on the close button", () => {
    const dialog = openLightbox();
    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes on Escape", () => {
    openLightbox();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("does not close when the panel itself is tapped", () => {
    const dialog = openLightbox();
    fireEvent.click(dialog);
    expect(screen.queryByRole("dialog")).not.toBeNull();
  });
});

describe("DishPhoto lightbox layering", () => {
  const dish = DISH_LIBRARY.find((d) => dishPhotoFor(d.id) !== null)!;
  const photo = dishPhotoFor(dish.id)!;

  it("renders at the document body, not inside its host", () => {
    render(<DishPhoto dishId={dish.id} name={dish.name.en} size="large" />);
    fireEvent.click(
      screen.getByRole("button", { name: `View photo of ${dish.name.en}` }),
    );
    const dialog = screen.getByRole("dialog");
    /* The backdrop is the portal's root: a direct child of the body,
       so no host — sheet, scrollable list, transformed panel — can
       contain, clip or bury it. */
    expect(dialog.parentElement?.parentElement).toBe(document.body);
  });

  it("opens over the detail sheet as a body-level layer, and closing it leaves the sheet open", () => {
    const onClose = vi.fn();
    render(
      <DishDetailSheet
        dish={dish}
        day="2026-11-16"
        onClose={onClose}
        onLog={() => true}
      />,
    );
    /* The thumbnail really does live inside the sheet's panel — the
       burial this guards against. */
    const thumb = screen.getByRole("button", {
      name: `View photo of ${dish.name.en}`,
    });
    expect(thumb.closest(".bsheet")).not.toBeNull();

    fireEvent.click(thumb);
    /* The lightbox panel carries the dish's name, and so does the
       detail sheet's own dialog — select the lightbox by its panel
       class, the one surface the two never share. */
    const dialog = document.querySelector<HTMLElement>(".nut-lightbox-panel");
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute("role")).toBe("dialog");
    expect(dialog?.getAttribute("aria-label")).toBe(dish.name.en);
    const backdrop = dialog!.parentElement!;
    expect(backdrop.classList.contains("nut-lightbox-backdrop")).toBe(true);
    expect(backdrop.parentElement).toBe(document.body);
    expect(backdrop.closest(".bsheet")).toBeNull();
    /* The regression this replaces: the lightbox was a second
       BloomSheet whose backdrop (z-index 2000) painted under the
       detail sheet's panel (2001), leaving the sheet fully lit around
       the photo. There is exactly one sheet in the tree now — the
       detail sheet — and the photograph layers over it at 2100 (the
       stylesheet contract itself is pinned in FoodPhoto.test). */
    expect(document.querySelectorAll(".bsheet")).toHaveLength(1);
    const big = dialog!.querySelector("img.nut-lightbox-img");
    expect(big?.getAttribute("src")).toBe(photo.src);
    expect(
      within(dialog!).getByText(
        `Photo by ${photo.author} · ${photo.license}`,
      ),
    ).toBeTruthy();

    /* A backdrop tap closes the photograph only: the sheet underneath
       never hears it as an outside dismissal. */
    fireEvent.pointerDown(backdrop);
    fireEvent.click(backdrop);
    expect(document.querySelector(".nut-lightbox-panel")).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Log this dish/ })).toBeTruthy();

    /* Same for Escape: the photograph closes, the sheet stays. */
    fireEvent.click(
      screen.getByRole("button", { name: `View photo of ${dish.name.en}` }),
    );
    expect(document.querySelector(".nut-lightbox-panel")).not.toBeNull();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(document.querySelector(".nut-lightbox-panel")).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Log this dish/ })).toBeTruthy();
  });
});
