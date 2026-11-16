// @vitest-environment jsdom
/**
 * Nutrition P3-R — the FoodPhoto thumbnail: present with the food's
 * name as its alt text for a photographed reference food, and entirely
 * absent — no box, no placeholder, no broken-image chrome — for a
 * photo-less reference food and for a user's own food.
 *
 * The thumbnail is also the lightbox's door (N-WIDE): tapping it opens
 * the photograph full-size with the food's name and the manifest's
 * credit line; the backdrop, the close button and Escape all close it.
 */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

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

  it("renders no button for a photo-less reference food — nothing to open", () => {
    const photolessId = PHOTOLESS_REFERENCE_FOODS[0]?.foodId ?? "usda-000000000";
    render(<FoodPhoto foodId={photolessId} name="No photo" />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("FoodPhoto lightbox", () => {
  const photo = FOOD_PHOTOS[0]!;

  function openLightbox() {
    render(<FoodPhoto foodId={photo.foodId} name={photo.foodName} />);
    fireEvent.click(
      screen.getByRole("button", { name: `View photo of ${photo.foodName}` }),
    );
    return screen.getByRole("dialog");
  }

  it("opens the full view with the food's name and its manifest credit", () => {
    const dialog = openLightbox();
    expect(dialog.getAttribute("aria-label")).toBe(photo.foodName);
    const big = dialog.querySelector("img.nut-lightbox-img");
    expect(big).not.toBeNull();
    expect(big?.getAttribute("src")).toBe(photo.src);
    expect(big?.getAttribute("alt")).toBe(photo.foodName);
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
