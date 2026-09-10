/**
 * B7 · Native shell boot (Capacitor only — a no-op on web).
 *
 * When Bloom runs inside the iOS/Android wrapper, the OS status bar sits on
 * top of our dark theme. Without this call it renders dark-on-dark (clock and
 * battery invisible) on first paint. The plugin is dynamic-imported so the web
 * bundle never pays for it.
 */
export function bootNativeShell(): void {
  if (typeof window === "undefined") return;
  const capacitor = (
    window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }
  ).Capacitor;
  if (capacitor?.isNativePlatform?.() !== true) return;

  void (async () => {
    try {
      const { StatusBar, Style } = await import("@capacitor/status-bar");
      // Light clock/battery/signal for our dark theme…
      await StatusBar.setStyle({ style: Style.Dark });
      // …over a matching bar on Android (no-op on iOS, which is transparent).
      await StatusBar.setBackgroundColor({ color: "#14151f" });
    } catch {
      /* Older shell or missing plugin — the app still works. */
    }
  })();
}
