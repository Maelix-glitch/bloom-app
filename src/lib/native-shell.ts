/**
 * B7 · Native shell boot (Capacitor only — a no-op on web).
 *
 * When Bloom runs inside the iOS/Android wrapper, the OS status bar sits on
 * top of our dark theme. Without this call it renders dark-on-dark (clock and
 * battery invisible) on first paint. The plugins are dynamic-imported so the
 * web bundle never pays for them.
 *
 * M-239 · Native Shell v1 adds the Android hardware back button: inside the
 * app it walks the webview history back; on a root route (or with nowhere to
 * go) it exits the app, which is what a native user expects the button to do.
 * On iOS there is no hardware back button, so the listener simply never
 * fires there.
 */

/** Bloom's official ink. Keep in step with capacitor.config backgroundColor. */
export const SHELL_INK = "#0a0b0e";

/** True only inside the Capacitor wrapper; false on every web surface. */
export function isNativePlatform(): boolean {
  if (typeof window === "undefined") return false;
  const capacitor = (
    window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }
  ).Capacitor;
  return capacitor?.isNativePlatform?.() === true;
}

/**
 * Routes where Back means "leave the app". Today ("/") is Bloom's home and
 * root; the empty path is the same place before the router normalises it.
 */
export function isRootPath(pathname: string): boolean {
  return pathname === "" || pathname === "/";
}

export type BackAction = "back" | "exit";

/**
 * The back-button decision, kept pure so it can be tested exactly:
 * on a root route there is nothing in the app above this screen, so Back
 * exits; anywhere else, go back when the webview has history to go back to,
 * and exit when it does not (a cold deep-link entry has nowhere to go).
 */
export function decideBackAction(input: {
  canGoBack: boolean;
  pathname: string;
}): BackAction {
  if (isRootPath(input.pathname)) return "exit";
  return input.canGoBack ? "back" : "exit";
}

export function bootNativeShell(): void {
  if (!isNativePlatform()) return;

  void (async () => {
    try {
      const { StatusBar, Style } = await import("@capacitor/status-bar");
      // Light clock/battery/signal for our dark theme…
      await StatusBar.setStyle({ style: Style.Dark });
      // …over a matching bar on Android (no-op on iOS, which is transparent).
      await StatusBar.setBackgroundColor({ color: SHELL_INK });
    } catch {
      /* Older shell or missing plugin — the app still works. */
    }

    try {
      const { App } = await import("@capacitor/app");
      await App.addListener("backButton", ({ canGoBack }) => {
        const action = decideBackAction({
          canGoBack,
          pathname: window.location.pathname,
        });
        if (action === "back") {
          window.history.back();
        } else {
          void App.exitApp();
        }
      });
    } catch {
      /* Older shell or missing plugin — the OS default applies. */
    }
  })();
}
