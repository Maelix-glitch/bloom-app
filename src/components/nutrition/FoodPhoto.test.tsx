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
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

import { FOOD_PHOTOS, FOOD_PHOTO_CREDITS, PHOTOLESS_REFERENCE_FOODS } from "@/lib/nutrition";
import { FoodPhoto } from "./FoodPhoto";
import { PhotoCreditsSheet } from "./PhotoCreditsSheet";

afterEach(cleanup);

beforeEach(() => {
  /* jsdom ships no matchMedia, and BloomSheet asks it whether this is
     a phone (the credits-sheet host test below renders one). */
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

describe("FoodPhoto lightbox layering", () => {
  const photo = FOOD_PHOTOS[0]!;

  it("renders at the document body, not inside its host", () => {
    render(<FoodPhoto foodId={photo.foodId} name={photo.foodName} />);
    fireEvent.click(
      screen.getByRole("button", { name: `View photo of ${photo.foodName}` }),
    );
    const dialog = screen.getByRole("dialog");
    /* The backdrop is the portal's root: a direct child of the body,
       so no host — sheet, scrollable list, transformed panel — can
       contain, clip or bury it. */
    expect(dialog.parentElement?.parentElement).toBe(document.body);
  });

  it("opens over the credits sheet, and closing it leaves the sheet open", () => {
    const onClose = vi.fn();
    render(<PhotoCreditsSheet open onClose={onClose} />);
    const credit = FOOD_PHOTO_CREDITS[0]!;
    const thumb = screen.getByRole("button", {
      name: `View photo of ${credit.foodName}`,
    });
    /* The thumbnail really does live inside the sheet's panel — the
       burial this guards against. */
    expect(thumb.closest(".bsheet")).not.toBeNull();

    fireEvent.click(thumb);
    const dialog = screen.getByRole("dialog", { name: credit.foodName });
    const backdrop = dialog.parentElement!;
    expect(backdrop.closest(".bsheet")).toBeNull();
    expect(backdrop.parentElement).toBe(document.body);

    /* A backdrop tap closes the photograph only: the sheet underneath
       never hears it as an outside dismissal. */
    fireEvent.pointerDown(backdrop);
    fireEvent.click(backdrop);
    expect(screen.queryByRole("dialog", { name: credit.foodName })).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText(/The food photographs in Bloom are real/)).toBeTruthy();

    /* Same for Escape: the photograph closes, the sheet stays. */
    fireEvent.click(
      screen.getByRole("button", { name: `View photo of ${credit.foodName}` }),
    );
    expect(screen.getByRole("dialog", { name: credit.foodName })).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: credit.foodName })).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText(/The food photographs in Bloom are real/)).toBeTruthy();
  });
});

describe("lightbox stylesheet contract", () => {
  const css = readFileSync(
    join(process.cwd(), "src", "styles", "nutrition.css"),
    "utf8",
  );
  const sheetCss = readFileSync(
    join(process.cwd(), "src", "styles", "bloom-sheet.css"),
    "utf8",
  );

  function ruleBody(source: string, selector: string): string {
    const start = source.indexOf(`${selector} {`);
    expect(start, `${selector} rule exists`).toBeGreaterThanOrEqual(0);
    return source.slice(start, source.indexOf("}", start));
  }
  function zIndexOf(body: string): number {
    const match = /z-index:\s*(\d+)/.exec(body);
    expect(match, "z-index declared").not.toBeNull();
    return Number(match![1]);
  }

  it("the lightbox backdrop layers above the BloomSheet backdrop and panel", () => {
    const lightbox = zIndexOf(ruleBody(css, ".nut-lightbox-backdrop"));
    const sheetBackdrop = zIndexOf(ruleBody(sheetCss, ".bsheet-backdrop"));
    const sheetPanel = zIndexOf(ruleBody(sheetCss, ".bsheet"));
    expect(lightbox).toBeGreaterThan(sheetPanel);
    expect(lightbox).toBeGreaterThan(sheetBackdrop);
    /* A modal sheet locks the body's pointer events off; the portaled
       lightbox restates them or its backdrop and close button go dead. */
    expect(ruleBody(css, ".nut-lightbox-backdrop")).toContain(
      "pointer-events: auto",
    );
  });

  it("the lightbox photograph has exactly one definition, with the fit contract", () => {
    expect(css.split(".nut-lightbox-img {").length - 1).toBe(1);
    const body = ruleBody(css, ".nut-lightbox-img");
    /* Never wider than its panel, height capped, the whole bitmap
       visible and centred — portrait, landscape and square alike. */
    expect(body).toContain("max-width: 100%");
    expect(body).toContain("max-height: 62dvh");
    expect(body).toContain("object-fit: contain");
    expect(body).toContain("object-position: center");
  });

  it("the meta row can never be shrunk or cropped by the flex panel", () => {
    expect(ruleBody(css, ".nut-lightbox-meta")).toContain("flex-shrink: 0");
    /* …because the image is the one that gives: it may shrink to
       nothing rather than push the name and credit out of the cap. */
    expect(ruleBody(css, ".nut-lightbox-img")).toContain("min-height: 0");
  });
});
