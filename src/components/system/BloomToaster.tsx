/**
 * BloomToaster — the one notification surface in the app.
 *
 * It used to live inside /profile and /cycle-classic, which meant every other
 * route that called `toast()` produced nothing at all: a silently swallowed
 * confirmation, or worse, a swallowed error. It is mounted once at the root so
 * a toast always arrives wherever it was asked for, and removed from the two
 * pages that used to own it (two Toasters = doubled toasts).
 *
 * Top-centre is deliberate: the phone's tab bar and the "saved on this device"
 * notice both own the bottom edge, and a toast there would cover the very
 * controls the message is talking about.
 */

import { Toaster } from "sonner";

export function BloomToaster() {
  return (
    <Toaster
      position="top-center"
      offset={{ top: 20 }}
      mobileOffset={{ top: 72 }}
      gap={10}
      visibleToasts={3}
      closeButton
      toastOptions={{
        duration: 4200,
        style: {
          background: "color-mix(in oklab, var(--surface-2) 92%, transparent)",
          border: "1px solid color-mix(in oklab, var(--foreground) 12%, transparent)",
          color: "var(--foreground)",
          borderRadius: "14px",
          boxShadow: "0 20px 44px -24px rgba(0, 0, 0, 0.9)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          fontSize: "13px",
        },
        classNames: {
          title: "font-normal",
          description: "text-muted-foreground",
        },
      }}
    />
  );
}
