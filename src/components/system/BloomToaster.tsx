/**
 * BloomToaster — the one notification surface in the app.
 *
 * It used to live inside individual pages, which meant every other
 * route that called `toast()` produced nothing at all: a silently swallowed
 * confirmation, or worse, a swallowed error. It is mounted once at the root so
 * a toast always arrives wherever it was asked for, and removed from the two
 * pages that used to own it (two Toasters = doubled toasts).
 *
 * Top-centre is deliberate: the phone's tab bar and the "saved on this device"
 * notice both own the bottom edge, and a toast there would cover the very
 * controls the message is talking about.
 *
 * The skin is an iOS-style banner, not a slab: the card hugs its content
 * (see the [data-sonner-toast] rules in styles.css — sonner fixes its own
 * width, so the fit has to be negotiated there), floats on a deep soft
 * shadow, and wears frosted glass with a hairline top highlight. There is
 * no close button: toasts leave on their own timer or with a swipe, the
 * way a banner should. Bespoke toast cards (the points award) wear the
 * same shared shell — see toastShell.ts.
 */

import type { CSSProperties } from "react";
import { Toaster } from "sonner";

import { TOAST_SHELL_STYLE } from "@/components/system/toastShell";

export function BloomToaster() {
  return (
    <Toaster
      position="top-center"
      offset={{ top: 20 }}
      mobileOffset={{ top: 72 }}
      gap={10}
      visibleToasts={3}
      // The cap on sonner's fixed --width: 420px, and never wider than
      // the viewport minus a margin each side. (On phones sonner's own
      // inset layout takes over.) Content-fit sizing is in styles.css.
      style={
        {
          "--width": "min(420px, calc(100vw - 32px))",
          // Sonner's own font stack would maroon the toasts off the app
          // typeface; inherit Inter from the app root instead.
          fontFamily: "inherit",
        } as CSSProperties
      }
      toastOptions={{
        duration: 4200,
        style: {
          ...TOAST_SHELL_STYLE,
          padding: "12px 16px",
          fontSize: "13px",
        },
      }}
    />
  );
}
