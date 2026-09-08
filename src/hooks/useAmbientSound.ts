/**
 * App-wide interaction sound, from one listener.
 *
 * The alternative was a `sound("tap")` call in every button in the app —
 * hundreds of edits, and every future button silently missing one. Instead a
 * single delegated listener on the document works out what was pressed from
 * the DOM and plays the right cue:
 *
 *   · a checkbox, radio or switch → the on/off pair, matching its new state
 *   · a link or anything that navigates → the navigation cue
 *   · a destructive control → the low thud
 *   · anything else clickable → the everyday tap
 *
 * Two things it deliberately does not do. It stays out of sheets, which play
 * their own open/close cue in `BloomSheet` — otherwise closing one would
 * both thud and tap. And it is **silent on the Rewards page**, which is being
 * redesigned; that exclusion is a route check in one place rather than a flag
 * threaded through the tree.
 *
 * Opting a control out is `data-silent` on it or any ancestor.
 */

import { useEffect } from "react";
import { useLocation } from "@tanstack/react-router";

import { play } from "@/lib/sound/sound";

/** Routes that make no sound at all. */
const SILENT_ROUTES = ["/rewards"];

const isSilentRoute = (pathname: string): boolean =>
  SILENT_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));

/** The cue an element deserves, or null to stay quiet. */
function cueFor(el: HTMLElement): "tap" | "toggleOn" | "toggleOff" | "navigate" | "delete" | null {
  if (el.closest("[data-silent]")) return null;
  /* Sheets announce themselves; a close button shouldn't also tap. */
  if (el.closest("[data-sheet-controls]")) return null;

  const control = el.closest<HTMLElement>(
    'button, a[href], [role="button"], [role="switch"], [role="radio"], [role="checkbox"], [role="tab"], input[type="checkbox"], input[type="radio"], summary',
  );
  if (!control) return null;
  if (control.hasAttribute("disabled") || control.getAttribute("aria-disabled") === "true") {
    return null;
  }

  /* A switch reports the state it is *leaving*, so invert it. */
  const checked =
    control.getAttribute("aria-checked") ??
    (control instanceof HTMLInputElement ? String(control.checked) : null);
  if (checked !== null) return checked === "true" ? "toggleOff" : "toggleOn";

  const label = `${control.getAttribute("aria-label") ?? ""} ${control.textContent ?? ""}`;
  if (/\b(delete|remove|erase|discard|clear)\b/i.test(label)) return "delete";

  if (control instanceof HTMLAnchorElement && control.getAttribute("href")?.startsWith("/")) {
    return "navigate";
  }
  return "tap";
}

export function useAmbientSound(): void {
  const { pathname } = useLocation();

  useEffect(() => {
    if (isSilentRoute(pathname)) return;

    /*
     * pointerdown, not click: the sound should land when the finger does, not
     * after the handler runs. A 40ms lag is enough to feel disconnected.
     */
    const onDown = (e: PointerEvent) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const cue = cueFor(target);
      if (cue) play(cue);
    };

    document.addEventListener("pointerdown", onDown, { passive: true, capture: true });
    return () => document.removeEventListener("pointerdown", onDown, { capture: true });
  }, [pathname]);
}
