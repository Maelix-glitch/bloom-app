import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Bloom — native app shell (Capacitor).
 *
 * This is the "headless wrapper": the real Bloom web app, bundled offline
 * into a genuine iOS/Android app. Same code, same stores, no rewrite.
 *
 * Build it:  npm run app:build     (static bundle → synced into android/ios)
 * Open it:   npx cap open android  (Android Studio) / npx cap open ios (Xcode)
 *
 * Full steps, store publishing and the PWA/TWA alternatives: APP_WRAPPER.md.
 */
const config: CapacitorConfig = {
  // Reverse-domain id. Change to a domain you own before publishing to a store.
  appId: "app.bloom.tracker",
  appName: "Bloom",
  // The offline static build from `npm run build:app` — index.html lives here.
  webDir: "dist/client",
  // Behind the webview while the app boots: matches theme-color, no white flash.
  backgroundColor: "#14151f",
  ios: {
    // Web content extends under the notch/home indicator; the app's own
    // safe-area CSS (viewport-fit=cover + env(safe-area-inset-*)) handles it.
    contentInset: "always",
  },
  android: {
    // Keep taps crisp; the webview owns the whole screen like a real app.
    adjustMarginsForEdgeToEdge: "auto",
  },
};

export default config;
