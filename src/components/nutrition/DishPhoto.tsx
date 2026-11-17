/**
 * DishPhoto — a dish's real photograph (D4), modelled on FoodPhoto:
 * a small square thumbnail that renders nothing at all when the dish
 * has no photograph — no box, no placeholder, no broken-image chrome.
 *
 * When a photograph exists, the thumbnail is a button: tapping it
 * opens the lightbox — the photograph large, the dish's name, and its
 * credit (photographer + licence, from the manifest, with the Commons
 * file page linked). The lightbox is the FoodPhoto one: portaled to
 * the document body, at a layer above every sheet it can open over
 * (see DishPhotoLightbox below for why it is not a sheet itself).
 */

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { dishPhotoFor, type DishPhoto as DishPhotoCredit } from "@/lib/nutrition";

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
  const close = useCallback(() => setOpen(false), []);
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
      {open ? <DishPhotoLightbox photo={photo} name={name} onClose={close} /> : null}
    </>
  );
}

/**
 * The full view: the photograph large, its dish's name, and the credit
 * line. Closes on the backdrop, the close button, and Escape. The key
 * listener runs in the capture phase and stops the event: the photo
 * usually opens from inside the dish detail sheet, and Escape must
 * close the photograph, not the sheet underneath it.
 *
 * The lightbox is portaled to the document body. It used to be a
 * BloomSheet opened from inside the detail sheet's BloomSheet, and
 * two sheets share one z-index pair (backdrop 2000, panel 2001), so
 * the lightbox's backdrop painted UNDER the detail sheet's panel: the
 * photograph's card floated over the fully lit sheet — its frame, its
 * heading and its Log button visible all around the photo. At the
 * body, the backdrop covers the viewport and .nut-lightbox-backdrop's
 * z-index (2100, above the sheet's 2001) paints it over every host;
 * the portal still bubbles through this component tree, so the host
 * sheet reads taps on the photograph as its own content and stays
 * open beneath it.
 */
function DishPhotoLightbox({
  photo,
  name,
  onClose,
}: {
  photo: DishPhotoCredit;
  name: string;
  onClose: () => void;
}) {
  /* Scroll lock + Escape, while open — the add-food sheet's pattern. */
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey, true);
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="nut-dialog-backdrop nut-lightbox-backdrop" onClick={onClose}>
      <div
        className="nut-lightbox-panel"
        role="dialog"
        aria-modal="true"
        aria-label={name}
        onClick={(e) => e.stopPropagation()}
      >
        <img className="nut-lightbox-img" src={photo.src} alt={name} />
        <div className="nut-lightbox-meta">
          <div className="min-w-0 flex-1">
            <p className="text-[length:var(--text-callout)] font-medium text-foreground">
              {name}
            </p>
            <p className="mt-0.5 text-[length:var(--text-caption)] text-muted-foreground">
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
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
