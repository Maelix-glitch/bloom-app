/**
 * DishPhoto — a dish's real photograph (D4), modelled on FoodPhoto:
 * a small square thumbnail that renders nothing at all when the dish
 * has no photograph — no box, no placeholder, no broken-image chrome.
 *
 * When a photograph exists, the thumbnail is a button: tapping it
 * opens the lightbox — the photograph large, the dish's name, and its
 * credit (photographer + licence, from the manifest, with the Commons
 * file page linked), in a capped floating card that follows the mobile
 * sheet rules. In this slice the dish-photo manifest ships empty (a
 * parallel slice is sourcing the photographs), so every dish renders
 * photo-less and the lightbox simply never opens — the component is
 * built and tested against the contract, ready for the manifest.
 */

import { useState } from "react";

import { BloomSheet } from "@/components/ui/bloom-sheet";
import { dishPhotoFor } from "@/lib/nutrition";

export function DishPhoto({
  dishId,
  name,
  size = "thumb",
  lightbox = true,
}: {
  dishId: string;
  name: string;
  /** "thumb": the 48px row thumbnail. "large": the detail sheet's
   *  full-width photograph. Both open the lightbox on tap. */
  size?: "thumb" | "large";
  /** Set false when the photo sits inside another tap target (a dish
   *  card that opens the detail sheet) — the bare photograph renders,
   *  with no nested button. */
  lightbox?: boolean;
}) {
  const photo = dishPhotoFor(dishId);
  const [open, setOpen] = useState(false);
  if (!photo) return null;
  const img = (
    <img
      className={size === "large" ? "nut-dish-photo-lg" : "nut-food-thumb"}
      src={photo.src}
      alt={name}
      width={size === "large" ? undefined : 48}
      height={size === "large" ? undefined : 48}
      loading="lazy"
      decoding="async"
    />
  );
  if (!lightbox) return img;
  return (
    <>
      <button
        type="button"
        className={size === "large" ? "nut-dish-photo-btn-lg" : "nut-photo-btn"}
        aria-label={`View photo of ${name}`}
        onClick={() => setOpen(true)}
      >
        {img}
      </button>
      <BloomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={name}
        placement="pop"
        className="nut-sheet"
      >
        <div className="px-5 pb-6 pt-5 sm:px-6">
          <img className="nut-lightbox-img" src={photo.src} alt={name} />
          <p className="mt-3 font-display text-[length:var(--text-title)] text-foreground">
            {name}
          </p>
          <p className="mt-1 text-[length:var(--text-caption)] text-muted-foreground">
            Photo by {photo.author} · {photo.license}
          </p>
          <a
            className="nut-inline-link text-[length:var(--text-caption)]"
            href={photo.pageUrl}
            target="_blank"
            rel="noreferrer"
          >
            View on Wikimedia Commons
          </a>
        </div>
      </BloomSheet>
    </>
  );
}
