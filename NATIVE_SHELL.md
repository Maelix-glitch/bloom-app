# Bloom Native Shell v1 (M-239) - the bundled app

Bloom in a real app shell: the whole web app is compiled to a static bundle
and lives on the phone inside Capacitor projects (`android/` and `ios/`).
It is not a website wrapper and it does not load the live site at runtime,
so it works offline and every store build is a fixed, reviewable build.
This document is the v1 record: what the shell does now, how to build it,
and what is honestly still missing.

## What v1 includes

- **Brand-true chrome.** The boot background behind the webview and the
  Android status bar are Bloom's official ink, `#0a0b0e`
  (`capacitor.config.ts` and `src/lib/native-shell.ts`, pinned together by
  the SHELL_INK constant). No more old `#14151f` blue-black flash.
- **Android back button.** Wired through `@capacitor/app` in
  `bootNativeShell`: inside the app, Back walks the in-app history back;
  on the root route (Today), or with nowhere to go, Back exits the app.
  The decision is a pure function (`decideBackAction`) with unit tests.
  iOS has no hardware back button, so nothing changes there.
- **Local notifications.** `@capacitor/local-notifications` behind a small
  bridge, `src/lib/native-notifications.ts`: ask permission, schedule and
  cancel by the reminder engine's own keys, all strict no-ops on web.
  The reminder engine (`src/hooks/useReminders.ts`) is wired at its two
  natural seams: when a reminder comes due inside the app, `show()` now
  presents it through the native bridge (the web routes cannot fire inside
  the shell: no service worker runs under the capacitor scheme, and iOS
  webviews drop web notifications), and turning reminders on asks for
  native permission. On launch the engine reads the native permission
  state, so a granted shell delivers without a re-toggle. Reminder keys
  are hashed to stable integer ids, so re-scheduling a reminder replaces
  it instead of stacking duplicates.
- **Android app links (unverified).** The manifest claims https links on
  the live host `maelix-glitch-bloom-app.bloomlabs.workers.dev`, so
  Android offers Bloom for those links. `autoVerify` is deliberately off:
  see the follow-ups for what verified links need.

## Build it on your Windows PC

You need Android Studio (Android) on the PC. iOS needs a Mac with Xcode;
it cannot be built on Windows or in Muse's Linux box.

```bash
npm install
npm run app:build     # static bundle, then sync into android/ and ios/
npx cap open android  # opens the Android project in Android Studio
```

In Android Studio: pick your phone (USB debugging on) or an emulator and
press Run. After any web change, run `npm run app:build` again and Run
again. To hand someone a file: Build, then Build APK(s) for a direct
install, or Generate Signed App Bundle for the Play Store.

## Signing: the one warning that matters

The first time you generate a signed bundle, Android Studio asks you to
create a **keystore** file and a password. Create it once, and **back the
file and the password up somewhere safe** (a password manager plus a copy
off the PC). If you lose the keystore, you can never update the app again:
Google treats a differently-signed build as a different app, and the only
way forward is a new store listing with zero of your users carried over.
This is not a Bloom rule, it is how Android signing works.

## Honest remaining list (follow-ups, not done in v1)

- **Final bundle ID.** Still the scaffold id `app.bloom.tracker`. The
  final id waits on the domain and rename decision (a reverse-domain id
  should match a domain you own). It must be set before the first store
  upload; changing it later is a new app, same as the keystore rule.
- **Verified Android app links.** Need `/.well-known/assetlinks.json`
  served on the live host, carrying the signing certificate fingerprint,
  then `autoVerify` can be turned on. Until then links show the standard
  Android app chooser instead of opening Bloom directly.
- **iOS universal links.** Need domain control plus the associated-domains
  entitlement and an `apple-app-site-association` file on the host. Not
  faked in v1.
- **Push notifications (app closed).** v1 covers local notifications,
  which fire for reminders the app itself scheduled. Server push to a
  closed app is separate work: FCM/APNs setup, device tokens, and the
  sender side. The web push path (VAPID plus the push-send edge function)
  already exists for the PWA and does not carry into the native shell.
- **Tap-to-route from notifications.** The tap target url travels with
  each notification as extra data, but the shell does not yet listen for
  the tap and route to it. Small follow-up in the bridge.
- **Exact timing on Android.** Reminders are scheduled with
  allowWhileIdle, but Android battery optimisation can still drift a
  local notification by minutes on some phones. That is the platform's
  rule for local notifications, not a Bloom setting.
- **iOS build and store listings.** iOS build needs a Mac and an Apple
  Developer account ($99/yr); Play needs a Google Play Console account
  ($25 one-time). Store listings, screenshots, privacy and data-safety
  answers are their own step when the bundle ID is final.
- **Version bumps.** Each store upload needs a higher versionCode (and
  iOS build number) than the last; bump `version` in package.json and
  rebuild with `npm run app:build`.
